import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { getRoomDetail } from "@/lib/rooms/service";
import { roomIdSchema } from "@/lib/rooms/validation";
import { RoomManager } from "@/components/room-manager";

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { id } = await params;
  const parsedId = roomIdSchema.safeParse(id);
  if (!parsedId.success) notFound();
  let room;
  try { room = await getRoomDetail(parsedId.data, session.user.id); } catch (error) { if (error instanceof ApiError && (error.status === 403 || error.status === 404)) notFound(); throw error; }
  return <RoomManager room={room} />;
}
