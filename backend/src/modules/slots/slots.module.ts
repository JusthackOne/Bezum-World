import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SlotsRepository } from './repositories';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SlotsController],
  providers: [SlotsService, SlotsRepository],
})
export class SlotsModule {}
