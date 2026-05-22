# Implementation Plan: reading-advantage Controllers — Prisma → Drizzle

> **Blocked on** `prisma_drizzle_schema_unification_20260505`. Phase groupings below will be refined with audit findings during that track's Phase 6.
>
> **Granularity rule:** each controller named below is its own task — its own characterization test, its own commit, its own checkbox. Where a line lists several controllers, treat each as a separate task; the grouping is for readability only. One controller per commit keeps regressions bisectable.
>
> **Per-controller workflow:** (1) characterization test green against the current Prisma code; (2) replace `prisma.*` calls with `packages/domain` / `packages/db` helpers, keeping every helper a pure read or pure write (FR-6 — split mixed read/write paths); (3) same test still green; (4) commit. reading-advantage runs on **Jest**.

## Phase 1: Generalizable Controllers (data-domain)

Targets controllers that already map cleanly to unified Drizzle tables: user, classroom, license, lesson, flashcard, srs, dashboard, leaderboard, metrics, genre.

- [ ] Task: Migrate user-controller off Prisma
    - [ ] Sub-task: Tests in place / written for current behavior
    - [ ] Sub-task: Replace prisma calls with domain/db helpers
- [ ] Task: Migrate classroom-controller, classroom-goals-controller
- [ ] Task: Migrate license-controller
- [ ] Task: Migrate lesson-controller
- [ ] Task: Migrate flashcard-controller, srs-quick-actions-controller, srs-health-controller
- [ ] Task: Migrate dashboard-summary-controller, student-dashboard-controller, teacher-dashboard-controller, class-dashboard-controller, system-dashboard-controller
- [ ] Task: Migrate leaderboard-controller, metrics-controller, metrics-extended-controller, genre-controller
- [ ] Task: Measure - User Manual Verification 'Generalizable Controllers' (Protocol in workflow.md)

## Phase 2: Game Controllers

- [ ] Task: Migrate rune-match-controller, wizard-zombie-controller
- [ ] Task: Migrate magic-defense-controller, castle-defense-controller
- [ ] Task: Migrate dragon-flight-controller, dragon-rider-controller
- [ ] Task: Migrate potion-rush-controller, rpg-battle-controller, enchanted-library-controller
- [ ] Task: Measure - User Manual Verification 'Game Controllers' (Protocol in workflow.md)

## Phase 3: AI / Admin / System

- [ ] Task: Migrate ai-controller, ai-insight-actions-controller, ai-insight-refresh-controller
- [ ] Task: Migrate admin-controller, system-controller, validator-controller
- [ ] Task: Migrate generator-controller, translation-controller, assistant-controller, stories-assistant-controller
- [ ] Task: Migrate stories-controller, stories-question-controller, question-controller, level-test-controller
- [ ] Task: Migrate assignment-controller, teacher-assignment-controller, assignment-classroom-controller, assignment-funnel-controller, assignment-notification-controller, student-notification-controller
- [ ] Task: Migrate activity-controller, article-controller, class-accuracy-controller, class-export-controller, enhanced-alignment-controller, goals-controller, velocity-controller
- [ ] Task: Measure - User Manual Verification 'AI / Admin / System' (Protocol in workflow.md)

## Phase 4: Actions, Scripts, Lib, Pages, Routes

- [ ] Task: Migrate `actions/*.ts` (rating, pratice, flashcard)
- [ ] Task: Migrate `lib/cache/*` (advanced-cache, fallback-queries, connection-monitor, matview-manager, query-optimizer) and `lib/pagination/smart-paginator.ts`
- [ ] Task: Migrate `lib/classroom-utils.ts`
- [ ] Task: Migrate `scripts/refresh-*.ts`, `scripts/check-*.ts`, `scripts/backfill-*.ts`
- [ ] Task: Migrate server-component pages under `app/[locale]/(teacher|admin|system)/`
- [ ] Task: Migrate API route handlers under `app/api/v1/`
- [ ] Task: Migrate `contexts/userRole-context.tsx`, `types/index.d.ts`, `types/learning-goals.ts`
- [ ] Task: Migrate Prisma-importing files in `components/` (~7 server-component files) and `middleware.ts`
- [ ] Task: Measure - User Manual Verification 'Actions/Scripts/Pages' (Protocol in workflow.md)

## Phase 5: Prisma Removal

- [ ] Task: Confirm zero Prisma references
    - [ ] Sub-task: `grep -r "from.*['\"]@/lib/prisma['\"]\|from.*['\"]@prisma" apps/reading-advantage/` returns nothing
- [ ] Task: Delete Prisma surface
    - [ ] Sub-task: Remove `apps/reading-advantage/lib/prisma.ts`
    - [ ] Sub-task: Remove `apps/reading-advantage/prisma/`
    - [ ] Sub-task: Strip `prisma`, `@prisma/client` from `package.json`
    - [ ] Sub-task: Remove `prebuild: prisma generate`
- [ ] Task: Verify clean install + build
    - [ ] Sub-task: `pnpm install`
    - [ ] Sub-task: `pnpm --filter reading-advantage build`
    - [ ] Sub-task: `pnpm --filter reading-advantage test`
- [ ] Task: Close tech-debt entries
- [ ] Task: Measure - User Manual Verification 'Prisma Removal' (Protocol in workflow.md)
