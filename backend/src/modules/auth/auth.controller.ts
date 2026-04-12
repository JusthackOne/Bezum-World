import {
  Body,
  Controller,
  Get,
  Headers,
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
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { Public } from '../../common/decorators/public.decorator';
import { AdminCreateAccountDto } from './dto/admin-create-account.dto';
import { AdminCreateAccountResponseDto } from './dto/admin-create-account-response.dto';
import { AuthenticatedUserDto } from './dto/authenticated-user.dto';
import { AuthTokensResponseDto } from './dto/auth-tokens-response.dto';
import { LoginByCodeDto } from './dto/login-by-code.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
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

    return this.authService.toAuthTokensResponse(result);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access and refresh tokens',
    description: 'Requires refresh token in httpOnly cookie.',
  })
  @ApiSecurity('refresh-token')
  @ApiOkResponse({ type: AuthTokensResponseDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token is missing or invalid' })
  async refreshTokens(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokensResponseDto> {
    const refreshToken = request.cookies?.[this.authService.getRefreshCookieName()];
    const result = await this.authService.refreshTokens(refreshToken);
    this.authService.setRefreshTokenCookie(response, result.refreshToken);

    return this.authService.toAuthTokensResponse(result);
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

  @Public()
  @Post('admin/accounts')
  @ApiOperation({
    summary: 'Create account and auto-generate unique login code',
    description: 'Admin endpoint protected by x-admin-api-key header.',
  })
  @ApiHeader({
    name: 'x-admin-api-key',
    required: true,
    description: 'Admin API key',
  })
  @ApiBody({ type: AdminCreateAccountDto })
  @ApiCreatedResponse({ type: AdminCreateAccountResponseDto })
  @ApiForbiddenResponse({ description: 'Admin API key is invalid' })
  async createAccount(
    @Headers('x-admin-api-key') adminApiKey: string | undefined,
    @Body() body: AdminCreateAccountDto,
  ): Promise<AdminCreateAccountResponseDto> {
    return this.authService.createAccountByAdmin(adminApiKey, body);
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
    if (!request.user?.sub) {
      throw new UnauthorizedException('Access token is invalid');
    }

    return this.authService.getAuthenticatedUser(request.user.sub);
  }
}
