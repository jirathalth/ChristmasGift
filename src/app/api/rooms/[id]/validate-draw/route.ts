import { ApiError, assertSameOrigin, fail, ok } from "@/lib/api";
import { requireOrganizer } from "@/lib/organizer";
import { validateRoomDraw } from "@/lib/rooms/service";
import { roomIdSchema } from "@/lib/rooms/validation";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireOrganizer(request);
    const { id } = await context.params;
    const result = await validateRoomDraw(roomIdSchema.parse(id), user.id);
    if (!result.feasible) throw new ApiError(422, result.code, result.message);
    return ok(result);
  } catch (error) { return fail(error); }
}
