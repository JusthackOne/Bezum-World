import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import type { AppConfig } from '../../config/configuration';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const isDevelopment = configService.get('app.nodeEnv', { infer: true }) === 'development';
        const prettyTransport = isDevelopment
          ? {
              transport: {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:standard',
                },
              },
            }
          : {};

        return {
          pinoHttp: {
            level: configService.get('app.logLevel', { infer: true }),
            redact: ['req.headers.authorization'],
            ...prettyTransport,
          },
        };
      },
    }),
  ],
  exports: [LoggerModule],
})
export class AppLoggerModule {}
