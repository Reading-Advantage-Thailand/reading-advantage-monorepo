# Line Review Evidence: primary-advantage-045

Reviewer: coder-deepseek-v4-flash/primary-advantage-045
Files assigned: 10
Lines assigned: 1030

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/lesson/task/task-sentence-collection.tsx` | 1-194 | reviewed | 1 |
| `apps/primary-advantage/components/lesson/task/task-sentence-flashcards.tsx` | 1-34 | reviewed | 0 |
| `apps/primary-advantage/components/lesson/task/task-short-answer.tsx` | 1-34 | reviewed | 0 |
| `apps/primary-advantage/components/lesson/task/task-vocabulary-collection.tsx` | 1-182 | reviewed | 2 |
| `apps/primary-advantage/components/lesson/task/task-vocabulary-flashcards.tsx` | 1-38 | reviewed | 0 |
| `apps/primary-advantage/components/lesson/task/task-vocabulary-matching.tsx` | 1-38 | reviewed | 0 |
| `apps/primary-advantage/components/manage-tab.tsx` | 1-349 | reviewed | 2 |
| `apps/primary-advantage/components/nav/main-nav.tsx` | 1-73 | reviewed | 0 |
| `apps/primary-advantage/components/nav/mobile-nav.tsx` | 1-45 | reviewed | 1 |
| `apps/primary-advantage/components/nav/new-main-nav.tsx` | 1-43 | reviewed | 0 |

## Findings

### LR-primary-advantage-045-001 — Missing `"use client"` directive in `task-vocabulary-collection.tsx`

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-vocabulary-collection.tsx:1`
- Evidence: The file uses `useEffect`, `useState`, and `useTranslations` (React hooks and client-only APIs) but lacks a `"use client"` directive at the top of the file. This component will fail at runtime if imported into a Server Component or when tree-shaking rules change. The structurally identical sibling `task-sentence-collection.tsx` (also in this batch) correctly includes `"use client"` on line 1.
- Impact: If this component is ever imported from a server component or if Next.js bundling changes, it will throw a runtime error ("You're importing a component that needs useState/useEffect but it doesn't have 'use client'").
- Recommendation: Add `"use client"` as the first line of the file.

### LR-primary-advantage-045-002 — Hardcoded Thai locale in `task-vocabulary-collection.tsx` definition display

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-vocabulary-collection.tsx:148-149`
- Evidence: Line 148 renders `{word.definition?.th}`, hardcoding to Thai regardless of the user's active locale. The sibling component `task-sentence-collection.tsx` uses a proper `getLocalizedTranslation()` helper (lines 55-71) that resolves the translation based on the active locale with a fallback chain.
- Impact: Non-Thai users always see the Thai definition text regardless of their selected locale, breaking i18n for this component.
- Recommendation: Adopt the same `getLocalizedTranslation()` pattern used in `task-sentence-collection.tsx` or a similar locale-aware rendering.

### LR-primary-advantage-045-003 — Invalid Tailwind class `gap-` in `manage-tab.tsx`

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/manage-tab.tsx:180`
- Evidence: Line 180 contains the CSS class `gap-` with a trailing dash and no size value. Tailwind does not recognize this class — it must be `gap-{size}` (e.g., `gap-2`, `gap-4`). This likely results in no gap spacing being applied to the flex container.
- Impact: The due-date badge element may not have the intended spacing from adjacent content. Cosmetic defect.
- Recommendation: Replace `gap-` with a specific gap value such as `gap-2`.

### LR-primary-advantage-045-004 — Translation namespace mismatch in `getSimpleDueText` parameter type annotation

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/manage-tab.tsx:69-72` (function definition), `:188` (call site)
- Evidence: The `getSimpleDueText` function (line 69-72) annotates its `t` parameter with type `ReturnType<typeof useTranslations<"sentencesCard.manage">>`, but at the call site (line 188) it is invoked with `t` from `useTranslations("SentencesPage.manage")` (line 120). The namespace string differs (`sentencesCard.manage` vs `SentencesPage.manage`). This type mismatch is not caught at runtime as long as both namespaces contain the expected translation keys, but it leaves the code fragile to translation refactoring.
- Impact: If the `SentencesPage.manage` namespace is ever restructured, the type discrepancy may mask missing keys or the wrong namespace being referenced.
- Recommendation: Align the type annotation in `getSimpleDueText` with the actual namespace used at the call site, or refactor to a shared type.

### LR-primary-advantage-045-005 — Missing `"use client"` directive in `mobile-nav.tsx`

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/nav/mobile-nav.tsx:1`
- Evidence: The file uses `useLockBody` (a React hook) and `useTranslations` (next-intl client hook) but lacks a `"use client"` directive. Currently it works because it is only imported by `main-nav.tsx` (which is a client component), but it would break if imported directly from a server component or if the import path changes.
- Impact: Fragile to import changes. If any server component imports this directly, it will throw a runtime error.
- Recommendation: Add `"use client"` as the first line to make this component safely importable from any context.

### LR-primary-advantage-045-006 — Data model field name typo `sentencsAndWordsForFlashcard`

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/lesson/task/task-sentence-collection.tsx:20-21`, `apps/primary-advantage/components/lesson/task/task-vocabulary-collection.tsx:31-32`
- Evidence: Both `task-sentence-collection.tsx` (lines 20-21) and `task-vocabulary-collection.tsx` (lines 31-32) reference `article?.sentencsAndWordsForFlashcard` — note the misspelling "sentencs" (missing the letter 'e'). This typo likely originates from the shared data model or schema definition and is not isolated to this batch.
- Impact: While consistent across the app, the misspelling reduces code readability and may cause confusion during maintenance or schema migrations.
- Recommendation: Rename to `sentencesAndWordsForFlashcard` across the schema, types, and all referencing components in a follow-up track.

## No-Finding Notes

- `apps/primary-advantage/components/lesson/task/task-sentence-flashcards.tsx`: reviewed line-by-line (34 lines); clean wrapper component with no issues.
- `apps/primary-advantage/components/lesson/task/task-short-answer.tsx`: reviewed line-by-line (34 lines); clean wrapper with correct `"use client"` directive.
- `apps/primary-advantage/components/lesson/task/task-vocabulary-flashcards.tsx`: reviewed line-by-line (38 lines); clean wrapper with correct `"use client"` directive.
- `apps/primary-advantage/components/lesson/task/task-vocabulary-matching.tsx`: reviewed line-by-line (38 lines); clean wrapper with correct `"use client"` directive.
- `apps/primary-advantage/components/nav/main-nav.tsx`: reviewed line-by-line (73 lines); correct `"use client"` directive, proper imports, standard navigation component.
- `apps/primary-advantage/components/nav/new-main-nav.tsx`: reviewed line-by-line (43 lines); correct `"use client"` directive, clean nav component with icon support.
