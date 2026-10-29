import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listRooms } from "@/lib/rooms/service";
import { OrganizerDashboard } from "@/components/organizer-dashboard";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const rooms = await listRooms(session.user.id);
  return <OrganizerDashboard organizerName={session.user.name} rooms={rooms} />;
}
