# Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or summarize resolved items when they no longer need to influence near-term planning.
>
> **Severity:** `Critical` | `High` | `Medium` | `Low`
> **Status:** `Open` | `Resolved`

| Date | Track | Item | Severity | Status | Notes |
|------|-------|------|----------|--------|-------|
| 2026-04-29 | monorepo-scaffold | advantage-games ESLint 6236 warnings | Low | Open | Pre-existing code has many `prefer-const`, `no-undef`, and `no-explicit-any` warnings. |
| 2026-04-29 | monorepo-scaffold | react-konva peer dependency warning (wants react 19.2.0, app has 19.1.0) | Low | Open | Doesn't block builds. Consider upgrading React to 19.2.x across the monorepo. |
| 2026-05-01 | migrate-reading-advantage | reading-advantage `ignoreBuildErrors: true` / `ignoreDuringBuilds: true` | Medium | Open | Temporarily enabled to pass build. Cannot verify removal due to build hanging on resource-constrained hardware. |
| 2026-05-01 | migrate-reading-advantage | reading-advantage: 26 failed test suites (91 tests), 50 passing | Medium | Open | Pre-existing from original repo. Workspace package resolution fixed (jest moduleNameMapper). Game component tests fail due to Zustand v4 store mocking patterns. |
| 2026-05-01 | migrate-reading-advantage | reading-advantage: zustand v4 vs v5 in monorepo | Medium | Open | App uses zustand v4, advantage-games uses v5. Align when reading-advantage is ready for v5 migration. |
| 2026-05-01 | migrate-primary-advantage | primary-advantage: `ignoreBuildErrors: true` / `ignoreDuringBuilds: true` | Medium | Open | Temporarily enabled. |
| 2026-05-02 — 2026-05-05 | (multiple tracks) | 14 resolved items from early-May tracks | — | **Resolved** | Summary: shared_backend API build fixes, auth migration cleanups, audit remediation, firestore stubbing, flaky test thresholds. All stable; see git history for details. |
| 2026-05-02 | shared_config | No visual regression tests for Tailwind v4 migration | Low | Open | All 5 apps migrated to v4 but no screenshot-based regression tests. Deferred from shared_config_consolidation. |
| 2026-05-02 | i18n_migration | No shared i18n types across apps | Low | Open | Each app defines its own Locale type. @reading-advantage/config should export shared Locale and message shape. Deferred from shared_config_consolidation. |
| 2026-05-03 | firestore_drizzle | reading-advantage controllers still use Prisma not Drizzle | High | **Deferred** | user-controller, license-controller, generator-controller all use `prisma.*`. Deferred to future "Prisma→Drizzle Schema Alignment" track. |
| 2026-05-03 | science_auth | science-advantage non-auth Prisma still in use | Medium | Open | Curriculum, lessons, gamification, classes still use `prisma.*` directly. Auth tables migrated to Drizzle; non-auth deferred. |
| 2026-05-03 | auth_strategy_review | science-advantage: ignoreBuildErrors: true added for pre-existing Next.js workspace type mismatch | Medium | Open | Two next@16 instances with different peer dep contexts cause type conflicts. Temporary until Next.js unified across monorepo. |
| 2026-05-14 | codecamp_curriculum | vocabulary-games: 16 pre-existing test failures (4 suites) | Medium | Open | Babel Architect compliance, WebSocket room integration, AlchemistsSynthesis i18n mocking, GriffinSkyJoust randomness. Fixed 11 failures; remaining need dedicated tracks. |
| 2026-05-14 | codecamp_advantage | `reviewExercise` domain function has no tRPC router procedure | High | **Resolved** | `reviewExercise` tRPC procedure added in 737bef8. Output uses `reviewResultSchema`. |
| 2026-05-14 | codecamp_advantage | Mock-DB tests don't catch real DB constraint violations | Medium | Open | createInternAccount bug (bad column, missing PK) passed all mock tests. Need integration tests against real DB for critical paths. |
| 2026-05-14 | codecamp_curriculum | Old placeholder curriculum modules remain in existing DBs | Medium | Open | Old 5 modules not removed by new seed. Need cleanup migration/script before prod. |
| 2026-05-14 | codecamp_curriculum | `checkModulePrerequisite` uses fragile order-based logic | Medium | Open | Finds previous module via `order - 1`. Breaks if module order gaps exist or modules are reordered. Should use explicit `prerequisiteModuleId` column. |
| 2026-05-14 | codecamp_curriculum | `listInterns` fetches all PR reviews and progress into memory unfiltered | Medium | **Resolved** | Fixed: both queries now use `inArray` on intern IDs to filter at the DB layer. |
| 2026-05-15 | codecamp_advantage | `createInternAccount` lacks server-side password complexity rules | Low | Open | Router schema enforces min(8) but domain has no policy for complexity (uppercase, numbers, etc). Client-side also checks length only. |
| 2026-05-15 | codecamp_advantage | `listInterns` and `getInternProgress` quiz scores count all progress rows, not just quizzes | Low | Open | Both filter by score > 0 without checking lesson type. Exercise submissions inflate quiz averages. Need join with lessons or add lessonType to progress table. |
| 2026-05-15 | codecamp_advantage | `createPrReview` uses weak `codecamp:read` permission | High | Open | Any authenticated user can create fake PR reviews via tRPC. Need separate `codecamp:pr:create` permission or internal webhook-only function. |
| 2026-05-15 | codecamp_advantage | GitHub webhook handler cannot create PR review entries for new PRs | High | **Resolved** | Full pipeline implemented in 737bef8: username mapping, repo lookup, LLM review, PR comments. |
| 2026-05-15 | codecamp_advantage | LLM mock review fallback auto-approves PRs when OPENROUTER_API_KEY missing | Medium | **Resolved** | Changed mock fallback to return `passed: false` with a clear summary. Fixed in both `packages/webhooks/src/github.ts` and `packages/api/src/routers/codecamp.ts`. |
| 2026-05-15 | codecamp_advantage | Hardcoded `moduleSlug === "real-world-practice"` for Module 18 workflow tracker | Medium | Open | WorkflowTracker receives hardcoded `issueTitle`/`issueNumber`. Needs live GitHub Issues API fetch once practice repo is set up. |
| 2026-05-15 | codecamp_advantage | Multiple PR reviews render duplicate WorkflowTrackers in lesson page | Medium | Open | When `moduleReviews.length > 1`, each review gets its own tracker with identical hardcoded issue headers. UX confusing with multiple exercise repos. Needs design decision. |
| 2026-05-15 | codecamp_advantage | No server-side route protection for `/admin` paths in middleware.ts | Medium | Open | Next.js middleware is a no-op. Admin pages only gated client-side and via tRPC auth. Adding server-side redirect would harden the surface. |
| 2026-05-15 | codecamp_advantage | PR URL parsing logic duplicated across 3 components | Low | Open | `getPrDisplayName` in review-history.tsx, `getPrRepoName` in fork-instruction.tsx, and inline `.split("/").slice(-4)` in admin page all do similar URL shortening. Should extract to shared util. |
| 2026-05-15 | codecamp_advantage | Chat API uses in-memory rate limiter with unbounded growth | Medium | Open | `apps/codecamp-advantage/app/api/chat/route.ts` uses a `Map<string, RateLimitEntry>` with no cleanup. Old entries accumulate indefinitely. Not safe across serverless instances. Should migrate to Redis or a bounded LRU cache. |
