import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-flash-latest'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  MAX_TOOL_CALLS: z.coerce.number().default(10),
  MAX_RETRIES: z.coerce.number().default(3),
  TASK_TIMEOUT_MS: z.coerce.number().default(120000),
  APPROVAL_THRESHOLD_AMOUNT: z.coerce.number().default(10000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[Config Error] Invalid environment configuration:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isLiveAI: Boolean(parsed.data.GEMINI_API_KEY && parsed.data.GEMINI_API_KEY.trim().length > 5),
  isTest: parsed.data.NODE_ENV === 'test',
  isDev: parsed.data.NODE_ENV === 'development',
  isProd: parsed.data.NODE_ENV === 'production',
};
