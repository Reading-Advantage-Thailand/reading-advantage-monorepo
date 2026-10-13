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
    - [x] Write `measure/tracks/primary_parity_stories_20261011/acceptance-pairs.json` with the pairs of the spec acceptance criteria (kit FR-7); it parses with `PairList` (9 pairs: ST-A1..ST-A9, one STUDENT account; XP-record steps on ST-A3..ST-A5)
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

## Phase S3: Story page [checkpoint: fff917b8a]
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

- [x] Task: Contract for the chapter page
    - [x] `packages/domain/src/stories/contracts.ts`: `getChapterForStudent` output (chapter, sentences, translations, audio key, picture key, the word list row, the previous and next chapter numbers) (0194b1b2d; picture key and URL in c44403a17)
    - [x] Read-along contract confirmed with `primary_parity_read_along_20261011` (spec D7 deviation, orchestrator ruling 2026-10-12): spec D7 named props `{ sentences, passage, audioUrl, translations }`, but the built `components/read-along/read-along-passage.tsx` takes host-owned audio props `{ sentences, passage, position, active, ... }` (the host owns the audio element and the player). Ruling: do NOT fork or rewrite the shared component; the chapter page reuses the exact article-page integration (a chapter host with the audio element, `useReadAlong`, `ReadAlongPassage`, and `ReadAlongPlayer`, see `components/articles/article-content.tsx`). Plan-review S4 already flagged this mismatch.
- [x] Task: Tests for the chapter page
    - [x] `packages/domain/src/__tests__/stories.test.ts`: the level window, the chapter by story and number, the word list from the chapter row of `sentencs_and_words_for_flashcard` (0194b1b2d; 30 of 30 green)
    - [x] `lib/__tests__/storage-config.test.ts`: `getChapterImageKey`, the chapter audio URL from `audio_url` (`getAudioUrl`; c44403a17; 12 of 12 green)
    - [x] Read-along parity (15db377ca): this track creates no read-along component (the read-along track owns it), so no new `read-along-passage.test.tsx`; instead `components/stories/__tests__/chapter-content.behavior.test.tsx` proves the same host behavior as `components/articles/__tests__/article-content-highlight.behavior.test.tsx` (one player, word light-up, word-tap seek, translation, picture; 5 of 5 green)
    - [x] `app/[locale]/(student)/student/read/stories/[storyId]/[chapterNumber]/__tests__/chapter-page.test.tsx` (15db377ca; 6 of 6 green): the title, the chapter number, the passage, the player, the word list button, the question section, previous and next (none past the last), 404 outside the window and for a bad number
- [x] Task: Implement the chapter page
    - [x] `packages/domain/src/stories/queries.ts`: `getChapterForStudent` (0194b1b2d)
    - [x] `components/stories/chapter-content.tsx` (15db377ca): the chapter read-along host reusing the shared `ReadAlongPassage` with the article-page pattern; no behavior change to the shared component
    - [x] `app/[locale]/(student)/student/read/stories/[storyId]/[chapterNumber]/page.tsx`, `loading.tsx`, `error.tsx` (15db377ca); reuses `components/articles/word-list.tsx` with the chapter id (the chapter save path is S6); the page writes nothing (no `STORIES_*` row on open, as the S3 story page)
- [ ] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [ ] Task: Measure - User Manual Verification 'Phase S4: Chapter page with read-along' (Protocol in workflow.md)

## Phase S5: Chapter questions with XP
_Story ref: spec.md#story-s5_

- [x] Task: Contracts for the chapter questions
    - [x] `packages/domain/src/stories/contracts.ts`: the question output without answers; `submitChapterMcq`, `retakeChapterMcq`, `submitChapterWritten` (SA and LA) inputs and outputs (naming: `gradeChapterMcq` is the MCQ submit — a pure server grade, the caller persists the activity row and enforces once-only XP; `resolveChapterWritten` is the written submit; `retakeChapterMcq` matches)
    - [x] `types/enum.ts`: `STORIES_MC_QUESTION`, `STORIES_SA_QUESTION`, `STORIES_LA_QUESTION` (text values; no database enum change; `XP_AWARD_BY_ACTIVITY` entries mirror the article question awards)
- [x] Task: Tests for grading and XP
    - [x] `packages/domain/src/__tests__/stories-questions.test.ts`: 5 random of 10 MCQ, no answer in the output; the server grade; 2 XP for each correct answer; the XP once for each chapter after a retake (`retakeChapterMcq` `xpAvailable`); SA up to 5 and LA up to 25; one SA and one LA submit for each chapter; a non-student is refused (role guard `progress:record`; spec D8 preview guard stays with the staff track)
    - [x] `actions/__tests__/story-question.test.ts` (4b4b998aa; 11 of 11 green): the XP, level, and GP write reuses the `finishQuiz` block (`awardQuestionXp`); first MCQ submit pays, resubmit shows the new score with 0 XP; second written submit refused; no evidence job starts (the actions never call it)
    - [x] `actions/__tests__/finish-quiz-evidence.test.ts` and `actions/__tests__/user-activity-xp.test.ts`: the article `finishQuiz` behavior stays the same after the XP block moves (regression) — both suites pass unchanged through the shared helper (46 of 46 green with `preview-write-guard`)
    - [x] `server/utils/__tests__/assistant-chapter.test.ts` (4b4b998aa; 4 of 4 green): the SAQ and LAQ feedback read the chapter passage for a chapter source (`readFeedbackSource`; `server/utils/assistant.ts` untouched otherwise, `getChapterWrittenQuestion` feeds it)
- [x] Task: Implement the chapter questions
    - [x] `packages/domain/src/stories/mutations.ts`: grading and the activity record (`gradeChapterMcq`, `retakeChapterMcq` with `xpAvailable`, `resolveChapterWritten` with one-submit-per-chapter; callers write the `STORIES_*` rows and pay XP); `packages/domain/src/stories/queries.ts`: the chapter questions (`getChapterQuestions`, `getChapterWrittenQuestion`)
    - [x] The XP, level, and GP block of `actions/question.ts` `finishQuiz` moved into `server/xp/award-question-xp.ts` (4b4b998aa); called from `finishQuiz` (with the article log and the evidence job as before) and from `actions/story-question.ts` (no article log, no evidence job)
    - [x] `server/utils/assistant.ts`: a passage source (article or chapter) for `getSaqFeedback` and `getLaqFeedback` (4b4b998aa; `readFeedbackSource`)
    - [x] Question UI on the chapter page (4b4b998aa; deviation: dedicated `components/stories/chapter-quiz.tsx` + `chapter-questions.tsx` instead of reusing `components/articles/questions/*` with a chapter source prop — the article cards are bound to the article model and quiz contexts, so threading a chapter source through them is the larger change; the chapter panels call `actions/story-question.ts` directly): 5 MCQ with done/`xpAvailable` states, SAQ/LAQ boxes with the LA minimum (`level x 30`) and the 2000-char cap, 2 LAQ feedback tries, retake per the domain contract; staff preview disables writes through `usePreviewSave`
- [x] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`) — done: `generate.sh` clean; `doctor.sh` fails only on pre-existing A13 (stale archived dir `agents_md_audit_science_advantage_20260603`, untouched by this track)
- [ ] Task: Measure - User Manual Verification 'Phase S5: Chapter questions with XP' (Protocol in workflow.md)

## Phase S6: Chapter flashcards
_Story ref: spec.md#story-s6_

- [x] Task: Contract for the chapter flashcard save
    - [x] `actions/flashcard.ts`: a chapter source for the save of `saveArticleToFlashcard` (8bf4a3d6b; `saveChapterToFlashcard` with a Zod `chapterId` input, after `saveArticleToFlashcard`), with a Zod input
- [x] Task: Tests for the chapter flashcard save
    - [x] `actions/__tests__/flashcard-chapter.test.ts` (60a5d2107 red, 8bf4a3d6b green; 5 of 5): 3 to 5 new words and the sentences after all three question types; no duplicate card; no save before the three are done; `source_id` is the chapter id
- [x] Task: Implement the chapter flashcard save
    - [x] `actions/flashcard.ts`: the chapter save (8bf4a3d6b; `saveChapterToFlashcard`: completeness check on the three `STORIES_*` rows, chapter snapshot rows with NULL `article_id` per D6, 3 to 5 random new words case-insensitive like legacy, all sentences, `source_id` = chapter id through `saveFlashcard`); call it after the last submit in `actions/story-question.ts` (first-time saves only; `story-question.test.ts` 11 of 11 green with the call assertions)
- [x] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`) — done: `generate.sh` clean; `doctor.sh` fails only on pre-existing A13 (stale archived dir `agents_md_audit_science_advantage_20260603`, untouched by this track)
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
- [x] Task: Add the block of this track to `scripts/primary-parity/cutover-check.mjs` (kit FR-13) for rehearsal 3
    - [x] `scripts/primary-parity/stories-checks.mjs` (pure judges) + `__tests__/stories-checks.test.mjs` (7 tests); the block opens the old list URL (redirect), the Stories tab, the first story, the old story and chapter URLs through the picture key, a chapter, and an unknown cuid; `STORIES_CHECK=off` skips it (kit suite 100 green) (4e933d56f)
- [x] Task: Write `measure/tracks/primary_parity_stories_20261011/acceptance.md` from the runbook template (kit FR-10), with the owner look check
    - [x] AC rows marked proven-by-tests vs pending-batch; AC-6 proven locally (`etl-run.md`), Cloud Build rerun pending; AC-7 pending captures and owner (pairs and steps: 75c2795bf)
- [ ] Task: Measure - User Manual Verification 'Phase A: Acceptance' (Protocol in workflow.md)

## Phase: Review Fixes 2026-10-13

- [x] Task: M-12 chapter host has the 4 read-along fixes (ported, no shared hook) 72863cd04
- [x] Task: Low flashcard.ts console.error -> logger; story-question returns 0 XP unless saved a6e865ea1
- [x] Task: Low stories list trims q 96bc15cf2
- [x] Task: Low SAQ and LAQ random; Done needs MC+SA+LA (spec S3); chapters.is_public filter; level-up keeps a started story open 6c7b60658
- [x] Task: Low feedback throws when the story has no cefrLevel: `chapter.cefrLevel ?? "A1"` in `readFeedbackSource` (lane A, A3) 221c8b543
- [x] Task: Low LAQ limit of 2 tries on the server: parity default. No existing limiter fits without a schema change; the limit stays client-only.
