import { fail, privateOk } from "@/lib/api";
import { getOrganizerStatus } from "@/lib/invitations/service";
import { requireOrganizer } from "@/lib/organizer";
import { roomIdSchema } from "@/lib/rooms/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try { const user = await requireOrganizer(request); const { id } = await context.params; return privateOk(await getOrganizerStatus(roomIdSchema.parse(id), user.id)); } catch (error) { return fail(error); }
}
