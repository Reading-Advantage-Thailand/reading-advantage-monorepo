# Line Review: sa-batch-07

- **Track**: `science_advantage_review_20260626`
- **Batch**: sa-batch-07 (20 files)
- **Review date**: 2026-06-27
- **Reviewer**: automated agent
- **Focus areas**: correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline / golden-path patterns

---

## Files Reviewed

| # | File | Type |
|---|------|------|
| 1 | `apps/science-advantage/components/features/lesson/__tests__/vocabulary-block.test.tsx` | Unit test |
| 2 | `apps/science-advantage/components/features/lesson/__tests__/vocabulary-flashcards.test.tsx` | Unit test |
| 3 | `apps/science-advantage/components/features/lesson/blocks/image-block.tsx` | Component |
| 4 | `apps/science-advantage/components/features/lesson/blocks/index.ts` | Barrel |
| 5 | `apps/science-advantage/components/features/lesson/blocks/materials-block.tsx` | Component |
| 6 | `apps/science-advantage/components/features/lesson/blocks/procedure-block.tsx` | Component |
| 7 | `apps/science-advantage/components/features/lesson/blocks/quiz-block.tsx` | Component |
| 8 | `apps/science-advantage/components/features/lesson/blocks/reading-passage-block.tsx` | Component |
| 9 | `apps/science-advantage/components/features/lesson/blocks/review-block.tsx` | Component |
| 10 | `apps/science-advantage/components/features/lesson/blocks/text-block.tsx` | Component |
| 11 | `apps/science-advantage/components/features/lesson/blocks/vocabulary-block.tsx` | Component |
| 12 | `apps/science-advantage/components/features/lesson/display-preference-selector.tsx` | Component |
| 13 | `apps/science-advantage/components/features/lesson/image-gallery.tsx` | Component |
| 14 | `apps/science-advantage/components/features/lesson/index.ts` | Barrel |
| 15 | `apps/science-advantage/components/features/lesson/lesson-player.tsx` | Component |
| 16 | `apps/science-advantage/components/features/lesson/vocabulary-flashcards.tsx` | Component |
| 17 | `apps/science-advantage/components/features/student/__tests__/ai-recommendation-card.test.tsx` | Unit test |
| 18 | `apps/science-advantage/components/features/student/__tests__/quiz-player.test.tsx` | Unit test |
| 19 | `apps/science-advantage/components/features/student/ai-recommendation-card.tsx` | Component |
| 20 | `apps/science-advantage/components/features/student/continue-learning-card.tsx` | Component |

---

## File-by-File Findings

### File 1: `vocabulary-block.test.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 28–44 | Test fixture `createVocabularyBlock()` provides well-structured test data. Uses `Partial<VocabularyBlockType>` for override flexibility — correct pattern. | OK | — |
| 48–53 | Renders and asserts `vocabulary-flashcards` testid. | OK | — |
| 55–62 | Verifies `data-block-type` and `data-block-id` attributes — good contract test. | OK | — |
| 66–81 | `showThai` prop tests: correct positive and negative assertions. | OK | — |
| 70 | Uses `screen.getAllByText('Photosynthesis').length > 0` — weaker than `toBeInTheDocument()`. While `getAllByText` throws on zero matches, the `.length > 0` wrapping adds a redundant truthiness check that masks the intent. Prefer `expect(screen.getAllByText('Photosynthesis')[0]).toBeInTheDocument()` or separate `getByText` calls for front/back. | Low | F-SA-B07-003 |
| 82–92 | Flip test imports `userEvent` dynamically inside the `it()` block via `await import('@testing-library/user-event')`. This works but is inconsistent with the adjacent test file (`vocabulary-flashcards.test.tsx`) which imports `userEvent` statically at line 2. No practical correctness difference, but unnecessary inconsistency. | Low | F-SA-B07-013 |

**Verdict**: Correct tests with adequate coverage (4 cases). Minor assertion-style inconsistency and import-style inconsistency vs. sibling test file.

---

### File 2: `vocabulary-flashcards.test.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 76–81 | Empty-terms test asserts `getByTestId('empty-terms')` — correct for testing early return branch. | OK | — |
| 83–92 | Carousel mode: asserts one flashcard rendered, correct term appears twice (front and back). | OK | — |
| 94–105 | Grid mode: asserts all 3 cards, each with 2 appearances. Verifies 6 total matches — thorough. | OK | — |
| 107–112 | Progress indicator shows `'1 of 3'`. | OK | — |
| 114–127 | `showThai` toggle with `rerender` — correct pattern for prop-change testing. | OK | — |
| 130–178 | Flip (click, Enter, Space) — comprehensive keyboard coverage. | OK | — |
| 180–198 | Assessment buttons visibility after flip — correct. | OK | — |
| 201–275 | Navigation tests (next/prev, disabled states, arrow keys, dots) — thorough. | OK | — |
| 277–359 | Self-assessment tests (easy/hard, auto-advance in carousel, reviewed count) — thorough. | OK | — |
| 362–419 | Accessibility tests (aria-label, roles, focusable, keyboard) — 7 cases, comprehensive. | OK | — |
| 422–456 | Reduced-motion test overrides `window.matchMedia` with `Object.defineProperty`. The `beforeEach` already sets up a matchMedia mock — this test overwrites it. `vi.clearAllMocks()` in `afterEach` clears the `vi.fn()` but does not undo `Object.defineProperty`. However, `beforeEach` re-defines it before the next test runs, so there is no cross-test leak. | OK | — |
| 459–502 | Grid-specific tests (progress after review, simultaneous flips) — 3 cases. | OK | — |
| 505–558 | Edge cases (no audio, long terms, stopPropagation on assessment click) — 3 cases. | OK | — |
| 73 | `expect(screen.getAllByText('Photosynthesis')).toHaveLength(2)` — Correct for carousel with single term, but fragile if rendering logic changes (e.g., adding hint text containing the term in a different location). More robust to check front/back independently. | Low | — |

**Verdict**: Excellent test suite — 24+ test cases covering rendering, navigation, self-assessment, accessibility, reduced motion, grid/carousel modes, edge cases. The best-tested component in this batch.

---

### File 3: `image-block.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `'use client'` — correct for interactive client component. | OK | — |
| 7–11 | Props interface: `block: ImageBlockType`, `showThai?`, `className?` — consistent avec les other blocks. | OK | — |
| 13–17 | JSDoc: includes PLACEHOLDER note for lightbox (#148). Follows AGENTS.md documentation standard. | OK | — |
| 19 | `showThai` caption logic: bilingual fallback — correct. | OK | — |
| 23 | `aspectRatio ?? 16 / 9` — good default to prevent CLS. | OK | — |
| 35–41 | Next.js `<Image>` with `fill`, `sizes`, `object-contain` — correct for responsive images. | OK | — |
| 43–51 | Caption + attribution rendering — clean. Uses semantic `<figure>` / `<figcaption>`. | OK | — |
| 36 | `block.src` is passed directly to Next.js Image. The schema enforces `z.string().min(1)` but no URL validation beyond that. Next.js Image's built-in loader provides some protection against malicious URLs, and the src originates from lesson content (not user input), so risk is low. | OK | — |

**Verdict**: Clean, correct component. No security or architectural issues.

---

### File 4: `blocks/index.ts`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1–12 | Barrel export: re-exports all 8 block types alphabetically. Clean. | OK | — |
| 12 | Exports `QuizBlock` — correctly included. | OK | — |

**Verdict**: No issues.

---

### File 5: `materials-block.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `'use client'` — correct. | OK | — |
| 12–16 | JSDoc present — follows AGENTS.md standards. | OK | — |
| 25 | `"Materials Needed"` hardcoded heading — no i18n/l10n. Minor UX gap if the app eventually supports full Thai localization for all UI text (currently only content blocks are bilingual). Not a correctness issue. | Low | — |
| 29 | `key={\`${material.item}-${index}\`}` — uses `item` + `index` as key. The `item` is part of the key to add uniqueness, but `index` makes it an anti-pattern if items could be reordered. Since materials lists are static lesson content, this is acceptable but not ideal. | Low | F-SA-B07-008 |
| 30 | `material.itemThai` — optional field; fine. | OK | — |
| 38 | `aria-hidden="true"` on bullet indicator — correct for decorative content. | OK | — |

**Verdict**: Correct component. Minor key stability concern.

---

### File 6: `procedure-block.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 14–19 | `StepItemProps` interface with explicit props — clean. | OK | — |
| 21–85 | `StepItem` subcomponent: handles step number, checkbox, instruction, Thai, sub-steps. Well structured. | OK | — |
| 40–44 | Uses shadcn `Checkbox` component — consistent with UI library pattern. | OK | — |
| 92 | `useState<Set<number>>` — interesting choice. Creates new Set on each state update via spread. Works correctly. | OK | — |
| 94–104 | `toggleStep` uses functional state update with Set mutation via spread. Correct pattern. | OK | — |
| 129 | `{checkedSteps.size} of {block.steps.length} steps completed` — live progress counter, good UX. | OK | — |
| 120 | `key={step.stepNumber}` — stable key, good. | OK | — |
| 67 | `key={index}` for sub-steps — acceptable for static nested arrays. | OK | — |

**Verdict**: Well-structured, correct. No issues.

---

### File 7: `quiz-block.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 23–62 | `QuestionNavigation` subcomponent — Previous/Next buttons with disabled states and "Answered" badge. | OK | — |
| 64–158 | `QuestionDisplay` subcomponent: handles `multiple_choice` and `true_false` types. Thai text fallback. | OK | — |
| 107–111 | Uses native `<input type="radio">` for multiple choice instead of shadcn `RadioGroup` component. This is inconsistent with the procedure-block which uses shadcn `Checkbox`. Native inputs work correctly but bypass the shadcn design system's styling and accessibility affordances. | Low | F-SA-B07-009 |
| 121–148 | Same native-radio pattern for true/false questions. | Low | F-SA-B07-009 |
| 151 | Fallback for unsupported question types: `!['multiple_choice', 'true_false'].includes(question.type)` — The schema defines 5 types: `multiple_choice`, `multiple_select`, `true_false`, `fill_in_blank`, `vocabulary_match`. Only 2 are handled here. The fallback text "not yet supported" is accurate and honest. | Info | — |
| 164–231 | Main component: state management with `useState<Map<number, string>>` — correct. | OK | — |
| 168–174 | `handleSelectAnswer` — uses functional state update with Map. Correct. | OK | — |
| 184 | `passingScore` badge display — good UX for students. | OK | — |
| 199 | `answers.size / block.questions.length answered` badge — useful progress indicator. | OK | — |

**Verdict**: Functional quiz block. Native radio inputs are a minor design-system inconsistency. Partial question-type support is honest (explicit fallback message).

---

### File 8: `reading-passage-block.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 7–12 | Props accept `displayPreference` for bilingual mode — consistent with `text-block.tsx`. | OK | — |
| 18 | Derives `isThaiPrimary` from `displayPreference` — correct. | OK | — |
| 35–58 | Dual title rendering logic (Thai primary vs English primary) — comprehensive. | OK | — |
| 60–65 | Word count badge with `showThai`? No — word count is locale-independent. Correct. | OK | — |
| 68 | Uses `prose prose-sm` for rich typography — consistent with text-block. | OK | — |
| 68 | `whitespace-pre-wrap` on content — preserves line breaks from the content source. Good. | OK | — |
| 64 | `block.wordCount` — displayed verbatim. For very large numbers (>999), no comma formatting. But word counts in lesson content are typically small. | Info | — |

**Verdict**: Clean component. No issues.

---

### File 9: `review-block.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 18–96 | Well-structured: reveal/hide toggle with count. | OK | — |
| 52 | `key={question.questionId \|\| index}` — good fallback for missing questionId. | OK | — |
| 69–71 | `{isRevealed && (<p className="...">Click to hide answer</p>)}` — The "reveal" action only shows/hides the "Click to hide answer" prompt text. **No actual answer content is displayed.** The `ReviewQuestionItemSchema` only includes `questionId`, `text`, and `textThai` — there is no `answer` field in the schema. This means the review block reveals nothing substantive; it just toggles the text of the button area. If the intent is a reflective review (student ponders the question), this is intentional. If answer content is supposed to appear, this is a schema+component gap. | Info | F-SA-B07-007 |
| 74–84 | Button label toggles between "Reveal" and "Hide" with proper aria-label updates. | OK | — |

**Verdict**: Component works as designed. The absence of answer content in the review schema is a product-design decision outside this review's scope.

---

### File 10: `text-block.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `'use client'` — correct. | OK | — |
| 3–4 | Uses `react-markdown` with `remark-gfm` — correct for rendering rich markdown. | OK | — |
| 15–19 | JSDoc: describes the side-by-side Thai display behavior. | OK | — |
| 20–99 | Three rendering modes: English-only (L26–39), Thai-primary (L42–72), side-by-side (L75–99). Comprehensive logic. | OK | — |
| 53 | `block.content !== block.contentThai` — string comparison to check if English and Thai content differ before duplicating. This is a runtime string comparison of potentially long markdown content. If the two contents differ only in whitespace or trailing newlines, they would be incorrectly shown separately. Adding a `sameAsEnglish?: boolean` or `identicalToEnglish?: boolean` field to the schema would be more robust. | Low | F-SA-B07-016 |
| 26 | `!showThai \|\| !hasThai` — correctly falls back to English-only when Thai display is off or no Thai content exists. | OK | — |
| 42 | Thai-primary mode: shows Thai with English as muted fallback — correct. | OK | — |

**Verdict**: Well-structured text block with three rendering modes. Minor concern about the string-equality guard.

---

### File 11: `vocabulary-block.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 7–14 | Props include `mode` (carousel/grid) and `onTermReviewed` — delegation to `VocabularyFlashcards`. | OK | — |
| 26–49 | Thin wrapper — good separation of concerns. | OK | — |
| 36 | `className={cn('', className)}` — empty string first argument is harmless but unnecessary. | Info | — |
| 40–46 | Passes all relevant props to `VocabularyFlashcards`. | OK | — |

**Verdict**: Clean wrapper. No issues.

---

### File 12: `display-preference-selector.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `'use client'` — correct. | OK | — |
| 10–14 | `PREFERENCE_OPTIONS` constant with full/short labels for responsive display — good. | OK | — |
| 24 | Uses `useDisplayPreference()` context — clean. | OK | — |
| 29 | `role="radiogroup"` with `aria-label` — accessible. | OK | — |
| 33 | `role="radio"` with `aria-checked` on each button — correct ARIA pattern. | OK | — |
| 35 | `onClick` callback calls `setDisplayPreference` — no keyboard handler needed because `<button>` elements are natively keyboard accessible. | OK | — |
| 45–46 | Responsive label toggle (`hidden sm:inline` / `sm:hidden`) — good UX. | OK | — |

**Verdict**: Correct, accessible component. No issues.

---

### File 13: `image-gallery.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `'use client'` — correct. | OK | — |
| 15 | `import * as clientLogger` — consistent with lesson-player.tsx. | OK | — |
| 28–43 | `usePrefersReducedMotion` — custom hook for motion preference detection. **Duplicated** from `vocabulary-flashcards.tsx` lines 38–61. The implementation is identical. This code should be extracted to a shared hook in `@/hooks/` or similar. | Low | F-SA-B07-005 |
| 45–66 | `useTouchNavigation` — custom hook for swipe detection. Clean. | OK | — |
| 83–227 | `Lightbox` subcomponent: focus trapping (L115–131), keyboard navigation (Escape, Arrow keys), body scroll lock (L144–151). | OK | — |
| 101–141 | Focus management: traps focus within the lightbox. The focus-trap implementation selects `'button, [href], [tabindex]:not([tabindex="-1"])'` — this is a reasonable selector for a simple dialog but may miss non-button interactive elements. | Low | — |
| 144, 149 | Direct `document.body.style.overflow = 'hidden'` / restore mutation. This works but is fragile — if the component unmounts before the cleanup runs, `overflow` remains hidden. A portal-based approach or a CSS class toggle on `<body>` would be more robust. | Low | F-SA-B07-006 |
| 171 | Uses Unicode `✕` character for close button — no aria-label text fallback for screen readers (though `aria-label="Close"` is present on the button at L166). Acceptable. | OK | — |
| 229–486 | Main `ImageGallery` component: circular navigation, image preloading, error/load tracking, grid/carousel/single layouts. Comprehensive. | OK | — |
| 263–273 | Image preloading via `new window.Image()` — good for perceived performance. | OK | — |
| 283 | `clientLogger.warn` on image load failure — good for observability. | OK | — |
| 301–308 | Caption/attribution rendering. | OK | — |
| 476–484 | Lightbox rendering conditionally when `lightboxOpen`. | OK | — |

**Verdict**: Feature-rich image gallery with good UX touches (preloading, error handling, touch navigation, lightbox with focus trap). Two minor concerns: hook duplication and body-scroll mutation pattern.

---

### File 14: `lesson/index.ts`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1–18 | Barrel export: exports `LessonPlayer`, `BlockErrorBoundary`, all 6 block types (excluding `ReviewBlock` and `QuizBlock`), `ImageGallery` and its types. | OK | — |
| 5 | Exports `LessonPlayerProps` as type — correct. | OK | — |
| 9–16 | Re-exports only 6 of 8 blocks: `TextBlock`, `VocabularyBlock`, `ImageBlock`, `ReadingPassageBlock`, `ProcedureBlock`, `MaterialsBlock`. **`ReviewBlock` and `QuizBlock` are not re-exported** even though they exist in `blocks/index.ts` (File 4). If consumers need these blocks externally, they must import directly from `./blocks`. Likely intentional (quiz/review are more integrated components), but worth noting for API surface completeness. | Info | — |

**Verdict**: Clean barrel. Minor API-surface gap for `ReviewBlock` / `QuizBlock`.

---

### File 15: `lesson-player.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `'use client'` — correct. | OK | — |
| 25–78 | `BlockErrorBoundary` (React class component): catches rendering errors per block. Uses `clientLogger.error` in `componentDidCatch` — good for observability. | OK | — |
| 40–78 | Standard error-boundary pattern: `getDerivedStateFromError` + `componentDidCatch` + fallback UI. | OK | — |
| 64–71 | Default fallback: red alert box with block index — appropriate. | OK | — |
| 88–133 | `useBlockVisibility` hook with `IntersectionObserver + prefers-reduced-motion` — different thresholds (0.25 default, 0.1 for reduced motion). The threshold adjustment for reduced motion is an interesting accessibility consideration: users who prefer reduced motion get the visibility callback at 10% instead of 25%. | OK | — |
| 110–117 | IntersectionObserver callback fires `onBlockView` only once per block. Uses `hasBeenViewed` ref. Correct. | OK | — |
| 139–192 | `BlockRenderer`: clean switch on `block.type`. All 8 types handled. | OK | — |
| 168–183 | Unknown block type: logs warning via `clientLogger.warn` and renders "not yet supported" message. Good defensive pattern. | OK | — |
| 234–287 | `LessonPlayer`: public interface with JSDoc, example usage, feature list — follows AGENTS.md documentation standards. | OK | — |
| 242–245 | `effectiveShowThai` derived from `displayPreference` — correct precedence logic. | OK | — |
| 247 | Null/empty content check with fallback empty-state UI. | OK | — |
| 272–283 | Each block wrapped in `<BlockErrorBoundary>` — isolates failures per block. | OK | — |
| 273 | `key={block.id \|\| \`block-${index}\`}` — stable key with fallback. | OK | — |
| 289–290 | Also exports `BlockErrorBoundary` for testing — good. | OK | — |

**Verdict**: Well-architected player with error isolation, visibility tracking, and defensive fallbacks. Best-in-batch component architecture.

---

### File 16: `vocabulary-flashcards.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 38–61 | `usePrefersReducedMotion` — duplicated hook (see F-SA-B07-005). | Low | F-SA-B07-005 |
| 49–57 | Feature detection for Safari < 14 (`addEventListener` vs `addListener`). Defensive. | OK | — |
| 67–231 | `Flashcard` subcomponent: 3D flip with CSS `perspective` / `rotateY`, bilingual display, self-assessment buttons, keyboard handling. Comprehensive. | OK | — |
| 80 | `event.key === ' '` for Space key — with `event.preventDefault()`. Correct to prevent page scroll. | OK | — |
| 120–123 | `role="button"`, `tabIndex={0}`, `aria-label` with context (term, flip state), `aria-pressed`. Good accessibility. | OK | — |
| 127, 173 | `aria-hidden` on front/back based on flip state — correct. | OK | — |
| 204 | `onClick={(e) => e.stopPropagation()}` — prevents assessment button click from toggling card flip. This is intentional but `stopPropagation` is a broad hammer that also prevents the event from bubbling to any parent listeners. For this specific case (buttons inside a clickable card), it's an accepted trade-off. | Info | — |
| 294–543 | Main component: carousel and grid modes, progress, navigation, keyboard event handler. | OK | — |
| 306 | `termsLength = terms?.length ?? 0` — null-safe destructuring. | OK | — |
| 323–344 | `handleAssess` with auto-advance in carousel mode — careful state management (unflip then advance). | OK | — |
| 372–388 | Keyboard navigation via `window.addEventListener('keydown', ...)` — handles ArrowLeft/ArrowRight. **Scoped event listeners** on the container ref would be preferable to avoid conflicts with other keyboard handlers on the page. For example, if a text input is focused within or near this component, arrow keys would still be captured. The cleanup effect is correct. | Low | F-SA-B07-004 |
| 399–401 | Early return for empty terms — placed **after** all hooks. Correct React pattern. | OK | — |
| 469 | Green dot for reviewed terms — good visual feedback. | OK | — |
| 526 | `key={\`${term.term}-${index}\`}` — acceptable since terms are unique within a lesson's vocabulary block. | OK | — |

**Verdict**: Rich, interactive component with thorough accessibility. The keyboard event listener at window level is the main concern.

---

### File 17: `ai-recommendation-card.test.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 11–34 | Mocks: `@/lib/analytics` (track), `next/link`, `sonner` (toast.warning). Clean. | OK | — |
| 37–49 | `baseResponse` fixture — representative shape covering success, fallback flag, recommendation data. | OK | — |
| 56–69 | Loading skeleton test: uses unresolved promise `new Promise(() => {})` — correct for testing persistent loading state. Calls `unmount()` to prevent test leaks. | OK | — |
| 71–89 | Success state: verifies card renders, badge text, fetcher call with `AbortSignal`. | OK | — |
| 91–109 | Fallback badge test: verifies `"Curriculum rules"` text when `fallbackUsed: true`. | OK | — |
| 111–126 | Error state test: overrides `pollOptions` with `{ maxDurationMs: 0 }` to trigger immediate error. Clever. | OK | — |
| 128–147 | "fires CTA tracking when primary action is clicked" — **Clicks the "start lesson" button but only verifies visibility after click. The test does NOT assert that `track()` was called.** The `track` mock from `@/lib/analytics` is available via `vi.mock()` but never inspected. The test name implies a behavior (tracking) that is not verified. | Medium | F-SA-B07-002 |

**Verdict**: Good coverage (5 cases). One medium finding — test claims to verify tracking but doesn't assert on the analytics mock.

---

### File 18: `quiz-player.test.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 7–24 | Mocks: `useRouter`, `isAiRecommendationEnabled` (returns false), child components (`AiRecommendationCard`, `ContinueLearningCard`). Clean. | OK | — |
| 28–97 | `mockQuizData` and `mockResult` — realistic fixtures with 3 question types (multiple_choice, true_false, fill_in_blank). | OK | — |
| 144–149 | Loading state test: checks `"Loading quiz..."` synchronously before fetch resolves. Correct. | OK | — |
| 152–166 | 401 error test: verifies `"Please sign in to take this quiz"`. | OK | — |
| 168–184 | 403 error test: verifies enrollment error message. | OK | — |
| 186–200 | 404 error test: verifies `"Lesson not found"`. | OK | — |
| 202–216 | "Back to curriculum" button appears on error. | OK | — |
| 219–280 | Quiz display tests: question text, counter, points, options, button states — thorough. | OK | — |
| 282–337 | Navigation tests: next, previous, submit-on-last, diabled-previous. | OK | — |
| 339–374 | Answer selection: radio selection, answer preservation across navigation. | OK | — |
| 376–497 | Quiz submission: disabled submit, confirmation dialog, POST verification, callback invocation. **Lines 454–496 verify the exact POST body including `attemptId`, `responses` array, `questionId`, and `studentAnswer`** — a thorough contract test. | OK | — |
| 480–496 | POST body verification: iterates `mock.calls` to find the POST request, parses body JSON, checks structure. Good depth. | OK | — |
| 499–577 | Results screen: score percentage (66.7%), points breakdown, attempt number, correct/incorrect badges, correct answer display, score badge, continue learning card, retake button — 9 cases. Comprehensive. | OK | — |
| 579–620 | Submission error (409 duplicate) — thorough. | OK | — |
| 536 | `expect(screen.getByText('2 out of 3 points'))` — matches `mockResult.score` (2) and `mockResult.maxScore` (3). Correct. | OK | — |
| 529 | `expect(screen.getByText('66.7%'))` — `mockResult.percentage` is `(2/3) * 100 = 66.666...67` which formats as `66.7%`. Matches. | OK | — |
| 562–565 | Continue learning card shown when `isAiRecommendationEnabled` returns false (the mock default). There is **no corresponding test for when AI recommendation IS enabled** — the `AiRecommendationCard` render path is never exercised in these tests. The mocked `AiRecommendationCard` is a static `<div>`, so even in that scenario the behavior would be trivial to verify. | Low | F-SA-B07-012 |

**Verdict**: Excellent test suite — 30+ test cases across loading, error states, quiz display, navigation, answer selection, submission, results, and error handling. The POST body verification (lines 454–496) is a standout. Only gap: no test for the AI recommendation enabled path.

---

### File 19: `ai-recommendation-card.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `"use client"` — correct (uses double quotes vs. single quotes in most other files — minor styling inconsistency). | Low | — |
| 15–22 | Imports translation JSON files (`ai-recommendation.en.json`, `ai-recommendation.th.json`) — correct i18n pattern. | OK | — |
| 25–38 | `RecommendationApiResponse` type — well-structured, nullable `recommendation`, includes `fallbackUsed` and `traceId`. | OK | — |
| 51–55 | `DEFAULT_POLL_OPTIONS`: 10s timeout, 5s retry, 30s max duration. Reasonable defaults. | OK | — |
| 88 | `fetcher = defaultRecommendationFetcher` — default parameter provides testability (inject mock fetcher). | OK | — |
| 95 | Locale detection via `document.documentElement.lang` — correct. | OK | — |
| 114–123 | Locale detection effect — runs once. | OK | — |
| 125–160 | Student ID hashing with SHA-256 via `crypto.subtle.digest` — privacy-preserving. Falls back to raw value if `crypto.subtle` unavailable.  This client-side hashing prevents the server from correlating multiple recommendations to the same student via the analytics hash. However, it also means the server cannot detect repeated views or deduplicate per-student. Acceptable as a privacy measure. | Info | — |
| 162–282 | Polling logic with abort controller, request timeouts, retry, max duration — well-structured async loop. | OK | — |
| 188–191 | `setTimeout` + `controller.abort()` for request timeout — correct. | OK | — |
| 204–206 | Non-success response throws `'REQUEST_FAILED'` — caught in `.catch()`. | OK | — |
| 246–252 | Toast notification on abort-timeout — good UX for slow recommendations. | OK | — |
| 254–263 | Retry logic: if elapsed < maxDurationMs, schedule retry. | OK | — |
| 272–281 | Cleanup: clears timeouts, aborts in-flight request. Correct. | OK | — |
| 284–309 | Impression tracking effect — fires `track()` once per state change, with `impressionTracked` / `fallbackTracked` ref guards. | OK | — |
| 290–298 | Tracks `ai_recommendation_view` with `studentIdHash` — the hash is computed from studentId, which aligns with the privacy goal. | OK | — |
| 333–405 | Card render: structured with header (sparkles icon, badge), reasoning (expandable), focus standards, and CTA buttons. | OK | — |
| 370 | `state.data.reasoning.length > 220` — arbitrary threshold for "show more" button. Hardcoded. Should be a constant. | Low | — |
| 394–401 | CTA buttons with `asChild` pattern — correct shadcn usage. | OK | — |
| 470–489 | `defaultRecommendationFetcher`: POSTs to `/api/ai/recommendations` with `attemptId` in JSON body. Uses `cache: 'no-store'` — appropriate for polling. | OK | — |
| 474 | The API endpoint receives only `attemptId` — no `classId`, `studentId`, or `lessonSlug` in the request body. The server must independently authorize the user via session and verify that the attempt belongs to the authenticated user. This is correct (authorization is server-side), but the thin request payload means there's no additional server-side validation context beyond the attempt ID itself. | Info | — |

**Verdict**: Well-engineered component with comprehensive polling logic, analytics tracking, localization, and privacy-preserving student ID hashing. The SHA-256 hashing is worth noting as an architectural decision. No correctness or security issues found.

---

### File 20: `continue-learning-card.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `"use client"` — correct. | OK | — |
| 9–12 | Props: `classId`, `lessonSlug` — minimal, correct. | OK | — |
| 14–41 | Presentational component: card with heading, description, two action buttons (View Class, Replay Lesson). | OK | — |
| 19 | Title `"Continue Learning"` — English-only, no i18n. Acceptable for MVP. | OK | — |
| 24 | `Compass` icon with `aria-hidden` — correct. | OK | — |
| 31–36 | Links scoped to `classId` and `lessonSlug` — correct path construction. | OK | — |

**Verdict**: Simple, correct presentational component. No issues.

---

## Summary of Findings

### Medium

| ID | File | Description |
|----|------|-------------|
| F-SA-B07-002 | `ai-recommendation-card.test.tsx` (L128–147) | Test "fires CTA tracking when primary action is clicked" does not assert against the `track` analytics mock. Only checks visibility after click, not that the tracking function was called. Test name implies behavior not verified. |

### Low

| ID | File | Description |
|----|------|-------------|
| F-SA-B07-003 | `vocabulary-block.test.tsx` (L70) | Uses `screen.getAllByText().length > 0` instead of `toBeInTheDocument()` — weaker assertion pattern that wraps a getter that already throws on zero results. |
| F-SA-B07-004 | `vocabulary-flashcards.tsx` (L386) | Keyboard navigation uses `window.addEventListener('keydown', ...)` for arrow keys. Scoped event handling on the container element would avoid interfering with other interactive elements on the page. |
| F-SA-B07-005 | `image-gallery.tsx` (L28–43) + `vocabulary-flashcards.tsx` (L38–61) | `usePrefersReducedMotion` hook is duplicated identically across two components. Should be extracted to a shared hook in `@/hooks/`. |
| F-SA-B07-006 | `image-gallery.tsx` (L144–151) | Direct `document.body.style.overflow` mutation for lightbox scroll locking. Fragile if component unmounts before cleanup. A CSS class toggle or portal-based approach would be more robust. |
| F-SA-B07-007 | `review-block.tsx` (L68–72) | "Reveal answer" toggle only shows "Click to hide answer" text — no actual answer content is rendered. The schema `ReviewQuestionItemSchema` has no `answer` field. If answers are intended to be shown, this is a schema+component gap. |
| F-SA-B07-008 | `materials-block.tsx` (L29) | Uses `index` as part of React key (`key={`${material.item}-${index}`}`). Stable for static content but technically an anti-pattern if items could be reordered. |
| F-SA-B07-009 | `quiz-block.tsx` (L107, L137) | Uses native `<input type="radio">` instead of shadcn `RadioGroup` component, creating a UI-library inconsistency with the rest of the app (e.g., procedure-block uses shadcn `Checkbox`). |
| F-SA-B07-012 | `quiz-player.test.tsx` (L562–565) | Tests only the AI-recommendation-disabled path. No test coverage for the `isAiRecommendationEnabled()` returning `true` path. |
| F-SA-B07-013 | `vocabulary-block.test.tsx` (L83) | Uses dynamic `await import('@testing-library/user-event')` inside `it()` block, inconsistent with `vocabulary-flashcards.test.tsx` which imports statically at module scope. |
| F-SA-B07-016 | `text-block.tsx` (L53) | Uses `block.content !== block.contentThai` string comparison to decide whether to show both languages. Fragile if content differs in whitespace/formatting. A schema-level flag would be more robust. |

### Info (non-blocking observations)

| ID | File | Description |
|----|------|-------------|
| — | `lesson/index.ts` (L9–16) | Barrel does not re-export `ReviewBlock` or `QuizBlock` even though they exist in `blocks/index.ts`. Probably intentional, but an API-surface gap for external consumers. |
| — | `quiz-block.tsx` (L151) | Only 2 of 5 question types supported (`multiple_choice`, `true_false`); 3 types (`multiple_select`, `fill_in_blank`, `vocabulary_match`) return "not yet supported" fallback. Explicit message is honest. |
| — | `ai-recommendation-card.tsx` (L125–160) | Student ID is SHA-256-hashed client-side for analytics privacy. This prevents server-side deduplication of student analytics. Architectural trade-off. |
| — | `ai-recommendation-card.tsx` (L370) | `reasoning.length > 220` hardcoded as the "show more" threshold. Should be a named constant. |

---

## Strengths Observed

1. **Consistent component props pattern**: All 8 block components follow the same interface signature — `block: BlockType`, `showThai?`, `className?` — creating a uniform API surface for `lesson-player.tsx` to consume.

2. **Error isolation**: `lesson-player.tsx` wraps each block in a `BlockErrorBoundary`, preventing a single block failure from crashing the entire lesson. This is a golden-path pattern for composable content renderers.

3. **Null/empty state handling**: Every component that renders a list or array handles the empty case (`VocabularyFlashcards` → `EmptyState`, `LessonPlayer` → fallback UI, `ImageGallery` → `return null`).

4. **Accessibility**: The flashcards component has comprehensive a11y: `aria-label` with dynamic context, `aria-pressed`, `role="button"`, `tabIndex`, `aria-hidden` for card faces, keyboard handling (Enter, Space, Arrow keys), and reduced-motion support.

5. **Test quality**: Two test files (`vocabulary-flashcards.test.tsx` with 24+ cases and `quiz-player.test.tsx` with 30+ cases) are thorough and well-structured. The quiz-player POST body verification (lines 454–496) is a standout contract test.

6. **Bilingual display architecture**: The `displayPreference` → `showThai` derivation in `lesson-player.tsx` (line 242–245) and the per-block bilingual rendering logic are consistently applied across all content blocks. The `DisplayPreferenceProvider` + `useDisplayPreference` hook provides a clean state management pattern.

7. **Defensive programming**: `lesson-player.tsx` handles unknown block types gracefully with a warning log and fallback message. `ImageGallery` handles image load failures with graceful placeholder fallback and client logging.

---

## Limitations

- **No backend module separation**: The polling logic in `ai-recommendation-card.tsx` (30+ lines), the SHA-256 hashing (30+ lines), and the quiz submission logic in `quiz-player.tsx` (90+ lines) contain significant business logic embedded in React components. The AGENTS.md states "Business logic belongs in `/packages/backend`" and "Keep business logic out of React components." These components mix presentation with orchestration — extracting the polling and hashing logic into `packages/backend` helpers would better align with the golden path.

- **No integration tests in batch**: Unlike previous batches (sa-batch-05, sa-batch-06), this batch contains only unit tests. There are no integration tests verifying API routes, database interactions, or component + API end-to-end flows.

- **No visual regression tests**: The flashcards UI with 3D transforms, the lightbox with focus trapping, and the bilingual side-by-side rendering are all visual/interactive features that would benefit from Playwright-based visual regression testing, which is outside the scope of this batch.

- **No performance metrics**: Components like `image-gallery.tsx` (image preloading), `vocabulary-flashcards.tsx` (3D CSS transforms), and `quiz-player.tsx` (gamification animations) would benefit from performance profiling. No Lighthouse or profiling data was reviewed.

- **`"use client"` directive proliferation**: All 15 component files use `'use client'`. This is correct for interactive components but means none can benefit from React Server Component streaming benefits. This is expected for the component layer but should be documented as a trade-off.

---

## Batch-Level Metrics

| Metric | Value |
|--------|-------|
| Files reviewed | 20/20 |
| Component files | 13 (files 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 19, 20) |
| Barrel/type files | 2 (files 4, 14) |
| Unit test files | 3 (files 1, 2, 17, 18) |
| Medium findings | 1 (F-SA-B07-002) |
| Low findings | 11 (F-SA-B07-003 through F-SA-B07-016) |
| Info observations | 4 |
| Total findings | 16 |

---

*End of batch report. No acceptance or closeout claims are made in this document.*
