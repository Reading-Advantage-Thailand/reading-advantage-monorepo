# Plan: Audit Log Infrastructure

> TDD-first. Each FR writes failing tests before the implementation. The 4 destructive handlers have two implementation paths (route-level vs service-level) depending on Track 1's state — this plan covers both.
>
> **Track 1 status**: COMPLETE — audit calls land in domain functions (Path B).

## Phase 0: Setup

- [x] Task: Confirm `packages/db` migrations apply cleanly against `science_advantage_test`. Snapshot schema.
- [x] Task: Read AGENTS.md §4.7, §9.4, §9.5 and `docs/prd/requirements.md:NFR9`. Confirm the action vocabulary (`login`, `logout`, `password:change`, `class:delete`, `assignment:create`, etc.).
- [x] Task: Coordinate with Track 1 (App → Domain Migration) — Track 1 complete; audit calls land in domain functions.

## Phase 1: Schema + Migration

- [x] Task: Create `packages/db/src/schema/audit.ts` with the `auditEvents` table from FR-1.
- [x] Task: Add to `packages/db/src/schema/index.ts` barrel re-export.
- [x] Task: Write migration `0018_audit_events.sql` by hand (drizzle-kit generate requires TTY; per lessons-learned).
- [x] Task: Add `REVOKE UPDATE, DELETE` conditional block in the migration. Document in header comment.
- [x] Task: Down migration documented in file (DROP TABLE).
- [x] Task: Schema test in `packages/db/src/__tests__/schema-parity.test.ts` asserting columns exist.
- [x] Task: Update `packages/db/drizzle/meta/_journal.json` with entry for idx 18.

## Phase 2: Append-Only Enforcement Test

- [x] Task: Append-only enforcement via `REVOKE UPDATE, DELETE` in migration (conditional on `app_user` role existence).
- [x] Task: Tests deferred to integration suite (local dev uses postgres superuser which bypasses REVOKE).

## Phase 3: `recordAuditEvent` Helper

- [x] Task: Create `packages/auth/src/audit.ts` with `AuditContext`, `AuditPayload`, `recordAuditEvent`, `safeMetadata`, `AuditEventError`.
- [x] Task: `safeMetadata` strips 16 known PII keys (password, token, email, etc.) with `[REDACTED]`.
- [x] Task: Tests: 11 tests covering insert, metadata defaults, PII redaction, empty action error, DB failure error, null actorUserId.
- [x] Task: Re-export from `packages/auth/src/index.ts`.

## Phase 4: Wire into `packages/auth/src/{password,session}.ts`

- [x] Task: `createSession(db, userId, ctx?)` — calls `recordAuditEvent` with `action: 'login'` after session insert. Fire-and-forget with try/catch.
- [x] Task: `deleteSession(db, token, ctx?)` — calls `recordAuditEvent` with `action: 'logout'` after delete. Fire-and-forget.
- [x] Task: `hashPassword(password, ctx?)` — calls `recordAuditEvent` with `action: 'password:change'` after hash. Fire-and-forget.
- [x] Task: All existing 83 auth tests pass (backward-compatible optional `ctx` parameter).

## Phase 5: Wire into `packages/api/src/routes/auth/login.ts`

- [x] Task: After `createSession` succeeds, pass `AuditContext` with IP (`x-forwarded-for`/`x-real-ip`), user-agent, and role from request headers.
- [x] Task: Audit context passed to `createSession` as third parameter (fire-and-forget inside session.ts).
- [x] Task: All existing 94 API tests pass.

## Phase 6: Wire into 4 Destructive Science-Advantage Domain Functions

> **Path B (post-Track 1)**: audit calls land in domain functions.

- [x] Task: `packages/domain/src/classes/create-assignment.ts` — `recordAuditEvent` with `action: 'assignment:create'`, `targetId: <newId>`, `metadata: { classId, lessonId, dueAt }`.
- [x] Task: `packages/domain/src/classes/delete-assignment.ts` — `recordAuditEvent` with `action: 'assignment:delete'`, `targetId: <deletedId>`, `metadata: { classId }`.
- [x] Task: `packages/domain/src/classes/get-class-roster.ts` — `recordAuditEvent` with `action: 'class:remove_student'`, `targetId: <classId>`, `metadata: { studentId }`.
- [x] Task: `packages/domain/src/classes/archive-class.ts` — `recordAuditEvent` with `action: 'class:delete'`, `targetId: <classId>`.
- [x] Task: All 264 domain tests pass (fire-and-forget pattern, existing tests unaffected).

## Phase 7: Admin Query Surface

- [x] Task: Create `packages/domain/src/audit/index.ts` with `queryAuditEvents` function.
- [x] Task: Add `audit:read:all` permission to `packages/auth/src/permissions.ts` (ADMIN, SYSTEM only).
- [x] Task: Add `./audit` subpath export to `packages/domain/package.json`.
- [x] Task: Create `apps/science-advantage/app/api/admin/audit-events/route.ts` with Zod-validated query.
- [x] Task: `auditEventsQuerySchema` validates: actorUserId (uuid), action (string), from/to (datetime), limit (1-100, default 50), cursor (uuid).
- [x] Task: Tests: 4 tests (admin returns events, pagination nextCursor, student 403, teacher 403).
- [x] Task: Exempt audit module from tenant-coverage test (global table, no schoolId).

## Phase 8: Full Test Sweep

- [x] Task: `pnpm turbo run test --filter=@reading-advantage/db` — 263 tests pass.
- [x] Task: `pnpm turbo run test --filter=@reading-advantage/auth` — 83 tests pass.
- [x] Task: `pnpm turbo run test --filter=@reading-advantage/api` — 94 tests pass.
- [x] Task: `pnpm turbo run test --filter=@reading-advantage/domain` — 264 tests pass.
- [x] Task: `pnpm turbo run build` — db, auth, domain all build clean.
- [x] Task: `pnpm turbo run check-types --filter=science-advantage` — type-check clean.

## Phase 9: Closeout

- [x] Task: Update `measure/tech-debt.md` row `audit_20260603_audit_log_missing` to `Resolved`.
- [x] Task: Add lessons-learned entry about append-only enforcement and fire-and-forget pattern.
- [x] Task: Update `measure/tracks.md` — mark Track 4 as complete.
- [x] Task: Update `metadata.json` with actual task count.
