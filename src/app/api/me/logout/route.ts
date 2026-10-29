import { assertSameOrigin, fail, privateOk } from "@/lib/api";
import { clearParticipantCookie } from "@/lib/participant/session";
import { revokeParticipantSession } from "@/lib/participant/service";

export async function POST(request: Request) {
  try { assertSameOrigin(request); const result = await revokeParticipantSession(request); return privateOk(result, 200, { "Set-Cookie": clearParticipantCookie() }); } catch (error) { return fail(error); }
}
