# Secret Santa — Codex Implementation Specification

## Role and delivery
You are a senior full-stack engineer. Build a production-quality, mobile-first Secret Santa web application. Work in phases, inspect the repository before changes, follow existing conventions where present, and do not claim a feature is complete without testing it. Use Thai for all end-user UI text; use English for code identifiers and technical documentation. Create a clear README, `.env.example`, migrations, tests, and deployment instructions. Never commit secrets.

## Product decisions (final)
- Organizer creates and manages an event and manually enters all participant names, including their own name (organizer participates).
- Organizer shares a distinct private invitation URL with each participant individually through LINE using Copy Link; no LINE API integration is required.
- Participants do not create accounts. Possession of the private invitation URL is sufficient for this friendly, low-friction MVP. Make the limitations of bearer links explicit.
- Organizer signs in to manage events. Organizer's participant access is separate from organizer management access; organizer must use their own invitation URL to reveal their recipient.
- Each participant gives exactly one gift and receives exactly one gift. Nobody can draw themselves; recipients must be unique.
- Organizer can configure multiple undirected exclusion pairs. A participant may be in multiple exclusion pairs. If A/B is excluded, neither A->B nor B->A is permitted. Exclusions are not limited to romantic couples.
- Draw is performed ONCE for the entire event by the server, not when each participant clicks reveal. Results remain stable. No redraw or changing participants/exclusions after draw in MVP.
- Organizer dashboard shows invite/open progress, never the giver-to-recipient assignments. Participants see only their own recipient.
- Minimum participants: 2; maximum: 100. The algorithm must detect impossible exclusion configurations and return a clear Thai error.
- Multiple events supported. Currency defaults to THB, timezone display Asia/Bangkok. Budget and exchange date are optional.

## Stack
- Next.js App Router, React, TypeScript (strict)
- Tailwind CSS, shadcn/ui, Radix UI, Lucide icons
- Motion for subtle reveal animation, respecting reduced-motion preferences
- PostgreSQL (Neon-compatible), Prisma, Zod
- Better Auth for organizer authentication; integrate its actual generated User/Session/Account/Verification schema, not a conflicting placeholder
- Vitest for unit/integration tests, Playwright for E2E
- Vercel deployment target
- Use current compatible stable package versions; check the existing repository and official documentation rather than blindly pinning versions.

## Core user journeys
### Organizer
1. Sign up/sign in (organizer only).
2. Create an event: title (required), exchange date/time (optional), gift budget (optional), currency THB, description (optional).
3. Add, edit, and remove 2-100 participants in DRAFT. Names must be unique per event after trim/case-normalization as appropriate; display names should preserve user input.
4. Add/remove exclusion pairs via two participant dropdowns. Reject self-pairs, duplicate reverse-order pairs, cross-room participants. One participant may appear in multiple pairs.
5. Review readiness: participant count, exclusions, and feasibility. Show a clear warning when no valid matching exists.
6. Generate unique private invitation links for all participants; allow individual Copy Link to send via LINE. Show a warning that anyone holding a link can view that person's result. Make link regeneration possible before draw; optionally revoke/regenerate after draw while keeping assignments unchanged, with clear audit semantics.
7. Start draw with confirmation. Server atomically validates and persists all assignments. If invalid, no partial state is saved.
8. View statuses: invited/visited/revealed counts and participant status; never display recipient names.
9. Organizer uses their own participant invitation link to reveal their result.
10. Archive completed events. Archived events should be read-only, with clearly defined participant access policy.

### Participant
1. Open private invitation URL on mobile from LINE.
2. Redeem invitation token for secure participant session; display event details and participant name.
3. Before draw: show a waiting screen. After draw: show a gift box and a prominent 'เปิดของขวัญ' button.
4. On reveal, server resolves participant from authenticated session, records revealedAt exactly once, and returns ONLY their recipient's display name.
5. Returning with the same link/session shows the same result; never re-randomize.
6. Invalid, revoked, or expired links have friendly Thai error screens.

## Room state machine
DRAFT -> READY -> DRAWN -> COMPLETED -> ARCHIVED.
- DRAFT: editable details/participants/exclusions; READY is a derived or explicit state after minimum count and feasibility checks; do not let a stale READY flag bypass validation.
- DRAWN: assignments persisted; edits to membership/exclusions forbidden.
- COMPLETED: all participants have revealed; preserve assignments.
- ARCHIVED: read-only.
- Ensure all transitions are validated server-side and race-safe.

## Data model
Use UUIDs for Room, Participant, Assignment, ExcludedPair, ParticipantSession. Better Auth's own User schema owns organizer identity.

Room: id, organizerId (FK to actual auth User), name, description?, eventDate?, budget Decimal(10,2)?, currency default THB, status, drawnAt?, createdAt, updatedAt, archivedAt?. Index organizerId/status.
Participant: id, roomId, displayName, normalizedName, invitation token hash (nullable until issued), invitationIssuedAt?, invitationExpiresAt?, joinedAt?, revealedAt?, createdAt, updatedAt. Unique (roomId, normalizedName); unique (roomId,id) for composite FKs.
ExcludedPair: id, roomId, participantAId, participantBId, createdAt. Composite FKs (roomId, participantAId)/(roomId, participantBId) to Participant(roomId,id); canonicalize IDs by consistent ordering; unique (roomId,participantAId,participantBId); DB CHECK A != B and ideally A < B.
Assignment: id, roomId, giverId, receiverId, createdAt. Composite FKs ensure both belong to same room. Unique giverId, unique receiverId; DB CHECK giverId != receiverId. The draw transaction must verify each event participant is represented exactly once as giver and receiver.
ParticipantSession: id, participantId, tokenHash, createdAt, expiresAt, revokedAt?. Unique tokenHash; index participantId and expiresAt.

Add Prisma relations correctly in both directions. Prisma does not natively model arbitrary SQL CHECK constraints: create explicit SQL migration statements. Decide on onDelete behavior intentionally: restrict deletion once assignments exist; before draw delete exclusions/sessions before removing participant or use scoped cascading where safe. Never cascade away a finalized draw accidentally.

## Security
- Organizer endpoints: authenticated session AND event ownership check on every operation.
- Participant endpoints: derive participant identity from a server-validated session cookie, never from a client-supplied participantId or roomId.
- Invitation tokens: cryptographically random >=32 bytes; encode URL-safe; persist only SHA-256 hash. Never log raw token. Session tokens likewise generated securely and stored hashed.
- Secure HttpOnly SameSite=Lax cookie in production, scoped appropriately; use Secure in HTTPS production. Implement POST redemption and remove raw invitation token from URL after redemption where practical. Beware token leaks via referrers, logs, analytics, and browser history. Set Referrer-Policy: no-referrer and Cache-Control: private, no-store on sensitive pages/responses.
- Since users share via LINE, link possession is authorization for the friendly MVP. Do not claim that it prevents link forwarding or identity impersonation.
- Use Zod validation, authorization, CSRF/origin protections for state-changing endpoints, rate limiting on invite redemption/reveal/auth, safe errors, and no sensitive values in analytics.
- Organizer API must never expose the full assignments list, even indirectly in logs, serialized server component props, or debug views.
- Organizer who has direct DB/server access could technically read assignments; don't promise cryptographic secrecy from infrastructure admins.

## Drawing algorithm
Use a correct constrained perfect-matching algorithm (e.g. randomized backtracking with MRV / bipartite matching), not a naive one-shot shuffle or random-cycle-only method. Inputs: participant IDs and unordered excluded pairs. Allowed giver->receiver iff giver != receiver and the pair is not excluded in either direction.
- Find a complete bijection: each giver exactly one receiver, each receiver exactly once.
- A participant may have multiple exclusions.
- Detect unsatisfiable configurations reliably, with no fixed arbitrary retry cap that can falsely report impossibility.
- Randomize candidate exploration with Node crypto.randomInt (Fisher-Yates). Note: randomized backtracking is not necessarily uniform across all valid permutations; do not claim uniformity. For 100 participants, use an efficient bipartite matching feasibility solver and randomized candidate order, with performance tests on dense exclusions. If implementing uniform sampling, prove/test distribution or explicitly document that it is not guaranteed.
- Validate assignments again before persistence.
- Execute draw within a DB transaction, lock the Room row using SELECT ... FOR UPDATE (Prisma raw query in transaction if necessary), re-read participants/exclusions, verify state and feasibility, insert all assignments, set drawnAt/status, commit. Handle concurrent draw attempts gracefully with conflict status. Unique indexes and DB checks are defense in depth.
- An unsatisfiable draw must return 422 with a clear Thai explanation and no partial inserts.

## API contract
Use a consistent envelope `{ success: boolean, data?: ..., error?: { code: string, message: string } }`.
Organizer (requires auth and ownership):
- POST /api/rooms — create
- GET /api/rooms — list
- GET /api/rooms/:id — detail and non-sensitive progress
- PATCH /api/rooms/:id — update draft details
- POST /api/rooms/:id/participants — add
- PATCH /api/rooms/:id/participants/:pid — edit
- DELETE /api/rooms/:id/participants/:pid — remove
- GET /api/rooms/:id/exclusions — list
- POST /api/rooms/:id/exclusions — add
- DELETE /api/rooms/:id/exclusions/:eid — remove
- POST /api/rooms/:id/validate-draw — feasibility check (must not expose assignments)
- POST /api/rooms/:id/invitations — issue private links (show plaintext only at generation time or intentionally support secure regeneration; hashes are non-reversible)
- POST /api/rooms/:id/draw — draw once
- GET /api/rooms/:id/status — counts and participant reveal statuses only
- POST /api/rooms/:id/archive — archive
Participant:
- POST /api/invitations/redeem — redeem token and set session cookie
- GET /api/me/event — event details and own identity
- GET /api/me/status — draw/reveal status
- POST /api/me/reveal — reveal own recipient, idempotently mark revealedAt
- GET /api/me/assignment — own recipient only if already revealed
- POST /api/me/logout — revoke session
Use status codes 400, 401, 403, 404, 409, 410, 422, 429 appropriately. Never return recipient identity in validate-draw or organizer endpoints.

## UI screens (Thai, mobile-first)
Organizer:
1. Login / Signup
2. Event Dashboard — event cards, status, create button
3. Create/Edit Event — name/date/budget/description
4. Participant Manager — list, add/edit/delete, organizer added as normal participant
5. Excluded Pairs — 2 dropdowns, add/remove, duplicate/self validation, explanatory text, feasibility warning
6. Invitation Manager — individual copy-link controls and shared-via-LINE guidance; ensure each participant gets their own URL
7. Draw Confirmation — irreversible action warning, counts, readiness, validation, start button
8. Progress Dashboard — invited/visited/revealed, no pair results
Participant:
9. Invitation Landing — personal name and event details
10. Waiting for Draw — warm festive waiting state
11. Gift Reveal — interactive gift box, accessible button, tasteful animation
12. Reveal Result — large recipient name, event details, secret reminder; revisit same result
13. Error states — expired/revoked link, archived event, not found

Visual design: modern Christmas, forest green #164C3B, festive red #B83C43, cream #F7F2E8, champagne gold #C9A45C, dark pine #24312B. Use responsive cards, clear Thai typography (e.g. IBM Plex Sans Thai), keyboard accessibility, focus states, loading/empty/error states, reduced motion. Avoid generic dashboard clutter. All controls must be functional, not decorative.

## Testing and acceptance
- Unit tests for 2,3,7,100 participants; no self-matches, no duplicate receivers, every giver assigned; exclusions symmetric; multiple exclusions per participant; impossible graph; dense exclusion cases.
- Test participant names normalized and duplicate names rejected; cross-room exclusion rejected; reverse-order duplicates rejected.
- Integration tests for draw transaction atomicity, repeated draw 409, concurrent draw requests exactly one successful, no partial assignments.
- Authorization tests: organizer cannot access other organizer's room; participant A cannot access B's assignment; participant cannot access organizer API; no assignment leaks in organizer status API.
- Token tests: expired/revoked tokens, session expiry, repeated redemption, no raw tokens stored, session cookie attributes.
- E2E: organizer creates event, adds 7 participants including self, excludes A/B and C/D, issues links, starts draw, participant reveals, returns and sees identical result, organizer sees progress only.
- Mobile viewport tests, accessibility checks, build, lint, typecheck.
- Do not claim tests passed unless actually executed; report failures and limitations.

## Execution plan
Phase 1: Inspect repository, produce concise implementation plan and decisions; setup stack, env, auth, Prisma schema/migrations, design tokens.
Phase 2: Organizer auth, room CRUD, participant CRUD, excluded-pair management and validation.
Phase 3: Invitations, secure participant session, LINE copy-link flow.
Phase 4: Constrained matching algorithm, feasibility checker, transactional draw, robust tests.
Phase 5: Participant waiting/reveal/result UI and organizer progress UI.
Phase 6: Integration/E2E/security/accessibility testing, documentation and deployment configuration.

For each phase: implement, run relevant checks, summarize changed files, tests executed, open issues, and the next phase. Prefer incremental, reviewable commits if repository workflow permits. Do not silently skip security, migrations, or tests. If the repository is empty, scaffold it. If it has existing code, preserve conventions and avoid unrelated refactors.

## Important implementation notes
- Keep all actual recipient assignments server-only. No endpoint returning the full matching to organizers.
- Organizer must be included explicitly as a participant, not implicitly added twice.
- Invitation issuance and regeneration should not silently invalidate active users; communicate behavior in UI. If regeneration is after draw, keep assignment fixed.
- `GET /api/me/assignment` must not reveal a recipient before POST /api/me/reveal if the product uses a deliberate reveal step.
- Mark COMPLETED only after all participants revealed, transactionally or with a safe derived status; status changes must not alter assignments.
- Use Asia/Bangkok only for display/entry interpretation; store timestamps in UTC.
- Treat archive policy consistently and test it.

Begin by inspecting the repository and proposing the exact files and migration plan for Phase 1. Then implement Phase 1; do not implement all phases in one unreviewable change.
