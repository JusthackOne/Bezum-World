import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { ItemRepository } from './repositories';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ItemsController],
  providers: [ItemsService, ItemRepository],
})
export class ItemsModule {}
