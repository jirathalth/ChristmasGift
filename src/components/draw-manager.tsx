"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Gift, LoaderCircle, RefreshCw, Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Participant = { id: string; displayName: string; invitationIssuedAt: string | null; joinedAt: string | null; revealedAt: string | null };
type Invitation = { id: string; displayName: string; link: string | null; regenerated: boolean };
type ApiResponse<T> = { success: true; data: T } | { success: false; error: { message: string } };

export function DrawManager({ roomId, status, participants }: { roomId: string; status: string; participants: Participant[] }) {
  const router = useRouter();
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [links, setLinks] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const drawn = status === "DRAWN" || status === "COMPLETED";

  async function post<T>(key: string, path: string, body?: unknown) {
    setPending(key);
    setError("");
    try {
      const response = await fetch(path, { method: "POST", headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const result = await response.json() as ApiResponse<T>;
      if (!result.success) { setError(result.error.message); return null; }
      router.refresh();
      return result.data;
    } catch { setError("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่"); return null; } finally { setPending(""); }
  }

  async function draw() {
    if (!window.confirm("ยืนยันเริ่มจับฉลาก? เมื่อเริ่มแล้วจะเปลี่ยนรายชื่อ คู่ยกเว้น หรือจับใหม่ไม่ได้")) return;
    await post("draw", `/api/rooms/${roomId}/draw`);
  }

  async function issueAll(regenerate = false) {
    if (regenerate && !window.confirm("สร้างลิงก์ใหม่ทั้งหมด? ลิงก์เชิญเดิมจะใช้ไม่ได้ แต่ผู้ที่เปิดลิงก์แล้วจะยังเข้าได้")) return;
    const invitations = await post<Invitation[]>("links", `/api/rooms/${roomId}/invitations`, { regenerate });
    if (invitations) setLinks((current) => ({ ...current, ...Object.fromEntries(invitations.filter((invitation) => invitation.link).map((invitation) => [invitation.id, invitation.link!])) }));
  }

  async function regenerate(participantId: string) {
    if (!window.confirm("สร้างลิงก์ใหม่สำหรับคนนี้? ลิงก์เดิมจะใช้ไม่ได้")) return;
    const invitations = await post<Invitation[]>(`link-${participantId}`, `/api/rooms/${roomId}/invitations`, { participantId, regenerate: true });
    const link = invitations?.[0]?.link;
    if (link) setLinks((current) => ({ ...current, [participantId]: link }));
  }

  async function copy(participantId: string) {
    const link = links[participantId];
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(participantId);
    window.setTimeout(() => setCopied(""), 1800);
  }

  if (status === "READY") return <div className="space-y-6"><Card className="border-destructive/30"><CardHeader><CardTitle className="flex items-center gap-2"><Gift className="size-5 text-destructive" />เริ่มจับฉลาก</CardTitle><CardDescription>ระบบจะสุ่มและบันทึกทุกคู่พร้อมกัน การดำเนินการนี้ย้อนกลับไม่ได้</CardDescription></CardHeader><CardContent className="space-y-3"><Button variant="destructive" className="w-full" onClick={draw} disabled={pending === "draw"}>{pending === "draw" && <LoaderCircle className="size-4 animate-spin" />}ยืนยันเริ่มจับฉลาก</Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><Send className="size-5 text-primary" />ลิงก์เชิญล่วงหน้า</CardTitle><CardDescription>ส่งให้ผู้เข้าร่วมได้ทันที ก่อนจับฉลากจะเห็นหน้ารอ</CardDescription></CardHeader><CardContent className="space-y-3"><Button variant="outline" className="w-full" onClick={() => issueAll(false)} disabled={pending === "links"}>{pending === "links" && <LoaderCircle className="size-4 animate-spin" />}สร้างลิงก์เชิญ</Button>{Object.entries(links).map(([participantId, link]) => { const participant = participants.find((item) => item.id === participantId); return <div key={participantId} className="flex items-center justify-between gap-2 rounded-xl border p-2 pl-3"><span className="truncate text-sm font-medium">{participant?.displayName}</span><div className="flex"><Button variant="ghost" size="icon" onClick={() => copy(participantId)} aria-label={`คัดลอกลิงก์ ${participant?.displayName}`}>{copied === participantId ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}</Button><Button asChild variant="ghost" size="icon"><a href={`https://line.me/R/msg/text/?${encodeURIComponent(`ลิงก์ Secret Santa ส่วนตัวของคุณ 🎁\n${link}`)}`} target="_blank" rel="noreferrer" aria-label={`ส่งลิงก์ ${participant?.displayName} ทาง LINE`}><ExternalLink className="size-4" /></a></Button></div></div>; })}</CardContent></Card></div>;
  if (!drawn) return null;

  const invited = participants.filter((participant) => participant.invitationIssuedAt).length;
  const visited = participants.filter((participant) => participant.joinedAt).length;
  const revealed = participants.filter((participant) => participant.revealedAt).length;
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Send className="size-5 text-primary" />ลิงก์ส่วนตัว</CardTitle><CardDescription>ส่งลิงก์ให้แต่ละคนทาง LINE ผู้จัดจะไม่เห็นว่าใครจับได้ใคร</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-3 gap-2 text-center"><Progress value={invited} label="เชิญแล้ว" /><Progress value={visited} label="เปิดลิงก์" /><Progress value={revealed} label="ดูผลแล้ว" /></div><div className="rounded-xl bg-gold/10 p-3 text-xs leading-5 text-foreground"><ShieldAlert className="mr-1 inline size-4 text-primary" />ผู้ที่มีลิงก์สามารถดูผลของคนนั้นได้ โปรดส่งเป็นการส่วนตัว</div><div className="flex gap-2"><Button className="flex-1" onClick={() => issueAll(false)} disabled={pending === "links"}>{pending === "links" && <LoaderCircle className="size-4 animate-spin" />}สร้างลิงก์ที่ยังไม่มี</Button><Button variant="outline" size="icon" aria-label="สร้างลิงก์ใหม่ทั้งหมด" onClick={() => issueAll(true)}><RefreshCw className="size-4" /></Button></div><ul className="space-y-2">{participants.map((participant) => { const link = links[participant.id]; return <li key={participant.id} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{participant.displayName}</p><p className="text-xs text-muted-foreground">{participant.revealedAt ? "ดูผลแล้ว" : participant.joinedAt ? "เปิดลิงก์แล้ว" : participant.invitationIssuedAt ? "รอเปิดลิงก์" : "ยังไม่มีลิงก์"}</p></div><div className="flex shrink-0">{link ? <><Button variant="ghost" size="icon" aria-label={`คัดลอกลิงก์ ${participant.displayName}`} onClick={() => copy(participant.id)}>{copied === participant.id ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}</Button><Button asChild variant="ghost" size="icon"><a href={`https://line.me/R/msg/text/?${encodeURIComponent(`ลิงก์ Secret Santa ส่วนตัวของคุณ 🎁\n${link}`)}`} target="_blank" rel="noreferrer" aria-label={`ส่งลิงก์ ${participant.displayName} ทาง LINE`}><ExternalLink className="size-4" /></a></Button></> : participant.invitationIssuedAt ? <Button variant="ghost" size="sm" onClick={() => regenerate(participant.id)} disabled={pending === `link-${participant.id}`}>สร้างใหม่</Button> : null}</div></div></li>; })}</ul>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</CardContent></Card>;
}

function Progress({ value, label }: { value: number; label: string }) { return <div className="rounded-xl bg-muted p-2"><p className="text-xl font-black">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>; }
