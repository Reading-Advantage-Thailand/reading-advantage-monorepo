# Line Review Evidence: primary-advantage-032

Reviewer: coder-xiaomi-mimo-v2-5/primary-advantage-032
Files assigned: 1
Lines assigned: 1318

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/lesson/games/lesson-sentence-cloze-test.tsx` | 1-1318 | reviewed | 3 |

## Findings

### LR-primary-advantage-032-001 — Undefined `session` variable referenced in `handleNext`

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-cloze-test.tsx:524-528`
- Evidence: Line 130 destructures only `user` from `useSession()`: `const { user } = useSession();`. However, lines 524-528 inside `handleNext` reference both `update` (undefined) and `session` (undefined): `update({ user: { ...session?.user } });`. Neither `update` nor `session` is declared, imported, or destructured anywhere in the component scope. This will throw a `ReferenceError` at runtime whenever a student completes all cloze-test sentences and the game triggers the final activity update.
- Impact: The sentence cloze-test game crashes on the final sentence, preventing the activity log entry and XP award from being recorded. Primary students completing a full cloze-test session receive no progress tracking.
- Recommendation: Destructure `session` and `update` from `useSession()` on line 130 (e.g., `const { user, session, update } = useSession();`) or remove the dead `update(...)` call if session mutation is not needed here.

### LR-primary-advantage-032-002 — `toggleAudioHints()` called as side effect inside `handleNext`

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-cloze-test.tsx:511`
- Evidence: Line 511 calls `toggleAudioHints()` inside `handleNext`, which fires every time the user advances to the next sentence. `toggleAudioHints` (lines 696-702) toggles the `audioHintsEnabled` boolean state. This means navigating forward silently flips the audio-hints toggle on/off each sentence, without user intent. The effect is unpredictable: if audio hints were enabled, they become disabled on the next sentence, and vice versa.
- Impact: Primary students experience inconsistent audio-hint availability between sentences. The toggle state drifts from the user's expectation, making the hint system unreliable for young learners who depend on consistent scaffolding.
- Recommendation: Remove the `toggleAudioHints()` call from `handleNext`. If audio hints should reset per sentence, use a dedicated reset function rather than toggling.

### LR-primary-advantage-032-003 — Unused constant `AVAILABLE_LANGUAGES` and unused import `Languages`

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-cloze-test.tsx:29,74-99`
- Evidence: The `Languages` icon is imported from `lucide-react` on line 29 but never used in any JSX or expression. The `AVAILABLE_LANGUAGES` constant (lines 74-99) defines Thai, Vietnamese, Chinese Simplified, and Chinese Traditional language options but is never referenced anywhere in the component. Both appear to be remnants of a planned multi-language translation feature that was never wired up.
- Impact: Minor dead code. The unused import increases bundle size marginally and the unused constant adds cognitive overhead. No runtime impact.
- Recommendation: Remove the `Languages` import and the `AVAILABLE_LANGUAGES` constant. If multi-language support is planned, implement it in a follow-up track.

## No-Finding Notes

- `apps/primary-advantage/components/lesson/games/lesson-sentence-cloze-test.tsx` lines 1-43: reviewed line-by-line; no findings. Imports are standard React/Next.js/shadcn/ui utilities.
- `apps/primary-advantage/components/lesson/games/lesson-sentence-cloze-test.tsx` lines 44-99: reviewed line-by-line; no findings beyond unused `AVAILABLE_LANGUAGES` (LR-032-003). Interfaces and types are well-defined.
- `apps/primary-advantage/components/lesson/games/lesson-sentence-cloze-test.tsx` lines 100-307: reviewed line-by-line; no findings. Component state hooks are correctly initialized; `generateBlanksForSentence` uses proper `useCallback` with empty deps; blank generation logic is sound for English text.
- `apps/primary-advantage/components/lesson/games/lesson-sentence-cloze-test.tsx` lines 308-473: reviewed line-by-line; no findings beyond LR-032-001. Distractor generation, memoized active sentences, sentence-change reset, and completion-check effects are correctly structured.
- `apps/primary-advantage/components/lesson/games/lesson-sentence-cloze-test.tsx` lines 474-570: reviewed line-by-line; no findings beyond LR-032-001 and LR-032-002. `handleAnswerSelect`, `handleStartGame`, `handleRestart`, `handleCheckAnswer`, and `handleRestartGame` are well-implemented with proper guard clauses.
- `apps/primary-advantage/components/lesson/games/lesson-sentence-cloze-test.tsx` lines 571-783: reviewed line-by-line; no findings. Audio playback, hint toggles, and sentence rendering with inline Select blanks use correct cleanup patterns and accessible markup.
- `apps/primary-advantage/components/lesson/games/lesson-sentence-cloze-test.tsx` lines 784-1067: reviewed line-by-line; no findings. Loading state, game-complete screen, and start screen are well-structured with proper i18n usage and responsive layout.
- `apps/primary-advantage/components/lesson/games/lesson-sentence-cloze-test.tsx` lines 1068-1318: reviewed line-by-line; no findings. Main game view with progress bar, hint controls, sentence display, result card, and action buttons are correctly implemented with accessible patterns.
