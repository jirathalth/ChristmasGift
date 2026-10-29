import { createHash, randomBytes } from "node:crypto";

export const TOKEN_BYTES = 32;

export function generateSecureToken() { return randomBytes(TOKEN_BYTES).toString("base64url"); }
export function hashToken(token: string) { return createHash("sha256").update(token, "utf8").digest("hex"); }
