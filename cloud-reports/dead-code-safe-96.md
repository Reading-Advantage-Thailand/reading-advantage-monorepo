# Pilot report: remove the 96 safe unused files

Base: commit `8babd2686` on `pilot/cloud-dead-code-safe-96`.
Source list: the 96 `file` rows marked `safe` in `dead-code-report.md`.
Result: 92 files removed in 9 commits. 4 files kept because a live use exists.
No package gained a failure. Two tasks improved, for reasons outside this change.

## How each file was checked

- `git grep` searched the whole repository for each file's full path.
- `git grep` searched for each `<parent-dir>/<name>` path, with and without an extension.
- A resolver script read every import, `require`, dynamic `import()`, `vi.mock`, `jest.mock` and CSS `@import`.
- The resolver followed relative paths and each app's `@/` alias from its `tsconfig.json`.
- The search covered code, configs, scripts, tests, package exports and docs.
- Mentions in `measure/` history, audit reports and `*.md` notes are records, not live uses.
- Every import the resolver found came from another file in the same safe list.

## Files kept

| File | Live use |
|---|---|
| `apps/science-advantage/lib/auth/index.ts` | `packages/auth/src/__tests__/phase-2-intern-role-widening.test.ts` reads this path and expects the file to exist. |
| `apps/reading-advantage/server/controllers/velocity-controller.ts` | `packages/architecture-enforcement/src/config/baselines/database.v1.json` and `database.v2.json` list this path as a `sourcePath`. |
| `apps/primary-advantage/utils/storage.ts` | Architecture baselines `provider.v1.json`, `provider.v2.json` and `analyzer-reconciliation.v1.json` list this path. |
| `apps/reading-advantage/server/services/metrics/cache-service.ts` | The kept `velocity-controller.ts` imports it. Removal would break the type check. |

The task forbids edits to the baseline configs, so the checker's files stay.

## Files removed per package

### apps/advantage-games (10 files, commit 6efd49f33)

- `apps/advantage-games/src/components/games/sentence/abyssal-well/index.ts`
- `apps/advantage-games/src/components/games/sentence/griffin-sky-joust/index.ts`
- `apps/advantage-games/src/components/games/sentence/realm-carver/index.ts`
- `apps/advantage-games/src/components/games/vocabulary/archers-revenge/index.ts`
- `apps/advantage-games/src/components/games/vocabulary/paladins-twin-soul/index.ts`
- `apps/advantage-games/src/components/games/vocabulary/rpg-battle/StartScreen.tsx`
- `apps/advantage-games/src/components/header.tsx`
- `apps/advantage-games/src/components/ui/alert.tsx`
- `apps/advantage-games/src/hooks/useCurrentLocale.ts`
- `apps/advantage-games/src/hooks/useScopedI18n.ts`

### apps/primary-advantage (4 files, commit 7143de033)

- `apps/primary-advantage/components/form-success.tsx`
- `apps/primary-advantage/components/ui/radio-group.tsx`
- `apps/primary-advantage/components/ui/rating.tsx`
- `apps/primary-advantage/lib/events.ts`

### apps/reading-advantage (57 files, commit 915d450d4)

- `apps/reading-advantage/app/[locale]/(student)/student/stories/[storyId]/stories-custom-error.tsx`
- `apps/reading-advantage/components/dashboard/classroom-goals/classroom-goal-card.tsx`
- `apps/reading-advantage/components/dashboard/classroom-goals/index.ts`
- `apps/reading-advantage/components/dashboard/classroom-xp-chart.tsx`
- `apps/reading-advantage/components/dashboard/user-recent-activity.tsx`
- `apps/reading-advantage/components/flash-card-practice-button.tsx`
- `apps/reading-advantage/components/flash-card.tsx`
- `apps/reading-advantage/components/flip-card-button.tsx`
- `apps/reading-advantage/components/games/sentence/castle-defense/index.ts`
- `apps/reading-advantage/components/games/vocabulary/rpg-battle/StartScreen.tsx`
- `apps/reading-advantage/components/games/vocabulary/rune-match/StartScreen.tsx`
- `apps/reading-advantage/components/games/vocabulary/wizard-vs-zombie/StartScreen.tsx`
- `apps/reading-advantage/components/index/benefit-box.tsx`
- `apps/reading-advantage/components/index/book.tsx`
- `apps/reading-advantage/components/lesson/lesson-collapsible-notice.tsx`
- `apps/reading-advantage/components/lesson/lesson-introduction.tsx`
- `apps/reading-advantage/components/lesson/lesson-sentence-preview.tsx`
- `apps/reading-advantage/components/lesson/lesson-sentense-flash-card.tsx`
- `apps/reading-advantage/components/lesson/lesson-summary.tsx`
- `apps/reading-advantage/components/lesson/lesson-vocabulary-activity-choice.tsx`
- `apps/reading-advantage/components/lesson/lesson-vocabulary-collection.tsx`
- `apps/reading-advantage/components/lesson/lesson-vocabulary-flash-card-button.tsx`
- `apps/reading-advantage/components/lesson/lesson-vocabulary-flash-card.tsx`
- `apps/reading-advantage/components/lesson/lesson-vocabulary-preview.tsx`
- `apps/reading-advantage/components/practic/quote-item.tsx`
- `apps/reading-advantage/components/practic/quote-list.tsx`
- `apps/reading-advantage/components/practic/reorder.ts`
- `apps/reading-advantage/components/system/active-users.tsx`
- `apps/reading-advantage/components/system/activity-distribution-pieChart.tsx`
- `apps/reading-advantage/components/system/articles-per-level.tsx`
- `apps/reading-advantage/components/system/articles-type-genre.tsx`
- `apps/reading-advantage/components/system/license-usage.tsx`
- `apps/reading-advantage/components/system/LowestLatedArticlesTable.tsx`
- `apps/reading-advantage/components/system/top-schools-xp-gained.tsx`
- `apps/reading-advantage/components/teacher/edit-student.tsx`
- `apps/reading-advantage/components/teacher/remove-student-inclass.tsx`
- `apps/reading-advantage/components/tour/CustomCard.tsx`
- `apps/reading-advantage/components/ui/carousel.tsx`
- `apps/reading-advantage/components/ui/collapsible.tsx`
- `apps/reading-advantage/components/ui/date-field.tsx`
- `apps/reading-advantage/components/ui/slider.tsx`
- `apps/reading-advantage/hooks/use-metrics-stream.ts`
- `apps/reading-advantage/hooks/useLowestRatedArticles.ts`
- `apps/reading-advantage/lib/cache/index.ts`
- `apps/reading-advantage/lib/classroom-utils.ts`
- `apps/reading-advantage/lib/flashcard-client.ts`
- `apps/reading-advantage/lib/migrate-user-levels.ts`
- `apps/reading-advantage/lib/password-utils.ts`
- `apps/reading-advantage/lib/steps.tsx`
- `apps/reading-advantage/lib/student-dashboard-data.ts`
- `apps/reading-advantage/lib/use-trpc-auth.ts`
- `apps/reading-advantage/server/utils/generators/key-generator.ts`
- `apps/reading-advantage/server/utils/route-adapter.ts`
- `apps/reading-advantage/server/utils/validators/article-validator.ts`
- `apps/reading-advantage/server/utils/verify-user-expired.ts`
- `apps/reading-advantage/styles/themes.css`
- `apps/reading-advantage/types/lesson-story.ts`

### apps/science-advantage (3 files, commit 0ba2eb8c1)

- `apps/science-advantage/components/features/student/student-progress-card.tsx`
- `apps/science-advantage/contexts/language-context.tsx`
- `apps/science-advantage/hooks/use-mobile.ts`

### apps/workbooks (1 files, commit 91d04e1ad)

- `apps/workbooks/lib/html-to-pdf.ts`

### apps/www-reading-advantage (2 files, commit f271f80ab)

- `apps/www-reading-advantage/src/components/blog/blog-layout.tsx`
- `apps/www-reading-advantage/src/components/products/product-card.tsx`

### packages/db (1 files, commit ca1a0d02e)

- `packages/db/src/accounting/index.ts`

### packages/domain (13 files, commit 39da855dc)

- `packages/domain/src/articles/schema.ts`
- `packages/domain/src/assignments/schema.ts`
- `packages/domain/src/curriculum/schema.ts`
- `packages/domain/src/gamification/schema.ts`
- `packages/domain/src/licenses/schema.ts`
- `packages/domain/src/progress/schema.ts`
- `packages/domain/src/quiz/schema.ts`
- `packages/domain/src/reports/schema.ts`
- `packages/domain/src/stories/schema.ts`
- `packages/domain/src/teachers/contracts.ts`
- `packages/domain/src/users/schema.ts`
- `packages/domain/src/workbooks/ai-proposal.ts`
- `packages/domain/src/workbooks/coverage-record.ts`

### packages/knowledge-space-practice (1 files, commit 2fcc9410e)

- `packages/knowledge-space-practice/src/blueprints/generator.ts`

## Commands

Each package ran this command before and after the removal:

```
CI=1 ./node_modules/.bin/turbo run check-types test --continue --filter=<package> --force --output-logs=full
```

`--force` skips the turbo cache, so both runs did the full work.
Turbo also runs the dependency tasks of each package. The task counts include them.

| Package | Exit before | Exit after | Turbo tasks before | Turbo tasks after | Tests before | Tests after |
|---|---|---|---|---|---|---|
| `vocabulary-games` | 2 | 0 | 34/42 pass | 42/42 pass | 1867 pass, 1 fail (1868) | 1868 pass (1868) |
| `primary-advantage` | 2 | 2 | 45/48 pass | 46/48 pass | 2770 pass, 4 fail (2774) | 2770 pass, 4 fail (2774) |
| `reading-advantage` | 134 | 134 | 42/44 pass | 42/44 pass | 1060 pass, 3 fail (1063) | 1060 pass, 3 fail (1063) |
| `science-advantage` | 1 | 1 | 39/40 pass | 39/40 pass | 0 run (needs Postgres) | 0 run (needs Postgres) |
| `workbooks` | 1 | 1 | 35/36 pass | 35/36 pass | 210 pass; 3 files fail to load | 210 pass; 3 files fail to load |
| `www-reading-advantage` | 0 | 0 | 4/4 pass | 4/4 pass | 1715 pass (1715) | 1715 pass (1715) |
| `@reading-advantage/db` | 1 | 1 | 1/2 pass | 1/2 pass | 1230 pass, 42 fail, 51 skip (1323) | 1230 pass, 42 fail, 51 skip (1323) |
| `@reading-advantage/domain` | 0 | 0 | 32/32 pass | 32/32 pass | 2196 pass, 18 skip (2214) | 2196 pass, 18 skip (2214) |
| `@reading-advantage/knowledge-space-practice` | 0 | 0 | 6/6 pass | 6/6 pass | 422 pass (422) | 422 pass (422) |

The failing test names match before and after in every package, except the two improvements below.

### Extra type check for reading-advantage

`reading-advantage#check-types` runs out of memory at the default 2 GB heap (exit 134) in both runs.
A second run used a larger heap to get a real result:

```
cd apps/reading-advantage && NODE_OPTIONS=--max-old-space-size=8192 pnpm run check-types
```

| Run | Exit | `error TS` lines |
|---|---|---|
| Before | 2 | 14 |
| After | 2 | 12 |

The two errors that left were in the removed `components/index/book.tsx`. The other 12 errors are the same in both runs.

### Notes on the differences

- `vocabulary-games`: `performance-benchmark.test.ts` failed before on a timing limit. It passed after. The removed files do not touch it.
- `vocabulary-games`: seven dependency `check-types` tasks failed before because `@reading-advantage/db` had no built `dist` yet. Later builds created it.
- `primary-advantage`: `@reading-advantage/game-cartridges-3d#check-types` failed before on missing `advantage-play-kit-3d` build output. It passed after, for the same reason.
- `science-advantage`: its test setup needs Postgres on port 5432. No database runs here, so no test ran.
- `workbooks`: three test files need `packages/sales-knowledge/dist/data/evidence/release-candidate.json`. The build does not make it.
- `@reading-advantage/db`: the 42 failures are integration tests that need Postgres or a deploy contract.
