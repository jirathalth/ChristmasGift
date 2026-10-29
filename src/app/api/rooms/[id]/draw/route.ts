import { assertSameOrigin, fail, ok } from "@/lib/api";
import { drawRoom } from "@/lib/draw/service";
import { requireOrganizer } from "@/lib/organizer";
import { roomIdSchema } from "@/lib/rooms/validation";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try { assertSameOrigin(request); const user = await requireOrganizer(request); const { id } = await context.params; return ok(await drawRoom(roomIdSchema.parse(id), user.id)); } catch (error) { return fail(error); }
}
