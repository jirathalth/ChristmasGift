import { assertSameOrigin, fail, ok, parseJson, privateOk } from "@/lib/api";
import { requireOrganizer } from "@/lib/organizer";
import { addExcludedPair, listExcludedPairs } from "@/lib/rooms/service";
import { excludedPairInputSchema, roomIdSchema } from "@/lib/rooms/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try { const user = await requireOrganizer(request); const { id } = await context.params; return privateOk(await listExcludedPairs(roomIdSchema.parse(id), user.id)); } catch (error) { return fail(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireOrganizer(request);
    const { id } = await context.params;
    const input = excludedPairInputSchema.parse(await parseJson(request));
    return ok(await addExcludedPair(roomIdSchema.parse(id), user.id, input.participantAId, input.participantBId), 201);
  } catch (error) { return fail(error); }
}
