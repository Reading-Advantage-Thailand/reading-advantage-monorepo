# Line Review Evidence: primary-advantage-064

Reviewer: coder-vocengine-ark-code-latest/primary-advantage-064
Files assigned: 8
Lines assigned: 1055

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/ui/badge.tsx` | 1-60 | reviewed | 0 |
| `apps/primary-advantage/components/ui/button.tsx` | 1-61 | reviewed | 0 |
| `apps/primary-advantage/components/ui/calendar-heatmap.tsx` | 1-211 | reviewed | 1 |
| `apps/primary-advantage/components/ui/calendar.tsx` | 1-213 | reviewed | 0 |
| `apps/primary-advantage/components/ui/card.tsx` | 1-92 | reviewed | 0 |
| `apps/primary-advantage/components/ui/chart.tsx` | 1-353 | reviewed | 1 |
| `apps/primary-advantage/components/ui/checkbox.tsx` | 1-32 | reviewed | 0 |
| `apps/primary-advantage/components/ui/collapsible.tsx` | 1-33 | reviewed | 1 |

## Findings

### LR-064-001 — `collapsible.tsx` references `React.ComponentProps` without importing `React`

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/ui/collapsible.tsx:7,13,23`
- Evidence: This component was upgraded from the Reading Advantage version (`apps/reading-advantage/components/ui/collapsible.tsx`, 11 lines, which simply aliases `CollapsiblePrimitive.Root` etc.) to wrapper functions that add `data-slot` attributes. The new wrappers type their props with `React.ComponentProps<...>` on lines 7, 13, and 23, but the file imports only `CollapsiblePrimitive` (line 3) — there is no `import * as React from "react"`. Every other UI file in this batch that uses the `React.*` type namespace imports React explicitly (e.g. `badge.tsx:1`, `button.tsx:1`, `checkbox.tsx:3`, `card.tsx:1`). The reference therefore resolves only via the UMD global that `@types/react` exports, which TypeScript flags inside an ES module (`TS2686: 'React' refers to a UMD global, but the current file is a module`). The identical omission exists in `apps/science-advantage/components/ui/collapsible.tsx`, indicating a copied shadcn snippet rather than an intentional design choice.
- Impact: Latent type-checking fragility. Depending on the resolved `@types/react` build and `tsconfig` lib settings, this either emits a UMD-global type error or silently relies on global ambient typing that breaks the moment React's `export as namespace` is dropped. It is inconsistent with the explicit-import convention used by every sibling component.
- Recommendation: Add `import * as React from "react";` to the top of `collapsible.tsx` so the `React.ComponentProps` type references resolve through an explicit import like the other UI primitives.

### LR-064-002 — `chart.tsx` injects theme colors via `dangerouslySetInnerHTML`

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/ui/chart.tsx:82-101`
- Evidence: `ChartStyle` builds a `<style>` element using `dangerouslySetInnerHTML` (line 83) whose body interpolates `itemConfig.color` / `itemConfig.theme[...]` values straight into CSS custom properties (lines 86-99) with no sanitization or escaping. If any `ChartConfig.color`/`theme` value were ever sourced from untrusted/user-controlled data, the string would be injected verbatim into the document `<style>`. The same construct is present in `apps/reading-advantage/components/ui/chart.tsx:81`, so this is an inherited shadcn pattern, not a fork-introduced one.
- Impact: In normal usage chart configs are developer-authored constants, so risk is currently low. It becomes a CSS/markup injection surface only if config colors flow from external input. Worth noting for the shared fork audit because the risk and the remediation would be identical across Reading Advantage and Primary Advantage.
- Recommendation: Keep `ChartConfig` color/theme values restricted to developer-authored literals; if dynamic colors are ever needed, validate them against a strict CSS-color allowlist (e.g. a Zod regex) before interpolation. Track as a shared-pattern note rather than a primary-only fix.

### LR-064-003 — `categorizeDatesPerVariant` throws on empty `weightedDates`

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/ui/calendar-heatmap.tsx:81-82,112-114`
- Evidence: Line 112 normalizes `weightedDates = weightedDates ?? []`, and line 113-114 falls back to `categorizeDatesPerVariant(weightedDates, noOfVariants)` whenever `datesPerVariant` is not supplied. Inside `categorizeDatesPerVariant`, lines 81-82 read `sortedEntries[0].weight` and `sortedEntries[sortedEntries.length - 1].weight` with no length guard. When `weightedDates` is an empty array (the very default that line 112 substitutes), `sortedEntries[0]` is `undefined` and `.weight` throws `TypeError: Cannot read properties of undefined`. Additionally line 77 calls `weightedDates.sort(...)`, which mutates the caller-supplied array prop in place. The same unguarded indexing and in-place sort exist in `apps/reading-advantage/components/ui/calendar-heatmap.tsx` (sort at line 67), so the defect is inherited from the upstream component.
- Impact: Any consumer that renders `CalendarHeatmap` with the `weightedDates` variant but an empty (or yet-to-load) dataset, and without passing `datesPerVariant`, crashes the render. For a primary-student progress/streak heatmap this is a plausible empty-state (new student with zero activity), so the empty-array path is reachable in normal product use.
- Recommendation: Guard `categorizeDatesPerVariant` to return `noOfVariants` empty arrays when `weightedDates.length === 0` (early return before reading `sortedEntries[0]`), and copy the array before sorting (`[...weightedDates].sort(...)`) to avoid mutating the prop. Coordinate the fix with the identical Reading Advantage component.

## No-Finding Notes

- `apps/primary-advantage/components/ui/badge.tsx`: reviewed line-by-line (1-60); no material findings. Standard shadcn Badge using `class-variance-authority` with explicit `React` import (line 1), `asChild`/`Slot` support, and `data-slot="badge"`. The added `active`/`inactive`/`expired` status variants (lines 21-26) and `basic`/`premium`/`enterprise` subscription variants (lines 28-33) are an intentional product extension over the Reading Advantage badge and are self-contained Tailwind class strings — harmless, no security/type concern.
- `apps/primary-advantage/components/ui/button.tsx`: reviewed line-by-line (1-61); no findings. Standard shadcn Button with explicit React import, `cva` variants, and `Slot`. The extra `accept`/`reject` color variants (lines 23-24) are an intentional, harmless product extension. Correct `cn(buttonVariants({ variant, size, className }))` usage.
- `apps/primary-advantage/components/ui/calendar.tsx`: reviewed line-by-line (1-213); no findings. Current react-day-picker v9 shadcn Calendar — proper `getDefaultClassNames` merge, RTL handling (lines 33-34), `Chevron`/`DayButton`/`WeekNumber` component overrides, and a `useEffect` focus handler with a correct `[modifiers.focused]` dependency (lines 184-186). Type references use `React.*` via the explicit `import * as React` (line 3).
- `apps/primary-advantage/components/ui/card.tsx`: reviewed line-by-line (1-92); no findings. Plain shadcn Card primitive family (`Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardAction`/`CardContent`/`CardFooter`) with explicit React import and `data-slot` attributes. No logic, no risk.
- `apps/primary-advantage/components/ui/chart.tsx`: see LR-064-002. Remainder of the file (context guard at lines 27-35, payload-config helper at lines 308-344 with proper `unknown` narrowing, tooltip/legend rendering) reviewed line-by-line and is clean.
- `apps/primary-advantage/components/ui/checkbox.tsx`: reviewed line-by-line (1-32); no findings. Standard Radix Checkbox wrapper with explicit React import (line 3), `data-slot` attributes, and `CheckIcon` indicator. No issues.
- `apps/primary-advantage/components/ui/collapsible.tsx`: see LR-064-001. Logic is otherwise a correct thin Radix wrapper; the only concern is the missing explicit `React` import.
