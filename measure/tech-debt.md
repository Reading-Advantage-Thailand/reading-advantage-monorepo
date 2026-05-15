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
| 2026-05-14 | codecamp_advantage | Mock-DB tests don't catch real DB constraint violations | Medium | Open | Requires Testcontainers/Docker-based integration test infra. Deferred from exercise-repos Phase 1 — significant infra work needed; separate test-infra track required. |
| 2026-05-14 | codecamp_curriculum | Old placeholder curriculum modules remain in existing DBs | Medium | Open | Operational/deployment task. Seed script is idempotent; fresh DBs get correct 18-module data. No code change needed. |
| 2026-05-15 | codecamp_review | `contentJson` schema validation missing in LessonContent | Low | Open | Seed data is canonical source; defensive runtime guards in place. Not in exercise-repos scope — Zod schema addition deferred. |
| 2026-05-15 | codecamp_review | Duplicate `generateReview` LLM implementation | Medium | Open | Extracting shared helper couples domain to OpenRouter SDK. Not in exercise-repos scope — needs coordinated package changes in a follow-up track. |
| 2026-05-15 | codecamp_review | No integration tests for webhook → LLM → comment → DB pipeline | Medium | Open | Fire-and-forget async pattern untested. Not in exercise-repos scope — requires test DB infrastructure and Redis. |
| 2026-05-14 — 2026-05-15 | codecamp_curriculum + codecamp_review | 16 resolved items from codecamp tracks | — | **Resolved** | Summary: schema fixes, auth hardening, quiz score filtering, chat context guards, rate limiter bounds, prerequisite alignment, exercise repo filtering, password complexity, schoolId docs, type safety, admin route protection. |
| 2026-05-15 | codecamp_thai_i18n_20260515 | Locale-prefixed routes return 404; root `/` does not redirect to `/th/` | High | **Resolved** | Fixed: pages moved to `app/[locale]/`, root layout simplified, locale-aware layout handles rendering. Root `/` correctly redirects to `/th/`. |
| 2026-05-15 | codecamp_thai_i18n_20260515 | Type-safe next-intl translation keys not configured | Medium | Open | Phase 4 complete — all keys extracted. Type generation requires next-intl plugin config. Deferred: needs dedicated follow-up track for lesson-page localization + type-safety setup. |
| 2026-05-15 | codecamp_thai_i18n_20260515 | `proxy.ts` admin guard checks cookie existence only, not token validity or ADMIN role | High | Open | Not in i18n scope. Requires Edge-compatible session verification + role check. Auth uses DB-backed opaque tokens (not JWTs) — proxy can't decode locally. Needs DB query in proxy or token redesign. |
| 2026-05-16 | codecamp_thai_i18n_20260515 | Dashboard page stats and phase labels still hardcoded English | Medium | **Resolved** | Fixed in Phase 3 review: added dashboard.overallProgress/lessonsCompleted/totalLessons/portfolio/lessons + phaseA-D keys to both locale files; wired `useTranslations` in dashboard page. |
| 2026-05-16 | codecamp_thai_i18n_20260515 | Lesson page has extensive hardcoded English strings | Medium | Open | Phase 4 confirmed: ~20 hardcoded strings in lesson/[id]/page.tsx (Back to Module, Content, Fork-Based Exercise, Practice Exercises, Quiz, Chat with AI Tutor, Submit Quiz, etc.). Requires dedicated follow-up pass for locale key extraction + component wiring. Deferred: not in current i18n scope. |
| 2026-05-16 | codecamp_thai_i18n_20260515 | No tests verifying `useChatStream` includes locale in request body | Low | **Resolved** | Added `use-chat-stream-locale.test.ts` verifying locale is sent in fetch body for th/en and omitted when undefined. |
| 2026-05-15 | codecamp_curriculum | Seed `getExerciseRepos` generates repos for all modules including M1 (no exercises) | Medium | **Resolved** | Fixed: seed `getExerciseRepos` now uses explicit `MODULE_REPO_MAP`. M1 and M16 correctly excluded; M18 points to capstone repo. |
| 2026-05-16 | codecamp_exercise_repos_20260515 | Stale exercise-repo rows remain in existing DBs for M1 and M16 after seed update | Medium | **Resolved** | Fixed: seed script now cleans up orphaned exercise-repo rows for modules absent from MODULE_REPO_MAP. M1 and M16 rows are deleted on re-seed. |