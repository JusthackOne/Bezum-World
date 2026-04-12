import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UserItemsRepository } from './repositories/user-items.repository';
import { UserProfileRepository } from './repositories/user-profile.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UsersController],
  providers: [UsersService, UserProfileRepository, UserItemsRepository],
})
export class UsersModule {}
