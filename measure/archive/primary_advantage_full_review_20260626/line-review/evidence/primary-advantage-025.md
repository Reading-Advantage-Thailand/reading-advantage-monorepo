# Line Review Evidence: primary-advantage-025

Reviewer: coder-deepseek-v4-flash/primary-advantage-025
Files assigned: 2
Lines assigned: 1164

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/articles/article-content.tsx` | 1-1034 | reviewed | 5 |
| `apps/primary-advantage/components/articles/article-select.tsx` | 1-130 | reviewed | 3 |

## Findings

### LR-primary-advantage-025-001 — Dead/commented-out code block (~220 lines)

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/articles/article-content.tsx:637-858`
- Evidence: Lines 637-858 (approximately 220 lines) contain an entire commented-out implementation of sentence rendering with ContextMenu, word highlighting, and sentence splitting. The original implementation was replaced by the active code at lines 860-1031 but the old version was left in place as a comment block.
- Impact: Increases file size by ~20%. Creates maintenance liability — refactoring the active code may require digging through dead code. Confuses code navigation.
- Recommendation: Remove the commented-out block in a cleanup pass.

### LR-primary-advantage-025-002 — Contraction merge missing RIGHT SINGLE QUOTATION MARK (U+2019)

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/articles/article-content.tsx:949`
- Evidence: The active sentence-rendering code at line 949 checks `(next === "'" || next === "'")` — both operands are ASCII apostrophe (0x27). The original (commented-out) code at line 684 checked `(next === "'" || next === "’")` where the second char is RIGHT SINGLE QUOTATION MARK U+2019 (0xE2 0x80 0x99). The active code path therefore fails to detect contractions containing the curly/typographic apostrophe character.
- Impact: Contractions written with curly apostrophes (common in AI-generated content, rich text editors, or pasted content) are not merged during word highlighting. This causes word-index drift where a contraction like "don't" with `'` is split into 3 tokens instead of merged into 1, breaking the word-by-word audio highlight alignment.
- Recommendation: Fix line 949 to match line 684: `(next === "'" || next === "’")`.

### LR-primary-advantage-025-003 — SkipBack/SkipForward buttons have no onClick handlers

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/articles/article-content.tsx:536-538`, `:547-551`, `:596-598`, `:607-609`
- Evidence: `<SkipBackIcon />` and `<SkipForwardIcon />` Button components in both the fixed controls section (lines 536-538, 547-551) and the normal audio player section (lines 596-598, 607-609) are rendered without onClick handlers. They are decorative/non-functional. No `SkipBackIcon` click handler is defined anywhere in the component.
- Impact: Users see skip-back and skip-forward buttons that do nothing when clicked. This is confusing and degrades the audio playback experience.
- Recommendation: Either implement skip-forward (reset to next sentence start) and skip-back (go to previous sentence) logic, or remove the buttons.

### LR-primary-advantage-025-004 — Typo: `isPanding` instead of `isPending`

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/articles/article-content.tsx:62`
- Evidence: `const [isPanding, startTransition] = useTransition();` — The variable is misspelled as `isPanding` instead of `isPending`. Since `useTransition()` returns `[isPending, startTransition]`, the destructured `isPanding` captures the correct value, but the name is misleading. The variable is never used anywhere else in the component, making it dormant dead code.
- Impact: Cosmetic code quality issue. May cause confusion during maintenance (a future developer might expect `isPanding` to be used or look for the correctly-spelled `isPending`).
- Recommendation: Rename to `isPending` or remove the unused destructured variable.

### LR-primary-advantage-025-005 — Direct server action call from client component

- Severity: Low (Informational)
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/articles/article-content.tsx:30`
- Evidence: Line 30 imports `{ saveFlashcard } from "@/actions/flashcard"` and calls it directly in the client component (line 356). This is the established pattern across the codebase but violates the monorepo AGENTS.md preference for backend-as-code patterns where business logic belongs in `packages/backend` modules, not in React components or server actions.
- Impact: Couples the UI component to server-action implementation details. Hinders reuse from workers, cron jobs, or non-Next.js contexts.
- Recommendation: Refactor to call through a backend-adapter layer when shared module patterns are established.

### LR-primary-advantage-025-006 — Direct fetch() to internal API route from client component

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/articles/article-select.tsx:47`
- Evidence: Line 47: `const res = await fetch(\`/api/articles?${params.toString()}\`)` — The client component directly fetches a Next.js Route Handler rather than using a backend module or tRPC adapter. This couples the client to the route structure and bypasses any typed contract.
- Impact: Brittle when routes change; no type safety on request/response; bypasses any backend module abstractions.
- Recommendation: Consider wrapping in a typed API client function or using a shared query hook.

### LR-primary-advantage-025-007 — Array index used as React key prop

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/articles/article-select.tsx:114`
- Evidence: `<ArticleShowcaseCard key={index} article={article} />` — Uses the array index as the React key instead of a stable unique identifier (`article.id`). If articles are sorted, filtered, or re-ordered, React may unnecessarily re-render or lose component state.
- Impact: Sub-optimal rendering performance; potential loss of scroll position or focus when articles change.
- Recommendation: Change to `key={article.id}`.

### LR-primary-advantage-025-008 — No input validation on URLSearchParams from searchParams

- Severity: Low
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/articles/article-select.tsx:30-32,39-45`
- Evidence: `searchParams.get("type")`, `searchParams.get("genre")`, `searchParams.get("subgenre")` are read from URL search params and passed directly into `URLSearchParams` without any validation or sanitization. A malicious or malformed URL could pass unexpected values to the `/api/articles` endpoint.
- Impact: Low risk for a primary-student-facing app (students are unlikely to manipulate URLs maliciously), but it's a defense-in-depth gap. Invalid genre/subgenre values may produce confusing empty states or server errors.
- Recommendation: Validate/coerce search param values against a known set of allowed values before constructing the fetch URL.

## No-Finding Notes

- None. Both files had findings.

## Review Summary

- **Total files assigned**: 2
- **Total lines reviewed**: 1164
- **Total findings**: 8 (5 in article-content.tsx, 3 in article-select.tsx)
- **Fork-divergence breakdown**:
  - Same root cause as Reading Advantage: 4 (LR-001, LR-005, LR-006, LR-007)
  - Fork-specific regression: 2 (LR-002, LR-004)
  - Primary-student adaptation risk: 1 (LR-008)
  - Intentional product divergence that needs documentation: 0
  - Shared package migration blocker: 0
- **Severity breakdown**: Low: 6, Medium: 2
