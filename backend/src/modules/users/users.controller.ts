import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { AdminCreateAccountDto, AdminCreateAccountResponseDto } from '../auth/dto';
import { AuthService } from '../auth/auth.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AdminOnlyGuard } from '../auth/guards/admin-only.guard';
import { GetPublicUserProfileParamsDto, PublicUserProfileDto, UserItemsResponseDto } from './dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @UseGuards(AccessTokenGuard, AdminOnlyGuard)
  @ApiOperation({
    summary: 'Create account and auto-generate unique login code',
    description: 'Available only for authenticated admin.',
  })
  @ApiBearerAuth('access-token')
  @ApiBody({ type: AdminCreateAccountDto })
  @ApiCreatedResponse({ type: AdminCreateAccountResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  async createUser(@Body() body: AdminCreateAccountDto): Promise<AdminCreateAccountResponseDto> {
    return this.authService.createAccountByAdmin(body);
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
}
