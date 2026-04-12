import { isIP } from 'node:net';
import { z } from 'zod';

const REDIS_HOSTNAME_PATTERN = /^(?=.{1,253}$)(?!-)(?:[A-Za-z0-9-]{1,63}\.)*[A-Za-z0-9-]{1,63}$/;

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalizedValue)) {
      return true;
    }

    if (['false', '0', 'no', 'off'].includes(normalizedValue)) {
      return false;
    }
  }

  return value;
}, z.boolean());

const postgresUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === 'postgresql:' || protocol === 'postgres:';
  }, 'DATABASE_URL must use postgres:// or postgresql:// protocol');

export const envValidationSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: postgresUrlSchema,
    REDIS_HOST: z
      .string()
      .min(1)
      .refine((value) => isIP(value) !== 0 || REDIS_HOSTNAME_PATTERN.test(value), {
        message: 'REDIS_HOST must be a valid hostname or IP address',
      }),
    REDIS_PORT: z.coerce.number().int().min(1).max(65535),
    REDIS_DB: z.coerce.number().int().min(0).default(0),
    REDIS_PASSWORD: z.string().optional(),
    QUEUE_DEFAULT_NAME: z.string().min(1).default('default'),
    AUTH_JWT_ACCESS_SECRET: z.string().min(16),
    AUTH_JWT_REFRESH_SECRET: z.string().min(16),
    AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
    AUTH_REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().min(300).default(604800),
    AUTH_REFRESH_COOKIE_NAME: z.string().min(1).default('refresh_token'),
    AUTH_REFRESH_COOKIE_SECURE: booleanFromEnv.default(false),
    AUTH_ADMIN_USERNAME: z.string().trim().min(3).max(64),
    AUTH_ADMIN_PASSWORD: z.string().min(8),
  })
  .passthrough();

export const validateEnvironment = (
  config: Record<string, unknown>,
): Record<string, unknown> => {
  const parsedConfig = envValidationSchema.safeParse(config);

  if (!parsedConfig.success) {
    const errorDetails = parsedConfig.error.issues
      .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Environment validation failed: ${errorDetails}`);
  }

  return parsedConfig.data;
};
