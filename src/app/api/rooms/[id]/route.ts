import { assertSameOrigin, fail, ok, parseJson, privateOk } from "@/lib/api";
import { requireOrganizer } from "@/lib/organizer";
import { getRoomDetail, updateRoom } from "@/lib/rooms/service";
import { roomIdSchema, roomInputSchema } from "@/lib/rooms/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try { const user = await requireOrganizer(request); const { id } = await context.params; return privateOk(await getRoomDetail(roomIdSchema.parse(id), user.id)); } catch (error) { return fail(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireOrganizer(request);
    const { id } = await context.params;
    const input = roomInputSchema.parse(await parseJson(request));
    return ok(await updateRoom(roomIdSchema.parse(id), user.id, input));
  } catch (error) { return fail(error); }
}
