# Discovery — Class Books and Teacher Lesson Support (Phase 0)

Date: 2026-10-05. Lane D+E worktree `~/Desktop/rama-worktrees/lane-de`, branch
`primary/lane-de-teacher-books` from `primary-parity-integration` (3e4543100).

## 1. What exists

| Item | Finding |
|---|---|
| Book or series tables | None. `lessons` (content.ts) is a generic `title/content jsonb` table with no rows the app uses for books. `lesson_progress` (progress.ts) stores one row per user and lesson text id, with `assignmentId`/`articleId`. `lesson_records` (stories.ts) stores the 14 app phases of one user and article as jsonb (`phase1`..`phase14`, `{status, elapsedTime}`). None links a class to a book. |
| Assignments | `assignments` has `articleId`, `lessonId` (unused for books), `dueDate`, `type`. Lane C's student home shows the next open assignment until this track supplies the class book. |
| Legacy id map | `primary_legacy_id_map(table_name, legacy_id, new_id uuid)` (migration 0060) maps legacy Prisma cuids to monorepo uuids. The ETL (track `primary_legacy_data_migration_20261004`) fills it; this machine has no ETL data. |
| App lesson flow | 14 app steps (`Lesson.*` messages): 1 Introduction, 2 Preview Vocabulary, 3 First Reading, 4 Vocabulary Collection, 5 Deep Reading, 6 Sentence Collection, 7 Multiple Choice, 8 Short Answer, 9 Vocabulary Flashcards, 10 Vocabulary Matching, 11 Sentence Flashcards, 12 Sentence Activities, 13 Language Questions, 14 Lesson Summary. Route `/student/lesson/[id]` (assignment id). |
| Tutor reads | `article`, `multiple_choice_questions`, `short_answer_questions`, `sentencs_and_words_for_flashcard` through the `tutor_compat` views (0061). `pnpm --filter @reading-advantage/db tutor-read-check` compares shapes and rows with a reference database. |
| Migrations | Latest `0064_primary_student_session_policy`. Lane A (the number owner) is merged and done, so this lane takes `0065`. |

## 2. Workbooks source (`~/Desktop/Workbooks`)

| Item | Finding |
|---|---|
| Lesson packages | `content/primary/<book>/*.json`, one file per lesson, Zod schema `dashboard/lib/lesson-package/schema.ts`. Books: `origins-2` (l01-l14), `origins-3.1` (l01-l11, l13, l14, and `e12.json`, the lesson-12 insert that replaces the duplicate "My Happy Holiday"), `origins-3.2` (p01-p14), `quest-4` (l01-l05 so far). |
| Package shape | `meta` (book, lesson, number, key, title, raLevel, cefrLevel, textType, genre, appType, role, replaces, printed), `text.paragraphs`, `glossary[12]` (word, pos, definition, thai, example), `bank` (10 MCQ with 4 options, answer, evidence; 5 SAQ with answer; 5 LAQ), `print`, `activities` (sentenceStarters, vocabFill, sentenceOrder, sentenceCompletion, writingPrompt, writingFrames), `thai.paragraphs` (English-Thai sentence pairs) and `thai.summary`, `images`, `audio` (article, sentences with times, words, flashcard), `tags`, `approval`, `db`. |
| Question counts | Confirmed in `origins-3.2/p01.json`: 10 MCQ, 5 SAQ, 5 LAQ, 12 glossary words. |
| QR URL pattern | Confirmed in the README and the schema: `meta.key` is `<book>/<n>` (`o3-2/5`), printed as `https://primary.reading-advantage.com/b/o3-2/5`. Book keys: `o2`, `o3-1`, `o3-2`, `q4`. |
| Database ids | Origins 2 and 3.1 were injected into the legacy Primary database on 2026-10-01: `db.legacy.articleId` (cuid), `db.legacy.mcq/saq/laq` ids, `flashcardId`, `contentHash`. Origins 3.2 and Quest 4 have `db: {}` (not injected). Origins 3.2 `meta.replaces` names the old article cuid that the new text replaces in place. |
| Lesson 12 insert | `origins-3.1/e12.json`: `number: 12`, `key: o3-1/12`, "Hello! I Am Tom", injected (`c0mupcv00j0001wqzrvvgqb2y`). |
| Media | `content/primary/<book>/media/<lesson>/` (hero.jpg, article.mp3, words.mp3, sentences.mp3). The legacy injector uploads them to bucket `primary-app-storage` as `images/<id>_n.png`, `audios/articles/<id>.mp3`, `audios/words/<id>.mp3`, `audios/sentences/<id>.mp3`. The app builds URLs with `lib/storage-config.ts` (`getStorageUrl`). This track does not upload media (no deploy or bucket writes, program rule 4): it writes the same relative paths and the bucket objects come with the ETL. |
| Field map | `docs/content-plans/primary-db-field-map.md` v1.3: package to legacy row rules. The monorepo `articles` table has the same Prisma-ported columns (`passage`, `sentences`, `translatedPassage`, `translatedSummary`, `audioUrl`, `audioWordUrl`, `raLevel`, `cefrLevel`, `type`, `genre`, `isPublished`, `isApproved`). The app reads `passage`; `content` is a NOT NULL copy of it. |
| Teacher guide | Structured per step in `dashboard/lib/teacher-manual/i18n/en.ts` and `th.ts` under `teachingNotesContent[1..13]` (`teacherActions`, `teacherLanguage`, `studentActions`, `watchFor`, string arrays). Step titles in `types.ts` `STEP_TITLES`; periods in `PERIOD_MAP`. Long scripted segments in `Teacher guide/step-N.md` and `step-N-th.md` (13 each) with a chat preamble before the first `#` heading; `Teacher guide/Primary/step-N.md` is the short English form. |

## 3. Step mapping (printed 13 steps to the 14 app steps)

| Workbook step | Period | App step(s) |
|---|---|---|
| 1 Before You Read | 1 | 1 Introduction |
| 2 Key Vocabulary | 1 | 2 Preview Vocabulary |
| 3 Read the Article | 1 | 3 First Reading |
| 4 Collect Vocabulary | 1 | 4 Vocabulary Collection |
| 5 Deep Reading Notes | 2 | 5 Deep Reading |
| 6 Collect Sentences | 2 | 6 Sentence Collection |
| 7 Comprehension Check | 2 | 7 Multiple Choice |
| 8 Guided Response | 3 | 8 Short Answer |
| 9 Vocabulary Practice | 3 | 9 Vocabulary Flashcards, 10 Vocabulary Matching |
| 10 Sentence Practice | 3 | 11 Sentence Flashcards, 12 Sentence Activities |
| 11 Guided Writing | 4 | none in the app today (print and AI feedback) |
| 12 Language Questions | 4 | 13 Language Questions |
| 13 Lesson Reflection | 4 | 14 Lesson Summary |

The map lives in code (`@reading-advantage/domain/primary-books`), not in the database.

## 4. Data model (additive, `primary_` prefix, migration 0065)

| Table | Columns | Tenant class |
|---|---|---|
| `primary_book_series` | id, key (unique: `origins`, `quest`), name ("Primary Advantage Origins"), created_at | EXEMPT (catalogue) |
| `primary_books` | id, series_id FK, key (unique: `o3-2`), name ("Primary Advantage Origins 3.2"), ra_level, cefr_level, lesson_count (14), created_at, updated_at | EXEMPT |
| `primary_book_lessons` | id, book_id FK, number, key (unique: `o3-2/5`), title, article_id FK articles (null until linked), legacy_article_id (the package cuid), source_file, package jsonb (glossary, bank, print, activities, thai summary, tags: the answer keys and print set), imported_at, unique (book_id, number) | EXEMPT |
| `primary_lesson_guides` | id, step 1-13, locale (`en`, `th`), title, period 1-4, teacher_actions jsonb, teacher_language jsonb, student_actions jsonb, watch_for jsonb, script_md text, unique (step, locale) | EXEMPT |
| `primary_class_books` | id, school_id FK schools, classroom_id FK, book_id FK, mode (`teacher_led`, `independent`), start_date, current_lesson (1), assigned_by FK users, created_at, updated_at, unique (classroom_id, book_id) | FLAT |
| `primary_class_book_lessons` | id, class_book_id FK, lesson_number, taught_at, steps_done jsonb (int[] of workbook steps the teacher marked), unique (class_book_id, lesson_number) | REFERENTIAL (via class book) |
| `primary_student_lesson_steps` | id, class_book_id FK, student_id FK users, lesson_number, app_step 1-14, status (`not_started`, `in_progress`, `done`), started_at, done_at, seconds, unique (class_book_id, student_id, lesson_number, app_step) | REFERENTIAL |

Rules kept: no change to the Tutor-read tables; new articles are inserted only for packages
without a mapped legacy article (Origins 3.2, Quest 4); the importer links Origins 2 and 3.1
through `primary_legacy_id_map` when the ETL has run, else leaves `article_id` null and reports it.

## 5. Importer

`packages/domain/src/primary-books/` holds the pure mapping (package JSON to rows, Zod-checked)
and the use-cases. `packages/db/scripts/import-lesson-packages.ts` reads a book folder, runs the
mapping, and writes in one transaction per lesson; `--dry-run` prints the report (new, linked,
unchanged, skipped) and writes nothing. Idempotency: upsert on the natural keys (`book.key`,
`lesson.key`); questions and the flashcard row of a new article are replaced in the same
transaction (field map rule Q-ORF-01). Articles that Tutor already reads (mapped legacy ids) are
never updated by this importer.
