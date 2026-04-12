import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, type Account } from '@prisma/client';
import { randomInt, timingSafeEqual } from 'crypto';
import type { Response } from 'express';

import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AdminCreateAccountDto } from './dto/admin-create-account.dto';
import { AdminCreateAccountResponseDto } from './dto/admin-create-account-response.dto';
import { AuthenticatedUserDto } from './dto/authenticated-user.dto';
import { AuthTokensResponseDto } from './dto/auth-tokens-response.dto';
import { AccountRepository } from './repositories/account.repository';
import { AuthCodeRepository } from './repositories/auth-code.repository';
import type { AccessTokenPayload } from './types/access-token-payload.type';
import type { RefreshTokenPayload } from './types/refresh-token-payload.type';

const AUTH_CODE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const AUTH_CODE_LENGTH = 6;
const MAX_AUTH_CODE_GENERATION_ATTEMPTS = 10;

interface TokenPairResult {
  account: Account;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly accountRepository: AccountRepository,
    private readonly authCodeRepository: AuthCodeRepository,
  ) {}

  getRefreshCookieName(): string {
    return this.configService.get('auth.refreshCookieName', { infer: true });
  }

  async loginByCode(code: string): Promise<TokenPairResult> {
    const normalizedCode = this.normalizeCode(code);
    const codeRecord = await this.authCodeRepository.findByCodeWithAccount(normalizedCode);

    if (!codeRecord) {
      throw new UnauthorizedException('Authentication code is invalid');
    }

    const account = await this.accountRepository.updateLastTimeLoggedIn(
      codeRecord.account.id,
      new Date(),
    );

    return this.issueTokenPair(account);
  }

  async refreshTokens(refreshToken: string | undefined): Promise<TokenPairResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const payload = await this.verifyRefreshToken(refreshToken);
    const account = await this.accountRepository.findById(payload.sub);

    if (!account) {
      throw new UnauthorizedException('Account is not found');
    }

    return this.issueTokenPair(account);
  }

  async getAuthenticatedUser(accountId: string): Promise<AuthenticatedUserDto> {
    const account = await this.accountRepository.findById(accountId);

    if (!account) {
      throw new UnauthorizedException('Account is not found');
    }

    return this.toAuthenticatedUser(account);
  }

  async createAccountByAdmin(
    adminApiKey: string | undefined,
    payload: AdminCreateAccountDto,
  ): Promise<AdminCreateAccountResponseDto> {
    this.assertAdminAccess(adminApiKey);

    for (let attempt = 1; attempt <= MAX_AUTH_CODE_GENERATION_ATTEMPTS; attempt += 1) {
      const generatedCode = this.generateAuthCode();

      try {
        const created = await this.prisma.$transaction(async (tx) => {
          const account = await this.accountRepository.create(
            {
              username: payload.username,
              avatarUrl: payload.avatarUrl,
            },
            tx,
          );

          const authCode = await this.authCodeRepository.create(generatedCode, account.id, tx);

          return {
            account,
            code: authCode.code,
          };
        });

        return {
          user: this.toAuthenticatedUser(created.account),
          code: created.code,
        };
      } catch (error) {
        if (this.isAuthCodeCollision(error)) {
          continue;
        }

        throw new InternalServerErrorException('Failed to create account');
      }
    }

    throw new InternalServerErrorException('Failed to generate unique account code');
  }

  toAuthTokensResponse(result: TokenPairResult): AuthTokensResponseDto {
    return {
      accessToken: result.accessToken,
      user: this.toAuthenticatedUser(result.account),
    };
  }

  setRefreshTokenCookie(response: Response, refreshToken: string): void {
    response.cookie(this.getRefreshCookieName(), refreshToken, {
      httpOnly: true,
      secure: this.configService.get('auth.refreshCookieSecure', { infer: true }),
      sameSite: 'lax',
      maxAge: this.configService.get('auth.refreshTokenTtlSeconds', { infer: true }) * 1000,
      path: '/api/auth',
    });
  }

  clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(this.getRefreshCookieName(), {
      httpOnly: true,
      secure: this.configService.get('auth.refreshCookieSecure', { infer: true }),
      sameSite: 'lax',
      path: '/api/auth',
    });
  }

  private assertAdminAccess(adminApiKey: string | undefined): void {
    if (!adminApiKey) {
      throw new ForbiddenException('Admin API key is required');
    }

    const expectedAdminKey = this.configService.get('auth.adminApiKey', { infer: true });
    const providedBuffer = Buffer.from(adminApiKey);
    const expectedBuffer = Buffer.from(expectedAdminKey);

    if (providedBuffer.length !== expectedBuffer.length) {
      throw new ForbiddenException('Admin API key is invalid');
    }

    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      throw new ForbiddenException('Admin API key is invalid');
    }
  }

  private async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.configService.get('auth.jwtRefreshSecret', { infer: true }),
      });

      if (payload.tokenType !== 'refresh' || !payload.sub) {
        throw new UnauthorizedException('Refresh token is invalid');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Refresh token is invalid');
    }
  }

  private async issueTokenPair(account: Account): Promise<TokenPairResult> {
    const accessPayload: AccessTokenPayload = {
      sub: account.id,
      username: account.username,
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: account.id,
      tokenType: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get('auth.jwtAccessSecret', { infer: true }),
        expiresIn: this.configService.get('auth.accessTokenTtlSeconds', { infer: true }),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get('auth.jwtRefreshSecret', { infer: true }),
        expiresIn: this.configService.get('auth.refreshTokenTtlSeconds', { infer: true }),
      }),
    ]);

    return {
      account,
      accessToken,
      refreshToken,
    };
  }

  private toAuthenticatedUser(account: Account): AuthenticatedUserDto {
    return {
      id: account.id,
      username: account.username,
      avatarUrl: account.avatarUrl ?? null,
      lastTimeLoggedIn: account.lastTimeLoggedIn?.toISOString() ?? null,
      createdAt: account.createdAt.toISOString(),
    };
  }

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private generateAuthCode(): string {
    let code = '';

    for (let index = 0; index < AUTH_CODE_LENGTH; index += 1) {
      const randomPosition = randomInt(0, AUTH_CODE_CHARSET.length);
      code += AUTH_CODE_CHARSET[randomPosition]!;
    }

    return code;
  }

  private isAuthCodeCollision(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    if (error.code !== 'P2002') {
      return false;
    }

    const target = error.meta?.target;

    if (Array.isArray(target)) {
      return target.some((field) => typeof field === 'string' && field.includes('code'));
    }

    return typeof target === 'string' && target.includes('code');
  }
}
