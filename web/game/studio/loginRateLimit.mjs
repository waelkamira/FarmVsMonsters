import { createHash } from "node:crypto";

export const STUDIO_LOGIN_MAX_ATTEMPTS = 5;
export const STUDIO_LOGIN_WINDOW_SECONDS = 15 * 60;

const localBuckets = new Map();
const REDIS_INCREMENT_SCRIPT = [
  "local count = redis.call('INCR', KEYS[1])",
  "if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
  "return count"
].join("\n");

function clientAddress(request) {
  const direct = request.headers.get("x-real-ip");
  if (direct) return direct.trim().slice(0, 128);
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",").at(-1).trim().slice(0, 128);
  return "unknown";
}

function rateLimitKey(address) {
  const digest = createHash("sha256").update(address).digest("hex");
  return "fvm:studio-login:" + digest;
}

function consumeLocalAttempt(address, now) {
  const key = rateLimitKey(address);
  let bucket = localBuckets.get(key);
  if (!bucket || bucket.expiresAt <= now) {
    bucket = { count: 0, expiresAt: now + STUDIO_LOGIN_WINDOW_SECONDS * 1000 };
  }
  bucket.count += 1;
  localBuckets.set(key, bucket);
  if (localBuckets.size > 2048) {
    for (const [entryKey, entry] of localBuckets) {
      if (entry.expiresAt <= now) localBuckets.delete(entryKey);
    }
  }
  return {
    allowed: bucket.count <= STUDIO_LOGIN_MAX_ATTEMPTS,
    remaining: Math.max(0, STUDIO_LOGIN_MAX_ATTEMPTS - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000)),
    unavailable: false
  };
}

export async function consumeStudioLoginAttempt(request, options = {}) {
  const env = options.env || process.env;
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const address = clientAddress(request);
  const redisUrl = env.STUDIO_RATE_LIMIT_REDIS_REST_URL;
  const redisToken = env.STUDIO_RATE_LIMIT_REDIS_REST_TOKEN;

  if (!redisUrl && !redisToken) {
    if (env.NODE_ENV === "production") {
      return { allowed: false, remaining: 0, retryAfterSeconds: 0, unavailable: true };
    }
    return consumeLocalAttempt(address, now);
  }
  if (!redisUrl || !redisToken) {
    return { allowed: false, remaining: 0, retryAfterSeconds: 0, unavailable: true };
  }

  let endpoint;
  try {
    endpoint = new URL(redisUrl);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) throw new Error("Invalid Redis URL.");
  } catch {
    return { allowed: false, remaining: 0, retryAfterSeconds: 0, unavailable: true };
  }

  try {
    const fetchImpl = options.fetchImpl || fetch;
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + redisToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(["EVAL", REDIS_INCREMENT_SCRIPT, 1, rateLimitKey(address), STUDIO_LOGIN_WINDOW_SECONDS]),
      cache: "no-store",
      signal: AbortSignal.timeout(2500)
    });
    if (!response.ok) throw new Error("Rate-limit store unavailable.");
    const payload = await response.json();
    const count = Number(payload?.result);
    if (!Number.isSafeInteger(count) || count < 1) throw new Error("Invalid rate-limit response.");
    return {
      allowed: count <= STUDIO_LOGIN_MAX_ATTEMPTS,
      remaining: Math.max(0, STUDIO_LOGIN_MAX_ATTEMPTS - count),
      retryAfterSeconds: STUDIO_LOGIN_WINDOW_SECONDS,
      unavailable: false
    };
  } catch {
    // Production authentication fails closed if the shared rate-limit store is down.
    return { allowed: false, remaining: 0, retryAfterSeconds: 0, unavailable: true };
  }
}
