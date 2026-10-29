# Secret Santa

Mobile-first Secret Santa application for Thai users. The organizer has an account; participants use separate private bearer links. Product behavior and delivery phases are defined in `SECRET_SANTA_CODEX_SPEC.md`.

## Stack

- Next.js App Router, React, strict TypeScript
- Tailwind CSS v4, shadcn/ui conventions, Radix UI, Lucide
- PostgreSQL/Neon, Prisma ORM
- Better Auth email/password authentication
- Zod, Motion, Vitest, Playwright

## Local setup

Requirements: Node.js 22.18+ and PostgreSQL.

```bash
npm install --legacy-peer-deps
cp .env.example .env
npm run db:deploy
npm run dev
```

Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`. Use a pooled Neon PostgreSQL connection for `DATABASE_URL` and a direct connection for `DIRECT_URL`. Prisma CLI operations use `DIRECT_URL`; the application runtime uses `DATABASE_URL`. Never commit `.env` files.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run test:e2e
```

## Database decisions

- Better Auth owns the UUID-based `user`, `session`, `account`, and `verification` models.
- Domain entities use UUIDs. Money uses `Decimal(10,2)` and timestamps are stored in UTC.
- Composite foreign keys prevent cross-room exclusions and assignments.
- SQL checks enforce canonical exclusion ordering, no self-exclusions, and no self-assignments.
- Assignment relations use restrictive deletes so a completed draw cannot be cascaded away. Pre-draw participant deletion may cascade only its exclusions and participant sessions.
- The organizer must be added explicitly as a participant.
- `READY` never replaces server-side validation; every draw revalidates under a database row lock.

## Security baseline

- Better Auth uses HttpOnly session cookies and Secure cookies in production.
- Global responses set `Referrer-Policy: no-referrer`, deny framing, and disable unnecessary browser permissions.
- Sensitive participant routes and the invitation page use `Cache-Control: private, no-store`.
- Invitation possession is bearer authorization; links can be forwarded and do not prove identity.
- Raw invitation/session tokens are never stored or logged; only SHA-256 hashes are persisted.

## Deploy to Vercel

1. Create a Neon-compatible PostgreSQL database.
2. Set `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `NEXT_PUBLIC_APP_URL` in Vercel for each environment.
3. Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the canonical HTTPS deployment URL.
4. Run `npm run db:deploy` against the production database before promoting the deployment.
5. Deploy with the default Next.js build command (`npm run build`).

Do not run `prisma migrate dev` in production.

## Delivery status

Phase 1 provides the project foundation, authentication, complete initial schema/migration, security headers, design tokens, public landing page, and auth screens.

Phase 2 provides organizer-owned room management, participant management, bidirectional exclusion pairs, deterministic perfect-matching feasibility validation, protected APIs, and the responsive Thai organizer interface. It does not issue invitations or persist draw assignments.

Phase 3 provides randomized transactional drawing, private hash-only invitation and participant sessions, fragment-based invitation links, participant reveal, organizer progress without assignment mappings, and LINE sharing. Draw results are immutable and remain server-only.

The original Phase 4 draw-engine requirements are complete: randomized constrained perfect matching, stale-readiness validation, room locking, serializable atomic persistence, idempotency, and concurrency protection.

Phase 5 provides the mobile participant waiting, reveal, stable result, and friendly link-state screens plus invited/visited/revealed organizer progress. Reveal motion respects reduced-motion preferences and recipient mappings remain private.
