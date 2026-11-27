# Test Strategy: Warm Dashboard Performance

Target: `GET https://codecamp.reading-advantage.com/en/` (warm) < 1000ms.
Single P0 surface; treat this as a perf-bug track, not a feature track.

## 1. Testing Pyramid Per Phase

- **Phase 1 (Profiling, P0)** — *no new test code*. Measurement-only: structured
  server timings (logs, Cloud Run request latency, `Server-Timing` headers).
  Output is a profiling note attached to plan.md, not a committed test.
- **Phase 2 (Optimization, P0)** — narrow unit tests for any **new** helper
  (cache-key builder, prefetch resolver, etc.). Do **not** add unit tests for
  `getUserDashboard` shape — that surface is already covered by
  `packages/domain/src/__tests__/codecamp.test.ts` and
  `packages/api/src/__tests__/codecamp-router.test.ts`. If `revalidate` /
  `unstable_cache` is introduced, add one Vitest case asserting the cache key
  includes the tenant + user identity (multi-tenancy guardrail).
- **Phase 3 (Verification, P0)** — re-run the existing Phase 6 prod-smoke
  suite (`apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts`).
  No new black-box probes; the warm `GET /en/` budget and the P1 launch gate
  are already encoded there.

## 2. Shared Fixtures & Mocks

- **DB mock helper:** `packages/domain/src/__tests__/mock-db.ts` (per AGENTS.md
  testing section). Reuse for any new domain-layer test.
- **Existing codecamp-router caller fixture:** `packages/api/src/__tests__/codecamp-router.test.ts`
  already builds a tRPC caller with mock context — reuse if any router-layer
  change is needed.
- **Prod-smoke env contract:** `PHASE6_PROD_URL`, `PHASE6_SKIP=1`,
  `PHASE6_TEST_INTERN_USERNAME`/`_PASSWORD`. Do not invent new env vars.
- **No new fixtures should be created.** This is a perf track; fixture growth
  is a red flag indicating scope creep into a feature track.

## 3. Cross-Phase Edge Cases & Dependencies

- **Cold vs. warm interaction:** the Phase 6 test does *one* warmup fetch
  then measures. Any optimization that improves warm by penalizing cold
  (e.g., aggressive `min-instances=0` + heavier first-request work) must be
  validated against `DASHBOARD_COLD_MS = 3000ms` *and* the separate
  `codecamp_infra_cold_start_20260608` track.
- **Auth wall content:** `app/[locale]/page.tsx` is `"use client"`. The
  warm `GET /en/` response is the unauth login-wall HTML — it does **not**
  call `getUserDashboard` server-side. Domain-layer query optimizations
  will not move the warm budget. Focus Phase 1 profiling here first.
- **Multi-tenancy correctness under caching:** any SSR cache must scope by
  `tenant.schoolId` *and* `user.id` (or be limited to unauth-only shells).
  A cache that leaks across tenants is a P0 security regression — assert
  this in Phase 2 unit tests.
- **Out-of-scope drift:** render-blocking scripts and cold-start are
  *explicitly* separate tracks (spec §Out of Scope). Reject fixes that
  bundle them in.
- **Cache-Control header interaction:** Phase 7 prod-smoke requires
  `s-maxage>0` or `stale-while-revalidate` on `/en/`. Any
  Next.js caching change must preserve those headers — re-run
  `phase-7-cdn-and-caching.test.ts` in Phase 3.

## 4. Architecture Guardrails

- **No business logic in route handlers / pages.** Per AGENTS.md, keep
  optimization in adapters and Next.js cache primitives, not in `page.tsx`.
- **No provider-specific code in app surface.** Cloud Run concurrency
  tuning belongs in deployment config, not in TS source.
- **Adapter neutrality:** if a Redis/edge cache is added, it must go behind
  an interface in `/packages/backend` or `/services/worker`, not directly
  imported from `app/`.
- **No new ESLint disables** to silence cache-related types.

## 5. Per-Phase Test Approach

- **Phase 1:** Add `Server-Timing` instrumentation (or read existing Cloud
  Run logs) to attribute the 1363ms across: TLS, DNS, Next.js render,
  middleware, edge→origin hop. Record findings inline in plan.md.
  *No tests committed.*
- **Phase 2:** TDD any new helper (cache key, prefetch). For Cloud Run
  concurrency / min-instances changes, no test code — they are infra
  config validated by Phase 3 prod-smoke.
- **Phase 3:** Run `pnpm --filter codecamp-advantage test
  phase-6-performance-and-latency` against prod. Pass = warm budget met
  *and* P1 launch-gate test passes. Also re-run
  `phase-7-cdn-and-caching.test.ts` and
  `phase-8-5-deployment-gate.test.ts` to confirm no caching/header
  regression. Cold-start budget (`DASHBOARD_COLD_MS = 3000`) must stay
  green.

## 6. build-graph Findings That Shaped This Strategy

Graph (1972 nodes, 2849 edges, fresh 2026-06-10) was queried via
`stats`, `search`, `inspect`, `callers`:

- `function:getUserDashboard` (`packages/domain/src/codecamp/progress.ts:62`)
  has only 4 incoming edges (1 `contains` from index re-export, 3
  `param_flow`) and **one caller**: `codecamp.dashboard` in
  `packages/api/src/routers/codecamp.ts:261`. Blast radius is narrow →
  domain-layer optimizations are safe and well-scoped, *but* see next
  finding before optimizing the domain layer.
- `apps/codecamp-advantage/app/[locale]/page.tsx` is a client component
  (`"use client"`). The warm `GET /en/` returns the **login wall**, not
  the authed dashboard. `getUserDashboard` runs only after login via
  `trpc.codecamp.dashboard.useQuery`. The warm budget is therefore a
  **Next.js SSR shell + Cloud Run** problem, not a DB-query problem —
  this reframes Phase 2 priorities (SSR cache + concurrency tuning
  beat domain-query optimization here).
- `phase-6-performance-and-latency.test.ts` (27 entities, top-10 file
  by size) already encodes the warm assertion at line 324 and the P1
  launch gate at line 929. **No new prod-smoke test is needed.**
- `dashboardResponseSchema` (`packages/types/src/codecamp.ts`) is the
  output contract; any cache key derived from it must remain stable
  across redeploys — flagged as a Phase 2 unit-test guardrail.
- No graph node exists for a render-cache, edge cache, or prefetch
  helper in `apps/codecamp-advantage/` today — confirming Phase 2 will
  add net-new code that must be linted, typed, and tested per AGENTS.md.

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: codecamp_perf_warm_dashboard_20260608
phase: track setup
commits: none
tests_run: none (strategy-only role)
files_changed: measure/tracks/codecamp_perf_warm_dashboard_20260608/test-strategy.md (new)
plan_updates: none
known_failures: none
handoff: Phase 1 (Profiling) starts here. Implementer must note that GET /en/ warm is the unauth login wall (client component), so the bottleneck is Next.js SSR shell + Cloud Run, NOT getUserDashboard or the DB. Re-run phase-6-performance-and-latency.test.ts AND phase-7-cdn-and-caching.test.ts in Phase 3 to catch header regressions. Any SSR cache must be tenant+user scoped (security P0).
END_MEASURE_AGENT_RESULT
