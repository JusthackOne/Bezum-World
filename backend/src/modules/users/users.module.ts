import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ItemsModule } from '../items/items.module';
import { AdminUsersController } from './admin-users.controller';
import {
  UserEquipmentRepository,
  UserItemsRepository,
  UserProfileRepository,
} from './repositories';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule, AuthModule, ItemsModule],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService, UserProfileRepository, UserItemsRepository, UserEquipmentRepository],
})
export class UsersModule {}
