import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { configFactory } from './config/configuration';
import { validateEnvironment } from './config/validation';
import { PrismaModule } from './database/prisma/prisma.module';
import { AppLoggerModule } from './infrastructure/logger/logger.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { ItemsModule } from './modules/items/items.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [configFactory],
      validate: validateEnvironment,
    }),
    AppLoggerModule,
    PrismaModule,
    RedisModule,
    QueueModule,
    AuthModule,
    ItemsModule,
    LeaderboardModule,
    TasksModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
