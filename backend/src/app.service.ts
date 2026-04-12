import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly startedAt = Date.now();

  getHealthStatus() {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }
}
