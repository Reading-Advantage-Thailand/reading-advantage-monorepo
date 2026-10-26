# Reading implementation

Date: 2026-09-07

## Result

Question grading now requires each question to belong to the route article.

A mismatched question returns 404 before activity, XP, or user writes.

Article completion still requires five completed MCQs and one SAQ. A valid Enterprise license also requires a completed LAQ.

The entitlement rule comes from `measure/tracks/wave4_app_security_correctness_backlog_20260628/site-closures/M-RA-PB-6.md`.

That specification requires `LicenseType.BASIC` for missing or invalid license data. An expired license resolves to Basic.

Assignment creation stores the authenticated actor and the `ARTICLE` type.

Teacher access requires classroom membership and the authorized school. Admin access requires the authorized school.

Individual updates require the target student's classroom membership. Non-system actors also require the target student's school.

Conditional conflict updates reject stale terminal regressions. The guard also covers rows absent during the initial read.

Responses keep the numeric `status` contract. They add `lifecycleStatus` for the shared lifecycle value.

Activity writes validate the activity type and target. Invalid input returns HTTP 400.

Generated MCQ writers store a numeric answer index. Generation fails for a missing or duplicate answer.

The Reading type check now passes. UI values use explicit nullable presentation defaults.

Current contracts now cover DayPicker, locales, charts, requests, cache results, licenses, AI options, and workspace imports.

Jest maps workspace packages through source exports. Archived evidence resolves from `measure/archive/jest30_major_migration`.

## Validation

Run from `apps/reading-advantage`:

```bash
node --max-old-space-size=4096 ../../node_modules/typescript/bin/tsc --noEmit --pretty false
```

Result: exit 0 with no diagnostics.

```bash
CI=true node ../../node_modules/jest/bin/jest.js __tests__/controllers/assignment-status-enum-red.test.ts --runInBand
```

Result: exit 0. One suite and four tests passed.

```bash
CI=true node ../../node_modules/jest/bin/jest.js __tests__/controllers/assignment-controller-security.test.ts __tests__/learning-loop/assignment-lifecycle-red.test.ts components/ui/__tests__/calendar.test.tsx __tests__/learning-loop/fsrs-scheduling-red.test.ts __test__/jest30-phase5-full-run.test.ts __test__/jest30-phase5-inventory.test.ts __test__/jest30-phase5-metadata-consistency.test.ts __test__/jest30-phase5-quarantine.test.ts __test__/jest30-phase5-scripts-disposition.test.ts __tests__/controllers/env-reads-guard-red.test.ts __tests__/controllers/report-typed-context-red.test.ts __tests__/controllers/generated-mcq-writer.test.ts --runInBand
```

Result: exit 0. Twelve suites and 44 tests passed.

Focused ESLint exited 0 with 30 warnings and no errors.

The controlled Calendar focus regression passed ten focused tests.

The test preserves the focused day through selection and clearing.

The earlier full Jest log is `/tmp/resume-reading-jest-full-after-fixes.log`.

That run passed 87 suites and 632 tests. It failed 31 suites and 37 tests before the final mappings and game repairs.

The separate game repair owns these residual files:

- `components/games/game/InputController.tsx`
- `hooks/useSound.ts`
- `components/games/game/StartScreen.test.tsx`
- `components/games/vocabulary/rpg-battle/BattleScene.test.tsx`
- `lib/games/runeMatch.test.ts`
- `lib/games/runeMatchConfig.test.ts`
- `lib/games/enchantedLibrary.ts`

## Changed files

- `apps/reading-advantage/__test__/jest30-phase5-full-run.test.ts`
- `apps/reading-advantage/__test__/jest30-phase5-inventory.test.ts`
- `apps/reading-advantage/__test__/jest30-phase5-metadata-consistency.test.ts`
- `apps/reading-advantage/__test__/jest30-phase5-quarantine.test.ts`
- `apps/reading-advantage/__test__/jest30-phase5-scripts-disposition.test.ts`
- `apps/reading-advantage/__test__/security/rbac.test.ts`
- `apps/reading-advantage/__tests__/controllers/activity-target-validation-red.test.ts`
- `apps/reading-advantage/__tests__/controllers/assignment-controller-security.test.ts`
- `apps/reading-advantage/__tests__/controllers/assignment-status-enum-red.test.ts`
- `apps/reading-advantage/__tests__/controllers/generated-mcq-writer.test.ts`
- `apps/reading-advantage/__tests__/controllers/question-article-association.test.ts`
- `apps/reading-advantage/__tests__/controllers/zod-validation-red.test.ts`
- `apps/reading-advantage/__tests__/host-proof-game-client.test.tsx`
- `apps/reading-advantage/__tests__/learning-loop/article-completion-red.test.ts`
- `apps/reading-advantage/__tests__/learning-loop/assignment-lifecycle-red.test.ts`
- `apps/reading-advantage/app/[locale]/(student)/student/dashboard/page.tsx`
- `apps/reading-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx`
- `apps/reading-advantage/app/[locale]/(student)/student/read/page.tsx`
- `apps/reading-advantage/app/[locale]/(student)/student/reports/page.tsx`
- `apps/reading-advantage/app/[locale]/(student)/student/stories/[storyId]/[chapterNumber]/page.tsx`
- `apps/reading-advantage/app/[locale]/(student)/student/stories/page.tsx`
- `apps/reading-advantage/app/[locale]/(system)/system/license/create-license-form.tsx`
- `apps/reading-advantage/app/api/host-proof/games/completions/route.ts`
- `apps/reading-advantage/app/api/v1/classroom/oauth2/classroom/courses/[courseId]/route.ts`
- `apps/reading-advantage/components/dashboard/teacher-effectiveness.tsx`
- `apps/reading-advantage/components/flash-card.tsx`
- `apps/reading-advantage/components/lesson/lesson-sentense-flash-card.tsx`
- `apps/reading-advantage/components/lesson/lesson-vocabulary-flash-card.tsx`
- `apps/reading-advantage/components/lesson/phases/phase1-introduction.tsx`
- `apps/reading-advantage/components/practic/quote-item.tsx`
- `apps/reading-advantage/components/questions/laq-question-card.tsx`
- `apps/reading-advantage/components/select.tsx`
- `apps/reading-advantage/components/shared/app-layout.tsx`
- `apps/reading-advantage/components/stories-chapter-question/laq-question-card.tsx`
- `apps/reading-advantage/components/stories-select.tsx`
- `apps/reading-advantage/components/ui/calendar-heatmap.tsx`
- `apps/reading-advantage/components/ui/calendar.tsx`
- `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx`
- `apps/reading-advantage/i18n/routing.ts`
- `apps/reading-advantage/jest.config.ts`
- `apps/reading-advantage/jest.setup.ts`
- `apps/reading-advantage/lib/cache/fallback-queries.ts`
- `apps/reading-advantage/lib/env.ts`
- `apps/reading-advantage/lib/host-proof-config.test.ts`
- `apps/reading-advantage/lib/host-proof-config.ts`
- `apps/reading-advantage/lib/pagination/smart-paginator.ts`
- `apps/reading-advantage/lib/trpc.ts`
- `apps/reading-advantage/scripts/seed/demo-seed.ts`
- `apps/reading-advantage/scripts/seed/seed.ts`
- `apps/reading-advantage/server/controllers/assignment-controller.ts`
- `apps/reading-advantage/server/controllers/class-accuracy-controller.ts`
- `apps/reading-advantage/server/controllers/generator-controller.ts`
- `apps/reading-advantage/server/controllers/genre-controller.ts`
- `apps/reading-advantage/server/controllers/metrics-controller.ts`
- `apps/reading-advantage/server/controllers/question-controller.ts`
- `apps/reading-advantage/server/controllers/student-dashboard-controller.ts`
- `apps/reading-advantage/server/controllers/teacher-assignment-controller.ts`
- `apps/reading-advantage/server/controllers/teacher-dashboard-controller.ts`
- `apps/reading-advantage/server/controllers/user-controller.ts`
- `apps/reading-advantage/server/controllers/validator-controller.ts`
- `apps/reading-advantage/server/models/license.ts`
- `apps/reading-advantage/server/services/ai-insight-service.ts`
- `apps/reading-advantage/server/utils/generators/audio-generator.ts`

Root must update `graph.db` for these structural edits.
