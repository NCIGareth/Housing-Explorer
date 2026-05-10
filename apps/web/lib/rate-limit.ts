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
