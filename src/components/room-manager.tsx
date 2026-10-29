"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, Gift, LoaderCircle, Pencil, Plus, ShieldAlert, Trash2, Users, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DrawManager } from "@/components/draw-manager";

type Participant = { id: string; displayName: string; invitationIssuedAt: string | null; joinedAt: string | null; revealedAt: string | null };
type ExcludedPair = { id: string; participantAId: string; participantBId: string; participantAName: string; participantBName: string };
type Feasibility = { feasible: boolean; code: string; message: string };
type RoomDetail = { id: string; name: string; description: string | null; eventDate: string | null; budget: string | null; currency: string; status: string; participants: Participant[]; excludedPairs: ExcludedPair[]; feasibility: Feasibility };
type ApiResponse<T> = { success: true; data: T } | { success: false; error: { message: string } };

const fieldClass = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";
const statusLabels: Record<string, string> = { DRAFT: "กำลังเตรียม", READY: "พร้อมจับฉลาก", DRAWN: "จับฉลากแล้ว", COMPLETED: "เปิดครบแล้ว", ARCHIVED: "เก็บถาวร" };

function bangkokInputValue(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
  return parts.replace(" ", "T");
}

export function RoomManager({ room }: { room: RoomDetail }) {
  const router = useRouter();
  const editable = room.status === "DRAFT" || room.status === "READY";
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [participantAId, setParticipantAId] = useState("");
  const [participantBId, setParticipantBId] = useState("");

  async function request<T>(key: string, path: string, method: string, body?: unknown) {
    setPending(key);
    setError("");
    setNotice("");
    try {
      const response = await fetch(path, { method, headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const result = await response.json() as ApiResponse<T>;
      if (!result.success) { setError(result.error.message); return null; }
      router.refresh();
      return result.data;
    } catch { setError("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่"); return null; } finally { setPending(""); }
  }

  async function updateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const dateValue = String(form.get("eventDate") || "");
    const result = await request("room", `/api/rooms/${room.id}`, "PATCH", { name: form.get("name"), description: form.get("description"), eventDate: dateValue ? new Date(`${dateValue}:00+07:00`).toISOString() : null, budget: form.get("budget"), currency: "THB" });
    if (result) setNotice("บันทึกรายละเอียดแล้ว");
  }

  async function addParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await request("participant", `/api/rooms/${room.id}/participants`, "POST", { displayName: form.get("displayName") });
    if (result) { formElement.reset(); setNotice("เพิ่มผู้เข้าร่วมแล้ว"); }
  }

  async function addExclusion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await request("exclusion", `/api/rooms/${room.id}/exclusions`, "POST", { participantAId, participantBId });
    if (result) { setParticipantAId(""); setParticipantBId(""); setNotice("เพิ่มคู่ยกเว้นแล้ว"); }
  }

  async function validateDraw() {
    const result = await request<Feasibility>("validate", `/api/rooms/${room.id}/validate-draw`, "POST");
    if (result) setNotice(result.message);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between gap-4"><Button asChild variant="ghost" className="-ml-3"><Link href="/dashboard"><ArrowLeft className="size-4" />กิจกรรมทั้งหมด</Link></Button><span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">{statusLabels[room.status]}</span></header>
      <section className="py-8"><div className="flex items-start gap-4"><span className="hidden size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground sm:grid"><Gift className="size-7" /></span><div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">{room.name}</h1><p className="mt-2 text-muted-foreground">จัดการรายละเอียด รายชื่อ และคู่ยกเว้น</p></div></div></section>
      {(error || notice) && <div role={error ? "alert" : "status"} className={`mb-6 rounded-xl px-4 py-3 text-sm ${error ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>{error || notice}</div>}
      {!editable && <div className="mb-6 flex gap-3 rounded-2xl border border-gold/50 bg-gold/10 p-4 text-sm"><ShieldAlert className="mt-0.5 size-5 shrink-0 text-primary" /><p>กิจกรรมนี้เป็นแบบอ่านอย่างเดียว ไม่สามารถแก้ไขผู้เข้าร่วมหรือคู่ยกเว้นได้</p></div>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Pencil className="size-5 text-primary" />รายละเอียดกิจกรรม</CardTitle></CardHeader><CardContent><form onSubmit={updateRoom} className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium sm:col-span-2">ชื่อกิจกรรม<Input name="name" defaultValue={room.name} required maxLength={120} disabled={!editable} /></label><label className="grid gap-2 text-sm font-medium"><CalendarDays className="sr-only" />วันและเวลา<input className={fieldClass} name="eventDate" type="datetime-local" defaultValue={bangkokInputValue(room.eventDate)} disabled={!editable} /></label><label className="grid gap-2 text-sm font-medium">งบต่อของขวัญ (บาท)<Input name="budget" type="number" min="0" max="99999999.99" step="0.01" defaultValue={room.budget ?? ""} disabled={!editable} /></label><label className="grid gap-2 text-sm font-medium sm:col-span-2">รายละเอียด<textarea className={fieldClass} name="description" rows={4} maxLength={1000} defaultValue={room.description ?? ""} disabled={!editable} /></label>{editable && <Button className="sm:col-span-2 sm:justify-self-start" disabled={pending === "room"}>{pending === "room" && <LoaderCircle className="size-4 animate-spin" />}บันทึกรายละเอียด</Button>}</form></CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5 text-primary" />ผู้เข้าร่วม <span className="text-sm font-normal text-muted-foreground">{room.participants.length}/100</span></CardTitle><CardDescription>เพิ่มชื่อผู้จัดเป็นผู้เข้าร่วมด้วย หากต้องการร่วมจับฉลาก</CardDescription></CardHeader><CardContent>{editable && <form onSubmit={addParticipant} className="mb-5 flex flex-col gap-3 sm:flex-row"><Input name="displayName" required maxLength={100} placeholder="ชื่อผู้เข้าร่วม" aria-label="ชื่อผู้เข้าร่วม" /><Button className="shrink-0" disabled={pending === "participant"}><Plus className="size-4" />เพิ่มรายชื่อ</Button></form>}{room.participants.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">ยังไม่มีผู้เข้าร่วม</div> : <ul className="divide-y">{room.participants.map((participant, index) => <ParticipantRow key={participant.id} roomId={room.id} participant={participant} number={index + 1} editable={editable} pending={pending} request={request} />)}</ul>}</CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="size-5 text-primary" />คู่ยกเว้น</CardTitle><CardDescription>คู่ที่เลือกจะไม่สามารถจับได้กันทั้งสองทิศทาง และหนึ่งคนอยู่ได้หลายคู่</CardDescription></CardHeader><CardContent>{editable && <form onSubmit={addExclusion} className="mb-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><select required value={participantAId} onChange={(event) => setParticipantAId(event.target.value)} className={fieldClass} aria-label="ผู้เข้าร่วมคนแรก"><option value="">เลือกคนแรก</option>{room.participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.displayName}</option>)}</select><select required value={participantBId} onChange={(event) => setParticipantBId(event.target.value)} className={fieldClass} aria-label="ผู้เข้าร่วมคนที่สอง"><option value="">เลือกคนที่สอง</option>{room.participants.map((participant) => <option key={participant.id} value={participant.id} disabled={participant.id === participantAId}>{participant.displayName}</option>)}</select><Button disabled={pending === "exclusion" || room.participants.length < 2}><Plus className="size-4" />เพิ่ม</Button></form>}{room.excludedPairs.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">ไม่มีคู่ยกเว้น</div> : <ul className="space-y-2">{room.excludedPairs.map((pair) => <li key={pair.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3 text-sm"><span><strong>{pair.participantAName}</strong> ↔ <strong>{pair.participantBName}</strong></span>{editable && <Button type="button" variant="ghost" size="icon" aria-label={`ลบคู่ ${pair.participantAName} และ ${pair.participantBName}`} onClick={() => request(`exclusion-${pair.id}`, `/api/rooms/${room.id}/exclusions/${pair.id}`, "DELETE")} disabled={pending === `exclusion-${pair.id}`}><Trash2 className="size-4 text-destructive" /></Button>}</li>)}</ul>}</CardContent></Card>
        </div>
        <aside className="space-y-6 lg:sticky lg:top-6"><Card className={room.feasibility.feasible ? "border-primary/40" : "border-destructive/30"}><CardHeader><CardTitle className="flex items-center gap-2">{room.feasibility.feasible ? <CheckCircle2 className="size-5 text-primary" /> : <XCircle className="size-5 text-destructive" />}ความพร้อมจับฉลาก</CardTitle><CardDescription>{room.feasibility.message}</CardDescription></CardHeader><CardContent className="space-y-3"><div className="grid grid-cols-2 gap-3 text-center"><div className="rounded-xl bg-muted p-3"><p className="text-2xl font-black">{room.participants.length}</p><p className="text-xs text-muted-foreground">ผู้เข้าร่วม</p></div><div className="rounded-xl bg-muted p-3"><p className="text-2xl font-black">{room.excludedPairs.length}</p><p className="text-xs text-muted-foreground">คู่ยกเว้น</p></div></div>{editable && <Button className="w-full" variant={room.feasibility.feasible ? "default" : "outline"} onClick={validateDraw} disabled={pending === "validate"}>{pending === "validate" && <LoaderCircle className="size-4 animate-spin" />}ตรวจสอบความพร้อม</Button>}<p className="text-xs leading-5 text-muted-foreground">ขั้นตอนนี้ตรวจสอบความเป็นไปได้เท่านั้น ยังไม่มีการจับฉลากหรือบันทึกผล</p></CardContent></Card>
          {room.status === "COMPLETED" && <Card><CardHeader><CardTitle>เก็บกิจกรรม</CardTitle><CardDescription>เมื่อเก็บถาวรแล้ว กิจกรรมจะเป็นแบบอ่านอย่างเดียว</CardDescription></CardHeader><CardContent><Button variant="outline" className="w-full" onClick={() => request("archive", `/api/rooms/${room.id}/archive`, "POST")} disabled={pending === "archive"}>เก็บถาวร</Button></CardContent></Card>}
          <DrawManager roomId={room.id} status={room.status} participants={room.participants} />
        </aside>
      </div>
    </main>
  );
}

function ParticipantRow({ roomId, participant, number, editable, pending, request }: { roomId: string; participant: Participant; number: number; editable: boolean; pending: string; request: <T>(key: string, path: string, method: string, body?: unknown) => Promise<T | null> }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(participant.displayName);

  async function save() {
    const result = await request(`participant-${participant.id}`, `/api/rooms/${roomId}/participants/${participant.id}`, "PATCH", { displayName: name });
    if (result) setEditing(false);
  }

  return <li className="flex min-h-14 items-center gap-3 py-2"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{number}</span>{editing ? <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} aria-label={`แก้ไขชื่อ ${participant.displayName}`} /> : <span className="min-w-0 flex-1 truncate font-medium">{participant.displayName}</span>}{editable && <div className="flex shrink-0">{editing ? <><Button size="sm" onClick={save} disabled={!name.trim() || pending === `participant-${participant.id}`}>บันทึก</Button><Button size="sm" variant="ghost" onClick={() => { setEditing(false); setName(participant.displayName); }}>ยกเลิก</Button></> : <><Button variant="ghost" size="icon" aria-label={`แก้ไข ${participant.displayName}`} onClick={() => setEditing(true)}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" aria-label={`ลบ ${participant.displayName}`} onClick={() => { if (window.confirm(`ลบ ${participant.displayName} ออกจากกิจกรรม?`)) request(`participant-${participant.id}`, `/api/rooms/${roomId}/participants/${participant.id}`, "DELETE"); }} disabled={pending === `participant-${participant.id}`}><Trash2 className="size-4 text-destructive" /></Button></>}</div>}</li>;
}
