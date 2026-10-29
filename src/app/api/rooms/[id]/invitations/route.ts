import { z } from "zod";
import { assertSameOrigin, fail, ok, parseJson } from "@/lib/api";
import { issueInvitations } from "@/lib/invitations/service";
import { requireOrganizer } from "@/lib/organizer";
import { roomIdSchema } from "@/lib/rooms/validation";

const inputSchema = z.object({ participantId: z.uuid().optional(), regenerate: z.boolean().default(false) });
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireOrganizer(request);
    const { id } = await context.params;
    const input = inputSchema.parse(await parseJson(request));
    return ok(await issueInvitations(roomIdSchema.parse(id), user.id, input.participantId, input.regenerate));
  } catch (error) { return fail(error); }
}
