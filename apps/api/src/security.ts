import crypto from "node:crypto";
import { config } from "./config";

const key = Buffer.from(config.encryptionKeyBase64, "base64");
if (key.length !== 32) {
  throw new Error("ENCRYPTION_KEY_BASE64 must decode to 32 bytes for AES-256-GCM");
}

export function encryptText(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), encrypted.toString("base64"), tag.toString("base64")].join(".");
}

export function decryptText(payload: string): string {
  const [ivB64, cipherB64, tagB64] = payload.split(".");
  const iv = Buffer.from(ivB64, "base64");
  const enc = Buffer.from(cipherB64, "base64");
  const tag = Buffer.from(tagB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(enc), decipher.final()]);
  return out.toString("utf8");
}
