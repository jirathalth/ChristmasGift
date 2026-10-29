import { assertSameOrigin, fail, ok, parseJson } from "@/lib/api";
import { requireOrganizer } from "@/lib/organizer";
import { removeParticipant, updateParticipant } from "@/lib/rooms/service";
import { participantInputSchema, roomIdSchema } from "@/lib/rooms/validation";

type Context = { params: Promise<{ id: string; pid: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireOrganizer(request);
    const { id, pid } = await context.params;
    const input = participantInputSchema.parse(await parseJson(request));
    return ok(await updateParticipant(roomIdSchema.parse(id), roomIdSchema.parse(pid), user.id, input.displayName));
  } catch (error) { return fail(error); }
}

export async function DELETE(request: Request, context: Context) {
  try { assertSameOrigin(request); const user = await requireOrganizer(request); const { id, pid } = await context.params; return ok(await removeParticipant(roomIdSchema.parse(id), roomIdSchema.parse(pid), user.id)); } catch (error) { return fail(error); }
}
