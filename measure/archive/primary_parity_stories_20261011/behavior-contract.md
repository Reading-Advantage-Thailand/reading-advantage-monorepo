# Behavior contract — primary_parity_stories_20261011

Legacy facts: revision `bfea121`. Paths are in the legacy repository (`apps/primary-advantage` style paths of that repository).
Data counts come from `primary_legacy_20261011` (SELECT only, 2026-10-12).

## 1. Rows and owner decisions

| Row (triage ID) | Short name | Owner decision | Date |
| --- | --- | --- | --- |
| STU-04 | Stories | Stories are a tab in Read: "Articles \| Stories". The toolbar stays at four tabs. | 2026-10-11 |
| (set) | No app-made stories | Workbooks and mastery-advantage make all content. The app makes no stories. | 2026-10-11 |
| (D4) | MC XP once for each chapter | Spec default. Look check pending (owner, async). | 2026-10-12 |
| (D9) | Level window on every story page | Spec default. Look check pending (owner, async). | 2026-10-12 |

## 2. Legacy behavior

| Page or action | Roles | User does | App shows or does | Source (`file:line` at `bfea121`) |
| --- | --- | --- | --- | --- |
| Story list | STUDENT | Opens `/student/stories` | Search on title or topic, a genre select, cards (cover, level, CEFR, genre, rating, title, translated summary), 10 for each page. Students see published stories with raLevel +/- 1. | `components/stories/storie-selection.tsx`; `server/controllers/storieController.ts:522-532` |
| Story page | STUDENT | Opens a story | Cover, badges, translated summary, tabs "Chapters" and "Characters" (from `story.characters`). Export and delete show for SYSTEM only. | `app/[locale]/(student)/student/stories/[storieId]/page.tsx` |
| Chapter page: read-along | STUDENT | Turns on "Listen and read along" | Play, pause, seek, speed. The current sentence and word light up. A tap on a word or a sentence seeks. | `components/stories/chapter-page-content.tsx`; `storie-content.tsx:163-171` |
| Chapter page: other | STUDENT | Reads | Translation toggle (th, cn, tw, vi), chapter picture, previous and next chapter buttons, word list, sentences. | `components/stories/storie-content.tsx:75-77` |
| MCQ | STUDENT | Starts the quiz | 5 random questions of 10, with a timer and a retake. The client grades. The answers go to the client. | `server/models/storieModel.ts:425,552-557` |
| SAQ and LAQ | STUDENT | Writes an answer | 1 random question each. AI feedback before the submit. LAQ needs `user.level * 30` characters at least and 2,000 at most, 2 feedback tries. A second submit is refused. | `components/stories/questions/la-question-content.tsx:41`; `storyQuizController.ts:160` |
| XP | STUDENT | Finishes a question set | MC = score x 2. SA = the AI score (1 to 5). LA = the sum of five rubric scores (up to 25). Activity types `STORIES_MC_QUESTION`, `STORIES_SA_QUESTION`, `STORIES_LA_QUESTION` with the chapter id as target. | `server/models/storyQuizModel.ts:76-90`; `types/enum.ts:92`; `storyQuizController.ts:82,170,266` |
| MC retake | STUDENT | Retakes the MCQ | Legacy deletes the XP log but not `users.xp` (a student can farm XP). | `storyQuizModel.ts:196-205` |
| Flashcards | STUDENT | Finishes MC, SA, and LA | The client posts `/api/flashcard/story-chapter`. The route saves 3 to 5 random new words and all sentences in the vocabulary and sentence decks. | `hooks/use-auto-save-flashcard.ts:186-189`; `server/controllers/flashcardController.ts:77-160` |
| Story generation | any signed-in user | Posts `/api/stories` | Starts a story generation (a defect). | `app/api/stories/route.ts:36` |

## 3. Data read and written

| Item | Kind | Columns or detail | Read or write | Permission check | Source |
| --- | --- | --- | --- | --- | --- |
| Stories | table `stories` | title, summary, translated summary, type, genre, raLevel, cefr, characters, is_published | read | student level window; published only | `storieController.ts:522-532` |
| Chapters | table `story_chapters` | number, title, passage, sentences, translatedSentences, audio_sentences_url | read | same window (legacy checked list and story page only) | `storieModel.ts:445-468` |
| Chapter questions | tables of MCQ, SAQ, LAQ | rows with `story_chapter_id` | read | student | `storieModel.ts:425` |
| Chapter word list | table `sentencs_and_words_for_flashcard` | the chapter row | read | student | `storieModel.ts:445-468` |
| Story XP | side effect | `users.xp`, level, activity row, XP log | write | student | `storyQuizModel.ts:76-90` |
| Chapter flashcards | tables of flashcard decks and cards | 3 to 5 words, all sentences | write | student | `flashcardController.ts:77-160` |
| AI feedback | side effect | SAQ and LAQ feedback | AI call | student | `server/utils/assistant.ts` |
| Pictures and audio | bucket | `images/story/<legacy id>.png`; `audios/story/chapter/<chapter id>.mp3` (no leading slash in `audioSentencesUrl`); fallback `audios/story/<story id>-<chapter number>.mp3` | read | public URL | `lib/storage-config.ts:35-40`; `audio-generator.ts:484,571`; `storie-content.tsx:75-77` |

## 4. New target

- Drizzle tables (and the migration): `stories` and `chapters` get a nullable `image` column. `sentencs_and_words_for_flashcard` gets a nullable `chapter_id` (text), `article_id` becomes nullable, and a check says exactly one of the two is set. One additive migration `packages/db/drizzle/<next>_primary_stories.sql` (0071 was the last on 2026-10-11; check at S1). It keeps the `tutor_compat` views.
- Domain functions (Zod input and output): `packages/domain/src/stories/contracts.ts` with `listPrimaryStories`, `getStoryForStudent`, `getChapterForStudent`, the chapter question query (no answers), `submitChapterMcq`, `retakeChapterMcq`, `submitChapterWritten`; `legacy-id.ts` with `resolveLegacyStoryId` and `resolveLegacyChapter`.
- Permission action for `assertCan`: the student reads and writes with the existing student permission. A non-student write returns 403 (or the preview guard of the staff track, spec D8).
- TenantDB class for each table: `stories` and `chapters` are REFERENTIAL content catalogs (read through `unscoped("stories is a global content catalog with no schoolId")`, as `listStories` does today). The question tables stay REFERENTIAL. `sentencs_and_words_for_flashcard` keeps its class. No new table.
- AI adapter use: SAQ and LAQ feedback through the existing `getSaqFeedback` and `getLaqFeedback`, with a chapter passage source. The model choice stays where CNT-02 puts it.
- RPG skin components: `Scene` (`library`), `Panel`, `Sign`, `Banner`, `rpgButton`, `ReadAlongPassage`, `useReadAlong`, the word list component of the article page.
- Routes (with the locale): `/[locale]/student/read` (tab sign), `/[locale]/student/read/stories`, `/[locale]/student/read/stories/[storyId]`, `/[locale]/student/read/stories/[storyId]/[chapterNumber]`, and redirects from `/[locale]/student/stories/[[...path]]`.

## 5. Differences on purpose

| Difference | Reason | Owner decision and date |
| --- | --- | --- |
| Stories are a tab in Read, not a toolbar tab | The toolbar stays at four tabs | 2026-10-11 |
| The server grades the MCQ; the client gets no answers | Legacy sends the answers to the client | 2026-10-11 (parity by behavior) |
| MC XP once for each chapter (D4) | Legacy retake lets a student farm XP | spec default 2026-10-12; look check pending (owner, async) |
| The level window applies on the chapter page too (D9) | Legacy checked the list and the story page only | spec default 2026-10-12; look check pending (owner, async) |
| No story generation, validation, export, or delete | Content comes from Workbooks and mastery-advantage | 2026-10-11 |
| No evidence job for story answers | Evidence reads `MC_QUESTION` targets as article ids | spec |
| Old story URLs redirect to the new pages | Bookmarks keep working | spec S7 |

## 6. Acceptance rows

Pairs are in `acceptance-pairs.json`. Legacy ids are raw. The new path uses `{map:stories:<legacy id>}`; the ETL adds the `stories` map table (S1). The chapter path uses the chapter number, so it needs no chapter map.

| Pair id | Legacy page | New page | Role | Observable behavior | Data check | Result |
| --- | --- | --- | --- | --- | --- | --- |
| ST-A1 | `/student/stories` | `/student/read/stories` | STUDENT | The same stories show for the level window (AC-1) | S1 and S2 of `story-data-checks.sql` | batch capture (orchestrator) |
| ST-A2 | `/student/stories/<id>` | `/student/read/stories/<new id>` | STUDENT | Same title, summary, and chapter count (AC-2) | S3 | batch capture (orchestrator) |
| ST-A3 | `/student/stories/<id>/1` | `/student/read/stories/<new id>/1` | STUDENT | Same text, picture, and audio; the highlight follows the audio; th translation (AC-3) | S4 | batch capture (orchestrator) |
| ST-A4 | the same chapter | the same chapter | STUDENT | MCQ 4 of 5 adds 8 XP; a retake adds XP in legacy and none in new (AC-4) | S5 | batch capture (orchestrator) |
| ST-A5 | the same chapter | the same chapter | STUDENT | SAQ and LAQ feedback shows and the submit adds the score as XP (AC-5) | S5 | batch capture (orchestrator) |
| ST-A6 | `/student/stories/<id>` of the last chapter | the same | STUDENT | Last chapter has no "Next chapter" | none | batch capture (orchestrator) |
| ST-A7 | `/student/stories/<id>/1` (old URL) | redirect to the new chapter | STUDENT | The old URL opens the new chapter | S3 | batch capture (orchestrator) |

## 7. ETL and runbook changes

Counts of the legacy copy `primary_legacy_20261011` (2026-10-12): 412 stories (412 published), 3,296 chapters, 8 chapters for each story (412 stories x 8), 0 chapters without audio key, 0 without `translatedSentences`, 0 without `sentences`. Story chapter rows: 32,960 MCQ (3,296 chapters, 10 each), 16,480 SAQ, 16,480 LAQ, 3,296 flashcard source rows, 5 flashcard cards. Legacy `STORIES_*` activity rows: 9 MC, 3 SA, 2 LA. Raw level counts of stories: levels 1 to 15 (levels 2, 5, 6, 8 have the most). The triage count of 284 stories and 2,272 chapters is the April backup count and is out of date.

Changes for `primary_parity_rehearsal3_20261011`:

1. Migration `<next>_primary_stories.sql` (additive or relaxing only; no `ALTER COLUMN TYPE`, no `DROP COLUMN`): `stories.image`, `chapters.image` (nullable text), `sentencs_and_words_for_flashcard.chapter_id` (nullable text), `article_id` DROP NOT NULL, and a check that exactly one of `article_id` and `chapter_id` is set. Update `_journal.json`, `sentinels.ts`, and `--required-migration` in `cloudbuild.yaml`.
2. ETL (`packages/db/src/migrations-data/primary-legacy-import.ts`): remove the stories entry of `DROPPED_TABLES`. Add map tables `stories` and `story_chapters`. Load stories and chapters before the questions, flashcard rows, and `user_activities`. Write the legacy cuid to `image`. Map `characters` to `story_bible`, `is_published` to `is_public`, `translatedSentences` to `translated_passage`, `audioSentencesUrl` to `audio_url` (fallback key when null; the report counts these rows).
3. Graph condition (Graph session, spec D6): chapter question rows and chapter flashcard source rows get a NULL `article_id`. The chapter id goes in `chapter_id` (flashcard source rows) and in the existing `chapter_id` column (question rows). No chapter id or story id goes into `article_id`. The MCQ, SAQ, and LAQ rows that belong to a chapter keep `article_id` NULL. The Tutor view reads by article and does not see chapter rows.
4. ETL targets: chapter MCQ, SAQ, LAQ, flashcard source rows, and flashcard cards get the new chapter id. `STORIES_*` activity targets map to the new chapter id. Article targets stay as they are. The report shows 0 "stories deferred" skips. A second run changes no count.
5. Runbook and cutover check: the cutover check gets a block for the story and chapter counts (412 and 3,296 on this copy), the chapter question counts, and the NULL `article_id` rule. `packages/db/scripts/tutor-read-check.ts` runs after the ETL.
6. Docs: `docs/primary-whats-moved.md:24` says stories moved to Read (S7).
