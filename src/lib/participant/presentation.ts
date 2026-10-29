export type InvitationErrorPresentation = { title: string; description: string };

const invitationErrors: Record<string, InvitationErrorPresentation> = {
  INVALID_INVITATION: { title: "ลิงก์ถูกยกเลิกหรือไม่ถูกต้อง", description: "ลิงก์นี้อาจถูกสร้างใหม่แล้ว กรุณาขอลิงก์ล่าสุดจากผู้จัดกิจกรรม" },
  INVITATION_EXPIRED: { title: "ลิงก์เชิญหมดอายุแล้ว", description: "กรุณาติดต่อผู้จัดกิจกรรมเพื่อสร้างลิงก์ส่วนตัวให้ใหม่" },
  ROOM_ARCHIVED: { title: "กิจกรรมนี้ถูกเก็บถาวรแล้ว", description: "ไม่สามารถเปิดผลผ่านลิงก์นี้ได้อีก กรุณาติดต่อผู้จัดกิจกรรมหากต้องการความช่วยเหลือ" },
  PARTICIPANT_SESSION_EXPIRED: { title: "การเข้าใช้งานหมดอายุแล้ว", description: "กรุณาเปิดลิงก์เชิญส่วนตัวฉบับล่าสุดอีกครั้ง" },
  PARTICIPANT_UNAUTHORIZED: { title: "ไม่พบสิทธิ์เข้าร่วม", description: "กรุณาเปิดลิงก์เชิญส่วนตัวที่ได้รับจากผู้จัดกิจกรรม" },
  CONNECTION_ERROR: { title: "เชื่อมต่อไม่สำเร็จ", description: "กรุณาตรวจสอบอินเทอร์เน็ตแล้วเปิดลิงก์อีกครั้ง" }
};

export function invitationErrorPresentation(code: string): InvitationErrorPresentation {
  return invitationErrors[code] ?? { title: "เปิดลิงก์ไม่ได้", description: "ลิงก์นี้ไม่พร้อมใช้งาน กรุณาติดต่อผู้จัดกิจกรรม" };
}

export function isDrawAvailable(status: string) { return status === "DRAWN" || status === "COMPLETED"; }
