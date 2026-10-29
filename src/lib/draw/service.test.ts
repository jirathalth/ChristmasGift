import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => {
  type Assignment = { roomId: string; giverId: string; receiverId: string };
  const initialRoom = () => ({ id: "00000000-0000-4000-8000-000000000001", organizerId: "owner-a", status: "READY", drawnAt: null as Date | null });
  const state = { room: initialRoom(), participants: Array.from({ length: 7 }, (_, index) => ({ id: `p-${index}` })), exclusions: [{ participantAId: "p-0", participantBId: "p-1" }], assignments: [] as Assignment[], failCreate: false };
  let queue = Promise.resolve();
  const tx = {
    $queryRaw: async () => [],
    room: {
      findUnique: async () => state.room,
      update: async ({ data }: { data: Partial<typeof state.room> }) => Object.assign(state.room, data)
    },
    assignment: {
      count: async () => state.assignments.length,
      createMany: async ({ data }: { data: Assignment[] }) => { state.assignments.push(...data); if (state.failCreate) throw new Error("injected persistence failure"); return { count: data.length }; }
    },
    participant: { findMany: async () => state.participants },
    excludedPair: { findMany: async () => state.exclusions }
  };
  const db = {
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => {
      const previous = queue;
      let release = () => {};
      queue = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      const snapshot = { room: { ...state.room }, assignments: [...state.assignments] };
      try { return await callback(tx); } catch (error) { state.room = snapshot.room; state.assignments = snapshot.assignments; throw error; } finally { release(); }
    }
  };
  return { state, db, reset: () => { state.room = initialRoom(); state.assignments = []; state.failCreate = false; queue = Promise.resolve(); } };
});

vi.mock("@/lib/db", () => ({ db: mock.db }));

import { drawRoom } from "@/lib/draw/service";
import { validateMatching } from "@/lib/draw/matching";

describe("transactional draw service", () => {
  beforeEach(() => mock.reset());

  it("persists one valid assignment per participant without returning the mapping", async () => {
    const result = await drawRoom(mock.state.room.id, "owner-a");
    expect(result).not.toHaveProperty("assignments");
    expect(mock.state.room.status).toBe("DRAWN");
    expect(validateMatching(mock.state.participants.map((participant) => participant.id), mock.state.exclusions, mock.state.assignments)).toBe(true);
  });

  it("rejects repeated draws without overwriting assignments", async () => {
    await drawRoom(mock.state.room.id, "owner-a");
    const original = [...mock.state.assignments];
    await expect(drawRoom(mock.state.room.id, "owner-a")).rejects.toEqual(expect.objectContaining({ status: 409, code: "DRAW_ALREADY_COMPLETED" }));
    expect(mock.state.assignments).toEqual(original);
  });

  it("allows exactly one of two concurrent draw requests", async () => {
    const results = await Promise.allSettled([drawRoom(mock.state.room.id, "owner-a"), drawRoom(mock.state.room.id, "owner-a")]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(mock.state.assignments).toHaveLength(7);
  });

  it("rolls back all assignments when persistence fails", async () => {
    mock.state.failCreate = true;
    await expect(drawRoom(mock.state.room.id, "owner-a")).rejects.toThrow("injected persistence failure");
    expect(mock.state.assignments).toHaveLength(0);
    expect(mock.state.room.status).toBe("READY");
  });

  it("enforces organizer ownership", async () => {
    await expect(drawRoom(mock.state.room.id, "owner-b")).rejects.toEqual(expect.objectContaining({ status: 403, code: "FORBIDDEN" }));
  });
});
