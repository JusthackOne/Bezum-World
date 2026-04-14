import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

import { Public } from '../../common/decorators/public.decorator';
import { AdminCreateAccountDto, AdminCreateAccountResponseDto } from '../auth/dto';
import { AuthService } from '../auth/auth.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AdminOnlyGuard } from '../auth/guards/admin-only.guard';
import {
  EquipItemByUserParamsDto,
  EquipItemByUserResponse,
  GetPublicUserProfileParamsDto,
  PublicUserProfileDto,
  UserItemsResponseDto,
} from './dto';
import { UsersService } from './users.service';
import { RequestWithAuthUser } from '../auth/types/request-with-auth-user.type';

const AVATARS_UPLOAD_DIR = join(process.cwd(), 'uploads', 'avatars');
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const AVATAR_MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

interface UploadedAvatarFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @UseGuards(AccessTokenGuard, AdminOnlyGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: {
        fileSize: MAX_AVATAR_SIZE_BYTES,
      },
    }),
  )
  @ApiOperation({
    summary: 'Create account and auto-generate unique login code',
    description: 'Available only for authenticated admin.',
  })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        balance: { type: 'integer', minimum: 0 },
        strength: { type: 'integer', minimum: 0, maximum: 100 },
        charisma: { type: 'integer', minimum: 0, maximum: 100 },
        endurance: { type: 'integer', minimum: 0, maximum: 100 },
        intelligence: { type: 'integer', minimum: 0, maximum: 100 },
        avatarUrl: { type: 'string', nullable: true },
        avatar: { type: 'string', format: 'binary' },
      },
      required: ['username', 'strength', 'charisma', 'endurance', 'intelligence'],
    },
  })
  @ApiCreatedResponse({ type: AdminCreateAccountResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  async createUser(
    @Body() body: AdminCreateAccountDto,
    @UploadedFile() avatarFile?: UploadedAvatarFile,
  ): Promise<AdminCreateAccountResponseDto> {
    const uploadedAvatarUrl = avatarFile ? await this.storeAvatar(avatarFile) : undefined;
    return this.authService.createAccountByAdmin(body, uploadedAvatarUrl);
  }

  @Get(':username/items')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Get items owned by user',
    description: 'Available for authenticated users and admins.',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'username',
    description: 'Public username',
    example: 'mike123',
  })
  @ApiOkResponse({ type: UserItemsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiNotFoundResponse({ description: 'User is not found' })
  async getUserItems(
    @Param() params: GetPublicUserProfileParamsDto,
  ): Promise<UserItemsResponseDto> {
    return this.usersService.getUserItemsByUsername(params.username);
  }

  @Public()
  @Get(':username')
  @ApiOperation({
    summary: 'Get public user profile by username',
    description: 'Returns only public profile fields for the requested user.',
  })
  @ApiParam({
    name: 'username',
    description: 'Public username',
    example: 'mike123',
  })
  @ApiOkResponse({ type: PublicUserProfileDto })
  @ApiNotFoundResponse({ description: 'User is not found' })
  async getPublicProfile(
    @Param() params: GetPublicUserProfileParamsDto,
  ): Promise<PublicUserProfileDto> {
    return this.usersService.getPublicProfileByUsername(params.username);
  }

  @Put('user/equipment/:itemId')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Equip owned item for authenticated user',
    description: 'Equips an owned item into its configured slot and returns current equipment.',
  })
  @ApiParam({
    name: 'itemId',
    description: 'Item identifier to equip',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  @ApiOkResponse({ type: EquipItemByUserResponse })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Only user accounts can equip items' })
  @ApiNotFoundResponse({ description: 'Item is not found' })
  async equipItem(
    @Param() params: EquipItemByUserParamsDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<EquipItemByUserResponse> {
    if (!request.user?.sub || request.user.actorType !== 'user') {
      throw new ForbiddenException('Only user accounts can equip items');
    }
    return this.usersService.equipItemByUser(params.itemId, request.user.sub);
  }

  private async storeAvatar(file: UploadedAvatarFile): Promise<string> {
    const avatarExtension =
      AVATAR_MIME_TO_EXTENSION[file.mimetype] ?? extname(file.originalname).toLowerCase();

    if (!avatarExtension || !Object.values(AVATAR_MIME_TO_EXTENSION).includes(avatarExtension)) {
      throw new BadRequestException('Avatar must be an image (jpeg, png, webp, gif)');
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      throw new BadRequestException('Avatar file is too large');
    }

    await mkdir(AVATARS_UPLOAD_DIR, { recursive: true });
    const fileName = `${randomUUID()}${avatarExtension}`;
    await writeFile(join(AVATARS_UPLOAD_DIR, fileName), file.buffer);

    return `/uploads/avatars/${fileName}`;
  }
}
