import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "สร้างบัญชี" };

export default function SignupPage() { return <AuthForm mode="signup" />; }
