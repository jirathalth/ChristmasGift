import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";

const post = vi.hoisted(() => vi.fn(async () => new Response("auth", { status: 200 })));
const assertRateLimit = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@/lib/auth", () => ({ auth: {} }));
vi.mock("better-auth/next-js", () => ({ toNextJsHandler: () => ({ GET: vi.fn(), POST: post }) }));
vi.mock("@/lib/rate-limit", () => ({ assertRateLimit }));

import { POST } from "@/app/api/auth/[...all]/route";

describe("organizer auth rate-limit preflight", () => {
  beforeEach(() => { post.mockClear(); assertRateLimit.mockClear(); });

  it.each(["sign-in", "sign-up"])("protects email %s before Better Auth", async (action) => {
    const response = await POST(new Request(`https://example.com/api/auth/${action}/email`, { method: "POST" }));
    expect(response.status).toBe(200);
    expect(assertRateLimit).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledOnce();
  });

  it("returns 503 and never invokes Better Auth when protection is unavailable", async () => {
    assertRateLimit.mockRejectedValueOnce(new ApiError(503, "RATE_LIMIT_UNAVAILABLE", "ไม่พร้อม"));
    const response = await POST(new Request("https://example.com/api/auth/sign-in/email", { method: "POST" }));
    expect(response.status).toBe(503);
    expect(post).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ success: false, error: { code: "RATE_LIMIT_UNAVAILABLE", message: "ไม่พร้อม" } });
  });
});
