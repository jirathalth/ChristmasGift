import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: { "/sign-in/email": { window: 60, max: 5 }, "/sign-up/email": { window: 60, max: 5 } },
    customStorage: { consume: async (key, rule) => consumeRateLimit("organizer-auth", key, rule.max, rule.window * 1000) }
  },
  advanced: { database: { generateId: "uuid" }, useSecureCookies: process.env.NODE_ENV === "production" },
  trustedOrigins: [process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_APP_URL].filter((origin): origin is string => Boolean(origin))
});
