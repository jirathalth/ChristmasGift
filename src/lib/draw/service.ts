import { Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { createRandomMatching, validateMatching } from "@/lib/draw/matching";
import { assertRoomOwnership } from "@/lib/rooms/policy";

function isUniqueConflict(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "P2002"; }

export async function drawRoom(roomId: string, organizerId: string) {
  try {
    return await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Room" WHERE "id" = ${roomId}::uuid FOR UPDATE`;
      const room = await tx.room.findUnique({ where: { id: roomId }, select: { id: true, organizerId: true, status: true } });
      assertRoomOwnership(room, organizerId);
      if (room.status === "DRAWN" || room.status === "COMPLETED" || room.status === "ARCHIVED") throw new ApiError(409, "DRAW_ALREADY_COMPLETED", "กิจกรรมนี้จับฉลากแล้ว");
      if (room.status !== "READY") throw new ApiError(409, "ROOM_NOT_READY", "กรุณาตรวจสอบความพร้อมก่อนเริ่มจับฉลาก");
      if (await tx.assignment.count({ where: { roomId } }) > 0) throw new ApiError(409, "DRAW_ALREADY_COMPLETED", "กิจกรรมนี้มีผลจับฉลากแล้ว");

      const participants = await tx.participant.findMany({ where: { roomId }, select: { id: true }, orderBy: { id: "asc" } });
      const excludedPairs = await tx.excludedPair.findMany({ where: { roomId }, select: { participantAId: true, participantBId: true } });
      const participantIds = participants.map((participant) => participant.id);
      const assignments = createRandomMatching(participantIds, excludedPairs);
      if (!assignments || !validateMatching(participantIds, excludedPairs, assignments)) throw new ApiError(422, "IMPOSSIBLE_MATCHING", "ไม่สามารถจัดคู่ให้ครบทุกคนได้ กรุณาตรวจสอบคู่ยกเว้นอีกครั้ง");

      await tx.assignment.createMany({ data: assignments.map((assignment) => ({ roomId, ...assignment })) });
      const drawnAt = new Date();
      await tx.room.update({ where: { id: roomId }, data: { status: "DRAWN", drawnAt } });
      return { roomId, status: "DRAWN" as const, participantCount: participants.length, drawnAt: drawnAt.toISOString() };
    }, { maxWait: 10_000, timeout: 20_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (isUniqueConflict(error) || error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") throw new ApiError(409, "DRAW_CONFLICT", "มีการเริ่มจับฉลากไปแล้ว กรุณาโหลดหน้าใหม่");
    throw error;
  }
}
