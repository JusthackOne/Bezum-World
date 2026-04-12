export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  LOG_LEVEL: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  DATABASE_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_DB: number;
  REDIS_PASSWORD?: string;
  QUEUE_DEFAULT_NAME: string;
  AUTH_JWT_ACCESS_SECRET: string;
  AUTH_JWT_REFRESH_SECRET: string;
  AUTH_ACCESS_TOKEN_TTL_SECONDS: number;
  AUTH_REFRESH_TOKEN_TTL_SECONDS: number;
  AUTH_REFRESH_COOKIE_NAME: string;
  AUTH_REFRESH_COOKIE_SECURE: boolean;
  AUTH_ADMIN_API_KEY: string;
}
