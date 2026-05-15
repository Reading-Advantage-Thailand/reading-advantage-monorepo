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
| 2026-05-14 | codecamp_advantage | Mock-DB tests don't catch real DB constraint violations | Medium | Open | Requires real-DB integration test infrastructure (Testcontainers or similar). Not addressed by i18n Phase 2 — separate infra track needed. |
| 2026-05-14 | codecamp_curriculum | Old placeholder curriculum modules remain in existing DBs | Medium | Open | Operational/deployment task. Seed script is idempotent; fresh DBs get correct 18-module data. No code change needed. |
| 2026-05-15 | codecamp_review | `contentJson` schema validation missing in LessonContent | Low | Open | Seed data is canonical source; defensive runtime guards in place. Low urgency — Zod schema addition deferred. |
| 2026-05-15 | codecamp_review | Duplicate `generateReview` LLM implementation | Medium | Open | Extracting shared helper couples domain to OpenRouter SDK. Both callers inject `generateReview`. Needs coordinated package changes. |
| 2026-05-15 | codecamp_review | No integration tests for webhook → LLM → comment → DB pipeline | Medium | Open | Fire-and-forget async pattern untested. Requires test DB infrastructure and Redis. |
| 2026-05-14 — 2026-05-15 | codecamp_curriculum + codecamp_review | 16 resolved items from codecamp tracks | — | **Resolved** | Summary: schema fixes, auth hardening, quiz score filtering, chat context guards, rate limiter bounds, prerequisite alignment, exercise repo filtering, password complexity, schoolId docs, type safety, admin route protection. |
| 2026-05-15 | codecamp_thai_i18n_20260515 | Locale-prefixed routes return 404; root `/` does not redirect to `/th/` | High | **Resolved** | Fixed: pages moved to `app/[locale]/`, root layout simplified, locale-aware layout handles rendering. Root `/` correctly redirects to `/th/`. |
| 2026-05-15 | codecamp_thai_i18n_20260515 | Type-safe next-intl translation keys not configured | Medium | Open | Still deferred. Key extraction must finish (Phase 3) before type generation adds value. |
| 2026-05-15 | codecamp_thai_i18n_20260515 | `proxy.ts` admin guard checks cookie existence only, not token validity or ADMIN role | High | Open | Requires Edge-compatible session verification + role check. Auth uses DB-backed opaque tokens (not JWTs) — proxy can't decode locally. Options: (a) internal API subrequest to `/api/auth/session`, (b) migrate sessions to JWTs. Client-side role guards provide defense-in-depth; server-rendered HTML may briefly leak non-sensitive UI chrome before redirect. |
| 2026-05-15 | codecamp_curriculum | Seed `getExerciseRepos` generates repos for all modules including M1 (no exercises) | Medium | **Resolved** | Fixed: seed `getExerciseRepos` now filters to modules with exercise-type lessons. M1 (dev-environment) correctly excluded. |