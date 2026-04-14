import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, type Account, type Admin } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { randomInt } from 'crypto';
import type { Response } from 'express';

import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  AdminAuthTokensResponseDto,
  AdminCreateAccountDto,
  AdminCreateAccountResponseDto,
  AdminLoginDto,
  AuthenticatedAdminDto,
  AuthenticatedUserDto,
  AuthTokensResponseDto,
} from './dto';
import { AccountRepository, AdminRepository, AuthCodeRepository } from './repositories';
import type { AccessTokenPayload } from './types/access-token-payload.type';
import type { RefreshTokenPayload } from './types/refresh-token-payload.type';

const AUTH_CODE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const AUTH_CODE_LENGTH = 6;
const MAX_AUTH_CODE_GENERATION_ATTEMPTS = 10;
const ADMIN_PASSWORD_SALT_ROUNDS = 12;

interface UserTokenPairResult {
  actorType: 'user';
  account: Account;
  accessToken: string;
  refreshToken: string;
}

interface AdminTokenPairResult {
  actorType: 'admin';
  admin: Admin;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly accountRepository: AccountRepository,
    private readonly authCodeRepository: AuthCodeRepository,
    private readonly adminRepository: AdminRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureAdminExists();
  }

  getRefreshCookieName(): string {
    return this.configService.get('auth.refreshCookieName', { infer: true });
  }

  async loginByCode(code: string): Promise<UserTokenPairResult> {
    const normalizedCode = this.normalizeCode(code);
    const codeRecord = await this.authCodeRepository.findByCodeWithAccount(normalizedCode);

    if (!codeRecord) {
      throw new UnauthorizedException('Authentication code is invalid');
    }

    const account = await this.accountRepository.updateLastTimeLoggedIn(
      codeRecord.account.id,
      new Date(),
    );

    return this.issueUserTokenPair(account);
  }

  async loginAdmin(payload: AdminLoginDto): Promise<AdminTokenPairResult> {
    const username = payload.username.trim();
    const admin = await this.adminRepository.findByUsername(username);

    if (!admin) {
      throw new UnauthorizedException('Admin credentials are invalid');
    }

    const isPasswordValid = await compare(payload.password, admin.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Admin credentials are invalid');
    }

    const updatedAdmin = await this.adminRepository.updateLastTimeLoggedIn(admin.id, new Date());

    return this.issueAdminTokenPair(updatedAdmin);
  }

  async refreshUserTokens(refreshToken: string | undefined): Promise<UserTokenPairResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const payload = await this.verifyRefreshToken(refreshToken);

    if (payload.actorType !== 'user') {
      throw new UnauthorizedException('Refresh token actor type is invalid');
    }

    const account = await this.accountRepository.findById(payload.sub);

    if (!account) {
      throw new UnauthorizedException('Account is not found');
    }

    return this.issueUserTokenPair(account);
  }

  async refreshAdminTokens(refreshToken: string | undefined): Promise<AdminTokenPairResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const payload = await this.verifyRefreshToken(refreshToken);

    if (payload.actorType !== 'admin') {
      throw new UnauthorizedException('Refresh token actor type is invalid');
    }

    const admin = await this.adminRepository.findById(payload.sub);

    if (!admin) {
      throw new UnauthorizedException('Admin is not found');
    }

    return this.issueAdminTokenPair(admin);
  }

  async getAuthenticatedUser(accountId: string): Promise<AuthenticatedUserDto> {
    const account = await this.accountRepository.findById(accountId);

    if (!account) {
      throw new UnauthorizedException('Account is not found');
    }

    return this.toAuthenticatedUser(account);
  }

  async getAuthenticatedAdmin(adminId: string): Promise<AuthenticatedAdminDto> {
    const admin = await this.adminRepository.findById(adminId);

    if (!admin) {
      throw new UnauthorizedException('Admin is not found');
    }

    return this.toAuthenticatedAdmin(admin);
  }

  async createAccountByAdmin(
    payload: AdminCreateAccountDto,
    uploadedAvatarUrl?: string,
  ): Promise<AdminCreateAccountResponseDto> {
    for (let attempt = 1; attempt <= MAX_AUTH_CODE_GENERATION_ATTEMPTS; attempt += 1) {
      const generatedCode = this.generateAuthCode();

      try {
        const created = await this.prisma.$transaction(async (tx) => {
          const account = await this.accountRepository.create(
            {
              username: payload.username,
              avatarUrl: uploadedAvatarUrl ?? payload.avatarUrl,
              ...(payload.balance !== undefined ? { balance: payload.balance } : {}),
              strength: payload.strength,
              charisma: payload.charisma,
              endurance: payload.endurance,
              intelligence: payload.intelligence,
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

        if (this.isUsernameCollision(error)) {
          throw new BadRequestException('Username is already in use');
        }

        throw new InternalServerErrorException('Failed to create account');
      }
    }

    throw new InternalServerErrorException('Failed to generate unique account code');
  }

  toUserAuthTokensResponse(result: UserTokenPairResult): AuthTokensResponseDto {
    return {
      accessToken: result.accessToken,
      user: this.toAuthenticatedUser(result.account),
    };
  }

  toAdminAuthTokensResponse(result: AdminTokenPairResult): AdminAuthTokensResponseDto {
    return {
      accessToken: result.accessToken,
      admin: this.toAuthenticatedAdmin(result.admin),
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

  private async ensureAdminExists(): Promise<void> {
    const existingAdmin = await this.adminRepository.findSingleton();

    if (existingAdmin) {
      return;
    }

    const username = this.configService.get('auth.adminUsername', { infer: true }).trim();
    const password = this.configService.get('auth.adminPassword', { infer: true });
    const passwordHash = await hash(password, ADMIN_PASSWORD_SALT_ROUNDS);

    try {
      await this.adminRepository.createSingleton({
        username,
        passwordHash,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return;
      }

      throw new InternalServerErrorException('Failed to initialize admin account');
    }
  }

  private async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.configService.get('auth.jwtRefreshSecret', { infer: true }),
      });

      if (
        payload.tokenType !== 'refresh' ||
        !payload.sub ||
        (payload.actorType !== 'user' && payload.actorType !== 'admin')
      ) {
        throw new UnauthorizedException('Refresh token is invalid');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Refresh token is invalid');
    }
  }

  private async issueUserTokenPair(account: Account): Promise<UserTokenPairResult> {
    const accessPayload: AccessTokenPayload = {
      sub: account.id,
      username: account.username,
      actorType: 'user',
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: account.id,
      tokenType: 'refresh',
      actorType: 'user',
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
      actorType: 'user',
      account,
      accessToken,
      refreshToken,
    };
  }

  private async issueAdminTokenPair(admin: Admin): Promise<AdminTokenPairResult> {
    const accessPayload: AccessTokenPayload = {
      sub: admin.id,
      username: admin.username,
      actorType: 'admin',
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: admin.id,
      tokenType: 'refresh',
      actorType: 'admin',
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
      actorType: 'admin',
      admin,
      accessToken,
      refreshToken,
    };
  }

  private toAuthenticatedUser(account: Account): AuthenticatedUserDto {
    return {
      id: account.id,
      username: account.username,
      avatarUrl: account.avatarUrl ?? null,
      balance: account.balance,
      strength: account.strength,
      charisma: account.charisma,
      endurance: account.endurance,
      intelligence: account.intelligence,
      lastTimeLoggedIn: account.lastTimeLoggedIn?.toISOString() ?? null,
      createdAt: account.createdAt.toISOString(),
    };
  }

  private toAuthenticatedAdmin(admin: Admin): AuthenticatedAdminDto {
    return {
      id: admin.id,
      username: admin.username,
      lastTimeLoggedIn: admin.lastTimeLoggedIn?.toISOString() ?? null,
      createdAt: admin.createdAt.toISOString(),
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

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private isUsernameCollision(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    if (error.code !== 'P2002') {
      return false;
    }

    const target = error.meta?.target;

    if (Array.isArray(target)) {
      return target.some(
        (field) => typeof field === 'string' && field.toLowerCase().includes('username'),
      );
    }

    return typeof target === 'string' && target.toLowerCase().includes('username');
  }
}
