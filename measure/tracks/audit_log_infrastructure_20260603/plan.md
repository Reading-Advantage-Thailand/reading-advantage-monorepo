# Plan: Audit Log Infrastructure

> TDD-first. Each FR writes failing tests before the implementation. The 4 destructive handlers have two implementation paths (route-level vs service-level) depending on Track 1's state — this plan covers both.

## Phase 0: Setup

- [ ] Task: Confirm `packages/db` migrations apply cleanly against `science_advantage_test`. Snapshot schema.
- [ ] Task: Read AGENTS.md §4.7, §9.4, §9.5 and `docs/prd/requirements.md:NFR9`. Confirm the action vocabulary (`login`, `logout`, `password:change`, `class:delete`, `assignment:create`, etc.).
- [ ] Task: Coordinate with Track 1 (App → Domain Migration) — the audit calls may land in route handlers OR in domain functions, depending on which phase of Track 1 is complete.

## Phase 1: Schema + Migration

- [ ] Task: Create `packages/db/src/schema/audit.ts` with the `auditEvents` table from FR-1.
- [ ] Task: Add to `packages/db/src/schema/index.ts` barrel re-export.
- [ ] Task: Generate the Drizzle migration: `pnpm --filter @reading-advantage/db drizzle-kit generate`. Inspect the generated SQL.
- [ ] Task: Edit the migration to add the `REVOKE UPDATE, DELETE ON audit_events FROM <app_role>;` statement. Document in a header comment.
- [ ] Task: Add a down migration (drops the table).
- [ ] Task: Apply migration to `science_advantage_test`. Confirm table exists with correct columns + indexes.
- [ ] Task: Write a schema test in `packages/db/src/__tests__/schema-parity.test.ts` asserting the columns + indexes exist.

## Phase 2: Append-Only Enforcement Test

- [ ] Task: Write failing test: as the app role, `UPDATE audit_events SET action = 'tampered' WHERE id = ...` raises a Postgres permission error.
- [ ] Task: Write failing test: as the app role, `DELETE FROM audit_events WHERE id = ...` raises a Postgres permission error.
- [ ] Task: Write failing test: as a `test_role` (granted DELETE), `DELETE FROM audit_events WHERE id = ...` succeeds (test cleanup pattern is preserved).
- [ ] Task: Confirm tests pass.

## Phase 3: `recordAuditEvent` Helper

- [ ] Task: Create `packages/auth/src/audit.ts` with `AuditContext`, `AuditPayload`, and `recordAuditEvent` (FR-3).
- [ ] Task: Add a `safeMetadata(obj)` helper that strips `password`, `email`, `phone`, `ssn`, `token`, `apiKey`, `secret`. Document the safe-keys list in JSDoc.
- [ ] Task: Write failing tests:
  - `recordAuditEvent({ actorUserId: 'u1', ... }, { action: 'login' })` → row exists in `audit_events`.
  - `recordAuditEvent(ctx, { action: 'class:delete', targetType: 'class', targetId: 'c1' })` → row has the right `targetType`/`targetId`.
  - `recordAuditEvent(ctx, { action: 'login', metadata: { password: 'plain' } })` → row has `metadata: {}` (password redacted).
  - `recordAuditEvent` failure (e.g. null `action`) throws `AuditEventError`.
- [ ] Task: Implement. Confirm tests pass.
- [ ] Task: Re-export `recordAuditEvent` from `packages/auth/src/index.ts`.

## Phase 4: Wire into `packages/auth/src/{password,session}.ts`

- [ ] Task: Modify `createSession(userId, ctx)` to call `recordAuditEvent({ actorUserId: userId, actorRole: ctx.role, ipAddress: ctx.ip, userAgent: ctx.ua }, { action: 'login', targetType: 'user', targetId: userId, metadata: { sessionId } })`.
- [ ] Task: Add an overload for `createSession` that accepts `ctx` (existing call sites that do not pass `ctx` continue to work — `ipAddress`/`userAgent` are nullable).
- [ ] Task: Modify `deleteSession(sessionId, ctx)` similarly with `action: 'logout'`.
- [ ] Task: Modify `hashPassword(plain, ctx)` to call `recordAuditEvent` with `action: 'password:change'`.
- [ ] Task: Write failing integration tests:
  - Call `createSession` with `ctx` → audit row with `action='login'` exists.
  - Call `deleteSession` with `ctx` → audit row with `action='logout'` exists.
  - Call `hashPassword` with `ctx` → audit row with `action='password:change'` exists.
- [ ] Task: Confirm tests pass.

## Phase 5: Wire into `packages/api/src/routes/auth/login.ts`

- [ ] Task: After `createSession` succeeds, call `recordAuditEvent` with the user's IP, user-agent, role, and `metadata: { sessionId }`.
- [ ] Task: Wrap in try/catch — failure logs but does not block the login.
- [ ] Task: Write failing integration test: log in as a test user → audit row with `action='login'`, `actorUserId=<user>`, `ipAddress=<test>`, `userAgent=<test>`, `metadata.sessionId=<newSessionId>` exists.
- [ ] Task: Confirm.

## Phase 6: Wire into 4 Destructive Science-Advantage Handlers

> **Path A (pre-Track 1)**: audit calls land in the route handlers.
> **Path B (post-Track 1)**: audit calls land in the new domain functions.
>
> Pick the path that matches the Track 1 state. The plan below covers Path A; Path B is identical except the `recordAuditEvent` call moves from `app/api/...` to `packages/domain/src/<module>/<verb>.ts`.

- [ ] Task: `app/api/classes/[classId]/assignments/route.ts:POST` — after the assignment insert, call `recordAuditEvent({ actorUserId, actorRole, ipAddress, userAgent }, { action: 'assignment:create', targetType: 'assignment', targetId: <newId>, metadata: { lessonId, dueAt } })`. Use `safeMetadata` to redact.
- [ ] Task: `app/api/classes/[classId]/assignments/route.ts:DELETE` — after the delete, call `recordAuditEvent` with `action: 'assignment:delete'`, `targetId: <deletedId>`.
- [ ] Task: `app/api/classes/[classId]/roster/route.ts:DELETE` — after the remove, call `recordAuditEvent` with `action: 'class:remove_student'`, `targetType: 'class'`, `targetId: <classId>`, `metadata: { studentId }`.
- [ ] Task: `app/api/classes/[classId]/route.ts:DELETE` — after the class delete, call `recordAuditEvent` with `action: 'class:delete'`, `targetId: <classId>`.
- [ ] Task: For each handler, write a failing integration test: trigger the handler → audit row exists with the expected `action`/`targetType`/`targetId`/`metadata`.
- [ ] Task: Confirm all 4 handler tests pass.

## Phase 7: Admin Query Surface

- [ ] Task: Create `app/api/admin/audit-events/route.ts` (or a new `packages/api/src/routes/admin/audit-events.ts` if Track 1 has centralized the admin surface).
- [ ] Task: Add a Zod schema for the query: `auditEventsQuerySchema = z.object({ actorUserId: z.string().uuid().optional(), action: z.string().optional(), from: z.string().datetime().optional(), to: z.string().datetime().optional(), limit: z.number().int().min(1).max(100).default(50), cursor: z.string().uuid().optional() })`.
- [ ] Task: Implement the GET handler:
  - Validate query with Zod.
  - Gate via `requireRole('ADMIN')` (or `requirePermission('audit:read:all')` if Track 1 has landed).
  - Query `auditEvents` with filters; return `{ events, nextCursor }`.
- [ ] Task: Add a rate limit (60 req/min per admin user; use existing in-memory rate limiter).
- [ ] Task: Write failing integration tests:
  - As ADMIN, GET `/api/admin/audit-events?action=login` → returns the login events.
  - As ADMIN, GET `/api/admin/audit-events?actorUserId=<user>` → returns that user's events.
  - As ADMIN, GET `/api/admin/audit-events?from=...&to=...` → returns events in the time range.
  - As STUDENT, GET `/api/admin/audit-events` → 403.
- [ ] Task: Confirm.

## Phase 8: Full Test Sweep

- [ ] Task: `pnpm turbo run test --filter=@reading-advantage/db` — all schema + migration tests pass.
- [ ] Task: `pnpm turbo run test --filter=@reading-advantage/auth` — all auth tests + new audit tests pass.
- [ ] Task: `pnpm turbo run test --filter=science-advantage` — all science-advantage tests + new audit tests pass.
- [ ] Task: `pnpm turbo run build --filter=science-advantage` — clean build.
- [ ] Task: Confirm: append-only enforcement test (Phase 2) passes; PII-redaction test (Phase 3) passes; 6 destructive handler tests (Phase 6) pass; 4 admin query tests (Phase 7) pass.

## Phase 9: Closeout

- [ ] Task: Update `measure/tech-debt.md` row `audit_20260603_audit_log_missing` to `Resolved`.
- [ ] Task: Add a lessons-learned entry: "Append-only at the DB level (REVOKE UPDATE, DELETE) is the right enforcement — the application code can be audited, but a permission error from the DB is a hard guarantee."
- [ ] Task: Add a follow-up track placeholder in `measure/tracks.md` under Pending Tracks: "Audit Log Retention + DSAR Bulk Export (7-year FERPA, GDPR DSAR support)."
- [ ] Task: Move track to `measure/archive/audit_log_infrastructure_20260603/` and update `measure/tracks.md`.
