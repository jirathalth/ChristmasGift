import Link from "next/link";
import { Gift, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-8 sm:px-8">
      <nav className="flex items-center justify-between" aria-label="เมนูหลัก">
        <Link href="/" className="flex items-center gap-2 font-bold"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Gift className="size-5" /></span>Secret Santa</Link>
        <Button asChild variant="ghost"><Link href="/login">เข้าสู่ระบบ</Link></Button>
      </nav>
      <section className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground"><Sparkles className="size-4 text-gold" />คริสต์มาสนี้สนุกและเป็นความลับ</div>
          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">จับฉลากของขวัญ<br /><span className="text-primary">ง่าย อบอุ่น เป็นส่วนตัว</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">สร้างกิจกรรม ใส่รายชื่อและข้อยกเว้น แล้วส่งลิงก์ส่วนตัวให้เพื่อนแต่ละคน</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg"><Link href="/signup">เริ่มสร้างกิจกรรม</Link></Button><Button asChild size="lg" variant="outline"><Link href="/login">เข้าสู่ระบบผู้จัด</Link></Button></div>
        </div>
        <div className="relative mx-auto grid aspect-square w-full max-w-md place-items-center rounded-[2rem] border bg-card shadow-xl shadow-primary/10">
          <div className="absolute inset-5 rounded-[1.5rem] border border-dashed border-gold/60" />
          <div className="relative grid size-40 place-items-center rounded-3xl bg-primary text-primary-foreground shadow-2xl"><Gift className="size-20" strokeWidth={1.5} /><span className="absolute -right-3 -top-3 grid size-12 place-items-center rounded-full bg-destructive text-white"><Sparkles className="size-6" /></span></div>
          <div className="absolute bottom-8 flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="size-4 text-primary" />ผู้จัดจะไม่เห็นผลการจับคู่</div>
        </div>
      </section>
    </main>
  );
}
