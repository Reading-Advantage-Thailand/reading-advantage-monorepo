# Specification: 72h Review Findings Remediation

> **Priority:** High. Remediation of all defects and quality issues discovered in the
> code-level review of the last 72 hours of commits (2026-06-21 → 06-24), spanning the
> `primary_advantage_drizzle_migration_20260526`, `sales_advantage_mvp_20260622`,
> `video_pipeline_20260613`, `post_24h_audit_remediation_20260612`, and
> `observability_stack_20260603` tracks.

## Overview

A full-coverage review of every code-bearing commit in the window surfaced one
authorization gap, two correctness bugs, an evaluation-grounding gap, and several
quality/reliability issues. The closed tracks themselves stay closed; this track
opens fresh remediation per the Measure "open a fresh track" rule. Each finding below
records where it was found and the evidence behind it.

## Functional Requirements

### Security

- **FR-1 (Critical): Enforce `sales:chat` authorization on the chat REST route.**
  `apps/sales-advantage/app/api/chat/route.ts` calls `validateSession` (authn) then
  `getAIClient().streamText(...)` directly, bypassing the domain layer. A domain
  mutation that calls `assertCan(user, "sales:chat", tenant)` already exists
  (`packages/domain/src/sales/mutations.ts:287`), but the route does not use it — so
  **any** authenticated user from **any** advantage app (shared `@reading-advantage/auth`
  session) can consume the AI coach. Route the chat handler through the domain layer (or
  add an explicit `assertCan`/role gate) so it enforces `sales:chat`.
  _Note: `roleplay-attempts` and `lesson-complete` routes are NOT affected — they call
  `submitRoleplayAttempt` / `markTheoryLessonComplete`, both of which `assertCan`
  (`mutations.ts:185`, `:41`). This FR is scoped to the chat route only._

### Correctness

- **FR-2 (High): Fix duplicate-row fan-out + count mismatch in migrated list queries.**
  `apps/primary-advantage/server/models/studentModel.ts` `getStudents` joins
  `classroomStudents`/`classrooms` with `leftJoin` and no `selectDistinct`/`groupBy`, so a
  student enrolled in N classrooms produces N rows; `.limit/.offset` paginate rows (not
  students) and the separate `totalCount` query omits those joins, so list length and
  count disagree. The Prisma original used `include` (nested arrays). Fix `getStudents`,
  and **audit the sibling migrated models** (`classroomModel.ts`, `teacherModel.ts`,
  `assignmentModel.ts`) for the same `include → flat leftJoin` fan-out pattern.

- **FR-3 (High): Await the transaction and fix lossy NOT-NULL fills in `new-generator.ts`.**
  `apps/primary-advantage/server/utils/genaretors/new-generator.ts:97` calls
  `db.transaction(...)` without `await` (fire-and-forget — errors become unhandled
  rejections and the caller returns as if persisted); the inner `Promise.all([...])`
  (line ~151) is also un-awaited. The `correctAnswer: ...indexOf(answer) >= 0 ? index : 0`
  fallback silently stores `0` ("first option correct") when option matching fails —
  persisting a wrong answer key. Await the transaction + inner work; on a failed
  `correctAnswer` match, fail/skip the row rather than persist a wrong key.

- **FR-4 (High): Supply grounding excerpts (and consistent storage state) to roleplay eval.**
  `apps/sales-advantage/app/api/roleplay-attempts/route.ts` passes `excerpts: []` to the
  evaluator, so every attempt is graded with **no canonical source material** despite the
  prompt instructing the model to "ground your feedback in these." Source the excerpts
  from the scenario/module curriculum. Also: the route persists `audioStorageKey: storageKey`
  even when the storage `put` failed (the catch only logs) — so the attempt row can
  reference a nonexistent object. Persist the key only on successful upload (or mark it
  absent). Remove the `as never` / `as unknown as` casts by aligning `SalesDomainContext`
  db typing and the `getScenario` return shape with the evaluator's expected inputs.

### Reliability / Quality

- **FR-5 (Medium): Attach error causes in `roleplay-evaluator.ts`.**
  `packages/domain/src/sales/roleplay-evaluator.ts` discards both `primaryError` and
  `fallbackError`; the thrown `SalesError("...","EVALUATION_FAILED")` carries no cause,
  making two-tier failures undebuggable. Log both and/or attach `{ cause }`.

- **FR-6 (Medium): De-duplicate the sales permission mapping.**
  `packages/domain/src/sales/permissions.ts` declares the same key→role mapping twice —
  the `SALES_PERMISSIONS` const and the `registerDomainModulePermissions({ keys: [...] })`
  call. They will drift. Derive the registration from the single source of truth.

- **FR-7 (Medium): Make the sales rate limiter durable (or document the limitation).**
  `apps/sales-advantage/lib/rate-limit.ts` is an in-memory single-process `Map`, so limits
  are ineffective across serverless/horizontally-scaled instances. Either back it with the
  shared durable limiter (cf. `rate_limiter_v2_20260603`) or explicitly document it as a
  best-effort soft guard and gate that decision.

- **FR-8 (Low): Harden chat input shape.**
  `apps/sales-advantage/app/api/chat/route.ts` concatenates raw `messages[].content` with a
  `"COACH:"` terminator (turn-spoofing / prompt-injection vector) and does not validate
  message shape (`content` may be `undefined` → `"REP: undefined"`). Validate `messages`
  with a Zod schema; sanitize/escape role markers.

## Non-Functional Requirements

- No behavioral regressions in the affected apps; each fix lands TDD (Red proof → Green).
- Type-check and existing test baselines for `primary-advantage`, `sales-advantage`,
  `packages/domain`, `packages/api` must not regress.

## Acceptance Criteria

- AC-1: An authenticated non-sales user receives 401/403 from `/api/chat` (FR-1).
- AC-2: `getStudents` returns one row per student with `totalCount` matching the distinct
  student count, verified with a multi-classroom-enrollment fixture (FR-2).
- AC-3: `new-generator.ts` awaits its transaction; a forced inner failure rejects the
  caller; no row persists a fabricated `correctAnswer` (FR-3).
- AC-4: Roleplay evaluation receives non-empty excerpts; the persisted attempt's storage
  key is present only when upload succeeded; no `as never` casts remain on the route (FR-4).
- AC-5: `EVALUATION_FAILED` carries the underlying cause(s) (FR-5).
- AC-6: Sales permission mapping has a single source of truth (FR-6).
- AC-7: Rate limiter is durable or its best-effort limitation is documented and approved (FR-7).
- AC-8: `/api/chat` rejects malformed `messages` payloads (FR-8).
- AC-9: A `lessons-learned.md` entry reinforces "never bend production code to satisfy a
  test's structural string assertion" (re the `920ff302`→`019b9d83` reset-password
  test-gaming that was caught and reverted in review).

## Out of Scope

- Reopening any archived/closed track; this is a fresh remediation track.
- Pre-existing `primary-advantage` Turbopack build baseline failure (tracked separately).
- New sales-advantage features beyond hardening the scaffolded surface.
- The FR-2 grep-gate lesson (already recorded in `lessons-learned.md` on 2026-06-23).
