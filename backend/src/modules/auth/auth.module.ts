import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AdminOnlyGuard } from './guards/admin-only.guard';
import { AccountRepository } from './repositories/account.repository';
import { AdminRepository } from './repositories/admin.repository';
import { AuthCodeRepository } from './repositories/auth-code.repository';

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
  exports: [JwtModule, AccessTokenGuard, AdminOnlyGuard, AccountRepository],
})
export class AuthModule {}
