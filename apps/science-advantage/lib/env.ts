import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .optional()
    .default('postgresql://localhost:5432/test'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE: z.string().optional(),
  DEV_AUTH_ENABLED: z.string().optional(),
  REDIS_URL: z.string().optional(),
});

const rawEnv = envSchema.parse(process.env);

export const env = {
  ...rawEnv,
  NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE:
    rawEnv.NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE !== undefined
      ? rawEnv.NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE === 'true'
      : rawEnv.NODE_ENV !== 'production',
  DEV_AUTH_ENABLED:
    rawEnv.DEV_AUTH_ENABLED !== undefined
      ? rawEnv.DEV_AUTH_ENABLED === 'true'
      : rawEnv.NODE_ENV === 'development',
};
