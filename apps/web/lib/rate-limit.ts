// NOTE: This is an in-memory rate limiter that only works in single-process
// environments (local dev, single-instance deployments). On Vercel serverless,
// each invocation is a separate process with its own memory, so this provides
// no rate limiting in production. To enforce rate limits on Vercel, replace
// this with @upstash/redis or @vercel/kv.

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

export function checkRateLimit(
  key: string,
  maxRequests = 30,
  windowMs = 60000
): { allowed: boolean; remaining: number } {
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
