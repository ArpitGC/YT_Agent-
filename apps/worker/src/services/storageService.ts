import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "../config";

const s3 = new S3Client({
  region: config.s3Region,
  endpoint: config.s3Endpoint,
  forcePathStyle: config.s3ForcePathStyle,
  credentials: config.s3AccessKey && config.s3SecretKey ? {
    accessKeyId: config.s3AccessKey,
    secretAccessKey: config.s3SecretKey
  } : undefined
});

export async function uploadThumbnailObject(input: {
  key: string;
  bytes: Buffer;
  contentType: string;
}): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: config.s3Bucket,
    Key: input.key,
    Body: input.bytes,
    ContentType: input.contentType
  }));

  if (config.s3Endpoint) {
    return `${config.s3Endpoint}/${config.s3Bucket}/${input.key}`;
  }

  return `s3://${config.s3Bucket}/${input.key}`;
}
