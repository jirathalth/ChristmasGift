import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/participant/session";

export async function getParticipantEvent(request: Request) { return (await requireParticipant(request)).event; }

export async function getParticipantStatus(request: Request) {
  const { session } = await requireParticipant(request);
  return { roomStatus: session.participant.room.status, revealed: Boolean(session.participant.revealedAt), canReveal: session.participant.room.status === "DRAWN" || session.participant.room.status === "COMPLETED" };
}

export async function revealAssignment(request: Request) {
  const authenticated = await requireParticipant(request);
  return db.$transaction(async (tx) => {
    const participantId = authenticated.session.participantId;
    const roomId = authenticated.session.participant.room.id;
    await tx.$queryRaw`SELECT "id" FROM "Room" WHERE "id" = ${roomId}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "Participant" WHERE "id" = ${participantId}::uuid FOR UPDATE`;
    const activeSession = await tx.participantSession.findUnique({ where: { tokenHash: authenticated.tokenHash }, select: { participantId: true, expiresAt: true, revokedAt: true } });
    if (!activeSession || activeSession.participantId !== participantId || activeSession.revokedAt || activeSession.expiresAt <= new Date()) throw new ApiError(401, "PARTICIPANT_SESSION_EXPIRED", "เซสชันหมดอายุ กรุณาเปิดลิงก์เชิญอีกครั้ง");
    const participant = await tx.participant.findUnique({ where: { id: participantId }, select: { roomId: true, revealedAt: true, room: { select: { status: true } } } });
    if (!participant) throw new ApiError(404, "PARTICIPANT_NOT_FOUND", "ไม่พบผู้เข้าร่วม");
    if (participant.room.status !== "DRAWN" && participant.room.status !== "COMPLETED") throw new ApiError(409, "DRAW_NOT_READY", "ผู้จัดยังไม่ได้เริ่มจับฉลาก");
    const assignment = await tx.assignment.findUnique({ where: { giverId: participantId }, select: { receiver: { select: { displayName: true } } } });
    if (!assignment) throw new ApiError(409, "ASSIGNMENT_NOT_READY", "ยังไม่พบผลจับฉลาก กรุณาติดต่อผู้จัด");
    const revealedAt = participant.revealedAt ?? new Date();
    if (!participant.revealedAt) await tx.participant.update({ where: { id: participantId }, data: { revealedAt } });
    const remaining = await tx.participant.count({ where: { roomId: participant.roomId, revealedAt: null } });
    if (remaining === 0 && participant.room.status === "DRAWN") await tx.room.update({ where: { id: participant.roomId }, data: { status: "COMPLETED" } });
    return { recipientName: assignment.receiver.displayName, revealedAt: revealedAt.toISOString() };
  });
}

export async function getRevealedAssignment(request: Request) {
  const { session } = await requireParticipant(request);
  if (!session.participant.revealedAt) throw new ApiError(403, "REVEAL_REQUIRED", "กรุณากดเปิดของขวัญก่อนดูผล");
  const assignment = await db.assignment.findUnique({ where: { giverId: session.participantId }, select: { receiver: { select: { displayName: true } } } });
  if (!assignment) throw new ApiError(409, "ASSIGNMENT_NOT_READY", "ยังไม่พบผลจับฉลาก");
  return { recipientName: assignment.receiver.displayName, revealedAt: session.participant.revealedAt.toISOString() };
}

export async function revokeParticipantSession(request: Request) {
  const { tokenHash } = await requireParticipant(request);
  await db.participantSession.update({ where: { tokenHash }, data: { revokedAt: new Date() } });
  return { loggedOut: true };
}
