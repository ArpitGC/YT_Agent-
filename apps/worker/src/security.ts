import crypto from "node:crypto";
import { config } from "./config";

const key = Buffer.from(config.encryptionKeyBase64, "base64");

export function decryptText(payload: string): string {
  const [ivB64, cipherB64, tagB64] = payload.split(".");
  const iv = Buffer.from(ivB64, "base64");
  const enc = Buffer.from(cipherB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
