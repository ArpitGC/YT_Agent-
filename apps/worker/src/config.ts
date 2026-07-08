import dotenv from "dotenv";

dotenv.config();

export const config = {
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  databaseUrl: process.env.DATABASE_URL ?? "",
  encryptionKeyBase64: process.env.ENCRYPTION_KEY_BASE64 ?? "",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiTextModel: process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini",
  openAiImageModel: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
  workerConcurrency: Number(process.env.WORKER_CONCURRENCY ?? "2"),
  youtubeClientId: process.env.YOUTUBE_CLIENT_ID ?? "",
  youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET ?? "",
  youtubeRedirectUri: process.env.YOUTUBE_REDIRECT_URI ?? "",
  s3Endpoint: process.env.S3_ENDPOINT,
  s3Region: process.env.S3_REGION ?? "us-east-1",
  s3AccessKey: process.env.S3_ACCESS_KEY,
  s3SecretKey: process.env.S3_SECRET_KEY,
  s3Bucket: process.env.S3_BUCKET ?? "yt-agent-assets",
  s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true"
};
