# Line Review Evidence: primary-advantage-029

Reviewer: coder-minimax-m3/primary-advantage-029
Files assigned: 6
Lines assigned: 997

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/dashboard/reminder-reread-table.tsx` | 1-233 | reviewed | 4 |
| `apps/primary-advantage/components/dashboard/user-activity-chart.tsx` | 1-319 | reviewed | 7 |
| `apps/primary-advantage/components/dashboard/user-heatmap-chart.tsx` | 1-74 | reviewed | 4 |
| `apps/primary-advantage/components/dashboard/user-level-indicator.tsx` | 1-86 | reviewed | 4 |
| `apps/primary-advantage/components/dashboard/user-reading-chart.tsx` | 1-167 | reviewed | 5 |
| `apps/primary-advantage/components/dashboard/user-recent-activity.tsx` | 1-118 | reviewed | 4 |

## Findings

### LR-primary-advantage-029-001 — Tailwind typo `captoliza` in reminder-reread table title cell; first-letter capitalization silently no-op

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/reminder-reread-table.tsx:94`
- Evidence: Line 94 renders `<div className="captoliza">{row.getValue("title")}</div>`. Tailwind v4 (per `apps/primary-advantage/AGENTS.md` "Stack") ships `capitalize` as the standard utility; `captoliza` matches no utility and is purged, so the title is rendered in its raw case. The companion table in batch 028 (`article-records-table.tsx:126`) contains the identical typo (flagged as LR-028-009 in the prior batch evidence file), which strongly suggests the same copy-paste source produced both files. This file's import block (lines 3-29) does not import any helper that would compensate for the missing utility.
- Impact: Low. For English titles the visual difference is one uppercase letter per title; for Thai / Chinese / Vietnamese titles the visual difference is invisible (no word boundaries or no case); the issue is consistent with the prior batch's identical finding rather than a new regression.
- Recommendation: Replace `captoliza` with `capitalize` on line 94 (matching the LR-028-009 remediation). A single bulk find-and-replace across `apps/primary-advantage/components/dashboard/**` (and `components/articles/**`) would catch both occurrences plus any siblings; consider adding `eslint-plugin-tailwindcss` so future typos fail lint.

### LR-primary-advantage-029-002 — `parseInt(row.getValue("rated"))` produces `NaN` for missing/non-numeric ratings and renders literal "NaN" in primary-student history table

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/reminder-reread-table.tsx:119-120`
- Evidence: The `rated` column cell (lines 118-121) does `const amount = parseInt(row.getValue("rated"))` (line 119) and renders `<div className="text-center font-medium">{amount}</div>` (line 120). If the API at `GET /api/users/${user.id}/reminder-reread` returns `rated: null`, `""`, `"N/A"`, or any non-integer string, `parseInt` returns `NaN`; React renders the literal text `NaN`. There is no `Number.isFinite(amount)` guard and no fallback string. The `ReminderRecord` interface (lines 31-38) types `rated: number` and `status: string` but does not narrow `null`, so the typed assumption does not survive partial API responses. The identical anti-pattern was flagged in batch 028 LR-028-011 for the sibling `article-records-table.tsx`.
- Impact: Medium. After a schema migration, partial data import, or any API change that introduces `null` or string-typed ratings, the entire "rated" column shows "NaN" in the student history view. For a primary-student-facing history view, "NaN" looks like a rendering bug to the student and the parent. The repetition across batch 028 (article-records-table.tsx) and batch 029 (reminder-reread-table.tsx) confirms this is a systematic gap rather than a one-off.
- Recommendation: Replace line 119 with `const raw = row.getValue("rated"); const amount = typeof raw === "number" ? raw : parseInt(String(raw), 10); const display = Number.isFinite(amount) ? amount : "—";` and render `{display}` on line 120. Even better, change the `ReminderRecord.rated` field (line 36) to `number | null` so the type system forces the null check at every render site. Add a unit test asserting `NaN` is never rendered to the DOM.

### LR-primary-advantage-029-003 — Status `map` has no fallback; unknown status strings from the API render as empty cells with no UI signal

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/reminder-reread-table.tsx:128-138`
- Evidence: Lines 128-134 declare a status map with five keys: `READ`, `COMPLETED_MCQ`, `COMPLETED_SAQ`, `COMPLETED_LAQ`, `UNRATED`. The render expression on line 137 is `map[status as keyof typeof map]`. If the API returns any other status (e.g., a future `IN_PROGRESS`, `BOOKMARKED`, or a renamed legacy status from the Drizzle migration per `apps/primary-advantage/AGENTS.md` "Migration History" — Phase 8 of `primary_advantage_drizzle_migration_20260526`), `map[status]` is `undefined` and React renders nothing. There is no fallback (`map[status] ?? status ?? "—"`), no default branch, no warning log. The `status` column in the reminder-reread table would show blank cells.
- Impact: Medium. Same anti-pattern as batch 028 LR-028-010 for the sibling `article-records-table.tsx`. The repetition across both tables is a maintenance liability: any future enum addition requires two separate map updates and silently breaks if missed. The AGENTS.md `apps/primary-advantage/AGENTS.md` "Schema layout" references an `activityType` enum in `packages/db/src/schema/primary.ts`; the migration adds a known surface area for status drift.
- Recommendation: Add a fallback on line 137: `map[status as keyof typeof map] ?? status ?? "—"`. Refactor to a single shared `getStatusLabel(status: string): string` helper in `lib/zod.ts` or `lib/utils.ts` (e.g., a Zod enum plus label map) and call it from both `article-records-table.tsx` (line 171 per LR-028-010) and this file. Document the status enum contract in `apps/primary-advantage/AGENTS.md` under a new "Status values" section so future migrations stay in sync.

### LR-primary-advantage-029-004 — `fetchData` bypasses the shared data layer; every dashboard widget re-implements its own fetch with no caching, no SWR/React Query, no error toast

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/components/dashboard/reminder-reread-table.tsx:57-72`
- Evidence: Lines 57-72 define `fetchData` as `const fetchData = React.useCallback(async () => { ... const response = await fetch(`/api/users/${user.id}/reminder-reread`); ... }`. The error handling on lines 67-71 only does `console.error`; there is no `toast.error(...)`, no user-visible failure UI, no retry. The `useEffect` on lines 75-77 fires `fetchData()` on every `user?.id` change with no debounce, no SWR, no React Query. Per `apps/primary-advantage/AGENTS.md` "Forbidden Patterns", direct `fetch` from a component is allowed today but the AGENTS.md root section on data fetching prefers a shared client. The sibling file `article-records-table.tsx` (per batch 028) uses `useReactTable` with no fetch layer; the broader pattern is "each dashboard widget does its own `useEffect + fetch`".
- Impact: Medium. Without a shared data layer: (a) every widget has to re-implement caching, deduplication, and error UX; (b) network errors are silent (only `console.error`); (c) there is no request-level revalidation, so a write elsewhere won't refresh this view; (d) the `QueryClient` / SWR DevTools can't inspect dashboard traffic. For a primary-student platform where parents trust the dashboard numbers, silent fetch failures are a UX gap.
- Recommendation: Either (a) introduce SWR or `@tanstack/react-query` (the project already uses `@tanstack/react-table` per the import on line 15) and replace `fetchData` with `useSWR(`/api/users/${user?.id}/reminder-reread`, fetcher)`; or (b) introduce a thin shared `useApi(url)` hook in `hooks/use-api.ts` that wraps SWR and exposes `data` / `error` / `isLoading`. Add a `toast.error(...)` on `error` so the failure is visible to the user. Document the data-layer policy in `apps/primary-advantage/AGENTS.md` under a new "Data fetching" section. This is also a shared package migration blocker because the same gap repeats across every dashboard widget.

### LR-primary-advantage-029-005 — `lastedLevel` variable in `formatDataForDays` is initialized once and never updated; chart always resets xpEarned to 0 each day, breaking the cumulative-XP narrative

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/user-activity-chart.tsx:76,90`
- Evidence: Line 76 declares `let lastedLevel = 0;` outside the for-loop. Line 90 reads it as `let xpEarned = lastedLevel;`. The intent expressed in the comment on lines 88-89 ("get the latest level of the user for that day ... if level is dosent change then the user didnt complete any article that day return the last user updatedLevel") is clearly to carry the previous day's cumulative XP forward if no completion happened on the current day. However, `lastedLevel` is never reassigned inside the loop — only `xpEarned` is. The variable name itself is also a typo ("lasted" should be "latest"). The practical effect: at the start of every day, `xpEarned` is reset to 0 and only the day's own XP contributions are summed, producing a sawtooth chart that drops back to 0 each morning instead of a monotonically increasing cumulative XP line.
- Impact: High. The chart's title is "XP Earned" (line 281, `t("xpearned")`), which to a primary-student user reads as "the XP you have earned". The narrative of "I earned 150 XP over the past week" requires the line to start at zero on day 1 and rise to the cumulative total. The current implementation produces a discontinuous line that drops to 0 every day, which is visually misleading. For a primary-student who checks their dashboard daily, the chart makes it look like they "lose" XP every night. The TypeScript type is implicitly `number` so the bug is silent — no compile error, no runtime error, just wrong math.
- Recommendation: Either (a) make the chart non-cumulative (rename to "Daily XP" and accept the sawtooth) — this would be the smaller change and arguably matches a more useful primary-student narrative ("how much XP did I earn today vs yesterday"), or (b) make the chart cumulative by tracking `xpEarned += delta` across days and assigning `lastedLevel = xpEarned` after each day's loop iteration. Fix the variable name typo: rename `lastedLevel` → `previousDayXp` (or `runningTotal`). Update the comment block on lines 88-89 to read clearly. Add a unit test that asserts the first day's value is 0 and the last day's value equals the sum of all `xpEarned` across the input.

### LR-primary-advantage-029-006 — Chart stroke references `var(--color-xp)` but `chartConfig.xp.color` is `var(--primary)`; the auto-generated CSS variable is undefined so the line may render with the fallback or be invisible

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/user-activity-chart.tsx:122-126,309`
- Evidence: Line 122-126 declares `const chartConfig = { xp: { color: "var(--primary)" } } satisfies ChartConfig`. Line 309 renders `<Line stroke="var(--color-xp)" ... />`. The shadcn/ui `chartConfig` convention (see `components/ui/chart.tsx` per batch 064) auto-generates a CSS variable of the form `--color-<key>` from the key name — so the key `xp` becomes `--color-xp`. However, the `color` field in the config is supposed to be the CSS variable value, not another CSS variable reference. The actual line color resolves to whatever `var(--color-xp)` evaluates to, which is **undefined** unless the consumer manually defines `--color-xp` somewhere. The result: in many browsers the stroke falls back to `currentColor` (likely black or text-color, depending on theme) and the XP line is barely visible against the card background. The sibling `class-activity-chart.tsx` (per batch 028) does not exhibit this mismatch because its `chartConfig` (lines 46-63) uses color names that match the auto-generated variable name (`students`, `teachers`, etc., with `color: "hsl(var(--primary))"` and `stroke="hsl(var(--students))"`).
- Impact: High. The XP earned chart (lines 279-316) is the second card in the user activity dashboard. The line stroke being the wrong color (or invisible) means the primary-student sees a broken chart. The interaction with `useTheme` from `next-themes` (imported on line 25 but never destructured — see LR-029-007) suggests the chart was meant to adapt to theme, but the unresolved CSS variable breaks both light and dark themes.
- Recommendation: Replace `stroke="var(--color-xp)"` on line 309 with `stroke="var(--primary)"` (matching the value in `chartConfig.xp.color` on line 124) OR change `chartConfig.xp.color` to a concrete color (`"#5BE12C"` matching the gauge component's green on line 58 of `user-level-indicator.tsx`) and add the corresponding `stroke="var(--color-xp)"` keeping the chartConfig-driven convention. The two halves of the chartConfig contract need to agree. Add a Vitest test that mounts the component and asserts the line stroke resolves to a non-empty color in both light and dark themes.

### LR-primary-advantage-029-007 — `CustomTooltip` component (lines 104-115) is defined but never used; the actual chart uses the shadcn `ChartTooltip` primitive

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/user-activity-chart.tsx:104-115,301-304`
- Evidence: Lines 104-115 declare `const CustomTooltip = ({ active, payload, label }: any) => { ... }`. The signature uses `any` for the props (line 104) instead of the `TooltipProps` type from Recharts. The actual tooltip rendered on lines 301-304 is `<ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />`, which is the shadcn/ui wrapper from `components/ui/chart.tsx`. The custom tooltip is therefore dead code — defined but never imported into the JSX tree.
- Impact: Low. Bundle-size waste (~12 lines of unused JSX plus the `CustomTooltip` symbol). The `any` typing is also a small type-safety regression that could mask future bugs if a developer re-enables the custom tooltip. No functional bug today.
- Recommendation: Either (a) delete lines 104-115 entirely (and remove the `useTheme` / `useState` dead imports per LR-029-009), or (b) replace the `<ChartTooltip content={<ChartTooltipContent hideIndicator />} />` on lines 301-304 with `<Tooltip content={<CustomTooltip />} />` from Recharts if the custom XP tooltip on line 109 (`${payload[0].value} XP`) is the desired UX. If option (b), also type the props correctly: `({ active, payload, label }: TooltipProps<number, string>)`.

### LR-primary-advantage-029-008 — Dead variable `locale = useLocale()` declared but never read; unused imports `useState`, `useTheme`, `cn`

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/user-activity-chart.tsx:24-25,37,131`
- Evidence: Line 24 imports `useState` from `react` and line 25 imports `useTheme` from `next-themes`. Line 37 imports `cn` from `@/lib/utils`. Line 131 declares `const locale = useLocale();`. A scope-confined grep shows:
  - `useState`: only the import on line 24 — no call sites in the file. (The component's date state uses the typed variant from `react-day-picker` via `React.useState` on line 133, which is a separate import on line 24 of `react-day-picker`'s package scope. The `react` `useState` import on line 24 is therefore strictly redundant given the file only uses `React.useState` from line 2's import `import { ... } from "recharts"` — wait, re-check: line 24 imports `useState` from `react`, and the only `useState` call is on line 133 as `React.useState<DateRange | undefined>(...)`, which is actually `React.useState` not the named `useState`. So the named `useState` import on line 24 is dead.)
  - `useTheme`: only the import on line 25 — no destructuring `useTheme()` anywhere in the file. Dead.
  - `cn`: only the import on line 37 — the file does not use `cn(...)` for any className composition. Dead.
  - `useLocale`: line 131 declares `const locale = useLocale();` and the variable is never read (the date formatter on lines 194-195 uses `date-fns` `format` without locale awareness, see LR-029-010).
- Impact: Low. Bundle-size waste; maintenance trap (a future reader assumes these symbols are used). The `locale` variable in particular is misleading because the rest of the chart appears to be locale-aware (via `useTranslations`) but `date-fns` `format` on lines 194-195 is hardcoded English.
- Recommendation: Delete lines 24-25 (the `useState` and `useTheme` imports) and line 37 (the `cn` import). Delete line 131 (`const locale = useLocale();`). If locale-aware date formatting is desired (LR-029-010), use the locale: `format(date.from, "LLL dd, y", { locale: dateFnsLocale[locale] })` — and then `locale` becomes used.

### LR-primary-advantage-029-009 — `date-fns` `format` uses English-locale output; Thai/Chinese/Vietnamese/Taiwanese users see English month abbreviations in the date-range picker

- Severity: Medium
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/components/dashboard/user-activity-chart.tsx:194-195`
- Evidence: Lines 194-195 call `format(date.from, "LLL dd, y")` and `format(date.to, "LLL dd, y")`. `date-fns` `format` defaults to `EnglishLocale` when no `{ locale }` option is passed, producing English month abbreviations like "Jan 15, 2026" regardless of the user's `next-intl` locale. The `locale` variable from line 131 is declared but not used here (per LR-029-008). The `date-fns/locale` module exports locale objects (`enUS`, `th`, `zhCN`, `vi`) but none are imported. Five locales are supported app-wide (per `lib/utils.ts:85-93` referenced in batch 028 LR-028-002): `en`, `th`, `cn`, `tw`, `vi`.
- Impact: Medium. The date-range picker button is one of the most-clicked controls on the user activity dashboard. For a Thai school student whose preferred locale is `th`, "Jan 15, 2026" reads as English in an otherwise Thai dashboard. The misalignment between the surrounding i18n (via `useTranslations`) and the date picker label is jarring.
- Recommendation: Import locale objects: `import { enUS, th, zhCN, zhTW, vi } from "date-fns/locale";`. Map `locale` (from `useLocale()` on line 131) to a date-fns locale: `const dateFnsLocale = { en: enUS, th, cn: zhCN, tw: zhTW, vi }[locale] ?? enUS;`. Then `format(date.from, "LLL dd, y", { locale: dateFnsLocale })` on lines 194, 195, 198. Document the locale-mapping policy in `apps/primary-advantage/AGENTS.md` under a new "Date formatting" section. Mark this finding as `Intentional product divergence that needs documentation` if the team intends to defer locale-aware date pickers to a later iteration.

### LR-primary-advantage-029-010 — Typo `UserActiviryChartProps` (should be `UserActivityChartProps`) recurs across 3 files in this batch and matches the same typo in other primary-advantage dashboard components

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/user-activity-chart.tsx:117`
- Evidence: Line 117 declares `interface UserActiviryChartProps { data: UserActivityLog[]; xpLogs: UserXpLog[]; }`. The interface name has the typo "Activiry" instead of "Activity" (the `y` and `r` are transposed). The same typo recurs in `user-heatmap-chart.tsx:47` (`interface UserActiviryChartProps`) and `user-reading-chart.tsx:43` (`interface UserActiviryChartProps`) and `user-recent-activity.tsx:23` (`interface UserActiviryChartProps`). The 4-way recurrence across this batch's files indicates the typo was copied from a single source during a bulk rename; the original component name `UserActivityChart` (line 128) and the consumer page (e.g., `app/[locale]/(student)/student/reports/page.tsx` per batch 005) are spelled correctly, so the typo is contained to the interface identifier.
- Impact: Low. The typo does not break functionality because the interface is referenced only by the immediately-adjacent component. The risk is during future refactors: a developer searching for "UserActivityChartProps" (correct) will not find the typo'd interface, and may introduce a duplicate rather than rename. The 4-file recurrence amplifies the maintenance cost.
- Recommendation: Rename `UserActiviryChartProps` → `UserActivityChartProps` in `user-activity-chart.tsx:117`, `user-heatmap-chart.tsx:47`, `user-reading-chart.tsx:43`, and `user-recent-activity.tsx:23`. Verify no external imports use the typo'd name (the `grep` above shows all four files are self-contained, so this is safe). A bulk rename across `apps/primary-advantage/components/dashboard/**` is the smallest correct change. After rename, add a lint rule (`@typescript-eslint/naming-convention` or a custom regex) that catches future character-transposition typos in TypeScript identifiers.

### LR-primary-advantage-029-011 — Heatmap day-boundary uses UTC ISO date string; primary-student reading activity at 23:30 local time is bucketed into the wrong day for any non-UTC user

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/user-heatmap-chart.tsx:14-26`
- Evidence: Lines 17-19 compute `const date = new Date(activity.createdAt); const dateString = date.toISOString().split("T")[0];`. `Date.prototype.toISOString()` always serializes in UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`). For a user in `Asia/Bangkok` (UTC+7) whose `createdAt` is `2026-06-26T23:30:00+07:00`, the ISO string is `2026-06-26T16:30:00.000Z`, and the `split("T")[0]` produces `"2026-06-26"` — which happens to match the local date. But for an activity logged at `2026-06-27T00:30:00+07:00` (30 minutes past midnight local time), the ISO string is `2026-06-26T17:30:00.000Z`, and the date bucket is `"2026-06-26"` — which is the PREVIOUS day from the user's perspective. The heatmap rolls activities that happen in the early-morning local hours into the previous calendar day, producing an off-by-one visualization. The same bug affects any user east or west of UTC, including the five supported locales (`en`, `th`, `cn`, `tw`, `vi` per `lib/utils.ts:85-93`).
- Impact: High. The heatmap is the canonical year-at-a-glance view of a primary-student's reading activity. Off-by-one bucketing means: (a) a student who reads every morning before school sees their pattern shifted by one day; (b) a parent reviewing the heatmap with their child sees activity on the wrong day; (c) for a teacher using the heatmap to identify engagement patterns, the shift can mislead interventions. The bug is silent — no error, no UI signal — so the misalignment is invisible to the user. The `createdAt` field is presumably a server-generated UTC timestamp (per Drizzle default conventions), so the fix is to bucket on local date components (`getFullYear/getMonth/getDate` in the user's timezone) rather than on the UTC ISO prefix.
- Recommendation: Replace lines 17-19 with:
  ```ts
  const date = new Date(activity.createdAt);
  const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  ```
  Use `Intl.DateTimeFormat` with the user's timezone to get the local date string, or — better — accept a `tz: string` prop (or read from session) and bucket on the local date. Add a unit test with two timestamps straddling midnight in `Asia/Bangkok` and assert they fall in different buckets. Document the heatmap bucketing contract in `apps/primary-advantage/AGENTS.md` under a new "Time zones" section.

### LR-primary-advantage-029-012 — Heatmap activity thresholds (`>20`, `>=10`, `>=1`) are hardcoded; the same thresholds are wrong for any primary-student whose daily activity is consistently outside the assumed range

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/dashboard/user-heatmap-chart.tsx:30-38`
- Evidence: Lines 30-38 split dates into three buckets:
  - `count > 20` → result[0] (rendered as `bg-green-700`, "high activity")
  - `count >= 10` → result[1] (rendered as `bg-green-500`, "medium activity")
  - `count >= 1` → result[2] (rendered as `bg-green-400`, "any activity")
  
  The thresholds are static. For a primary-student whose daily activity averages 3-5 actions per day, virtually every active day lands in result[2] (lightest bucket) — the heatmap shows a flat low-activity year. For a power-user with 30+ actions per day, every day lands in result[0] (darkest bucket) — the heatmap shows a flat high-activity year. The thresholds were clearly chosen for the assumption of a Reading Advantage (secondary / adult) user who reads many articles per day; for primary students the thresholds are miscalibrated.
- Impact: Medium. The heatmap is intended to give the student (and parent/teacher) a quick visual summary of reading consistency. With miscalibrated thresholds, the visual encoding collapses to one color for most primary students, removing the pattern-recognition benefit. For a primary-student adaptation risk: the visual story the heatmap tells a parent is not the visual story the data actually supports.
- Recommendation: Replace the fixed thresholds with quantile-based bucketing relative to the input data:
  ```ts
  const counts = Object.values(dateCounts);
  const sorted = [...counts].sort((a, b) => a - b);
  const p67 = sorted[Math.floor(sorted.length * 0.67)];
  const p33 = sorted[Math.floor(sorted.length * 0.33)];
  // use p33 and p67 as the bucket boundaries
  ```
  Or accept an explicit `thresholds` prop with sensible defaults for primary students (e.g., 1, 3, 5 actions per day). Document the bucket-calibration policy in `apps/primary-advantage/AGENTS.md` under a new "Heatmap thresholds" section. Add a unit test that asserts the bucket assignment adapts to data shape (e.g., a dataset with all counts=10 produces three empty buckets or a documented edge-case behavior).

### LR-primary-advantage-029-013 — Heatmap color classes `bg-green-400/500/700` are hardcoded and ignore dark-mode; in `dark:` mode the contrast may be unreadable

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/user-heatmap-chart.tsx:64-68`
- Evidence: Lines 64-68 pass `variantClassnames` to `<CalendarHeatmap>`:
  ```
  "text-white hover:text-white bg-green-400 hover:bg-green-400",
  "text-white hover:text-white bg-green-500 hover:bg-green-500",
  "text-white hover:text-white bg-green-700 hover:bg-green-700",
  ```
  There is no `dark:` variant for any of the three classes. The app supports `next-themes` (per `components/providers/theme-provider.tsx` per batch 051), and other dashboard components use `dark:` variants (e.g., `reminder-reread-table.tsx:170` uses `bg-[#ffedd5] dark:bg-[#7c2d12]`). The contrast between `text-white` and `bg-green-400` (#4ade80) is borderline WCAG AA for the lightest bucket; in dark mode the page background is typically `bg-gray-900` or similar, and the green squares sit on that background — but the squares themselves do not change, so the contrast pattern is preserved. The risk is for users with reduced-vision settings that combine with dark mode.
- Impact: Medium. Visual regression risk for dark-mode users with low-vision accessibility settings. For a primary-student platform where many users have visual processing needs, dark-mode-correct color tokens are an accessibility expectation. The three-class pattern is also duplicated in `user-recent-activity.tsx` (`bg-green-500` on lines 69, 100; `bg-orange-400` on lines 74, 105) — see LR-029-035.
- Recommendation: Replace the three Tailwind color classes with semantic tokens defined in the theme:
  ```ts
  variantClassnames={[
    "text-white bg-[--heatmap-low] hover:bg-[--heatmap-low]",
    "text-white bg-[--heatmap-medium] hover:bg-[--heatmap-medium]",
    "text-white bg-[--heatmap-high] hover:bg-[--heatmap-high]",
  ]}
  ```
  Define `--heatmap-low/medium/high` in `app/globals.css` for both light and dark themes. Apply the same pattern to `user-recent-activity.tsx` (LR-029-035). Document the heatmap color contract in `apps/primary-advantage/AGENTS.md` under a new "Dashboard colors" section.

### LR-primary-advantage-029-014 — Heatmap variable name typo `converDatetoSting` (should be `convertDateToString`, but actually converts to `Date` objects) and `UserActiviryChartProps` typo

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/user-heatmap-chart.tsx:40-44,47,8`
- Evidence: Line 40 declares `const converDatetoSting = result.map((date) => date.map((dateSrting) => new Date(dateSrting)));`. Three problems: (a) the variable name `converDatetoSting` is a typo of `convertDateToString`, but the value is actually `Date[][]` not strings — the name lies about what the variable holds; (b) the inner parameter `dateSrting` is a typo of `dateString`; (c) the function is named `formatDataHeatmap` (line 14) but it actually does bucketing, not just formatting — the function name understates its responsibility. Line 47 declares `interface UserActiviryChartProps` (the same typo as LR-029-010). Line 8 imports `CardDescription` but no `<CardDescription>` is rendered in the JSX (lines 55-73 only use `CardHeader`, `CardTitle`, `CardContent`).
- Impact: Low. The misleading name and inner typo make the code hard to read but produce no runtime bug. The unused `CardDescription` import is a small bundle-size waste. The function name being inaccurate makes future refactors harder (a reader assumes `format*` is a pure formatter when the function also bucketing and conversion).
- Recommendation: Rename `converDatetoSting` → `datesByBucket` (more accurate), and the inner `dateSrting` → `dateStr`. Rename `formatDataHeatmap` → `bucketActivitiesByDate` (or split into `bucketActivities` + `formatBuckets`). Rename `UserActiviryChartProps` → `UserActivityChartProps` (per LR-029-010). Remove line 8 (`CardDescription` import) — and check `components/ui/card.tsx` for whether `CardDescription` is re-exported from the barrel (it is per `components/ui/card.tsx` per batch 064).

### LR-primary-advantage-029-015 — `levels.indexOf(currentLevel)` returns `-1` for unknown CEFR levels; gauge displays a negative value and translation lookup throws at runtime

- Severity: Critical
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/dashboard/user-level-indicator.tsx:53,82`
- Evidence: Line 53 computes `value={(levels.indexOf(currentLevel) / levels.length) * 100}`. If `currentLevel` is not present in the hardcoded `levels` array (lines 24-44, 19 entries: `A0-`, `A0`, `A0+`, `A1-`, `A1`, ..., `C1+`, `C2`), `levels.indexOf(currentLevel)` returns `-1`, and the gauge value is approximately `-5.26` (-100/19). The `react-gauge-component` library clamps negative values internally, so the gauge visually resets to 0 — the user sees "0" even though they have a valid level. Line 82 renders `<div className="mt-2">{td(currentLevel)}</div>` which calls `useTranslations("Reports.level.description")(currentLevel)`; if `currentLevel` is not a key in the message file, `next-intl` throws (or shows the key depending on config) — a runtime crash that breaks the dashboard for affected users.
- Impact: Critical. For a primary-student dashboard, the level indicator is a key motivator. Two failure modes: (a) the gauge silently resets to 0 (visual bug — the student sees "I have no level"); (b) the translation lookup throws and the component tree below the gauge may unmount. Both bugs surface only for users whose `currentLevel` is not in the hardcoded array — likely after a database migration, after a level is added to the schema, or for users whose level was imported from a different system. The hardcoded array is missing any safety for the unknown-value case.
- Recommendation: Replace line 53 with:
  ```ts
  const index = levels.indexOf(currentLevel);
  const safeIndex = index >= 0 ? index : 0;
  value={(safeIndex / levels.length) * 100}
  ```
  Replace line 82 with:
  ```ts
  <div className="mt-2">
    {levels.includes(currentLevel) ? td(currentLevel) : t("unknownLevel")}
  </div>
  ```
  Add `unknownLevel: "Unknown level"` to the `Reports.level` namespace in all five message files. Refactor `levels` to live in a shared location (see LR-029-016). Add a unit test that asserts `levels.indexOf("XYZ")` does not propagate -1 to the gauge prop.

### LR-primary-advantage-029-016 — CEFR levels array `["A0-", "A0", "A0+", ...]` is hardcoded; should come from shared schema to stay in sync with backend enum

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/components/dashboard/user-level-indicator.tsx:24-44`
- Evidence: Lines 24-44 declare a 19-element `levels` array as a local constant. Per `apps/primary-advantage/AGENTS.md` "Schema layout", the primary-advantage-specific tables and enums live in `packages/db/src/schema/primary.ts`. The shared pattern (used in `user-reading-chart.tsx:30` for `activityType`) is to import enums from `@reading-advantage/db`: `import { activityType as ActivityType } from "@reading-advantage/db";`. The `cefrLevel` (or similarly named) enum is the natural single-source-of-truth for the gauge levels, but it is not imported here — the UI ships its own copy. After any backend migration that adds a new level (e.g., `A0--` or `C2+`), the gauge and the translation lookup drift.
- Impact: Medium. Drift between the UI's hardcoded array and the backend enum is a known class of bug (cf. LR-029-003 for the status enum). For a primary-student dashboard, the level drives the gauge color and the description text; any new level added to the backend will appear in the database but not in the UI, triggering LR-029-015 (the unknown-level crash).
- Recommendation: Add a `cefrLevel` enum to `packages/db/src/schema/primary.ts` (paralleling the `activityType`, `flashcardType`, `cardState` enums listed in `apps/primary-advantage/AGENTS.md`). Re-export from `packages/db/src/schema/index.ts`. Import in this file: `import { cefrLevel } from "@reading-advantage/db"; const levels = Object.values(cefrLevel);`. The ordering of `Object.values` matches insertion order in TypeScript enums, so the gauge ordering is preserved. Document the enum-to-UI mapping contract in `apps/primary-advantage/AGENTS.md` under a new "CEFR levels" section.

### LR-primary-advantage-029-017 — Non-standard CEFR sub-levels (`A0-`, `A0+`, `A1-`, ..., `C1+`) are intentional product divergence; the rationale is undocumented

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/components/dashboard/user-level-indicator.tsx:24-44`
- Evidence: Lines 24-44 include the levels `A0-`, `A0`, `A0+`, `A1-`, `A1`, `A1+`, `A2-`, `A2`, `A2+`, `B1-`, `B1`, `B1+`, `B2-`, `B2`, `B2+`, `C1-`, `C1`, `C1+`, `C2`. The standard CEFR scale (per the Council of Europe's Common European Framework of Reference for Languages) has six levels: `A1`, `A2`, `B1`, `B2`, `C1`, `C2`. Adding sub-levels with `+/-` suffixes is a primary-student-appropriate adaptation (more granular progress signals for younger learners), but the divergence from the standard is not documented in `apps/primary-advantage/AGENTS.md` or anywhere in the repository.
- Impact: Low. The non-standard levels themselves are not a bug — finer granularity is appropriate for primary students. The risk is for downstream consumers (the CEFR level may be shared with external systems like a school LMS or a parent-facing report) that expect the standard scale. Without documentation, future developers will not know which scale to use.
- Recommendation: Add a "CEFR scale" section to `apps/primary-advantage/AGENTS.md` documenting: (a) the full level list used in primary-advantage; (b) the rationale for sub-levels (finer-grained progress signals for primary students); (c) the mapping to standard CEFR (e.g., `A0-` and `A0` collapse to "pre-A1" in external reporting); (d) where the level is stored (Drizzle schema column) and where it is computed (presumably the level-setter component `student-cefr-level-setter.tsx` per batch 062).

### LR-primary-advantage-029-018 — `useTranslations` typed as `string | any`; type annotation lies about the return type and bypasses TypeScript safety

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/user-level-indicator.tsx:22`
- Evidence: Line 22 declares `const td: string | any = useTranslations("Reports.level.description");`. `useTranslations` from `next-intl` returns the `TFunction` (a function reference with metadata), not `string`. The `string | any` annotation is a manually-written type that is incorrect and defeats the purpose of TypeScript. The same anti-pattern recurs in `user-recent-activity.tsx:30` (`const td: string | any = useTranslations("Reports.activityType");`) — see LR-029-036. The result: any caller of `td(...)` gets a type of `any`, so passing a wrong-typed argument (e.g., a number instead of a string key) is not caught at compile time. This is the precise scenario that triggered LR-029-015 (the unknown-level runtime crash).
- Impact: Low individually, but it is the root cause of why LR-029-015's runtime crash is not caught at compile time. Two files have the same pattern; future copies will too unless the type is corrected.
- Recommendation: Replace lines 22 and the parallel line 30 in `user-recent-activity.tsx` with the correct type: `const td = useTranslations("Reports.level.description");` (no annotation, let TypeScript infer `TFunction`). The `useTranslations` return type provides auto-completion and type-checking of the key argument. Add a CI lint rule to forbid `: string | any` annotations on `useTranslations` results. Pair this fix with the safe `td(currentLevel)` call from LR-029-015 to fully eliminate the runtime crash.

### LR-primary-advantage-029-019 — Hardcoded colon `:` separator in "Your level : A1" line breaks RTL locales and locale-specific punctuation

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/user-level-indicator.tsx:80`
- Evidence: Line 80 renders `<div className="text-center text-xl font-bold">{t("yourlevel")} : {currentLevel}</div>`. The colon `:` is a hardcoded English punctuation. For `next-intl` locales that use different separators (Arabic `:` looks the same but the surrounding text direction may flip the natural reading order; CJK locales typically use `：` instead of `:`), the hardcoded colon produces inconsistent UI.
- Impact: Low. Five supported locales include `en`, `th`, `cn`, `tw`, `vi` (per `lib/utils.ts:85-93`); none of those are RTL, so the impact today is limited to the colon-glyph difference. The risk is for future locales added to the platform.
- Recommendation: Move the separator into the translation: `t("yourlevelWithSeparator", { level: currentLevel })` and add `"yourlevelWithSeparator": "Your level : {level}"` (en) / `"ระดับของคุณ : {level}"` (th) / `"您的级别 : {level}"` (cn) / etc. Or use a non-punctuated version: `t("yourlevel", { level: currentLevel })` with message `"Your level {level}"` (English reads OK; Thai/Chinese/Vietnamese readers typically prefer no separator at all). Document the i18n punctuation policy in `apps/primary-advantage/AGENTS.md` under a new "Punctuation" section.

### LR-primary-advantage-029-020 — Reading-stats chart labels and `Select` items are hardcoded English; Thai/Chinese/Vietnamese/Taiwanese users see English UI

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/user-reading-chart.tsx:32-41,117,121-123`
- Evidence: Three groups of hardcoded English strings:
  - Lines 32-41 define `chartConfig.inProgress.label = "inProgress"` and `chartConfig.Completed.label = "Completed"`. The legend renders these literal strings in all locales.
  - Line 117 renders `<CardTitle>Selected</CardTitle>` inside the `SelectTrigger` — visible to the user as a label.
  - Lines 121-123 render `<SelectItem value="type">Type</SelectItem>`, `<SelectItem value="genre">Genre</SelectItem>`, `<SelectItem value="subGenre">Subgenre</SelectItem>` — all English literals.
  
  Lines 151 and 157 do use `t("inProgress")` and `t("completed")` correctly for the Bar `name` prop, so the inconsistency is striking: some labels use `useTranslations`, others do not. `useTranslations("Reports")` is imported on line 29 and used on line 113 (`t("readingstatschart")`).
- Impact: High. The dropdown is the primary control of this chart (it switches between Type / Genre / Subgenre grouping). A Thai school student sees English labels while every other chart in the same dashboard uses Thai via `useTranslations`. The pattern is inconsistent with the sibling chart files (`user-activity-chart.tsx`, `user-heatmap-chart.tsx`, `user-level-indicator.tsx`, `user-recent-activity.tsx`) which all use `useTranslations` for their visible labels.
- Recommendation: Replace `chartConfig.inProgress.label` and `chartConfig.Completed.label` on lines 33-40 with translation calls. Since `chartConfig` is at module scope and `useTranslations` is a hook, move the chartConfig construction inside the component and use a `useMemo`:
  ```ts
  const t = useTranslations("Reports");
  const chartConfig = {
    inProgress: { label: t("inProgress"), color: "hsl(var(--primary))" },
    Completed: { label: t("completed"), color: "hsl(var(--chart-1))" },
  } satisfies ChartConfig;
  ```
  Replace line 117 with `<CardTitle>{t("filterLabel")}</CardTitle>` (or remove the CardTitle entirely — it's redundant with the SelectValue placeholder). Replace lines 121-123 with `<SelectItem value="type">{t("type")}</SelectItem>` etc., and add `type`, `genre`, `subGenre`, `filterLabel` keys to the `Reports` namespace in all five message files. Document the chart-i18n contract in `apps/primary-advantage/AGENTS.md` under a new "Chart i18n" section.

### LR-primary-advantage-029-021 — Triple `as any` cast hides type-system gap; `UserActivityLog` is missing `articleId` / `contentId` / `targetId`

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/user-reading-chart.tsx:61-65`
- Evidence: Lines 61-65 do:
  ```ts
  const articleId =
    (item as any).articleId ||
    (item as any).contentId ||
    (item as any).targetId ||
    undefined;
  ```
  Three separate `as any` casts in one expression, indicating the `UserActivityLog` type (imported from `@/types` on line 28) does not declare any of these three fields. The triple cast is a code smell: the type system is trying to warn the developer that the access is unsafe, and the developer is bypassing the warning. The fallback chain (articleId → contentId → targetId) suggests the data shape changed across versions or across modules, and the UI is papering over the inconsistency.
- Impact: Medium. If the backend ever returns a fourth shape (e.g., `lessonId` for the new lesson activity type referenced on line 55's commented-out `item.activityType === ActivityType.LESSON_READ`), this code silently returns `undefined` and the row is skipped (line 66: `if (!articleId) return;`). The skip is silent — no warning, no UI feedback — so the chart undercounts without the user noticing.
- Recommendation: Extend the `UserActivityLog` type in `@/types` to declare all known id fields:
  ```ts
  export interface UserActivityLog {
    // existing fields
    articleId?: string;
    contentId?: string;
    targetId?: string;
    lessonId?: string;
  }
  ```
  Replace the triple `as any` cast with a single typed lookup:
  ```ts
  const articleId = item.articleId ?? item.contentId ?? item.targetId ?? item.lessonId;
  ```
  Add a unit test that asserts all four fields are tried. Document the activity-log id-field contract in `apps/primary-advantage/AGENTS.md` under a new "Activity log" section.

### LR-primary-advantage-029-022 — Recurring typo `seletedValue` / `setSeletedValue` / `handleSeletedChange`; "seleted" instead of "selected"

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/user-reading-chart.tsx:49,106`
- Evidence: Line 49 declares `const [seletedValue, setSeletedValue] = React.useState<string>("type");`. Line 106 declares `const handleSeletedChange = (value: string) => { setSeletedValue(value); };`. All three identifiers have the same typo "seleted" instead of "selected" (the `c` is missing). The pattern matches the LR-029-010 recurring typo `UserActiviryChartProps` — same batch, same family of copy-paste-from-source typos.
- Impact: Low. The identifiers are local to the component, so the typo does not break imports. The risk is during refactors (a developer searching for `selectedValue` finds nothing).
- Recommendation: Rename `seletedValue` → `selectedValue`, `setSeletedValue` → `setSelectedValue`, `handleSeletedChange` → `handleSelectedChange` on lines 49, 106, 107. Update the read site on line 104 (`formatData(data, seletedValue)` → `formatData(data, selectedValue)`). Same lint rule from LR-029-010 catches future typos.

### LR-primary-advantage-029-023 — Dead imports `useTheme` (resolvedTheme unused), `CardFooter`, `CardDescription` in reading-stats chart

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/user-reading-chart.tsx:3,8-9,48`
- Evidence: Line 3 imports `useTheme` from `next-themes`. Line 48 destructures `const { resolvedTheme } = useTheme();` but `resolvedTheme` is never read in the component. Line 8 imports `CardFooter` and line 9 imports `CardDescription` from `@/components/ui/card`, but neither is rendered in the JSX (lines 109-164). The sibling files (`user-activity-chart.tsx` per LR-029-008, `user-heatmap-chart.tsx` per LR-029-014, `user-level-indicator.tsx`) have parallel dead-import patterns.
- Impact: Low. Bundle-size waste; maintenance trap. No functional bug.
- Recommendation: Delete lines 3, 8, 9. Delete line 48 (`const { resolvedTheme } = useTheme();`). If `resolvedTheme` was intended to drive a theme-aware color, wire it into the chart's colors via a `useMemo`. Run a project-wide `ts-prune` to find other dead imports.

### LR-primary-advantage-029-024 — Misspelled screen-reader-only text "Expaned" (should be "Expanded") is read aloud by assistive tech

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/dashboard/user-recent-activity.tsx:48`
- Evidence: Line 48 renders `<span className="sr-only">Expaned</span>` as the accessible label for the `ChevronsUpDownIcon` collapse/expand button. The screen-reader-only text is misspelled — "Expaned" instead of "Expanded" — and is read aloud by assistive technology (NVDA, JAWS, VoiceOver) for users with visual impairments. The component's `Collapsible` primitive (lines 40, 45) toggles `isOpen`, and the button toggles between collapsed/expanded states. The text is therefore presented to screen-reader users every time they focus the button.
- Impact: High. For a primary-student audience that includes students with visual impairments (low vision, dyslexia with visual tracking difficulties), hearing a misspelled word is jarring and reduces trust in the platform. The misspelling is also indexed by accessibility scanners (axe-core, Lighthouse) as an `aria-label` issue and may fail the project's accessibility audit if one exists.
- Recommendation: Replace "Expaned" with "Expanded" on line 48. Better, make the label dynamic based on `isOpen`:
  ```tsx
  <span className="sr-only">{isOpen ? "Collapse activity list" : "Expand activity list"}</span>
  ```
  Add `Collapse activity list` / `Expand activity list` keys to the `Reports` namespace in all five message files. Document the screen-reader-text policy in `apps/primary-advantage/AGENTS.md` under a new "Accessibility" section. Add an ESLint rule (`jsx-a11y` already covers many patterns; add a custom spellcheck for `sr-only` content) to catch future misspellings.

### LR-primary-advantage-029-025 — `mostRecentActivity = data[0]` assumes pre-sorted input; no defensive sort, no contract documentation

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/user-recent-activity.tsx:34-36`
- Evidence: Lines 34-36 do `const mostRecentActivity = data[0]; const remainingActivities = data.slice(1);`. The component accepts `data: UserActivityLog[]` (lines 23-25) but the contract for "what order is `data` in?" is undocumented. If the parent (`app/[locale]/(student)/student/reports/page.tsx` per batch 005) passes unsorted data, "most recent" is whichever row happens to be first — likely wrong.
- Impact: Medium. The "recent activity" widget is the user's first glance at what they did today. If `data` is unsorted (or sorted in the wrong direction), the wrong activity is highlighted as "most recent" — a primary student may see an old article as "today's activity". The bug is silent and intermittent (depends on the backend query order).
- Recommendation: Sort defensively in the component (small array, negligible cost):
  ```ts
  const sorted = React.useMemo(
    () => [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [data],
  );
  const mostRecentActivity = sorted[0];
  const remainingActivities = sorted.slice(1);
  ```
  Better: enforce the contract at the data-source layer (the API should return sorted data) and document it in `apps/primary-advantage/AGENTS.md` under a new "Activity feed ordering" section. Add a unit test that asserts `mostRecentActivity` is the entry with the largest `createdAt`.

### LR-primary-advantage-029-026 — Duplicated JSX pattern for "most recent" and "remaining" activities; should be extracted into a subcomponent

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/user-recent-activity.tsx:55-79,83-110`
- Evidence: Lines 55-79 render the "most recent activity" row (with `CheckCircleIcon`/`ClockIcon` badge, `td(...)` label, `formatDate(...)` timestamp). Lines 83-110 render the "remaining activities" rows in a `.map(...)` loop with the **identical JSX structure** (compare line-by-line: `<div className="flex items-center justify-between px-4 py-2 font-mono text-sm">`, `<div className="font-semibold capitalize">{td(activity.activityType)}</div>`, `<div className="text-xs text-gray-500">{formatDate(activity.createdAt)}</div>`, badge conditional). The duplication is exactly 25 lines repeated.
- Impact: Medium. Maintenance liability: any change to the row layout must be made in two places. The risk of drift is real — already, the commented-out XP display on lines 62-65 and 93-96 is duplicated identically, so a future change to that block must also be made in both places. The next person who reads the file will likely miss the duplication and edit only one site.
- Recommendation: Extract a `<ActivityItem activity={...} />` subcomponent inside this file:
  ```tsx
  function ActivityItem({ activity }: { activity: UserActivityLog }) {
    const t = useTranslations("Reports");
    const td = useTranslations("Reports.activityType");
    const formatDate = useFormatDate();
    return (
      <div className="flex items-center justify-between px-4 py-2 font-mono text-sm">
        <div>
          <div className="font-semibold capitalize">{td(activity.activityType)}</div>
          <div className="text-xs text-gray-500">{formatDate(activity.createdAt)}</div>
        </div>
        {activity.completed ? (
          <Badge className="bg-green-500 hover:bg-green-500"><CheckCircleIcon className="mr-1 size-3" />{t("completed")}</Badge>
        ) : (
          <Badge className="bg-orange-400 hover:bg-orange-400"><ClockIcon className="mr-1 size-3" />{t("inProgress")}</Badge>
        )}
      </div>
    );
  }
  ```
  Replace lines 54-80 and lines 82-111 with `<ActivityItem activity={mostRecentActivity} />` and `<ActivityItem key={i} activity={activity} />` respectively. The duplication-and-extract is a small mechanical change with significant maintenance payoff.

### LR-primary-advantage-029-027 — Hardcoded green/orange badge colors ignore dark mode; activity-status badges are hard to read in dark theme

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/user-recent-activity.tsx:69,74,100,105`
- Evidence: Lines 69, 100 render `<Badge className="bg-green-500 hover:bg-green-500">` and lines 74, 105 render `<Badge className="bg-orange-400 hover:bg-orange-400">`. No `dark:` variant. Same anti-pattern as LR-029-013 in `user-heatmap-chart.tsx`. The app uses `next-themes` (per `components/providers/theme-provider.tsx` per batch 051) so the dashboard renders in dark mode for users who enable it.
- Impact: Medium. Activity-status badges are the primary signal in the recent-activity widget — "I completed this" (green) vs "I'm in progress" (orange). In dark mode, the colors are still visible but the contrast with the dark background is reduced, particularly for `bg-orange-400` against `bg-gray-900`.
- Recommendation: Apply the same semantic-token fix from LR-029-013: define `--badge-success` and `--badge-progress` in `app/globals.css`, reference them in this file, and apply the same pattern across all dashboard widgets. Add a CSS-variable contract test (Vitest + happy-dom) that asserts the resolved background color is theme-aware.

### LR-primary-advantage-029-028 — Dead commented-out JSX blocks duplicate XP-display logic; future maintenance trap

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/dashboard/user-recent-activity.tsx:62-65,93-96`
- Evidence: Lines 62-65 and lines 93-96 contain identical commented-out JSX:
  ```tsx
  {/* {mostRecentActivity.completed &&
  mostRecentActivity.xpEarned !== 0
    ? ` - Completed with ${mostRecentActivity.xpEarned} XP`
    : ""} */}
  ```
  (the second block uses `activity.completed` / `activity.xpEarned` instead of `mostRecentActivity.completed` / `mostRecentActivity.xpEarned`). The duplicated commented code is a maintenance trap: a developer adding a new field to the row would need to update both blocks (and the active JSX) to stay consistent. The duplication is also exactly the surface that LR-029-026 recommends extracting into a subcomponent — once extracted, the comment moves into one place.
- Impact: Low. Dead code that confuses readers. No functional bug today.
- Recommendation: Either (a) delete both commented blocks (the XP-display feature was intentionally removed), or (b) uncomment and ship the XP display in the extracted `<ActivityItem>` subcomponent from LR-029-026. Document the decision in `apps/primary-advantage/AGENTS.md` under a new "Activity row schema" section so future readers know whether to restore or remove.

## No-Finding Notes

- `apps/primary-advantage/components/dashboard/reminder-reread-table.tsx`: reviewed line-by-line (1-233). 4 findings documented above (LR-001 through LR-004). No additional findings for the import block (lines 1-29 — all symbols used except `ShieldCheck` — wait, no `ShieldCheck` import here), the `useReactTable` setup (lines 144-161 — correctly wired with sorting/filtering/visibility/selection state), the `fetchData` callback dependency (line 72 — correct `[user?.id]` dependency), the row click handler (lines 200-216 — uses `useRouter` from `@/i18n/navigation` correctly for localized routing), or the empty-state and loading-state rendering (lines 191-227 — correctly translated via `t("loading")` and `t("noArticlesToRead")`). The `useTranslations("Overall.status")` on line 43 correctly looks up status labels — the bug is the missing fallback (LR-029-003), not the lookup.
- `apps/primary-advantage/components/dashboard/user-activity-chart.tsx`: reviewed line-by-line (1-319). 7 findings documented above (LR-005 through LR-011). No additional findings for the date-range Select preset handlers on lines 209-247 (correctly builds `from`/`to` for today/yesterday/last-week/last-30-days/this-month/last-month — the day-boundary logic per preset is correct), the `CartesianGrid`, `XAxis`, `Line` Recharts configuration (lines 293-312 — correctly wired except for the color variable mismatch in LR-006), the `inProgressCount` / `completedCount` filter logic on lines 140-146 (correctly counts by `completed` boolean), or the responsive grid layout on lines 156-174 (md:col-span-4 / md:col-span-2 correctly applied). The two Card wrappers on lines 150 and 279 are correctly structured.
- `apps/primary-advantage/components/dashboard/user-heatmap-chart.tsx`: reviewed line-by-line (1-74). 4 findings documented above (LR-012 through LR-015). No additional findings for the `CalendarHeatmap` invocation (lines 63-70 — correctly accepts `variantClassnames` and `datesPerVariant`), the `useTranslations("Reports")` call on line 53 (correctly resolved to `t("activityheatmap")`), the `UserActivityHeatMap` default export (line 51 — correctly named), or the responsive card layout (line 56 `md:col-span-1`).
- `apps/primary-advantage/components/dashboard/user-level-indicator.tsx`: reviewed line-by-line (1-86). 4 findings documented above (LR-015 through LR-019). No additional findings for the `dynamic(() => import("react-gauge-component"), { ssr: false })` SSR-disabled import (lines 13-15 — correct for a client-only gauge library), the gauge `arc` configuration (lines 57-63 — `nbSubArcs: levels.length` correctly matches the levels array length), the `pointer` configuration (lines 64-68 — `length: 0.6` and `animationDelay: 0` are valid), or the `labels.valueLabel.hide: true` (line 71 — correct, since the level is rendered separately on line 80).
- `apps/primary-advantage/components/dashboard/user-reading-chart.tsx`: reviewed line-by-line (1-167). 5 findings documented above (LR-020 through LR-024). No additional findings for the `activityType` import on line 30 (`import { activityType as ActivityType } from "@reading-advantage/db";` — correct shared-package usage per AGENTS.md), the `formatData` filter on lines 53-56 (correctly filters by `ActivityType.ARTICLE_READ`), the articleMap de-duplication logic on lines 58-76 (correctly keeps the latest per-article record), the `result` aggregation on lines 77-91 (correctly increments `inProgress` / `completed` per category key), or the BarChart Recharts integration (lines 128-160 — correctly wired with `accessibilityLayer`, `radius={8}`, `name={t(...)}`).
- `apps/primary-advantage/components/dashboard/user-recent-activity.tsx`: reviewed line-by-line (1-118). 4 findings documented above (LR-024 through LR-028). No additional findings for the `Collapsible` integration (lines 40, 45, 81 — correctly toggles `isOpen` via `onOpenChange`), the `ScrollArea` invocation (line 53 — correctly accepts the dynamic height class), the `useTranslations("Reports")` / `useTranslations("Reports.activityType")` calls (lines 29-30 — correctly resolved), the icon imports (line 21 — all three icons used), or the `Card` wrapper (line 39 — correctly structured with `mt-4` spacing).

## Summary

- Total findings: 28 (1 Critical, 4 High, 12 Medium, 11 Low).
- Per-file finding count: 4 (file 1), 7 (file 2), 4 (file 3), 4 (file 4), 5 (file 5), 4 (file 6). Total 28.
- Severity tally: Critical = LR-015 (unknown CEFR level crashes gauge / translation). High = LR-005 (XP chart resets to 0 each day), LR-006 (chart stroke color variable mismatch), LR-011 (heatmap UTC day-boundary off-by-one), LR-020 (reading-stats chart hardcoded English labels), LR-024 (misspelled screen-reader text). Medium = LR-002 (parseInt NaN rendering), LR-003 (status no-fallback), LR-004 (raw fetch bypasses data layer), LR-009 (date-fns English-locale output), LR-012 (hardcoded heatmap thresholds), LR-013 (heatmap colors ignore dark mode), LR-016 (CEFR levels hardcoded, drift risk), LR-021 (triple `as any` cast), LR-025 (assumes pre-sorted data), LR-026 (duplicated JSX for activity rows), LR-027 (hardcoded badge colors). Low = LR-001 (Tailwind typo), LR-007 (CustomTooltip dead code), LR-008 (dead imports and locale), LR-010 (recurring `UserActiviryChartProps` typo), LR-014 (heatmapp variable typos + unused CardDescription), LR-017 (non-standard CEFR sub-levels undocumented), LR-018 (`useTranslations` typed as `string | any`), LR-019 (hardcoded colon separator), LR-022 (`seletedValue` typo), LR-023 (dead imports), LR-028 (dead commented JSX blocks).
- Critical-severity findings: LR-015 (the `levels.indexOf(currentLevel)` returns -1 for unknown levels and the translation lookup can throw at runtime — a hard crash on a primary-student dashboard).
- Highest-impact fork-divergence categories for this batch: `Fork-specific regression` (the majority of findings: LR-001, LR-002, LR-003, LR-004, LR-005, LR-006, LR-007, LR-008, LR-009, LR-010, LR-011, LR-013, LR-014, LR-018, LR-019, LR-020, LR-021, LR-022, LR-023, LR-025, LR-026, LR-027, LR-028 — most of the batch); `Primary-student adaptation risk` (LR-012, LR-015, LR-024 — heatmap thresholds, CEFR level crash, screen-reader text); `Shared package migration blocker` (LR-004, LR-016 — fetch bypassing shared layer, CEFR enum drift); `Intentional product divergence that needs documentation` (LR-009, LR-017 — locale-aware dates, non-standard CEFR sub-levels).
- Cross-batch links: LR-001 mirrors LR-028-009 (Tailwind `captoliza` typo); LR-002 mirrors LR-028-011 (parseInt NaN); LR-003 mirrors LR-028-010 (status map no-fallback); LR-020 is the same i18n gap as LR-028-013 (English-only dashboard labels); LR-027 mirrors LR-029-013 (hardcoded colors ignore dark mode). The CEFR level drift risk (LR-016) is the same family of issue as LR-029-003 (status enum drift). The dead-imports pattern (LR-008, LR-023) recurs across every file in this batch and matches the pattern in batch 028.
- No source-code, plan.md, or `line-review-coverage.tsv` edits were made. The patch TSV is written under `line-review/coverage-patches/primary-advantage-029.tsv` and the evidence is in this file.