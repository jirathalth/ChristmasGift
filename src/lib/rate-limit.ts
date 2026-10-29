import { ApiError } from "@/lib/api";

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

export function assertRateLimit(scope: string, request: Request, limit: number, windowMs: number) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = `${scope}:${forwarded || request.headers.get("x-real-ip") || "unknown"}`;
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) { store.set(key, { count: 1, resetAt: now + windowMs }); return; }
  if (entry.count >= limit) throw new ApiError(429, "RATE_LIMITED", "ลองบ่อยเกินไป กรุณารอสักครู่");
  entry.count++;
  if (store.size > 1_000) for (const [storedKey, value] of store) if (value.resetAt <= now) store.delete(storedKey);
}
