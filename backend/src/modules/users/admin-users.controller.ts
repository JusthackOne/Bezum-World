import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
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

import { AuthenticatedUserDto } from '../auth/dto';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AdminOnlyGuard } from '../auth/guards/admin-only.guard';
import {
  AdminDeleteUserResponseDto,
  AdminUpdateUserDto,
  AdminUserIdParamsDto,
  AdminUserWithCodeDto,
} from './dto';
import { UsersService } from './users.service';

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
@Controller('admin/users')
@UseGuards(AccessTokenGuard, AdminOnlyGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Access token is invalid' })
@ApiForbiddenResponse({ description: 'Admin access is required' })
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all users (admin only)',
  })
  @ApiOkResponse({ type: AdminUserWithCodeDto, isArray: true })
  async getAllUsers(): Promise<AdminUserWithCodeDto[]> {
    return this.usersService.getAllUsersByAdmin();
  }

  @Patch(':userId')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: {
        fileSize: MAX_AVATAR_SIZE_BYTES,
      },
    }),
  )
  @ApiOperation({
    summary: 'Update user data (admin only)',
  })
  @ApiParam({
    name: 'userId',
    description: 'User identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', pattern: '^[A-Za-z0-9]{6}$' },
        username: { type: 'string' },
        balance: { type: 'integer', minimum: 0 },
        gameScore: { type: 'integer', minimum: 0 },
        strength: { type: 'integer', minimum: 0 },
        charisma: { type: 'integer', minimum: 0 },
        endurance: { type: 'integer', minimum: 0 },
        intelligence: { type: 'integer', minimum: 0 },
        avatarUrl: { type: 'string', nullable: true },
        avatar: { type: 'string', format: 'binary' },
      },
      required: ['code'],
    },
  })
  @ApiOkResponse({ type: AuthenticatedUserDto })
  @ApiBadRequestResponse({ description: 'At least one field must be provided' })
  @ApiNotFoundResponse({ description: 'User is not found' })
  async updateUser(
    @Param() params: AdminUserIdParamsDto,
    @Body() body: AdminUpdateUserDto,
    @UploadedFile() avatarFile?: UploadedAvatarFile,
  ): Promise<AuthenticatedUserDto> {
    const uploadedAvatarUrl = avatarFile ? await this.storeAvatar(avatarFile) : undefined;

    return this.usersService.updateUserByAdmin(params.userId, body, uploadedAvatarUrl);
  }

  @Delete(':userId')
  @ApiOperation({
    summary: 'Delete user (admin only)',
  })
  @ApiParam({
    name: 'userId',
    description: 'User identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  @ApiOkResponse({ type: AdminDeleteUserResponseDto })
  @ApiNotFoundResponse({ description: 'User is not found' })
  async deleteUser(@Param() params: AdminUserIdParamsDto): Promise<AdminDeleteUserResponseDto> {
    return this.usersService.deleteUserByAdmin(params.userId);
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
