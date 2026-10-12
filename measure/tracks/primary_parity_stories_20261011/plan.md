# Plan: Stories in Read

Paths are relative to `apps/primary-advantage` unless they start with `packages/`, `measure/`, or
`docs/`. Each task follows the TDD order of `measure/workflow.md`. App tests use Vitest
(`vitest.config.ts`; DOM tests add `// @vitest-environment jsdom`); domain tests use
`packages/domain/src/__tests__/mock-db.ts`; ETL tests extend `packages/db/src/__tests__/primary-legacy-import.test.ts`.
One heavy job at a time on this machine; the ETL runs in Cloud Build, never on this machine.

## Phase 0: Design [checkpoint: c320cf361]

- [x] Task: Design the three pages in the RPG skin
    - [x] Mock the Read tab sign "Articles | Stories" (`Sign` or `cq-tabs`) on `/student/read`
    - [x] Mock the story shelf (`library` place, books on shelves, genre signs, the page turn), the story page (cover, summary, chapters, characters), and the chapter page (desk and frame, plain text column, the player, the question panels, previous and next)
    - [x] Captures at 375 px and 1280 px, day and night (40 files, outside the repository; paths in `design/captures.md`)
- [x] Task: Fill the behavior contract before the build
    - [x] Copy `docs/runbooks/primary-behavior-contract-template.md` (kit FR-11) to `measure/tracks/primary_parity_stories_20261011/behavior-contract.md` and fill its seven sections (STU-04, the XP rules, the ETL changes, and the migration)
    - [x] Write `measure/tracks/primary_parity_stories_20261011/acceptance-pairs.json` with the pairs of the spec acceptance criteria (kit FR-7); it parses with `PairList` (6 pairs)
    - [x] Write `story-data-checks.sql` (SELECT only)
- [x] Task: Owner look check of the design and of the decisions D4 (MC XP once for each chapter) and D9 (level window on every story page); record the answers in `design/decisions.md` (look check pending (owner, async))
    - Defaults used (spec defaults; no owner question, run rule of 2026-10-12): D4 MC XP once for each chapter; D9 level window (raLevel +/- 1) on the list, the story page, and the chapter page; Member Question "no stop" answered by the spec defaults.
- [x] Task: Measure - User Manual Verification 'Phase 0: Design' (Protocol in workflow.md) (look check pending (owner, async))
    - Step 1: Open the PNG files in `captures/stories/phase0-design/` (see `design/captures.md`).
    - Step 2: Check the tab sign, the shelf, the story page, the chapter page, and the 4 question screens at 375 px and 1280 px, day and night.
    - Step 3: Read `design/decisions.md`. Answer yes or no to D4 and D9.
    - Step 4: Read `behavior-contract.md` section 7 (ETL and migration, NULL `article_id` rule).

## Phase S1: The ETL brings the stories, chapters, and chapter questions [checkpoint: 81d4db30b]
_Story ref: spec.md#story-s1_

- [x] Task: Schema and migration
    - [x] Check the next free (orchestrator set 0072_primary_stories) migration number at the start of the phase (after the highest file in `packages/db/drizzle/`; 0071 on 2026-10-11)
    - [x] `packages/db/src/schema/stories.ts`: nullable `image` on `stories` and `chapters`
    - [x] `packages/db/src/schema/primary.ts`: nullable `chapter_id` (text) on `sentencs_and_words_for_flashcard`, `article_id` nullable, a check that exactly one is set
    - [x] Write the migration SQL by hand (`packages/db/drizzle/<next>_primary_stories.sql`); keep the `tutor_compat` views (no type change, no column drop); update `packages/db/drizzle/meta/_journal.json`, `packages/db/src/sentinels.ts`, and `--required-migration` in `cloudbuild.yaml`
    - [x] Fix the TypeScript callers of the nullable `articleId` (`actions/flashcard.ts` and others that `tsc` names)
- [x] Task: ETL tests
    - [x] `packages/db/src/__tests__/primary-legacy-import.test.ts`: story and chapter mappers (fields of `measure/tracks/primary_legacy_data_migration_20261004/inventory.md:60-61`; `characters` to `story_bible`, `is_published` to `is_public`, `translatedSentences` to `translated_passage`, `audioSentencesUrl` to `audio_url`, the legacy cuid to `image`)
    - [x] Chapter MCQ, SAQ, LAQ, flashcard source rows, and flashcard cards get the new chapter id; the MCQ answer rule of the article questions applies
    - [x] `STORIES_*` activity targets map to the new chapter id; article targets stay as they are
    - [x] The report has no "stories deferred" skip; a second run changes no count; `journal-integrity` passes
- [x] Task: Implement the ETL
    - [x] `packages/db/src/migrations-data/primary-legacy-import.ts`: remove the stories entry of `DROPPED_TABLES` (line 79); add `MAP_TABLES` entries for stories and chapters; load stories and chapters before the questions, the flashcard rows, and `user_activities`; replace the chapter skips (lines 567, 588, 600, 612, 755); map the `STORIES_*` targets (line 703); count the chapters that use the fallback audio key
    - [x] Update `measure/tracks/primary_legacy_data_migration_20261004/inventory.md` rows 60-61 and the ETL notes for `primary_parity_rehearsal3_20261011`
- [~] Task: Reconciliation on a rehearsal target (orchestrator or owner step for the Cloud Build run; local run done)
    - [~] Run the ETL once in Cloud Build (orchestrator or owner step: `etl-cloud-step.md`) (`cloudbuild-etl.yaml`) into a new rehearsal target, never into a shared copy; save the report in `measure/tracks/primary_parity_stories_20261011/etl-run.md`
    - [x] Compare the counts (local run on `primary_etl_stories_s1`, `etl-run.md`: counts match; 11 MCQ skipped by the article rule) with the legacy copy (stories, chapters, the chapter question rows, 3,296 flashcard source rows, 5 cards); run `packages/db/scripts/tutor-read-check.ts`
    - [x] Check a sample of 10 picture keys and 10 audio keys in the bucket with a read-only `gcloud storage ls`
- [x] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [x] Task: Measure - User Manual Verification 'Phase S1: The ETL brings the stories, chapters, and chapter questions' (Protocol in workflow.md)
    - Step 1: Read `etl-run.md`. The counts match the legacy copy. Step 2: Run `etl-cloud-step.md` (orchestrator or owner).

## Phase S2: Stories tab in Read [checkpoint: d121d7f40]
_Story ref: spec.md#story-s2_

- [x] Task: Contracts for the story list
    - [x] `packages/domain/src/stories/contracts.ts`: Zod input (level window, genre, search, page) and output (story cards) for `listPrimaryStories`; export from `packages/domain/src/stories/index.ts`
- [x] Task: Tests for the story list
    - [x] `packages/domain/src/__tests__/stories.test.ts`: the level window (raLevel ±1), published only, genre, search, paging; staff see every published story
    - [x] `lib/__tests__/storage-config.test.ts`: `getStoryImageKey` uses `image ?? id`
    - [x] `app/[locale]/(student)/student/read/__tests__/read-tabs.test.tsx`: the tab sign, Articles selected by default, the toolbar keeps four tabs
- [x] Task: Implement the story list
    - [x] `packages/domain/src/stories/queries.ts`: `listPrimaryStories` (and use the `genre` input, which `listStories` ignores today); rebuild the domain `dist/`
    - [x] `lib/storage-config.ts`: `getStoryImageKey`, `getStoryImageUrl`
    - [x] `app/[locale]/(student)/student/read/page.tsx`: the tab sign; `app/[locale]/(student)/student/read/stories/page.tsx`, `loading.tsx`, `error.tsx`
    - [x] `components/stories/story-shelf.tsx`, `components/stories/story-filters.tsx`; copy keys in `messages/{en,th,cn,tw,vi}.json`
- [x] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [x] Task: Measure - User Manual Verification 'Phase S2: Stories tab in Read' (Protocol in workflow.md) (look check pending (owner, async))
    - Captures: `~/Desktop/primary-parity-progress/captures/stories/phaseS2/` (`tabs`, `shelf`, `shelf-genre`, `shelf-empty`, `shelf-page2`; day and night; 375 and 1280; 20 files). Real covers from the bucket, real components, demo cards.
    - Step 1: Open the PNG files. Check the tab sign, the shelf, the covers (3:4), the genre row, and the page turn.
    - Step 2: Check that no text overflows at 375 px and that each control is 48 px tall.
    - Step 3: Open `/student/read` and `/student/read/stories` as a level 5 student; the list shows levels 4 to 6.
    - Defaults used: D9 level window (raLevel +/- 1) on the list; staff see every published story, with no window text.

## Phase S3: Story page
_Story ref: spec.md#story-s3_

- [x] Task: Contract for the story page
    - [x] `packages/domain/src/stories/contracts.ts`: `getStoryForStudent` output (story, chapters, the finished chapters of the student, characters)
- [x] Task: Tests for the story page
    - [x] `packages/domain/src/__tests__/stories.test.ts`: the level window, published only, the finished chapters from `user_activity` (`STORIES_*` types)
    - [x] `app/[locale]/(student)/student/read/stories/[storyId]/__tests__/story-page.test.tsx`: the summary in the student's language, the chapter list, the Characters sign, 404 outside the window
- [x] Task: Implement the story page
    - [x] `packages/domain/src/stories/queries.ts`: `getStoryForStudent`
    - [x] `app/[locale]/(student)/student/read/stories/[storyId]/page.tsx`, `loading.tsx`; `components/stories/chapter-list.tsx`, `components/stories/story-characters.tsx`
- [x] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [x] Task: Measure - User Manual Verification 'Phase S3: Story page' (Protocol in workflow.md) (look check pending (owner, async))
    - Captures: `~/Desktop/primary-parity-progress/captures/stories/phaseS3/` (`story`, `characters`; day and night; 375 and 1280; 8 files). Real page code, real cover, demo data.
    - Step 1: Open the PNG files. Check the cover (3:4), the badges, the summary, the gold start button, and the two signs.
    - Step 2: Check that no text overflows at 375 px and that each link and sign is 48 px tall (chapter rows 56 px).
    - Step 3: Open a story as a level 5 student. A story of level 8 or an unpublished story shows 404. Chapters that you finished show Done.
    - Defaults used: D9 level window on the story page; staff see every published story; the summary falls back to English when no translation exists.

## Phase S4: Chapter page with read-along
_Story ref: spec.md#story-s4_

- [ ] Task: Contract for the chapter page
    - [ ] `packages/domain/src/stories/contracts.ts`: `getChapterForStudent` output (chapter, sentences, translations, audio key, picture key, the word list row, the previous and next chapter numbers)
    - [ ] Confirm the read-along component contract with `primary_parity_read_along_20261011` (spec D7): `components/read-along/read-along-passage.tsx`, props `{ sentences, passage, audioUrl, translations }`
- [ ] Task: Tests for the chapter page
    - [ ] `packages/domain/src/__tests__/stories.test.ts`: the level window, the chapter by story and number, the word list from the chapter row of `sentencs_and_words_for_flashcard`
    - [ ] `lib/__tests__/storage-config.test.ts`: `getChapterImageKey`, the chapter audio URL from `audio_url`
    - [ ] If this track creates the read-along component: `components/read-along/__tests__/read-along-passage.test.tsx` proves the same highlight and seek behavior as `components/articles/__tests__/article-content-highlight.behavior.test.tsx`
    - [ ] `app/[locale]/(student)/student/read/stories/[storyId]/[chapterNumber]/__tests__/chapter-page.test.tsx`: the player, the translation, the word list, previous and next
- [ ] Task: Implement the chapter page
    - [ ] `packages/domain/src/stories/queries.ts`: `getChapterForStudent`
    - [ ] `components/read-along/read-along-passage.tsx`: use it, or move it out of `components/articles/article-content.tsx` with no behavior change (spec D7)
    - [ ] `app/[locale]/(student)/student/read/stories/[storyId]/[chapterNumber]/page.tsx`, `loading.tsx`; `components/stories/chapter-content.tsx`; reuse `components/articles/word-list.tsx`
- [ ] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [ ] Task: Measure - User Manual Verification 'Phase S4: Chapter page with read-along' (Protocol in workflow.md)

## Phase S5: Chapter questions with XP
_Story ref: spec.md#story-s5_

- [ ] Task: Contracts for the chapter questions
    - [ ] `packages/domain/src/stories/contracts.ts`: the question output without answers; `submitChapterMcq`, `retakeChapterMcq`, `submitChapterWritten` (SA and LA) inputs and outputs
    - [ ] `types/enum.ts`: `STORIES_MC_QUESTION`, `STORIES_SA_QUESTION`, `STORIES_LA_QUESTION` (text values; no database enum change)
- [ ] Task: Tests for grading and XP
    - [ ] `packages/domain/src/__tests__/stories-questions.test.ts`: 5 random of 10 MCQ, no answer in the output; the server grade; 2 XP for each correct answer; the XP once for each chapter after a retake; SA up to 5 and LA up to 25; one SA and one LA submit for each chapter; a non-student is refused (or the preview refusal, spec D8)
    - [ ] `actions/__tests__/story-question.test.ts`: the XP, level, and GP write reuses the `finishQuiz` block; no evidence job starts
    - [ ] `actions/__tests__/finish-quiz-evidence.test.ts` and `actions/__tests__/user-activity-xp.test.ts`: the article `finishQuiz` behavior stays the same after the XP block moves (regression)
    - [ ] `server/utils/__tests__/assistant.test.ts`: the SAQ and LAQ feedback read the chapter passage for a chapter source
- [ ] Task: Implement the chapter questions
    - [ ] `packages/domain/src/stories/mutations.ts`: grading and the activity record; `packages/domain/src/stories/queries.ts`: the chapter questions
    - [ ] Move the XP, level, and GP block of `actions/question.ts` `finishQuiz` into `server/xp/award-question-xp.ts`; call it from `finishQuiz` and from `actions/story-question.ts`
    - [ ] `server/utils/assistant.ts`: a passage source (article or chapter) for `getSaqFeedback` and `getLaqFeedback`
    - [ ] Reuse `components/articles/questions/*` with a chapter source prop; add the LAQ length rule and the 2 feedback tries
- [ ] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [ ] Task: Measure - User Manual Verification 'Phase S5: Chapter questions with XP' (Protocol in workflow.md)

## Phase S6: Chapter flashcards
_Story ref: spec.md#story-s6_

- [ ] Task: Contract for the chapter flashcard save
    - [ ] `actions/flashcard.ts`: a chapter source for the save of `saveArticleToFlashcard` (line 865), with a Zod input
- [ ] Task: Tests for the chapter flashcard save
    - [ ] `actions/__tests__/flashcard-chapter.test.ts`: 3 to 5 new words and the sentences after all three question types; no duplicate card; no save before the three are done; `source_id` is the chapter id
- [ ] Task: Implement the chapter flashcard save
    - [ ] `actions/flashcard.ts`: the chapter save; call it after the last submit in `actions/story-question.ts`
- [ ] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [ ] Task: Measure - User Manual Verification 'Phase S6: Chapter flashcards' (Protocol in workflow.md)

## Phase S7: Old story URLs open the new pages [checkpoint: 9c2206f0c]
_Story ref: spec.md#story-s7_

- [x] Task: Contract for the legacy story id
    - Legacy URL forms (legacy `bfea121`, `app/[locale]/(student)/student/stories/`): list `/student/stories`; story `/student/stories/<cuid>`; chapter `/student/stories/<cuid>/<chapterNum>` (a number, not an id). New: `/student/read/stories`, `/student/read/stories/<uuid>`, `/student/read/stories/<uuid>/<n>`.
    - Deviation: `resolveLegacyChapter` has no map lookup. The legacy chapter URL carries the chapter number, so it only checks a positive whole number. A chapter id never appears in a legacy URL.
    - The local copy `primary_parity_20261011` has 0 story rows in `primary_legacy_id_map` (made before S1). The tests use mocks.
    - [x] `packages/domain/src/stories/legacy-id.ts`: `resolveLegacyStoryId` and `resolveLegacyChapter` (190c9693f) with Zod input and output, through `primary_legacy_id_map` (the pattern of `packages/domain/src/articles/legacy-id.ts`)
- [x] Task: Tests for the redirects
    - [x] `packages/domain/src/__tests__/stories-legacy-id.test.ts`: a known cuid, an unknown cuid, a UUID (mock DB)
    - [x] `app/[locale]/(student)/student/stories/__tests__/legacy-redirect.test.ts`: the list, the story, and the chapter redirects; 404 for an unknown cuid
- [x] Task: Implement the redirects
    - [x] `app/[locale]/(student)/student/stories/[[...path]]/page.tsx`: redirect to `/student/read/stories/...`
    - [x] `docs/primary-whats-moved.md:24`: stories moved to Read, Stories tab
- [x] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [x] Task: Measure - User Manual Verification 'Phase S7: Old story URLs open the new pages' (Protocol in workflow.md)
    - Look check pending (owner, async). Step 1: sign in as a student, open `/student/stories`; the Stories tab of Read opens. Step 2: open `/student/stories/<old story cuid>`; the new story page opens. Step 3: open `.../<cuid>/2`; chapter 2 opens. Step 4: open an unknown cuid; 404 shows. Needs the 0072 story rows (after the ETL on rehearsal 3).

## Phase A: Acceptance

- [ ] Task: Run the kit of `primary_parity_acceptance_20261011` (`scripts/primary-parity/capture.ts` for each app, then `report.ts`) with `acceptance-pairs.json`; use one student account in both apps; record the XP before and after for AC-4 and AC-5
- [ ] Task: Captures at 375 px and 1280 px, day and night, for the owner look check (AC-7)
- [ ] Task: Add the block of this track to `scripts/primary-parity/cutover-check.mjs` (kit FR-13) for rehearsal 3
- [ ] Task: Write `measure/tracks/primary_parity_stories_20261011/acceptance.md` from the runbook template (kit FR-10), with the owner look check
- [ ] Task: Measure - User Manual Verification 'Phase A: Acceptance' (Protocol in workflow.md)
