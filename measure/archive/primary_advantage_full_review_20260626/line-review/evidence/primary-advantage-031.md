# Line Review Evidence: primary-advantage-031

Reviewer: coder-xiaomi-mimo-v2-5-pro/primary-advantage-031
Files assigned: 9
Lines assigned: 953

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/flashcards/flashcard-game.tsx` | 1-448 | reviewed | 4 |
| `apps/primary-advantage/components/form-error.tsx` | 1-15 | reviewed | 0 |
| `apps/primary-advantage/components/form-success.tsx` | 1-15 | reviewed | 0 |
| `apps/primary-advantage/components/go-to-top.tsx` | 1-26 | reviewed | 0 |
| `apps/primary-advantage/components/header.tsx` | 1-37 | reviewed | 0 |
| `apps/primary-advantage/components/icons.tsx` | 1-157 | reviewed | 1 |
| `apps/primary-advantage/components/index/feature-box.tsx` | 1-22 | reviewed | 0 |
| `apps/primary-advantage/components/index/footer.tsx` | 1-124 | reviewed | 3 |
| `apps/primary-advantage/components/leaderboard.tsx` | 1-109 | reviewed | 1 |

## Findings

### LR-031-001 — Undefined `update`/`session` causes runtime ReferenceError on flashcard completion

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/flashcards/flashcard-game.tsx:106`
- Evidence: Line 60 destructures `const { user } = useSession()`, which returns only `{ user, isAuthenticated, isLoading }` per `packages/auth-client/src/index.ts:16-23`. Lines 106-110 call `update({ user: { ...session?.user } })` where neither `update` nor `session` is in scope. These are leftovers from the prior `next-auth` `useSession()` API which returned `{ data: session, update }`.
- Impact: When a user completes all flashcards in a session, the `handleCardRating` function calls `update(...)` on line 106, which throws `ReferenceError: update is not defined`. The batch review calls on lines 93-100 may still succeed, but the session update silently fails, and the error is caught by the try/catch which shows a "Failed to save ratings" toast even though the ratings were likely saved.
- Recommendation: Remove lines 106-110 (the `update(...)` call) or replace with the correct auth-client API if session refresh is needed after card review.

### LR-031-002 — `any[]` type for flashcard cards prop

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/flashcards/flashcard-game.tsx:36`
- Evidence: The `cards` prop is typed as `any[]`, bypassing TypeScript safety for the component's core data model. Fields like `.word`, `.sentence`, `.definition`, `.translation`, `.audioUrl`, `.startTime`, `.endTime`, `.id` are all accessed without type checking.
- Impact: Runtime errors from typos or schema changes in card data will not be caught at compile time. This pattern likely exists in Reading Advantage as well.
- Recommendation: Define a `Flashcard` interface with the known fields and use it for the `cards` prop type.

### LR-031-003 — Hardcoded 500px flashcard height for primary student devices

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/flashcards/flashcard-game.tsx:251,254`
- Evidence: `min-h-[500px]` on the Card wrapper (line 251) and `h-[500px]` on the clickable flip area (line 254). Primary students commonly use tablets (iPad mini viewport is 768×1024, iPad is 810×1080). Combined with the header, progress bar, controls, and stats, the total vertical space exceeds typical tablet viewports.
- Impact: On smaller tablets, the flashcard area requires scrolling to see the flip button or rating controls, disrupting the interactive card-flip experience for young learners.
- Recommendation: Use responsive heights (e.g., `min-h-[60vh]` or `min-h-[300px] md:min-h-[500px]`) to accommodate tablet form factors.

### LR-031-004 — Unused `Image` import from next/image

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/icons.tsx:2`
- Evidence: `import Image from "next/image"` is declared but never referenced anywhere in the file. The `logo` icon on lines 7-13 uses a plain `<img>` tag instead.
- Impact: Dead import adds to bundle analysis noise and suggests an incomplete migration from `<img>` to `next/image`.
- Recommendation: Remove the unused import, or replace the `<img>` in the `logo` icon with `Image` for automatic optimization.

### LR-031-005 — Typo "Provinding" in footer

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/index/footer.tsx:67`
- Evidence: `Provinding the best English learning experience.` — should be "Providing".
- Impact: Visible typo on the public-facing landing page footer.
- Recommendation: Fix the string to "Providing".

### LR-031-006 — Placeholder phone number in footer

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/index/footer.tsx:40`
- Evidence: `Phone: +1 (123) 456-7890` — this is a clearly fake placeholder number using the 555-xxxx convention variant. The `href` also contains `tel:+11234567890`.
- Impact: Users (parents/teachers) clicking the phone link will attempt to call a non-existent number. This placeholder was likely never replaced before launch.
- Recommendation: Replace with the real contact phone number or remove the phone entry.

### LR-031-007 — Stale copyright year in footer

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/components/index/footer.tsx:92`
- Evidence: `© 2024` is hardcoded. The current date is 2026-06-27.
- Impact: The footer shows an outdated copyright year, which may concern parents or institutional partners reviewing the platform.
- Recommendation: Use `new Date().getFullYear()` dynamically or update to current year.

### LR-031-008 — Empty href on copyright anchor tag

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/index/footer.tsx:93`
- Evidence: `<a href="" className="hover:underline">Primary Advantage™</a>` — empty `href` causes the link to navigate to the current page (reload on click), which is semantically incorrect for a copyright notice.
- Impact: Minor UX issue; clicking the copyright text reloads the page.
- Recommendation: Replace with a `<span>` or remove the anchor wrapper.

### LR-031-009 — Leaderboard uses `<img>` instead of next/image for rank icons

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/leaderboard.tsx:72`
- Evidence: `<img src={/rank-${item.rank}.png} alt={...} className="mx-auto h-6 w-6" />` — uses native `<img>` instead of `next/image` `Image` component for rank badge images. No width/height attributes specified (relies on CSS class).
- Impact: Missing automatic image optimization, lazy loading, and CLS prevention from next/image. Minor performance concern on leaderboard pages.
- Recommendation: Use `Image` from next/image with explicit width/height, or document the intentional choice.

## No-Finding Notes

- `apps/primary-advantage/components/form-error.tsx`: reviewed line-by-line; no findings. Simple presentational component with clean error display.
- `apps/primary-advantage/components/form-success.tsx`: reviewed line-by-line; no findings. Mirrors form-error.tsx structure for success messages.
- `apps/primary-advantage/components/go-to-top.tsx`: reviewed line-by-line; no findings. Simple scroll-to-top button with smooth animation. Minor: uses `Link` from i18n/navigation for `#` href, but functionally correct.
- `apps/primary-advantage/components/header.tsx`: reviewed line-by-line; no findings. Clean heading component with warning variant support.
- `apps/primary-advantage/components/index/feature-box.tsx`: reviewed line-by-line; no findings. Simple card component for landing page feature grid. Uses hardcoded brand colors which is appropriate for the landing page.
