import { createHash } from "node:crypto";
import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { ApiError } from "@/lib/api";

type Entry = { count: number; resetAt: number };
type LimitResult = { allowed: boolean; retryAfter: number | null };

const localStore = new Map<string, Entry>();
const distributedLimiters = new Map<string, Ratelimit>();

function identifierHash(value: string) { return createHash("sha256").update(value).digest("hex"); }

function credentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (Boolean(url) !== Boolean(token)) throw new ApiError(503, "RATE_LIMIT_UNAVAILABLE", "ระบบป้องกันคำขอยังไม่พร้อม กรุณาลองใหม่ภายหลัง");
  return url && token ? { url, token } : null;
}

function consumeLocal(key: string, limit: number, windowMs: number): LimitResult {
  const now = Date.now();
  const entry = localStore.get(key);
  if (!entry || entry.resetAt <= now) { localStore.set(key, { count: 1, resetAt: now + windowMs }); return { allowed: true, retryAfter: null }; }
  if (entry.count >= limit) return { allowed: false, retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  entry.count++;
  if (localStore.size > 1_000) for (const [storedKey, value] of localStore) if (value.resetAt <= now) localStore.delete(storedKey);
  return { allowed: true, retryAfter: null };
}

async function consumeDistributed(scope: string, key: string, limit: number, windowMs: number, config: { url: string; token: string }): Promise<LimitResult> {
  const cacheKey = `${scope}:${limit}:${windowMs}`;
  let limiter = distributedLimiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: new Redis(config),
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms` as Duration),
      prefix: `christmasgift:ratelimit:${scope}`,
      analytics: false,
      timeout: 2_000
    });
    distributedLimiters.set(cacheKey, limiter);
  }
  try {
    const result = await limiter.limit(key);
    if (result.reason === "timeout") throw new Error("rate limit store timeout");
    return { allowed: result.success, retryAfter: result.success ? null : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)) };
  } catch {
    throw new ApiError(503, "RATE_LIMIT_UNAVAILABLE", "ระบบป้องกันคำขอยังไม่พร้อม กรุณาลองใหม่ภายหลัง");
  }
}

export async function consumeRateLimit(scope: string, identifier: string, limit: number, windowMs: number): Promise<LimitResult> {
  const key = identifierHash(identifier);
  const config = credentials();
  if (config) return consumeDistributed(scope, key, limit, windowMs, config);
  if (process.env.NODE_ENV === "production") throw new ApiError(503, "RATE_LIMIT_UNAVAILABLE", "ระบบป้องกันคำขอยังไม่พร้อม กรุณาลองใหม่ภายหลัง");
  return consumeLocal(`${scope}:${key}`, limit, windowMs);
}

export async function assertRateLimit(scope: string, request: Request, limit: number, windowMs: number) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const identifier = forwarded || request.headers.get("x-real-ip") || "local";
  const result = await consumeRateLimit(scope, identifier, limit, windowMs);
  if (!result.allowed) throw new ApiError(429, "RATE_LIMITED", "ลองบ่อยเกินไป กรุณารอสักครู่");
}

export function resetLocalRateLimits() { localStore.clear(); distributedLimiters.clear(); }
