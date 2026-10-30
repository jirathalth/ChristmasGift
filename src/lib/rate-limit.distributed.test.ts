import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const limit = vi.hoisted(() => vi.fn());

vi.mock("@upstash/redis", () => ({ Redis: class Redis { constructor() {} } }));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class Ratelimit {
    static slidingWindow() { return {}; }
    limit = limit;
    constructor() {}
  }
}));

import { consumeRateLimit, resetLocalRateLimits } from "@/lib/rate-limit";

describe("distributed rate limit behavior", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    resetLocalRateLimits();
    limit.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("allows and blocks from the shared store result", async () => {
    limit.mockResolvedValueOnce({ success: true, remaining: 4, reset: Date.now() + 60_000 });
    await expect(consumeRateLimit("invite", "ip-a", 5, 60_000)).resolves.toEqual({ allowed: true, retryAfter: null });
    limit.mockResolvedValueOnce({ success: false, remaining: 0, reset: Date.now() + 30_000 });
    await expect(consumeRateLimit("invite", "ip-a", 5, 60_000)).resolves.toEqual(expect.objectContaining({ allowed: false }));
  });

  it("fails closed on timeout and store errors", async () => {
    limit.mockResolvedValueOnce({ success: true, reason: "timeout", remaining: 4, reset: Date.now() + 60_000 });
    await expect(consumeRateLimit("invite", "ip-a", 5, 60_000)).rejects.toEqual(expect.objectContaining({ status: 503, code: "RATE_LIMIT_UNAVAILABLE" }));
    resetLocalRateLimits();
    limit.mockRejectedValueOnce(new Error("store unavailable"));
    await expect(consumeRateLimit("invite", "ip-a", 5, 60_000)).rejects.toEqual(expect.objectContaining({ status: 503, code: "RATE_LIMIT_UNAVAILABLE" }));
  });
});
