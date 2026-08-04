# S4 Deployment Spike Decision Record (2026-08-04)

Track: `apk_multiplayer_platform_capability_20260804`. Story: S4, plan.md
lines 97-114. This is a decision record, not an implementation. No code, build,
or deploy was run for this spike; all evidence is read-only.

## Question

Decide the runtime host for the multiplayer session service - a long-lived
socket process speaking `multiplayer.v1` over socket.io - and whether it can
operate multi-instance with room affinity or shared state. Record why.

## Constraints inherited (cited, not relitigated)

- Decision 6, spec.md:179-200: a room IS the class group a teacher runs in
  Lesson plan mode; membership is roster-gated on "the enrollment/entitlement
  check the live lesson service already performs"; no outsiders; a code is not
  an access credential.
- Decision 8, spec.md:206-208: standalone deployable, NOT a Next.js custom
  server.
- Decision 5, spec.md:176-177: the server does not trust client scores; the
  session service recomputes from submissions.
- S3 deliverable is frozen: `packages/advantage-play-kit/src/systems/multiplayer-session.ts`
  is transport-agnostic (`createMultiplayerSession({ transport, scheduler })`),
  per plan.md:82-85 and the S3 receipt `s3-capability-pin-receipt-20260804.md`.
- `multiplayer.v1` is frozen in `packages/game-contracts/src/multiplayer.ts`;
  `submissionSchema` (lines 87-94) carries no `score` field, and
  `joinRoomSchema` (lines 59-61) carries only `{ roomCode, displayName }`.

## Evidence gathered

### House deployment pattern (this monorepo)

One Cloud Run service per app, each with its own Dockerfile and
`cloudbuild.yaml`, shared Cloud SQL instance
`reading-advantage:asia-southeast1:cloud-sql`, Secret Manager for secrets,
Artifact Registry for images, runtime service account per app. Codified in
`.agents/skills/gcp-cloud-run-monorepo-deploy/SKILL.md` and
`docs/deployment/gcp-cloud-run-monorepo-deployment.md`, with
`apps/codecamp-advantage` as the worked example. The codecamp
`cloudbuild.yaml` runs `--min-instances=1 --max-instances=100 --concurrency=80`
(lines 54-56) on Cloud Run.

A standalone non-Next.js service already exists in this monorepo:
`services/worker`. Its `Dockerfile` (node:22-alpine, two-stage, pnpm deploy to
`/opt/worker`, non-root user, `HEALTHCHECK` on `/livez`, `EXPOSE 8080`,
`CMD ["node","dist/main.js"]`) is the in-repo precedent for a long-lived Node
process. Its `main.ts` owns SIGTERM drain and a readiness server. The worker
has no `cloudbuild.yaml` of its own, so a session service would be the first
standalone service here to take the full Cloud Run deploy pipeline; the shape
is established, the wiring is not.

### Realtime precedent (sibling checkout)

`services/learning-service` in `/home/daniel-bo/Desktop/tutor-advantage` is the
one deployed socket.io service both repos can see. Per
`s0-protocol-harvest-20260804.md:56-72` and direct read of
`services/learning-service/src/websockets/lessonHandler.ts`:

- Transport: socket.io 4.8 (`lessonHandler.ts:2`).
- Auth: `io.use` middleware verifies a JWT before the connection is accepted
  (`lessonHandler.ts:49-61`).
- Identity: `socket.data.actor = { userId, role }` from verified claims
  (`lessonHandler.ts:56`).
- Join gate: `prisma.enrollment.findFirst({ where: { classId, studentUserId,
  status: "ACTIVE" } })`, then a package/cycle access check
  (`lessonHandler.ts:230-273`).
- Host ownership: `prisma.class.findFirst({ where: { classId, tutorUserId } })`
  (`lessonHandler.ts:85-100`).
- Room state: `private sessions: Map<string, LessonSession>` in one process
  (`LessonSessionService.ts:137`, cited in harvest line 69).
- Container: `services/learning-service/Dockerfile`, two-stage node:20-slim,
  `EXPOSE 8080`, `CMD ["node", "services/learning-service/dist/index.js"]`
  (lines 70-73).

The harvest is explicit that this is a deployment precedent and NOT a
multi-instance precedent: "no socket.io Redis adapter, no sticky-session
configuration, and no room-affinity handling anywhere in the checkout"
(harvest lines 127-136). S4 must not cite it as evidence that process-local
room state is acceptable.

### Identity surface S4 must bind to

`packages/auth/src/index.ts` exports `createSession`, `validateSession`,
`deleteSession` (from `session.ts`, where `validateSession` checks a sha256
token against the `sessions` table - `session.ts:39-41`), `assertTenantAccess`
and `UserContext`/`AuthContext` (from `tenant.ts`), `assertCan`/`AuthError`
(from `assert.ts`). The plan task at plan.md:110 is explicit: "Authenticate
connections against Accounts-issued identity through `packages/auth`."
Accounts is `apps/accounts`, the OIDC issuer
(`COMPANY_AUTH_ISSUER_URL=https://accounts.reading-advantage.com` in
`apps/accounts/cloudbuild.yaml:69`).

The sibling learning-service does NOT use `packages/auth` or Accounts. Its
identity comes from `getJwtSecret` in `@tutor-advantage/shared-config` and
`verifySocketActor` in `lessonAuthorization.ts` (harvest line 61,
lessonHandler.ts:1,56). This is a different identity authority.

### Roster data ownership

This monorepo owns classroom tables in Drizzle: `classrooms` is FLAT
(`packages/domain/src/tenant-registry.ts:95`, has `schoolId`), and
`classroomStudents`/`classroomTeachers` are REFERENTIAL (lines 200, 280-281,
scoped via owner FK, no `schoolId` - accessed through `tenantDb.unscoped()`).
The sibling owns `prisma.enrollment` and `prisma.class` in a Prisma schema in
a different database. Decision 6, spec.md:186-188, words the roster gate as
"the enrollment/entitlement check the live lesson service already performs" -
i.e., the sibling's enrollment. Whether this monorepo's
`classroomStudents`/`classrooms` grouping and the sibling's
`enrollment`/`class` grouping are the same class-grouping is not established
by any artifact in the track. This is the load-bearing ambiguity of the host
decision and is recorded as Risk R-1.

## Decision 1 - Host

**Recommendation: (b) a new `services/session-service` in THIS monorepo.**

Runner-up: (a) extend the sibling's `services/learning-service`.

Reasoning, in priority order:

1. Identity authority is decisive. The plan binds connections to
   Accounts-issued identity through `packages/auth`
   (plan.md:110; `packages/auth/src/index.ts` exports; `apps/accounts` is the
   OIDC issuer per `apps/accounts/cloudbuild.yaml:69`). The sibling
   authenticates against `@tutor-advantage/shared-config`'s `getJwtSecret`
   (`lessonHandler.ts:1,56`). These are different issuers. Extending the
   sibling would require either porting Accounts/OIDC into a different repo or
   running two identity authorities for one capability - both violate the
   single-source identity rule in AGENTS.md ("Authentication vs Authorization")
   and the plan's explicit binding. Judgment call: this single fact is enough
   to settle the host; the rest are corroboration.

2. The capability is a platform capability of THIS monorepo's Play Kit. S1's
   contract (`packages/game-contracts/src/multiplayer.ts`), S3's session
   (`packages/advantage-play-kit/src/systems/multiplayer-session.ts`), and S5's
   adopter (`apps/advantage-games` Wizard vs Zombie) all live here and all
   iterate on `multiplayer.v1`. A session service in the sibling puts every
   contract change across a repo boundary and outside this monorepo's Drizzle/
   `@reading-advantage/*` dependency graph (the sibling is Prisma +
   `@tutor-advantage/*`).

3. The house deployment pattern is for THIS monorepo. `services/worker` is the
   in-repo precedent for a standalone Node service (`services/worker/Dockerfile`,
   `services/worker/src/main.ts` drain/readiness shape); `apps/codecamp-advantage`
   is the worked Cloud Run + Cloud Build + Artifact Registry + Secret Manager
   example. A `services/session-service` fits both without inventing a shape.

4. Decision 8 is satisfied: a standalone service is not a Next custom server.

**Kill criterion for the recommendation:** if the class roster that decision 6
binds to is authoritatively owned ONLY by the sibling's `prisma.enrollment`,
AND this monorepo's `classroomStudents`/`classrooms` is a non-equivalent
grouping, AND the sibling exposes no entitlement-check endpoint, then a
session service in this monorepo cannot perform the join-time roster gate
without a cross-database dependency that violates tenant isolation - and the
recommendation flips to (a). Falsifiable by diffing the two schemas and
confirming whether a `classId` in one resolves to a row in the other; see
Risk R-1.

## Decision 2 - Platform and multi-instance

**Platform: GCP Cloud Run, per the house pattern** (one service, own Dockerfile
+ `cloudbuild.yaml`, shared Cloud SQL via Unix socket, Secret Manager, runtime
service account; `apps/codecamp-advantage/cloudbuild.yaml` and the
`gcp-cloud-run-monorepo-deploy` skill). Cloud Run supports WebSocket
connections on the managed platform; the sibling's containerized socket.io
service is the existence proof that a long-lived socket process runs in this
deployment family. `--min-instances=1` is required (mirroring
`apps/codecamp-advantage/cloudbuild.yaml:54`) so the service does not
scale to zero and drop every room on idle.

**Multi-instance strategy: shared state, NOT sticky sessions.**

Reasoning:

- The plan demands "room recovery after a simulated instance loss"
  (plan.md:105). Sticky sessions / room affinity pin a room to one instance;
  killing that instance loses the room. Sticky sessions alone therefore FAIL
  the plan's own test. Cloud Run session affinity is cookie-based and is
  explicitly not a durability mechanism.
- The harvest forbids citing the sibling's single-instance process-local `Map`
  as acceptable (harvest lines 132-136) and ties it to the same defect the
  audit charged against `getGlobalRoomManager()` (audit M-1, `s0-audit-20260804.md:41`;
  M-4, lines 74-80).

Concrete shape for S4 (race tier only; shared-world is S6):

- `@socket.io/redis-adapter` for cross-instance broadcast and socket.io room
  membership. This is the standard socket.io multi-instance mechanism and is
  transport-internal, not business logic.
- Room state (session, players, submissions, server-computed scores, round
  phase) in a shared store. For the race tier, state changes on discrete
  events (join/leave/submit/round_start/round_end), not per-tick - M-7's
  20 Hz full-state broadcast (`s0-audit-20260804.md:102-107`) is explicitly
  NOT promoted. Discrete-event writes make Postgres viable as the durable,
  tenant-scoped store (Drizzle, `schoolId`-bound per AGENTS.md multi-tenancy),
  with Redis for ephemeral presence if needed. Provider choice (Redis vs
  Valkey vs MemoryStore) is an adapter decision and is out of scope for this
  spike.

**Multi-instance test the plan demands, scoped to this choice:**

1. Run two instances of `services/session-service` (Cloud Run `--max-instances=2`,
   or two local containers sharing one Redis and one Postgres).
2. Force a teacher onto instance-A and a student onto instance-B for the same
   room (force via distinct connection endpoints or by disabling affinity).
3. Run a full race round - lobby, countdown, playing, submissions, round_end -
   and assert both clients see identical server-computed ranking.
4. Kill instance-A. Assert: the student on instance-B still sees the room and
   its state; the teacher reconnects to instance-B and re-enters as host
   without a rejoin (identity-keyed reconnect, harvest item 11); the room's
   scores and round phase are intact (recovered from the shared store, not
   from instance-A memory).
5. Pass criterion: steps 3-4 succeed. Failure of step 4 specifically means the
   state store is not actually shared and the strategy is wrong.

**Kill criterion for the multi-instance recommendation:** if the race-tier
discrete-event write rate saturates the shared Cloud SQL instance at projected
peak room concurrency, the durable-Postgres path dies and hot room state moves
to Redis-with-persistence (AOF) instead, with Postgres retaining only the
durable result/roster rows. Falsifiable by a load test of N concurrent rooms
each emitting join/submit events at projected peak against one Cloud SQL
instance; pass if p99 write latency stays inside the session responsiveness
budget. Judgment call: this load test belongs in S4 implementation, not in
this spike.

## Decision 3 - Roster and identity integration

Mirror the harvest's `io.use` middleware pattern
(`lessonHandler.ts:49-61`), adapted to `packages/auth` and Accounts.

**Connection lifecycle (identity):**

- In `io.use((socket, next) => ...)`, verify the Accounts-issued token. For an
  OIDC JWT from `apps/accounts`, verify signature/audience/issuer against
  Accounts config; for a session cookie, call `validateSession(db, token)`
  (`packages/auth/src/session.ts`). On failure, `next(new Error(...))` exactly
  as the sibling does (`lessonHandler.ts:59`).
- On success, set `socket.data.actor = { userId, role, schoolId }` from
  verified claims. `schoolId` and `userId` come from `packages/auth`'s
  `UserContext`/`AuthContext` (`packages/auth/src/index.ts`, `tenant.ts`); the
  client never asserts either (harvest item 8; `joinRoomSchema` carries only
  `roomCode` and `displayName`, `multiplayer.ts:59-61`).

**Join-time entitlement (roster gate), at the `join_room` handler:**

- Resolve `roomCode` to a class-group identifier (decision 6: the room IS the
  class group; `roomCode` is opaque per spec.md:197-200).
- Teacher (host): assert ownership of the class - mirror
  `lessonHandler.ts:85-100` (`prisma.class.findFirst({ where: { classId,
  tutorUserId } })`), expressed against this monorepo's `classrooms`/`classroomTeachers`
  via Drizzle, scoped by `schoolId`.
- Student (player): assert ACTIVE roster membership - mirror
  `lessonHandler.ts:230-238` (`prisma.enrollment.findFirst({ where: { classId,
  studentUserId, status: "ACTIVE" } })`), expressed against
  `classroomStudents` (REFERENTIAL; access via `tenantDb.unscoped()` per
  `tenant-registry.ts:200,280`), with `schoolId` enforced through the owner-FK
  chain.
- Cross-tenant join refused: every query scoped by `schoolId`
  (AGENTS.md multi-tenancy; plan.md:111). The plan's cross-tenant test is the
  pass gate.
- If R-1 resolves that the authoritative roster is the sibling's, this gate
  calls a roster/entitlement endpoint on the sibling rather than querying
  Drizzle directly. Either way the gate runs at `join_room`, in the service
  boundary, not in message shape (spec.md:197-200).

**Where the logic lives:** the socket handler is a thin transport adapter. The
entitlement query and the room-state commands are a backend module under
`packages/backend/modules/multiplayer` (per AGENTS.md backend-as-code), called
from the handler. `packages/auth` (`assertCan`, `assertTenantAccess`) is the
authorization surface; `@reading-advantage/db` is the data surface. The
handler does not embed SQL.

## Decision 4 - Scoring placement

Decision 5 (spec.md:176-177) lands server-side in the backend module, not in
the socket handler and not in the client.

- The client sends `submission` messages only. `submissionSchema`
  (`multiplayer.ts:87-94`) carries `{ roundId, answer, clientTimestampMs }` and
  NO `score` - the frozen contract already enforces decision 5 at the wire.
- The handler validates the message against the schema, then forwards to the
  backend module. The module derives correctness against the round's
  `targetSequence`/`currentWords`, accumulates the per-player score, and emits
  `round_end`/`game_over` with server-computed `rankingEntrySchema`
  (`multiplayer.ts:28-35, 78-85`).
- Forged-client-score test (plan.md:108): a client that attempts to send a
  `score` field is rejected by the schema (strict object - extra keys throw);
  a client that submits a wrong answer cannot move the ranking because the
  ranking is server-derived. This is the literal pass criterion.
- Results flow to the existing completion path (decision 7, spec.md:202-204):
  the backend module emits through `packages/advantage-play-kit/src/systems/single-completion.ts`
  and `result-accounting.ts` (plan.md:151-152). No side channel; the session
  service is not a result store.

For S6's shared-world tier, the per-tick authoritative simulation advances the
S2 deterministic reducer at the session tick rate and broadcasts
`world_snapshot` on the reserved kinds (`multiplayer.ts:104-110`). That
simulation's state store is S6's spike, not S4's; S4 only establishes the
substrate (container, multi-instance, identity, roster gate) the simulation
will run on.

## Risks (top 3, each falsifiable)

**R-1 (High) - Roster data ownership is ambiguous.** Decision 6
(spec.md:186-188) words the gate as "the enrollment/entitlement check the live
lesson service already performs," which is the sibling's `prisma.enrollment`
(`lessonHandler.ts:230-238`). This monorepo's `classroomStudents`/`classrooms`
(`tenant-registry.ts:95,200,280`) may or may not be the same grouping. If they
are not equivalent and the sibling exposes no entitlement endpoint, the host
recommendation (b) dies by its own kill criterion. Check: diff the sibling's
Prisma `class`/`enrollment` schema against this monorepo's Drizzle
`classrooms`/`classroomStudents` schema and confirm whether a `classId` in one
resolves to a row in the other. Resolve before S4 implementation begins; it
blocks the roster gate's data path.

**R-2 (Medium) - Cloud Run WebSocket lifecycle.** Cloud Run has a request
timeout and scales instances down on idle; a long-lived socket.io connection
can be terminated at the timeout boundary, and scale-to-zero drops every room.
Reconnect must be a state (harvest item 11), and `--min-instances=1` is
mandatory. Check: hold a socket.io connection against a Cloud Run service
past the 60-minute request timeout and assert reconnect restores the player
without a rejoin; assert `--min-instances=1` is set in the session-service
`cloudbuild.yaml`. If the timeout is below a lesson length, a heartbeat/refresh
mechanism is required.

**R-3 (Medium) - Postgres-as-room-store write contention.** If room state is
in Postgres and multiple instances write the same room on discrete events, the
room-state row can serialize. Check: load test N concurrent rooms each
emitting join/submit events at projected peak against one Cloud SQL instance;
assert p99 write latency stays inside the session responsiveness budget. If it
fails, hot state moves to Redis-with-persistence and Postgres keeps only
durable result/roster rows (the multi-instance kill criterion above).

## Out of scope

- The shared-world tier's authoritative simulation: tick rate, snapshot
  cadence, client prediction/reconciliation, and the simulation-specific state
  store. S6's spike; S4 only provides the substrate.
- The Redis/Valkey/MemoryStore provider choice. S4 picks the socket.io Redis
  adapter contract; the provider is an adapter decision (AGENTS.md provider
  neutrality).
- Merging the lesson session and the multiplayer session into one process, or
  migrating the sibling learning-service into this monorepo. Separate platform
  decisions outside this track.
- The second adopting cartridge (S6) and any non-Wizard-vs-Zombie adopter.
- Anonymous matchmaking, voice/text chat, spectator mode (spec.md:299-305).

## Contradictions surfaced (not smoothed over)

1. **The harvest's "settle before S3" question was not settled before S3.**
   `s0-protocol-harvest-20260804.md:165-171` flags "Whether the Play Kit
   capability should speak to the lesson session rather than reimplement it"
   as worth settling before S3. S3 shipped (checkpoint 90da767, plan.md:76-95)
   as a transport-agnostic session that does NOT speak to the lesson session -
   it reimplements the lifecycle against `multiplayer.v1`. Decision 6 (ruled
   2026-08-04) retroactively settled the binding MODEL (roster-gated, not open
   lobbies) but did not settle the PROCESS question. This spike's host
   decision (b) is the delayed settlement: the session service runs as a
   standalone service in this monorepo and treats the lesson service as a
   roster/entitlement SOURCE, not as the host. S3 did not need to change
   because it is transport-agnostic by design, but the track should record
   that S3 proceeded on the reimplement path before the process question was
   resolved.

2. **`metadata.json:11` states a known-false premise.** The deviation_notes
   still say "Tutor Advantage runs a production race mode against an
   implementation that is not in this repository ... it wins ties on race
   semantics." The harvest (`s0-protocol-harvest-20260804.md:13-36`)
   established that the race protocol is orphaned there exactly as it is here,
   and decision 3 was amended (spec.md:146-169) to scope itself away from race
   semantics. `metadata.json` predates the harvest and was not updated. Not
   touched by this spike (out of file scope); flagged for a track-metadata
   correction.

3. **`index.md` states "no phase is started."** `index.md:3-4` says "no phase
   is started and no capability id, protocol, or deployment decision is
   accepted yet." `plan.md` shows S0, S1, S2, S3 all checkpointed complete
   (0724fd7, e1a7ee5, d027b6f, 90da767), and
   `s3-capability-pin-receipt-20260804.md` records the `capability:multiplayer`
   id as accepted (seven -> eight). The index is stale relative to the plan.
   Not touched by this spike; flagged for a track-index correction.
