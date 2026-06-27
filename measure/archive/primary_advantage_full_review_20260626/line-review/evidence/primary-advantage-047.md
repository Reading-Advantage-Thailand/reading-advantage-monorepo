# Line Review Evidence: primary-advantage-047

Reviewer: coder-xiaomi-mimo-v2-5/primary-advantage-047
Files assigned: 1
Lines assigned: 1342

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/pratice/cloze-test-game.tsx` | 1-1342 | reviewed | 8 |

## Findings

### LR-047-001 — Undefined `session` variable causes runtime crash

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/cloze-test-game.tsx:524`
- Evidence: `handleNext` callback references `session?.user` (line 524: `...session?.user`), but the component destructures `{ user }` from `useSession()` at line 124 — `session` is never defined in scope. This will throw a `ReferenceError` when the game completes and `handleNext` fires on the last sentence.
- Impact: Cloze test game completion flow crashes at runtime, preventing score submission and navigation.
- Recommendation: Replace `session?.user` with `user` on line 524, or destructure `session` from `useSession()` instead of `user`.

### LR-047-002 — Undefined `update` function causes runtime crash

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/cloze-test-game.tsx:522`
- Evidence: `handleNext` calls `update({ user: { ...session?.user } })` at line 522, but `update` is never imported, destructured, or defined anywhere in this component. This will throw a `ReferenceError` when the game completes.
- Impact: Same crash path as LR-047-001 — game completion is broken.
- Recommendation: Remove the `update()` call if it is dead code from a previous refactor, or import/define the intended update function.

### LR-047-003 — English-only common words filter breaks multilingual cloze generation

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/pratice/cloze-test-game.tsx:142-231`
- Evidence: The `commonWords` array (lines 142-231) contains only English stop words ("the", "and", "for", "are", etc.). The `candidateWords` filter (lines 234-241) also requires `/^[a-zA-Z]+$/.test(word)`, which excludes all Thai, Vietnamese, and Chinese characters. When sentences contain non-English text, all words are filtered out as non-candidates, resulting in zero blanks being generated.
- Impact: Cloze test game produces no blanks for Thai/Vietnamese/Chinese sentences, making the feature non-functional for primary students using those languages.
- Recommendation: Make the word filter language-aware, or bypass the English-only filter when the sentence language is not English. At minimum, remove the `/^[a-zA-Z]+$/` regex restriction for non-English content.

### LR-047-004 — Regex blank replacement fragile for adjacent/overlapping blanks

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/cloze-test-game.tsx:719-722`
- Evidence: `renderSentenceWithBlanks` sorts blanks by position descending (line 709) then uses `sentence.slice()` with character offsets to insert `<BLANK_>` placeholders (lines 719-722). When two blanks are adjacent or overlapping (e.g., positions 5 and 10 in a 15-char sentence where one blank replaces a 5-char word), earlier insertions shift character offsets for subsequent blanks, potentially replacing incorrect text.
- Impact: Incorrect blank rendering for sentences with closely-spaced blanks, producing garbled display text.
- Recommendation: Process blanks in reverse position order (already done) but verify offset math with a unit test, or switch to a token-based approach that doesn't rely on character position arithmetic.

### LR-047-005 — Distractor generation is English-only

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/pratice/cloze-test-game.tsx:305-359`
- Evidence: `generateDistractors` (lines 305-359) creates distractors using English morphological rules: common English endings ("ing", "ed", "er", "ly", "tion", "ness", "ment" at line 310), common English prefixes ("un", "re", "pre", "dis", "over", "under" at line 311), and English alphabet characters (line 328). Fallback words (lines 340-349) are all English. For Thai/Vietnamese/Chinese target words, the generated distractors are meaningless Latin-character strings.
- Impact: Multiple-choice distractors are nonsensical for non-English cloze tests, reducing pedagogical value.
- Recommendation: Disable client-side distractor generation for non-English sentences and rely on server-provided options, or implement language-specific distractor logic.

### LR-047-006 — Unused `AVAILABLE_LANGUAGES` constant (dead code)

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/cloze-test-game.tsx:71-96`
- Evidence: `AVAILABLE_LANGUAGES` is defined as a `const` object (lines 71-96) with th, vi, cn, tw entries, but is never referenced anywhere in the component. The component uses `next-intl`'s `useTranslations` for language handling instead.
- Impact: Dead code increases bundle size marginally and creates confusion about the intended language handling approach.
- Recommendation: Remove the unused constant.

### LR-047-007 — `loadSentencesFromDeck` stale closure in useEffect

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/cloze-test-game.tsx:384-388`
- Evidence: The `useEffect` at line 384 calls `loadSentencesFromDeck()` on `deckId` change. While `deckId` is correctly in the dependency array, `loadSentencesFromDeck` (lines 390-409) is a plain async function defined in component scope — not wrapped in `useCallback` or stored in a ref. If `loadSentencesFromDeck` were to capture additional changing state in the future, the effect would hold a stale closure.
- Impact: Minimal in practice since the function currently only reads `deckId` (prop) and `rawSentenceData` (state, checked inside). Low risk but a maintenance trap.
- Recommendation: Wrap `loadSentencesFromDeck` in `useCallback` or move to a ref to prevent future stale closure issues.

### LR-047-008 — Hardcoded 10-second audio timeout

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/cloze-test-game.tsx:664-667`
- Evidence: The `playAudio` function sets a 10-second timeout (line 664: `setTimeout(() => { cleanup(); resolve(void 0); }, 10000)`) that unconditionally resolves the audio promise. Sentences longer than 10 seconds will have their audio cut off silently.
- Impact: Audio playback truncated for longer sentences; user hears incomplete audio with no error indication.
- Recommendation: Calculate timeout dynamically based on `currentSentence.endTime - currentSentence.startTime + buffer`, or remove the timeout and rely solely on the `ended`/`timeupdate` event handlers.

## No-Finding Notes

No additional no-finding notes — all 1342 lines were reviewed and findings were identified across the file.
