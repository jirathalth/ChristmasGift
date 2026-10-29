import { describe, expect, it } from "vitest";
import { generateSecureToken, hashToken, TOKEN_BYTES } from "@/lib/security/tokens";

describe("secure tokens", () => {
  it("generates URL-safe tokens with at least 32 bytes of entropy", () => {
    const token = generateSecureToken();
    expect(Buffer.from(token, "base64url")).toHaveLength(TOKEN_BYTES);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("stores deterministic SHA-256 hashes without raw token content", () => {
    const token = generateSecureToken();
    const hash = hashToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashToken(token)).toBe(hash);
    expect(hashToken(generateSecureToken())).not.toBe(hash);
  });
});
