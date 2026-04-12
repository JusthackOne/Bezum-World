export interface AppConfig {
  app: {
    nodeEnv: 'development' | 'production' | 'test';
    port: number;
    logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  };
  database: {
    url: string;
  };
  redis: {
    host: string;
    port: number;
    db: number;
    password?: string;
  };
  queue: {
    defaultName: string;
  };
  auth: {
    jwtAccessSecret: string;
    jwtRefreshSecret: string;
    accessTokenTtlSeconds: number;
    refreshTokenTtlSeconds: number;
    refreshCookieName: string;
    refreshCookieSecure: boolean;
    adminUsername: string;
    adminPassword: string;
  };
}

export const configFactory = (): AppConfig => ({
  app: {
    nodeEnv: (process.env.NODE_ENV as AppConfig['app']['nodeEnv']) ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    logLevel: (process.env.LOG_LEVEL as AppConfig['app']['logLevel']) ?? 'info',
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    db: Number(process.env.REDIS_DB ?? 0),
    ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
  },
  queue: {
    defaultName: process.env.QUEUE_DEFAULT_NAME ?? 'default',
  },
  auth: {
    jwtAccessSecret: process.env.AUTH_JWT_ACCESS_SECRET ?? '',
    jwtRefreshSecret: process.env.AUTH_JWT_REFRESH_SECRET ?? '',
    accessTokenTtlSeconds: Number(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS ?? 900),
    refreshTokenTtlSeconds: Number(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS ?? 604800),
    refreshCookieName: process.env.AUTH_REFRESH_COOKIE_NAME ?? 'refresh_token',
    refreshCookieSecure: process.env.AUTH_REFRESH_COOKIE_SECURE === 'true',
    adminUsername: process.env.AUTH_ADMIN_USERNAME ?? '',
    adminPassword: process.env.AUTH_ADMIN_PASSWORD ?? '',
  },
});
