import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  getStubStatus(echo?: string) {
    return {
      module: 'auth',
      status: 'stub',
      echo: echo ?? null,
      message: 'Auth module is initialized as placeholder.',
      timestamp: new Date().toISOString(),
    };
  }
}
