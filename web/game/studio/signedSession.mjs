import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const STUDIO_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function createStudioSession(secret, now = Date.now()) {
  if (typeof secret !== "string" || secret.length === 0) {
    throw new TypeError("Studio session secret is required.");
  }
  const nonce = randomBytes(32).toString("hex");
  const expiresAt = Math.floor((now + STUDIO_SESSION_TTL_MS) / 1000);
  const payload = `${nonce}.${expiresAt}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyStudioSession(secret, value, now = Date.now()) {
  if (typeof secret !== "string" || secret.length === 0 || typeof value !== "string") return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [nonce, expiryText, signature] = parts;
  if (!/^[a-f0-9]{64}$/.test(nonce) || !/^\d+$/.test(expiryText) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expiresAt = Number(expiryText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt * 1000 <= now) return false;
  const payload = `${nonce}.${expiryText}`;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
