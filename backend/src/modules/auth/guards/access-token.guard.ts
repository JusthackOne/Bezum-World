import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import type { AppConfig } from '../../../config/configuration';
import type { AccessTokenPayload } from '../types/access-token-payload.type';
import type { RequestWithAuthUser } from '../types/request-with-auth-user.type';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuthUser>();
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader) {
      throw new UnauthorizedException('Access token is required');
    }

    const [scheme, token] = authorizationHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Access token is invalid');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.configService.get('auth.jwtAccessSecret', { infer: true }),
      });

      if (!payload.sub || !payload.username || !payload.actorType) {
        throw new UnauthorizedException('Access token payload is invalid');
      }

      request.user = payload;

      return true;
    } catch {
      throw new UnauthorizedException('Access token is invalid');
    }
  }
}
