/**
 * In-process rate limiting.
 *
 * Netlify's own rate limiting (declared via `export const config` in each
 * function) is the primary control and runs at the edge. This module is a
 * second, cheaper guard inside the function container: it survives across warm
 * invocations and blunts a burst from a single IP before it reaches Brevo,
 * iPaymu or the database.
 *
 * It is intentionally not a distributed limiter. Containers do not share
 * memory, so a determined attacker spread across instances is handled by the
 * edge rule, not by this.
 */

const buckets = new Map();
const MAX_TRACKED_KEYS = 5000;

function sweep(now) {
  if (buckets.size < MAX_TRACKED_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Still oversized: drop the oldest half rather than grow without bound.
  if (buckets.size >= MAX_TRACKED_KEYS) {
    const keys = [...buckets.keys()].slice(0, Math.floor(buckets.size / 2));
    for (const key of keys) buckets.delete(key);
  }
}

/**
 * @returns {{ allowed: boolean, retryAfterSeconds: number }}
 */
export function checkRateLimit(key, { limit = 10, windowSeconds = 60 } = {}) {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1)
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}
