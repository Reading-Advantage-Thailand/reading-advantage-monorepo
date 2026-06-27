# Proposed Migration / Remediation Tracks: Science Advantage

> **Track:** `science_advantage_review_20260626`
> **Source:** `findings.md`, 37 batch reports
> **Status:** **PROPOSALS ONLY.** No track has been created, started, or completed. No remediation was performed. Acceptance/closeout PENDING. Per spec Non-Goal: these notes must not become rules for other apps without evidence.

Tracks are split into **science-specific** (fix in `apps/science-advantage`) and **shared-platform** (affects `@reading-advantage/*` packages or applies to Reading/Primary too). Each proposal cites the findings it would resolve.

---

## A. Science-Specific Remediation Tracks (proposed)

### ST-1 — Gamification authorization & tenant scoping (HIGH PRIORITY)
- **Resolves:** CR-01 (F-SA-B22-001/003/019/020/061/062), HI-03 (F-SA-B21-056/057).
- **Scope:** Route `awardXp`/`updateStreakForProfile`/badges through `createTenantDB` + add `assertCan()`; add cross-tenant isolation tests.
- **Why science-specific:** the gamification module currently lives in app `lib/` using raw `db`.

### ST-2 — `lib/services/**` auth & tenancy
- **Resolves:** HI-01 (F-SA-B24-036/037/044/045/051/056/057), HI-02 (F-SA-B02-003/020/023).
- **Scope:** Add user context + `assertCan()` + `tenantDb` to `get-class-detail`, `get-student-classes`, `mastery-worker`, `getClassDetailWithCurriculum`. Consider moving to `@reading-advantage/domain`.

### ST-3 — Seed-data contract & safety
- **Resolves:** HI-05 (F-SA-B33-001/002), HI-06 (F-SA-B32-003, F-SA-B35-001/006), HI-11 (F-SA-B35-002/003/008/009), CR-04 fixtures.
- **Scope:** Make grade-4 seed data conform to seeder Zod contracts; add a CI check running seed validators over `grade-4/**`; add env guards to seed scripts; populate `schoolId` in all fixtures; remove hardcoded weak passwords / add prod guard.

### ST-4 — Route/contract correctness
- **Resolves:** CR-03 (F-SA-B04-002), CR-05 (F-SA-B01-001, F-SA-B02-001/026), CR-06 (F-SA-B05-001/002), ME-01..03 (F-SA-B03-001/004/007), ME-04 (F-SA-B04-003).
- **Scope:** JSON-401 auth helper for API routes; add server auth gates to delegated pages; reconcile `"me"` alias and `limit` clamp contracts; fix `update-mastery` error mapping; verify lesson∈curriculum.

### ST-5 — Component decomposition & JSDoc
- **Resolves:** HI-10 (F-SA-B08-001/002), sa-batch-07 business-logic-in-component.
- **Scope:** Extract polling/hashing/quiz-scoring into backend helpers; add JSDoc to exported components/functions.

### ST-6 — Build/deploy de-Prisma
- **Resolves:** HI-08 (F-SA-B36-001), DOC-01 in `vercel.json`/build.
- **Scope:** Replace Prisma build command with Drizzle migrate; align `tsconfig` test inclusion (F-SA-B36-003).

### ST-7 — Documentation truth-up
- **Resolves:** DOC-01..04, DOC-06, DOC-07, DOC-09 (`GEMINI.md`, `README.md`, `tech-stack.md`, `TEST_SUMMARY.md`, issue templates, `.opencode/*`, `.gitignore`).
- **Scope:** Archive/rewrite `GEMINI.md`; update README/templates to Drizzle+pnpm; correct auth-model statements; pin MCP versions; fix gitignore literal-`\n` bug.

### ST-8 — Track-spec hardening (planning)
- **Resolves:** DOC-05 (F-SA-B29-002/003/012, F-SA-B30-009/011, F-SA-B31-025/026), DOC-02 acceptance-criteria drift (F-SA-B26-025).
- **Scope:** Rewrite placeholder specs/plans for `redis_actual_integration` and `teacher_dashboard_surfaces` naming concrete surfaces + tenant/authorization model before implementation; correct falsely-checked acceptance criteria.

---

## B. Shared-Platform Tracks (proposed — evidence-gated)

### SP-1 — Observability adapter enforcement
- **Resolves:** CR-02 (F-SA-B02-084), checklist 4.2/4.3, sa-batch-18 (F-SA-B18-003).
- **Scope:** Provide a logger/observability adapter that wraps Sentry + OTel; lint rule forbidding direct `@sentry/nextjs` / `@opentelemetry/sdk-node` in app code. **Shared** because Reading/Primary likely have the same temptation.

### SP-2 — Real Redis/cache adapter
- **Resolves:** HI-04 (F-SA-B23-015/016), ME-08 (F-SA-B22-031), B2 in baseline-patterns.
- **Scope:** Implement a real shared S3/Redis-parity cache adapter; replace in-memory stubs; singleton fallback. **Shared** because the platform layer is meant to be common.

### SP-3 — TenantDB adoption lint/guard
- **Resolves:** the raw-`db` deviation class (B1) across ST-1/ST-2.
- **Scope:** A lint/build guard that flags raw `@reading-advantage/db` imports in app code where `createTenantDB` is expected. **Shared** because Reading/Primary migrations need the same guard.

### SP-4 — Test-fixture tenancy guard
- **Resolves:** CR-04 (F-SA-B04-001/004 etc.), test-gaps tenancy items.
- **Scope:** Shared test helper that requires `schoolId` on FLAT-table fixtures so tenant-isolation tests cannot silently no-op.

---

## C. Prioritization (proposal, not commitment)

| Priority | Tracks | Rationale |
|---|---|---|
| P0 (security) | ST-1, ST-2, SP-1, SP-4 | cross-tenant data exposure + adapter bypass + vacuous tenant tests |
| P1 (correctness/deploy) | ST-3, ST-4, ST-6, SP-2 | broken seed, contract bugs, Prisma in deploy, stub cache |
| P2 (maintainability) | ST-5, SP-3 | decomposition, JSDoc, lint guards |
| P3 (docs/planning) | ST-7, ST-8 | mislead-risk, planning hygiene |

> Final selection is deferred to Measure phase-acceptance (PENDING). This file proposes; it does not authorize or execute.

*No tracks created. No remediation performed. Acceptance/closeout PENDING.*
