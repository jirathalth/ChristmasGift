"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Gift, LoaderCircle, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SignOutButton } from "@/components/sign-out-button";

type RoomSummary = { id: string; name: string; description: string | null; eventDate: string | null; budget: string | null; currency: string; status: string; updatedAt: string; _count: { participants: number; excludedPairs: number } };
type ApiResponse<T> = { success: true; data: T } | { success: false; error: { message: string } };

const statusLabels: Record<string, string> = { DRAFT: "กำลังเตรียม", READY: "พร้อมจับฉลาก", DRAWN: "จับฉลากแล้ว", COMPLETED: "เปิดครบแล้ว", ARCHIVED: "เก็บถาวร" };

export function OrganizerDashboard({ organizerName, rooms }: { organizerName: string; rooms: RoomSummary[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/rooms", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: form.get("name"), description: form.get("description"), currency: "THB" }) });
    const result = await response.json() as ApiResponse<{ id: string }>;
    if (!result.success) { setError(result.error.message); setPending(false); return; }
    router.push(`/dashboard/rooms/${result.data.id}`);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between"><Link href="/dashboard" className="flex items-center gap-2 font-bold"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Gift className="size-5" /></span>Secret Santa</Link><SignOutButton /></header>
      <section className="py-12"><p className="text-sm font-semibold text-primary">สวัสดี {organizerName}</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">กิจกรรมของคุณ</h1><p className="mt-2 text-muted-foreground">สร้างและจัดการกิจกรรมจับฉลากของขวัญ</p></section>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="room-list-title">
          <h2 id="room-list-title" className="sr-only">รายการกิจกรรม</h2>
          {rooms.length === 0 ? <Card className="border-dashed"><CardContent className="grid min-h-64 place-items-center p-8 text-center"><div><Gift className="mx-auto size-12 text-primary/60" strokeWidth={1.5} /><p className="mt-4 font-bold">ยังไม่มีกิจกรรม</p><p className="mt-1 text-sm text-muted-foreground">สร้างกิจกรรมแรกจากแบบฟอร์มด้านล่าง</p></div></CardContent></Card> : <div className="grid gap-4 sm:grid-cols-2">{rooms.map((room) => <Link key={room.id} href={`/dashboard/rooms/${room.id}`} className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Card className="h-full transition group-hover:-translate-y-0.5 group-hover:shadow-md"><CardHeader><div className="flex items-start justify-between gap-3"><CardTitle className="line-clamp-2">{room.name}</CardTitle><span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{statusLabels[room.status]}</span></div><CardDescription className="line-clamp-2">{room.description || "ยังไม่มีรายละเอียด"}</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><Users className="size-4" />{room._count.participants} คน</span><span className="flex items-center gap-1.5"><CalendarDays className="size-4" />{room.eventDate ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(room.eventDate)) : "ยังไม่กำหนดวัน"}</span></CardContent></Card></Link>)}</div>}
        </section>
        <Card className="lg:sticky lg:top-6"><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="size-5 text-primary" />สร้างกิจกรรม</CardTitle><CardDescription>เริ่มจากชื่อกิจกรรม แล้วเพิ่มรายละเอียดภายหลังได้</CardDescription></CardHeader><CardContent><form onSubmit={createRoom} className="space-y-4"><label className="grid gap-2 text-sm font-medium">ชื่อกิจกรรม<Input name="name" required maxLength={120} placeholder="เช่น คริสต์มาสทีมเรา 2026" /></label><label className="grid gap-2 text-sm font-medium">รายละเอียด<textarea name="description" maxLength={1000} rows={3} className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" placeholder="ข้อความถึงผู้เข้าร่วม (ไม่บังคับ)" /></label>{error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={pending}>{pending && <LoaderCircle className="size-4 animate-spin" />}สร้างกิจกรรม</Button></form></CardContent></Card>
      </div>
    </main>
  );
}
