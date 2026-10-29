import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => {
  type Room = { id: string; organizerId: string; status: "DRAFT" | "READY" | "DRAWN" | "COMPLETED" | "ARCHIVED"; name: string; description: null; eventDate: null; budget: null; currency: string; drawnAt: null; createdAt: Date; updatedAt: Date; archivedAt: null };
  type Participant = { id: string; roomId: string; displayName: string; normalizedName: string; createdAt: Date; updatedAt: Date };
  type Pair = { id: string; roomId: string; participantAId: string; participantBId: string; createdAt: Date };
  const state = { rooms: [] as Room[], participants: [] as Participant[], pairs: [] as Pair[], id: 0 };
  const nextId = () => `00000000-0000-4000-8000-${String(++state.id).padStart(12, "0")}`;
  const room = {
    findUnique: async ({ where }: { where: { id: string } }) => state.rooms.find((item) => item.id === where.id) ?? null,
    findMany: async ({ where }: { where: { organizerId: string } }) => state.rooms.filter((item) => item.organizerId === where.organizerId).map((item) => ({ ...item, _count: { participants: state.participants.filter((participant) => participant.roomId === item.id).length, excludedPairs: state.pairs.filter((pair) => pair.roomId === item.id).length } })),
    create: async ({ data }: { data: Omit<Room, "id" | "status" | "drawnAt" | "createdAt" | "updatedAt" | "archivedAt"> }) => { const item: Room = { ...data, id: nextId(), status: "DRAFT", drawnAt: null, createdAt: new Date(), updatedAt: new Date(), archivedAt: null }; state.rooms.push(item); return item; },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Room> }) => { const item = state.rooms.find((value) => value.id === where.id)!; Object.assign(item, data, { updatedAt: new Date() }); return item; }
  };
  const participant = {
    count: async ({ where }: { where: { roomId: string; id?: { in: string[] } } }) => state.participants.filter((item) => item.roomId === where.roomId && (!where.id || where.id.in.includes(item.id))).length,
    create: async ({ data }: { data: Omit<Participant, "id" | "createdAt" | "updatedAt"> }) => { if (state.participants.some((item) => item.roomId === data.roomId && item.normalizedName === data.normalizedName)) throw Object.assign(new Error("unique"), { code: "P2002" }); const item: Participant = { ...data, id: nextId(), createdAt: new Date(), updatedAt: new Date() }; state.participants.push(item); return item; },
    findUnique: async ({ where }: { where: { id: string } }) => state.participants.find((item) => item.id === where.id) ?? null,
    update: async ({ where, data }: { where: { id: string }; data: Partial<Participant> }) => { const item = state.participants.find((value) => value.id === where.id)!; Object.assign(item, data, { updatedAt: new Date() }); return item; },
    delete: async ({ where }: { where: { id: string } }) => { const index = state.participants.findIndex((item) => item.id === where.id); const [removed] = state.participants.splice(index, 1); state.pairs = state.pairs.filter((pair) => pair.participantAId !== where.id && pair.participantBId !== where.id); return removed; },
    findMany: async ({ where }: { where: { roomId: string } }) => state.participants.filter((item) => item.roomId === where.roomId)
  };
  const excludedPair = {
    create: async ({ data }: { data: Omit<Pair, "id" | "createdAt"> }) => { if (state.pairs.some((item) => item.roomId === data.roomId && item.participantAId === data.participantAId && item.participantBId === data.participantBId)) throw Object.assign(new Error("unique"), { code: "P2002" }); const item: Pair = { ...data, id: nextId(), createdAt: new Date() }; state.pairs.push(item); return { ...item, participantA: { displayName: state.participants.find((value) => value.id === item.participantAId)!.displayName }, participantB: { displayName: state.participants.find((value) => value.id === item.participantBId)!.displayName } }; },
    findUnique: async ({ where }: { where: { id: string } }) => state.pairs.find((item) => item.id === where.id) ?? null,
    delete: async ({ where }: { where: { id: string } }) => { const index = state.pairs.findIndex((item) => item.id === where.id); return state.pairs.splice(index, 1)[0]; },
    findMany: async ({ where }: { where: { roomId: string } }) => state.pairs.filter((item) => item.roomId === where.roomId)
  };
  const tx = { $queryRaw: async () => [], room, participant, excludedPair };
  const db = { ...tx, $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx) };
  return { state, db, reset: () => { state.rooms = []; state.participants = []; state.pairs = []; state.id = 0; } };
});

vi.mock("@/lib/db", () => ({ db: mock.db }));

import { addExcludedPair, addParticipant, archiveRoom, createRoom, listRooms, removeExcludedPair, removeParticipant, updateParticipant, updateRoom, validateRoomDraw } from "@/lib/rooms/service";

describe("room and participant services", () => {
  beforeEach(() => mock.reset());

  it("creates and lists only the organizer's rooms", async () => {
    await createRoom("owner-a", { name: "ห้อง A", currency: "THB" });
    await createRoom("owner-b", { name: "ห้อง B", currency: "THB" });
    const rooms = await listRooms("owner-a");
    expect(rooms).toHaveLength(1);
    expect(rooms[0].name).toBe("ห้อง A");
  });

  it("edits rooms and archives only completed rooms", async () => {
    const room = await createRoom("owner-a", { name: "ชื่อเดิม", currency: "THB" });
    await updateRoom(room.id, "owner-a", { name: "ชื่อใหม่", currency: "THB" });
    expect(mock.state.rooms[0].name).toBe("ชื่อใหม่");
    await expect(archiveRoom(room.id, "owner-a")).rejects.toEqual(expect.objectContaining({ code: "ROOM_NOT_COMPLETED" }));
    mock.state.rooms[0].status = "COMPLETED";
    await archiveRoom(room.id, "owner-a");
    expect(mock.state.rooms[0].status).toBe("ARCHIVED");
  });

  it("adds, edits, and removes participants including the organizer as a normal name", async () => {
    const room = await createRoom("owner-a", { name: "งาน", currency: "THB" });
    const participant = await addParticipant(room.id, "owner-a", "ผู้จัด");
    expect(mock.state.participants[0].normalizedName).toBe("ผู้จัด");
    await updateParticipant(room.id, participant.id, "owner-a", "ผู้จัดงาน");
    expect(mock.state.participants[0].displayName).toBe("ผู้จัดงาน");
    await removeParticipant(room.id, participant.id, "owner-a");
    expect(mock.state.participants).toHaveLength(0);
  });

  it("enforces ownership on mutations", async () => {
    const room = await createRoom("owner-a", { name: "งาน", currency: "THB" });
    await expect(addParticipant(room.id, "owner-b", "บุคคลอื่น")).rejects.toEqual(expect.objectContaining({ status: 403, code: "FORBIDDEN" }));
  });

  it("rejects normalized duplicate participant names", async () => {
    const room = await createRoom("owner-a", { name: "งาน", currency: "THB" });
    await addParticipant(room.id, "owner-a", "Alice");
    await expect(addParticipant(room.id, "owner-a", "  ALICE  ")).rejects.toEqual(expect.objectContaining({ status: 409, code: "DUPLICATE_PARTICIPANT" }));
  });

  it("creates canonical exclusions, supports multiple pairs, and removes them", async () => {
    const room = await createRoom("owner-a", { name: "งาน", currency: "THB" });
    const first = await addParticipant(room.id, "owner-a", "หนึ่ง");
    const second = await addParticipant(room.id, "owner-a", "สอง");
    const third = await addParticipant(room.id, "owner-a", "สาม");
    const pairOne = await addExcludedPair(room.id, "owner-a", second.id, first.id);
    await addExcludedPair(room.id, "owner-a", first.id, third.id);
    expect(mock.state.pairs).toHaveLength(2);
    expect(mock.state.pairs[0].participantAId < mock.state.pairs[0].participantBId).toBe(true);
    await expect(addExcludedPair(room.id, "owner-a", first.id, second.id)).rejects.toEqual(expect.objectContaining({ code: "DUPLICATE_EXCLUSION" }));
    await removeExcludedPair(room.id, pairOne.id, "owner-a");
    expect(mock.state.pairs).toHaveLength(1);
  });

  it("rejects self-pairs and cross-room pairs", async () => {
    const roomOne = await createRoom("owner-a", { name: "หนึ่ง", currency: "THB" });
    const roomTwo = await createRoom("owner-a", { name: "สอง", currency: "THB" });
    const first = await addParticipant(roomOne.id, "owner-a", "หนึ่ง");
    const second = await addParticipant(roomTwo.id, "owner-a", "สอง");
    await expect(addExcludedPair(roomOne.id, "owner-a", first.id, first.id)).rejects.toEqual(expect.objectContaining({ code: "SELF_EXCLUSION" }));
    await expect(addExcludedPair(roomOne.id, "owner-a", first.id, second.id)).rejects.toEqual(expect.objectContaining({ code: "CROSS_ROOM_EXCLUSION" }));
  });

  it("updates READY status only after a feasible validation", async () => {
    const room = await createRoom("owner-a", { name: "งาน", currency: "THB" });
    const first = await addParticipant(room.id, "owner-a", "หนึ่ง");
    const second = await addParticipant(room.id, "owner-a", "สอง");
    await expect(validateRoomDraw(room.id, "owner-a")).resolves.toMatchObject({ feasible: true });
    expect(mock.state.rooms[0].status).toBe("READY");
    await addExcludedPair(room.id, "owner-a", first.id, second.id);
    await expect(validateRoomDraw(room.id, "owner-a")).resolves.toMatchObject({ feasible: false });
    expect(mock.state.rooms[0].status).toBe("DRAFT");
  });
});
