import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { QueueModule } from '../../infrastructure/queue/queue.module';
import { AuthModule } from '../auth/auth.module';
import { BOSS_BATTLES_QUEUE } from './boss-battles.constants';
import { AdminBossBattlesController, BossBattlesController } from './boss-battles.controller';
import { BossBattlesProcessor } from './boss-battles.processor';
import { BossBattlesRepository } from './boss-battles.repository';
import { BossBattlesService } from './boss-battles.service';

@Module({
  imports: [
    PrismaModule,
    QueueModule,
    BullModule.registerQueue({ name: BOSS_BATTLES_QUEUE }),
    AuthModule,
  ],
  controllers: [BossBattlesController, AdminBossBattlesController],
  providers: [BossBattlesService, BossBattlesRepository, BossBattlesProcessor],
})
export class BossBattlesModule {}
