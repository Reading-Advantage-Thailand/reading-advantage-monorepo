# Spec: Stories in Read

Track ID: `primary_parity_stories_20261011`. Type: feature. App: `apps/primary-advantage`.
Triage row: STU-04 (owner answer: stories are a tab in Read, "Articles | Stories"; the toolbar
stays at four tabs).

## Overview

Legacy `bfea121` has stories: a story list, a story page with its chapters, and a chapter page with
audio read-along, translation, a word list, and MCQ, SAQ, and LAQ questions. The monorepo has no
story page, and the ETL leaves out the stories, the chapters, and the chapter questions. Students
lose this content at the cutover.

This track adds the stories, the chapters, their questions, and their flashcard rows to the ETL.
It builds the three pages in the RPG skin as a "Stories" tab in Read. The app makes no stories
(shared decision of 2026-10-11: Workbooks and mastery-advantage make all content).

**Sprint goal:** A student opens Read, selects the Stories tab, reads a chapter with the audio, and
answers its questions, with the migrated legacy stories and the legacy XP amounts.

**ETL and runbook:** This track changes `packages/db/src/migrations-data/primary-legacy-import.ts`
and its tests, adds one migration, and adds a required migration to the deploy gate.
`primary_parity_rehearsal3_20261011` collects these changes.

## Track Set

This track is member 6 of the track set [Primary Parity Before the Cutover](../../sets/primary_parity_20261011.md). Depends on: primary_parity_acceptance_20261011. The shared decisions and the start gate in the set overview apply to this track.

## Context (verified 2026-10-11 at integration `ca8869cea`)

Paths are relative to `apps/primary-advantage` unless the path starts with `packages/`, `measure/`,
or `docs/`. "Legacy" is `/home/daniebo/Desktop/primary-advantage` at `bfea121`.

### Legacy behavior

- Pages: `app/[locale]/(student)/student/stories/page.tsx`, `[storieId]/page.tsx`,
  `[storieId]/[chapterNum]/page.tsx`; components in `components/stories/*` and
  `components/stories/questions/*`; 11 route files under `app/api/stories/**` and
  `app/api/flashcard/story-chapter`.
- List (`components/stories/storie-selection.tsx`): search on title or topic, a genre select, cards
  with the cover, level, CEFR, genre, rating, title, and translated summary; 10 for each page.
  Students see published stories in their level window, raLevel ±1
  (`server/controllers/storieController.ts:522-532`).
- Story page: cover, badges, translated summary, and the tabs "Chapters" and "Characters" (from
  `story.characters`). Export and delete show only for SYSTEM.
- Chapter page (`components/stories/chapter-page-content.tsx`, `storie-content.tsx`):
  - "Listen and read along" with play, pause, seek, and speed.
  - The current sentence and word light up. A tap on a word or a sentence seeks (`storie-content.tsx:163-171`).
  - The translation toggle (th, cn, tw, vi), the chapter picture, and the previous and next chapter buttons.
  - The word list and the sentences.
- Questions: MCQ shows 5 random questions of 10, with a timer and a retake; SAQ and LAQ show 1
  random question each, with AI feedback before the submit (`server/models/storieModel.ts:552-557`).
  The LAQ answer needs `user.level * 30` characters at least and 2,000 at most, with 2 feedback
  tries (`components/stories/questions/la-question-content.tsx:41`).
- XP (`server/models/storyQuizModel.ts:76-90`): MC = score × 2 (`UserXpEarned.MCQuestion = 2`,
  `types/enum.ts:92`); SA = the AI score (1 to 5); LA = the sum of the five rubric scores (up to 25).
  Activity types `STORIES_MC_QUESTION`, `STORIES_SA_QUESTION`, `STORIES_LA_QUESTION` with the
  chapter id as the target (`storyQuizController.ts:82,170,266`). A second SAQ or LAQ submit is
  refused (`storyQuizController.ts:160`).
- Legacy defects that this port does not copy:
  - The client grades the MCQ. The answers go to the client (`storieModel.ts:425`).
  - An MC retake deletes the XP log but not `users.xp`, so a student can farm XP (`storyQuizModel.ts:196-205`).
  - `POST /api/stories` lets any signed-in user start a story generation (`app/api/stories/route.ts:36`).
- Flashcards: when MC, SA, and LA are all done, the client posts `/api/flashcard/story-chapter`
  (`hooks/use-auto-save-flashcard.ts:186-189`). The route saves 3 to 5 random new words and all
  sentences of the chapter in the vocabulary and the sentence decks (`server/controllers/flashcardController.ts:77-160`).
  The word list reads the chapter row of `sentencs_and_words_for_flashcard` (`storieModel.ts:445-468`).
- Data (Prisma `prisma/schema.prisma`): `Story` (546-571), `StoryChapter` (573-595, with
  `sentences`, `translatedSentences` (`{th, cn, tw, vi: string[]}`), `audioSentencesUrl`). Chapter
  questions are rows of the article question tables with a nullable `story_chapter_id`
  (lines 232, 248, 263); the flashcard source rows (213) and the flashcard cards (289) have the same FK.
- Files in the bucket: the story and chapter pictures are `images/story/<legacy id>.png`
  (`lib/storage-config.ts:35-40`); the chapter audio is `audios/story/chapter/<chapter id>.mp3`, kept
  without a leading slash in `audioSentencesUrl` (`server/utils/genaretors/audio-generator.ts:484,571`);
  the client falls back to `audios/story/<story id>-<chapter number>.mp3` (`storie-content.tsx:75-77`).

### Monorepo today

- Schema `packages/db/src/schema/stories.ts`: `stories` (line 11) and `chapters` (line 33; the
  triage gave line 32). `chapters` has `sentences`, `words`, `audio_url`, `audio_word_url`, and
  `translated_passage` (jsonb), but no picture key column. The question tables have
  `chapter_id: text` with no FK (`packages/db/src/schema/questions.ts:20,36,46`).
  `sentencs_and_words_for_flashcard.article_id` is NOT NULL and the table has no chapter column
  (`packages/db/src/schema/primary.ts:161-165`). The Tutor view `tutor_compat.sentencs_and_words_for_flashcard`
  reads that table (`packages/db/drizzle/0061_tutor_compat_views.sql:52-60`).
- `packages/domain/src/tenant-registry.ts:404-414` registers the question and story tables as
  REFERENTIAL. `packages/domain/src/stories/queries.ts` (`listStories`, `getStory`) reads them with
  `db.unscoped("stories is a global content catalog with no schoolId")`. No app imports this module;
  it has no Zod contracts, and `listStories` ignores its `genre` input (lines 63-69).
- `user_activity.activity_type` and `xp_logs.activity_type` are text (`packages/db/src/schema/progress.ts:13`,
  `analytics.ts:16`), so the story activity types need no enum change. The app `ActivityType`
  (`types/enum.ts:45-63`) has no `STORIES_*_QUESTION` value.
- The ETL leaves stories out: `DROPPED_TABLES` (`packages/db/src/migrations-data/primary-legacy-import.ts:66-81`,
  entry at line 79) and the chapter skips for MCQ (line 567), SAQ (588), LAQ (600), the flashcard
  source rows (612), and the flashcard cards (755). It imports legacy `STORIES_*` activity rows with the
  legacy chapter cuid as `target_id` (line 703).
- Production counts (`measure/tracks/primary_legacy_data_migration_20261004/etl-run-20261007-production.md:67-70,78`):
  32,960 MCQ, 16,480 SAQ, 16,480 LAQ, 3,296 flashcard source rows, and 5 flashcard cards are story
  chapter rows. No ETL run counted the stories or the chapters. The 284 stories and 2,272 chapters
  of the triage are the April backup counts (`docs/deployment/primary-cutover-migration-spec.md:58`).
  The production copy probably has about 3,296 chapters (10 MCQ for each chapter); Story S1 counts them.
- Read area: `app/[locale]/(student)/student/read/page.tsx` is one page in `<Scene place="library">`
  with filter signs and `ArticleSelect`; it has no tabs. The toolbar tab "read" covers `/student/read`
  and `/student/lesson` (`configs/student-page-config.ts:8`). A static `read/stories` folder wins over
  the dynamic `read/[articleId]` segment.
- Article question pattern to reuse: `actions/question.ts` (`finishQuiz` line 61, `retakeQuiz` 23,
  `getFeedback` 185), `lib/authorization.ts:173-237` (`resolveQuestionXpAward`, the SA and LA caps),
  `grantGpForXp` (`packages/domain/src/primary-avatar/gp.ts:75`), and the feedback functions
  `getSaqFeedback` and `getLaqFeedback` (`server/utils/assistant.ts:23,91`). The evidence loader treats
  the target of `MC_QUESTION`, `SA_QUESTION`, and `LA_QUESTION` as an article id
  (`packages/domain/src/primary-mastery/evidence-sources.ts:35,109-117`), so story answers must use
  the `STORIES_*` types.
- Picture rule for articles (tech debt D10, `measure/tech-debt.md:12`): the ETL writes the legacy cuid
  into `articles.image`, and `getArticleImageKey` uses it (`lib/storage-config.ts:35-52`). The ETL
  gives stories and chapters new UUIDs (`IdMap.ensure`, `primary-legacy-import.ts:339-352`), so the
  story pictures break without the same rule.
- `docs/primary-whats-moved.md:24` says that stories are "removed". This track corrects that row.
- Reading Advantage pattern: `apps/reading-advantage/server/controllers/stories-controller.ts` and
  `stories-question-controller.ts` read the shared tables with raw Drizzle and store chapter questions
  as rows keyed by `chapter_id`. Primary uses the same table layout.

## Design

- **D1 Routes.** `/student/read` gets a tab sign "Articles | Stories". Stories:
  `/student/read/stories`, `/student/read/stories/[storyId]`, and
  `/student/read/stories/[storyId]/[chapterNumber]`. The toolbar keeps four tabs.
- **D2 Places.** The list and the story page use the `library` place
  (`docs/primary-rpg-skin.md` §3); the list shows books on shelves, and a filter is a sign. The
  chapter page follows the reading rule (§2 rule 4): a desk and a frame, and no decoration in the
  text column.
- **D3 Domain.** `packages/domain/src/stories/` gets `contracts.ts` (Zod input and output for each
  query and mutation) and the Primary queries and mutations. Questions go to the client without
  the answers. The server grades the MCQ.
- **D4 XP rules (legacy amounts, server rules).** MC: 2 XP for each correct answer of the 5
  questions. SA: the AI score, 1 to 5. LA: the rubric total, up to 25 (the caps of
  `lib/authorization.ts`). The XP, level, and GP write reuses the XP block of `finishQuiz`. A chapter
  pays the MC XP once: a retake gives new questions and a new score, but no second XP (owner may
  change). SAQ and LAQ take one submit for each chapter, as in legacy. Story answers start no
  evidence job.
- **D5 Pictures and audio.** A migration adds a nullable `image` column to `stories` and `chapters`.
  The ETL writes the legacy cuid there. `getStoryImageKey` and `getChapterImageKey` use
  `image ?? id`, like D10. The ETL copies `audioSentencesUrl` to `chapters.audio_url` as it is; when
  it is null, the ETL writes the legacy fallback key and the report counts these rows.
- **D6 Flashcard rows.** The same migration changes `sentencs_and_words_for_flashcard`: it adds a
  nullable `chapter_id` (text, like the question tables), drops NOT NULL on `article_id`, and adds a
  check that exactly one of the two is set. The Tutor view stays as it is: chapter rows have a null
  `article_id`, as in legacy, and Tutor reads by article.
- **D7 Read-along.** The chapter page uses the passage component that the article page uses.
  `primary_parity_read_along_20261011` owns `components/read-along/read-along-passage.tsx` with the
  props `{ sentences, passage, audioUrl, translations }`. If the read-along track is complete first,
  this track uses that component. If this track runs first, it moves the passage and audio part of
  `components/articles/article-content.tsx` into that component with no change of behavior (tests
  first). The read-along track then improves it for articles and chapters together.
- **D8 Preview.** If `primary_parity_staff_student_view_20261011` is complete, each new write path
  calls its `assertStudentWriter` and each page reads `useStudentView()`. If not, each new write path
  refuses a non-student with 403, and the staff track adds the guard.
- **D9 Level window.** Students see published stories with raLevel ±1 of their level. The rule
  applies on the list, the story page, and the chapter page (legacy checked only the list and the
  story page). Staff in
  preview see every published story.

## Stories

### Story S1: The ETL brings the stories, chapters, and chapter questions
**As a** school admin
**I want** the legacy stories, chapters, chapter questions, flashcard rows, and story activity in the new database
**So that** students keep their stories and their story history after the cutover

**Acceptance Criteria:**
- Given the legacy production copy, When the ETL runs, Then every legacy story and chapter has a row with a new id, a `primary_legacy_id_map` row, and the legacy cuid in `image`.
- Given the chapter rows of `multiple_choice_questions`, `short_answer_questions`, `long_answer_questions`, `sentencs_and_words_for_flashcard`, and `flashcard_cards`, When the ETL runs, Then the report shows them written with the new chapter id and 0 rows skipped as "stories deferred" (2026-10-07 copy: 32,960, 16,480, 16,480, 3,296, and 5 rows).
- Given a legacy `STORIES_*` activity row, When the ETL runs, Then its `target_id` is the new chapter id.
- Given a chapter with `translatedSentences`, When the ETL runs, Then `chapters.translated_passage` holds the same `{th, cn, tw, vi}` arrays.
- Given the ETL runs twice into the same target, When the second run ends, Then no count changes.
- Given the Tutor read check (`packages/db/scripts/tutor-read-check.ts`), When it runs after the ETL, Then the five Tutor reads pass as before.

**Estimate:** L
**Priority:** Must

### Story S2: Stories tab in Read
**As a** student
**I want** a Stories tab next to Articles in Read
**So that** I find the stories at my level without a fifth toolbar tab

**Acceptance Criteria:**
- Given a student on `/student/read`, When the page renders, Then a tab sign shows "Articles" (selected) and "Stories", and the toolbar has four tabs.
- Given a student on the Stories tab, When the list renders, Then it shows the published stories of the student's level window (raLevel ±1) as books on shelves, with cover, title, level, and genre.
- Given a student on the list, When the student picks a genre sign or types a title, Then the list shows only the matching stories, and an empty result shows a short note.
- Given more stories than one shelf page holds, When the student turns the page, Then the next stories show and nothing scrolls without end.

**Estimate:** M
**Priority:** Must

### Story S3: Story page
**As a** student
**I want** a story page with the summary, the chapters, and the characters
**So that** I pick the next chapter to read

**Acceptance Criteria:**
- Given a student opens a story in the level window, When the page renders, Then it shows the cover, the title, the translated summary in the student's language, and the chapter list with the chapters that the student finished.
- Given a story with a story bible, When the student opens the Characters sign, Then the characters show.
- Given a story outside the level window or not published, When a student opens its URL, Then the page shows 404.

**Estimate:** S
**Priority:** Must

### Story S4: Chapter page with read-along
**As a** student
**I want** to read a chapter, listen to it with the words lit up, and see the translation and the word list
**So that** I read a long story in small parts with help

**Acceptance Criteria:**
- Given a chapter with audio, When the student turns on "Listen and read along" and plays, Then the audio plays and the current sentence and word light up with the read-along component of the article page.
- Given a chapter, When the student taps a word in read-along mode, Then the audio plays from that word.
- Given a chapter with translations, When the student picks th, cn, tw, or vi, Then the current sentence shows its translation.
- Given a chapter, When the student opens the word list, Then the words of the chapter show with their meanings and their audio.
- Given chapter 1 of 8, When the student selects "Next chapter", Then chapter 2 opens; the last chapter shows no "Next chapter".
- Given a migrated chapter, When the page renders, Then the chapter picture loads from `images/story/<legacy cuid>.png`.

**Estimate:** L
**Priority:** Must

### Story S5: Chapter questions with XP
**As a** student
**I want** to answer the MCQ, SAQ, and LAQ of a chapter and earn XP
**So that** I check what I understood and my reading counts

**Acceptance Criteria:**
- Given a chapter with 10 MCQ, When the student starts the quiz, Then 5 random questions show, and no answer reaches the client before the submit.
- Given a student who answers 4 of 5 correctly, When the student finishes, Then the server grades the answers, the student earns 8 XP, and one `STORIES_MC_QUESTION` activity with the chapter id saves.
- Given a student who retakes the MCQ, When the student finishes again, Then the new score shows and no second XP saves.
- Given a student who writes an SAQ answer, When the student asks for feedback, Then the AI feedback and a score of 1 to 5 show; When the student submits, Then the score is the XP (5 at most) and a second submit is refused.
- Given an LAQ answer shorter than `level × 30` characters, When the student asks for feedback, Then the page asks for a longer answer; a valid answer gets at most 2 feedback tries, and the submit pays the rubric total (25 at most).
- Given any story answer, When it saves, Then no evidence job starts and the article evidence does not change.

**Estimate:** L
**Priority:** Must

### Story S6: Chapter flashcards
**As a** student
**I want** the words and sentences of a chapter in my flashcards after I finish its questions
**So that** I practise them later

**Acceptance Criteria:**
- Given a student who finished the MCQ, SAQ, and LAQ of a chapter, When the last submit saves, Then 3 to 5 new words and the chapter sentences go to the vocabulary and sentence decks with the chapter id as `source_id`.
- Given a word that is already in the deck, When the save runs, Then no second card saves.
- Given a student who did not finish the three question types, When the chapter page renders, Then no flashcard saves.

**Estimate:** M
**Priority:** Should

### Story S7: Old story URLs open the new pages
**As a** student
**I want** an old story link to open the same story in the new app
**So that** a bookmark or a shared link still works

**Acceptance Criteria:**
- Given `/student/stories`, When a student opens it, Then the app redirects to `/student/read/stories`.
- Given `/student/stories/<legacy story cuid>` or `/student/stories/<legacy story cuid>/<n>`, When a student opens it, Then the app redirects to the new story or chapter through `primary_legacy_id_map`; an unknown cuid shows 404.

**Estimate:** S
**Priority:** Should

## Decisions recorded in Phase 0 (2026-10-12)

The owner decided that the set runs with no stop. The spec defaults stand for D4 (MC XP once for each chapter), D9 (level window on every story page), and the Member Question. Each is: look check pending (owner, async). See `design/decisions.md`. Legacy counts (`primary_legacy_20261011`): 412 stories, 3,296 chapters, 8 chapters for each story (the 284 and 2,272 above are the April counts). Graph condition (D6): chapter question rows and chapter flashcard source rows keep a NULL `article_id`.

## Non-Functional Requirements

- NFR-1: No new dependency. Reuse the RPG skin components, the article question components where
  they fit, the AI feedback functions (the model choice stays where `primary_parity_cleanup_20261011`
  puts it, CNT-02), and `grantGpForXp`.
- NFR-2: New server code logs with `lib/observability/logger.ts`.
- NFR-3: Every exported function has JSDoc. Every domain function has a Zod input and output schema.
- NFR-4: The migration is additive or relaxes a constraint only; it keeps the `tutor_compat` views
  (no `ALTER COLUMN TYPE`, no `DROP COLUMN`). It updates `_journal.json`, `sentinels.ts`, and
  `cloudbuild.yaml --required-migration` (lessons-learned 2026-10-06).
- NFR-5: Copy in en, th, cn, tw, and vi message files.

## Acceptance Criteria (track level, for the side-by-side kit)

Run each check with the kit of `primary_parity_acceptance_20261011` on its matched database copies
(the same school data in both apps), with the same student account in both apps.

- AC-1: Legacy `/student/stories` and new `/student/read/stories`: the same stories show for the
  student's level window.
- AC-2: Legacy `/student/stories/<id>` and new `/student/read/stories/<new id>`: the same title,
  summary, and chapter count.
- AC-3: Legacy and new chapter page of the same chapter: the same text, picture, and audio; the
  highlight follows the audio; the translation shows for th.
- AC-4: The MCQ with 4 of 5 correct: legacy and new both add 8 XP. A retake: legacy adds XP again,
  new adds none (D4).
- AC-5: SAQ and LAQ: feedback shows and the submit adds the score as XP in both apps.
- AC-6: The ETL report of the rehearsal copy shows 0 "stories deferred" skips and the story and
  chapter counts of the legacy copy.
- AC-7: Owner look check of the three pages at 375 px and 1280 px, day and night.

## Out of Scope

- Story generation, story validation, the workbook export, and story delete (legacy routes
  `generate`, `validate`, `export-workbook`, `DELETE`).
- New stories from Workbooks (the Workbooks injector writes articles).
- Story and chapter ratings and `STORIES_READ` or `CHAPTER_READ` activity (legacy never wrote them).
- Story widgets in the student and teacher reports (STU-11, after the cutover).
- Story assignments by a teacher.
- The client-trusted SA and LA score (the same open item as for articles, `measure/tech-debt.md`
  "Game/flashcard/question endpoints trust client-derived XP").
