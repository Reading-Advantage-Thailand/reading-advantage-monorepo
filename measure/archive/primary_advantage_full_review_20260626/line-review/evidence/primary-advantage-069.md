# Line Review Evidence: primary-advantage-069

Reviewer: coder-vocengine-ark-code-latest/primary-advantage-069
Files assigned: 1
Lines assigned: 949

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/data/A0-story-example.json` | 1-949 | reviewed | 1 |

## Findings

### LR-primary-advantage-069-001 — A0 passage uses adverb "Ideally" outside controlled vocabulary and reading level

- Severity: Low
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/data/A0-story-example.json:223`
- Evidence: Chapter 2's `passage` reads `"...He wants to play with a friend. Pip is sad. Ideally, dogs play together. Pip puts the ball down..."`. The sentence-initial adverb "Ideally" is not in `globalVocabularyList` (lines 7-28), not in the chapter `selectedVocabulary` (line 217: `ball, play, sad, friend, wants`), and is not modeled by any declared `globalGrammarStructures` (lines 29-35) or the chapter `grammarFocus` (line 218 "Present Simple 'wants', 'has'"). It is also stylistically/register-inappropriate authorial commentary for a CEFR A0 story aimed at ages 5-7 (lines 5-6), unlike every other simple SVO sentence in the fixture.
- Impact: This sample story is a content fixture demonstrating A0-leveled output. An out-of-level abstract adverb undermines the reading-level guarantee for primary students and, if used as a few-shot/reference example for generation, can leak inappropriate vocabulary into produced content. The word also never appears in the chapter wordlist (lines 232-262) or comprehension items, so learners get no support for it.
- Recommendation: In a separate authorized content-remediation track, rewrite line 223 to stay within the A0 controlled vocabulary (e.g., remove "Ideally, dogs play together." or replace with a simple in-vocabulary sentence such as "Dogs play together."). No source edit performed in this review-only track.

## No-Finding Notes

- `apps/primary-advantage/data/A0-story-example.json` lines 1-222 and 224-949: reviewed line-by-line; no findings. The blueprint (lines 2-106), Harmon 8-stage outline (lines 36-93), characters (lines 94-105), and all 8 chapter objects (lines 107-948) are internally consistent — `chapterNumber`/`stage` pairs match between `harmonOutline` and `chapters`, vocabulary/translation objects carry the full `th`/`cn`/`tw`/`vi` locale set used across the app, multiple-choice `answer` values are always present in their `options` arrays, and the JSON is well-formed and closes correctly at line 949. This is a static data fixture not imported by application TypeScript (no references found under `apps/primary-advantage`), so there are no auth/tenant/Prisma-vs-Drizzle/adapter-bypass concerns in this file.
