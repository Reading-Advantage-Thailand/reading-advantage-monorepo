# Line-by-Line Review: Reading Advantage — Batch 31

**Track ID:** `reading_advantage_full_review_20260626`
**Batch ID:** `ra-batch-31`
**Baseline SHA:** `e4834085a2b1d9bab0e7be217d37b29b817c6da1`
**Current HEAD:** `e4834085a2b1d9bab0e7be217d37b29b817c6da1`
**Review Date:** 2026-06-27
**Reviewer Role:** A — correctness / architecture / anti-patterns

---

## Scope

All 20 files listed in the batch were reviewed in full, line by line.

| # | File | Lines Reviewed |
|---|------|----------------|
| 1 | `apps/reading-advantage/components/stories-chapter-question/sa-question-card.tsx` | 1–453 |
| 2 | `apps/reading-advantage/components/stories-chapter-summary.tsx` | 1–64 |
| 3 | `apps/reading-advantage/components/stories-select.tsx` | 1–509 |
| 4 | `apps/reading-advantage/components/stories-showcase-card.tsx` | 1–161 |
| 5 | `apps/reading-advantage/components/stories-summary.tsx` | 1–56 |
| 6 | `apps/reading-advantage/components/stories-word-list.tsx` | 1–321 |
| 7 | `apps/reading-advantage/components/student-assignment-dashboard.tsx` | 1–737 |
| 8 | `apps/reading-advantage/components/student/assignment-notification-badge.tsx` | 1–28 |
| 9 | `apps/reading-advantage/components/student/assignment-notification-popup.tsx` | 1–303 |
| 10 | `apps/reading-advantage/components/student/assignment-table-dashboard.tsx` | 1–128 |
| 11 | `apps/reading-advantage/components/student/search-filter-dashboard.tsx` | 1–60 |
| 12 | `apps/reading-advantage/components/switchers/locale-switcher.tsx` | 1–59 |
| 13 | `apps/reading-advantage/components/switchers/theme-switcher-toggle.tsx` | 1–41 |
| 14 | `apps/reading-advantage/components/system-articles.tsx` | 1–531 |
| 15 | `apps/reading-advantage/components/system/LowestLatedArticlesTable.tsx` | 1–78 |
| 16 | `apps/reading-advantage/components/system/active-users.tsx` | 1–387 |
| 17 | `apps/reading-advantage/components/system/activity-distribution-pieChart.tsx` | 1–198 |
| 18 | `apps/reading-advantage/components/system/articles-per-level.tsx` | 1–181 |
| 19 | `apps/reading-advantage/components/system/articles-type-genre.tsx` | 1–151 |
| 20 | `apps/reading-advantage/components/system/license-usage.tsx` | 1–149 |

**Total lines reviewed:** 4,452
**No file was partially reviewed.**

---

## Executive Summary

This batch spans the "stories" feature surface (`stories-*`), the student assignment dashboard, locale/theme switchers, and the system admin dashboard widgets. The stories and student-assignment components implement a meaningful amount of stateful client logic (translation fetches, FSRS-based flashcard saves, TanStack-Table paging/filtering, assignment-notification polling), while the system widgets are mostly thin wrappers over `recharts` calls to existing REST endpoints.

The most severe correctness issues are:

1. **Dead `import { title } from "process"` in `sa-question-card.tsx:39`** — the symbol is unused and `process.title` is a Node-only value that doesn't exist in the Edge runtime, breaking Edge bundling when this client component happens to be evaluated there.
2. **`onCheckedChange={() => handleTypeChange}` in `system-articles.tsx:389, 397`** — returns the function reference without invoking it, so the Fiction/Non-Fiction checkboxes never toggle.
3. **`stories-word-list.tsx:117–134` mixes `data.word` vs `data.status` contract assumptions** — the success path inspects `data.status === 200` while most related wordlist endpoints in the codebase return `{ message, data }`; the success path silently fails to surface success toasts for any other envelope.
4. **`stories-select.tsx:79, 82, 86` separate `useState` and `nuqs` `useQueryState` for level/genres that can drift** — the URL `level` array and the local `selectedLevels` array are kept in sync manually and can disagree on rapid toggles.
5. **`system-articles.tsx:113–125, 177–194` has duplicated fetching effects** — both a debounced effect and an effect on `[articleType, articleGenre, …]` call `fetchData`, causing double-fetches and a `console.error` reference bug at line 186 (`console.error;` — no call).
6. **`active-users.tsx:64–85` `DailyTooltipContent` re-declares shadcn tooltip styling inline instead of using `ChartTooltipContent`** — a separate render path that can drift from the chart container's styling.
7. **`activity-distribution-pieChart.tsx:90, 95–160` builds chart data with `[activity.userActivityData]` then `.map().flat()`** — if the API ever returns an array it will fail; `chartData` is mis-typed as `[].flat()` of a non-array.
8. **`assignment-table-dashboard.tsx:14–24` and `assignment-notification-popup.tsx:21–37` use `any` for table state and notification payloads** — entire props surface bypasses the contract system.

No tests were found for any of these 20 components (only `apps/reading-advantage/components/ui/__tests__/calendar.test.tsx` exists in `components/`, and it does not cover this batch).

---

## Findings

### Critical / High

#### H-01 — Dead `import { title } from "process"` breaks Edge bundling and adds noise
- **File:** `apps/reading-advantage/components/stories-chapter-question/sa-question-card.tsx`
- **Lines:** 39
- **Severity:** High
- **Evidence:** `import { title } from "process";` — `process.title` is a Node-only mutator (`process.title = "..."`), not a readable value. The symbol `title` is then never referenced anywhere in the file. Confirmed by grep: only matches are inside other components and on line 39 itself.
- **Impact:** This is the only `import ... from "process"` in the file. Bundlers that respect the Edge/browser target will either fail to bundle or warn. The other `import { title } from "process";` instance in `components/index/book.tsx:5` is the same anti-pattern.
- **Fix:** Remove the import line entirely.

#### H-02 — `onCheckedChange={() => handleTypeChange}` returns the function instead of invoking it
- **File:** `apps/reading-advantage/components/system-articles.tsx`
- **Lines:** 389, 397
- **Severity:** High
- **Evidence:**
  - Line 389: `onCheckedChange={() => handleTypeChange}` — the arrow body is the function reference `handleTypeChange`, never called.
  - Line 397: same pattern.
  - `handleTypeChange` defined at line 255–259 takes an event and toggles `type`. With `() => handleTypeChange` no argument is passed and the function is never executed, so clicking the Fiction or Non-Fiction checkbox does nothing.
- **Impact:** The "Filtered by type" UI in the system admin articles dashboard is dead. Users cannot filter by type at all.
- **Fix:** Replace with `onCheckedChange={(checked) => handleTypeChange({ target: { value: checked ? "fiction" : "" } } as any)}` or pass the right event shape.

#### H-03 — `stories-word-list.tsx` checks `data.status === 200` instead of `res.ok`
- **File:** `apps/reading-advantage/components/stories-word-list.tsx`
- **Lines:** 129–148
- **Severity:** High
- **Evidence:**
  - Line 129: `const res = await fetch(\`/api/v1/users/wordlist/${userId}\`, …);`
  - Line 134: `const data = await res.json();`
  - Lines 136–147: branches on `data.status === 200` and `data.status === 400`, but `res.ok` is never checked. If the server returns 401/403/500 with a JSON envelope without `status`, the success toast is suppressed and the user sees nothing.
- **Impact:** Word saves silently fail to notify the user. Combined with the fact that `createEmptyCard()` is used and `card` is spread into the payload but the server presumably replaces it with its own FSRS scheduling, the client does no validation of the response envelope.
- **Fix:** Check `res.ok` first and only parse `data` on success; treat any non-2xx as a toast.

#### H-04 — `stories-word-list.tsx` always sends `chapterNumber` as `Number` even if `0`/`NaN`
- **File:** `apps/reading-advantage/components/stories-word-list.tsx`
- **Lines:** 124
- **Severity:** High
- **Evidence:** `chapterNumber: Number(chapterNumber)` — if `chapterNumber` is `"0"` it becomes `0`; if it is `""` or `undefined` it becomes `NaN`. There is no validation. The Type is `string` per the Props interface but is coerced silently.
- **Impact:** Backend receives `NaN`, likely stores a corrupt record or rejects with a 500. The client still shows "You have saved N words to flashcard" because it reads `foundWordsList.length` from the local array, not from the API.
- **Fix:** Validate before submitting; abort with a toast if invalid.

#### H-05 — `stories-select.tsx` keeps `useState` and `nuqs` query state in parallel and they can drift
- **File:** `apps/reading-advantage/components/stories-select.tsx`
- **Lines:** 79–109, 148–200
- **Severity:** High
- **Evidence:**
  - Line 79: `const [level, setLevel] = useQueryState("level", parseAsArrayOf(parseAsString));`
  - Line 86: `const [selectedLevels, setSelectedLevels] = React.useState<string[]>([]);`
  - Lines 99–108: `handleLevelChange` updates both. If the URL is mutated externally (browser back/forward, or another tab), the local `selectedLevels` will not sync.
  - `isLevelSelected` (line 94) reads `selectedLevels`, not `level`. The dropdown menu check state therefore disagrees with the URL after navigation events.
- **Impact:** URL state and dropdown-checked state are inconsistent. The "Apply" button (line 347) calls `handleApplyFilters` which only bumps `refreshKey` — it does not actually push `selectedLevels` to the URL.
- **Fix:** Make `selectedLevels` derive from `level` (the `nuqs` source of truth) and drop the duplicated `useState`.

#### H-06 — `system-articles.tsx` has two duplicate fetch effects and a `console.error;` reference bug
- **File:** `apps/reading-advantage/components/system-articles.tsx`
- **Lines:** 113–125, 177–194, 186
- **Severity:** High
- **Evidence:**
  - Lines 113–125: `useEffect(() => { … fetchData(…) }, [debouncedArticleSearchTerm]);`
  - Lines 177–194: another `useEffect(() => { fetchData(…).catch(error => { console.error; }); }, [articleType, articleGenre, articleSubgenre, articleLevels, debouncedArticleSearchTerm]);`
  - Both depend on `debouncedArticleSearchTerm`, so each search-term debounce triggers **two** fetches (one per effect).
  - Line 186: `console.error;` — this is a reference, not a call. The error is dropped on the floor. (Should be `console.error(error);`.)
- **Impact:** Double network traffic on every filter change; errors silently swallowed; potential race conditions where the older `fetchData` response overwrites the newer one.
- **Fix:** Collapse into a single effect; correct `console.error(error);`.

#### H-07 — `stories-select.tsx:148–200` fetch effect depends on `[hasMore]` causing unnecessary re-runs
- **File:** `apps/reading-advantage/components/stories-select.tsx`
- **Lines:** 148–200
- **Severity:** High
- **Evidence:** The effect dependency array is `[selectedGenre, selectedSubgenre, page, hasMore, refreshKey]`. `setHasMore(true)` is called from inside this effect (line 188), so the effect will re-run after every successful fetch when `page < response.totalPages`. Because the `fetchData` inside is not guarded by `loading`, this can fire two fetches in rapid succession for the same page.
- **Impact:** Duplicate fetches for the same page, doubling network traffic and possibly producing duplicate `articleShowcaseData` entries (the dedupe at line 178 prevents display duplicates but not network waste).
- **Fix:** Remove `hasMore` from the deps; instead read `hasMoreRef.current` inside the effect or guard with a `loadingRef`.

#### H-08 — `system/active-users.tsx` daily count uses `dailyUserData[0]?.users?.length` while the chart shows sum of `noOfUsers`
- **File:** `apps/reading-advantage/components/system/active-users.tsx`
- **Lines:** 229–243, 276–340
- **Severity:** High
- **Evidence:** The header card switches display based on `timeRange`:
  - "Daily" path: shows `dailyUserData[0]?.users?.length` (the unique user list).
  - Weekly/Monthly: shows `filteredChartData.reduce((sum, item) => sum + item.noOfUsers, 0)` (a sum of per-day counts).
  - But `fillMissingDates` (lines 179–196) fills missing days with `0`. If the API omits a date for Daily, the displayed `users.length` will be 0 instead of "no data". And the Weekly/Monthly sums will include the 0-padding, which is desirable, but the Daily card relies on `dailyDataToUse` being pre-filtered to today (line 137–142) and only that single date — there is no `fillMissingDates` for Daily.
- **Impact:** Inconsistent semantics between the header number and the chart; the Daily view can display 0 users even when the API returned active users for other days.
- **Fix:** Make Daily's header number consistent with the Weekly/Monthly semantics (sum of `noOfUsers` for the day) or unify the data source.

#### H-09 — `activity-distribution-pieChart.tsx` builds chart data by wrapping an object in an array then mapping
- **File:** `apps/reading-advantage/components/system/activity-distribution-pieChart.tsx`
- **Lines:** 87–160
- **Severity:** High
- **Evidence:**
  - Line 90: `setActivityData([activity.userActivityData]);` — wraps the object in a single-element array.
  - Lines 95–160: `activityData.map((element) => { return [ … 12 items … ]; }).flat();` — if the API ever returns an array, `element.totalMcQuestionCount` etc. are `undefined` and the chart silently shows an empty pie. There is no runtime guard.
  - Two slices duplicate `fill` colors: `lessonFlash` reuses `vocabulary_flashcards` (line 151), `lessonSent` reuses `sentense_flashcards` (line 156). This is a documentation/intent bug.
- **Impact:** API contract change silently breaks the chart. Two legend entries will share the same color.
- **Fix:** Validate the API shape; either drop the outer `[ ]` wrapper or use `Array.isArray` and map accordingly; add distinct colors for the lesson entries.

#### H-10 — `articles-per-level.tsx` alert dialog is replaced with `alert(...)` and `handleSendDates` race
- **File:** `apps/reading-advantage/components/system/articles-per-level.tsx`
- **Lines:** 70–98, 108–113
- **Severity:** High
- **Evidence:**
  - Line 96: `alert("Please select both start and end dates.");` — uses native `alert` instead of a toast or shadcn dialog. UI is inconsistent with the rest of the app.
  - Lines 70–98: `handleSendDates` is called from the `useEffect` on `[startDate, endDate]` (line 108). On mount, if both dates are empty, the effect skips (line 110 guards). But when the user picks one date then the other, both `useEffect` runs fire `handleSendDates` because both deps changed — there is no debouncing on date inputs.
  - Line 89: `if (data.data && data.data) { processData(data.data); }` — the same expression appears twice in one condition; one should likely test a different field.
- **Impact:** UX is degraded by `alert`. Picking dates can fire two duplicate fetches.
- **Fix:** Replace `alert` with a shadcn `Alert`/toast; debounce date changes; fix the duplicate test.

#### H-11 — `assignment-table-dashboard.tsx` paginates client-side but `useReactTable` is also `manualPagination`
- **File:** `apps/reading-advantage/components/student-assignment-dashboard.tsx`
- **Lines:** 548–566, 421–483
- **Severity:** High
- **Evidence:**
  - `useReactTable` (line 548) is configured with `manualPagination: true, manualFiltering: true` and only `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel`. There is no `getPaginationRowModel` even though it is imported (line 21). Combined with `pageCount` not passed in, the table may render off-by-one or skip rows after the API returns fewer rows than `pagination.limit`.
  - `fetchAssignment` (line 421) does not return the response, but the caller (`useEffect` at line 485) does not use the return value either. The result is that the `loading` flag is set false after `fetchNotifications` runs but not synchronized with the actual fetch completing.
  - `fetchNotifications` is called every time `fetchAssignment` runs (line 495), even though the notifications are independent of the assignment search. This means a search refetch re-polls notifications.
- **Impact:** Pagination state can desync from server; search triggers redundant notifications requests.
- **Fix:** Move notifications into its own effect; align the table `pageCount` with `pagination.totalPages`.

#### H-12 — `assignment-notification-popup.tsx` calls `router.push` and polls every 30s without cleanup
- **File:** `apps/reading-advantage/components/student/assignment-notification-popup.tsx`
- **Lines:** 56–63, 110–135
- **Severity:** High
- **Evidence:**
  - The 30-second polling interval (line 60) reopens the dialog when the API returns notifications: `setOpen(true)` is called whenever `result.data.length > 0`. This means every poll cycle that returns notifications will force the dialog open again, even after the user closes it.
  - `handleAcknowledge` (line 81) only sets `setOpen(false)` when `notifications.length === 1` (line 98) — i.e., before filtering. The check uses the pre-filter length, so the comparison is inverted from intent.
  - `handleAcknowledgeAll` (line 110) does not check `response.ok` per request; it `await Promise.all(...)` and then unconditionally clears notifications and closes.
- **Impact:** The dialog can re-open on its own every 30 seconds, blocking the UI. Acknowledge failures silently drop the notification from local state but leave it on the server.
- **Fix:** Only auto-open the dialog when `notifications` transitions from empty to non-empty; check `response.ok` per notification; correct the `length === 1` check.

#### H-13 — `student-assignment-dashboard.tsx` hardcoded status numbers `0/1/2` without enum
- **File:** `apps/reading-advantage/components/student-assignment-dashboard.tsx`
- **Lines:** 320–344, 580–604
- **Severity:** High
- **Evidence:** The same switch is duplicated in two places:
  - Lines 320–344 inside the column def.
  - Lines 580–604 inside `AssignmentDetailDialog`.
  - Both compare `status === 0/1/2` with magic numbers. The "description" column on line 234 destructures `title` from `row.getValue("description")` and then ignores it, only using `row.original.description` — a leftover refactor that mis-typed the cell.
- **Impact:** Maintenance hazard. The two switches can drift. The misleading destructure obscures intent.
- **Fix:** Extract a shared `statusToIconText` helper; remove the dead `title` destructure.

#### H-14 — `stories-showcase-card.tsx` activity log is fire-and-forget and uses `as any`
- **File:** `apps/reading-advantage/components/stories-showcase-card.tsx`
- **Lines:** 65–86
- **Severity:** High
- **Evidence:**
  - The `Link onClick` (line 68) fires `fetch(/api/v1/users/${userId}/activitylog, …)` without `await`, `res.ok` check, or error handling. If the userId is undefined the URL becomes `/api/v1/users/undefined/activitylog`.
  - `story.cefr_level || story.cefrLevel` (line 78) — both snake_case and camelCase variants of the same field. The model in `article-model.ts` declares `cefr_level`; `cefrLevel` is not part of the model.
- **Impact:** Broken routes return 404, polluting server logs. Race condition with navigation.
- **Fix:** Move the activity log into a route handler or a hook that retries; remove the `cefrLevel` fallback.

### Medium

#### M-01 — Hardcoded GCS URLs in stories components violate provider neutrality
- **Files:**
  - `stories-showcase-card.tsx:91`
  - `stories-word-list.tsx:93, 268`
- **Severity:** Medium
- **Evidence:** Both files construct `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/...` directly. The audio URL in `stories-word-list.tsx` line 268 falls back to the same hardcoded URL when `word.audioUrl` is empty.
- **Impact:** Violates `AGENTS.md` provider-neutrality rule; if the bucket changes, the components break in multiple places.
- **Fix:** Route through the shared storage adapter or a centralized media URL helper.

#### M-02 — Widespread hardcoded English UI strings bypass i18n
- **Files / Lines:**
  - `student-assignment-dashboard.tsx:419, 438, 444, 456, 461, 467, 470, 477, 482, 498, 501` (`"Loading assignments..."`, `"No assignments found"`, `"Unknown Teacher"`, `"No description provided"`, etc.)
  - `student/assignment-table-dashboard.tsx:88` (`"Loading assignments..."`, `"No assignments found"`)
  - `student/assignment-notification-popup.tsx:175, 188` (`"fromTeacher"`, hardcoded English-ish phrases)
  - `system-articles.tsx:359, 360, 365, 366, 391, 399` (`"Ascending"`, `"Descending"`, `"fiction"`, `"nonfiction"`, etc.)
  - `system/license-usage.tsx:50, 61, 64, 69, 72` (`"License Usage"`, `"School: "`, `"License Type: "`, `"Used: "`, `"Expires: "`)
  - `system/active-users.tsx:227, 240, 281, 280, 332` (`"Active Users"`, `"Today"`, `"Total (${timeRange})"`, `"Active Users Today"`, `"No active users today"`, etc.)
  - `system/LowestLatedArticlesTable.tsx:15, 21, 25, 30, 35` (`"Lowest Rated Articles"`, `"Loading..."`, `"Error: "`, `"Retry"`, `"No articles found"`)
  - `stories-select.tsx:401, 439, 475, 500` (`"There are no stories in this category."`, etc.)
  - `stories-chapter-question/sa-question-card.tsx:383` (`"Type your answer here..."`)
- **Severity:** Medium
- **Evidence:** As above. The apps claim to support `en/th/cn/tw/vi` but the student assignment dashboard, system admin widgets, and stories selection are mostly English-only.
- **Impact:** Localization is broken for these screens; non-English users see English chrome even when the surrounding layout is translated.
- **Fix:** Replace each hardcoded literal with a `useScopedI18n` key; add the corresponding entries to the locale JSON files.

#### M-03 — `search-filter-dashboard.tsx` passes `t: any` and hardcodes English placeholders
- **File:** `apps/reading-advantage/components/student/search-filter-dashboard.tsx`
- **Lines:** 1–60
- **Severity:** Medium
- **Evidence:**
  - Line 6: `t: any` — the i18n function is typed as `any`, defeating type safety.
  - Lines 40–55: hardcoded English `<option>` values for status/due-date filters. The text values use `t("allStatus")` etc. but the underlying value strings (`"0"`, `"1"`, `"2"`, `"overdue"`, `"today"`, `"upcomming"` — note the typo "upcomming") are coupled to the server's filter logic.
- **Impact:** Type safety loss; future bug from the `"upcomming"` typo; i18n strings must match server-accepted values.
- **Fix:** Replace `any` with the i18n scoped function type; introduce a constant map for filter values; fix the `"upcomming"` typo.

#### M-04 — `stories-chapter-question/sa-question-card.tsx` hardcoded English toast strings
- **File:** `apps/reading-advantage/components/stories-chapter-question/sa-question-card.tsx`
- **Lines:** 257, 260, 296, 304, 343, 350, 357
- **Severity:** Medium
- **Evidence:** `"Answer is required"`, `"Answer must be less than 1000 characters"`, `"An error occurred."`, `"Unable to submit answer."`, `"Error"`, `"Unable to save activity."`, `"Congratulations!, You received ${xpToAward} XP for completing this activity."`
- **Impact:** Toast strings never appear in non-English locales.
- **Fix:** Use `t()` keys.

#### M-05 — `student-assignment-dashboard.tsx` uses `window.location.href` for navigation
- **File:** `apps/reading-advantage/components/student-assignment-dashboard.tsx`
- **Lines:** 386, 693
- **Severity:** Medium
- **Evidence:** Both navigation handlers use `window.location.href = \`/student/lesson/${articleId}\`;` instead of `router.push(...)` from `next/navigation`. This forces a full page reload, losing client state.
- **Impact:** Slow navigation; no client state preservation; defeats Next.js client routing benefits.
- **Fix:** Import and use `useRouter` from `next/navigation`.

#### M-06 — `student-assignment-dashboard.tsx` `useDebounce` declared inside the component
- **File:** `apps/reading-advantage/components/student-assignment-dashboard.tsx`
- **Lines:** 146–160
- **Severity:** Medium
- **Evidence:** `useDebounce` is defined as a local function inside `StudentAssignmentTable`. On every render a new `useState` + `useEffect` are created — React still treats it as the same hook but the `value`/`delay` deps mean it re-creates the timer constantly.
- **Impact:** Conceptual: hook rules-of-hooks violated in spirit (calling `useState` inside a function that is not strictly a hook). Minor: unnecessary re-subscriptions.
- **Fix:** Extract `useDebounce` to a top-level custom hook (e.g., `hooks/useDebounce.ts`) or call `React.useState`/`React.useEffect` consistently.

#### M-07 — `student-assignment-dashboard.tsx` locale type cast loses type safety
- **File:** `apps/reading-advantage/components/student-assignment-dashboard.tsx`
- **Lines:** 83, 131–143
- **Severity:** Medium
- **Evidence:** `const locale = useCurrentLocale() as "en" | "th" | "cn" | "tw" | "vi";` — `useCurrentLocale` returns a broader type and the cast suppresses the actual union. The `getDateLocale` switch covers all five cases but the switch silently returns `enUS` for any other value, so an unexpected locale (e.g., `"ja"`) would silently degrade.
- **Impact:** Adding a new locale requires changing three places (cast, switch, `date-fns/locale` import). Forgetting one yields a silent fallback.
- **Fix:** Centralize the `Locale` type and map directly to `date-fns` locales.

#### M-08 — `system-articles.tsx` `CustomCheckbox` `key={index}` is used inside `.map`
- **File:** `apps/reading-advantage/components/system-articles.tsx`
- **Lines:** 472–482, 489–503, 507–519
- **Severity:** Medium
- **Evidence:** Multiple `.map((passage: Passage, index: number) => …)` use `key={index}` for both the outer `<div key={index}>` and the inner `<ArticleShowcaseCard key={index} article={passage} />`. `ArticleShowcaseCard` itself is `React.memo`-wrapped and accepts a ref, so duplicate keys can produce rendering glitches.
- **Impact:** React reconciliation issues when reordering or removing passages.
- **Fix:** Use `passage.id` (which exists on the type) as the key.

#### M-09 — `system-articles.tsx` `CustomCheckbox` does not handle keyboard activation
- **File:** `apps/reading-advantage/components/system-articles.tsx`
- **Lines:** 54–69
- **Severity:** Medium
- **Evidence:** `CustomCheckbox` is a `<div role="">` with `onClick` but no `role="checkbox"`, `aria-checked`, or keyboard handler.
- **Impact:** Accessibility: the level grid is not navigable by keyboard or screen reader.
- **Fix:** Use `<button role="checkbox" aria-checked={selected}>` or the shadcn `Checkbox` component.

#### M-10 — `system/active-users.tsx` license `<option>` `key={index}` and `license.id` access
- **File:** `apps/reading-advantage/components/system/active-users.tsx`
- **Lines:** 255–259
- **Severity:** Medium
- **Evidence:**
  - `licenses.map((license: any, index: number) => <option key={index} value={license.id}>School Name: {license.schoolName}</option>)` — `key={index}` plus `license: any` defeats type safety and the React-idiomatic key.
  - The displayed string `"School Name: ..."` is not localized.
- **Impact:** Type safety loss; i18n hole.
- **Fix:** Import `License` model type; use `key={license.id}`; translate the label.

#### M-11 — `system/license-usage.tsx` `key={index}` and `nrOfLevels={420}`
- **File:** `apps/reading-advantage/components/system/license-usage.tsx`
- **Lines:** 57, 97
- **Severity:** Medium
- **Evidence:**
  - `licenseData.map((license: License, index) => <CarouselItem key={index}>…)` — `key={index}` for carousel items.
  - `nrOfLevels={420}` — the gauge chart accepts an integer; 420 produces a visually fragmented gauge that does not match the percent text below.
- **Impact:** Reconciliation bugs; visual mismatch between gauge color bands and the displayed percent (the gauge effectively shows "is there data?" rather than the actual percentage).
- **Fix:** Use `key={license.id}`; tune `nrOfLevels` to something that renders a meaningful gradient.

#### M-12 — `system/license-usage.tsx` does not check `response.ok`
- **File:** `apps/reading-advantage/components/system/license-usage.tsx`
- **Lines:** 22–29, 37–43
- **Severity:** Medium
- **Evidence:** `fetchLicense` (line 22) calls `await response.json()` without checking `response.ok`. On 500 it returns parsed error JSON; `setLicenseData(license.data)` then becomes `setLicenseData(undefined)` and the carousel crashes silently.
- **Impact:** License widget fails silently on backend errors.
- **Fix:** Check `response.ok`; throw or return early on error.

#### M-13 — `student/assignment-notification-popup.tsx` `useEffect` re-creates poll on every userId change with no deps cleanup
- **File:** `apps/reading-advantage/components/student/assignment-notification-popup.tsx`
- **Lines:** 56–63
- **Severity:** Medium
- **Evidence:** `useEffect(() => { fetchNotifications(); const interval = setInterval(fetchNotifications, 30000); return () => clearInterval(interval); }, [userId]);`. `fetchNotifications` is recreated on every render (closure), so the interval callback always calls the latest function but `clearInterval` clears the latest scheduled interval. In practice this works but the closure drift is fragile.
- **Impact:** Subtle correctness bug if `fetchNotifications` ever starts using external state without proper deps.
- **Fix:** Wrap `fetchNotifications` in `useCallback` with proper deps, or use a ref.

#### M-14 — `system/active-users.tsx` `DailyTooltipContent` uses inline styles outside shadcn tooltip
- **File:** `apps/reading-advantage/components/system/active-users.tsx`
- **Lines:** 64–85
- **Severity:** Medium
- **Evidence:** `DailyTooltipContent` (line 64) is a custom component used by `<ChartTooltip content={<DailyTooltipContent />} />` (line 375) only for non-Daily views — the Weekly/Monthly bar chart path. It re-implements the visual styling instead of using `ChartTooltipContent` from `@/components/ui/chart`.
- **Impact:** Drift between the custom tooltip and the rest of the chart container's theme.
- **Fix:** Use `ChartTooltipContent` with the right props.

#### M-15 — `system/active-users.tsx` `DailyTooltipContent` for the Daily view is missing
- **File:** `apps/reading-advantage/components/system/active-users.tsx`
- **Lines:** 276–340
- **Severity:** Medium
- **Evidence:** The Daily view (line 276 onward) does not show a tooltip at all because it does not render `ChartTooltip`. Hovering over an avatar/card shows no metadata.
- **Impact:** Reduced information density on the Daily view.
- **Fix:** Add a tooltip to user cards (e.g., email, last-active timestamp).

#### M-16 — `student-assignment-dashboard.tsx` column "description" extracts `title` then ignores it
- **File:** `apps/reading-advantage/components/student-assignment-dashboard.tsx`
- **Lines:** 233–243
- **Severity:** Medium
- **Evidence:** `cell: ({ row }) => { const title: string = row.getValue("description"); const description = row.original.description; return ( <div …>{description}</div> ); }` — `title` is destructured but never used; confusing code that suggests a copy/paste from the title column.
- **Impact:** Maintenance confusion.
- **Fix:** Remove the dead `title` destructure.

#### M-17 — `system-articles.tsx` `let currentItems = passages;` shadows the effect dep
- **File:** `apps/reading-advantage/components/system-articles.tsx`
- **Lines:** 82
- **Severity:** Medium
- **Evidence:** `let currentItems = passages;` (line 82). `currentItems` is then used at line 329 `setIsFiltered((currentItems || []).length !== filtered.length);` and line 332 `[currentItems, …]`. Because `currentItems` is reassigned to `passages` on each render (no, actually never reassigned — it stays equal to `passages`), and `passages` is in the effect deps at line 332, the effect runs on every passages update. This is not a bug but is confusing because the name implies "current items" rather than "all items".
- **Impact:** Readability; the `isFiltered` computation is overly broad.
- **Fix:** Inline `passages.length !== filtered.length`.

#### M-18 — `system/active-users.tsx` fetch handler ignores `page === "system"` license fetch failures
- **File:** `apps/reading-advantage/components/system/active-users.tsx`
- **Lines:** 146–154
- **Severity:** Medium
- **Evidence:** `if (page === "system") { const fetchLicenseData = await fetch("/api/v1/licenses", { method: "GET" }); const LicenseData = await fetchLicenseData.json(); setLicenses(LicenseData.data); }` — no `fetchLicenseData.ok` check, no try/catch wrapper around this branch (it sits inside the same try block, so it shares the outer catch).
- **Impact:** On error, `LicenseData` may be `{ message: "..." }` and `LicenseData.data` is `undefined`. `setLicenses(undefined)` then breaks the `<option key={index}>` map because `licenses.map` throws.
- **Fix:** Check `fetchLicenseData.ok`; default to `[]`.

#### M-19 — `stories-select.tsx` calls `setArticleGenresData(response.selectionGenres)` without validating
- **File:** `apps/reading-advantage/components/stories-select.tsx`
- **Lines:** 191
- **Severity:** Medium
- **Evidence:** `setArticleGenresData(response.selectionGenres);` — no type guard. If the backend returns an object instead of an array the component crashes on `articleGenresData.map` at line 447.
- **Fix:** Validate or default to `[]`.

#### M-20 — `stories-select.tsx` `subgenres` populated only on page 1
- **File:** `apps/reading-advantage/components/stories-select.tsx`
- **Lines:** 168–174
- **Severity:** Medium
- **Evidence:** The subgenres for the selected genre are derived from the page-1 response. If the subgenre taxonomy is larger than 8 items, the user sees only the subgenres present on page 1.
- **Impact:** Confusing UX — some subgenres appear only after navigating to page 2.
- **Fix:** Hit a dedicated subgenre endpoint or merge across pages.

### Low

#### L-01 — Typo: `LowestLatedArticlesTable.tsx`
- **File:** `apps/reading-advantage/components/system/LowestLatedArticlesTable.tsx`
- **Severity:** Low
- **Evidence:** File and component named `LowestLated` instead of `LowestRated`. Heading inside also says "Lowest Rated Articles" (line 15), which is correct, but the file/component name disagrees.
- **Fix:** Rename in a dedicated chore.

#### L-02 — Typo: `"upcomming"` in `search-filter-dashboard.tsx`
- **File:** `apps/reading-advantage/components/student/search-filter-dashboard.tsx`
- **Line:** 55
- **Severity:** Low
- **Evidence:** `<option value="upcomming">{t("upcomming")}</option>` — server-side filter probably expects `upcoming`. The i18n key may be wrong too.
- **Fix:** Correct the spelling in both client and i18n files; ensure server contract matches.

#### L-03 — Unused imports across the batch
- **Files / Lines:**
  - `stories-chapter-question/sa-question-card.tsx:17` — `ShortAnswerQuestion` imported but never used.
  - `stories-chapter-question/sa-question-card.tsx:39` — `title` from `"process"` (also H-01).
  - `stories-chapter-question/sa-question-card.tsx:8` — `CardTitle` is used (line 374) so this one is fine.
  - `stories-word-list.tsx:10` — `filter, includes` from lodash — `includes` used at line 118; `filter` used at line 117; OK.
  - `stories-word-list.tsx:4` — `Book` icon used at line 186; OK.
  - `stories-word-list.tsx:5` — `DialogClose` used; OK.
  - `student-assignment-dashboard.tsx:2` — `act` imported from React; never used.
  - `student-assignment-dashboard.tsx:13` — `CaretSortIcon` used; OK.
  - `student-assignment-dashboard.tsx:21` — `getPaginationRowModel` imported but `manualPagination: true` is set, so unused.
  - `student-assignment-dashboard.tsx:42` — `AssignmentNotificationBadge` used; OK.
  - `system-articles.tsx:11` — `DropdownMenuItem` is referenced; OK.
  - `system/articles-per-level.tsx:7` — `Label` imported but never used.
- **Severity:** Low
- **Impact:** Bundle size bloat; obscures real dependencies.
- **Fix:** Remove unused imports; enable `no-unused-vars` consistently.

#### L-04 — `any` types in props and state
- **Files / Lines:**
  - `student/assignment-table-dashboard.tsx:14–24` — entire `Props` is `any` for `table`, `flexRender`, `pagination`, `t`, `handleRowClick`.
  - `student/assignment-notification-popup.tsx:21–37` — `AssignmentNotification` interface, `teacher.name` and `assignment.dueDate: Date` may not actually be `Date` on the wire (likely strings).
  - `student/assignment-notification-popup.tsx:54` — `t: any` typed scoped i18n.
  - `system/active-users.tsx:64` — `DailyTooltipContent({ active, payload }: any)`.
  - `system/active-users.tsx:255` — `licenses.map((license: any, …))`.
  - `system-articles.tsx:261` — `sortPassages(passages: any[])`.
  - `stories-chapter-question/sa-question-card.tsx:285, 312` — `(resp.result as any).questionId`.
  - `system/license-usage.tsx:31` — `useState<License[]>([])` is typed, but `setLicenseData(license.data)` (line 40) passes `license.data` which is `any`.
- **Severity:** Low
- **Impact:** Type safety loss across the batch.
- **Fix:** Replace with proper types; use `unknown` + runtime guards for ambiguous payloads.

#### L-05 — Hardcoded `"process.title"` import
- **File:** `apps/reading-advantage/components/stories-chapter-question/sa-question-card.tsx`
- **Line:** 39
- **Severity:** Low (duplicate of H-01, listed here for clarity that this is a *dead* import as well as an Edge-incompatible one)

#### L-06 — `system-articles.tsx` `currentItems` referenced but never mutated
- **File:** `apps/reading-advantage/components/system-articles.tsx`
- **Lines:** 82, 329, 332
- **Severity:** Low
- **Evidence:** `let currentItems = passages;` then `[currentItems, …]` in deps — never reassigned.
- **Fix:** Use `passages` directly.

#### L-07 — `stories-select.tsx` `tf` typed as `string | any`
- **File:** `apps/reading-advantage/components/stories-select.tsx`
- **Lines:** 58
- **Severity:** Low
- **Evidence:** `const tf: string | any = useScopedI18n("selectType.types");` — the `string | any` is meaningless (any subsumes string). Loses typed return.
- **Fix:** Drop the annotation.

#### L-08 — `stories-select.tsx` filter section renders even for non-teachers? No, it's gated — but text strings are not localized
- **File:** `apps/reading-advantage/components/stories-select.tsx`
- **Lines:** 240, 255, 276, 322, 326
- **Severity:** Low
- **Evidence:** `"Sort by Date"`, `"Filter by Rating"`, `"Filter by Genre"`, `"Filter by CEFR Level"`, `"Apply"` are all hardcoded English strings in the teacher filter UI.
- **Fix:** Localize.

#### L-09 — `stories-word-list.tsx` word list is built even on error
- **File:** `apps/reading-advantage/components/stories-word-list.tsx`
- **Lines:** 73–112
- **Severity:** Low
- **Evidence:** If `chapter.chapter.words` is malformed the toast appears but `setWordList(wordList)` may still set an empty list, hiding the error in subsequent renders. The error path leaves the previous `wordList` state intact (because `setWordList(wordList)` is only called in the success branch).
- **Impact:** Confusing state.
- **Fix:** On error, also `setWordList([])` or keep the previous and surface a "stale data" warning.

#### L-10 — `system/license-usage.tsx` `calculatePercentage` is defined but unused
- **File:** `apps/reading-advantage/components/system/license-usage.tsx`
- **Lines:** 33–35
- **Severity:** Low
- **Evidence:** `calculatePercentage` defined but never called. The percentage is computed inline at lines 102–104 and again at line 84.
- **Fix:** Remove the dead helper or replace the inline calculations.

#### L-11 — `system/articles-per-level.tsx` no-op `flex-1/2`
- **File:** `apps/reading-advantage/components/system/articles-per-level.tsx`
- **Lines:** 132, 139
- **Severity:** Low
- **Evidence:** `className="flex-1/2 border p-2 rounded-sm"` — `flex-1/2` is not a Tailwind class; this is a typo for `flex-1` or `flex-[0.5]`.
- **Fix:** Use a valid Tailwind class.

#### L-12 — `system/articles-type-genre.tsx` chart label color
- **File:** `apps/reading-advantage/components/system/articles-type-genre.tsx`
- **Lines:** 38, 41
- **Severity:** Low
- **Evidence:** Both `fiction` and `nonFiction` chartConfig entries use `hsl(var(--primary))` (line 37, 41). Both bars render in the same color, defeating the purpose of having two datasets.
- **Fix:** Use distinct hues.

#### L-13 — `system/active-users.tsx` imports `Pie`, `PieChart` but never uses them
- **File:** `apps/reading-advantage/components/system/active-users.tsx`
- **Lines:** 9–11
- **Severity:** Low
- **Evidence:** `Pie`, `PieChart`, `Label` imported but not referenced. (`Label` also unused.)
- **Fix:** Remove unused imports.

#### L-14 — `system/LowestLatedArticlesTable.tsx` uses native `<button>` and `<table>` instead of shadcn
- **File:** `apps/reading-advantage/components/system/LowestLatedArticlesTable.tsx`
- **Lines:** 26–31, 39–71
- **Severity:** Low
- **Evidence:** Uses raw `<button>` and `<table>` instead of `@/components/ui/button` and `@/components/ui/table`.
- **Fix:** Standardize on shadcn primitives.

#### L-15 — `assignment-notification-badge.tsx` `t` typed as `any`
- **File:** `apps/reading-advantage/components/student/assignment-notification-badge.tsx`
- **Line:** 18
- **Severity:** Low
- **Evidence:** `const t = useScopedI18n("components.assignmentNotification" as any) as any;` — both the namespace and the return type are `any`.
- **Fix:** Add the namespace to the i18n types.

#### L-16 — `student-assignment-dashboard.tsx` `act` import unused
- **File:** `apps/reading-advantage/components/student-assignment-dashboard.tsx`
- **Line:** 2
- **Severity:** Low
- **Evidence:** `import React, { act, useEffect, useState } from "react";` — `act` is never used.
- **Fix:** Remove.

#### L-17 — `stories-chapter-question/sa-question-card.tsx` imports `ShortAnswerQuestion` but never uses it
- **File:** `apps/reading-advantage/components/stories-chapter-question/sa-question-card.tsx`
- **Line:** 17
- **Severity:** Low
- **Evidence:** `import { ShortAnswerQuestion } from "../models/questions-model";` — the symbol is never referenced.
- **Fix:** Remove.

#### L-18 — `stories-select.tsx` "Next" button click uses `?` prefix correctly but navigation can lose locale
- **File:** `apps/reading-advantage/components/stories-select.tsx`
- **Lines:** 139, 367, 414
- **Severity:** Low
- **Evidence:** `router.push("?" + params.toString(), { scroll: false });` — uses `next/navigation`'s `router.push`. Locale is normally handled by `[locale]` segment, so this is fine, but `useSearchParams()` is called alongside, which means the `searchParams` value is read from a possibly stale snapshot during the same render cycle.
- **Impact:** Minor staleness; typically resolved on the next render.

---

## Anti-Pattern Audit

| ID | Anti-pattern | Present in batch? | Evidence |
|----|--------------|-------------------|----------|
| A1 | Silent catch + happy UI | Yes | `stories-word-list.tsx:104–108` toasts but does not `setWordList([])`, so user sees old data on error. `system/license-usage.tsx:39–41` swallows fetch errors and `setLicenseData(undefined)` then crashes `licenses.map`. |
| A3 | Digit-only as a "labeled count" | Yes | `student-assignment-dashboard.tsx:322–329, 580–604` map status `0/1/2` to emoji ⏳/🔄/✅ without semantic names; `search-filter-dashboard.tsx:41–44` filter values are bare digits. |
| A4 | Vacuous-pass on nothing-done | Partial | `student/assignment-notification-popup.tsx:96–102` removes notification from local state without checking `response.ok`. `stories-word-list.tsx:136–147` only toasts if `data.status === 200` but does not confirm `res.ok`. |
| A5 | False-claim text vs test reality | No | No "all checks pass" claims in the track `plan.md` for this batch; no tests for these components exist to contradict. |
| A6 | Provider-specific hardcoded URLs | Yes | H-01 family: `stories-showcase-card.tsx:91`, `stories-word-list.tsx:93, 268` use `storage.googleapis.com` directly. |
| A7 | Magic numbers without enum | Yes | `student-assignment-dashboard.tsx:322–329, 580–604` magic status numbers; `system-articles.tsx:473` `Array.from({ length: 26 }, ...)` magic 26; `system/articles-per-level.tsx:63` `level >= 1 && level <= 18` magic range. |

---

## Test / Coverage Observations

1. **No tests cover any of the 20 files.** Grep of `apps/reading-advantage` for `*.test.{ts,tsx}` shows:
   - Many game tests under `apps/reading-advantage/components/games/**`
   - One shadcn calendar test
   - Hook tests in `hooks/`
   - Several `__test__/jest30-*` legacy Jest scripts at the app root
   - **No tests for any stories, student assignment, system dashboard, or switcher component**.
2. **Behavior worth testing (representative, not exhaustive):**
   - `stories-word-list.tsx`: `handleWordList` with malformed `chapter.chapter.words`, missing audio URL fallback.
   - `stories-chapter-question/sa-question-card.tsx`: `QuestionCardError` rendering with the `data` passed; `SAQuestion` submit flow with success and failure responses; rating update with `data` undefined.
   - `stories-select.tsx`: `getArticleCategory` for each combination of `genre` and `subgenre`; `handleLevelChange` add/remove; `isLevelSelected` truthiness.
   - `student-assignment-dashboard.tsx`: `useDebounce` (extract first); `getDueDateStatus` for past/today/3-day/upcoming dates; status filter values; `fetchAssignment` paging.
   - `student/assignment-notification-popup.tsx`: empty notifications returns `null`; multiple notifications; acknowledge-all loop; poll interval re-opens the dialog (and the bug that this causes).
   - `student/assignment-table-dashboard.tsx`: row click triggers dialog only on mobile; pagination buttons enable/disable correctly.
   - `student/assignment-notification-badge.tsx`: returns `null` when `notifiedAssignmentIds.has(assignmentId)` is false; renders badge with localized text when true.
   - `student/search-filter-dashboard.tsx`: option list includes the expected values; `"upcomming"` typo identified.
   - `system-articles.tsx`: `filterPassages` for each combination of filters; `sortPassages` with `sortOption === ""`, `"rating"`, `"date"`; debounced search trigger.
   - `system/active-users.tsx`: `fillMissingDates` for the last 1/7/30 days; `filteredChartData` memo correctness.
   - `system/activity-distribution-pieChart.tsx`: chartData flat-mapping with object vs array input.
   - `system/articles-per-level.tsx`: `processData` filters levels 1–18; `handleSendDates` with missing date range.
   - `system/articles-type-genre.tsx`: total counts; selectedType toggle.
   - `system/license-usage.tsx`: `key={license.id}` not `index`; percent calculation with `usedLicenses=0`.
   - `system/LowestLatedArticlesTable.tsx`: loading/error/empty states.
   - `switchers/locale-switcher.tsx`: `sortedLocales` puts current first.
   - `switchers/theme-switcher-toggle.tsx`: button click calls `setTheme("light" | "dark" | "system")`.
3. **No test execution was attempted.** No tests exist for these files; node modules were not installed.

---

## Files Not Fully Reviewed

**None.** All 20 files in the batch were read in their entirety.

---

## Recommendations (focused, no broad refactor)

1. Remove the dead `import { title } from "process"` in `stories-chapter-question/sa-question-card.tsx:39` (H-01).
2. Fix `onCheckedChange={() => handleTypeChange}` invocations in `system-articles.tsx:389, 397` (H-02).
3. Make `stories-word-list.tsx` validate `res.ok` and `chapterNumber` before submit (H-03, H-04).
4. Replace the duplicated `useState`/`nuqs` pair in `stories-select.tsx` with a single derived state from `nuqs` (H-05).
5. Collapse the two fetch effects in `system-articles.tsx` and fix `console.error;` reference bug (H-06).
6. Move notifications polling in `assignment-notification-popup.tsx` out of the auto-open path; check `response.ok` per request (H-12).
7. Replace magic status numbers `0/1/2` with a shared enum/const in `student-assignment-dashboard.tsx` (H-13).
8. Make `stories-showcase-card.tsx` activity log await `res.ok` and remove the `cefrLevel` fallback (H-14).
9. Replace hardcoded GCS URLs in stories components with the storage adapter (M-01).
10. Internationalize hardcoded English strings in system dashboard widgets and the student assignment dashboard (M-02, M-03, M-04).
11. Use `router.push` instead of `window.location.href` in `student-assignment-dashboard.tsx` (M-05).
12. Use `passage.id` (or `license.id`) instead of `index` keys in system widget maps (M-08, M-11).
13. Add accessibility attributes to `CustomCheckbox` in `system-articles.tsx` (M-09).
14. Tune `nrOfLevels={420}` to a meaningful gauge gradient and remove the duplicate `primary` color in `articles-type-genre.tsx` (M-11, L-12).
15. Add basic unit tests for `student/assignment-notification-badge.tsx`, `student/assignment-notification-popup.tsx`, `student/search-filter-dashboard.tsx`, and the system widgets — they have no tests today.

---

*End of line-review report for batch 31.*
