import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { join } from 'node:path';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import type { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.use(cookieParser());
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  const configService = app.get<ConfigService<AppConfig, true>>(ConfigService);
  const port = configService.get('app.port', { infer: true });
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Social RPG API')
    .setDescription('API documentation for Social RPG backend.')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token in Authorization header',
      },
      'access-token',
    )
    .addCookieAuth(
      configService.get('auth.refreshCookieName', { infer: true }),
      {
        type: 'apiKey',
        in: 'cookie',
        name: configService.get('auth.refreshCookieName', { infer: true }),
        description: 'Refresh token cookie',
      },
      'refresh-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  app.get(Logger).log(`Backend is running on http://localhost:${port}/api/health`, 'Bootstrap');
  app.get(Logger).log(`Swagger docs available on http://localhost:${port}/docs`, 'Bootstrap');
}

void bootstrap();
