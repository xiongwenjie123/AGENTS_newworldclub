import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "enc:v1:";
const IV_LEN = 12;

function getKey(): Buffer {
  const secret =
    process.env.NW_SESSION_SECRET ||
    process.env.COZE_WORKLOAD_IDENTITY_CLIENT_SECRET ||
    "new-world-club-default-dev-secret-change-me-0x5173";
  return scryptSync(secret, "nw-club-answer-enc", 32);
}

/** 加密明文，返回 `enc:v1:<base64(iv|ciphertext|authTag)>` */
export function encryptText(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, enc, tag]);
  return PREFIX + combined.toString("base64");
}

/** 解密 `enc:v1:` 前缀的密文；非加密格式原样返回（向后兼容） */
export function decryptText(stored: string | null | undefined): string {
  if (!stored) return "";
  if (!stored.startsWith(PREFIX)) return stored;
  try {
    const combined = Buffer.from(stored.slice(PREFIX.length), "base64");
    const iv = combined.subarray(0, IV_LEN);
    const tag = combined.subarray(combined.length - 16);
    const enc = combined.subarray(IV_LEN, combined.length - 16);
    const decipher = createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return "";
  }
}