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

## Phase S1: The ETL brings the stories, chapters, and chapter questions
_Story ref: spec.md#story-s1_

- [ ] Task: Schema and migration
    - [ ] Check the next free migration number at the start of the phase (after the highest file in `packages/db/drizzle/`; 0071 on 2026-10-11)
    - [ ] `packages/db/src/schema/stories.ts`: nullable `image` on `stories` and `chapters`
    - [ ] `packages/db/src/schema/primary.ts`: nullable `chapter_id` (text) on `sentencs_and_words_for_flashcard`, `article_id` nullable, a check that exactly one is set
    - [ ] Write the migration SQL by hand (`packages/db/drizzle/<next>_primary_stories.sql`); keep the `tutor_compat` views (no type change, no column drop); update `packages/db/drizzle/meta/_journal.json`, `packages/db/src/sentinels.ts`, and `--required-migration` in `cloudbuild.yaml`
    - [ ] Fix the TypeScript callers of the nullable `articleId` (`actions/flashcard.ts` and others that `tsc` names)
- [ ] Task: ETL tests
    - [ ] `packages/db/src/__tests__/primary-legacy-import.test.ts`: story and chapter mappers (fields of `measure/tracks/primary_legacy_data_migration_20261004/inventory.md:60-61`; `characters` to `story_bible`, `is_published` to `is_public`, `translatedSentences` to `translated_passage`, `audioSentencesUrl` to `audio_url`, the legacy cuid to `image`)
    - [ ] Chapter MCQ, SAQ, LAQ, flashcard source rows, and flashcard cards get the new chapter id; the MCQ answer rule of the article questions applies
    - [ ] `STORIES_*` activity targets map to the new chapter id; article targets stay as they are
    - [ ] The report has no "stories deferred" skip; a second run changes no count; `journal-integrity` passes
- [ ] Task: Implement the ETL
    - [ ] `packages/db/src/migrations-data/primary-legacy-import.ts`: remove the stories entry of `DROPPED_TABLES` (line 79); add `MAP_TABLES` entries for stories and chapters; load stories and chapters before the questions, the flashcard rows, and `user_activities`; replace the chapter skips (lines 567, 588, 600, 612, 755); map the `STORIES_*` targets (line 703); count the chapters that use the fallback audio key
    - [ ] Update `measure/tracks/primary_legacy_data_migration_20261004/inventory.md` rows 60-61 and the ETL notes for `primary_parity_rehearsal3_20261011`
- [ ] Task: Reconciliation on a rehearsal target
    - [ ] Run the ETL once in Cloud Build (`cloudbuild-etl.yaml`) into a new rehearsal target, never into a shared copy; save the report in `measure/tracks/primary_parity_stories_20261011/etl-run.md`
    - [ ] Compare the counts with the legacy copy (stories, chapters, the chapter question rows, 3,296 flashcard source rows, 5 cards); run `packages/db/scripts/tutor-read-check.ts`
    - [ ] Check a sample of 10 picture keys and 10 audio keys in the bucket with a read-only `gcloud storage ls`
- [ ] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [ ] Task: Measure - User Manual Verification 'Phase S1: The ETL brings the stories, chapters, and chapter questions' (Protocol in workflow.md)

## Phase S2: Stories tab in Read
_Story ref: spec.md#story-s2_

- [ ] Task: Contracts for the story list
    - [ ] `packages/domain/src/stories/contracts.ts`: Zod input (level window, genre, search, page) and output (story cards) for `listPrimaryStories`; export from `packages/domain/src/stories/index.ts`
- [ ] Task: Tests for the story list
    - [ ] `packages/domain/src/__tests__/stories.test.ts`: the level window (raLevel ±1), published only, genre, search, paging; staff see every published story
    - [ ] `lib/__tests__/storage-config.test.ts`: `getStoryImageKey` uses `image ?? id`
    - [ ] `app/[locale]/(student)/student/read/__tests__/read-tabs.test.tsx`: the tab sign, Articles selected by default, the toolbar keeps four tabs
- [ ] Task: Implement the story list
    - [ ] `packages/domain/src/stories/queries.ts`: `listPrimaryStories` (and use the `genre` input, which `listStories` ignores today); rebuild the domain `dist/`
    - [ ] `lib/storage-config.ts`: `getStoryImageKey`, `getStoryImageUrl`
    - [ ] `app/[locale]/(student)/student/read/page.tsx`: the tab sign; `app/[locale]/(student)/student/read/stories/page.tsx`, `loading.tsx`, `error.tsx`
    - [ ] `components/stories/story-shelf.tsx`, `components/stories/story-filters.tsx`; copy keys in `messages/{en,th,cn,tw,vi}.json`
- [ ] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [ ] Task: Measure - User Manual Verification 'Phase S2: Stories tab in Read' (Protocol in workflow.md)

## Phase S3: Story page
_Story ref: spec.md#story-s3_

- [ ] Task: Contract for the story page
    - [ ] `packages/domain/src/stories/contracts.ts`: `getStoryForStudent` output (story, chapters, the finished chapters of the student, characters)
- [ ] Task: Tests for the story page
    - [ ] `packages/domain/src/__tests__/stories.test.ts`: the level window, published only, the finished chapters from `user_activity` (`STORIES_*` types)
    - [ ] `app/[locale]/(student)/student/read/stories/[storyId]/__tests__/story-page.test.tsx`: the summary in the student's language, the chapter list, the Characters sign, 404 outside the window
- [ ] Task: Implement the story page
    - [ ] `packages/domain/src/stories/queries.ts`: `getStoryForStudent`
    - [ ] `app/[locale]/(student)/student/read/stories/[storyId]/page.tsx`, `loading.tsx`; `components/stories/chapter-list.tsx`, `components/stories/story-characters.tsx`
- [ ] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [ ] Task: Measure - User Manual Verification 'Phase S3: Story page' (Protocol in workflow.md)

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

## Phase S7: Old story URLs open the new pages
_Story ref: spec.md#story-s7_

- [ ] Task: Contract for the legacy story id
    - [ ] `packages/domain/src/stories/legacy-id.ts`: `resolveLegacyStoryId` and `resolveLegacyChapter` with Zod input and output, through `primary_legacy_id_map` (the pattern of `packages/domain/src/articles/legacy-id.ts`)
- [ ] Task: Tests for the redirects
    - [ ] `packages/domain/src/__tests__/stories-legacy-id.test.ts`: a known cuid, an unknown cuid, a UUID (mock DB)
    - [ ] `app/[locale]/(student)/student/stories/__tests__/legacy-redirect.test.ts`: the list, the story, and the chapter redirects; 404 for an unknown cuid
- [ ] Task: Implement the redirects
    - [ ] `app/[locale]/(student)/student/stories/[[...path]]/page.tsx`: redirect to `/student/read/stories/...`
    - [ ] `docs/primary-whats-moved.md:24`: stories moved to Read, Stories tab
- [ ] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [ ] Task: Measure - User Manual Verification 'Phase S7: Old story URLs open the new pages' (Protocol in workflow.md)

## Phase A: Acceptance

- [ ] Task: Run the kit of `primary_parity_acceptance_20261011` (`scripts/primary-parity/capture.ts` for each app, then `report.ts`) with `acceptance-pairs.json`; use one student account in both apps; record the XP before and after for AC-4 and AC-5
- [ ] Task: Captures at 375 px and 1280 px, day and night, for the owner look check (AC-7)
- [ ] Task: Add the block of this track to `scripts/primary-parity/cutover-check.mjs` (kit FR-13) for rehearsal 3
- [ ] Task: Write `measure/tracks/primary_parity_stories_20261011/acceptance.md` from the runbook template (kit FR-10), with the owner look check
- [ ] Task: Measure - User Manual Verification 'Phase A: Acceptance' (Protocol in workflow.md)
