import { describe, expect, it, vi } from "vitest";

const room = vi.hoisted(() => ({
  findUnique: vi.fn(async () => ({
    organizerId: "owner-a",
    status: "DRAWN",
    drawnAt: new Date("2026-12-01T00:00:00.000Z"),
    participants: [
      { id: "p-a", displayName: "หนึ่ง", invitationIssuedAt: new Date(), joinedAt: new Date(), revealedAt: new Date() },
      { id: "p-b", displayName: "สอง", invitationIssuedAt: new Date(), joinedAt: null, revealedAt: null }
    ]
  }))
}));

vi.mock("@/lib/db", () => ({ db: { room } }));

import { getOrganizerStatus } from "@/lib/invitations/service";

describe("organizer progress privacy", () => {
  it("returns only counts and participant progress without assignments", async () => {
    const result = await getOrganizerStatus("room-a", "owner-a");
    expect(result.counts).toEqual({ total: 2, invited: 2, visited: 1, revealed: 1 });
    expect(JSON.stringify(result)).not.toMatch(/assignment|giver|receiver|recipient/i);
  });

  it("enforces ownership", async () => {
    await expect(getOrganizerStatus("room-a", "owner-b")).rejects.toEqual(expect.objectContaining({ status: 403, code: "FORBIDDEN" }));
  });
});
