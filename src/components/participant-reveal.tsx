"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Archive, CalendarDays, Clock3, Gift, Link2Off, LoaderCircle, LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { invitationErrorPresentation, isDrawAvailable } from "@/lib/participant/presentation";

type EventData = { participant: { displayName: string }; room: { name: string; description: string | null; eventDate: string | null; budget: string | null; currency: string; status: string }; revealed: boolean };
type ApiResponse<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };
type Failure = { code: string; message: string };

export function ParticipantReveal({ hasSession }: { hasSession: boolean }) {
  const reduceMotion = useReducedMotion();
  const started = useRef(false);
  const [event, setEvent] = useState<EventData | null>(null);
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  const handleFailure = useCallback((error: Failure) => {
    setFailure(error);
    if (["ROOM_ARCHIVED", "PARTICIPANT_SESSION_EXPIRED", "PARTICIPANT_UNAUTHORIZED"].includes(error.code)) setEvent(null);
  }, []);

  const loadAssignment = useCallback(async () => {
    const response = await fetch("/api/me/assignment", { cache: "no-store" });
    const result = await response.json() as ApiResponse<{ recipientName: string }>;
    if (!result.success) { handleFailure(result.error); return; }
    setRecipient(result.data.recipientName);
  }, [handleFailure]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function load() {
      const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
      if (token) window.history.replaceState(null, "", "/invite");
      if (!token && !hasSession) {
        setFailure({ code: "PARTICIPANT_UNAUTHORIZED", message: "กรุณาเปิดลิงก์เชิญส่วนตัว" });
        setLoading(false);
        return;
      }
      try {
        const response = token
          ? await fetch("/api/invitations/redeem", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) })
          : await fetch("/api/me/event", { cache: "no-store" });
        const result = await response.json() as ApiResponse<EventData>;
        if (!result.success) { handleFailure(result.error); return; }
        setEvent(result.data);
        if (result.data.revealed) await loadAssignment();
      } catch { setFailure({ code: "CONNECTION_ERROR", message: "เชื่อมต่อไม่สำเร็จ" }); } finally { setLoading(false); }
    }
    load();
  }, [handleFailure, hasSession, loadAssignment]);

  useEffect(() => {
    if (!event || recipient || isDrawAvailable(event.room.status)) return;
    let active = true;
    async function refreshStatus() {
      try {
        const response = await fetch("/api/me/status", { cache: "no-store" });
        const result = await response.json() as ApiResponse<{ roomStatus: string; revealed: boolean; canReveal: boolean }>;
        if (!active) return;
        if (!result.success) { handleFailure(result.error); return; }
        if (result.data.revealed) await loadAssignment();
        setEvent((current) => current ? { ...current, revealed: result.data.revealed, room: { ...current.room, status: result.data.roomStatus } } : current);
      } catch { /* Keep the waiting screen usable during transient network failures. */ }
    }
    const timer = window.setInterval(refreshStatus, 10_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [event, handleFailure, loadAssignment, recipient]);

  async function reveal() {
    setRevealing(true);
    setFailure(null);
    try {
      const response = await fetch("/api/me/reveal", { method: "POST" });
      const result = await response.json() as ApiResponse<{ recipientName: string }>;
      if (!result.success) { handleFailure(result.error); return; }
      setRecipient(result.data.recipientName);
      setEvent((current) => current ? { ...current, revealed: true } : current);
    } catch { setFailure({ code: "CONNECTION_ERROR", message: "เปิดผลไม่สำเร็จ กรุณาลองใหม่" }); } finally { setRevealing(false); }
  }

  if (loading) return <main className="grid min-h-screen place-items-center px-5"><div role="status" className="text-center text-muted-foreground"><LoaderCircle className="mx-auto size-8 animate-spin text-primary" aria-hidden="true" /><p className="mt-3">กำลังเปิดคำเชิญ...</p></div></main>;
  if (failure && !event) return <InvitationError failure={failure} />;
  if (!event) return null;

  const drawn = isDrawAvailable(event.room.status);
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-10">
      <div className="mb-6 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><Gift className="size-6" /></span><p className="mt-3 text-sm font-semibold text-primary">Secret Santa</p></div>
      <Card className="overflow-hidden"><div className="h-2 bg-gradient-to-r from-primary via-gold to-destructive" /><CardHeader className="text-center"><CardDescription>คำเชิญสำหรับ</CardDescription><CardTitle className="text-3xl">{event.participant.displayName}</CardTitle><p className="text-lg font-semibold text-primary">{event.room.name}</p></CardHeader><CardContent>
        {recipient ? <motion.div role="status" aria-live="polite" initial={reduceMotion ? false : { opacity: 0, scale: 0.85, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="rounded-2xl bg-primary px-5 py-8 text-center text-primary-foreground"><Sparkles className="mx-auto size-7 text-gold" aria-hidden="true" /><p className="mt-3 text-sm opacity-80">คุณเตรียมของขวัญให้</p><p className="mt-2 break-words text-4xl font-black">{recipient}</p><p className="mt-4 text-xs opacity-75">เก็บเป็นความลับนะ 🎄</p></motion.div> : drawn ? <div className="text-center"><motion.div aria-hidden="true" animate={reduceMotion ? undefined : { rotate: [0, -3, 3, 0] }} transition={{ repeat: Infinity, repeatDelay: 2, duration: 0.5 }} className="mx-auto grid size-32 place-items-center rounded-3xl bg-primary text-primary-foreground shadow-xl"><Gift className="size-16" strokeWidth={1.5} /></motion.div><p className="mt-5 font-bold">ของขวัญของคุณพร้อมแล้ว</p><Button size="lg" className="mt-4 w-full" onClick={reveal} disabled={revealing}>{revealing ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <Sparkles className="size-5" aria-hidden="true" />}{revealing ? "กำลังเปิด..." : "เปิดของขวัญ"}</Button></div> : <div role="status" className="rounded-2xl bg-muted p-6 text-center"><Clock3 className="mx-auto size-12 text-primary/60" strokeWidth={1.5} aria-hidden="true" /><p className="mt-4 font-bold">รอผู้จัดเริ่มจับฉลาก</p><p className="mt-2 text-sm leading-6 text-muted-foreground">หน้านี้จะอัปเดตอัตโนมัติเมื่อผลพร้อม คุณสามารถกลับมาเปิดลิงก์เดิมได้เสมอ</p><span className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />กำลังรอผล</span></div>}
        {failure && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{failure.message}</p>}
        <div className="mt-6 space-y-2 border-t pt-5 text-sm text-muted-foreground">{event.room.eventDate && <p className="flex items-center gap-2"><CalendarDays className="size-4" />{new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(event.room.eventDate))}</p>}{event.room.budget && <p>งบของขวัญ: {new Intl.NumberFormat("th-TH", { style: "currency", currency: event.room.currency }).format(Number(event.room.budget))}</p>}{event.room.description && <p className="leading-6">{event.room.description}</p>}</div>
      </CardContent></Card>
      <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">ลิงก์นี้เป็นสิทธิ์ส่วนตัว ผู้ที่มีลิงก์สามารถดูผลของคุณได้ กรุณาอย่าส่งต่อ</p>
    </main>
  );
}

function InvitationError({ failure }: { failure: Failure }) {
  const content = invitationErrorPresentation(failure.code);
  const Icon = failure.code === "INVITATION_EXPIRED" ? Clock3 : failure.code === "ROOM_ARCHIVED" ? Archive : failure.code === "INVALID_INVITATION" ? Link2Off : LockKeyhole;
  return <main className="grid min-h-screen place-items-center px-5 py-10"><Card className="w-full max-w-md text-center"><CardHeader><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive"><Icon className="size-7" aria-hidden="true" /></span><CardTitle className="mt-3">{content.title}</CardTitle><CardDescription className="leading-6">{content.description}</CardDescription></CardHeader><CardContent><p className="text-xs text-muted-foreground">เพื่อความเป็นส่วนตัว ระบบจะไม่แสดงข้อมูลกิจกรรมหากลิงก์ใช้ไม่ได้</p></CardContent></Card></main>;
}
