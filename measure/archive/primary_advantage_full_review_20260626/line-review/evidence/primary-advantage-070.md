# Line Review Evidence: primary-advantage-070

Reviewer: coder-minimax-m3/primary-advantage-070
Files assigned: 1
Lines assigned: 699

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/data/A1-story-example.json` | 1-699 | reviewed | 2 |

## Findings

### LR-primary-advantage-070-001 — Chapter 4 grammar focus claims comparative "higher" but the passage only uses the base form "high"

- Severity: Low
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/data/A1-story-example.json:322,328`
- Evidence: The chapter 4 `chapterBlueprint.grammarFocus` (line 322) is `"Comparative (lighter, higher) & Adverbs (slowly)"`, but the chapter 4 `passage` (line 328) only uses the comparative "lighter" once (`"On the moon, he was lighter."`) and uses the base-form adverb "high" once (`"He jumped high into the air."`) — the comparative "higher" does not appear anywhere in the passage. The only comparative actually demonstrated is "lighter", so the chapter partially delivers on the promised grammar focus. This is a primary-specific CEFR A1 fixture aimed at ages 7-9 (per the blueprint `targetAudience` on line 6: "Aged 7-9, likes space and robots") where the chapter-level grammar focus is the primary pedagogical claim, not a passing reference.
- Impact: A 7-9 year old learner using this chapter to study A1 grammar will not encounter the comparative form "higher" that the `grammarFocus` advertises. If the fixture is used as a few-shot example for AI content generation (the A0/A1/A2 story-example files are AI-generated reference fixtures), the comparative teaching signal is incomplete and may bias the generator toward the base form. This is a primary-student adaptation risk because the grammar focus mismatch is invisible to a teacher who only inspects the blueprint and not the passage text.
- Recommendation: In a separate authorized content-remediation track, either rewrite the passage to include a true comparative "higher" (e.g., `"He jumped higher on the moon than on Earth."`) or narrow the `grammarFocus` string on line 322 to `"Comparative (lighter) & Adverbs (slowly, high)"` so the chapter no longer promises a form it does not teach. No source edit performed in this review-only track.

### LR-primary-advantage-070-002 — Chapter 7 grammar focus claims adverb "carefully" but the passage only uses "slowly"

- Severity: Low
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/data/A1-story-example.json:550,556`
- Evidence: The chapter 7 `chapterBlueprint.grammarFocus` (line 550) is `"Past Simple (carried, sat) & Adverbs (carefully)"`, but the chapter 7 `passage` (line 556) never uses the word "carefully". The closest adverb usage is `"Leo walked slowly because he was tired."` — the adverb "slowly" is demonstrated, but "carefully" is not. The `chapterBlueprint.pacing` field (line 552) is "Relieved" which is also somewhat inconsistent with the "carefully" adverb focus, since "carefully" implies a tense/cautious pacing rather than a relieved one.
- Impact: Same pattern as LR-primary-advantage-070-001 — the chapter 7 `grammarFocus` advertises an adverb form ("carefully") that the passage does not actually demonstrate. For a primary-student curriculum fixture, a 7-9 year old reading this chapter will learn "slowly" (which the passage teaches) but not "carefully" (which the chapter claims to teach). This is also a primary-student adaptation risk for the same reason as LR-primary-advantage-070-001: the discrepancy is only visible by cross-checking the `grammarFocus` string against the passage text.
- Recommendation: In a separate authorized content-remediation track, either add a sentence in the passage that uses "carefully" (e.g., `"Leo put the seatbelt on the robot carefully."`) or narrow the `grammarFocus` string on line 550 to `"Past Simple (carried, sat) & Adverbs (slowly)"` to match what the passage actually teaches. No source edit performed in this review-only track.

## No-Finding Notes

- `apps/primary-advantage/data/A1-story-example.json` lines 1-321, 323-549, 551-699: reviewed line-by-line; no other findings. The blueprint (lines 2-89), the 8-stage Harmon outline (lines 19-76), the character list (lines 77-88), and all 8 chapter objects (lines 91-697) are internally consistent — every chapter's `chapterNumber` and `stage` matches its `harmonOutline` entry, every `multipleChoiceQuestions.answer` is present in its `options` array (verified for all 24 MC items across chapters 1-8), every `translatedSummary` carries the full `th`/`cn`/`tw`/`vi` locale set used across the app, every `wordlist[*].translation` and `sentencesFlashcard[*].translation` object carries the same full locale set, and the JSON is well-formed and closes correctly at line 699. The CEFR A1 reading level is appropriate for the `targetAudience` "Aged 7-9, likes space and robots" (line 6), and the chapters progress through the 8-stage Harmon arc (You → Need → Go → Search → Find → Take → Return → Change) in the expected order. No authorization, tenant, Prisma-vs-Drizzle, or adapter-bypass concerns apply to this static data file: `rg -l "A1-story-example" apps/ packages/` returns zero matches, so the fixture is not imported by any application TypeScript and exists solely as a content reference/example artifact. The sole data-quality findings are the two `grammarFocus`/passage mismatches recorded above.
