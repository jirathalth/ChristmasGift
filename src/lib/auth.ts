import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  advanced: { database: { generateId: "uuid" }, useSecureCookies: process.env.NODE_ENV === "production" },
  trustedOrigins: [process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_APP_URL].filter((origin): origin is string => Boolean(origin))
});
