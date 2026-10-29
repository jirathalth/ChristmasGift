import { assertSameOrigin, fail, ok } from "@/lib/api";
import { requireOrganizer } from "@/lib/organizer";
import { removeExcludedPair } from "@/lib/rooms/service";
import { roomIdSchema } from "@/lib/rooms/validation";

type Context = { params: Promise<{ id: string; eid: string }> };

export async function DELETE(request: Request, context: Context) {
  try { assertSameOrigin(request); const user = await requireOrganizer(request); const { id, eid } = await context.params; return ok(await removeExcludedPair(roomIdSchema.parse(id), roomIdSchema.parse(eid), user.id)); } catch (error) { return fail(error); }
}
