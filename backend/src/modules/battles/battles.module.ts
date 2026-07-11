import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { BattlesController } from './battles.controller';
import { BattlesService } from './battles.service';
import { BattleRepository } from './repositories';

@Module({
  imports: [PrismaModule, AuthModule, EventsModule],
  controllers: [BattlesController],
  providers: [BattlesService, BattleRepository],
})
export class BattlesModule {}
