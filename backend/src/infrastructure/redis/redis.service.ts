import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  getClient(): Redis {
    return this.redisClient;
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.redisClient.status === 'ready' || this.redisClient.status === 'connect') {
      await this.redisClient.quit();
    }
  }
}
