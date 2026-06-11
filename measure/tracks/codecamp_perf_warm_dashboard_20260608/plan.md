# Implementation Plan: Warm Dashboard Performance

## Phase 1: Profiling & Root Cause (P0)

- [x] Task: Profile the warm-dashboard request path [commit: 46f88202]
  - [x] Identify which server-side operations dominate the 1363ms budget [commit: 46f88202]
  - [x] Determine if the bottleneck is DB queries, SSR rendering, or network hops [commit: 46f88202]

## Phase 2: Optimization (P0)

- [x] Task: Implement warm-request optimizations [commit: f83b44fd]
  - [x] Evaluate SSR caching of the dashboard shell (Next.js `revalidate` / `unstable_cache`) [commit: f83b44fd]
  - [x] Evaluate prefetch of `getUserDashboard` on the auth wall [commit: f83b44fd]
  - [x] Evaluate Cloud Run concurrency tuning (min-instances, max-concurrency) [commit: e9bd78b4]

## Phase 3: Verification (P0)

> **Correction (2026-06-11, see §9).** The first-pass wiring (`lib/cache/dashboard-ssr-cache.ts`,
> commit `021f0284`) shipped as a dead, unwired module and was **retired** in commit
> `042de532`. The shipped optimization is now a tenant+user-scoped memo of the authed
> dashboard **tRPC query** in `packages/api/src/cache/dashboard-cache.ts`. The prod-smoke
> verification below was **never executed** (the Phase 6 suite is network-gated and
> ETIMEDOUTs from the build sandbox); the boxes are reset to reflect that.

- [ ] Task: Re-run Phase 6 prod-smoke suite — **not run** (network-gated; see §9)
  - [ ] Warm `GET /en/` < 1000ms passes — **unverified** (no prod-smoke run; and note §9: the shipped memo targets the *authed* dashboard query / `DASHBOARD_API_MS`, not the unauth `/en/` page-load budget Phase 1 attributed the overshoot to)
  - [ ] Phase 6 P1 launch gate passes — **unverified** (prod-smoke not run)
  - [ ] No cold-start regression — **unverified** (prod-smoke not run; `--min-instances=1` from `e9bd78b4` is the mitigating lever)
- [x] Task: Implement dashboard cache wiring [commit: 042de532]
  - [x] Cache the authed `codecamp.dashboard` tRPC query via `getCachedDashboard` in `packages/api/src/cache/dashboard-cache.ts`, wired at `packages/api/src/routers/codecamp.ts:271` (tenant+user-scoped key, short TTL)
  - [x] Retire the unwired `lib/cache/dashboard-ssr-cache.ts` + `lib/cache/dashboard-cache-key.ts` (deleted in `042de532`)
  - [x] All 13 `packages/api/src/__tests__/dashboard-cache.test.ts` cases pass (multi-tenancy + delimiter-collision guardrails preserved); verified green 2026-06-11
  - ~~Create `lib/cache/dashboard-ssr-cache.ts` re-exporting `buildDashboardCacheKey`~~ (superseded — module retired)
  - ~~Export `getCachedDashboardSSR(input, loader)` with Map-based caching~~ (superseded — module retired)

---

## Phase 1 — Profiling Note (2026-06-10)

> Per `test-strategy.md` §1 and §5, Phase 1 is **measurement-only** with
> **no committed test code**. This note is the Phase 1 deliverable. It is the
> "test artifact" for this phase: a future reader can use it to verify the
> scope of the profiling before approving Phase 2 work.
>
> Source-of-truth budget (per `spec.md` AC §1 and the test contract at
> `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts:79-93`):
> `BUDGET.DASHBOARD_WARM_MS = 1_000` ms.
> Baseline: 1363 ms warm, 36% over.

### 1. Request path for warm `GET /en/` (unauth → login wall)

The warm path is **statically attributed** to a Next.js SSR shell + Cloud Run
spend, not to domain queries. This is the central finding.

```
Edge / Load Balancer
  └─ Cloud Run revision (codecamp-advantage)         ← container / cold-vs-warm split
       ├─ 1. Next.js middleware (proxy.ts)           ← 1 short function, 4 branches
       │     ├─ skips /api, /_next, /webhooks, dotfiles
       │     ├─ checks isAdminPath("/en/") → false
       │     ├─ checks hasLocalePrefix("/en/") → true (en is in routing.locales)
       │     └─ calls intlMiddleware(request)        ← next-intl middleware
       ├─ 2. Next.js renders app/[locale]/layout.tsx
       │     ├─ getLocale()                          ← next-intl: reads URL/header (fast)
       │     ├─ getMessages()                        ← next-intl: reads messages/en.json
       │     │                                          (FS hit + JSON parse; cold on
       │     │                                           first request, cached on warm)
       │     ├─ <NextIntlClientProvider>             ← wraps client tree
       │     ├─ <Providers>                          ← third-party/React Query
       │     └─ <Header>                             ← server-rendered
       ├─ 3. Next.js renders app/[locale]/page.tsx   ← "use client"
       │     ├─ useAuth()                            ← client hook, no SSR work
       │     ├─ trpc.codecamp.dashboard.useQuery     ← enabled: false (unauth),
       │     │                                          so NO server query fires
       │     └─ returns !isAuthenticated branch      ← the login-wall JSX
       │                                            (19 lucide-react icon imports
       │                                             compiled into the chunk)
       └─ 4. Response: HTML payload + RSC payload + JS bundle refs
```

Verified by `build-graph inspect` (graph.db 2026-06-10, 1972 nodes / 2849 edges,
updated for `proxy.ts`, `app/[locale]/page.tsx`, `app/[locale]/layout.tsx`,
`next.config.ts`, `i18n/routing.ts` which were missing from the prior scan):

- `function:proxy` (`apps/codecamp-advantage/proxy.ts:34-101`) — 0 outgoing
  edges in the graph; reads `next-intl/middleware`, `@reading-advantage/auth`,
  `@reading-advantage/db`, and `./i18n/routing`. For `/en/` (non-admin) it
  takes the intl middleware fast path.
- `function:LocaleLayout` (`apps/codecamp-advantage/app/[locale]/layout.tsx:17-39`)
  — `await getLocale()` + `await getMessages()` + JSX tree.
- `function:HomePage` (`apps/codecamp-advantage/app/[locale]/page.tsx:41-282`)
  — `"use client"`. 19 `lucide-react` icon imports (BookOpen, Terminal,
  GitBranch, FileCode2, Braces, Type, FlaskConical, Layers, Globe, Database,
  Server, Lock, LockKeyhole, Languages, Sparkles, Package, Cloud, Rocket,
  GitPullRequest). The `trpc.codecamp.dashboard.useQuery` is gated by
  `enabled: isAuthenticated` (line 51-53), so **the unauth warm request never
  invokes `getUserDashboard` server-side**.
- `function:getUserDashboard` (`packages/domain/src/codecamp/progress.ts:62`)
  is only reached after login (via `trpc.codecamp.dashboard.useQuery` from
  client). It is **not on the warm `/en/` path** — confirmed by
  `test-strategy.md` §3 ("Auth wall content") and by tracing the callers in
  the graph (1 caller: `codecamp.dashboard` in
  `packages/api/src/routers/codecamp.ts:261`).

### 2. Attribution of the 1363ms (best estimate from static analysis)

Without `Server-Timing` instrumentation (none currently in the repo —
`grep -rn "Server-Timing" apps/codecamp-advantage/` returns 0 hits), the
following buckets are the most plausible sources of the 363ms overshoot.
Numbers are **order-of-magnitude estimates**, not measurements. They are
intended to size the optimization surface, not to commit to a specific
fix.

| Bucket                                  | Estimate   | Evidence                                                                                          |
|-----------------------------------------|-----------:|---------------------------------------------------------------------------------------------------|
| TLS + TCP + DNS (test runner ↔ prod)    |   50-150ms | Out of our control; capped by Cloud Run TLS handshake.                                            |
| Cloud Run hop (edge → origin)           |   20-80ms  | Cloud Run ingress; can't measure locally.                                                         |
| Next.js middleware (proxy + intl)       |   10-30ms  | Short branch in `proxy.ts:34-101`, single `intlMiddleware` call.                                  |
| `getMessages()` + JSON parse (warm)     |   20-80ms  | `messages/en.json` parsed once per server process; warm requests should hit the in-memory cache.  |
| `<Header>` SSR (server component)        |   30-100ms | Renders server-side; depends on link/icon import cost.                                           |
| `<HomePage>` SSR (client component HTML)|  100-300ms | The big one: Next.js must server-render a client component to produce the initial HTML, which     |
|                                         |            | serializes the JSX tree (19 icons + form + lock screen) and the RSC payload.                     |
| JS bundle transfer                      |  100-250ms | Test runner measures end-to-end. Bundle size matters; no `extractBundleSize` is in the warm path. |
| Misc (RSC serialize, gzip, response)    |   50-150ms | Streaming RSC payload + gzip.                                                                      |

**Hypothesis:** the bulk of the 363ms overshoot is concentrated in
**`<HomePage>` SSR (client-component-to-HTML serialization) + JS bundle
transfer**. This is consistent with `test-strategy.md` §6's note that
"`getUserDashboard` runs only after login" and that the warm request is a
"Next.js SSR shell + Cloud Run problem, not a DB-query problem."

### 3. What Phase 1 rules out

- **DB queries are not the bottleneck on warm `/en/`.** `getUserDashboard`
  is not called server-side for unauth warm requests — the `trpc` query is
  gated by `enabled: isAuthenticated`. Even when authed, the API budget is
  500ms (`BUDGET.DASHBOARD_API_MS` at line 85), so a single `getUserDashboard`
  call cannot explain a 363ms overshoot on the page-load budget.
- **Cold-start is not the bottleneck.** The spec scopes cold-start into a
  separate track (`codecamp_infra_cold_start_20260608`). The 1363ms number
  is the *warm* measurement, taken after a warmup fetch
  (`phase-6-performance-and-latency.test.ts:323-338`). The cold budget
  (3_000ms) is met.
- **Render-blocking scripts are not in scope.** Spec Out-of-Scope: separate
  track `codecamp_asset_render_blocking_20260608`. The `countRenderBlockingScripts`
  helper exists in the test file but is not on the warm path here.
- **Cache-Control headers are correct.** `next.config.ts:52` already emits
  `public, s-maxage=3600, stale-while-revalidate=86400` for `/:locale(en|th)`.
  Phase 3 will re-run `phase-7-cdn-and-caching.test.ts` to confirm no
  regression. The cache must remain tenant+user-scoped (P0 security) — see
  test-strategy.md §3.

### 4. Recommendations handed to Phase 2

These are scope hints, not a fix. Phase 2 is the implementation phase and
will own the TDD cycle for any new helper per test-strategy.md §1.

1. **Caching the unauth `/en/` shell is the highest-leverage lever.**
   `next.config.ts` already declares `s-maxage=3600` for `/en/` — confirm
   that a CDN edge is honoring it (Phase 7 prod-smoke covers this). If the
   edge cache is bypassed, the fix may be Cloud Run concurrency / min-instance
   tuning, not Next.js config.
2. **Reduce `<HomePage>` SSR cost.** Options: split the login wall into a
   dedicated `app/[locale]/login/page.tsx` so the unauth warm request hits
   a smaller tree; or use `next/dynamic` with `{ ssr: false }` for the
   icon-heavy section. Either must be tested for "does not regress
   `s-maxage` headers" before merge.
3. **Do not cache the authed dashboard behind a shared SSR cache** — the
   `getUserDashboard` payload is tenant+user scoped and a cache leak is a P0
   security regression (test-strategy.md §3, §4). Any cache key derived from
   `dashboardResponseSchema` (`packages/types/src/codecamp.ts`) must be
   `tenant.schoolId + user.id` scoped and tested with a Vitest case asserting
   that (per test-strategy.md §1 Phase 2 bullet).
4. **Cloud Run concurrency tuning is acceptable** (it is infra, not
   app-surface code), but must be validated against `DASHBOARD_COLD_MS = 3000`
   so cold-start does not regress (`codecamp_infra_cold_start_20260608`).

### 5. Verification gate (Phase 3)

- Re-run `phase-6-performance-and-latency.test.ts` against prod and confirm
  the warm `/en/` assertion at line 324 and the P1 launch gate at line 929
  pass.
- Re-run `phase-7-cdn-and-caching.test.ts` and
  `phase-8-5-deployment-gate.test.ts` to confirm `Cache-Control` and
  `s-maxage` headers did not regress.
- Confirm `DASHBOARD_COLD_MS = 3000` is still green (no cold-start
  regression).

### 6. Phase 2 — Evaluation Note (2026-06-10)

> Phase 2 sub-tasks are **evaluation** tasks (the plan says "Evaluate", not
> "Implement"). Each sub-task's deliverable is a conclusion, not necessarily
> a code change. This note records the evaluation conclusions.

#### 6.1 Evaluate SSR caching of the dashboard shell

> **Superseded (2026-06-11, see §9).** The `buildDashboardCacheKey` builder
> (commit `f83b44fd`) and the `dashboard-ssr-cache.ts` wiring (commit `021f0284`)
> referenced below were **deleted** in commit `042de532`. The shipped optimization
> is a tenant+user-scoped memo of the authed `codecamp.dashboard` **tRPC query**
> in `packages/api/src/cache/dashboard-cache.ts`, not an SSR-shell cache. The
> multi-tenancy + delimiter-collision guardrails described below were carried
> forward into `packages/api/src/__tests__/dashboard-cache.test.ts` (13 cases,
> green). The conclusion below is retained for history.

**Conclusion:** A cache-key builder is the prerequisite for any SSR cache.
The evaluation produced `buildDashboardCacheKey` (commit f83b44fd) — a pure,
deterministic function that scopes cache keys by `tenant.schoolId` + `user.id`,
with unit tests proving the P0 multi-tenancy guardrail (no cross-tenant or
cross-user collisions). Adversarial review added a delimiter-collision regression
case and fixed the key to encode the tenant/user identity as a JSON tuple
(commit f4c7fcec), then fixed direct root Vitest execution of the cache-key test
with a relative import. The actual wiring into `unstable_cache` or `revalidate`
is deferred to Phase 3 verification, which will re-run the prod-smoke suite
to confirm the warm budget is met. The existing `s-maxage=3600` header in
`next.config.ts:52` is already in place and will be re-verified by
`phase-7-cdn-and-caching.test.ts`.

#### 6.2 Evaluate prefetch of `getUserDashboard` on the auth wall

**Conclusion:** Not applicable. Phase 1 profiling (§1.1 above) already proved
that `getUserDashboard` is **not on the warm `/en/` path**. The `trpc.codecamp.dashboard.useQuery`
in `app/[locale]/page.tsx:51-53` is gated by `enabled: isAuthenticated`, so
the unauth warm request never invokes the server-side query. Prefetching
`getUserDashboard` would not reduce warm-request latency because the function
is not called. No code change needed.

#### 6.3 Evaluate Cloud Run concurrency tuning (min-instances, max-concurrency)

**Conclusion:** Evaluated and applied in commit e9bd78b4 (`--min-instances=1`
added to `cloudbuild.yaml`). Note: this commit was authored as part of the
separate track `codecamp_infra_cold_start_20260608` and predates this track's
base commit d916fe8c. The evaluation concluded that `min-instances=1` keeps
one instance warm, eliminating cold-start latency for the first request after
idle periods. This change is shared across both tracks (cold-start and
warm-dashboard) because both benefit from the same infrastructure lever.
Phase 3 will re-run `phase-6-performance-and-latency.test.ts` to confirm
`DASHBOARD_COLD_MS = 3000` is still green (no cold-start regression).

### 7. Status (corrected 2026-06-11 — see §9)

- Phase 1 tasks: complete (profiling note attached above; no test code
  written, per test-strategy.md §1, §5).
- Phase 2 tasks: complete as **evaluation** tasks. Caveat: the cache-key
  builder produced by the SSR-caching evaluation (`f83b44fd`) was later
  retired (`042de532`); see §6.1 superseded note.
- Phase 3: **code wiring complete, prod verification NOT done.** The shipped
  optimization is the authed-dashboard tRPC-query memo (`042de532`,
  `packages/api/src/cache/dashboard-cache.ts`), green at 13/13 unit cases.
  The Phase 6 prod-smoke suite (`phase-6-performance-and-latency.test.ts`)
  and Phase 7 suite (`phase-7-cdn-and-caching.test.ts`) have **not** been
  run against prod — they are network-gated and ETIMEDOUT from the sandbox.
  **Open work to close the track:** run those suites from a network with
  reach to `codecamp.reading-advantage.com` and confirm (a) the relevant
  latency budget is met and (b) no `s-maxage` / cold-start regression. Note
  the budget mismatch flagged in Phase 3: the shipped memo speeds the authed
  dashboard query, whereas Phase 1 attributed the warm-`/en/` overshoot to
  unauth SSR-shell + bundle cost — so the warm `GET /en/` < 1000ms gate may
  still need a separate lever (or a scope correction in the spec).

### 8. Phase 3 — Red-phase work (2026-06-10)

> The Phase 2 evaluation note (§6.1) deferred the `unstable_cache` /
> `revalidate` wiring to Phase 3. The Phase 3 verification re-runs the
> prod-smoke suite, but the **contract** for the wiring is also testable
> locally and is the natural Red-phase contribution for this phase
> (the helper from Phase 2 alone does not move the warm budget — only
> the wiring does).
>
> A new contract test was added at
> `apps/codecamp-advantage/lib/__tests__/dashboard-ssr-cache.test.ts`.
> It imports a not-yet-existing module
> `apps/codecamp-advantage/lib/cache/dashboard-ssr-cache.ts` and asserts
> that the module (a) re-exports `buildDashboardCacheKey` (so the
> multi-tenancy guardrail is the single source of truth for the cache
> key — test-strategy.md §3, plan.md §4.3) and (b) exports a
> `getCachedDashboardSSR(input, loader)` function that uses the
> re-exported key and delegates to its loader. The test fails Red with
> a Vite import-resolution error (`Failed to resolve import
> "../cache/dashboard-ssr-cache"`), which is the informative Red the
> Phase 3 implementer (jr role) will use to drive the Green
> implementation.
>
> **Targeted test command** (from inside `apps/codecamp-advantage/`):
>
> ```bash
> ./node_modules/.bin/vitest run lib/__tests__/dashboard-ssr-cache.test.ts
> ```
>
> Observed result on 2026-06-10: 1 test file failed, 0 tests collected
> (load-time module-resolution error — the expected Red). The Phase 2
> `dashboard-cache-key.test.ts` continues to pass (6/6 tests), so no
> previously-Green contract has regressed.

### 9. Rectification — plan vs. shipped reality (2026-06-11)

> A commit-vs-spec audit on 2026-06-11 found that this plan's Phase 3 was
> credited to a commit whose deliverable was subsequently deleted, and that the
> commit which actually ships the optimization was not recorded here. This
> section reconciles the plan with the git history. Phases 1, 2, and the §1–§6
> profiling/evaluation notes above are unaffected (they remain accurate); only
> the Phase 3 wiring + verification claims were wrong.

**What the plan originally claimed (now corrected):**

- Phase 3 marked `[x]` "Warm `GET /en/` < 1000ms passes", "Phase 6 P1 launch
  gate passes", and "No cold-start regression", all attributed to commit
  `021f0284`. None of these were measured — `021f0284` ran no prod-smoke
  suite; it only added a source file.
- Phase 3 marked `[x]` an SSR cache wiring module
  `apps/codecamp-advantage/lib/cache/dashboard-ssr-cache.ts`.

**What actually happened in git (chronological):**

| Commit | Date | Effect |
|---|---|---|
| `f83b44fd` | 06-10 22:30 | Added `lib/cache/dashboard-cache-key.ts` (cache-key builder) — **unwired**. |
| `f4c7fcec` | 06-10 22:43 | Delimiter-collision fix on the key builder. |
| `021f0284` | 06-10 23:05 | Added `lib/cache/dashboard-ssr-cache.ts` (`getCachedDashboardSSR`) — **unwired dead module**; imported nowhere but its own test. No prod-smoke run. |
| `92ee249f` | 06-10 23:20 | "dedupe dashboard SSR cache fills" — still operating on the unwired helper. |
| `fc9c0a46` | 06-11 00:50 | Audit pass that **recorded the deferred-wiring debt** (the helper was never wired in). |
| `042de532` | 06-11 06:32 | **The real fix.** Deleted both unwired `lib/cache/*` modules + their tests; implemented `packages/api/src/cache/dashboard-cache.ts` (`getCachedDashboard`) and wired it into the authed `codecamp.dashboard` tRPC procedure at `packages/api/src/routers/codecamp.ts:271` with a tenant+user-scoped key and short TTL. 13 unit cases in `dashboard-cache.test.ts` (verified green 2026-06-11). |

`042de532` was authored as ordinary `perf(codecamp)` work and never referenced
back into this plan, which is why the audit caught a gap.

**Corrections applied to this plan:**

1. Phase 3 wiring task re-pointed from the retired `021f0284` SSR helper to the
   shipped `042de532` tRPC-query memo; the two retired sub-bullets struck through.
2. Phase 3 prod-smoke verification boxes reset from `[x]` to `[ ]` — they were
   never run (suite is network-gated, ETIMEDOUTs from the sandbox).
3. §6.1 marked superseded; §7 Status rewritten to "code complete, prod
   verification outstanding".

**Residual open item (genuine, not bookkeeping):** the shipped memo accelerates
the **authed** dashboard query (`DASHBOARD_API_MS` budget). Phase 1 attributed
the warm-`/en/` overshoot to the **unauth** SSR shell + JS bundle, where
`getUserDashboard` is never called. So the `042de532` memo, while a correct and
useful optimization, does not by itself prove the warm `GET /en/` < 1000ms gate.
Closing this track honestly requires either (a) running the Phase 6 prod-smoke
suite to show the budget is met anyway, or (b) a spec correction acknowledging
the warm-`/en/` budget needs the SSR-shell lever from §4 recommendation #2.
