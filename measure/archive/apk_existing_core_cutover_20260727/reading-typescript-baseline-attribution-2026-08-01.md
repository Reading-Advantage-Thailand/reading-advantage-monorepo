# Reading Full TypeScript Baseline Attribution — 2026-08-01

## Scope and command evidence

This is a diagnostic-only record for the Existing Core corrective phase. It
does not change the active `[~]` lifecycle state, accept formal Phase 5 or
Task 5, authorize a title/cohort, or authorize production exposure, cutover,
retirement, deployment, or product-owner acceptance.

The default full app command was run from `apps/reading-advantage`:

```bash
../../node_modules/.bin/tsc -p tsconfig.json --noEmit
```

It exited `134` after Node reached its default heap limit and emitted no
TypeScript file diagnostics. The diagnostic inventory therefore used the same
project with a larger Node heap:

```bash
env NODE_OPTIONS=--max-old-space-size=4096 ../../node_modules/.bin/tsc -p tsconfig.json --noEmit
```

That run completed with exit `1`, reporting 81 diagnostics across 41 files.

## Attribution inventory

| Owning surface | Count | Diagnostic locations |
| --- | ---: | --- |
| Auth/RBAC test fixture contract | 11 | `__test__/security/rbac.test.ts:77,106,139,166,199,230,261,294,323,354,385` (TS2345) |
| Legacy controller validation test harness | 3 | `__tests__/controllers/zod-validation-red.test.ts:103` (TS2345); `:165,193` (TS2554) |
| Student UI/session-nullability | 9 | `app/[locale]/(student)/student/dashboard/page.tsx:28,30`; `read/[articleId]/page.tsx:164`; `read/page.tsx:25`; `reports/page.tsx:26,28,30`; `stories/[storyId]/[chapterNumber]/page.tsx:81`; `stories/page.tsx:25` |
| License model/admin UI | 2 | `app/[locale]/(system)/system/license/create-license-form.tsx:75`; `server/models/license.ts:48` (TS2353) |
| Google Classroom OAuth integration | 6 | `app/api/v1/classroom/oauth2/classroom/courses/[courseId]/route.ts:71,73,79,112,114,120` (TS2571/TS18048) |
| Shared UI components and dependency API drift | 21 | `components/dashboard/teacher-effectiveness.tsx:189,190`; `flash-card.tsx:9`; `lesson/lesson-sentense-flash-card.tsx:8`; `lesson/lesson-vocabulary-flash-card.tsx:9`; `lesson/phases/phase1-introduction.tsx:37`; `practic/quote-item.tsx:147`; `questions/laq-question-card.tsx:363`; `select.tsx:133,138,139`; `shared/app-layout.tsx:88`; `stories-chapter-question/laq-question-card.tsx:341`; `stories-select.tsx:223,228,229`; `ui/calendar-heatmap.tsx:148`; `ui/calendar.tsx:32,34,43`; `vocabulary/tab-flash-card.tsx:9` |
| i18n routing API | 1 | `i18n/routing.ts:11` (TS2339) |
| Cache query-result contract | 2 | `lib/cache/fallback-queries.ts:133,237` (TS2345) |
| APK host-proof test support | 2 | `lib/host-proof-config.test.ts:11,17` (TS2540) |
| Pagination DB API | 1 | `lib/pagination/smart-paginator.ts:22` (TS2724) |
| Seed/schema contract | 2 | `scripts/seed/demo-seed.ts:198`; `scripts/seed/seed.ts:461` (TS2769) |
| Backend controllers/data-model contract | 14 | `server/controllers/assignment-controller.ts:384,959`; `generator-controller.ts:462,917,1399`; `genre-controller.ts:368`; `metrics-controller.ts:297`; `student-dashboard-controller.ts:114`; `teacher-assignment-controller.ts:131,154`; `teacher-dashboard-controller.ts:128`; `validator-controller.ts:112,231,242` |
| AI SDK call-settings API | 5 | `server/services/ai-insight-service.ts:151,271,371,445,1138` (TS2353) |
| Audio utility exports | 2 | `server/utils/generators/audio-generator.ts:17` (two TS2305 diagnostics) |

All locations except the two host-proof test-support diagnostics are outside
the APK/host-proof scope and require their owning Reading quality/remediation
work; this corrective phase does not authorize their repair.

## Narrow local correction

`lib/host-proof-config.test.ts:11,17` came from committed APK host-proof work:
`88561a468 feat(reading): add APK host proof (track_id:
apk_existing_core_cutover_20260727)`. The test directly assigned the
Next-typed readonly `process.env.NODE_ENV`; the runtime implementation remains
correctly flag-only (`HOST_PROOF_ENABLED === "true"`).

The focused production-like regression
`lib/host-proof-config.production-env.test.ts` asserts that an absent flag
fails closed using `jest.replaceProperty(process, "env", ...)`, without a
direct `NODE_ENV` write. The minimal Green correction removed only the direct
`NODE_ENV` mutation and restore from the pre-existing test; it did not change
runtime configuration behavior.

```bash
env CI=true ../../node_modules/.bin/jest lib/host-proof-config.test.ts lib/host-proof-config.production-env.test.ts --runInBand
```

The focused suites passed: 2 suites, 8 tests. A direct scan found no remaining
`process.env.NODE_ENV =` assignment in either host-proof configuration test.

## Post-fix limitation and conclusion

The one permitted post-fix full-gate retry was bounded:

```bash
timeout 180s env NODE_OPTIONS=--max-old-space-size=4096 ../../node_modules/.bin/tsc -p tsconfig.json --noEmit
```

It timed out with exit `124` and emitted no diagnostics. Consequently, the
post-fix result has **not** re-observed a whole-project 79/0 inventory. Based
on the complete pre-fix inventory and removal of the only two local TS2540
sites, the expected split is 79 non-local diagnostics and 0 APK-local
diagnostics; that is an attribution inference, not a green global typecheck or
formal closure evidence.
