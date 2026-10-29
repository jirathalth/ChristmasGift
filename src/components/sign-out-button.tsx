"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return <Button variant="ghost" onClick={async () => { await authClient.signOut(); router.replace("/login"); router.refresh(); }}><LogOut className="size-4" />ออกจากระบบ</Button>;
}
