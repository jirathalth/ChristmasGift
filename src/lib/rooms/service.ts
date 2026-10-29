import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { validateDrawFeasibility } from "@/lib/rooms/feasibility";
import { assertRoomEditable, assertRoomOwnership } from "@/lib/rooms/policy";
import { canonicalizePair, normalizeParticipantName } from "@/lib/rooms/validation";

type Transaction = Prisma.TransactionClient;
type RoomInput = { name: string; description?: string | null; eventDate?: Date | null; budget?: string | null; currency: "THB" };

function roomData(input: RoomInput) {
  return {
    name: input.name,
    description: input.description ?? null,
    eventDate: input.eventDate ?? null,
    budget: input.budget === null || input.budget === undefined ? null : new Prisma.Decimal(input.budget),
    currency: input.currency
  };
}

function serializeRoom<T extends { eventDate: Date | null; budget: Prisma.Decimal | null; drawnAt: Date | null; createdAt: Date; updatedAt: Date; archivedAt: Date | null }>(room: T) {
  return { ...room, eventDate: room.eventDate?.toISOString() ?? null, budget: room.budget?.toFixed(2) ?? null, drawnAt: room.drawnAt?.toISOString() ?? null, createdAt: room.createdAt.toISOString(), updatedAt: room.updatedAt.toISOString(), archivedAt: room.archivedAt?.toISOString() ?? null };
}

async function lockRoom(tx: Transaction, roomId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Room" WHERE "id" = ${roomId}::uuid FOR UPDATE`;
}

async function ownedRoom(tx: Transaction, roomId: string, organizerId: string) {
  await lockRoom(tx, roomId);
  const room = await tx.room.findUnique({ where: { id: roomId }, select: { id: true, organizerId: true, status: true } });
  assertRoomOwnership(room, organizerId);
  return room;
}

function isUniqueConflict(error: unknown) {
  return (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") || (typeof error === "object" && error !== null && "code" in error && error.code === "P2002");
}

export async function listRooms(organizerId: string) {
  const rooms = await db.room.findMany({
    where: { organizerId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { participants: true, excludedPairs: true } } }
  });
  return rooms.map(serializeRoom);
}

export async function createRoom(organizerId: string, input: RoomInput) {
  const room = await db.room.create({ data: { ...roomData(input), organizerId } });
  return serializeRoom(room);
}

export async function getRoomDetail(roomId: string, organizerId: string) {
  const room = await db.room.findUnique({
    where: { id: roomId },
    include: {
      participants: { orderBy: { createdAt: "asc" }, select: { id: true, displayName: true, createdAt: true, updatedAt: true } },
      excludedPairs: { orderBy: { createdAt: "asc" }, include: { participantA: { select: { displayName: true } }, participantB: { select: { displayName: true } } } }
    }
  });
  assertRoomOwnership(room, organizerId);
  const feasibility = validateDrawFeasibility(room.participants.map((participant) => participant.id), room.excludedPairs);
  return {
    ...serializeRoom(room),
    participants: room.participants.map((participant) => ({ ...participant, createdAt: participant.createdAt.toISOString(), updatedAt: participant.updatedAt.toISOString() })),
    excludedPairs: room.excludedPairs.map((pair) => ({ id: pair.id, participantAId: pair.participantAId, participantBId: pair.participantBId, participantAName: pair.participantA.displayName, participantBName: pair.participantB.displayName, createdAt: pair.createdAt.toISOString() })),
    feasibility
  };
}

export async function updateRoom(roomId: string, organizerId: string, input: RoomInput) {
  return db.$transaction(async (tx) => {
    const room = await ownedRoom(tx, roomId, organizerId);
    assertRoomEditable(room.status);
    const updated = await tx.room.update({ where: { id: roomId }, data: { ...roomData(input), status: "DRAFT" } });
    return serializeRoom(updated);
  });
}

export async function archiveRoom(roomId: string, organizerId: string) {
  return db.$transaction(async (tx) => {
    const room = await ownedRoom(tx, roomId, organizerId);
    if (room.status === "ARCHIVED") throw new ApiError(409, "ALREADY_ARCHIVED", "กิจกรรมนี้ถูกเก็บถาวรแล้ว");
    if (room.status !== "COMPLETED") throw new ApiError(409, "ROOM_NOT_COMPLETED", "เก็บถาวรได้เฉพาะกิจกรรมที่ทุกคนเปิดผลแล้ว");
    const updated = await tx.room.update({ where: { id: roomId }, data: { status: "ARCHIVED", archivedAt: new Date() } });
    return serializeRoom(updated);
  });
}

export async function addParticipant(roomId: string, organizerId: string, displayName: string) {
  try {
    return await db.$transaction(async (tx) => {
      const room = await ownedRoom(tx, roomId, organizerId);
      assertRoomEditable(room.status);
      if (await tx.participant.count({ where: { roomId } }) >= 100) throw new ApiError(422, "PARTICIPANT_LIMIT", "เพิ่มผู้เข้าร่วมได้สูงสุด 100 คน");
      const participant = await tx.participant.create({ data: { roomId, displayName, normalizedName: normalizeParticipantName(displayName) }, select: { id: true, displayName: true, createdAt: true, updatedAt: true } });
      await tx.room.update({ where: { id: roomId }, data: { status: "DRAFT" } });
      return { ...participant, createdAt: participant.createdAt.toISOString(), updatedAt: participant.updatedAt.toISOString() };
    });
  } catch (error) {
    if (isUniqueConflict(error)) throw new ApiError(409, "DUPLICATE_PARTICIPANT", "มีชื่อผู้เข้าร่วมนี้แล้ว");
    throw error;
  }
}

export async function updateParticipant(roomId: string, participantId: string, organizerId: string, displayName: string) {
  try {
    return await db.$transaction(async (tx) => {
      const room = await ownedRoom(tx, roomId, organizerId);
      assertRoomEditable(room.status);
      const existing = await tx.participant.findUnique({ where: { id: participantId }, select: { roomId: true } });
      if (!existing || existing.roomId !== roomId) throw new ApiError(404, "PARTICIPANT_NOT_FOUND", "ไม่พบผู้เข้าร่วม");
      const participant = await tx.participant.update({ where: { id: participantId }, data: { displayName, normalizedName: normalizeParticipantName(displayName) }, select: { id: true, displayName: true, createdAt: true, updatedAt: true } });
      await tx.room.update({ where: { id: roomId }, data: { status: "DRAFT" } });
      return { ...participant, createdAt: participant.createdAt.toISOString(), updatedAt: participant.updatedAt.toISOString() };
    });
  } catch (error) {
    if (isUniqueConflict(error)) throw new ApiError(409, "DUPLICATE_PARTICIPANT", "มีชื่อผู้เข้าร่วมนี้แล้ว");
    throw error;
  }
}

export async function removeParticipant(roomId: string, participantId: string, organizerId: string) {
  return db.$transaction(async (tx) => {
    const room = await ownedRoom(tx, roomId, organizerId);
    assertRoomEditable(room.status);
    const existing = await tx.participant.findUnique({ where: { id: participantId }, select: { roomId: true } });
    if (!existing || existing.roomId !== roomId) throw new ApiError(404, "PARTICIPANT_NOT_FOUND", "ไม่พบผู้เข้าร่วม");
    await tx.participant.delete({ where: { id: participantId } });
    await tx.room.update({ where: { id: roomId }, data: { status: "DRAFT" } });
    return { id: participantId };
  });
}

export async function listExcludedPairs(roomId: string, organizerId: string) {
  const room = await db.room.findUnique({ where: { id: roomId }, select: { organizerId: true } });
  assertRoomOwnership(room, organizerId);
  return db.excludedPair.findMany({ where: { roomId }, orderBy: { createdAt: "asc" }, include: { participantA: { select: { displayName: true } }, participantB: { select: { displayName: true } } } });
}

export async function addExcludedPair(roomId: string, organizerId: string, firstId: string, secondId: string) {
  if (firstId === secondId) throw new ApiError(422, "SELF_EXCLUSION", "เลือกผู้เข้าร่วมคนเดียวกันเป็นคู่ยกเว้นไม่ได้");
  const [participantAId, participantBId] = canonicalizePair(firstId, secondId);
  try {
    return await db.$transaction(async (tx) => {
      const room = await ownedRoom(tx, roomId, organizerId);
      assertRoomEditable(room.status);
      const participantCount = await tx.participant.count({ where: { roomId, id: { in: [participantAId, participantBId] } } });
      if (participantCount !== 2) throw new ApiError(422, "CROSS_ROOM_EXCLUSION", "ผู้เข้าร่วมทั้งสองคนต้องอยู่ในกิจกรรมเดียวกัน");
      const pair = await tx.excludedPair.create({ data: { roomId, participantAId, participantBId }, include: { participantA: { select: { displayName: true } }, participantB: { select: { displayName: true } } } });
      await tx.room.update({ where: { id: roomId }, data: { status: "DRAFT" } });
      return { id: pair.id, participantAId, participantBId, participantAName: pair.participantA.displayName, participantBName: pair.participantB.displayName, createdAt: pair.createdAt.toISOString() };
    });
  } catch (error) {
    if (isUniqueConflict(error)) throw new ApiError(409, "DUPLICATE_EXCLUSION", "มีคู่ยกเว้นนี้แล้ว");
    throw error;
  }
}

export async function removeExcludedPair(roomId: string, excludedPairId: string, organizerId: string) {
  return db.$transaction(async (tx) => {
    const room = await ownedRoom(tx, roomId, organizerId);
    assertRoomEditable(room.status);
    const pair = await tx.excludedPair.findUnique({ where: { id: excludedPairId }, select: { roomId: true } });
    if (!pair || pair.roomId !== roomId) throw new ApiError(404, "EXCLUSION_NOT_FOUND", "ไม่พบคู่ยกเว้น");
    await tx.excludedPair.delete({ where: { id: excludedPairId } });
    await tx.room.update({ where: { id: roomId }, data: { status: "DRAFT" } });
    return { id: excludedPairId };
  });
}

export async function validateRoomDraw(roomId: string, organizerId: string) {
  return db.$transaction(async (tx) => {
    const room = await ownedRoom(tx, roomId, organizerId);
    assertRoomEditable(room.status);
    const [participants, excludedPairs] = await Promise.all([
      tx.participant.findMany({ where: { roomId }, select: { id: true } }),
      tx.excludedPair.findMany({ where: { roomId }, select: { participantAId: true, participantBId: true } })
    ]);
    const result = validateDrawFeasibility(participants.map((participant) => participant.id), excludedPairs);
    await tx.room.update({ where: { id: roomId }, data: { status: result.feasible ? "READY" : "DRAFT" } });
    return result;
  });
}
