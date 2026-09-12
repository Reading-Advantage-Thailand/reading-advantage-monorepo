# Phase Code Review: Reading Loading and State Correctness

Track ID: `loading_state_correctness_20260911`. App: `apps/reading-advantage`.

Revision range: `13c1e031f^..3c60af33c`. Commit count: 10. Review date: 2026-09-12.

Reviewer note: this review reads the committed diff of the range and the current
state of every file that the track touched. The working tree holds uncommitted
changes from a different track (APK and advantage-games). The review ignores
those uncommitted changes. The later track `component_deduplication_20260911`
moved four files. The review follows the files to their current paths:
`components/dashboard/system-dashboard-client.tsx`,
`components/shared/change-role.tsx`,
`components/admin/teacher-assignments-table.tsx`, and
`components/handle-article.tsx`. The review changed no source file.

## Findings

### F-1 (High) — A type error sits on a line that this track wrote

`apps/reading-advantage/components/apk/StudentCartridgeHost.tsx:480`

`npx tsc --noEmit` reports:

```
components/apk/StudentCartridgeHost.tsx(480,54): error TS2367: This comparison appears to be unintentional because the types '"demo" | "briefing" | "tutorial" | "countdown"' and '"paused"' have no overlap.
```

`git blame` gives commit `45becfb2cc`, which belongs to this track. The file has
no uncommitted change (`git diff HEAD` on it is empty), so the line is committed
track code.

The code is:

```
478                 if (transition.to === "playing") startedAtRef.current = Date.now();
479                 if (transition.event === "replay"
480                   || (transition.to === "playing" && transition.from !== "paused")) {
481                   rpg.beginSession();
482                 }
```

The guard is dead. `GameLifecycleTransition` is a discriminated union defined at
`packages/advantage-play-kit/src/presentation/game-briefing-contract.ts:122-159`.
Its `from` values are only `"briefing"`, `"tutorial"`, `"demo"`, `"countdown"`,
`"playing"`, and `"results"`. The value `"paused"` belongs to a different type,
`APKRuntimeStatus`, at
`packages/advantage-play-kit/src/runtime/types.ts:300-308`. Therefore
`transition.from !== "paused"` is always true.

The author's intended guard is unreachable by construction. The lifecycle
transition channel never carries a pause or a resume, so `onLifecycleTransition`
cannot deliver the case the guard tries to exclude. The user-visible consequence
today is small: `rpg.beginSession()` fires on each transition into `"playing"`
and on each `"replay"` event, which is the same behavior as the code without the
guard. The `||` operator short-circuits, so a replay calls `beginSession()` once.
The real damage is the failed type check and the false suggestion that pause
handling exists.

The correct condition removes the dead clause:
`if (transition.event === "replay" || transition.to === "playing")`. If the
author wants a pause gate, the gate must read the runtime status channel
(`APKRuntimeStatus`), not the lifecycle transition.

### F-2 (High) — The showcase-card translate cache never hits on the real data path

`apps/reading-advantage/components/article-showcase-card.tsx:36-47`
`apps/reading-advantage/server/controllers/article-controller.ts:249-265`
`apps/reading-advantage/components/handle-article.tsx:32-43`

The component checks `article.translatedSummary` before it posts a translate
request. The list endpoint that feeds the card grid does not return that field.
`GET /api/v1/passage` runs `getArticles`, and its `db.select({...})` at
`server/controllers/article-controller.ts:249-265` lists 14 columns and omits
`translatedSummary`. The `Passage` type in `components/handle-article.tsx:32-43`
also omits it.

The cache is therefore per-render only, and only for callers that already hold
the field. On the article grid the cached value is always `undefined`, so every
card posts one translate request on every mount and on every revisit. The server
does persist the result (`article-controller.ts:809` sets `translatedSummary`),
but the client never reads it back.

Failure scenario: a student opens the article grid in Thai. Ten cards post ten
translate requests. The student navigates away and returns. Ten more requests
fire. AC-4 requires zero requests on revisit.

### F-3 (High) — Chinese users still see Thai in the matching game

`apps/reading-advantage/components/matching.tsx:70-73`
`apps/reading-advantage/components/article-content.tsx:193`
`apps/reading-advantage/configs/locale-config.ts:4-8`

The fix reads `article?.translation?.[currentLocale] ?? article?.translation?.["th"]`.
`useCurrentLocale()` returns an app locale: `"en"`, `"th"`, `"cn"`, `"tw"`, or
`"vi"`. Sentence translations are written under IETF tags. `article-content.tsx:193`
and `stories-chapter-content.tsx:194` both use
`["th", "zh-CN", "zh-TW", "vi"]` as the key list.

Result by locale:

- `th` and `vi` find the translation.
- `cn` and `tw` miss, because the stored keys are `zh-CN` and `zh-TW`. Those
  users fall back to Thai.
- `en` misses and falls back to Thai.

The repository already holds the fix for this exact class of defect:
`normalizeTranslateLocale` at `apps/reading-advantage/lib/translate-sentence.ts:19-23`.
FR-4 applies that helper. FR-8 does not.

Failure scenario: a Simplified Chinese student opens the matching game and reads
Thai words on every card.

### F-4 (High) — A large out-of-scope feature landed under the FR-7 commit

Commit `45becfb2c` ("fix(reading): pass game mode from page") changes
`components/apk/StudentCartridgeHost.tsx` by 272 lines. FR-7 and the Phase 3
plan task ask only to pass a `mode` prop from `searchParams`.

The commit also adds class-challenge runs (`useStudentChallengeRun`), an RPG
reward system (`useStudentRpg`, `RpgRewardDisclosure`, `RpgUnlockNotice`), an
`answer-audio` learning mode, a server-side `ownerKey` identity, a zod
`challengeId` validator, and a 22-entry hardcoded cartridge list that forces
Thai content. The page file
`app/[locale]/(student)/student/games/apk/[cartridgeId]/page.tsx:23-40` gains
`getCurrentUser`, `toUserContext`, and the challenge validation.

None of this appears in `spec.md`. The track has no test for any of it. F-1 is a
direct consequence: the dead pause guard sits inside this unplanned code. This
violates the AGENTS.md Ponytail Rule 1 (keep each change narrowly scoped) and
removes the review value of a small bug-fix commit.

### F-5 (Medium) — The Apply button starts a second concurrent fetch with a stale page number

`apps/reading-advantage/components/handle-article.tsx:142-146`
`apps/reading-advantage/components/handle-article.tsx:118-139`

```
142   const handleApplyFilters = () => {
143     setArticles([]);
144     setPage(1);
145     fecthData();
146   };
```

`fecthData` holds no in-flight guard of its own. The guard added by FR-2 lives
only inside the `IntersectionObserver` callback at line 154. Two defects follow.

First, `fecthData()` closes over the current `page` value, not `1`. When the user
sits on page 4 and clicks Apply, the direct call requests page 4 of the new
filter.

Second, `setPage(1)` changes the state, so the effect at line 114 runs and calls
`fecthData` again. Two fetches run at the same time and both append to the list.
The list then holds page 4 and page 1 rows in an unstable order.

The `finally` block at lines 135-138 does reset `loadingRef.current` and
`loading` on both success and failure. That part of FR-2 is correct.

### F-6 (Medium) — The infinite scroll can loop at the end of the list

`apps/reading-advantage/components/handle-article.tsx:148-162`
`apps/reading-advantage/components/handle-article.tsx:395-400`

The sentinel ref attaches to the last card (`isLastArticle`). When the API
returns an empty array, `articles` does not change, so the same element stays
last and stays visible. `fecthData` sets `loading` to false, React rebuilds the
`lastArticleRef` callback, and the callback creates a new `IntersectionObserver`
and calls `observe(node)`. A browser observer delivers an initial notification
for an element that already intersects. The callback then increments the page and
fetches again.

There is no `hasMore` flag and no empty-response check. A student who scrolls to
the end of the catalog can generate a continuous request loop.

The track test cannot catch this, because `MockIntersectionObserver.observe` is a
`jest.fn()` that never fires
(`apps/reading-advantage/__test__/handle-article-scroll.test.tsx:60-72`).

### F-7 (Medium) — The signin redirect is unreachable and breaks the Rules of Hooks

`apps/reading-advantage/components/student-assignment-dashboard.tsx:256-259`
`apps/reading-advantage/app/[locale]/(student)/student/assignments/page.tsx:8-10`

```
256 export default function StudentAssignmentTable({ userId }: AssignmentProps) {
257   if (!userId) {
258     redirect("/auth/signin");
259   }
```

The only caller already guards the same condition on the server and returns a
message instead of rendering the component. `userId` is therefore never empty at
this point, and the redirect never runs.

The statement also places a conditional early exit before every `useState` and
`useEffect` call in the component. That is a Rules of Hooks violation that
`eslint-plugin-react-hooks` flags.

The static test at
`apps/reading-advantage/__test__/loading-state-fixes.test.ts:43` asserts
`expect(source).toContain('redirect("/auth/signin")')`. The production code
satisfies a string assertion rather than a behavior. `measure/lessons-learned.md`
records this exact pattern as a test-gaming smell (entry 2026-06-24,
`review_findings_remediation_20260624`).

A better fix moves the guard to the page and calls
`redirect("/auth/signin")` there, in place of the plain message.

### F-8 (Medium) — A healthy uptime badge now renders the gray "unknown" color

`apps/reading-advantage/components/dashboard/system-dashboard-client.tsx:544-551`
`apps/reading-advantage/components/dashboard/system-dashboard-client.tsx:123-141`
`apps/reading-advantage/app/api/v1/metrics/system/route.ts:83`

The commit replaced the fixed emerald class on the uptime badge with
`getHealthBadgeClass(dashboardData?.health?.uptime)`. The API returns the string
`'99.9%'` for uptime. That string matches none of the keywords the helper tests
(`excellent`, `fast`, `good`, `slow`, `medium`, `error`, `high`, `low`), so the
helper returns `HEALTH_BADGE_CLASSES.unknown`, which is gray.

A healthy system therefore shows a gray uptime badge that reads "99.9%". The
badge text is correct, the color is wrong. The error-rate badge is safe, because
the API returns `'Low'` or `'Unknown'` and the helper matches `low`.

### F-9 (Medium) — The invariant suite is a source-text scan with no counterexample fixture

`apps/reading-advantage/__test__/loading-state-fixes.test.ts:26-72`

Every test in this file reads a source file as text and asserts on substrings.
The suite proves that the source looks correct, not that the component behaves
correctly. FR-6 and FR-7 have no behavioral coverage at all.

The suite also has no counterexample fixture. If a file moves or a scan matches
nothing, the assertions still pass.

Two entries in `measure/lessons-learned.md` forbid this shape:

- 2026-06-12 (`post_24h_audit_remediation`): "Source-text regex tests ... prove
  the source *looks* correct, not that it behaves correctly. Always prefer
  behavior tests that import and exercise the module."
- 2026-07-03 (Wave 2): "Counterexample fixtures are mandatory for source-scan
  guards."

The three behavioral test files that ship with the track are good work and cover
FR-2, FR-4, and FR-9 correctly.

### F-10 (Low) — Two source lines carry joined statements

`apps/reading-advantage/components/student-assignment-dashboard.tsx:271`
`apps/reading-advantage/components/dashboard/system-dashboard-client.tsx:74`

```
271   const t = useScopedI18n("pages.student.assignmentPage");  const [columnVisibility, setColumnVisibility] =
```

```
74  interface DashboardData {  overview?: {
```

Both lines compile. Both break the repository formatting and hurt readability.
A Prettier pass repairs both.

### F-11 (Low) — The Vietnamese locale gained a spelling error

`apps/reading-advantage/locales/vi.ts:169`

The commit rewrote the `status` block and changed `"Tuyệt vời"` to
`"Tuyệt vờI"`. The final letter is a capital `I`. The other four locale files
kept their original strings.

### F-12 (Low) — The `totalXp` locale key no longer describes its value

`apps/reading-advantage/locales/en.ts:237-241`

The key path is `kpis.totalXp`, and the title is now `"Sessions Today"`. The
label matches the metric, which is what FR-6 requires. The key name no longer
matches the content, which will confuse the next reader. A rename of the key to
`sessionsToday` would close this.

## Requirement Coverage

| FR | Status | Evidence |
|----|--------|----------|
| FR-1 Teacher-assignments double pagination | Implemented | `components/admin/teacher-assignments-table.tsx:463` drops `getPaginationRowModel`; `:146` sends the server page; `:158-168` stores the server `pagination`; `:175-179` refetches on `currentPage`; `:829` and `:837` call `setCurrentPage`; `:673` and `:698` reset to page 1 on a filter change. The server returns the full pagination object at `server/controllers/teacher-assignment-controller.ts:207-210`. |
| FR-2 handle-article infinite-scroll race | Partly implemented | `components/handle-article.tsx:119-120` sets the flag; `:135-138` resets it in `finally` on success and on failure; `:154` guards the observer; `:406` fixes the `loading ??` expression. The guard does not cover `handleApplyFilters` (F-5) or the end of the list (F-6). The dead code at `:94-112` is fully commented out and hides no live bug. |
| FR-3 system-reports loading condition | Implemented | `components/system/reports.tsx:292` computes `const isLoading = !schoolXpLoaded || !licensesLoaded;`. Both flags are set in a `finally` block (`:233` and `:256`), and both fetches run unconditionally in effects (`:283-289`). |
| FR-4 showcase-card translate storm | Partly implemented | `components/article-showcase-card.tsx:36-47` checks the cache and normalizes the locale through `lib/translate-sentence.ts:19-23`. The list endpoint omits `translatedSummary`, so the check never hits in production (F-2). |
| FR-5 assignment dashboard state defects | Implemented, with a defect | Dialog hoisted to `components/student-assignment-dashboard.tsx:134`; `fetchNotifications` is a `useCallback` with `[userId]` at `:622-639` and runs in its own effect at `:641-644`; `router.push` replaces `window.location.href` at `:243` and `:525`; the signin redirect exists at `:257-259` but is unreachable (F-7). |
| FR-6 health badges, KPI label, static Tailwind maps | Implemented, with a defect | `components/dashboard/system-dashboard-client.tsx:42-71` holds the two static maps; `:123-141` returns the `unknown` class as the default; `:481`, `:505`, `:528`, `:545` pass the raw value with no `\|\| "excellent"` fallback; `components/shared/change-role.tsx:34-43` and `:196-197` hold the role map; `components/dashboard/school-dashboard-content.tsx:281-286` now reads `"Sessions Today"` over `readingSessionsToday`. The uptime badge color is wrong (F-8). |
| FR-7 Pass game mode from page props | Implemented, with heavy scope creep | `components/apk/StudentCartridgeHost.tsx:57` declares the `mode` prop; `:441` reads it; no `window.location.search` remains. Commit `45becfb2c` also adds 272 lines of unplanned APK feature code (F-4), which carries the type error (F-1). |
| FR-8 Matching translation key | Partly implemented | `components/matching.tsx:70-73` indexes by `currentLocale` with a Thai fallback, and `components/practic/types.ts:14` widens the type. The `cn` and `tw` locales still miss, because storage uses `zh-CN` and `zh-TW` (F-3). |
| FR-9 Matching empty versus loading states | Implemented | `components/matching.tsx:49-51` adds the `loadState` machine; `:121` sets `loading`; `:147` sets `done`; `:150` sets `error`; `:283` renders skeletons only while loading; `:294-300` renders the error state; `:339-346` renders the empty state. |

Non-functional requirements:

- NFR-1 (no new dependencies): met. The diff adds no package. `zod` was already
  installed.
- NFR-2 (one translate request per summary per locale, cached): not met. See F-2.

## Acceptance Criteria

| AC | Pass/Fail | Evidence |
|----|-----------|----------|
| AC-1 Teacher assignments table reaches every server page | Pass | The Next button calls `setCurrentPage((page) => page + 1)` at `components/admin/teacher-assignments-table.tsx:837`, the fetch callback depends on `currentPage` at `:175`, and the button enables on the server flag `pagination.hasNextPage` at `:838`. The server supplies `hasNextPage` at `server/controllers/teacher-assignment-controller.ts:208`. |
| AC-2 Rapid scrolling fires at most one in-flight fetch | Pass, with a limit | `__test__/handle-article-scroll.test.tsx` proves the scroll path issues one fetch per page under three rapid triggers. The criterion names scrolling only, so it passes. The Apply path (F-5) and the end of the list (F-6) stay unguarded. |
| AC-3 System reports table renders rows after loading completes | Pass | `components/system/reports.tsx:292` derives `isLoading` from two flags that both reach `true` in a `finally` block. |
| AC-4 Ten cards issue at most one uncached request per card locale and zero on revisit | Fail | The second half fails. `getArticles` omits `translatedSummary` (`server/controllers/article-controller.ts:249-265`), so every card posts on every visit (F-2). The first half holds: the card posts once per mount. |
| AC-5 Dashboard mounts no duplicate notification fetches and navigates client-side | Pass | `fetchNotifications` runs in one effect with one stable dependency (`components/student-assignment-dashboard.tsx:622-644`). The assignment fetch effect no longer calls it. Both navigation sites use `router.push` (`:243`, `:525`). |
| AC-6 Missing health data renders "unknown"; the XP KPI label matches its metric | Pass, with a defect | `components/dashboard/system-dashboard-client.tsx:481-551` passes the raw value and falls back to `t("systemHealth.status.unknown")`. All five locale files gained the `unknown` key. The KPI label reads "Sessions Today" over `readingSessionsToday` (`components/dashboard/school-dashboard-content.tsx:281-286`). Present uptime data still renders the gray class (F-8). |
| AC-7 `StudentCartridgeHost` contains no `window.location` read during render | Pass | `grep` finds one `window.location` use, at `components/apk/StudentCartridgeHost.tsx:497`, inside the `onNavigate` event handler. It is a write, not a render-phase read. |
| AC-8 Matching words show the current-locale translation; empty decks render an empty state | Fail | The second half passes: `components/matching.tsx:339-346` renders the empty state and `:283` limits the skeletons to the loading state. The first half fails for `cn` and `tw`, which fall back to Thai (F-3). |

Pass count: 6 of 8 pass. AC-4 and AC-8 fail.

## Plan Accuracy

1. **The `tsc` verification claim is wrong.** Phase 3 of `plan.md` records:
   "`npx tsc --noEmit` (no new errors in touched files; remaining errors belong
   to another track's uncommitted APK work)". The TS2367 error sits in
   `components/apk/StudentCartridgeHost.tsx`, a file this track touched, on line
   480, which `git blame` attributes to this track's commit `45becfb2cc`. The
   file has no uncommitted change. The claim must read that one error belongs to
   this track. See F-1.

2. **A commit SHA is misattributed.** Phase 4 records
   "[x] 3c60af3 Task: Update `docs/reading-advantage-ux-refactor-plan.md` Phase 2
   items to done". Commit `3c60af33c` changes one file,
   `apps/reading-advantage/components/matching.tsx`. The doc update landed in
   commit `52ad249e8` ("chore(measure): mark loading state tasks complete"),
   which sits outside the stated revision range. The doc work is real and
   correct: `docs/reading-advantage-ux-refactor-plan.md:256-263` marks seven of
   eight Phase 2 items as done and correctly leaves item 5 (the `AudioButton`
   leak) open, because the spec excludes it. Only the SHA is wrong.
   `measure/lessons-learned.md` names this recurring SHA drift in the
   `ci_typecheck_alignment_20260603` entry.

3. **Commit `45becfb2c` carries work that no plan task describes.** The Phase 3
   task reads "FR-7 `mode` prop into `StudentCartridgeHost.tsx` from page
   `searchParams`". The commit adds 272 lines of challenge-run, RPG-reward, and
   answer-audio code. See F-4.

4. **The test-count figure is stale but honest.** Phase 3 records "862 passed;
   only the two known pre-existing failures remain". The suite now reports 1011
   tests. The two-failure count still holds.

5. **Phase 3 and Phase 4 hold three open tasks.** Two manual-verification tasks
   and the doctor/lint gate task stay unchecked. This matches the workflow. The
   doctor and lint gate is still open, so F-1, F-10, and F-11 have not met a
   gate yet.

## Test Result

Scoped run of this track's four test files, from `apps/reading-advantage`:

```
CI=true npx jest __test__/loading-state-fixes.test.ts __test__/handle-article-scroll.test.tsx __test__/article-showcase-card-translate.test.tsx __test__/matching-states.test.tsx
```

Output:

```
Test Suites: 4 passed, 4 total
Tests:       14 passed, 14 total
Snapshots:   0 total
Time:        26.165 s
Ran all test suites matching __test__/loading-state-fixes.test.ts|__test__/handle-article-scroll.test.tsx|__test__/article-showcase-card-translate.test.tsx|__test__/matching-states.test.tsx.
```

Central results supplied by the coordinator:

- Full suite (`CI=true npx jest` in `apps/reading-advantage`): 146 suites, 144
  passed, 2 failed; 1011 tests, 1009 passed, 2 failed. One failing suite is
  `__tests__/controllers/assignment-status-enum-red.test.ts`, a `packages/api`
  check-types assertion that this track does not own.
- `npx tsc --noEmit`: 21 lines of output. Every error is in an APK or
  game-challenges file. The only error on a line this track authored is the
  TS2367 at `components/apk/StudentCartridgeHost.tsx:480`.

The green scoped run does not cover F-2, F-3, F-5, F-6, or F-8. Each of those
defects lives outside the assertions the track wrote.

## Verdict

**STOP.** The track has four High findings. Fix them before the track proceeds.

Blocking findings:

1. **F-1** — TS2367 at `components/apk/StudentCartridgeHost.tsx:480`. A
   committed type error on a track-authored line. Remove the dead
   `transition.from !== "paused"` clause.
2. **F-2** — AC-4 fails. Add `translatedSummary` to the `getArticles` column
   list at `server/controllers/article-controller.ts:249-265` and to the
   `Passage` type at `components/handle-article.tsx:32-43`.
3. **F-3** — AC-8 fails. Apply `normalizeTranslateLocale` at
   `components/matching.tsx:70-73` so `cn` and `tw` resolve to `zh-CN` and
   `zh-TW`.
4. **F-4** — Commit `45becfb2c` mixes 272 lines of unplanned APK feature code
   into a one-line bug fix. Record the extra scope in a track of its own, or
   amend `spec.md` and `plan.md` to own it, and add tests for it.

The eight Medium and Low findings (F-5 through F-12) do not block, but the
Phase 4 doctor and lint gate should close F-10 and F-11 before the track closes.
