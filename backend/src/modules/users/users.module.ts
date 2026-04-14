import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminUsersController } from './admin-users.controller';
import { UserItemsRepository, UserProfileRepository } from './repositories';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService, UserProfileRepository, UserItemsRepository],
})
export class UsersModule {}
