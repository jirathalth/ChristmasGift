import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { generateSecureToken, hashToken } from "@/lib/security/tokens";

export const PARTICIPANT_COOKIE = "secret_santa_participant";
const SESSION_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export function participantCookie(token: string, expiresAt: Date) {
  return `${PARTICIPANT_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}; Max-Age=${SESSION_LIFETIME_SECONDS}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function clearParticipantCookie() { return `${PARTICIPANT_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`; }

export async function redeemInvitation(token: string) {
  const tokenHash = hashToken(token);
  const match = await db.participant.findFirst({ where: { invitationTokenHash: tokenHash }, select: { id: true, roomId: true } });
  if (!match) throw new ApiError(404, "INVALID_INVITATION", "ลิงก์เชิญไม่ถูกต้องหรือถูกเปลี่ยนใหม่แล้ว");
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Room" WHERE "id" = ${match.roomId}::uuid FOR UPDATE`;
    const participant = await tx.participant.findUnique({ where: { id: match.id }, include: { room: { select: { id: true, name: true, description: true, eventDate: true, budget: true, currency: true, status: true } } } });
    if (!participant || participant.invitationTokenHash !== tokenHash) throw new ApiError(404, "INVALID_INVITATION", "ลิงก์เชิญไม่ถูกต้องหรือถูกเปลี่ยนใหม่แล้ว");
    if (!participant.invitationExpiresAt || participant.invitationExpiresAt <= new Date()) throw new ApiError(410, "INVITATION_EXPIRED", "ลิงก์เชิญหมดอายุแล้ว กรุณาติดต่อผู้จัด");
    if (participant.room.status === "ARCHIVED") throw new ApiError(410, "ROOM_ARCHIVED", "กิจกรรมนี้ถูกเก็บถาวรแล้ว");
    const sessionToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_SECONDS * 1000);
    await tx.participantSession.create({ data: { participantId: participant.id, tokenHash: hashToken(sessionToken), expiresAt } });
    if (!participant.joinedAt) await tx.participant.update({ where: { id: participant.id }, data: { joinedAt: new Date() } });
    return { sessionToken, expiresAt, event: serializeEvent(participant) };
  });
}

function serializeEvent(participant: { id: string; displayName: string; revealedAt: Date | null; room: { id: string; name: string; description: string | null; eventDate: Date | null; budget: { toFixed(digits: number): string } | null; currency: string; status: string } }) {
  return { participant: { displayName: participant.displayName }, room: { id: participant.room.id, name: participant.room.name, description: participant.room.description, eventDate: participant.room.eventDate?.toISOString() ?? null, budget: participant.room.budget?.toFixed(2) ?? null, currency: participant.room.currency, status: participant.room.status }, revealed: Boolean(participant.revealedAt) };
}

export async function requireParticipant(request: Request) {
  const token = readCookie(request, PARTICIPANT_COOKIE);
  if (!token) throw new ApiError(401, "PARTICIPANT_UNAUTHORIZED", "กรุณาเปิดลิงก์เชิญส่วนตัวอีกครั้ง");
  const tokenHash = hashToken(token);
  const session = await db.participantSession.findUnique({ where: { tokenHash }, include: { participant: { include: { room: { select: { id: true, name: true, description: true, eventDate: true, budget: true, currency: true, status: true } } } } } });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) throw new ApiError(401, "PARTICIPANT_SESSION_EXPIRED", "เซสชันหมดอายุ กรุณาเปิดลิงก์เชิญอีกครั้ง");
  if (session.participant.room.status === "ARCHIVED") throw new ApiError(410, "ROOM_ARCHIVED", "กิจกรรมนี้ถูกเก็บถาวรแล้ว");
  return { tokenHash, session, event: serializeEvent(session.participant) };
}
