import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';

import { RedisService } from '../../infrastructure/redis/redis.service';
import type { RequestWithAuthUser } from '../auth/types/request-with-auth-user.type';
import {
  CIVILIZATION_MUTATION_RATE_LIMIT,
  CIVILIZATION_MUTATION_RATE_WINDOW_SECONDS,
} from './civilization.constants';
import { CIVILIZATION_ERROR_CODES, CivilizationException } from './civilization.errors';

@Injectable()
export class CivilizationRateLimitGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuthUser>();
    const actorId = request.user?.sub;

    if (!actorId) {
      return true;
    }

    const window = Math.floor(Date.now() / (CIVILIZATION_MUTATION_RATE_WINDOW_SECONDS * 1_000));
    const route = request.route?.path ?? request.path;
    const key = `civilization:mutation-rate:${actorId}:${request.method}:${route}:${window}`;
    const redis = this.redisService.getClient();
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, CIVILIZATION_MUTATION_RATE_WINDOW_SECONDS + 1);
    }

    if (count > CIVILIZATION_MUTATION_RATE_LIMIT) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TOO_MANY_ACTIONS,
        'Too many Civilization mutations. Try again shortly.',
        429,
        { retryAfterSeconds: CIVILIZATION_MUTATION_RATE_WINDOW_SECONDS },
      );
    }

    return true;
  }
}
