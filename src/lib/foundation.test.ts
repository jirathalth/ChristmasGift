import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

const migration = readFileSync(new URL("../../prisma/migrations/20261029150000_phase_1_foundation/migration.sql", import.meta.url), "utf8");

describe("Phase 1 foundation", () => {
  it("merges Tailwind classes predictably", () => {
    expect(cn("px-2", "px-4", false && "hidden")).toBe("px-4");
  });

  it("enforces exclusion and assignment invariants in PostgreSQL", () => {
    expect(migration).toContain('CHECK ("participantAId" < "participantBId")');
    expect(migration).toContain('CHECK ("giverId" <> "receiverId")');
    expect(migration).toContain('REFERENCES "Participant"("roomId", "id")');
  });

  it("prevents finalized assignments from cascading away", () => {
    const assignmentForeignKeys = migration.split("\n").filter((line) => line.startsWith('ALTER TABLE "Assignment"'));
    expect(assignmentForeignKeys).toHaveLength(3);
    expect(assignmentForeignKeys.every((line) => line.includes("ON DELETE RESTRICT"))).toBe(true);
  });
});
