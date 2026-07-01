import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),

  PORT: z.string(),

  DATABASE_URL: z.string(),

  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_REFRESH_EXPIRES_IN: z.string(),

  TELEGRAM_BOT_TOKEN: z.string(),
  TELEGRAM_BOT_USERNAME: z.string(),

  NOMBA_BASE_URL: z.string(),
  NOMBA_PUBLIC_KEY: z.string(),
  NOMBA_SECRET_KEY: z.string(),
  NOMBA_ACCOUNT_ID: z.string(),

  CLIENT_URL: z.string(),
  ADMIN_URL: z.string(),
  MINI_APP_URL: z.string(),
});

export const env = envSchema.parse(process.env);
