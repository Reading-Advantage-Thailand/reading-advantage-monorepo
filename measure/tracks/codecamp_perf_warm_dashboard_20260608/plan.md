# Implementation Plan: Warm Dashboard Performance

## Phase 1: Profiling & Root Cause (P0)

- [ ] Task: Profile the warm-dashboard request path
  - [ ] Identify which server-side operations dominate the 1363ms budget
  - [ ] Determine if the bottleneck is DB queries, SSR rendering, or network hops

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
