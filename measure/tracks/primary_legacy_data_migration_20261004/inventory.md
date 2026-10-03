# Inventory: Primary legacy data migration (Phase 0)

Track: primary_legacy_data_migration_20261004. Read only research. Date: 2026-10-04.

Sources used (short names):

- LP = `~/Desktop/primary-advantage/prisma/schema.prisma` (legacy Prisma schema, 905 lines).
- SPEC = `docs/deployment/primary-cutover-migration-spec.md` v1.2.
- SH = `packages/db/src/schema/*.ts` (shared Drizzle schema).
- TUT = `~/Desktop/tutor-advantage/services/learning-service/src/services/PrimaryAdvantageDB.ts`.
- DUMP = `~/Desktop/reading-advantage-monorepo/Backup_Primary_2026-04-29.sql` (April 2026 legacy dump, read with grep and awk only).

Rule: legacy columns without `@map` in LP have camelCase physical names (for example `"createdAt"`, `"cefrLevel"`, `"xpEarned"`). Proof: DUMP:63744 (users), DUMP:892-899 (xp_logs). The ETL must quote these names.

## 1. Summary

- Legacy models: 40 (LP). Plus one implicit join table `_UserActivityToXPLogs` (110 rows, DUMP:236).
- Direct: 15. Needs transform: 18. No target: 7 (sessions, verifications, validation_runs, logs, contact_messages, ai_providers, ai_task_configs). Total 40. The implicit join table is a further no-target item.
- SPEC section 6 lists six "no known target" tables. Four of them have a target in SH after all: `assignment_students`, `story_chapters`, `user_activities`, `user_lesson_progress` (see section 3). Only `logs` and `verifications` have no target.
- SPEC section 4 omits these legacy tables: `roles`, `school_admins`, `leaderboards`, `game_rankings`, `ai_insights`, `licenses` (count 1 only in DUMP), `logs`, `_UserActivityToXPLogs`. See section 5.

## 2. Table map

Row counts come from SPEC:48-60 where listed. Counts marked (DUMP) come from my count of `COPY` blocks in DUMP. Production is larger.

Class: D = direct (same shape, key remap only). T = needs transform. N = no target.

### 2.1 Identity and tenancy

| Legacy table (LP line) | Key | Rows | Target (SH) | Class | Column notes |
|---|---|---|---|---|---|
| `users` (LP:12-52) | text cuid, kept (SPEC D2, SPEC:69) | 607 | `users` (users.ts:26-55) | T | `username` and `display_username` NOT NULL UNIQUE, no legacy source: D6 `lower(email)` and `email` (SPEC:73). `role` text to enum `role` (users.ts:5): student/teacher/admin/system map one to one; the 7 `user` rows need a manual role (SPEC D9). `cefr_level`: legacy `cefrLevel` nullable, default `A0-`; target NOT NULL default `A1-`. Copy as is (SPEC:88). DUMP has 602 `A0-`, and one each of `A0`, `A1`, `A2`, `B1`, `B2`. `email_verified`: Boolean to timestamp (use `createdAt` when true, else NULL). `school_id`: text cuid to uuid via map. `password`: copy only per account rule below. Dropped, no target column: `lastActiveAt`, `banned`, `banReason`, `banExpires`, `roleId`. Target-only columns with no legacy source: `github_username`, `license_id`, `expired_date`, `grade_level`. Email is NOT NULL in legacy and UNIQUE (LP:15); the target `email` has no unique index (users.ts:33), so the ETL must check duplicates by `lower(email)` before it builds `username`. DUMP shows zero null emails. |
| `accounts` (LP:54-71) | text cuid, kept | 26 (18 credential, 8 google) | `accounts` (users.ts:59-74) | T | Legacy `account_id` has no target column: drop. Legacy `scope` and `id_token` have no target: drop. Do not copy Google tokens (SPEC:89). Target has unique `(user_id, provider_id)` (users.ts:73). Credential `password`: prefer `accounts.password`, else build from `users.password` (SPEC:89). Hash formats: 14 bcrypt, 4 scrypt (SPEC:62). SPEC D7 says no live teacher has a scrypt or bcrypt hash. Decision needed: copy the 8 Google rows or skip them (D8 says no Google sign-in). Proposal: skip the 8 Google rows and report them. |
| `sessions` (LP:73-85) | text cuid | 1,648 | `sessions` | N | Do not move (SPEC:94). Target also needs `token_hash` NOT NULL (users.ts:81), which has no legacy source. |
| `verifications` (LP:87-96) | text cuid | 0 (DUMP) | `verification_tokens` (primary.ts:83) has a different shape (`identifier`, `token`, `expires`) | N | Drop, because SPEC:94 says do not move it and DUMP holds 0 rows. |
| `roles` (LP:98-104) | text cuid | 5 (DUMP) | `roles` (primary.ts:117-122) | D | `id` text to uuid via map. Only `name` is copied. Target `name` is not unique. |
| (`users.role_id` relation) | n/a | unknown | `user_roles` (primary.ts:98) | N | Legacy users use `role` text. Proposal: do not fill `user_roles`; use `users.role`. Unknown whether any legacy row has `role_id` set: DUMP user COPY column 15 not counted. |
| `schools` (LP:369-384) | text cuid | 4 | `schools` (users.ts:9-21) | D | `contact_name`, `contact_email`, `owner_id` exist in target. `country` has a default. `owner_id` stays text (a user id). |
| `school_admins` (LP:404-414) | text cuid | 3 (DUMP) | `school_admins` (primary.ts:208) | D | Remap `school_id` (uuid) and `user_id` (text kept). Not in SPEC:50-60. |
| `licenses` (LP:386-402) | text cuid | 1 (DUMP) | `licenses` (licenses.ts:8-31) | T | Target `school_name` NOT NULL has no legacy source: take it from the school row. `subscription` enum has the same values (primary.ts:70). `max_users`, `start_date`, `expiry_date`, `status`, `name`, `description` map one to one. `license_type`, `used_licenses`, `feature_flags`, `expires_at` have no legacy source (defaults). SPEC:82 puts licenses in the order. Users do not link to a license in legacy (no `license_id` on LP users). |
| `leaderboards` (LP:535-544) | text cuid | 3 (DUMP) | `leaderboards` (primary.ts:227) | D | `details` JSON copied. Snapshot data; optional. |

### 2.2 Classes

| Legacy table | Key | Rows | Target | Class | Column notes |
|---|---|---|---|---|---|
| `classrooms` (LP:340-356) | text cuid | 31 | `classrooms` (classrooms.ts:7-23) | T | `teacher_id` NOT NULL has no direct source: first row in `classroom_teachers`, else the school admin, else report (SPEC:90). `classCode` to `class_code`: legacy `@unique` and nullable (LP:343), same in target. Legacy `codeExpiresAt` has no `@map`, so the physical name is camelCase `"codeExpiresAt"` (DUMP:3309); target is `code_expires_at`. `grade`: legacy text, target integer: cast, and report non-numeric values (unknown which values exist). `password_students` copies as is. `archived` default false. `created_by` NULL. |
| `classroom_students` (LP:358-367) | text cuid | 583 | `classroom_students` (classrooms.ts:25-36) | D | `studentId`, `classroomId` physical names are camelCase in legacy. Remap `classroom_id` to uuid. `joined_at` has no source: use now. |
| `classroom_teachers` (LP:416-426) | text cuid | 18 | `classroom_teachers` (classrooms.ts:38-48) | D | `userId` becomes `teacher_id`. `role` default `member`. |

### 2.3 Content

| Legacy table | Key | Rows | Target | Class | Column notes |
|---|---|---|---|---|---|
| `article` (LP:137-179) | text cuid | 174 (24 published in DUMP) | `articles` (content.ts:7-41) | T | `passage` to `passage`, and also to `content` (NOT NULL, no other source, content.ts:10). `is_published`, `is_approved`, `is_draft` exist in target (content.ts:34-36). Target also has a second flag `published` (content.ts:16) and `is_public` (content.ts:32): the ETL must set `published = is_published` or the app and the view disagree. Unknown which flag the monorepo reads. `ra_level` to `ra_level`; `level` (target integer) can copy `ra_level`. `rating` Float to real. `image_description` NOT NULL in legacy, nullable in target. `translated_passage`, `translated_summary`, `sentences`, `words`: jsonb both. `author_id` references `users.id` (content.ts:31): set NULL when the user is missing. No target column for `validation_status`, `validated_at`, `repair_attempts`, `last_validation_issues` (LP:164-167). The April DUMP does not have these columns (DUMP:1413 header), so production may. Fix-up for Origins 3.1: SPEC:92. |
| `multiple_choice_questions` (LP:221-237) | text cuid | 24,460 | `multiple_choice_questions` (questions.ts:7-22) | T | `options` text[] to jsonb array. `correct_answer` integer NOT NULL: index of `answer` in `options`; skip and report no match (SPEC:91). Keep `answer` text too (questions.ts:17). `textualEvidence` (camelCase) to `textual_evidence`. `explanation` NULL. `order`: no source; use creation order. `article_id` to uuid via map. DUMP: 22,720 of 24,460 rows have `story_chapter_id` set. Only about 1,740 belong to articles. See risk R1. Chapter rows go to `chapter_id` (text, no FK, questions.ts:19). |
| `short_answer_questions` (LP:239-253) | text cuid | 12,230 | `short_answer_questions` (questions.ts:24-37) | T | `answer` to `answer` (keep) and to `sample_answer`. `rubric` NULL. Same chapter split as MCQ. |
| `long_answer_questions` (LP:255-268) | text cuid | 12,218 | `long_answer_questions` (questions.ts:39-47) | D | `article_id` remap. Chapter rows go to `chapter_id`. |
| `sentencs_and_words_for_flashcard` (LP:203-219) | text cuid | 2,446 | `sentencs_and_words_for_flashcard` (primary.ts:158-169) | T | Target `article_id` is NOT NULL (primary.ts:160); legacy is nullable with `story_chapter_id` as the alternative (LP:211-214). 2,446 = 174 + 2,272 (inference, matches the 2,272 chapters): about 2,272 rows belong to chapters and cannot load as is. Target has no `story_chapter_id`. Proposal: load article rows only; report chapter rows as skipped, unless the stories decision below loads chapters. |
| `stories` (LP:546-571) | text cuid | 284 | `stories` (stories.ts:11-29) | T | `subGenre` to `subgenre`. `characters` Json to `story_bible` (jsonb). `topic`, `is_published`, `validation_status`, `validated_at`, `repair_attempts`, `last_validation_issues`: no target column. `imageDescription` NOT NULL in legacy. `is_public` NOT NULL in target: set from `is_published`. `average_rating`, `author_id`: no source. |
| `story_chapters` (LP:573-595) | text cuid | 2,272 | `chapters` (stories.ts:33-63) | T | SPEC section 6 says no target: target exists under another name. Physical names `"storyId"`, `"chapterNumber"` (DUMP:796-808). `audio_sentences_url` to `audio_url` (inference: the audio of the sentences; unknown if correct). `translatedSentences`: no target column (drop or store in `translated_passage`; decision needed). `passage` copies. `storyId` to uuid via map. Unique `(story_id, chapter_number)` (stories.ts:62). |
| `validation_runs` (LP:597-613) | text cuid | unknown (not in DUMP) | none in SH | N | Drop, because it is operational data for a cron validator. Not in the April DUMP. |

### 2.4 Learning activity

| Legacy table | Key | Rows | Target | Class | Column notes |
|---|---|---|---|---|---|
| `article_activity_logs` (LP:181-201) | text cuid | 335 | `article_activity_logs` (primary.ts:132-152) | D | All booleans match. `article_id` to uuid via map. Target has no unique `(user_id, article_id)`. |
| `assignments` (LP:428-446) | text cuid | 14 | `assignments` (content.ts:57-75) | T | `name` to `title` (NOT NULL; fall back to article title). `type` NOT NULL, no source: use a fixed `article`. `teacherName` to `teacher_name`. `due_date` NOT NULL to nullable: fine. `classroom_id`, `article_id` via map. |
| `assignment_students` (LP:448-463) | text cuid | 336 | `student_assignments` (content.ts:77-91) | T | SPEC says no target: target exists under another name. `status` enum (NOT_STARTED, IN_PROGRESS, COMPLETED) to text. `completed` NOT NULL = (status = COMPLETED). `score`, `started_at`, `completed_at` map. Unique `(assignment_id, student_id)` matches (LP:461). |
| `assignment_notifications` (LP:771-787) | text cuid | 0 (DUMP) | `assignment_notifications` (stories.ts:173) | D | Remap `assignment_id`. Empty in April. |
| `user_lesson_progress` (LP:517-533) | text cuid | 238 | `lesson_progress` (progress.ts:84-106) | T | SPEC says no target: target exists. `lesson_id` NOT NULL text: use the old article cuid or the new uuid as text (decision needed; Origins links use cuids). Unique `(user_id, lesson_id)` (progress.ts:105). DUMP has 15 duplicate `(user_id, article_id)` pairs in 238 rows, so the ETL must merge them (keep the highest progress). `status` NOT NULL default: derive from `isCompleted`. `timeSpent`, `isCompleted` camelCase physical names. `score` has no target column: drop or report. |
| `user_activities` (LP:120-135) | text cuid | 1,613 | `user_activity` (progress.ts:8-25) | T | SPEC says no target: target is singular `user_activity`. `"activityType"` enum to text. `xp_earned` NOT NULL default 0: no direct source. Unique `(user_id, activity_type, target_id)` (progress.ts:24) but legacy only has an index (LP:133): DUMP shows 243 duplicates of 1,613 rows (about; computed on exact key). The ETL must dedupe and report. `metadata` NULL. |
| `xp_logs` (LP:106-118) | text cuid | 1,640 | `xp_logs` (analytics.ts:9-26) | T | Target `activity_id` NOT NULL (analytics.ts:15); legacy nullable. DUMP: 110 of about 1,633 rows have a null `activityId`. Target unique `(user_id, activity_id)` (analytics.ts:25). The ETL needs a rule (for example `legacy:<id>` as `activity_id`) or it skips and reports 110 rows. Enum `ActivityType` to text: values such as `STORIES_CHAPTER_READ`, `RUNE_MATCH` fall outside the shared `activity_type` enum (primary.ts:34-52), but `xp_logs.activity_type` is text, so no cast is needed. |
| `_UserActivityToXPLogs` (implicit, DUMP:236) | n/a | 110 (DUMP) | none | N | Drop. Link table between user activity and XP rows. Target has no such link. |
| `flashcard_decks` (LP:270-282) | text cuid | 310 | `flashcard_decks` (flashcards.ts:6-17) | T | `name` NOT NULL in target, nullable in legacy: fall back to the type. `type` enum to text; target comment says lowercase (flashcards.ts:12), the app writes `VOCABULARY` (stories? unknown). Check the app before the ETL. |
| `flashcard_cards` (LP:284-317) | text cuid | 2,398 | `flashcard_cards` (flashcards.ts:19-29) | T (schema gap) | Target has only `front`, `back`, `source_id`, `order`. Legacy has FSRS fields (`due`, `stability`, `difficulty`, `reps`, `lapses`, `state`, `last_review`, and more), `audio_url`, `start_time`, `end_time`, `word`, `definition`, `sentence`, `translation`, `context`. The monorepo app persists only the target columns (`actions/flashcard.ts:198`, and `flashcard-schema-contract.test.ts` header). Proposal: `front` = `word` or `sentence`; `back` = `definition` or `translation` as JSON text; `source_id` = new article id as text. FSRS state and audio timing are lost unless a new migration adds columns. This needs a decision from Daniel before rehearsal. The `shared-partial columns` note at primary.ts:13-16 says FSRS columns were deliberately not ported. Story-chapter cards (`story_chapter_id`) have no target column. |
| `card_reviews` (LP:319-328) | text cuid | 372 | `card_reviews` (primary.ts:177) | D | Direct if cards load. Remap `card_id`. |
| `cloze_test_games` (LP:330-338) | text cuid | 0 (DUMP) | `cloze_test_games` (primary.ts:192) | D | Empty. |
| `learning_goals` (LP:712-738) | text cuid | 0 (DUMP) | `learning_goals` (analytics.ts:167-188) | D | Enums to text. Empty in April. |
| `goal_milestones` (LP:740-753) | text cuid | 0 (DUMP) | `goal_milestones` (analytics.ts:192) | D | Empty. |
| `goal_progress_logs` (LP:755-769) | text cuid | 0 (DUMP) | `goal_progress_logs` (analytics.ts:207) | D | Empty. |
| `game_rankings` (LP:819-833) | text cuid | 5 (DUMP) | `game_rankings` (analytics.ts:114-126) | D | Enum to text. Table is marked legacy in the target (analytics.ts:110-112). |
| `ai_insights` (LP:677-710) | text cuid | 280 (DUMP) | `ai_insights` (analytics.ts:130-150) | T | `title` and `description` are `Json?` in legacy (LP:682-683) but text NOT NULL in target: stringify or pick the English key; skip and report null rows. `classroom_id`, `license_id` are text in target: store the new uuid as text or the old cuid (decision needed). |

### 2.5 Other

| Legacy table | Key | Rows | Target | Class | Proposal |
|---|---|---|---|---|---|
| `logs` (LP:789-802) | text cuid | 82 (DUMP) | none | N | Drop, because it holds operational service logs, not user data. |
| `contact_messages` (LP:888-905) | text cuid | unknown (not in DUMP) | none in SH | N | Open question. Proposal: export to a file for the sales team, and do not load. Needs an owner decision. |
| `ai_providers` (LP:847-859) | text cuid | unknown (not in DUMP) | none | N | Drop, because it is AI admin configuration. Check that the monorepo has its own AI adapter config. |
| `ai_task_configs` (LP:861-873) | text cuid | unknown (not in DUMP) | none | N | Same as `ai_providers`. |

Counts by class (40 models, excluding the implicit join table):

- D (15): roles, schools, school_admins, leaderboards, classroom_students, classroom_teachers, long_answer_questions, article_activity_logs, assignment_notifications, card_reviews, cloze_test_games, learning_goals, goal_milestones, goal_progress_logs, game_rankings.
- T (18): users, accounts, licenses, classrooms, article, multiple_choice_questions, short_answer_questions, sentencs_and_words_for_flashcard, stories, story_chapters, assignments, assignment_students, user_lesson_progress, user_activities, xp_logs, flashcard_decks, flashcard_cards, ai_insights.
- N (7): sessions, verifications, validation_runs, logs, contact_messages, ai_providers, ai_task_configs. The implicit join table `_UserActivityToXPLogs` is a further N.

## 3. SPEC section 6 "no known target" tables

| Table | Finding | Proposal |
|---|---|---|
| `assignment_students` | Target exists: `student_assignments` (content.ts:77). | Map as in 2.4. |
| `story_chapters` | Target exists: `chapters` (stories.ts:33). | Map as in 2.3. |
| `user_activities` | Target exists: `user_activity` (progress.ts:8). | Map as in 2.4. Dedupe needed. |
| `user_lesson_progress` | Target exists: `lesson_progress` (progress.ts:84). | Map as in 2.4. Merge duplicates. |
| `logs` | No target. | Drop, because it holds 82 operational log rows (DUMP) and no user data. |
| `verifications` | No target of the same shape. | Drop, because SPEC:94 says so and it has 0 rows in DUMP. |

## 4. Tutor view columns

TUT:93-96 (article), TUT:101-103 (MCQ), TUT:107-109 (SAQ), TUT:113-117 (flashcard). TUT:125-127 reads `article.words`, `article.sentences`, `flashcard.words`. All views live in schema `tutor_compat`. Tutor passes a cuid string as `$1`, so `id` and `article_id` must be `text`.

A target `articles` row has no `legacy_id` column (content.ts:7-41; no match for `legacy_id` in `packages/db/src/schema`). SPEC D4 (SPEC:71) says `coalesce(legacy_id, id::text)`. The source for `legacy_id` is the join `LEFT JOIN primary_legacy_id_map m ON m.table_name = 'article' AND m.new_id = a.id`. The ID map table does not exist yet (no match in `packages/db`). The map `table_name` values must be fixed in FR-1.

### 4.1 View `tutor_compat.article`

| Tutor column (TUT line) | Shared source | Expression |
|---|---|---|
| `id` (select TUT:93, filter TUT:96, used TUT:121) | `articles.id` | `coalesce(m.legacy_id, a.id::text)` |
| `title` | `articles.title` | direct |
| `summary` | `articles.summary` | direct |
| `passage` | `articles.passage`, `articles.content` | `coalesce(a.passage, a.content)` (ETL writes both) |
| `cefr_level` | `articles.cefr_level` | direct |
| `ra_level` | `articles.ra_level` | direct |
| `words` | `articles.words` (jsonb) | direct |
| `sentences` | `articles.sentences` (jsonb) | direct |
| `translated_passage` | `articles.translated_passage` | direct |
| `translated_summary` | `articles.translated_summary` | direct |
| `audio_url` | `articles.audio_url` | direct |
| `audio_word_url` | `articles.audio_word_url` | direct |
| `genre` | `articles.genre` | direct |
| `type` | `articles.type` | direct |
| `is_published` (filter TUT:96) | `articles.is_published` (content.ts:36) | direct. The table also has `published` (content.ts:16). Use `is_published` and make the ETL set both. |

No column lacks a source. Caveat: `is_published` is false for 150 of 174 articles in the April DUMP, so Tutor sees only 24 articles unless the ETL keeps flags as they are. Unknown for production today.

### 4.2 View `tutor_compat.multiple_choice_questions`

| Tutor column (TUT:101-103) | Shared source | Expression |
|---|---|---|
| `id` | `multiple_choice_questions.id` | `coalesce(m2.legacy_id, q.id::text)` (the ID map also holds question ids per SPEC D2) |
| `question` | `question` | direct |
| `options` | `options` (jsonb) | Legacy type is `text[]`. node-pg returns both as a JS array, so `options` can stay jsonb. To match the type exactly, use `ARRAY(SELECT jsonb_array_elements_text(q.options))`. |
| `answer` | `answer` (text, nullable, questions.ts:17) | `coalesce(q.answer, q.options ->> q.correct_answer)` |
| `article_id` (filter TUT:103) | `article_id` (uuid) | `coalesce(m.legacy_id, q.article_id::text)` via the article map join |

No column lacks a source. The `answer` column is NULL if the ETL does not write it (the ETL must keep `answer`, see 2.3).

### 4.3 View `tutor_compat.short_answer_questions`

| Tutor column (TUT:107-109) | Shared source | Expression |
|---|---|---|
| `id` | `short_answer_questions.id` | `coalesce(m2.legacy_id, q.id::text)` |
| `question` | `question` | direct |
| `answer` | `answer`, `sample_answer` | `coalesce(q.answer, q.sample_answer)` |
| `article_id` (filter) | `article_id` | `coalesce(m.legacy_id, q.article_id::text)` |

No column lacks a source.

### 4.4 View `tutor_compat.sentencs_and_words_for_flashcard`

| Tutor column (TUT:113-117) | Shared source | Expression |
|---|---|---|
| `sentence` | `sentence` (jsonb) | direct |
| `audio_sentences_url` | `audio_sentences_url` | direct |
| `words` | `words` (jsonb) | direct |
| `words_url` | `words_url` | direct |
| `article_id` (filter) | `article_id` (uuid, NOT NULL) | `coalesce(m.legacy_id, f.article_id::text)` |

No column lacks a source. Notes: Tutor uses `LIMIT 1` with no `ORDER BY` (TUT:117), so rows must be unique per article for a stable result. Chapter-based legacy rows (about 2,272) do not load (see 2.3); Tutor only filters by `article_id`, so it does not need them.

Result: zero Tutor columns with no source. Two risks remain: the `legacy_id` source (map table, not a column), and the two publish flags.

## 5. Legacy data copy

| Where | Result |
|---|---|
| Local Postgres (podman `reading-advantage-postgres`) | Databases: accounting, codecamp_advantage, company_identity, postgres, primary_advantage, reading_advantage, reading_refactor_story_la_20260909, sales_advantage, science_advantage, science_advantage_test. None has a legacy `article` table. `primary_advantage` has `articles` (shared schema) and no `article`. `reading_advantage` and `reading_refactor_story_la_20260909` have `sentencs_and_words_for_flashcard` (shared schema), and no `article`. So no live legacy Primary database exists locally. |
| Dump file | `/home/daniebo/Desktop/reading-advantage-monorepo/Backup_Primary_2026-04-29.sql`, 66,847,165 bytes, written 2026-05-02. It is plain SQL from pg_dump 17.9 (DUMP:1-10), and it is git-ignored in the main repo (`.gitignore:44`). It is outside this worktree. Restorable to a scratch database, but I did not restore it. |
| Other candidates | `/home/daniebo/Desktop/reading-advantage-monorepo/Backup_Reading_2026-05-02.sql`, 392,717,574 bytes. This is the Reading Advantage database, not Primary. No other `*.sql`, `*.sql.gz`, `*.dump`, `*.backup`, `*.tar` file with a Primary-like name was found in `~/Desktop`, `~/Downloads`, or `~` (depth 4). |

Gap: the April dump is older than the current LP schema. The dump has no `validation_status`, `validated_at`, `repair_attempts`, `last_validation_issues` on `article`, and no `validation_runs`, `contact_messages`, `ai_providers`, `ai_task_configs` tables (DUMP:236-899 table list). SPEC:48 already says to take a fresh backup before rehearsal 1. The Workbooks injector writes new Origins lessons to the legacy database after Oct 4 (SPEC:165), so the April dump does not hold them. Who takes the fresh backup: unknown. Needs an owner (Daniel or the team with Cloud SQL access).

## 6. Risks (not covered by SPEC section 6)

| # | Risk | Evidence |
|---|---|---|
| R1 | Most questions belong to story chapters, not articles. 22,720 of 24,460 MCQ rows have `story_chapter_id` (DUMP count). Questions in SH only have a text `chapter_id` with no FK (questions.ts:19,34,44). The ETL must choose: load chapter questions with a `chapter_id` that holds the new chapter uuid as text, or drop them. SPEC does not say. Same for SAQ and LAQ. |
| R2 | `flashcard_cards` schema gap. FSRS state, audio timing, and word/sentence fields have no column in SH (flashcards.ts:19-29). Students lose review scheduling. 2,398 cards, 372 reviews. SPEC lists "flashcards" in the ETL order (SPEC:82) but gives no mapping. |
| R3 | `articles` has two publish flags (`published`, `is_published`) and `content` NOT NULL (content.ts:10,16,36). Wrong flag use hides articles from students or Tutor. Also 150 of 174 April articles are unpublished. |
| R4 | `xp_logs.activity_id` NOT NULL and unique `(user_id, activity_id)` (analytics.ts:15,25). About 110 legacy rows have null `activityId`. `user_activity` has a unique key that legacy lacks: about 243 duplicates in the April DUMP. `lesson_progress` unique `(user_id, lesson_id)`: 15 duplicates in 238 rows. Plain inserts would abort the transaction. |
| R5 | Physical column names in legacy are camelCase for unmapped fields (see the rule at the top). An ETL that selects `created_at` fails. |
| R6 | `ai_insights.title` and `.description` are JSON in legacy, text NOT NULL in target (LP:682-683, analytics.ts:135-136). |
| R7 | Tables with no SPEC entry: `contact_messages`, `ai_providers`, `ai_task_configs`, `validation_runs`, `roles`/`user_roles`, `school_admins`, `leaderboards`, `game_rankings`, `ai_insights`, `_UserActivityToXPLogs`. Proposals are in section 2. |
| R8 | Stories lose fields: `topic`, `is_published`, `validation_*`, `characters` (as `story_bible`, mapped), `translatedSentences` on chapters (LP:546-595, stories.ts:11-63). Stories with `is_published = false` may become public: target has `is_public` NOT NULL. |
| R9 | `users.email` is not unique in the target (users.ts:33). `username` UNIQUE needs a duplicate check for `lower(email)`. Dropped user columns: `banned`, `banReason`, `banExpires`, `lastActiveAt` (LP:20,30-32). |
| R10 | Several target columns are uuid but hold references to non-uuid legacy ids: `ai_insights.classroom_id` and `license_id` are text; `lesson_progress.lesson_id` is text; `flashcard_cards.source_id` is text. Decide old cuid or new uuid for each before the ETL (Tutor and QR links use cuids, so keep resolvable). |
| R11 | `classrooms.grade` is text in legacy (LP:347) and integer in target (classrooms.ts:17). Unknown values. |
| R12 | Content rows are still added to the legacy database after Oct 4 (SPEC:165). The ETL must be re-runnable and idempotent through the ID map. Risk: updated legacy rows do not update already migrated rows unless the ETL upserts by map. |
| R13 | `tutor_compat` joins the ID map for every query (article, question tables, 24k rows). Index `(table_name, new_id)` is needed in addition to the primary key `(table_name, legacy_id)` (SPEC:69). |
| R14 | Date-order assumption: `classroom_teachers` has 18 rows for 31 classrooms (SPEC:90), so at least 13 classrooms use the fallback teacher. |

## 7. Unknowns

- Whether production has columns the April dump lacks (`validation_status` and others). Unknown until a fresh dump or the live Prisma migration list is checked.
- Row counts for `contact_messages`, `ai_providers`, `ai_task_configs`, `validation_runs` (absent from DUMP).
- Whether any user has `role_id` set.
- Which values `classrooms.grade` holds.
- Whether the monorepo app reads `articles.published` or `articles.is_published`.
- The owner of the fresh backup.
