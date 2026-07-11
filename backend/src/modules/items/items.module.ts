import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { ItemRepository } from './repositories';

@Module({
  imports: [PrismaModule, AuthModule, EventsModule],
  controllers: [ItemsController],
  providers: [ItemsService, ItemRepository],
  exports: [ItemRepository],
})
export class ItemsModule {}
