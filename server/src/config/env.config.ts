import { z } from 'zod';

const envSchema = z.object({
  // Server
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Database
  DATABASE_URL: z.string(),
  DIRECT_URL: z.string().optional(),

  // Supabase
  SUPABASE_URL: z.string(),
  SUPABASE_SERVICE_KEY: z.string(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().default('0'),

  // Upstash Redis (Optional)
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  UPSTASH_REDIS_REGION: z.string().optional(),

  // Clerk Authentication
  CLERK_SECRET_KEY: z.string(),
  CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_WEBHOOK_SECRET: z.string(),

  // Stripe
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),

  // Google AI
  GOOGLE_AI_API_KEY: z.string(),

  // Security
  ENCRYPTION_KEY: z.string(),

  // Feature Flags
  ENABLE_DEMO_MODE: z.enum(['true', 'false']).default('false'),
  ENABLE_PAPER_TRADING: z.enum(['true', 'false']).default('false'),
});

function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map(err => err.path.join('.'))
        .join(', ');
      throw new Error(`Missing environment variables: ${missingVars}`);
    }
    throw error;
  }
}

export const env = validateEnv();
