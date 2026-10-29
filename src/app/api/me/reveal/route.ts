import { assertSameOrigin, fail, privateOk } from "@/lib/api";
import { revealAssignment } from "@/lib/participant/service";
import { assertRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try { assertSameOrigin(request); assertRateLimit("participant-reveal", request, 30, 60_000); return privateOk(await revealAssignment(request)); } catch (error) { return fail(error); }
}
