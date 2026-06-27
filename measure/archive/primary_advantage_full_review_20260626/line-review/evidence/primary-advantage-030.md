# Line Review Evidence: primary-advantage-030

Reviewer: coder-deepseek-v4-flash/primary-advantage-030
Files assigned: 4
Lines assigned: 1183

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/primary-advantage/components/dashboard/user-xpoverall-chart.tsx | 1-232 | reviewed | 2 |
| apps/primary-advantage/components/flashcards/deck-view.tsx | 1-500 | reviewed | 3 |
| apps/primary-advantage/components/flashcards/empty-deck.tsx | 1-310 | reviewed | 1 |
| apps/primary-advantage/components/flashcards/flashcard-dashboard.tsx | 1-141 | reviewed | 2 |

## Findings

### LR-primary-advantage-030-001 — Sort comparator uses same date reference for both operands

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/dashboard/user-xpoverall-chart.tsx:79`
- Evidence: Line 79 reads `const dateB = new Date(a);` but should read `const dateB = new Date(b);`. The sort comparator at lines 76-81 initializes both `dateA` and `dateB` from `a`, so every comparison returns 0, producing incorrect or undefined sort order for the month axis.
- Impact: Months on the x-axis may appear in arbitrary order instead of chronological, making the chart misleading.
- Recommendation: Fix the variable to use `b` for `dateB`.

### LR-primary-advantage-030-002 — Large dead-code block left in production file

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/dashboard/user-xpoverall-chart.tsx:90-158`
- Evidence: Lines 90-158 contain a fully commented-out alternate implementation of `formatDataForDays` (68 lines of dead code). This indicates an incomplete cleanup after refactoring.
- Impact: Code clutter, reduced maintainability, potential confusion for future readers.
- Recommendation: Remove the dead-code block.

### LR-primary-advantage-030-003 — Incorrect file header comment

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/flashcards/deck-view.tsx:1`
- Evidence: Line 1 reads `// components/flashcards/single-deck-view-inline.tsx` but the file is named `deck-view.tsx`. The comment references an old or alternate filename.
- Impact: Misleading metadata for developers reading the file.
- Recommendation: Update the comment to match the actual filename or remove it.

### LR-primary-advantage-030-004 — Un-typed state variable uses `any[]`

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/flashcards/deck-view.tsx:127`
- Evidence: Line 127 declares `const [gameCards, setGameCards] = useState<any[]>([]);`. The `any[]` type erases all type safety on the cards array, bypassing TypeScript validation across all downstream usage.
- Impact: Runtime type errors may go undetected; reduced IDE support for card properties.
- Recommendation: Introduce a `Card` type interface and use `useState<Card[]>([])`.

### LR-primary-advantage-030-005 — Hardcoded strings with inline emoji bypass i18n translation layer

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/flashcards/deck-view.tsx:146, 459`
- Evidence: Lines 146 and 459 use hardcoded English strings with embedded emoji (`"No cards are due for review right now! ⏰"`, `"All Caught Up! 🎉"`) instead of lookup keys from `useTranslations`. The component already has a `t` function available from `useTranslations("SentencesPage.sentencesCard")`.
- Impact: These strings will not be translated when the locale changes, breaking i18n coverage.
- Recommendation: Replace with translation key lookups: `t("noCardsDue")` etc.

### LR-primary-advantage-030-006 — All UI text in empty-deck.tsx is hardcoded in English with no i18n translation keys

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/flashcards/empty-deck.tsx:31-34, 67-69, 102-105, 165-166, 193, 232-235, 287-290`
- Evidence: Every user-visible string in this component (hero title, description, step labels, feature titles, CTA buttons, badge text) is hardcoded in English. The component does not import or use `useTranslations` or any i18n helper. In contrast, the rest of the flashcards module (e.g., `deck-view.tsx`, `flashcard-game.tsx`) uses the `next-intl` `useTranslations` hook. This is a regression from the expected i18n pattern used elsewhere in the app.
- Impact: All text in the empty-state dashboard will remain in English regardless of the user's selected locale, breaking the app's multi-language promise and degrading UX for non-English users.
- Recommendation: Import `useTranslations`, extract all hardcoded strings into translation keys in the relevant message JSON files, and use `t("key")` lookups.

### LR-primary-advantage-030-007 — Hardcoded English fallback string in async server component

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/flashcards/flashcard-dashboard.tsx:31`
- Evidence: Line 31 returns the hardcoded fallback `"Master vocabulary and sentences with personalized flashcard decks"` when `deckType` is neither `VOCABULARY` nor `SENTENCE`. The component already has `t` and `tVocabulary` translation functions from `getTranslations`, so this fallback should use a translation key.
- Impact: The fallback header text is not translated, creating a gap in i18n coverage.
- Recommendation: Add a fallback translation key to the relevant message JSON and use it here.

### LR-primary-advantage-030-008 — Server component passes function prop onClick to Button, violating RSC serialization boundary

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/flashcards/flashcard-dashboard.tsx:82`
- Evidence: `FlashcardDashboard` is an `async` function component (making it a React Server Component). Line 82 passes `onClick={() => window.location.reload()}` as a prop to `<Button>`. The `Button` component (`components/ui/button.tsx`) does not use `"use client"`. In the RSC model, function props cannot cross the server-client boundary and React will throw a serialization error at runtime.
- Impact: The "Try Again" button either silently drops the onClick handler (making it non-functional) or causes a runtime error, depending on the React/Next.js version.
- Recommendation: Move the interactive portion into a client component wrapper, or use `"use client"` on the enclosing component/file that renders `<Button onClick={...}>`. Alternatively, use `form` action or `<Link>` for navigation-level reload.

## No-Finding Notes

- None — all four files have at least one finding.
