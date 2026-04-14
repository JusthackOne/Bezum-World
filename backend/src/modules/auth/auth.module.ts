import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AdminOnlyGuard } from './guards/admin-only.guard';
import { AccountRepository, AdminRepository, AuthCodeRepository } from './repositories';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccountRepository,
    AuthCodeRepository,
    AdminRepository,
    AccessTokenGuard,
    AdminOnlyGuard,
  ],
  exports: [JwtModule, AuthService, AccessTokenGuard, AdminOnlyGuard, AccountRepository],
})
export class AuthModule {}
