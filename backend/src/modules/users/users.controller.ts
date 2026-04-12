import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { GetPublicUserProfileParamsDto } from './dto/get-public-user-profile-params.dto';
import { PublicUserProfileDto } from './dto/public-user-profile.dto';
import { UserItemsResponseDto } from './dto/user-items-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
