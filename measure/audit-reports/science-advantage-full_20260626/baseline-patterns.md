# Baseline Patterns: Science Advantage

> **Track:** `science_advantage_review_20260626`
> **Source:** 37 batch reports under `line-review/`
> **Status:** Pattern catalog only. No remediation performed. Acceptance/closeout PENDING.
> **Spec guardrail (Non-Goal):** "Do not turn architecture-baseline notes into rules for other apps without evidence." Each pattern below cites the batch evidence it was observed in. These are **candidate** golden paths to consider during Reading/Primary migrations, not mandates.

---

## A. Verified Golden-Path Patterns (carry forward — with evidence)

### A1. Thin server pages with delegated auth via `requireRole()`
- **Evidence:** sa-batch-01 — 19 of 20 pages call `requireRole(<ROLE>)` at the top of the server component or its layout, use `session` only for display, do no direct DB access, and delegate data fetching to client components/API. The single outlier (F-SA-B01-001) is anomalous, which itself confirms the pattern is the established norm.
- **Why reusable:** clear server trust boundary, minimal page logic.

### A2. Domain-function contract `{ user, tenant, input }` with `assertCan()` inside the domain
- **Evidence:** sa-batch-05 — all 8 API routes call a domain function passing `{ user, tenant, input }`; authorization is enforced via `assertCan()` *inside* the domain function, not the route. `tenant.schoolId` is sourced from the session, never the client (sa-batch-05 §summary).
- **Why reusable:** transport-independent business logic, centralized authorization.

### A3. `createTenantDB(db, tenant)` → pass scoped db to domain function
- **Evidence:** sa-batch-02 files 10 (`teacher/classes/page.tsx`) and 12 (`teacher/page.tsx`): `createTenantDB(db, tenant)` then `teachers.getTeacherClassesWithCounts({ db: tenantDb, ... })`. F-SA-B02-027/037 mark these OK and explicitly contrast them with the raw-`db` deviations (see §B1).
- **Why reusable:** auto-injects `eq(table.schoolId, tenant.schoolId)` for FLAT tables.

### A4. Zod at every external boundary
- **Evidence:** DSAR route `.refine()` XOR validation (sa-batch-02, F-SA-B02-054); `parseQuery`/`parsePath` helpers (sa-batch-05, F-SA-B05 OK lines); `studentEnrolledClassesResponseSchema.parse()` on API responses (sa-batch-08); `zodResolver` forms (sa-batch-08).
- **Why reusable:** runtime validation independent of TypeScript types.

### A5. `runWithRequestContext` observability wrapper on route handlers
- **Evidence:** sa-batch-02 files 15 & 19 (DSAR + recommendations routes); sa-batch-02 §"Golden Path".
- **Why reusable:** propagates requestId/route/method/latency into structured logs (FR-6 contract pinned in sa-batch-02 file 18).

### A6. Per-block error isolation in content renderers
- **Evidence:** sa-batch-07 — `lesson-player.tsx` wraps each block in `BlockErrorBoundary` so one block failure does not crash the lesson.
- **Why reusable:** composable, fault-tolerant content rendering.

### A7. DSAR export test design
- **Evidence:** sa-batch-02 files 13–14 — STORE-method ZIP reader (well-documented), idempotent `onConflictDoNothing()` seeds, prefix-scoped DELETE cleanup (not TRUNCATE), cross-tenant empty-result isolation test, and the "counts triple" invariant (manifest == events.length == db count).
- **Why reusable:** model for testable export/audit features with tenant isolation proofs.

### A8. Audit-tooling reproducibility
- **Evidence:** sa-batch-18 (`snapshotRgFiles` writes rg output to fixtures; `PROPOSED_TRACKS` audit-to-track traceability table); sa-batch-23 (`git check-ignore -v --no-index` hermetic probe).
- **Why reusable:** deterministic, replayable audit gates.

### A9. ESLint config with audit trail
- **Evidence:** sa-batch-17 (`eslint.config.mjs`) — track-ID-referenced exemptions, logger-sink separation from production code. Called a "reference-quality config" (F-SA-B17 golden-path list).

### A10. Idempotency via pipeline status table
- **Evidence:** sa-batch-17 (student-profile spec: `masteryRun` status transitions + serialized transactions); partially realized in `mastery-worker.ts` (sa-batch-24).
- **Why reusable:** reliable, re-runnable data pipelines.

### A11. Integration harness with isolated `_test` DB and Drizzle migrations
- **Evidence:** sa-batch-36 — `vitest.integration.setup.ts` / `global-setup.ts` resolve a `_test` DB URL and run `runDrizzleMigrate` once; matches app AGENTS.md guidance and is the correct counter-model to `vercel.json`'s Prisma call (F-SA-B36-001).

---

## B. Patterns NOT to Generalize (anti-patterns — with evidence)

### B1. Raw `db` import instead of `createTenantDB`
- **Evidence:** `getClassDetailWithCurriculum` (sa-batch-02 F-SA-B02-003/020/023, sa-batch-24 F-SA-B24-036/037); `badges.ts` (sa-batch-21 F-SA-B21-056); `xp.ts`/`streak.ts` (sa-batch-22 F-SA-B22-001/020/061); `lib/services/**` (sa-batch-24 F-SA-B24-056).
- **Why not:** FLAT tables have `schoolId`; bypassing TenantDB drops the auto-injected school filter. This is the single most repeated live deviation and the root of the tenancy findings.

### B2. In-memory TTL / Map caches presented as "Redis-parity"
- **Evidence:** `lib/interventions/cache.ts` (sa-batch-22 F-SA-B22-031, unbounded Map); `lib/platform/redis-client.ts` (sa-batch-23 F-SA-B23-015/016 — real client never implemented, fallback creates a new store per call); teacher-intervention spec "Redis-parity semantics" (sa-batch-17 "Patterns Not to Generalize").
- **Why not:** broken under horizontal scaling; currently a permanent stub; data lost on restart.

### B3. Client components owning their own auth
- **Evidence:** sa-batch-02 pages 1 & 9 (no server-side auth gate); sa-batch-01 F-SA-B01-001.
- **Why not:** removes server-side defense-in-depth; relies solely on API authorization.

### B4. Business logic embedded in React components
- **Evidence:** sa-batch-07/08 — polling, SHA-256 hashing, quiz submission/scoring inside `.tsx`; `quiz-player.tsx` is 689 lines (F-SA-B08-002).
- **Why not:** violates "business logic belongs in `/packages/backend`"; untestable in isolation.

### B5. Hand-rolled validators instead of Zod at boundaries
- **Evidence:** `validate-json.ts` and content/seed validators (sa-batch-24 F-SA-B24-026/059, sa-batch-32 F-SA-B32-001).
- **Why not:** predate the Zod migration; do not treat as the boundary-validation pattern.

### B6. Prisma-era schema notation & Google-OAuth auth contracts in docs/specs
- **Evidence:** `tech-stack.md` (sa-batch-27 F-SA-B27-007/008/009), `GEMINI.md` (sa-batch-00 F-SA-B00-013/015), `critical_security` spec (sa-batch-26 F-SA-B26-023/024/025).
- **Why not:** these documents are stale; new specs must not be seeded from them.

### B7. `test.skip()` in test body / conditional `if (visible)` assertion guards
- **Evidence:** sa-batch-02 e2e (F-SA-B02-031 conditional guards → false pass); sa-batch-17 smoke (F-SA-B17-017 `test.skip()` in body).
- **Why not:** tests report green without asserting anything; regressions hide.

### B8. Direct provider SDK imports at app code level
- **Evidence:** `@sentry/nextjs` in recommendations route (sa-batch-02 F-SA-B02-084); `@opentelemetry/sdk-node` at app root (sa-batch-18 F-SA-B18-003, noted as a documented pragmatic trade-off).
- **Why not:** violates provider-neutrality; must go through the observability adapter.

### B9. Fixtures/seeds that omit `schoolId` on FLAT tables
- **Evidence:** sa-batch-04 (F-SA-B04-001/004), sa-batch-25 (F-SA-B25-001), sa-batch-32 (F-SA-B32-004), sa-batch-35 (F-SA-B35-006).
- **Why not:** TenantDB isolation becomes a no-op; tenant-isolation tests give false confidence.

---

*Pattern catalog complete. No remediation performed. Acceptance/closeout PENDING.*
