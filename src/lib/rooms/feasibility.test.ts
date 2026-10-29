import { describe, expect, it } from "vitest";
import { validateDrawFeasibility } from "@/lib/rooms/feasibility";

const ids = (count: number) => Array.from({ length: count }, (_, index) => `p-${index}`);

describe("validateDrawFeasibility", () => {
  it.each([2, 3, 7, 100])("finds a complete matching for %i participants", (count) => {
    expect(validateDrawFeasibility(ids(count), [])).toMatchObject({ feasible: true, code: "READY" });
  });

  it("requires at least two participants", () => {
    expect(validateDrawFeasibility(ids(1), [])).toMatchObject({ feasible: false, code: "TOO_FEW_PARTICIPANTS" });
  });

  it("treats an excluded pair as bidirectional", () => {
    const participants = ids(2);
    expect(validateDrawFeasibility(participants, [{ participantAId: participants[0], participantBId: participants[1] }])).toMatchObject({ feasible: false, code: "NO_AVAILABLE_RECIPIENT" });
  });

  it("supports multiple exclusions per participant and detects impossible matching", () => {
    const participants = ids(4);
    const pairs = [
      { participantAId: participants[0], participantBId: participants[1] },
      { participantAId: participants[0], participantBId: participants[2] },
      { participantAId: participants[0], participantBId: participants[3] }
    ];
    expect(validateDrawFeasibility(participants, pairs)).toMatchObject({ feasible: false, code: "NO_AVAILABLE_RECIPIENT" });
  });

  it("detects a Hall-condition failure even when everyone has a candidate", () => {
    const participants = ids(4);
    const pairs = [
      { participantAId: participants[0], participantBId: participants[1] },
      { participantAId: participants[0], participantBId: participants[2] },
      { participantAId: participants[1], participantBId: participants[2] }
    ];
    expect(validateDrawFeasibility(participants, pairs)).toMatchObject({ feasible: false, code: "IMPOSSIBLE_MATCHING" });
  });

  it("handles a dense but feasible 100-person exclusion graph", () => {
    const participants = ids(100);
    const allowed = new Set<string>();
    for (let index = 0; index < participants.length; index++) {
      const next = participants[(index + 1) % participants.length];
      allowed.add([participants[index], next].sort().join("|"));
    }
    const pairs = [];
    for (let left = 0; left < participants.length; left++) {
      for (let right = left + 1; right < participants.length; right++) {
        if (!allowed.has(`${participants[left]}|${participants[right]}`)) pairs.push({ participantAId: participants[left], participantBId: participants[right] });
      }
    }
    expect(validateDrawFeasibility(participants, pairs)).toMatchObject({ feasible: true });
  });
});
