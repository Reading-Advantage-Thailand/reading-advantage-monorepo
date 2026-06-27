# Executive Summary: Science Advantage Full Review

> **Track:** `science_advantage_review_20260626`
> **Parent:** `monorepo_feature_review_masterplan_20260626`
> **Baseline SHA:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> **Status:** Review synthesis complete. **No remediation was performed.** **Phase 4 acceptance and closeout are PENDING.** All `plan.md` tasks remain `[b]` (deferred:review-execution).

## What this review covered

A line-by-line review of the entire tracked `apps/science-advantage` source tree.

| Metric | Value |
|---|---:|
| In-scope tracked files | 738 |
| Batches | 37 |
| Reports produced | 37 |
| Total report lines | 14,240 |
| Unique finding IDs | 922 |

Science Advantage is the newest app, built mostly inside the monorepo and already through a compliance pilot and multiple remediation tracks. The review's job (per `spec.md`) was to verify those patterns held, find remaining gaps, and identify reusable golden-path patterns for the Reading and Primary migrations.

## Headline verdict

**The shared architecture largely held, but with a consistent and exploitable gap: tenant scoping and authorization are absent in several non-route code paths, and the test suite's tenant-isolation coverage is vacuous because fixtures omit `schoolId`.** The single largest *volume* of findings is stale documentation and planning artifacts — high in count but not running code.

### The good (verified golden paths to carry forward)
- Thin server pages with `requireRole()` (19/20 in sa-batch-01).
- Domain-function `{ user, tenant, input }` contract with `assertCan()` inside the domain (all 8 routes in sa-batch-05).
- Correct `createTenantDB` usage on teacher pages (sa-batch-02 files 10, 12).
- Zod at boundaries; `runWithRequestContext` observability wrapper.
- An **exemplary** DSAR export feature with cross-tenant isolation tests (sa-batch-02).
- Integration harness with isolated `_test` DB + Drizzle migrate (sa-batch-36).

Detail and evidence: `baseline-patterns.md`.

### The concerning (runtime/code — see `findings.md` Part I)
1. **Cross-tenant gamification mutation** — `awardXp`/`updateStreakForProfile` have no authorization and no tenant scoping (sa-batch-22). *Critical.*
2. **Direct Sentry SDK import** in the AI recommendations route — adapter bypass (sa-batch-02). *Critical.*
3. **Vacuous tenant-isolation tests** — fixtures omit `schoolId`, so TenantDB filtering is a no-op under test (sa-batch-04, -25, -32, -35). *Critical.*
4. **`lib/services/**` and `getClassDetailWithCurriculum`** query FLAT tables with raw `db`, no auth, no `schoolId` (sa-batch-24, -02). *High.*
5. **Redis platform layer is a permanent stub** — cache effectively non-functional in production (sa-batch-23). *High.*
6. **Grade-4 seed data violates the seeder's Zod contract** — `pnpm seed --grade=4` would hard-fail (sa-batch-33). *High.*
7. **Seed scripts unsafe by default** — hardcoded weak passwords, no env guard, missing `schoolId` (sa-batch-32, -35). *High.*
8. **Build/deploy still invokes Prisma** in `vercel.json` (sa-batch-36). *High.*
9. Pages with no server-side auth gate; route/schema contract mismatches; business logic in components; systemic missing JSDoc.

### The misleading (stale docs/planning — see `findings.md` Part II)
- **Prisma→Drizzle** stale references across `GEMINI.md`, `README.md`, `tech-stack.md`, templates, and many archived/active track plans.
- **Google-OAuth/NextAuth** auth-model drift in docs and a closed-track spec — including **checked acceptance criteria that are not verifiably true** (sa-batch-26).
- **Placeholder/boilerplate specs** for the two highest-risk tracks (`redis_actual_integration`, `teacher_dashboard_surfaces`).
- These are not running-code vulnerabilities; many archive files carry `status: deprecated`. They matter because new agents can still trust them.

## Runtime vs documentation split (why it matters)

Roughly: the **High/Critical live-code** findings concentrate in `lib/gamification/**`, `lib/services/**`, the recommendations route, the Redis layer, and the seed pipeline. The **bulk volume** (Medium/Low/Info) is documentation and planning drift in batches 11–17 and 26–31. Remediation effort should be weighted to the small live-code set first; documentation truth-up is high-value but lower-risk. See `migration-tracks.md` for the proposed P0–P3 split.

## Proposed remediation (PROPOSALS ONLY — nothing created or done)
- **P0 security:** gamification authz/tenancy; `lib/services` authz/tenancy; observability-adapter enforcement; test-fixture tenancy guard.
- **P1 correctness/deploy:** seed-data contract & safety; route/contract fixes; de-Prisma build; real cache adapter.
- **P2 maintainability:** component decomposition + JSDoc; TenantDB lint guard.
- **P3 docs/planning:** documentation truth-up; track-spec hardening.

Shared-platform candidates (Reading/Primary too): observability adapter, real cache adapter, TenantDB lint guard, test-fixture tenancy helper.

## Explicit non-claims
- No application code, test, config, doc, or seed file was modified during this review.
- No finding is marked remediated or fixed.
- No Measure phase was accepted or closed. **Phase 4 acceptance and closeout are PENDING.**
- Aggregate severity counts are derived from heterogeneous per-batch rubrics; `findings.md` is authoritative for the deduplicated defect set.

## What Phase 4 (PENDING) should do
1. Run `lint`/`check-types`/`test`/`build` gates for `apps/science-advantage` and record results.
2. Confirm `pnpm seed --grade=4` failure (F-SA-B33-001/002).
3. Confirm tenant-test no-op (F-SA-B04-001/004).
4. Spot-execute cross-tenant XP/streak path (F-SA-B22-003).
5. Decide which findings enter the final monorepo roadmap.

## Artifact index
`line-review-synthesis.md` · `00-inventory.md` · `workflow-map.md` · `baseline-patterns.md` · `checklist.md` · `findings.md` · `migration-tracks.md` · `test-gaps.md` · `executive-summary.md`.

*Executive summary complete. No remediation performed. Acceptance/closeout PENDING.*
