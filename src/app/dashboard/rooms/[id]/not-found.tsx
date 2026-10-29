import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RoomNotFound() { return <main className="grid min-h-screen place-items-center px-5"><div className="text-center"><p className="text-5xl">🎁</p><h1 className="mt-5 text-2xl font-black">ไม่พบกิจกรรม</h1><p className="mt-2 text-muted-foreground">กิจกรรมนี้ไม่มีอยู่หรือคุณไม่มีสิทธิ์เข้าถึง</p><Button asChild className="mt-6"><Link href="/dashboard">กลับหน้ากิจกรรม</Link></Button></div></main>; }
