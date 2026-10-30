import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { clearParticipantCookie, participantCookie } from "@/lib/participant/session";

describe("participant session cookie security", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("sets HttpOnly, SameSite, path, and expiry attributes", () => {
    vi.stubEnv("NODE_ENV", "test");
    const cookie = participantCookie("private-token", new Date("2030-01-01T00:00:00.000Z"));
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=");
    expect(cookie).not.toContain("Secure");
  });

  it("requires Secure cookies in production and clears safely", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(participantCookie("private-token", new Date("2030-01-01T00:00:00.000Z"))).toContain("; Secure");
    expect(clearParticipantCookie()).toContain("Max-Age=0");
    expect(clearParticipantCookie()).toContain("; Secure");
  });
});
