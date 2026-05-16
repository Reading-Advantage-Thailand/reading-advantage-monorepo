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
| 2026-05-01 | migrate-reading-advantage | reading-advantage: 26 failed test suites (91 tests), 50 passing | Medium | Open | Pre-existing from original repo. Game component tests fail due to Zustand v4 store mocking patterns. |
| 2026-05-01 | migrate-reading-advantage | reading-advantage: zustand v4 vs v5 in monorepo | Medium | Open | App uses zustand v4, advantage-games uses v5. Align when reading-advantage is ready for v5 migration. |
| 2026-05-01 | migrate-primary-advantage | primary-advantage: `ignoreBuildErrors: true` / `ignoreDuringBuilds: true` | Medium | Open | Temporarily enabled. |
| 2026-05-02 | shared_config | No visual regression tests for Tailwind v4 migration | Low | Open | Deferred from shared_config_consolidation. |
| 2026-05-02 | i18n_migration | No shared i18n types across apps | Low | Open | Each app defines its own Locale type. @reading-advantage/config should export shared Locale and message shape. |
| 2026-05-03 | firestore_drizzle | reading-advantage controllers still use Prisma not Drizzle | High | Open | Deferred to future "Prisma→Drizzle Schema Alignment" track. |
| 2026-05-03 | science_auth | science-advantage non-auth Prisma still in use | Medium | Open | Curriculum, lessons, gamification, classes still use `prisma.*` directly. Auth tables migrated. |
| 2026-05-03 | auth_strategy_review | science-advantage: ignoreBuildErrors: true for type mismatch | Medium | Open | Two next@16 instances cause type conflicts. Temporary until Next.js unified. |
| 2026-05-14 | codecamp_curriculum | vocabulary-games: 16 pre-existing test failures (4 suites) | Medium | Open | Outside curriculum track scope — vocabulary-games package issue, not codecamp-advantage. |
| 2026-05-14 | codecamp_advantage | Mock-DB tests don't catch real DB constraint violations | Medium | Open | Requires Testcontainers/Docker-based integration test infra. Deferred: significant infra work beyond any single track; separate test-infra track required. Phase 2 review confirmed no progress. |
| 2026-05-15 | codecamp_review | `contentJson` schema validation missing in LessonContent | Low | Open | Seed data is canonical source; defensive runtime guards in place (typeof check + fallback to {}). Not in exercise-repos scope — Zod schema addition deferred: requires defining full contentJson shape (sections, blocks) across 85+ lessons. |
| 2026-05-15 | codecamp_review | Duplicate `generateReview` LLM implementation | Medium | Open | Two identical OpenRouter implementations: `webhooks/github.ts:41` and `api/routers/codecamp.ts:405`. Domain `reviewExercise` uses DI correctly. Fix: extract shared impl to a new `@reading-advantage/llm` or similar package. Deferred: requires coordinated package dependency changes across 3 packages. |
| 2026-05-15 | codecamp_review | No integration tests for webhook → LLM → comment → DB pipeline | Medium | Open | Fire-and-forget async pattern untested. Requires test DB infrastructure and Redis. Not in exercise-repos scope. Phase 2 review confirmed: no progress — deferred to infra track. |
| 2026-05-15 | codecamp_thai_i18n_20260515 | Type-safe next-intl translation keys not configured | Medium | Open | Phase 4 complete — all keys extracted. Type generation requires next-intl plugin config. Deferred: needs dedicated follow-up track for lesson-page localization + type-safety setup. |
| 2026-05-15 | codecamp_thai_i18n_20260515 | `proxy.ts` admin guard checks cookie existence only, not token validity or ADMIN role | High | Open | Not in i18n scope. Requires Edge-compatible session verification + role check. Auth uses DB-backed opaque tokens (not JWTs) — proxy can't decode locally. Needs DB query in proxy or token redesign. |
| 2026-05-16 | codecamp_thai_i18n_20260515 | Lesson page has extensive hardcoded English strings | Medium | Open | Phase 4 confirmed: ~20 hardcoded strings in lesson/[id]/page.tsx. Requires dedicated follow-up pass for locale key extraction + component wiring. Deferred: not in current i18n scope. |
| 2026-05-16 | codecamp_exercise_repos_20260515 | Phase 3 exercise repos (M11–15, 17) not created on GitHub | Medium | Resolved | All 6 exercise repos + capstone created and pushed. Solution branches on M11–15, M17. 8 practice issues filed on M18 capstone. |
| 2026-05-16 | codecamp_exercise_repos_20260515 | Webhook async LLM review pipeline has no retry or dead-letter queue | Medium | Open | Error handling marks review as "reviewed" with error note, but transient failures are not retried. Requires BullMQ/Redis job queue. Deferred to infra track — Phase 2 review confirmed no progress. |
| 2026-05-16 | codecamp_exercise_repos_20260515 | `getInstallationTokenForRepo` uses single `GITHUB_INSTALLATION_ID` | Low | Open | Works for single-org setup. Fix: accept `owner` param, call GitHub API to list installations dynamically. Deferred: not needed until multi-org support; requires API call changes + test updates across packages/webhooks. |
| 2026-05-16 | codecamp_exercise_repos_20260515 | `fork-instruction.tsx` missing M1/M18 edge case UI handling | Medium | Open | M1 should show "setup only" message; M18 should link to practice Issues. Requires translation keys (en+th) + component logic + tests. Deferred: not a quick fix — plan Phase 6 explicitly defers this. |
| 2026-05-16 | codecamp_exercise_repos_20260515 | `WorkflowTracker` hardcoded issue data on Module 18 lesson page | Medium | Open | Needs `getPracticeIssues()` domain function calling GitHub Issues API. Requires new domain fn, tRPC router, API tests, and frontend wiring. Deferred to follow-up track — Phase 2 review confirmed no progress. |
| 2026-05-16 | codecamp_exercise_repos_20260515 | End-to-end manual test (fork → PR → review) not completed | Medium | Open | Blocked: requires Phase 3 repos on GitHub (only M2–10 exist from Phase 2). Verify webhook → LLM → comment → DB pipeline end-to-end once all repos are available. |
