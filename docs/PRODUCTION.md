# Production deployment runbook

## Required services

- Vercel project connected to this repository with `main` as the production branch.
- Neon production project or branch. Keep a separate isolated branch for development and E2E.
- Upstash Redis database for distributed rate limiting across Vercel instances.

## Environment variables

Configure these separately for Vercel Production and Preview. Never copy development database credentials into Production.

| Variable | Requirement |
| --- | --- |
| `DATABASE_URL` | Neon pooled runtime URL with `sslmode=verify-full` |
| `DIRECT_URL` | Neon direct URL used only by Prisma CLI migrations |
| `BETTER_AUTH_SECRET` | At least 32 cryptographically random bytes; production-only value |
| `BETTER_AUTH_URL` | Canonical HTTPS origin, with no trailing path |
| `NEXT_PUBLIC_APP_URL` | Same canonical HTTPS origin used to generate invitation links |
| `UPSTASH_REDIS_REST_URL` | Upstash REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token |

Do not configure `E2E_ALLOW_DATABASE_MUTATION` in Production. Sensitive organizer authentication, invitation redemption, and participant reveal fail closed with HTTP 503 when Upstash is missing, partially configured, unavailable, or times out. Local development and Vitest use an in-process limiter when both Upstash variables are absent.

## Database and migrations

Prisma runtime traffic uses pooled `DATABASE_URL`. `prisma.config.ts` deliberately uses direct `DIRECT_URL` for migration commands.

Migrations are not part of `npm run build` or Vercel deployment. Apply them as an explicit reviewed release step:

1. Confirm `DIRECT_URL` identifies the intended production database.
2. Create a Neon backup/restore point or protected pre-deployment branch.
3. Run `npx prisma validate`.
4. Review pending SQL under `prisma/migrations`.
5. Run `npm run db:deploy` once from the controlled release environment.
6. Confirm `npx prisma migrate status` before deploying the application.

Never run `prisma migrate dev`, reset, or destructive cleanup against production.

## Vercel deployment

1. Add all required environment variables to Vercel.
2. Set the production domain, then make `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` match its exact HTTPS origin.
3. Run lint, typecheck, Prisma validation, Vitest, guarded E2E, accessibility tests, and production build in CI.
4. Apply migrations separately as described above.
5. Deploy the reviewed commit with Vercel's standard Next.js build (`npm run build`).
6. Do not put migration commands in Build Command or `postinstall`.

## Isolated E2E

Run only against a verified Neon development endpoint:

```bash
E2E_ALLOW_DATABASE_MUTATION=true \
E2E_EXPECTED_DATABASE_HOST=your-direct-development-host.neon.tech \
npm run test:e2e
```

The host guard checks both pooled and direct URLs, rejects Vercel Production, generates a unique organizer, and deletes only records belonging to that marked organizer.

## Post-deployment smoke tests

- `/`, `/login`, and `/signup` return 200 over HTTPS with CSP, HSTS, frame denial, no-sniff, and no-referrer headers.
- Organizer signup/login works and an organizer cannot access another organizer's room.
- A disposable production smoke room can be created and archived according to the approved smoke-data policy.
- Invitation links use the production domain, remove the raw fragment after redemption, and return private/no-store responses.
- Draw and reveal return stable results without exposing assignments through organizer APIs or logs.
- Upstash counters appear for organizer auth, invitation redemption, and participant reveal; an unavailable store produces 503 rather than bypassing protection.
- Vercel logs contain no raw tokens, credentials, recipient mappings, or full request bodies.

## Rollback

1. Stop promotion if migrations or smoke tests fail.
2. Redeploy the last known-good Vercel commit without force-pushing or rewriting Git history.
3. Keep forward-compatible migrations whenever possible. Do not run `prisma migrate reset` or manually delete migration records.
4. If a migration caused data corruption, disable writes, preserve evidence, and restore through the pre-deployment Neon restore point following the reviewed incident plan.
5. Verify auth, room listing, invitation redemption, and rate limiting after rollback.
