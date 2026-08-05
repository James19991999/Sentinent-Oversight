import "server-only";
import type { Ratelimit } from "@upstash/ratelimit";

/**
 * Two implementations behind one interface, selected automatically:
 *
 * - If UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set, uses
 *   real distributed rate limiting via Upstash Redis — correct on a
 *   multi-instance/serverless deployment (this app's stated Vercel
 *   target), since the counter lives outside any single process.
 * - Otherwise falls back to the in-memory limiter below, which only
 *   works correctly on a single, long-running process. An audit found
 *   "no rate limiting at all" as a live, reproducible gap; this closes
 *   it for real single-instance/dev use immediately, and for a genuine
 *   multi-instance production launch as soon as two env vars are set —
 *   no code changes required at that point, which was the whole point
 *   of writing this now instead of leaving it as a documented TODO.
 *
 * The Upstash SDK is dynamically imported, not imported at module top
 * level: it pulls in an ESM-only transitive dependency that breaks under
 * plain CommonJS `require` (as used by Jest and by any code path that
 * never needs Upstash at all). Loading it only when actually configured
 * avoids that entirely, and also means zero cost — no client
 * construction, no extra bundle weight — for every request that takes
 * the in-memory path.
 */
const upstashConfigured = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

let redisPromise: ReturnType<typeof createRedisClient> | null = null;
const upstashLimiters = new Map<number, Ratelimit>();

async function createRedisClient() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

async function getUpstashLimiter(limit: number): Promise<Ratelimit> {
  const cached = upstashLimiters.get(limit);
  if (cached) return cached;

  if (!redisPromise) {
    redisPromise = createRedisClient();
  }
  const [{ Ratelimit }, redis] = await Promise.all([import("@upstash/ratelimit"), redisPromise]);

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, "60 s"),
    analytics: false,
  });
  upstashLimiters.set(limit, limiter);
  return limiter;
}

// --- In-memory fallback (dev / single-instance / no Upstash configured) ---
const WINDOW_MS = 60_000;
const memoryBuckets = new Map<string, { count: number; windowStart: number }>();

function checkMemoryRateLimit(key: string, limit: number): RateLimitResult {
  const now = Date.now();
  const existing = memoryBuckets.get(key);

  if (!existing || now - existing.windowStart >= WINDOW_MS) {
    memoryBuckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.ceil((existing.windowStart + WINDOW_MS - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function checkRateLimit(key: string, limit: number): Promise<RateLimitResult> {
  if (upstashConfigured) {
    const limiter = await getUpstashLimiter(limit);
    const { success, remaining, reset } = await limiter.limit(key);
    return {
      allowed: success,
      remaining,
      retryAfterSeconds: success ? 0 : Math.max(0, Math.ceil((reset - Date.now()) / 1000)),
    };
  }
  return checkMemoryRateLimit(key, limit);
}

export function isDistributedRateLimitActive(): boolean {
  return upstashConfigured;
}

/** Best-effort caller identity for an unauthenticated request. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}
