# Line-by-Line Review — `sa-batch-33`

- **Track:** `science_advantage_review_20260626`
- **Batch:** `sa-batch-33`
- **Reviewer:** ark-code-latest (subagent)
- **Scope:** Read-only line review. No app code edited.
- **Focus areas:** correctness, security/tenancy/auth, AGENTS compliance, test quality, architecture baseline/golden-path patterns.
- **Finding ID scheme:** `F-SA-B33-###`
- **Severity scale:** Critical / High / Medium / Low / Info

## Files Reviewed (20 / 20)

| # | File | Type |
|---|------|------|
| 1 | `apps/science-advantage/scripts/seed-data/grade-4/lessons/g4-states-of-matter.json` | data (LessonContent) |
| 2 | `apps/science-advantage/scripts/seed-data/grade-4/lessons/g4-water-cycle.json` | data (LessonContent) |
| 3 | `apps/science-advantage/scripts/seed-data/grade-4/lessons/g4-weather-patterns.json` | data (LessonContent) |
| 4 | `apps/science-advantage/scripts/seed-data/grade-4/questions/g4-animal-adaptations.json` | data (question bank) |
| 5 | `apps/science-advantage/scripts/seed-data/grade-4/questions/g4-ecosystems.json` | data (question bank) |
| 6 | `apps/science-advantage/scripts/seed-data/grade-4/questions/g4-food-chains.json` | data (question bank) |
| 7 | `apps/science-advantage/scripts/seed-data/grade-4/questions/g4-forces-motion.json` | data (question bank) |
| 8 | `apps/science-advantage/scripts/seed-data/grade-4/questions/g4-plant-life-cycles.json` | data (question bank) |
| 9 | `apps/science-advantage/scripts/seed-data/grade-4/questions/g4-rocks-minerals.json` | data (question bank) |
| 10 | `apps/science-advantage/scripts/seed-data/grade-4/questions/g4-sound-waves.json` | data (question bank) |
| 11 | `apps/science-advantage/scripts/seed-data/grade-4/questions/g4-states-of-matter.json` | data (question bank) |
| 12 | `apps/science-advantage/scripts/seed-data/grade-4/questions/g4-water-cycle.json` | data (question bank) |
| 13 | `apps/science-advantage/scripts/seed-data/grade-4/questions/g4-weather-patterns.json` | data (question bank) |
| 14 | `apps/science-advantage/scripts/seed-data/grade-4/standards-mapping.json` | data (standards map) |
| 15 | `apps/science-advantage/scripts/seed-data/lessons/thai-g3-unit-1.json` | data (LessonsFile) |
| 16 | `apps/science-advantage/scripts/seed-data/lessons/thai-g3-unit-10.json` | data (LessonsFile) |
| 17 | `apps/science-advantage/scripts/seed-data/lessons/thai-g3-unit-2.json` | data (LessonsFile) |
| 18 | `apps/science-advantage/scripts/seed-data/lessons/thai-g3-unit-3.json` | data (LessonsFile) |
| 19 | `apps/science-advantage/scripts/seed-data/lessons/thai-g3-unit-4.json` | data (LessonsFile) |
| 20 | `apps/science-advantage/scripts/seed-data/lessons/thai-g3-unit-5.json` | data (LessonsFile) |

> Note: All three `grade-4/lessons/*.json` reading-passage English `content` fields, and the long G3 lesson `content`/reading blocks, were truncated at 2000 chars by the Read tool (`... (line truncated to 2000 chars)`). See Limitations.

---

## Findings

### F-SA-B33-001 — Grade-4 question banks do not match the seeder's Zod contract; `pnpm seed --grade=4` would hard-fail on questions
- **Severity:** High
- **File:** all 10 `grade-4/questions/*.json` (e.g. `g4-animal-adaptations.json:4-13`, `g4-weather-patterns.json:4-19`); contract at `lib/schemas/seed-validation.ts:7-37`; consumer at `scripts/seed/seed-questions.ts:96-99,178`
- **Detail:** The seeding path (`scripts/seed.ts:44` → `seedQuestions({gradeLevel})` → `collectQuestionFiles` includes `grade-4/questions` when `gradeLevel===4`, `seed-questions.ts:56-64`) validates every file with `validateQuizQuestionsSeedFile`, which enforces `SeedQuizQuestionSchema`:
  - requires `text` (min 1) — the JSON has `question`/`questionThai`, **no `text`** (verified: `grep -c '"text"'` = 0 across all 10 files).
  - requires `points` (positive int) — **absent** in every file (`grep -c '"points"'` = 0).
  - requires `standards` (array, min 1) — **absent** in every file (`grep -c '"standards"'` = 0).
  - The JSON instead carries authoring-only fields `difficulty`, `id`, `explanation` that the seed schema does not model.
  On any non-empty validation error, `seed-questions.ts:97-99` calls `process.exit(1)`. The downstream insert also reads `q.text`, `q.points`, `q.standards` (`seed-questions.ts:147,160,178-179`), which would be `undefined`.
- **Root cause:** There are **two divergent question schemas** in the app — the authoring schema enforced by `scripts/validate-content.ts:44-52,244` (`question`, `questionThai`, `correctAnswer` 0-3) and the seeding schema in `lib/schemas/seed-validation.ts` / `lib/grade4-normalization.ts:23-30` (`text`, `points`, `standards`). These grade-4 files conform to the former and violate the latter, and no transform between them exists in this batch's pipeline.
- **Impact:** Grade-4 question content cannot be seeded through the documented golden path without a missing normalization step (or a manual edit). This is a contract/golden-path break per AGENTS ("update contracts before implementing", single Zod contract per boundary).
- **Recommendation:** Either (a) add a documented transform that maps `question→text`, derives `points`, and injects `standards` (e.g. from `standards-mapping.json`) before validation, or (b) reconcile the two schemas into one. Add a test that runs `validateQuizQuestionsSeedFile` over `grade-4/questions/*.json` in CI.

### F-SA-B33-002 — Grade-4 lesson files are bare `LessonContent` docs, not `LessonsFile`; `seed-lessons` would throw on them under `--grade=4`
- **Severity:** High
- **File:** `grade-4/lessons/g4-states-of-matter.json:1-3`, `g4-water-cycle.json:1-3`, `g4-weather-patterns.json:1-4`; consumer `scripts/seed/seed-lessons.ts:59-68,88-92`; validator `scripts/seed/validate-json.ts:75-113`
- **Detail:** `collectLessonFiles(4)` appends `grade-4/lessons/*.json` to the file list (`seed-lessons.ts:59-67`). Each file is then `JSON.parse`d as a `LessonsFile` and passed to `validateLessonsFile` (`seed-lessons.ts:89-92`), which throws when `framework` is missing (`validate-json.ts:80-82`). The grade-4 lesson files have **no** `framework`/`gradeLevel`/`unit`/`lessons` wrapper — they are raw `{ "version": 1, "blocks": [...] }` LessonContent documents (confirmed: `grep -L '"framework"'` lists all 10). So `seedLessons({gradeLevel:4})` would throw `Lessons file must have a valid "framework" field` and abort.
- **Note / ambiguity:** `grade-4/README.md:35-86` explicitly documents these files as raw `LessonContent` (matching what's on disk), implying they are intended for a *different* ingestion path (e.g. `migrate-lesson-content.ts`, which writes `structuredContent` into pre-existing lessons), **not** `seed-lessons.ts`. If so, the bug is that `seed-lessons.ts:59-67` wires the grade-4 dir into a loader that cannot parse it. Either way the two are mutually incompatible.
- **Impact:** Grade-4 lesson seeding via the standard entrypoint is broken or the directory wiring is wrong. Inconsistent with the G3 files (items 15-20) which *are* valid `LessonsFile` documents.
- **Recommendation:** Decide the canonical ingestion for grade-4 LessonContent and remove the incompatible wiring (or wrap these files in the `LessonsFile` envelope). Add a parse/validate test over `grade-4/lessons/`.

### F-SA-B33-003 — Duplicate standard code `Sc1.2-G4` with two conflicting descriptions in `standards-mapping.json`
- **Severity:** Medium
- **File:** `grade-4/standards-mapping.json:14-17` vs `33-35`
- **Detail:** Code `Sc1.2-G4` is defined twice with **different meanings**:
  - line 15-16: *"Explain the importance of plant reproduction for species continuation"* (under `g4-plant-life-cycles`)
  - line 33-34: *"Describe how animals adapt to their environment for survival"* (under `g4-animal-adaptations`)
  Science standards are keyed by composite (framework, code) when seeded/linked (`seed-lessons.ts:165-173`). A single code carrying two semantics is a data-integrity defect: whichever description wins at seed time, one lesson links to a standard whose text contradicts its intent. (`Sc2.1-G4` and `Sc6.3-G4` also appear twice but with *identical* descriptions — those are benign reuse; only `Sc1.2-G4` conflicts.)
- **Recommendation:** Assign a distinct code to the animal-adaptation indicator (e.g. `Sc1.4-G4`) or unify the description. Add a uniqueness/consistency check over `(code) ⇒ description` in the standards validator.

### F-SA-B33-004 — Literal `\nn` typo corrupts rendered content in `thai-g3-unit-10` science-portfolio lesson
- **Severity:** Low
- **File:** `thai-g3-unit-10.json:334`
- **Detail:** The top-level `content` string contains `"## Main Content\nn**What to Include**\n\n..."` — `\nn` (newline + stray `n`) instead of `\n\n`. When rendered as Markdown this surfaces a literal `n` before the heading and breaks the intended paragraph/heading break. (The parallel `structuredContent` intro block at line 345 omits this section entirely, so the defect only affects the flat `content` field.)
- **Recommendation:** Fix to `\n\n`.

### F-SA-B33-005 — `g4-weather-patterns` files carry per-question and top-level `slug` fields the other nine lessons/banks omit (structural inconsistency)
- **Severity:** Low
- **File:** `grade-4/questions/g4-weather-patterns.json:18,34,...,322,325` and `grade-4/lessons/g4-weather-patterns.json:2`
- **Detail:** The weather-patterns question bank uniquely adds `"slug": "q-1" … "q-20"` to each question and a trailing top-level `"slug": "weather-patterns"` (line 325); the lesson file uniquely adds a top-level `"slug": "weather-patterns"` (line 2). The other nine question banks and nine lesson files have none of these. `seed-questions.ts:167` does honor `q.slug || \`${lesson.slug}-q${order}\``, so the weather slugs would produce `q-1`-style identifiers diverging from the auto-generated `<lessonSlug>-q<n>` pattern used by every other lesson — an inconsistency in question slug namespacing.
- **Recommendation:** Normalize: either add slugs everywhere with a consistent scheme or strip the ad-hoc ones from weather-patterns.

### F-SA-B33-006 — Grade-4 reading passages ship with partial/truncated Thai translations
- **Severity:** Low (data quality / unverifiable completeness)
- **File:** `g4-states-of-matter.json:106-111`, `g4-water-cycle.json:105-110`, `g4-weather-patterns.json:111-116`
- **Detail:** Each `reading_passage` English `content` claims `wordCount` 410-425 and runs many paragraphs, while the parallel `contentThai` is only 2-4 short paragraphs (e.g. states-of-matter Thai stops after the third spoken line; water-cycle Thai ends after the raindrop's first paragraph). This repeats the pattern flagged for the other g4 lessons in prior batches. `grade-4/README.md:134-145,222-227` requires natural, complete Thai for reading passages. Cannot confirm whether abbreviation is intentional because the English side was truncated by the Read tool.
- **Recommendation:** Confirm intent; flag for native-speaker completion/review per README.

### F-SA-B33-007 — Referenced provisional lesson images are absent from `public/images`
- **Severity:** Low (known per README, noted)
- **File:** `g4-states-of-matter.json:79,93`; `g4-water-cycle.json:73,92`; `g4-weather-patterns.json:79,98`
- **Detail:** Image blocks reference `/images/g4-states-of-matter-1.webp`, `/images/g4-water-cycle-1.webp`, etc. Spot check confirms these files do not exist under `public/images/` (`ls` returned "No such file or directory"). `grade-4/README.md:120,229-236` states image paths are provisional and actual assets are deferred to issue #150, so this is expected debt — but the lessons will render broken images until then. Alt text is present and ≥10 chars (good a11y baseline).
- **Recommendation:** Track image delivery (issue #150) before these lessons ship to learners; consider a placeholder asset.

### F-SA-B33-008 — Grade-3 `ASSESSMENT`-type lessons contain no assessment items
- **Severity:** Low (data completeness)
- **File:** `thai-g3-unit-10.json:220-282` (`g3-final-assessment-strands-14`, `g3-final-assessment-strands-58`)
- **Detail:** Both lessons declare `"lessonType": "ASSESSMENT"` and a broad `standards` list, but their `structuredContent` is a single intro text block ending `"Good luck!"` (lines 243-247, 275-279) with no questions, rubric, or item references. As authored, an "assessment" presents no assessable content. (Whether questions are attached separately via a question bank keyed to these slugs was not evidenced — no matching bank files are in this batch.)
- **Recommendation:** Confirm assessment items are sourced elsewhere, or populate these lessons.

### F-SA-B33-009 — Grade-4 question content & keys are accurate on spot-check (positive)
- **Severity:** Info
- **File:** all 10 `grade-4/questions/*.json`
- **Detail:** Reviewed answer keys for scientific correctness across a sample in each file (e.g. food-chains q4 herbivore `correctAnswer:0`; states-of-matter q8 evaporation `correctAnswer:0`; water q8 oceans 97% `correctAnswer:2`; sound q8 solids fastest `correctAnswer:2`). Indices align with the correct option and with the `explanation` text; `correctAnswer` values stay within `0..3` and within `options` bounds, satisfying `validate-content.ts:244`. Each file has 20 questions with an 8/8/4 easy/medium/hard split matching `README.md:187-190`. Content is age-appropriate and consistent with the lesson bodies.
- **Note:** This is the authoring schema; correctness here does not resolve the seeding-schema break in F-SA-B33-001.

### F-SA-B33-010 — Grade-3 LessonsFile documents are schema-conformant (positive, with truncation caveat)
- **Severity:** Info
- **File:** `thai-g3-unit-1.json`, `-2`, `-3`, `-4`, `-5`, `-10`
- **Detail:** These files carry the required `framework`/`gradeLevel`/`unit`/`lessons` envelope and per-lesson `id`/`slug`/`title`/`description`/`content`/`order`/`standards`, matching `SeedLessonSchema` (`seed-validation.ts:42-67`) and `validateLessonsFile` (`validate-json.ts:75-113`). `structuredContent` blocks use valid discriminants (`text`, `vocabulary`, `reading_passage`) and vocab term counts look reasonable. `titleThai` present. Standards codes (`Sc8.1-G3`, etc.) are well-formed. Seeder uses lesson `id` (not `slug`) for the DB slug column (`seed-lessons.ts:112-117`) — internally consistent with curriculum cross-refs.
- **Caveat:** Long `content` and `reading_passage` fields were truncated at 2000 chars by the Read tool, so full G3 passage bodies and exact word counts were not verified.

### F-SA-B33-011 — `standards-mapping.json` is not consumed by the seed pipeline (orphaned data, noted)
- **Severity:** Info
- **File:** `grade-4/standards-mapping.json` (whole file)
- **Detail:** A repo-wide search shows `standards-mapping.json` is referenced only by tests (`lib/schemas/__tests__/curriculum-identifiers.test.ts`, `content-migration.test.ts`) and the README — not by `seed-standards.ts`/`seed-lessons.ts`/`seed-questions.ts`. Standards are seeded from separate standards JSON, and lesson↔standard links come from each lesson's own `standards[]`. So the NGSS↔Thai alignment mapping here is reference/documentation data, not an active seed source. Worth confirming this is intentional rather than a dropped wiring.
- **Recommendation:** Document its role, or wire it into seeding if alignment data is meant to persist.

---

## AGENTS Compliance Summary
- **Contracts/Zod (golden path):** Primary concern. Two competing question schemas exist (authoring vs seeding); the grade-4 question banks satisfy only the authoring one and break the seeding contract (F-SA-B33-001). Grade-4 lesson files are wired into a loader that cannot parse them (F-SA-B33-002). Both violate the "single contract per boundary / update contracts first" guidance.
- **Security/auth:** N/A for this batch — all files are static seed data; no auth, secrets, or runtime code. No injection surface.
- **Tenancy:** Not directly applicable to the JSON content; the consuming seeders inject the fixed `SEED_SCHOOL_ID` (`seed-lessons.ts:21`, `seed-questions.ts:24`) and pass `schoolId` on every insert — observed as correct in the cross-referenced seed code.
- **Test quality:** No tests in-batch (data files). The absence of a CI check that runs the seed-side Zod validators over `grade-4/**` is what allowed F-SA-B33-001/002 to persist; recommend adding such tests.
- **Data quality:** Conflicting standard code (F-SA-B33-003), content typo (F-SA-B33-004), slug inconsistency (F-SA-B33-005), partial Thai (F-SA-B33-006), missing images (F-SA-B33-007), empty assessments (F-SA-B33-008).

## Severity Tally
- Critical: 0
- High: 2 — F-SA-B33-001, F-SA-B33-002
- Medium: 1 — F-SA-B33-003
- Low: 5 — F-SA-B33-004, F-SA-B33-005, F-SA-B33-006, F-SA-B33-007, F-SA-B33-008
- Info: 3 — F-SA-B33-009, F-SA-B33-010, F-SA-B33-011

## Limitations
- **Read tool truncation:** All three `grade-4/lessons/*.json` `reading_passage` English `content` fields and several long G3 `content`/reading blocks were truncated at 2000 chars. Full English/Thai passage bodies, exact word counts, and English-side completeness could **not** be verified; claimed `wordCount` values were taken at face value.
- **Out-of-batch cross-references:** `scripts/seed/seed-lessons.ts`, `seed-questions.ts`, `seed.ts`, `validate-json.ts`, `lib/schemas/seed-validation.ts`, `lib/grade4-normalization.ts`, `scripts/validate-content.ts`, and `grade-4/README.md` were read only to verify how the batch's data is consumed. Their full behavior was not exhaustively reviewed; `thai-g4-unit-*.json` and curriculum-unit files were inspected only for shape comparison.
- **No execution:** Review is static/read-only. No seed/validate scripts were run; schema (non)conformance is by inspection and by reading the relevant Zod schemas and loaders. The "would hard-fail" conclusions (F-SA-B33-001/002) are derived from reading the validators and loaders, not from running them.
- **No edits made** to application code or data, per instructions.

## Acceptance Note
This is a review artifact only. It makes **no acceptance or closeout claims** for the track or any task; gating decisions remain with the orchestrator/reviewer of record.
