"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gift, LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AuthFormProps = { mode: "login" | "signup" };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const isSignup = mode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const result = isSignup
      ? await authClient.signUp.email({ name: String(form.get("name")), email, password })
      : await authClient.signIn.email({ email, password });

    if (result.error) {
      setError(isSignup ? "สร้างบัญชีไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง" : "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      setPending(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mx-auto mb-7 flex items-center gap-2 text-lg font-bold"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Gift className="size-5" /></span>Secret Santa</Link>
      <Card>
        <CardHeader className="text-center"><CardTitle>{isSignup ? "สร้างบัญชีผู้จัด" : "ยินดีต้อนรับกลับมา"}</CardTitle><CardDescription>{isSignup ? "สมัครเพื่อเริ่มสร้างกิจกรรมจับฉลาก" : "เข้าสู่ระบบเพื่อจัดการกิจกรรมของคุณ"}</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && <label className="grid gap-2 text-sm font-medium">ชื่อผู้จัด<Input name="name" autoComplete="name" required maxLength={100} placeholder="ชื่อของคุณ" /></label>}
            <label className="grid gap-2 text-sm font-medium">อีเมล<Input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
            <label className="grid gap-2 text-sm font-medium">รหัสผ่าน<Input name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} required minLength={8} placeholder="อย่างน้อย 8 ตัวอักษร" /></label>
            {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit" disabled={pending}>{pending && <LoaderCircle className="size-4 animate-spin" />}{isSignup ? "สร้างบัญชี" : "เข้าสู่ระบบ"}</Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">{isSignup ? "มีบัญชีแล้ว?" : "ยังไม่มีบัญชี?"} <Link className="font-semibold text-primary underline-offset-4 hover:underline" href={isSignup ? "/login" : "/signup"}>{isSignup ? "เข้าสู่ระบบ" : "สมัครใช้งาน"}</Link></p>
        </CardContent>
      </Card>
    </main>
  );
}
