import type { RoomStatus } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api";

export function assertRoomOwnership(room: { organizerId: string } | null, organizerId: string): asserts room is { organizerId: string } {
  if (!room) throw new ApiError(404, "ROOM_NOT_FOUND", "ไม่พบกิจกรรม");
  if (room.organizerId !== organizerId) throw new ApiError(403, "FORBIDDEN", "คุณไม่มีสิทธิ์จัดการกิจกรรมนี้");
}

export function assertRoomEditable(status: RoomStatus) {
  if (status === "DRAWN" || status === "COMPLETED" || status === "ARCHIVED") throw new ApiError(409, "ROOM_READ_ONLY", "กิจกรรมนี้ไม่สามารถแก้ไขได้แล้ว");
}
