import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { DEFAULT_QUEUE_NAME } from '../../common/constants/queue.constants';
import type { AppConfig } from '../../config/configuration';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const redisConfig = configService.get('redis', { infer: true });

        return {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            db: redisConfig.db,
            password: redisConfig.password,
          },
          defaultJobOptions: {
            removeOnComplete: 1000,
            removeOnFail: 5000,
            attempts: 1,
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: DEFAULT_QUEUE_NAME,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
