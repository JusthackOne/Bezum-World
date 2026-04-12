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
});
