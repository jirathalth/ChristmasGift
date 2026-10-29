import type { Metadata } from "next";
import { ParticipantReveal } from "@/components/participant-reveal";

export const metadata: Metadata = { title: "เปิดของขวัญ", robots: { index: false, follow: false } };

export default function InvitationPage() { return <ParticipantReveal />; }
