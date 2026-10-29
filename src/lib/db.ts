import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const databaseUrl = new URL(connectionString);

if (["prefer", "require", "verify-ca"].includes(databaseUrl.searchParams.get("sslmode") ?? "")) {
  databaseUrl.searchParams.set("sslmode", "verify-full");
}

const adapter = new PrismaPg({ connectionString: databaseUrl.toString() });

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
