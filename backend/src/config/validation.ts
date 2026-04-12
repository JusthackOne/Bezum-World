import Joi from 'joi';

import type { EnvironmentVariables } from './env/environment.type';

export const envValidationSchema = Joi.object<EnvironmentVariables, true>({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  REDIS_HOST: Joi.string().hostname().required(),
  REDIS_PORT: Joi.number().port().required(),
  REDIS_DB: Joi.number().integer().min(0).default(0),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  QUEUE_DEFAULT_NAME: Joi.string().min(1).default('default'),
  AUTH_JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  AUTH_JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  AUTH_ACCESS_TOKEN_TTL_SECONDS: Joi.number().integer().min(60).default(900),
  AUTH_REFRESH_TOKEN_TTL_SECONDS: Joi.number().integer().min(300).default(604800),
  AUTH_REFRESH_COOKIE_NAME: Joi.string().min(1).default('refresh_token'),
  AUTH_REFRESH_COOKIE_SECURE: Joi.boolean().default(false),
  AUTH_ADMIN_USERNAME: Joi.string().trim().min(3).max(64).required(),
  AUTH_ADMIN_PASSWORD: Joi.string().min(8).required(),
});
