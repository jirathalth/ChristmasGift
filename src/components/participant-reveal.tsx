"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CalendarDays, Gift, LoaderCircle, LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type EventData = { participant: { displayName: string }; room: { name: string; description: string | null; eventDate: string | null; budget: string | null; currency: string; status: string }; revealed: boolean };
type ApiResponse<T> = { success: true; data: T } | { success: false; error: { message: string } };

export function ParticipantReveal() {
  const reduceMotion = useReducedMotion();
  const started = useRef(false);
  const [event, setEvent] = useState<EventData | null>(null);
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function load() {
      const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
      if (token) window.history.replaceState(null, "", "/invite");
      try {
        const response = token
          ? await fetch("/api/invitations/redeem", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) })
          : await fetch("/api/me/event", { cache: "no-store" });
        const result = await response.json() as ApiResponse<EventData>;
        if (!result.success) { setError(result.error.message); return; }
        setEvent(result.data);
        if (result.data.revealed) {
          const assignmentResponse = await fetch("/api/me/assignment", { cache: "no-store" });
          const assignment = await assignmentResponse.json() as ApiResponse<{ recipientName: string }>;
          if (assignment.success) setRecipient(assignment.data.recipientName);
        }
      } catch { setError("เชื่อมต่อไม่สำเร็จ กรุณาเปิดลิงก์อีกครั้ง"); } finally { setLoading(false); }
    }
    load();
  }, []);

  async function reveal() {
    setRevealing(true);
    setError("");
    try {
      const response = await fetch("/api/me/reveal", { method: "POST" });
      const result = await response.json() as ApiResponse<{ recipientName: string }>;
      if (!result.success) { setError(result.error.message); return; }
      setRecipient(result.data.recipientName);
      setEvent((current) => current ? { ...current, revealed: true } : current);
    } catch { setError("เปิดผลไม่สำเร็จ กรุณาลองใหม่"); } finally { setRevealing(false); }
  }

  if (loading) return <main className="grid min-h-screen place-items-center px-5"><div className="text-center text-muted-foreground"><LoaderCircle className="mx-auto size-8 animate-spin text-primary" /><p className="mt-3">กำลังเปิดคำเชิญ...</p></div></main>;
  if (error && !event) return <main className="grid min-h-screen place-items-center px-5"><Card className="w-full max-w-md text-center"><CardHeader><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive"><LockKeyhole className="size-7" /></span><CardTitle className="mt-3">เปิดลิงก์ไม่ได้</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card></main>;
  if (!event) return null;

  const drawn = event.room.status === "DRAWN" || event.room.status === "COMPLETED";
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-10">
      <div className="mb-6 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><Gift className="size-6" /></span><p className="mt-3 text-sm font-semibold text-primary">Secret Santa</p></div>
      <Card className="overflow-hidden"><div className="h-2 bg-gradient-to-r from-primary via-gold to-destructive" /><CardHeader className="text-center"><CardDescription>คำเชิญสำหรับ</CardDescription><CardTitle className="text-3xl">{event.participant.displayName}</CardTitle><p className="text-lg font-semibold text-primary">{event.room.name}</p></CardHeader><CardContent>
        {recipient ? <motion.div initial={reduceMotion ? false : { opacity: 0, scale: 0.85, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="rounded-2xl bg-primary px-5 py-8 text-center text-primary-foreground"><Sparkles className="mx-auto size-7 text-gold" /><p className="mt-3 text-sm opacity-80">คุณเตรียมของขวัญให้</p><p className="mt-2 text-4xl font-black">{recipient}</p><p className="mt-4 text-xs opacity-75">เก็บเป็นความลับนะ 🎄</p></motion.div> : drawn ? <div className="text-center"><motion.div animate={reduceMotion ? undefined : { rotate: [0, -3, 3, 0] }} transition={{ repeat: Infinity, repeatDelay: 2, duration: 0.5 }} className="mx-auto grid size-32 place-items-center rounded-3xl bg-primary text-primary-foreground shadow-xl"><Gift className="size-16" strokeWidth={1.5} /></motion.div><Button size="lg" className="mt-7 w-full" onClick={reveal} disabled={revealing}>{revealing ? <LoaderCircle className="size-5 animate-spin" /> : <Sparkles className="size-5" />}เปิดของขวัญ</Button></div> : <div className="rounded-2xl bg-muted p-6 text-center"><Gift className="mx-auto size-12 text-primary/60" strokeWidth={1.5} /><p className="mt-4 font-bold">รอผู้จัดเริ่มจับฉลาก</p><p className="mt-2 text-sm leading-6 text-muted-foreground">กลับมาเปิดลิงก์เดิมอีกครั้งหลังผู้จัดแจ้งว่าจับฉลากแล้ว</p></div>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="mt-6 space-y-2 border-t pt-5 text-sm text-muted-foreground">{event.room.eventDate && <p className="flex items-center gap-2"><CalendarDays className="size-4" />{new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(event.room.eventDate))}</p>}{event.room.budget && <p>งบของขวัญ: {new Intl.NumberFormat("th-TH", { style: "currency", currency: event.room.currency }).format(Number(event.room.budget))}</p>}{event.room.description && <p className="leading-6">{event.room.description}</p>}</div>
      </CardContent></Card>
      <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">ลิงก์นี้เป็นสิทธิ์ส่วนตัว ผู้ที่มีลิงก์สามารถดูผลของคุณได้ กรุณาอย่าส่งต่อ</p>
    </main>
  );
}
