# Implementation Plan: Warm Dashboard Performance

## Phase 1: Profiling & Root Cause (P0)

- [x] Task: Profile the warm-dashboard request path [commit: 46f88202]
  - [x] Identify which server-side operations dominate the 1363ms budget [commit: 46f88202]
  - [x] Determine if the bottleneck is DB queries, SSR rendering, or network hops [commit: 46f88202]

## Phase 2: Optimization (P0)

- [ ] Task: Implement warm-request optimizations
  - [ ] Evaluate SSR caching of the dashboard shell (Next.js `revalidate` / `unstable_cache`)
  - [ ] Evaluate prefetch of `getUserDashboard` on the auth wall
  - [ ] Evaluate Cloud Run concurrency tuning (min-instances, max-concurrency)

## Phase 3: Verification (P0)

- [ ] Task: Re-run Phase 6 prod-smoke suite
  - [ ] Warm `GET /en/` < 1000ms passes
  - [ ] Phase 6 P1 launch gate passes
  - [ ] No cold-start regression

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

### 6. Status

- Phase 1 tasks: complete (profiling note attached above; no test code
  written, per test-strategy.md §1, §5).
- Phase 2: ready to start. Implementer should re-read this note and
  test-strategy.md §1 Phase 2 bullets before opening the first PR.
