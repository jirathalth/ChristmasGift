import { describe, expect, it } from "vitest";
import { assertSameOrigin } from "@/lib/api";

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
