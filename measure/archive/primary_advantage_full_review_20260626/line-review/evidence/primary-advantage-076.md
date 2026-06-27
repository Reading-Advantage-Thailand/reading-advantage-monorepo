# Line Review Evidence: primary-advantage-076

Reviewer: coder-deepseek-v4-flash/primary-advantage-076
Files assigned: 7
Lines assigned: 962

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/data/prompts-combined-MC.json` | 1-66 | reviewed | 0 |
| `apps/primary-advantage/data/prompts-combined-SA.json` | 1-66 | reviewed | 0 |
| `apps/primary-advantage/data/prompts-feedback-user-LA.json` | 1-3 | reviewed | 0 |
| `apps/primary-advantage/data/prompts-feedback-user-SA.json` | 1-3 | reviewed | 0 |
| `apps/primary-advantage/data/story-prompts.json` | 1-36 | reviewed | 0 |
| `apps/primary-advantage/data/story-schema.ts` | 1-179 | reviewed | 1 |
| `apps/primary-advantage/data/title-a0.json` | 1-609 | reviewed | 0 |

## Findings

### LR-primary-advantage-076-001 — `data/story-schema.ts` exports schemas that duplicate `lib/zod.ts` names and are never consumed by production code

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/data/story-schema.ts:1-179`
- Evidence: The file exports `storyGeneratorSchema` (line 132) and `articleGeneratorSchema` (line 144). A `grep` for any import of `story-schema` across the entire `apps/primary-advantage` tree returned zero results. No barrel file re-exports this module. The production story generator (`server/utils/genaretors/story-generator.ts`) imports `storyGeneratorSchema` from `@/lib/zod`, and the article generators (`article-generator.ts`, `new-generator.ts`) import `articleGeneratorSchema` from `@/lib/zod`. The `data/story-schema.ts` versions have a different, more detailed shape than their `lib/zod.ts` counterparts (e.g., `storyGeneratorSchema` in this file includes a `blueprint` sub-schema with `harmonOutline`, `globalVocabularyList`, etc., while `lib/zod.ts`'s version has a flat `{ topic, title, summary, ...chapters, characters }` structure). The `articleGeneratorSchema` is labeled "Legacy/Existing — Kept for reference/compatibility" (line 141-142) but `storyGeneratorSchema` has no such disclaimer.
- Impact: Dead exported code creates ambiguity about which schema definition is authoritative. Future maintainers may read `data/story-schema.ts` and assume its more detailed shape reflects the actual data contract, leading to integration errors when the runtime uses the `lib/zod.ts` shape instead. The mismatch between the two `storyGeneratorSchema` definitions is especially risky because both are valid TypeScript modules under `apps/primary-advantage` and the more detailed one would pass type-checks if accidentally imported. This anti-pattern is likely inherited from Reading Advantage's approach of having multiple schema definition files.
- Recommendation: Either (a) delete `data/story-schema.ts` if its schemas are truly superseded by `lib/zod.ts`, (b) import from and re-export through this file if it is intended as the authoritative definition (and then update the generator imports), or (c) add a clear `@deprecated` JSDoc tag and explanatory comment on every export explaining why it is preserved and which file to use instead.

## No-Finding Notes

- `apps/primary-advantage/data/prompts-combined-MC.json`: reviewed line-by-line (lines 1-66). Well-formed JSON prompt templates for multiple-choice questions across CEFR levels A1-C2, fiction and nonfiction. All entries follow consistent structure (level, user_prompt, system_prompt). No hardcoded secrets, no PII. No findings.
- `apps/primary-advantage/data/prompts-combined-SA.json`: reviewed line-by-line (lines 1-66). Well-formed JSON prompt templates for short-answer questions across CEFR levels A1-C2, fiction and nonfiction. Same consistent structure as MC variant plus JSON output format examples. No findings.
- `apps/primary-advantage/data/prompts-feedback-user-LA.json`: reviewed line-by-line (lines 1-3). Tiny JSON file with single user prompt template for long-answer feedback. Template variables: {preferredLanguage}, {targetCEFRLevel}, {readingPassage}, {writingPrompt}, {studentResponse}. No findings.
- `apps/primary-advantage/data/prompts-feedback-user-SA.json`: reviewed line-by-line (lines 1-3). Tiny JSON file with single user prompt template for short-answer feedback. Template variables: {targetCEFRLevel}, {article}, {question}, {suggestedResponse}, {studentResponse}, {preferredLanguage}. No findings.
- `apps/primary-advantage/data/story-prompts.json`: reviewed line-by-line (lines 1-36). Well-formed JSON configuration for story generation using Dan Harmon's Story Circle across CEFR levels A0-B1. Each level has systemPrompt, userPromptTemplate, and description. All five levels present and consistently structured. No findings.
- `apps/primary-advantage/data/title-a0.json`: reviewed line-by-line (lines 1-609). Well-formed JSON containing 100 story titles for A0 (YLE Starters) level, organized by 18 genres (Family & Friends, Animal Adventures, School Life, etc.). Every story entry has id, genre, title, description with consistent formatting. No hardcoded secrets, no PII. No findings.
