import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const hasUpstash = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

if (!hasUpstash && process.env.VERCEL) {
  console.warn(
    "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting disabled on Vercel"
  );
}

const redis = hasUpstash
  ? new Redis({ url: UPSTASH_URL!, token: UPSTASH_TOKEN! })
  : null;

const ratelimiters = new Map<string, Ratelimit>();

function getRatelimiter(maxRequests: number, windowMs: number) {
  const key = `${maxRequests}/${windowMs}`;
  let rl = ratelimiters.get(key);
  if (!rl && redis) {
    rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs / 1000} s`),
      analytics: true,
    });
    ratelimiters.set(key, rl);
  }
  return rl ?? null;
}

const rateMap = new Map<string, { count: number; resetAt: number }>();
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of rateMap) {
    if (now > entry.resetAt) rateMap.delete(key);
  }
}

export async function checkRateLimit(
  key: string,
  maxRequests = 30,
  windowMs = 60000
): Promise<{ allowed: boolean; remaining: number }> {
  const rl = getRatelimiter(maxRequests, windowMs);
  if (rl) {
    const { success, remaining } = await rl.limit(key);
    return { allowed: success, remaining };
  }

  cleanup();
  const now = Date.now();
  const entry = rateMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count++;
  return { allowed: entry.count <= maxRequests, remaining: Math.max(0, maxRequests - entry.count) };
}
