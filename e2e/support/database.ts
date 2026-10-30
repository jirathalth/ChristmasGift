import { db } from "../../src/lib/db";

const TEST_EMAIL_PREFIX = "codex-e2e-";
const TEST_EMAIL_SUFFIX = "@example.test";

export function assertSafeE2EDatabase() {
  if (process.env.E2E_ALLOW_DATABASE_MUTATION !== "true") throw new Error("E2E database mutation is disabled. Set E2E_ALLOW_DATABASE_MUTATION=true only for an isolated development database.");
  if (process.env.VERCEL_ENV === "production") throw new Error("E2E database tests cannot run in the production Vercel environment.");
  const expectedHost = process.env.E2E_EXPECTED_DATABASE_HOST;
  const databaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;
  if (!expectedHost || !databaseUrl || !directUrl) throw new Error("E2E database guard variables are missing.");
  const pooledHost = new URL(databaseUrl).hostname;
  const directHost = new URL(directUrl).hostname;
  const normalizedPooledHost = pooledHost.replace("-pooler.", ".");
  const normalizedExpectedHost = expectedHost.replace("-pooler.", ".");
  if (normalizedPooledHost !== normalizedExpectedHost || directHost !== normalizedExpectedHost || !directHost.endsWith(".neon.tech")) throw new Error("E2E database host does not match the verified isolated Neon development endpoint.");
}

export async function verifySafeE2EDatabase() {
  assertSafeE2EDatabase();
  await db.$queryRaw`SELECT 1`;
}

export function createTestIdentity() {
  const marker = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  return { email: `${TEST_EMAIL_PREFIX}${marker}${TEST_EMAIL_SUFFIX}`, password: `E2E-${crypto.randomUUID()}!` };
}

export async function inspectTestOrganizer(email: string) {
  assertTestEmail(email);
  const user = await db.user.findUnique({
    where: { email },
    select: {
      rooms: {
        select: {
          assignments: { select: { giverId: true, receiverId: true } },
          participants: { select: { invitationTokenHash: true } }
        }
      }
    }
  });
  return user?.rooms[0] ?? null;
}

export async function cleanupTestOrganizer(email: string) {
  assertTestEmail(email);
  const user = await db.user.findUnique({ where: { email }, select: { id: true, rooms: { select: { id: true, participants: { select: { id: true } } } } } });
  if (!user) return;
  const roomIds = user.rooms.map((room) => room.id);
  const participantIds = user.rooms.flatMap((room) => room.participants.map((participant) => participant.id));
  await db.$transaction(async (tx) => {
    if (participantIds.length) await tx.participantSession.deleteMany({ where: { participantId: { in: participantIds } } });
    if (roomIds.length) {
      await tx.assignment.deleteMany({ where: { roomId: { in: roomIds } } });
      await tx.excludedPair.deleteMany({ where: { roomId: { in: roomIds } } });
      await tx.participant.deleteMany({ where: { roomId: { in: roomIds } } });
      await tx.room.deleteMany({ where: { id: { in: roomIds }, organizerId: user.id } });
    }
    await tx.verification.deleteMany({ where: { identifier: email } });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.account.deleteMany({ where: { userId: user.id } });
    await tx.user.delete({ where: { id: user.id } });
  });
}

export async function disconnectTestDatabase() { await db.$disconnect(); }

function assertTestEmail(email: string) {
  if (!email.startsWith(TEST_EMAIL_PREFIX) || !email.endsWith(TEST_EMAIL_SUFFIX)) throw new Error("Refusing to inspect or clean a non-E2E organizer.");
}
