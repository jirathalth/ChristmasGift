import { z } from "zod";
import { assertSameOrigin, fail, parseJson, privateOk } from "@/lib/api";
import { participantCookie, redeemInvitation } from "@/lib/participant/session";
import { assertRateLimit } from "@/lib/rate-limit";

const inputSchema = z.object({ token: z.string().min(43).max(128).regex(/^[A-Za-z0-9_-]+$/, "ลิงก์เชิญไม่ถูกต้อง") });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    assertRateLimit("invitation-redeem", request, 20, 60_000);
    const { token } = inputSchema.parse(await parseJson(request));
    const result = await redeemInvitation(token);
    return privateOk(result.event, 200, { "Set-Cookie": participantCookie(result.sessionToken, result.expiresAt) });
  } catch (error) { return fail(error); }
}
