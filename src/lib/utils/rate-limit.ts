// Simple in-memory rate limiter
// Note: In serverless environments (e.g., Vercel), this will be scoped per instance.
// For true global rate limiting, use Redis (e.g., @upstash/ratelimit)

type TokenBucket = {
  count: number;
  resetAt: number;
};

const cache = new Map<string, TokenBucket>();

export function rateLimit(identifier: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = cache.get(identifier);

  // Lazy cleanup if cache gets too large (prevent memory leak)
  if (cache.size > 10000) {
    for (const [key, val] of cache.entries()) {
      if (val.resetAt < now) {
        cache.delete(key);
      }
    }
  }

  if (!bucket || bucket.resetAt < now) {
    // New bucket or expired bucket
    cache.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { success: true };
  }

  if (bucket.count >= limit) {
    // Rate limit exceeded
    return { success: false };
  }

  // Increment
  bucket.count += 1;
  cache.set(identifier, bucket);
  return { success: true };
}
