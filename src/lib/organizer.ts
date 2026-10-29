import { auth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export async function requireOrganizer(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "กรุณาเข้าสู่ระบบ");
  return session.user;
}
