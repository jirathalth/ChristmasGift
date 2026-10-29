import { z } from "zod";

export type ApiEnvelope<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function ok<T>(data: T, status = 200) { return Response.json({ success: true, data } satisfies ApiEnvelope<T>, { status }); }
export function privateOk<T>(data: T, status = 200, headers?: HeadersInit) { return Response.json({ success: true, data } satisfies ApiEnvelope<T>, { status, headers: { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", ...headers } }); }

export function fail(error: unknown) {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  if (error instanceof ApiError) return Response.json({ success: false, error: { code: error.code, message: error.message } }, { status: error.status, headers });
  if (error instanceof z.ZodError) return Response.json({ success: false, error: { code: "VALIDATION_ERROR", message: error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" } }, { status: 400, headers });
  console.error("Unhandled API error", error instanceof Error ? { name: error.name } : { type: typeof error });
  return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" } }, { status: 500, headers });
}

export async function parseJson(request: Request) {
  try { return await request.json(); } catch { throw new ApiError(400, "INVALID_JSON", "รูปแบบข้อมูลไม่ถูกต้อง"); }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = new Set([new URL(request.url).origin, process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_APP_URL].filter(Boolean));
  if (!origin || !allowed.has(origin)) throw new ApiError(403, "INVALID_ORIGIN", "ไม่อนุญาตให้ส่งคำขอนี้");
}
