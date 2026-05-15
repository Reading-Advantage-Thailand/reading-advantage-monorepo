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
| 2026-05-03 | auth_strategy_review | science-advantage: ignoreBuildErrors: true for type mismatch | Medium | Open | Two next@16 instances with different peer dep contexts cause type conflicts. Temporary until Next.js unified. |
| 2026-05-14 | codecamp_curriculum | vocabulary-games: 16 pre-existing test failures (4 suites) | Medium | Open | Babel Architect compliance, WebSocket room integration, AlchemistsSynthesis i18n mocking, GriffinSkyJoust randomness. |
| 2026-05-14 | codecamp_advantage | Mock-DB tests don't catch real DB constraint violations | Medium | Open | Requires real-DB integration test infrastructure. Seed data provides foundation, but building test-DB machinery is significant work. Deferred: not addressed in Phase 7 Final. |
| 2026-05-14 | codecamp_curriculum | Old placeholder curriculum modules remain in existing DBs | Medium | Open | Phase 5 seed complete — full 18-module data available for fresh DBs. Existing DB cleanup is an operational task outside this codebase. |
| 2026-05-14 | codecamp_curriculum | `checkModulePrerequisite` uses fragile order-based logic | Medium | **Resolved** | Fixed: uses `lt(order)` + `desc()` + `limit(1)` with `eq(status, "published")` to find the highest preceding published module. |
| 2026-05-15 | codecamp_advantage | `createInternAccount` lacks server-side password complexity rules | Low | **Resolved** | Added `PASSWORD_COMPLEXITY` regex requiring uppercase + lowercase + digit. Domain function rejects weak passwords before hashing. |
| 2026-05-15 | codecamp_advantage | `listInterns`/`getInternProgress` quiz scores count all progress rows | Low | **Resolved** | Fixed: both functions now join progress with lessons and filter by `lesson.type === "quiz"` before averaging. |
| 2026-05-15 | codecamp_advantage | Module 18 WorkflowTracker hardcoded issue data | Medium | **Resolved** | Fixed: grouped by exerciseRepoId, using repo description as title and order as number. Full GitHub Issues API integration still deferred (requires external repo setup). |
| 2026-05-15 | codecamp_advantage | Multiple PR reviews render duplicate WorkflowTrackers | Medium | **Resolved** | Fixed: reviews now grouped by exerciseRepoId, rendering one tracker per exercise with the latest review status. |
| 2026-05-15 | codecamp_review | Quiz auto-progress uses raw `fetch()` bypassing tRPC type safety | Medium | **Resolved** | Removed redundant raw fetch; `submitQuizAnswers` domain function already persists progress. |
| 2026-05-15 | codecamp_review | `contentJson` schema validation missing in LessonContent | Low | Open | Seed data is the canonical source; content controlled by code not user input. Adding Zod schemas is feasible but low urgency — defensive runtime guards in place. |
| 2026-05-15 | codecamp_review | `createInternAccount` sets `schoolId: null` (no tenant association) | Low | **Resolved** | Documented: codecamp interns are global, not school-scoped. Explicit comment added to domain function. May introduce synthetic "codecamp" tenant later. |
| 2026-05-15 | codecamp_review | `getExerciseRepos` generates repos for modules without exercises | Low | **Resolved** | M18 now shows exercise repos for theory lessons (real-world practice workflow). M1 (dev environment) intentionally has no exercises. |
| 2026-05-15 | codecamp_review | Chat route constructs `UserContext` with unsafe `as` casts | Low | **Resolved** | Fixed: passes `session.user` directly — it is already typed as `UserContext` from `requireAuth`. |
| 2026-05-15 | codecamp_review | `getChatContext` leaks unpublished module/lesson titles | Low | **Resolved** | Fixed: module query now includes `eq(status, "published")`; lesson query validates parent module status before including context. |
| 2026-05-15 | codecamp_review | Duplicate `generateReview` LLM implementation | Medium | Open | Extracting shared helper to `@reading-advantage/domain` would couple domain to OpenRouter SDK. Both callers inject `generateReview` into `reviewExercise`. Needs coordinated package changes. |
| 2026-05-15 | codecamp_review | No integration tests for webhook → LLM → comment → DB pipeline | Medium | Open | Fire-and-forget async pattern means E2E happy path untested. Requires test database infrastructure and Redis for rate limiting. |
| — | **Resolved in this track** | | | | |
| 2026-05-15 | codecamp_review | No server-side route protection for `/admin` paths | High | **Resolved** | Middleware now redirects unauthenticated users. `adminProcedure` enforces ADMIN/SYSTEM role at tRPC layer. |
| 2026-05-15 | codecamp_review | `createPrReview` uses weak `codecamp:read` permission | High | **Resolved** | Changed to `codecamp:submit` + repo existence validation. |
| 2026-05-15 | codecamp_review | `reviewExercise` router has redundant inline role check | Low | **Resolved** | Removed inline role check; now uses `adminProcedure`. |
| 2026-05-15 | codecamp_review | Chat API uses in-memory rate limiter with unbounded Map growth | Medium | **Resolved** | Replaced with bounded rate limiter with max entries and TTL cleanup. Note: still instance-local; needs Redis for multi-instance deployments. |
| 2026-05-15 | codecamp_curriculum | `isModuleLocked` frontend uses `order - 1` while domain uses `lt(order)` | Low | **Resolved** | Aligned both: frontend now finds highest preceding published module; backend filters by `published`. Consistent gap handling. |