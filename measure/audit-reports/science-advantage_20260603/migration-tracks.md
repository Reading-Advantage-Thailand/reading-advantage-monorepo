# Science-Advantage Audit — 12-Track Migration Plan

> **Audit target:** `apps/science-advantage/`
> **Audit date:** 2026-06-03
> **Companion artifacts:** `executive-summary.md`, `checklist.md`, `findings.md`
> **Source findings:** F-101, F-102, F-201, F-202, F-203, F-204, F-205, F-206, F-207, F-208, F-301, F-302, F-303, F-304, F-305, F-306, F-307, F-401, F-402, F-403, F-404, F-405, F-406, F-407, F-501, F-502, F-503, F-504, F-601, F-602, F-603, F-604, F-701, F-702, F-703, F-704, F-705, F-901, F-902, F-903, F-904, F-905, F-906, F-1001, F-1002, F-1003, F-1101, F-1102, F-1201, F-1202, F-1203, F-1204, F-1205, F-1206, F-1207, F-1301, F-1302, F-1303, F-1304, F-1305, F-1306

## Overview

This plan consolidates **45 finding IDs** (~38 unique issues) into **12 Measure tracks** ordered by priority (Critical first, then High, then Medium/Low). Tracks 1, 2, 3, 4 are the 4 Critical tracks. Tracks 5-8 are High. Tracks 9-11 are Medium. Track 12 is the batched Low housekeeping. Track 0 is a protocol-refinement pre-audit chore (no implementation work).

## Dependency graph

```
            ┌──────────────────────────────────────────────┐
            │ Track 0: Protocol v1.1 + graph.db rebuild    │ (pre-audit chore)
            └────────────────────┬─────────────────────────┘
                                 │
        ┌────────────────────────┼─────────────────────────────┐
        │                        │                             │
        ▼                        ▼                             ▼
   ┌─────────┐             ┌─────────┐                   ┌──────────┐
   │ Track 3 │             │ Track 4 │                   │ Track 11 │
   │ Argon2id│             │ Audit   │                   │ CI/tsc   │
   │ + Auth  │             │ Log     │                   │ Alignment│
   │ Flatten │             │ Infra   │                   │          │
   └────┬────┘             └────┬────┘                   └────┬─────┘
        │                       │                             │
        └────────────┬──────────┘                             │
                     │                                        │
                     ▼                                        │
              ┌────────────┐                                  │
              │  Track 1   │ ◀────────────────────────────────┘
              │  App →     │
              │  Domain    │
              │  Migration │
              └─────┬──────┘
                    │
        ┌───────────┼─────────────┐
        ▼           ▼             ▼
   ┌─────────┐ ┌──────────┐  ┌────────┐
   │ Track 2 │ │ Track 8  │  │ Track 7│
   │ TenantDB│ │ Domain   │  │ Zod    │
   │ +schoolId│ │ Decomp.  │  │ Bound. │
   └────┬────┘ └────┬─────┘  └────┬───┘
        │           │             │
        └───────────┼─────────────┘
                    │
        ┌───────────┼─────────────┐
        ▼           ▼             ▼
   ┌─────────┐ ┌──────────┐  ┌────────┐
   │ Track 5 │ │ Track 6  │  │ Track 9│
   │ AI       │ │ Storage  │  │ Observ.│
   │ Adapter  │ │ Package  │  │ Stack  │
   └────┬────┘ └────┬─────┘  └────┬───┘
        │           │             │
        └───────────┼─────────────┘
                    ▼
              ┌──────────┐  ┌──────────┐
              │ Track 10 │  │ Track 12 │
              │ Rate     │  │ House-   │
              │ Limiter  │  │ keeping  │
              │ v2       │  │ Batch    │
              └──────────┘  └──────────┘
```

**Execution order:** 0 → 3 + 4 + 11 in parallel → 1 → (2, 7, 8) in parallel → (5, 6, 9) in parallel → (10, 12).

Total wall time if serial: ~18 weeks. Parallelized: ~10 weeks (4 critical + 1 high parallel + 2 medium parallel + housekeeping).

---

## Track 0 — Protocol v1.1 + graph.db Rebuild (pre-audit chore)

> **No implementation work**; this is the precondition for the next re-audit.

- **Severity:** Protocol-level
- **Resolves:** F-1003 (empty `graph.db`)
- **Effort:** 1 day
- **Scope:**
  - Run `build-graph scan . ./graph.db` from the monorepo root
  - Add a CI gate that fails the build if `build-graph stats` shows 0 files
  - Update `measure/agents-md-audit-protocol.md` to v1.1 (incorporate 6 protocol refinements from `checklist.md` Notes section)
  - Add §3.6, §4.10, §5.10, §9.7 to the protocol
  - Document the multiline-safe scan method in §Severity Scheme
- **Track owner:** `@reading-advantage/measure` (no app-level work)
- **Prerequisite for:** all subsequent tracks
- **Reference:** `checklist.md` §Notes for protocol v1.1

---

## Track 1 — App → Domain Layer Migration (umbrella)

- **Track ID:** `app_domain_migration_20260603`
- **Severity:** **Critical** (load-bearing)
- **Resolves:** F-305 (umbrella root) + F-203, F-208, F-306, F-307, F-405, F-701, F-702 (all symptoms)
- **Effort:** 4 weeks
- **Scope:**
  1. **Phase 1 (1 week)** — pick the representative route (`app/api/student/classes/route.ts` is already a 42-line thin handler that delegates to `lib/services/classes/get-student-classes.ts` — use as template). Document the pattern.
  2. **Phase 2 (1 week)** — scaffold `lib/services/{classes,mastery,gamification,interventions,assignments}/` and lift the 9 existing `lib/services/*` files into `packages/domain/src/`. Convert `lib/services/mastery/mastery-worker.ts` to `packages/domain/src/mastery/{schema,contracts,queries,mutations,permissions,errors,index}.ts`.
  3. **Phase 3 (1 week)** — migrate 5 high-traffic routes as pilot: `app/api/ai/update-mastery/route.ts` (624 lines → 1 line domain call), `app/api/lessons/[lessonSlug]/quiz/route.ts` (519 → 1 line), `app/api/ai/recommendations/route.ts` (400 → 1 line), `app/api/classes/[classId]/assignments/route.ts` (364 → 3 lines for GET/POST/DELETE), `app/api/teachers/classes/[classId]/intervention-alerts/route.ts` (287 → 1 line).
  4. **Phase 4 (1 week)** — migrate the remaining 17 routes in batches of 5. Replace 23 hand-rolled `role ===` checks with `assertCan(user, "<key>", tenant)`. Add `requirePermission(key)` HOF in `packages/auth/src/server.ts` if missing.
  5. **Phase 5 (continuous)** — replace the 2 page.tsx files that import `db` (`app/(teacher)/teacher/page.tsx`, `app/(teacher)/teacher/classes/page.tsx`) with domain function calls. Note: requires creating a `packages/domain/src/teachers/` module (does not exist; one of the 14 modules to add).
  6. **Phase 6 (continuous)** — refactor the 14 scripts that call `db` directly to use domain functions instead (seed scripts are the easiest place to start).
- **Acceptance criteria:**
  - 0 `import { db } from '@reading-advantage/db'` in `apps/science-advantage/app/**/{route,page}.tsx`
  - 0 hand-rolled `role === '...'` checks in `apps/science-advantage/app/`
  - All 27 `route.ts` files are <50 lines (per §7.1)
  - All 22 `page.tsx` files delegate data fetching to `packages/domain`
  - Existing `route.integration.test.ts` files re-pointed to the new domain functions (and pass)
- **Pre-req for:** Track 2 (TenantDB), Track 7 (Zod Boundary), Track 8 (Domain Module Decomposition)
- **Track owner:** `@reading-advantage/domain` + `apps/science-advantage`
- **Cross-cutting:** This is the highest-leverage track in the audit. Every other section's compliance is downstream of it.

---

## Track 2 — TenantDB & schoolId Adoption

- **Track ID:** `tenant_db_school_id_20260603`
- **Severity:** **Critical**
- **Resolves:** F-501, F-502 (merged into F-305 root)
- **Effort:** 2–4 weeks (depends on Phase 1 architectural decision)
- **Scope:**
  1. **Phase 1 (1 week, decision-only)** — Decide architectural direction with the maintainer:
     - **(a) Add `schoolId` to the 19 science tables and migrate to `createTenantDB` everywhere** (AGENTS.md compliant; big schema change; Drizzle migration + backfill).
     - **(b) Document science-advantage's user-centric model as an intentional deviation** (add a `apps/science-advantage/AGENTS.md` deviation note; F-501/F-502 downgrade to Medium; §5.3 + §5.4 become DEFERRED).
  2. **Phase 2 (1 week)** — If path (a): scaffold `createTenantDB` calls in 5 of 27 `route.ts` files as pilot; prove the pattern works against the existing test fixtures.
  3. **Phase 3 (1–2 weeks)** — If path (a): roll the pattern to the remaining 22 `route.ts` files.
  4. **If path (b):** add the deviation note to `apps/science-advantage/AGENTS.md`; file a follow-up track for "when does the science product need school-scoped isolation?" as future work.
- **Acceptance criteria:**
  - If path (a): all 19 `science_*` tables have `schoolId NOT NULL` columns; all 27 `route.ts` files use `createTenantDB`; 0 hand-rolled `eq(table.teacherId, ...)` predicates
  - If path (b): deviation note in `apps/science-advantage/AGENTS.md` references this audit and lists 3 concrete scenarios where `schoolId` would be needed
- **Pre-req for:** Track 1 (must do Track 1 first to ensure the migration lands in domain functions, not in routes)
- **Track owner:** `apps/science-advantage` + `@reading-advantage/db`
- **Cross-references:** `packages/domain/src/db-contract.ts:167` (the `createTenantDB` wrapper)

---

## Track 3 — Argon2id Migration + Auth Adapter Flatten

- **Track ID:** `argon2id_password_20260603`
- **Severity:** **Critical** (shared, monorepo-wide)
- **Resolves:** F-401, F-402, F-406
- **Effort:** 1 week
- **Scope:**
  1. **Phase 1 (3 days)** — migrate `packages/auth/src/password.ts` from `bcryptjs` to `@node-rs/argon2` (the Rust-backed Argon2id library).
  2. **Phase 2 (1 day)** — provide a one-shot migration path for existing bcrypt hashes: verify with bcrypt; on next successful login, re-hash with Argon2id.
  3. **Phase 3 (1 day)** — update the 3 science-advantage seed scripts (`scripts/seed-demo-users.ts`, `scripts/seed/seed-demo-data.ts`, `scripts/seed/seed-activity-data.ts`) to import `hashPassword` from `@reading-advantage/auth` instead of `bcryptjs`.
  4. **Phase 4 (1 day)** — remove `bcryptjs` from `apps/science-advantage/package.json` production deps; delete `apps/science-advantage/lib/auth/session.ts` and `lib/auth/server.ts` (F-401); replace all 22 `import { ... } from '@/lib/auth/...'` with `import { ... } from '@reading-advantage/auth'`.
- **Acceptance criteria:**
  - `packages/auth/src/password.ts` uses `@node-rs/argon2` (not `bcryptjs`)
  - 0 `bcryptjs` imports in `apps/science-advantage/scripts/`, `lib/auth/`, or `package.json`
  - `lib/auth/session.ts` deleted; `lib/auth/server.ts` deleted; all callers re-pointed to `@reading-advantage/auth`
  - Hash re-encryption on next successful login verified with integration test
  - All 6 apps (reading, primary, www-reading, codecamp, advantage-games, science) re-tested for login flow
- **Pre-req for:** none (this is independent and high-leverage)
- **Track owner:** `@reading-advantage/auth`
- **Cross-cutting:** Highest-leverage finding in the audit. One PR migrates the password module and unblocks 6 apps. Coordinate with primary-advantage, reading-advantage, www-reading-advantage, codecamp-advantage, advantage-games.

---

## Track 4 — Audit Log Infrastructure

- **Track ID:** `audit_log_infrastructure_20260603`
- **Severity:** **Critical**
- **Resolves:** F-404, F-901
- **Effort:** 1 week
- **Scope:**
  1. **Phase 1 (2 days)** — add `audit_events` table in `packages/db/src/schema/audit.ts` with columns `(id, actor_user_id, actor_role, action, target_type, target_id, ip_address, user_agent, metadata jsonb, created_at)` and a `REVOKE UPDATE, DELETE` migration (append-only enforcement).
  2. **Phase 2 (1 day)** — add `recordAuditEvent(action, ctx, payload)` to `packages/auth/src/audit.ts` (or `packages/observability/` if that package exists).
  3. **Phase 3 (1 day)** — call it from `packages/auth/src/{password,session}.ts` (login/logout/password change) and `packages/api/src/routes/auth/*.ts` (4 stub routes in `apps/science-advantage/app/api/auth/*/route.ts`).
  4. **Phase 4 (1 day)** — call it from the 4 destructive `route.ts` handlers in science-advantage (assignment create/delete in `app/api/classes/[classId]/assignments/route.ts:POST/DELETE`, student remove in `app/api/classes/[classId]/roster/route.ts:DELETE`, class delete in `app/api/classes/[classId]/route.ts:DELETE`).
  5. **Phase 5 (continuous)** — add tests asserting the audit row is written.
- **Acceptance criteria:**
  - `audit_events` table exists in `packages/db/src/schema/`
  - Drizzle migration creates the table with `REVOKE UPDATE, DELETE` from the app role
  - `recordAuditEvent` helper called from all 4 auth surface entry points
  - 4 destructive handlers in science-advantage emit `audit_events` rows
  - Integration test asserts: login → audit row exists with `action='login'`, `actor_user_id=<user>`, `ip_address=<test>`, etc.
- **Pre-req for:** Track 1 (so audit calls land in domain functions, not in route handlers)
- **Track owner:** `@reading-advantage/auth` + `apps/science-advantage`
- **Cross-references:** `docs/prd/requirements.md:NFR9` (audit logging requirement)

---

## Track 5 — Shared `packages/ai` + `lib/ai/` Refactor

- **Track ID:** `ai_adapter_package_20260603`
- **Severity:** **High** (originally; bumped because F-101 blocks the §3 backend-as-code migration for AI features)
- **Resolves:** F-101, F-202
- **Effort:** 2 weeks
- **Scope:**
  1. **Phase 1 (3 days)** — create `packages/ai/src/` with `AIClient` interface (`generateObject<T>(input): Promise<T>`, `generateImage(input): Promise<Buffer>`, `generateText(input): Promise<string>`) and a provider selector driven by `AI_PROVIDER` env var (`openai` | `google` | `mock`).
  2. **Phase 2 (3 days)** — implement the `AIClient` interface for `@ai-sdk/openai`, `@ai-sdk/google`, and a `mock` provider for tests. Provider selection matches the existing `resolveModel()` logic in `lib/ai/recommendation-service.ts:63-76`.
  3. **Phase 3 (2 days)** — refactor `lib/ai/recommendation-service.ts` to depend on the `AIClient` interface, not on `@ai-sdk/*`. Refactor `image-generator.ts` to stop mutating `process.env` at call time and instead pass the API key through the interface constructor.
  4. **Phase 4 (1 day)** — remove `ai`, `@ai-sdk/openai`, `@ai-sdk/google` from `apps/science-advantage/package.json` production deps.
  5. **Phase 5 (1 day)** — update `docs/specs/ai-structured-data-generation/spec.md` and `docs/ai-image-generation.md` to reference the new `packages/ai` interface instead of `@ai-sdk/openai` directly.
- **Acceptance criteria:**
  - `packages/ai/` package exists with `AIClient` interface
  - 0 `@ai-sdk/*` or `ai` imports in `apps/science-advantage/`
  - Provider selection is via injected `AIClient` reference (not env-var-string branches)
  - `image-generator.ts` no longer mutates `process.env` at call time
  - All existing AI tests still pass with the new interface
- **Pre-req for:** none (independent of Track 1)
- **Track owner:** `apps/science-advantage` + new `packages/ai/`
- **Cross-references:** `lib/platform/redis-client.ts:3` is the template (`RedisClient` interface); `lib/platform/cache-adapter.ts:1,14` for the same pattern.

---

## Track 6 — Shared `packages/storage` S3-Compatible Package

- **Track ID:** `storage_package_20260603`
- **Severity:** **High** (latent; F-102 has no live feature depending on it yet)
- **Resolves:** F-102, F-703 (partial — GitHub client is also a storage-adjacent concern)
- **Effort:** 1 week
- **Scope:**
  1. **Phase 1 (2 days)** — create `packages/storage/src/` with `StorageClient` interface (`put`, `get`, `delete`, `getSignedUrl`).
  2. **Phase 2 (2 days)** — implement the interface for `@aws-sdk/client-s3` (works with GCS S3 interop mode, Cloudflare R2, MinIO local dev).
  3. **Phase 3 (1 day)** — extract `packages/domain/src/codecamp/index.ts:1952` GitHub `fetch()` to `packages/integrations/github` with typed methods (`getPracticeIssues`, `getInstallationTokenForRepo`).
  4. **Phase 4 (1 day)** — update `apps/science-advantage/.env.example` to remove `GOOGLE_CLOUD_*` env vars (or wire them through `packages/storage`).
- **Acceptance criteria:**
  - `packages/storage/` package exists with `StorageClient` interface
  - 0 `@google-cloud/storage` or `@aws-sdk/client-s3` imports in `apps/science-advantage/`
  - GitHub client extracted to `packages/integrations/github`; `getPracticeIssues` no longer uses inline `fetch()` + `headers`
- **Pre-req for:** none (independent)
- **Track owner:** `@reading-advantage/storage` (new) + `@reading-advantage/integrations` (new) + `apps/science-advantage`
- **Cross-references:** `measure/tracks/storage_s3_compat_20260522/` (already in Pending Tracks; this audit's Track 6 supersedes it with the audit findings)

---

## Track 7 — Zod Boundary + Env Hardening

- **Track ID:** `zod_boundary_hardening_20260603`
- **Severity:** **High**
- **Resolves:** F-601, F-602, F-302 (partial), F-603, F-604, F-704
- **Effort:** 1.5 weeks
- **Scope:**
  1. **Phase 1 (2 days)** — add Zod schemas to `lib/validations/` for each of the 21 routes missing Zod validation. Reuse `lib/forms/from-zod` where possible.
  2. **Phase 2 (1 day)** — add `lib/validations/api-helpers.ts` `parseBody(request, schema)` and `parseQuery(request, schema)` helpers so future routes cannot omit the check. Migrate 4 hand-rolled `typeof` sites first.
  3. **Phase 3 (1 day)** — extend `lib/env.ts` to cover the full `.env.example` surface (17+ unvalidated vars).
  4. **Phase 4 (1 day)** — replace the 17+ raw `process.env.*` reads in `lib/ai/recommendation-service.ts:55-60`, `lib/ai/image-generator.ts:29-39`, `lib/config/ai.ts:15-24`, `lib/config/ai-images.ts:14-20`, `lib/config/features.ts:2-4`, `lib/analytics.ts:17`, `lib/auth/session.ts:97`, `proxy.ts:25` with references to the validated `env` export.
  5. **Phase 5 (1 day)** — add `.refine` rules for `AI_RECOMMENDER_HASH_SECRET` (required, ≥32 chars) and `GOOGLE_CLOUD_KEY_FILE` (must exist if set).
  6. **Phase 6 (1 day, optional)** — extract `lib/validations/{class,student-classes}.ts` and `lib/schemas/lesson-content.schema.ts` to `packages/types/src/contracts/` for cross-app reuse.
- **Acceptance criteria:**
  - 0 `request.json()` without Zod in `apps/science-advantage/app/api/`
  - 27 of 27 `route.ts` use Zod on body + query + path params
  - `lib/env.ts` Zod schema covers 100% of `.env.example` vars
  - 0 raw `process.env.*` reads in `lib/ai/*`, `lib/config/*`, `lib/analytics.ts`, `proxy.ts`
- **Pre-req for:** none (independent of Track 1)
- **Track owner:** `apps/science-advantage`
- **Cross-references:** F-302 (Zod contracts in `packages/domain`) is partially addressed by Track 8.

---

## Track 8 — Domain Module Decomposition + Per-Module `permissions.ts`

- **Track ID:** `domain_module_decomposition_20260603`
- **Severity:** **High**
- **Resolves:** F-301, F-303, F-304, F-504 (partial), F-1101
- **Effort:** 3 weeks (parallel to Track 1)
- **Scope:**
  1. **Phase 1 (1 week)** — pilot on `gamification` (smallest at 77 lines, 2 functions). Extract `contracts.ts` (Zod schemas), `queries.ts` (`getStudentGamification`), `mutations.ts` (`updateStudentGamification`), `permissions.ts` (`gamification:read:all`, `gamification:update`), `errors.ts` (`GamificationError`), `index.ts` (re-export).
  2. **Phase 2 (1 week)** — replicate pattern in `classes` (82 lines), `licenses` (107), `curriculum` (113), `stories` (105), `quiz` (78).
  3. **Phase 3 (1 week)** — split `codecamp/index.ts` (1,987 lines) into 8-10 sub-modules (`codecamp/{modules,lessons,exercises,quizzes,chat,pr-review,webhook-events,intern-accounts,index}.ts`). This is the worst offender; budget 1 week for the split plus per-export JSDoc.
  4. **Phase 4 (continuous)** — introduce a `domainModulePermissions` extension point in `packages/auth`; update `assertCan` to consult module-level overrides first, then the central `PERMISSIONS` map.
  5. **Phase 5 (continuous)** — add `relations()` blocks in `packages/db/src/schema/` for the 5 most-queried aggregates; codemod the 3 raw `sql\`\`` sites in `apps/science-advantage` to parameter-binding equivalents.
- **Acceptance criteria:**
  - 14 of 14 `packages/domain/src/<module>/` have `contracts.ts` + `queries.ts` + `mutations.ts` + `permissions.ts` + `errors.ts` + `index.ts`
  - `codecamp/` split into 8-10 sub-modules
  - Per-export JSDoc on all 153+ exported functions (re-validates the 2026-05-30 JSDoc track)
  - `assertCan` consults module-level permissions first
  - 5 `relations()` blocks added to `packages/db/src/schema/`
- **Pre-req for:** none (parallel to Track 1)
- **Track owner:** `@reading-advantage/domain` + `@reading-advantage/db`
- **Cross-references:** Track 0 protocol v1.1 adds §3.6 (Domain layer unused) which Track 8 will satisfy across all 14 modules.

---

## Track 9 — Observability Stack: Sentry + Request Context + Tracing

- **Track ID:** `observability_stack_20260603`
- **Severity:** **Medium** (bumped because Track 4 needs the structured logger)
- **Resolves:** F-902, F-903, F-904, F-905, F-906
- **Effort:** 1 week
- **Scope:**
  1. **Phase 1 (2 days)** — add `@sentry/nextjs` to `apps/science-advantage/package.json`; create `sentry.client.config.ts` and `sentry.server.config.ts`; wire DSN via `SENTRY_DSN` env (already referenced in archived `docs/archive/onboarding/environment.md:73`).
  2. **Phase 2 (1 day)** — add `instrumentation.ts` registering Sentry on the server. Replace `console.error` catch blocks in `proxy.ts` and `lib/utils/clipboard.ts` with `Sentry.captureException(error, { tags: { route, method } })` + structured log.
  3. **Phase 3 (1 day)** — introduce `AsyncLocalStorage<RequestContext>` in `lib/observability/context.ts`; populate from a new `withRequestContext` wrapper used in every `route.ts`. Extend `lib/observability/logger.ts` to read from `AsyncLocalStorage` and auto-attach `requestId`, `userId`, `latencyMs`.
  4. **Phase 4 (1 day)** — add `@opentelemetry/api` + `@opentelemetry/sdk-node` + `@opentelemetry/exporter-trace-otlp-http`. Create `instrumentation.ts` that registers an OTLP exporter. In `proxy.ts` (central entry point) and `lib/ai/recommendation-service.ts` (AI call site), wrap request handlers and `generateObject` calls in `trace.getTracer('science-advantage').startActiveSpan(...)`. Replace the ad-hoc `traceId` context field with `trace.getSpan(context.active())?.spanContext().traceId`.
  5. **Phase 5 (continuous)** — replace `console.error` in client components with a `clientLogger.error(...)` that no-ops in prod (or sends to Sentry once Phase 1 lands). Migrate the 5 largest `route.ts` files' catch blocks from `console.error` to `logger.error`.
- **Acceptance criteria:**
  - `@sentry/nextjs` installed and configured
  - `instrumentation.ts` registers both Sentry + OTel
  - `AsyncLocalStorage<RequestContext>` populates `requestId`/`userId`/`latencyMs` automatically
  - 5 largest `route.ts` files emit structured logs with auto-attached context
  - OTel spans wrap `generateObject` calls; `traceId` is the real OTel span context
  - 0 `console.log`/`console.error` in `apps/science-advantage/{app,lib,components}/` (eslint rule enforces)
- **Pre-req for:** none
- **Track owner:** `apps/science-advantage` + new `packages/observability/` (if extracted)
- **Cross-references:** Track 4 (Audit Log) benefits from the same `recordAuditEvent` + `withRequestContext` plumbing.

---

## Track 10 — Postgres-Backed Rate Limiter v2

- **Track ID:** `rate_limiter_v2_20260603`
- **Severity:** **Medium**
- **Resolves:** F-403, F-407
- **Effort:** 1 week
- **Scope:**
  1. **Phase 1 (2 days)** — add a `login_attempts` table in `packages/db/src/schema/auth.ts` with columns `(username, failed_count, window_start, last_attempt_at)`.
  2. **Phase 2 (2 days)** — replace the in-memory `Map` in `packages/auth/src/rate-limit.ts:9` with a `SELECT ... FOR UPDATE` upsert pattern. Add per-IP rate limit (e.g. 30 attempts / 15 min from a single IP) alongside the per-username limit.
  3. **Phase 3 (1 day)** — add a periodic cleanup job (sibling to `lib/platform/session-cleanup.ts`) that prunes rows older than 24 hours.
  4. **Phase 4 (1 day)** — keep the in-memory `Map` as a fast-path in development only (gated by `NODE_ENV === 'development'`).
- **Acceptance criteria:**
  - 0 `const x = new Map<string, RateLimitEntry>()` outside `lib/platform/rate-limit-store.ts` (and the dev-only fast-path)
  - Per-IP rate limit in addition to per-username
  - Rate limit survives process restart (Postgres-backed)
  - Integration test asserts: 6th failed login from same IP within 15 min returns 429
- **Pre-req for:** none
- **Track owner:** `@reading-advantage/auth`
- **Cross-references:** `lib/platform/redis-client.ts` (Redis alternative if already available).

---

## Track 11 — CI Alignment + tsc Blocker Resolution

- **Track ID:** `ci_typecheck_alignment_20260603`
- **Severity:** **High**
- **Resolves:** F-1001, F-1002, F-1003, F-1204, F-1205
- **Effort:** 2 weeks
- **Scope:**
  1. **Phase 1 (1 day)** — add `@testing-library/jest-dom/vitest` to `vitest.unit.setup.ts` (resolves ~354 tsc errors).
  2. **Phase 2 (1 day)** — fix `lib/auth/session.ts:40,79` INTERN role widening (2 errors).
  3. **Phase 3 (1 day)** — add `lib/auth/{password,rate-limit}.test.ts` sibling modules (2 errors).
  4. **Phase 4 (1 day)** — type-cast `process.env` reads or import `NodeJS.ProcessEnv` (3 errors).
  5. **Phase 5 (1 day)** — dedupe next@16 instances (4 errors).
  6. **Phase 6 (1 day)** — misc cleanup (4 errors).
  7. **Phase 7 (1 day)** — add `"check-types": "tsc --noEmit"` to `apps/science-advantage/package.json` scripts.
  8. **Phase 8 (1 day)** — remove `ignoreBuildErrors: true` from `next.config.ts:25` and verify clean build.
  9. **Phase 9 (2 days)** — delete `apps/science-advantage/.github/workflows/ci.yml` (it's dead/drifted); add a `path-filter: apps/science-advantage/**` token to the monorepo root `.github/workflows/ci.yml`.
  10. **Phase 10 (1 day)** — add the lint-fix for the 4 `react-hooks/immutability` errors in `components/features/teacher/analytics/student-lesson-detail-analytics.tsx:151,155,186` (lift the `fetchAnalytics` `useCallback`/`useMemo`/function declaration above the `useEffect`).
  11. **Phase 11 (1 day)** — silence the 6 `_userId`/`_triggerEvent` `@typescript-eslint/no-unused-vars` warnings in `lib/gamification/badges.ts:114,202`.
- **Acceptance criteria:**
  - `pnpm turbo run check-types --filter=science-advantage` exits 0
  - `next.config.ts:25` has `ignoreBuildErrors: false`
  - `pnpm turbo run lint --filter=science-advantage` exits 0
  - Monorepo root CI has a `path-filter: apps/science-advantage/**` job that runs `pnpm turbo run {build,lint,test,check-types} --filter=science-advantage`
  - App-local `ci.yml` deleted (or converted to the path-filtered monorepo job)
- **Pre-req for:** Track 0 (graph.db rebuild; CI needs to know which files are part of the app)
- **Track owner:** `apps/science-advantage` + monorepo root CI
- **Cross-references:** Existing `measure/tech-debt.md` row `auth_strategy_review` (2026-05-03) covers the underlying tsc/lint blockers; this track is the resolution.

---

## Track 12 — Audit Housekeeping Batch

- **Track ID:** `housekeeping_batch_20260603`
- **Severity:** **Low** (batched; ships quickly)
- **Resolves:** F-205, F-503 (partial), F-705, F-1102, F-1201, F-1202, F-1207, F-1301, F-1305, F-1306
- **Effort:** 1–2 days
- **Scope:**
  1. **Phase 1 (2 hours)** — relocate legacy `prisma/` seed-data:
     - `prisma/data/` → `scripts/seed-data/grade-4/`
     - `prisma/seed-data/` → `scripts/seed-data/curriculum/`
     - `prisma/seed-functions/update-seed-files.ts` → `scripts/seed/update-seed-files.ts`
     - Delete `prisma/` entirely
  2. **Phase 2 (1 hour)** — verify or delete 4 auth `route.ts` stubs at `app/api/auth/*/route.ts` (F-705). If 0 references, delete.
  3. **Phase 3 (1 hour)** — update `apps/science-advantage/AGENTS.md` to remove Prisma + `npm` references (F-1102).
  4. **Phase 4 (1 hour)** — add `*.log` to `apps/science-advantage/.gitignore`; `git clean -f` the 2 stray logs.
  5. **Phase 5 (1 hour)** — backfill 5 orphan in-code `TODO`s: file GH issues for `lib/gamification/badges.ts:115` (language preference) and the 4 i18n / slug TODOs; add `TODO(#XXX)` references in the comments.
  6. **Phase 6 (1 hour)** — pin 51 `^`-ranged deps: decide pnpm `save-exact` policy in `.npmrc`; re-pin ranges by hand or `pnpm dedupe --check`; verify `pnpm install --frozen-lockfile` still resolves.
  7. **Phase 7 (1 hour)** — add the missing track IDs as `git notes` to the 24 `refactor(science):` ports under the archived `prisma_drizzle_science_controllers_20260505`.
  8. **Phase 8 (1 hour)** — delete the redundant app-local `ci.yml` (or convert it to the path-filtered monorepo job from Track 11 Phase 9).
  9. **Phase 9 (1 hour)** — add `docs/adr/` directory with `0001-use-drizzle-not-prisma.md`, `0002-drop-jwt-era-accounts-columns.md`, `0003-add-intern-role.md` (F-503 partial).
  10. **Phase 10 (1 hour)** — add a `commitlint` config (e.g. `cz-conventional-changelog`) to enforce subject-line track reference for non-chore commits going forward.
- **Acceptance criteria:**
  - `prisma/` directory deleted
  - 4 auth stubs verified (alive) or deleted
  - `apps/science-advantage/AGENTS.md` references Drizzle + pnpm only
  - 51 `^`-ranged deps re-pinned
  - 5 orphan TODOs have GH issue references
  - 2 stray log files cleaned
  - `git notes` added to 24 `refactor(science):` ports
  - App-local `ci.yml` deleted (or merged into monorepo root path-filtered job)
  - `docs/adr/` directory created with 3 ADRs
- **Pre-req for:** none (independent; can ship anytime)
- **Track owner:** `apps/science-advantage` + monorepo root CI
- **Cross-references:** F-1203 (Build passes only because of `ignoreBuildErrors`) is resolved by Track 11, not by Track 12.

---

## Effort summary

| Track | Severity | Effort | Dependencies | Resolves |
|-------|----------|--------|--------------|----------|
| 0 — Protocol v1.1 + graph.db | Protocol | 1 day | — | F-1003 |
| 1 — App → Domain Migration | **Critical** | 4 weeks | 0, 3, 4, 11 | F-305 + F-203, F-208, F-306, F-307, F-405, F-701, F-702 |
| 2 — TenantDB & schoolId | **Critical** | 2–4 weeks | 1 | F-501, F-502 |
| 3 — Argon2id + Auth Flatten | **Critical** | 1 week | — | F-401, F-402, F-406 |
| 4 — Audit Log Infrastructure | **Critical** | 1 week | — | F-404, F-901 |
| 5 — AI Adapter Package | High | 2 weeks | — | F-101, F-202 |
| 6 — Storage Package | High | 1 week | — | F-102, F-703 |
| 7 — Zod Boundary + Env | High | 1.5 weeks | — | F-601, F-602, F-302 (partial), F-603, F-604, F-704 |
| 8 — Domain Module Decomposition | High | 3 weeks | — (parallel to 1) | F-301, F-303, F-304, F-504 (partial), F-1101 |
| 9 — Observability Stack | Medium | 1 week | — | F-902, F-903, F-904, F-905, F-906 |
| 10 — Rate Limiter v2 | Medium | 1 week | — | F-403, F-407 |
| 11 — CI Alignment + tsc | High | 2 weeks | 0 | F-1001, F-1002, F-1204, F-1205 |
| 12 — Housekeeping Batch | Low | 1–2 days | — | F-205, F-503, F-705, F-1102, F-1201, F-1202, F-1207, F-1301, F-1305, F-1306 |

**Total wall time if serial:** ~17 weeks.
**Wall time parallelized** (4 Critical + 1 High parallel + 2 Medium parallel + housekeeping): ~10 weeks.

---

## Suggested next steps

1. **Sign off** the 12-track plan and the F-305 umbrella reclassification.
2. **Open Tracks 1–4 (Critical)** in `measure/tracks/` in priority order. Track 1 is the load-bearing one; Tracks 3 and 4 are high-leverage and can be done in parallel.
3. **Schedule Tracks 5–8 (High)** as the second wave; Track 8 can run in parallel with Track 1 since both touch `packages/domain` but on different concerns.
4. **Schedule Tracks 9–12** as the cleanup wave; Track 12 can ship anytime (1–2 days).
5. **Re-audit** the app at the end of Track 1 + Track 2 using the v1.1 protocol from Track 0; expect compliance score to jump from 49% to ~75%.

---

**End of migration-tracks.md.** See `executive-summary.md` for the one-page sign-off and `findings.md` for severity-classified evidence.
