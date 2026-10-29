import { z } from "zod";

const optionalText = (max: number) => z.union([z.string().trim().max(max), z.literal("")]).transform((value) => value || null).optional();

export const roomInputSchema = z.object({
  name: z.string().trim().min(1, "กรุณาระบุชื่อกิจกรรม").max(120, "ชื่อกิจกรรมยาวเกินไป"),
  description: optionalText(1000),
  eventDate: z.union([z.iso.datetime({ offset: true }), z.literal(""), z.null()]).transform((value) => value ? new Date(value) : null).optional(),
  budget: z.union([z.number(), z.string(), z.null(), z.literal("")]).transform((value, context) => {
    if (value === null || value === "") return null;
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || amount > 99_999_999.99 || !/^\d+(?:\.\d{1,2})?$/.test(String(value))) {
      context.addIssue({ code: "custom", message: "งบของขวัญต้องเป็นจำนวนบวกและมีทศนิยมไม่เกิน 2 ตำแหน่ง" });
      return z.NEVER;
    }
    return amount.toFixed(2);
  }).optional(),
  currency: z.literal("THB").default("THB")
});

export const participantInputSchema = z.object({ displayName: z.string().trim().min(1, "กรุณาระบุชื่อผู้เข้าร่วม").max(100, "ชื่อผู้เข้าร่วมยาวเกินไป") });
export const excludedPairInputSchema = z.object({ participantAId: z.uuid("ผู้เข้าร่วมคนแรกไม่ถูกต้อง"), participantBId: z.uuid("ผู้เข้าร่วมคนที่สองไม่ถูกต้อง") });
export const roomIdSchema = z.uuid("รหัสกิจกรรมไม่ถูกต้อง");

export function normalizeParticipantName(displayName: string) {
  return displayName.trim().normalize("NFKC").replace(/\s+/g, " ").toLocaleLowerCase("th-TH");
}

export function canonicalizePair(participantAId: string, participantBId: string) {
  return participantAId < participantBId ? [participantAId, participantBId] as const : [participantBId, participantAId] as const;
}
