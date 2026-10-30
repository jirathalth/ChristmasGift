import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertRateLimit, consumeRateLimit, resetLocalRateLimits } from "@/lib/rate-limit";

describe("sensitive endpoint rate limiting", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    resetLocalRateLimits();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("blocks requests after the configured local test limit", async () => {
    const request = new Request("https://example.com", { headers: { "x-forwarded-for": `test-${Date.now()}` } });
    await expect(assertRateLimit("test", request, 2, 60_000)).resolves.toBeUndefined();
    await expect(assertRateLimit("test", request, 2, 60_000)).resolves.toBeUndefined();
    await expect(assertRateLimit("test", request, 2, 60_000)).rejects.toEqual(expect.objectContaining({ status: 429, code: "RATE_LIMITED" }));
  });

  it("isolates scopes and identifiers", async () => {
    expect((await consumeRateLimit("one", "a", 1, 60_000)).allowed).toBe(true);
    expect((await consumeRateLimit("one", "a", 1, 60_000)).allowed).toBe(false);
    expect((await consumeRateLimit("two", "a", 1, 60_000)).allowed).toBe(true);
    expect((await consumeRateLimit("one", "b", 1, 60_000)).allowed).toBe(true);
  });

  it("fails closed in production when distributed credentials are absent", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(consumeRateLimit("auth", "a", 5, 60_000)).rejects.toEqual(expect.objectContaining({ status: 503, code: "RATE_LIMIT_UNAVAILABLE" }));
  });

  it("rejects partially configured distributed credentials", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    await expect(consumeRateLimit("auth", "a", 5, 60_000)).rejects.toEqual(expect.objectContaining({ status: 503, code: "RATE_LIMIT_UNAVAILABLE" }));
  });
});
