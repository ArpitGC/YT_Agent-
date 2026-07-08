import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  API_PORT: z.string().default("4000"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  WEB_URL: z.string().default("http://localhost:5173"),
  API_BASE_URL: z.string().default("http://localhost:4000"),
  JWT_SECRET: z.string().min(16),
  ENCRYPTION_KEY_BASE64: z.string().min(10),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_TEXT_MODEL: z.string().default("gpt-4.1-mini"),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-1"),
  YOUTUBE_CLIENT_ID: z.string().min(1),
  YOUTUBE_CLIENT_SECRET: z.string().min(1),
  YOUTUBE_REDIRECT_URI: z.string().url(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().default("yt-agent-assets"),
  S3_FORCE_PATH_STYLE: z.string().default("true"),
  DEFAULT_DAILY_LIMIT: z.string().default("5"),
  DEFAULT_MONTHLY_LIMIT: z.string().default("150")
});

const env = EnvSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  apiPort: Number(env.API_PORT),
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  webUrl: env.WEB_URL,
  apiBaseUrl: env.API_BASE_URL,
  jwtSecret: env.JWT_SECRET,
  encryptionKeyBase64: env.ENCRYPTION_KEY_BASE64,
  openAiApiKey: env.OPENAI_API_KEY,
  openAiTextModel: env.OPENAI_TEXT_MODEL,
  openAiImageModel: env.OPENAI_IMAGE_MODEL,
  youtubeClientId: env.YOUTUBE_CLIENT_ID,
  youtubeClientSecret: env.YOUTUBE_CLIENT_SECRET,
  youtubeRedirectUri: env.YOUTUBE_REDIRECT_URI,
  s3Endpoint: env.S3_ENDPOINT,
  s3Region: env.S3_REGION,
  s3AccessKey: env.S3_ACCESS_KEY,
  s3SecretKey: env.S3_SECRET_KEY,
  s3Bucket: env.S3_BUCKET,
  s3ForcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
  defaultDailyLimit: Number(env.DEFAULT_DAILY_LIMIT),
  defaultMonthlyLimit: Number(env.DEFAULT_MONTHLY_LIMIT)
};
