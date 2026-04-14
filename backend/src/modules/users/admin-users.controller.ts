import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AdminOnlyGuard } from '../auth/guards/admin-only.guard';
import { AdminDeleteUserResponseDto } from './dto/admin-delete-user-response.dto';
import { AdminUserWithCodeDto } from './dto/admin-user-with-code.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { AdminUserIdParamsDto } from './dto/admin-user-id-params.dto';
import { UsersService } from './users.service';

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
  @ApiOperation({
    summary: 'Update user data (admin only)',
  })
  @ApiParam({
    name: 'userId',
    description: 'User identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  @ApiBody({ type: AdminUpdateUserDto })
  @ApiOkResponse({ type: AuthenticatedUserDto })
  @ApiBadRequestResponse({ description: 'At least one field must be provided' })
  @ApiNotFoundResponse({ description: 'User is not found' })
  async updateUser(
    @Param() params: AdminUserIdParamsDto,
    @Body() body: AdminUpdateUserDto,
  ): Promise<AuthenticatedUserDto> {
    return this.usersService.updateUserByAdmin(params.userId, body);
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
}
