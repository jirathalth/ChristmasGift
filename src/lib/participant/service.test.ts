import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => {
  const state = { revealedAt: null as Date | null, roomStatus: "DRAWN", assignmentQueries: [] as string[], roomUpdates: [] as string[] };
  const session = { participantId: "participant-a", expiresAt: new Date(Date.now() + 60_000), revokedAt: null, participant: { revealedAt: null as Date | null, room: { status: "DRAWN" } } };
  const assignment = { findUnique: async ({ where }: { where: { giverId: string } }) => { state.assignmentQueries.push(where.giverId); return { receiver: { displayName: where.giverId === "participant-a" ? "Recipient A" : "Recipient B" } }; } };
  const tx = {
    $queryRaw: async () => [],
    participantSession: { findUnique: async () => ({ participantId: "participant-a", expiresAt: new Date(Date.now() + 60_000), revokedAt: null }) },
    participant: {
      findUnique: async () => ({ roomId: "room-a", revealedAt: state.revealedAt, room: { status: state.roomStatus } }),
      update: async ({ data }: { data: { revealedAt: Date } }) => { state.revealedAt = data.revealedAt; session.participant.revealedAt = data.revealedAt; },
      count: async () => 0
    },
    assignment,
    room: { update: async ({ data }: { data: { status: string } }) => { state.roomStatus = data.status; state.roomUpdates.push(data.status); } }
  };
  const db = { assignment, participantSession: { update: vi.fn() }, $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx) };
  const requireParticipant = vi.fn(async () => ({ tokenHash: "a".repeat(64), session, event: {} }));
  return { state, session, db, requireParticipant, reset: () => { state.revealedAt = null; state.roomStatus = "DRAWN"; state.assignmentQueries = []; state.roomUpdates = []; session.participant.revealedAt = null; session.participant.room.status = "DRAWN"; } };
});

vi.mock("@/lib/db", () => ({ db: mock.db }));
vi.mock("@/lib/participant/session", () => ({ requireParticipant: mock.requireParticipant }));

import { getRevealedAssignment, revealAssignment } from "@/lib/participant/service";

describe("participant reveal isolation", () => {
  beforeEach(() => mock.reset());

  it("never accepts a client-supplied participant ID", async () => {
    mock.state.revealedAt = new Date();
    mock.session.participant.revealedAt = mock.state.revealedAt;
    const result = await getRevealedAssignment(new Request("https://example.com/api/me/assignment?participantId=participant-b"));
    expect(result.recipientName).toBe("Recipient A");
    expect(mock.state.assignmentQueries).toEqual(["participant-a"]);
  });

  it("requires deliberate reveal before GET assignment", async () => {
    await expect(getRevealedAssignment(new Request("https://example.com/api/me/assignment"))).rejects.toEqual(expect.objectContaining({ status: 403, code: "REVEAL_REQUIRED" }));
  });

  it("records reveal exactly once and marks the room completed", async () => {
    const first = await revealAssignment(new Request("https://example.com/api/me/reveal"));
    const second = await revealAssignment(new Request("https://example.com/api/me/reveal"));
    expect(first.recipientName).toBe("Recipient A");
    expect(second.revealedAt).toBe(first.revealedAt);
    expect(mock.state.roomUpdates).toEqual(["COMPLETED"]);
  });
});
