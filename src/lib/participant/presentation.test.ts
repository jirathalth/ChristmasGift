import { describe, expect, it } from "vitest";
import { invitationErrorPresentation, isDrawAvailable } from "@/lib/participant/presentation";

describe("participant reveal presentation", () => {
  it.each([
    ["INVALID_INVITATION", "ลิงก์ถูกยกเลิกหรือไม่ถูกต้อง"],
    ["INVITATION_EXPIRED", "ลิงก์เชิญหมดอายุแล้ว"],
    ["ROOM_ARCHIVED", "กิจกรรมนี้ถูกเก็บถาวรแล้ว"],
    ["PARTICIPANT_SESSION_EXPIRED", "การเข้าใช้งานหมดอายุแล้ว"]
  ])("shows a friendly Thai state for %s", (code, title) => {
    expect(invitationErrorPresentation(code)).toEqual(expect.objectContaining({ title }));
  });

  it("uses a safe generic message for unknown errors", () => {
    expect(invitationErrorPresentation("UNKNOWN").title).toBe("เปิดลิงก์ไม่ได้");
  });

  it("allows reveal only after a completed draw", () => {
    expect(["DRAFT", "READY"].some(isDrawAvailable)).toBe(false);
    expect(["DRAWN", "COMPLETED"].every(isDrawAvailable)).toBe(true);
  });
});
