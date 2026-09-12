# Review B: Reading Loading and State Correctness

Track ID: `loading_state_correctness_20260911`. App: `apps/reading-advantage`.

Role: independent second reviewer. Review date: 2026-09-12.

This review reads the current working-tree source. This review inspects only this track's files. The `showHeroImages` edits in `components/matching.tsx` belong to another track. This review changed no application source.

The High findings from Review A are closed in the working tree. They remain in `HEAD` until the team commits these edits.

## Verdict

**CONTINUE.**

The five CHECK items pass in the working tree. The remaining findings are Medium and Low. Commit the working-tree fixes before Phase 4 doctor and lint.

## CHECK Results

| CHECK | Result | Evidence |
|-------|--------|----------|
| 1. Dead `transition.from !== "paused"` clause removed | Pass | `components/apk/StudentCartridgeHost.tsx:479` is `if (transition.event === "replay" \|\| transition.to === "playing")`. `rg` finds no `paused` token in this file. `HEAD` still has the dead clause at line 480. |
| 2. `translatedSummary` in getArticles select and Passage type | Pass | `server/controllers/article-controller.ts:266` selects `translatedSummary: articles.translatedSummary`. `components/handle-article.tsx:42` adds `translatedSummary?: Record<string, string[]> \| null` to `Passage`. |
| 3. matching uses `normalizeTranslateLocale` | Pass | `components/matching.tsx:24` imports the helper. Line 74 indexes `article?.translation?.[normalizeTranslateLocale(currentLocale)]`. |
| 4. Apply Filters does not fetch a stale page; infinite scroll has a hasMore stop | Pass | `handleApplyFilters` at `:155-163` uses `pageOverride: 1` when `page === 1`, and only `setPage(1)` when `page !== 1`. `hasMoreRef` at `:60` stops the observer at `:174` after an empty page at `:140-141`. |
| 5. Extra APK scope from commit `45becfb2c` was recorded, not silently reverted | Pass | `spec.md` Review amendment 2026-09-12 records the extra class-challenge, RPG reward, and cartridge-list work. The working-tree diff of `StudentCartridgeHost.tsx` is the paused-clause removal only (3 lines). `useStudentChallengeRun`, `useStudentRpg`, and `challengeId` remain. |

## Findings

### Closed Review A High findings

Review A F-1, F-2, F-3, and F-4 are closed in the working tree.

- F-1: the dead pause clause is gone. The remaining condition matches the `GameLifecycleTransition` union.
- F-2: `getArticles` now returns `translatedSummary`. The showcase card can hit the cache on a later visit.
- F-3: `cn` and `tw` resolve to `zh-CN` and `zh-TW` through `normalizeTranslateLocale`.
- F-4: the extra APK scope stays in the file. The spec records it. A successor APK track owns tests for that code.

Review A F-5 (stale page) and F-6 (loop at list end) are closed for the CHECK cases. A smaller Apply race remains. See F-B1.

### F-B1 (Medium) — Apply can skip page 1 while a fetch is in flight

`apps/reading-advantage/components/handle-article.tsx:124`
`apps/reading-advantage/components/handle-article.tsx:155-163`

`fecthData` returns at once when `loadingRef.current` is true. `handleApplyFilters` leaves the in-flight request running.

Failure scenario: the last card is visible, so a page-5 fetch is in flight. The student clicks Apply. The handler sets `page` to 1 and returns. The effect calls `fecthData()`. The in-flight flag is true, so the call returns.

The old fetch then appends page-5 rows to the empty list. The filtered page-1 request never starts.

The stale-page case from Review A F-5 is fixed. This residual case needs an abort, or a queued page-1 fetch after `finally`.

### F-B2 (Medium) — The signin redirect is still unreachable and still breaks the Rules of Hooks

This is Review A F-7. It is still present.

`apps/reading-advantage/components/student-assignment-dashboard.tsx:256-259`
`apps/reading-advantage/app/[locale]/(student)/student/assignments/page.tsx:8-10`

The page already returns a message when `user.id` is missing. The component still calls `redirect` before every hook. The static test still asserts the string `redirect("/auth/signin")`.

### F-B3 (Medium) — A healthy uptime badge still uses the gray "unknown" class

This is Review A F-8. It is still present.

`apps/reading-advantage/components/dashboard/system-dashboard-client.tsx:123-136`
`apps/reading-advantage/app/api/v1/metrics/system/route.ts:83`

The API returns `'99.9%'`. That string matches none of the helper keywords. The badge text is correct. The color is gray.

### F-B4 (Medium) — The invariant suite is still a source-text scan

This is Review A F-9. It is still present.

`apps/reading-advantage/__test__/loading-state-fixes.test.ts:26-72`

The FR-8 assertion now looks for `normalizeTranslateLocale(currentLocale)`. That is a better string. The suite still lacks a counterexample fixture. Apply Filters and `hasMoreRef` lack a behavioral test.

The three behavioral files still cover FR-2 scroll, FR-4 cache, and FR-9 empty and error states.

### F-B5 (Low) — Two source lines still join two statements

This is Review A F-10. It is still present.

`apps/reading-advantage/components/student-assignment-dashboard.tsx:271`
`apps/reading-advantage/components/dashboard/system-dashboard-client.tsx:74`

### F-B6 (Low) — The Vietnamese locale still has a spelling error

This is Review A F-11. It is still present.

`apps/reading-advantage/locales/vi.ts:169` stores `"Tuyệt vờI"` with a capital `I`.

### F-B7 (Low) — The `totalXp` locale key still names XP, not sessions

This is Review A F-12. It is still present.

`apps/reading-advantage/locales/en.ts:237-241` keeps the key `kpis.totalXp` and the title `"Sessions Today"`. FR-6 needs the label match only. A later rename to `sessionsToday` would help readers.

## Requirement Coverage

| FR | Status | Evidence |
|----|--------|----------|
| FR-1 Teacher-assignments double pagination | Implemented | `components/admin/teacher-assignments-table.tsx` has no `getPaginationRowModel`. Line 146 sends the server page. Lines 829 and 837 call `setCurrentPage`. |
| FR-2 handle-article infinite-scroll race | Implemented, with a residual defect | `components/handle-article.tsx:124-126` sets the in-flight flag. Lines 148-150 reset it in `finally`. Line 174 guards the observer. Apply no longer requests the old page. An in-flight Apply can still skip page 1 (F-B1). |
| FR-3 system-reports loading condition | Implemented | `components/system/reports.tsx:292` computes `isLoading` from `schoolXpLoaded` and `licensesLoaded`. Both flags become true in `finally`. |
| FR-4 showcase-card translate storm | Implemented | `components/article-showcase-card.tsx:36-47` checks the cache and normalizes the locale. `getArticles` now returns `translatedSummary`, so a later visit can skip the POST. |
| FR-5 assignment dashboard state defects | Implemented, with a defect | The dialog is hoisted. `fetchNotifications` runs in one effect at `:643-645`. Navigation uses `router.push` at `:243` and `:525`. The signin redirect is still unreachable (F-B2). |
| FR-6 health badges, KPI label, static Tailwind maps | Implemented, with a defect | Static maps live in `system-dashboard-client.tsx:42-71` and `change-role.tsx:34-43`. Missing health data uses `unknown`. The KPI label is `"Sessions Today"`. Uptime `"99.9%"` still uses the gray class (F-B3). |
| FR-7 Pass game mode from page props | Implemented, extra APK scope recorded | `StudentCartridgeHost.tsx:57` declares `mode`. Line 441 reads the prop. No `window.location.search` remains. One `window.location.assign` stays in `onNavigate` at `:496`. The spec amendment keeps the extra APK code. |
| FR-8 Matching translation key | Implemented | `matching.tsx:74` uses `normalizeTranslateLocale(currentLocale)` with a Thai fallback. |
| FR-9 Matching empty versus loading states | Implemented | `matching.tsx:130-132` holds `loadState`. Line 287 shows skeletons only while loading. Lines 297-301 show the error state. Lines 344-349 show the empty state. |

Non-functional requirements:

- NFR-1 (no new dependencies): met. The working-tree diff adds no package.
- NFR-2 (one translate request per summary per locale, cached): met on the list path. `getArticles` returns `translatedSummary`. The card skips the POST when that field holds the locale.

## Acceptance Criteria

| AC | Pass/Fail | Evidence |
|----|-----------|----------|
| AC-1 Teacher assignments table reaches every server page | Pass | Next calls `setCurrentPage((page) => page + 1)` at `teacher-assignments-table.tsx:837`. The fetch depends on `currentPage`. The button uses `pagination.hasNextPage`. |
| AC-2 Rapid scrolling fires at most one in-flight fetch | Pass | `__test__/handle-article-scroll.test.tsx` proves one fetch per page under three rapid triggers. The test passed in this review. |
| AC-3 System reports table renders rows after loading completes | Pass | `reports.tsx:292` derives `isLoading` from two flags that both reach true in `finally`. |
| AC-4 Ten cards issue at most one uncached request per card locale and zero on revisit | Pass | The card still posts once per mount when the cache is empty. `getArticles` now returns `translatedSummary`, so a later visit can skip the POST. `__test__/article-showcase-card-translate.test.tsx` passed (3 tests). |
| AC-5 Dashboard mounts no duplicate notification fetches and navigates client-side | Pass | `fetchNotifications` runs in one effect with `[fetchNotifications]`. Both navigation sites use `router.push`. |
| AC-6 Missing health data renders "unknown"; the XP KPI label matches its metric | Pass, with a defect | Missing values fall back to `unknown`. The KPI title is `"Sessions Today"` over `readingSessionsToday`. Present uptime data still uses the gray class (F-B3). |
| AC-7 `StudentCartridgeHost` contains no `window.location` read during render | Pass | The only `window.location` use is `window.location.assign` in the `onNavigate` handler at `:496`. That is a write in an event handler. |
| AC-8 Matching words show the current-locale translation; empty decks render an empty state | Pass | `normalizeTranslateLocale` maps `cn` and `tw` to `zh-CN` and `zh-TW`. The empty state renders at `:344-349`. `__test__/matching-states.test.tsx` passed (3 tests). |

Pass count: 8 of 8 pass. AC-6 still has the uptime color defect.

## Plan Accuracy

1. **The working-tree fixes are absent from `plan.md`.** Phase 3 lists the original nine FR tasks. The Review A repairs exist only as uncommitted edits.

2. **The `tsc` claim in Phase 3 is still wrong for `HEAD`.** `HEAD` still has TS2367 at `StudentCartridgeHost.tsx:480`. The working tree removes that line. After commit, the claim can say the error is gone.

3. **Commit `45becfb2c` still carries extra APK work.** The spec amendment now records that scope. That matches CHECK 5. `plan.md` still describes FR-7 as a `mode` prop only.

4. **Phase 3 and Phase 4 still hold three open tasks.** Two manual-verification tasks and the doctor and lint task stay unchecked. That matches the workflow.

## Test Result

Requested command, from `apps/reading-advantage`:

```
CI=true npx jest --testPathPatterns='loading-state-fixes|handle-article-scroll' --no-coverage
```

Output:

```
PASS __test__/handle-article-scroll.test.tsx
PASS __test__/loading-state-fixes.test.ts

Test Suites: 2 passed, 2 total
Tests:       8 passed, 8 total
```

The scroll test writes `console.error` on the third fetch. The mock throws `Unexpected extra fetch` on every call after the second. The test still expects three calls. The throw is caught in `fecthData`. This is a test-mock smell. The product behavior is correct.

Extra track tests, not in the requested command:

```
CI=true npx jest --testPathPatterns='article-showcase-card-translate|matching-states' --no-coverage
```

Output:

```
PASS __test__/matching-states.test.tsx
PASS __test__/article-showcase-card-translate.test.tsx

Test Suites: 2 passed, 2 total
Tests:       6 passed, 6 total
```

The passing runs leave F-B1, F-B2, and F-B3 untested.

## Recommendations

1. Commit the working-tree repairs for CHECK items 1 through 4, and the spec amendment for CHECK 5.
2. Abort the in-flight request when Apply runs. Then fetch page 1.
3. Move `redirect("/auth/signin")` to the assignments page. Keep hooks unconditional.
4. Map an uptime percent to a healthy badge class.
5. Leave the extra APK code in place. Give tests for it to a successor APK track.
