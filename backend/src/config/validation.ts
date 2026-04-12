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
});
