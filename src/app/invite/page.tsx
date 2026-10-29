import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ParticipantReveal } from "@/components/participant-reveal";

export const metadata: Metadata = { title: "เปิดของขวัญ", robots: { index: false, follow: false } };

export default async function InvitationPage() {
  const hasSession = (await cookies()).has("secret_santa_participant");
  return <ParticipantReveal hasSession={hasSession} />;
}
