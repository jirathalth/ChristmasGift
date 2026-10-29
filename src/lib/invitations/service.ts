import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { assertRoomOwnership } from "@/lib/rooms/policy";
import { generateSecureToken, hashToken } from "@/lib/security/tokens";

const INVITATION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

function appUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value) throw new ApiError(500, "APP_URL_MISSING", "ยังไม่ได้ตั้งค่า URL ของแอป");
  return value.replace(/\/$/, "");
}

export async function issueInvitations(roomId: string, organizerId: string, participantId?: string, regenerate = false) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Room" WHERE "id" = ${roomId}::uuid FOR UPDATE`;
    const room = await tx.room.findUnique({ where: { id: roomId }, select: { organizerId: true, status: true } });
    assertRoomOwnership(room, organizerId);
    if (room.status === "ARCHIVED") throw new ApiError(410, "ROOM_ARCHIVED", "กิจกรรมนี้ถูกเก็บถาวรแล้ว");
    const participants = await tx.participant.findMany({ where: { roomId, ...(participantId ? { id: participantId } : {}) }, orderBy: { createdAt: "asc" }, select: { id: true, displayName: true, invitationTokenHash: true, invitationIssuedAt: true, invitationExpiresAt: true } });
    if (participantId && participants.length !== 1) throw new ApiError(404, "PARTICIPANT_NOT_FOUND", "ไม่พบผู้เข้าร่วม");
    if (participants.length === 0) throw new ApiError(422, "NO_PARTICIPANTS", "ยังไม่มีผู้เข้าร่วมสำหรับสร้างลิงก์");

    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITATION_LIFETIME_MS);
    const result = [];
    for (const participant of participants) {
      if (participant.invitationTokenHash && !regenerate) {
        result.push({ id: participant.id, displayName: participant.displayName, link: null, invitationIssuedAt: participant.invitationIssuedAt?.toISOString() ?? null, invitationExpiresAt: participant.invitationExpiresAt?.toISOString() ?? null, regenerated: false });
        continue;
      }
      const token = generateSecureToken();
      await tx.participant.update({ where: { id: participant.id }, data: { invitationTokenHash: hashToken(token), invitationIssuedAt: now, invitationExpiresAt: expiresAt } });
      result.push({ id: participant.id, displayName: participant.displayName, link: `${appUrl()}/invite#token=${encodeURIComponent(token)}`, invitationIssuedAt: now.toISOString(), invitationExpiresAt: expiresAt.toISOString(), regenerated: Boolean(participant.invitationTokenHash) });
    }
    return result;
  });
}

export async function getOrganizerStatus(roomId: string, organizerId: string) {
  const room = await db.room.findUnique({
    where: { id: roomId },
    select: {
      organizerId: true,
      status: true,
      drawnAt: true,
      participants: { orderBy: { createdAt: "asc" }, select: { id: true, displayName: true, invitationIssuedAt: true, joinedAt: true, revealedAt: true } }
    }
  });
  assertRoomOwnership(room, organizerId);
  const invited = room.participants.filter((participant) => participant.invitationIssuedAt).length;
  const visited = room.participants.filter((participant) => participant.joinedAt).length;
  const revealed = room.participants.filter((participant) => participant.revealedAt).length;
  return {
    status: room.status,
    drawnAt: room.drawnAt?.toISOString() ?? null,
    counts: { total: room.participants.length, invited, visited, revealed },
    participants: room.participants.map((participant) => ({ id: participant.id, displayName: participant.displayName, invited: Boolean(participant.invitationIssuedAt), visited: Boolean(participant.joinedAt), revealed: Boolean(participant.revealedAt) }))
  };
}
