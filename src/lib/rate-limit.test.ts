import { describe, expect, it } from "vitest";
import { assertRateLimit } from "@/lib/rate-limit";

describe("sensitive endpoint rate limiting", () => {
  it("blocks requests after the configured limit", () => {
    const request = new Request("https://example.com", { headers: { "x-forwarded-for": `test-${Date.now()}` } });
    expect(() => assertRateLimit("test", request, 2, 60_000)).not.toThrow();
    expect(() => assertRateLimit("test", request, 2, 60_000)).not.toThrow();
    expect(() => assertRateLimit("test", request, 2, 60_000)).toThrowError(expect.objectContaining({ status: 429, code: "RATE_LIMITED" }));
  });
});
