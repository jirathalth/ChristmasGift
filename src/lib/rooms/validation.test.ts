import { describe, expect, it } from "vitest";
import { canonicalizePair, excludedPairInputSchema, normalizeParticipantName, participantInputSchema, roomInputSchema } from "@/lib/rooms/validation";

describe("Phase 2 validation", () => {
  it("normalizes names for case-insensitive duplicate protection", () => {
    expect(normalizeParticipantName("  สมชาย   TEST  ")).toBe(normalizeParticipantName("สมชาย test"));
  });

  it("preserves a trimmed display name", () => {
    expect(participantInputSchema.parse({ displayName: "  คุณเอ  " }).displayName).toBe("คุณเอ");
  });

  it("canonicalizes reverse-order pairs identically", () => {
    expect(canonicalizePair("a", "b")).toEqual(canonicalizePair("b", "a"));
  });

  it("rejects invalid pair IDs", () => {
    expect(excludedPairInputSchema.safeParse({ participantAId: "a", participantBId: "b" }).success).toBe(false);
  });

  it("accepts optional room values and validates budget precision", () => {
    expect(roomInputSchema.parse({ name: " งานคริสต์มาส ", budget: "500.50", currency: "THB" })).toMatchObject({ name: "งานคริสต์มาส", budget: "500.50" });
    expect(roomInputSchema.safeParse({ name: "งาน", budget: "1.999", currency: "THB" }).success).toBe(false);
  });
});
