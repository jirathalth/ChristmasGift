import { assertSameOrigin, fail, ok, parseJson } from "@/lib/api";
import { requireOrganizer } from "@/lib/organizer";
import { createRoom, listRooms } from "@/lib/rooms/service";
import { roomInputSchema } from "@/lib/rooms/validation";

export async function GET(request: Request) {
  try { const user = await requireOrganizer(request); return ok(await listRooms(user.id)); } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireOrganizer(request);
    const input = roomInputSchema.parse(await parseJson(request));
    return ok(await createRoom(user.id, input), 201);
  } catch (error) { return fail(error); }
}
