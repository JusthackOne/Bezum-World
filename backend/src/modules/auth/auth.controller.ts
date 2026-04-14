import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { Public } from '../../common/decorators/public.decorator';
import {
  AdminAuthTokensResponseDto,
  AdminLoginDto,
  AuthenticatedAdminDto,
  AuthenticatedUserDto,
  AuthTokensResponseDto,
  LoginByCodeDto,
  LogoutResponseDto,
} from './dto';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AdminOnlyGuard } from './guards/admin-only.guard';
import type { RequestWithAuthUser } from './types/request-with-auth-user.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login/code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user by unique 6-character code',
    description: 'Returns access token in response and sets refresh token as httpOnly cookie.',
  })
  @ApiBody({ type: LoginByCodeDto })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication code is invalid' })
  async loginByCode(
    @Body() body: LoginByCodeDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokensResponseDto> {
    const result = await this.authService.loginByCode(body.code);
    this.authService.setRefreshTokenCookie(response, result.refreshToken);

    return this.authService.toUserAuthTokensResponse(result);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh user tokens',
    description: 'Requires user refresh token in httpOnly cookie.',
  })
  @ApiSecurity('refresh-token')
  @ApiOkResponse({ type: AuthTokensResponseDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token is missing or invalid' })
  async refreshUserTokens(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokensResponseDto> {
    const refreshToken = request.cookies?.[this.authService.getRefreshCookieName()];
    const result = await this.authService.refreshUserTokens(refreshToken);
    this.authService.setRefreshTokenCookie(response, result.refreshToken);

    return this.authService.toUserAuthTokensResponse(result);
  }

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate admin by login and password',
    description: 'Returns admin access token in response and sets refresh token as httpOnly cookie.',
  })
  @ApiBody({ type: AdminLoginDto })
  @ApiOkResponse({ type: AdminAuthTokensResponseDto })
  @ApiUnauthorizedResponse({ description: 'Admin credentials are invalid' })
  async loginAdmin(
    @Body() body: AdminLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminAuthTokensResponseDto> {
    const result = await this.authService.loginAdmin(body);
    this.authService.setRefreshTokenCookie(response, result.refreshToken);

    return this.authService.toAdminAuthTokensResponse(result);
  }

  @Public()
  @Post('admin/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh admin tokens',
    description: 'Requires admin refresh token in httpOnly cookie.',
  })
  @ApiSecurity('refresh-token')
  @ApiOkResponse({ type: AdminAuthTokensResponseDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token is missing or invalid' })
  async refreshAdminTokens(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminAuthTokensResponseDto> {
    const refreshToken = request.cookies?.[this.authService.getRefreshCookieName()];
    const result = await this.authService.refreshAdminTokens(refreshToken);
    this.authService.setRefreshTokenCookie(response, result.refreshToken);

    return this.authService.toAdminAuthTokensResponse(result);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout current session',
    description: 'Clears refresh token cookie.',
  })
  @ApiOkResponse({ type: LogoutResponseDto })
  async logout(@Res({ passthrough: true }) response: Response): Promise<LogoutResponseDto> {
    this.authService.clearRefreshTokenCookie(response);

    return {
      message: 'Logged out',
    };
  }

  @Get('admin/me')
  @UseGuards(AccessTokenGuard, AdminOnlyGuard)
  @ApiOperation({
    summary: 'Get current authenticated admin profile',
  })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: AuthenticatedAdminDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  async getAdminMe(@Req() request: RequestWithAuthUser): Promise<AuthenticatedAdminDto> {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Access token is invalid');
    }

    return this.authService.getAuthenticatedAdmin(request.user.sub);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Get current authenticated user profile',
  })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: AuthenticatedUserDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  async getMe(@Req() request: RequestWithAuthUser): Promise<AuthenticatedUserDto> {
    if (!request.user?.sub || request.user.actorType !== 'user') {
      throw new UnauthorizedException('Access token is invalid');
    }

    return this.authService.getAuthenticatedUser(request.user.sub);
  }
}
