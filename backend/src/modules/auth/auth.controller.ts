import { Controller, Get, Query } from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthStatusQueryDto } from './dto/auth-status-query.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('status')
  getStatus(@Query() query: AuthStatusQueryDto) {
    return this.authService.getStubStatus(query.echo);
  }
}
