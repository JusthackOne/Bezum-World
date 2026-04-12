import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Bezum World Frontend"),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:3001/api"),
});

const parsedEnv = envSchema.safeParse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

if (!parsedEnv.success) {
  throw new Error(`Invalid frontend environment: ${parsedEnv.error.message}`);
}

export const env = parsedEnv.data;
