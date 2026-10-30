import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { fail } from "@/lib/api";
import { assertRateLimit } from "@/lib/rate-limit";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

export async function POST(request: Request) {
  try {
    const pathname = new URL(request.url).pathname;
    if (pathname.endsWith("/sign-in/email") || pathname.endsWith("/sign-up/email")) await assertRateLimit("organizer-auth-preflight", request, 5, 60_000);
    return handlers.POST(request);
  } catch (error) { return fail(error); }
}
