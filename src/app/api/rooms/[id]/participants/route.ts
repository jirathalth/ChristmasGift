import { assertSameOrigin, fail, ok, parseJson, privateOk } from "@/lib/api";
import { requireOrganizer } from "@/lib/organizer";
import { addParticipant, getRoomDetail } from "@/lib/rooms/service";
import { participantInputSchema, roomIdSchema } from "@/lib/rooms/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try { const user = await requireOrganizer(request); const { id } = await context.params; const room = await getRoomDetail(roomIdSchema.parse(id), user.id); return privateOk(room.participants); } catch (error) { return fail(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireOrganizer(request);
    const { id } = await context.params;
    const input = participantInputSchema.parse(await parseJson(request));
    return ok(await addParticipant(roomIdSchema.parse(id), user.id, input.displayName), 201);
  } catch (error) { return fail(error); }
}
