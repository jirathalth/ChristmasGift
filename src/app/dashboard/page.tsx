import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between"><div className="flex items-center gap-2 font-bold"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Gift className="size-5" /></span>Secret Santa</div><SignOutButton /></header>
      <section className="py-14"><p className="text-sm font-semibold text-primary">สวัสดี {session.user.name}</p><h1 className="mt-2 text-3xl font-black tracking-tight">กิจกรรมของคุณ</h1><Card className="mt-8 border-dashed"><CardHeader><CardTitle>ยังไม่มีกิจกรรม</CardTitle><CardDescription>การสร้างและจัดการกิจกรรมจะพร้อมในขั้นตอนถัดไป</CardDescription></CardHeader><CardContent><div className="grid min-h-36 place-items-center rounded-xl bg-muted text-muted-foreground"><Gift className="size-10" strokeWidth={1.5} /></div></CardContent></Card></section>
    </main>
  );
}
