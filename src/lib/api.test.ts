import { describe, expect, it } from "vitest";
import { ApiError, assertSameOrigin, fail, privateOk } from "@/lib/api";

describe("state-changing request protection", () => {
  it("accepts same-origin requests", () => {
    const request = new Request("https://example.com/api/rooms", { method: "POST", headers: { origin: "https://example.com" } });
    expect(() => assertSameOrigin(request)).not.toThrow();
  });

  it("rejects missing and cross-origin headers", () => {
    expect(() => assertSameOrigin(new Request("https://example.com/api/rooms", { method: "POST" }))).toThrowError(expect.objectContaining({ status: 403 }));
    expect(() => assertSameOrigin(new Request("https://example.com/api/rooms", { method: "POST", headers: { origin: "https://attacker.example" } }))).toThrowError(expect.objectContaining({ status: 403 }));
  });
});

describe("sensitive response caching", () => {
  it("marks successful private responses as no-store", async () => {
    const response = privateOk({ status: "safe" });
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ success: true, data: { status: "safe" } });
  });

  it("does not cache errors or leak unexpected error details", async () => {
    const expected = fail(new ApiError(403, "FORBIDDEN", "ไม่มีสิทธิ์"));
    expect(expected.headers.get("cache-control")).toContain("no-store");
    expect(await expected.json()).toEqual({ success: false, error: { code: "FORBIDDEN", message: "ไม่มีสิทธิ์" } });
  });
});
