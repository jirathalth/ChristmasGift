import { describe, expect, it } from "vitest";
import { createRandomMatching, validateMatching } from "@/lib/draw/matching";

const ids = (count: number) => Array.from({ length: count }, (_, index) => `p-${index}`);

describe("randomized perfect matching", () => {
  it.each([2, 3, 7, 100])("creates a valid bijection for %i participants", (count) => {
    const participants = ids(count);
    const assignments = createRandomMatching(participants, []);
    expect(assignments).not.toBeNull();
    expect(validateMatching(participants, [], assignments!)).toBe(true);
    expect(new Set(assignments!.map((assignment) => assignment.receiverId)).size).toBe(count);
  });

  it("respects symmetric and multiple exclusions", () => {
    const participants = ids(7);
    const excludedPairs = [
      { participantAId: "p-0", participantBId: "p-1" },
      { participantAId: "p-0", participantBId: "p-2" },
      { participantAId: "p-3", participantBId: "p-4" }
    ];
    for (let run = 0; run < 20; run++) expect(validateMatching(participants, excludedPairs, createRandomMatching(participants, excludedPairs)!)).toBe(true);
  });

  it("returns null for impossible configurations", () => {
    const participants = ids(2);
    expect(createRandomMatching(participants, [{ participantAId: "p-0", participantBId: "p-1" }])).toBeNull();
  });

  it("does not always select the same valid solution", () => {
    const participants = ids(7);
    const solutions = new Set(Array.from({ length: 20 }, () => createRandomMatching(participants, [])!.map((assignment) => assignment.receiverId).join(",")));
    expect(solutions.size).toBeGreaterThan(1);
  });

  it("validates dense 100-person configurations efficiently", () => {
    const participants = ids(100);
    const allowed = new Set(participants.map((participant, index) => [participant, participants[(index + 1) % participants.length]].sort().join("|")));
    const excludedPairs = [];
    for (let left = 0; left < participants.length; left++) for (let right = left + 1; right < participants.length; right++) if (!allowed.has(`${participants[left]}|${participants[right]}`)) excludedPairs.push({ participantAId: participants[left], participantBId: participants[right] });
    const assignments = createRandomMatching(participants, excludedPairs);
    expect(assignments).not.toBeNull();
    expect(validateMatching(participants, excludedPairs, assignments!)).toBe(true);
  });
});
