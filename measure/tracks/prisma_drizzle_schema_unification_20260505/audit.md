# Prisma → Drizzle Schema Unification — Audit

> Generated: 2026-05-22. Source of truth for all Phase 2 schema decisions.

## Classification Key

| Code | Meaning |
|------|---------|
| AUTH-SKIP | Already in Drizzle via unified-auth track — no action |
| PORT-AS-IS | No Drizzle equivalent; add verbatim from Prisma |
| PORT+RESHAPE | Drizzle equivalent exists but is missing columns; add missing columns as nullable |
| RESHAPE | Drizzle schema is substantially incorrect; replace and update dependent domain code |
| KEEP-SEPARATE | Cross-app collision kept as app-prefixed tables (rubric applied below) |
| DROP | Dead — no live app/script/test importers |

---

## Reading-Advantage Prisma Models

| Model | SQL `@@map` | Classification | Drizzle target | Notes |
|-------|-------------|---------------|----------------|-------|
| User | users | AUTH-SKIP | `users` | unified-auth |
| Account | accounts | AUTH-SKIP | `accounts` | unified-auth |
| Session | sessions | AUTH-SKIP | `sessions` | unified-auth |
| VerificationToken | verification_tokens | DROP | — | no live importers after unified-auth |
| XPLog | XPLogs | RESHAPE | `xp_logs` | Drizzle has `amount`/`source`/`sourceId`; Prisma has `xpEarned`/`activityId`/`activityType` enum. Replace columns; update domain code. |
| UserActivity | UserActivity | PORT+RESHAPE | `user_activity` | Add Prisma-only: `targetId`, `timer`, `details` jsonb, `completed`. Keep Drizzle extras `xpEarned`/`metadata`. |
| Article | article | PORT+RESHAPE | `articles` | Add: `type`, `genre`, `subGenre`, `passage`, `translatedSummary`, `translatedPassage`, `imageDescription`, `raLevel`, `rating`, `audioUrl`, `audioWordUrl`, `sentences`, `words`, `authorId`, `isPublic`. Existing columns kept. |
| MultipleChoiceQuestion | MultipleChoiceQuestion | PORT+RESHAPE | `multiple_choice_questions` | Add `answer`, `textualEvidence`, `chapterId` (nullable FK). |
| ShortAnswerQuestion | ShortAnswerQuestion | PORT+RESHAPE | `short_answer_questions` | Add `answer`, `chapterId` (nullable FK). |
| LongAnswerQuestion | LongAnswerQuestion | PORT-AS-IS | `long_answer_questions` | Not in Drizzle. |
| Classroom | classrooms | PORT+RESHAPE | `classrooms` | Add: `classCode`, `codeExpiresAt`, `grade`, `createdBy` as nullable. |
| ClassroomStudent | classroomStudents | PORT-AS-IS | `classroom_students` | Aligned. |
| ClassroomTeacher | classroomTeachers | PORT+RESHAPE | `classroom_teachers` | Add `teacherRole` text nullable for Prisma TeacherRole enum values. |
| License | licenses | PORT-AS-IS | `licenses` | Not in Drizzle. |
| LicenseOnUser | license_on_users | PORT-AS-IS | `license_on_users` | Not in Drizzle. |
| School | schools | PORT+RESHAPE | `schools` | Add `province` (nullable), `country` (default "Thailand"). |
| RACEFRMapping | ra_cefr_mappings | PORT-AS-IS | `ra_cefr_mappings` | Not in Drizzle. |
| GenreAdjacency | genre_adjacencies | PORT-AS-IS | `genre_adjacencies` | Not in Drizzle. |
| Assignment (reading) | assignments | PORT+RESHAPE | `assignments` | KEEP-SEPARATE from science. Make `title` nullable; add `description`. Keep Drizzle extras for existing controllers. |
| StudentAssignment | student_assignments | PORT+RESHAPE | `student_assignments` | Add `status` (text), `startedAt`. Keep `completed bool` for existing controllers. |
| UserWordRecord | user_word_records | RESHAPE | `user_word_records` | Drizzle is simple flashcard record; Prisma is full FSRS record. Replace completely. |
| UserSentenceRecord | user_sentence_records | RESHAPE | `user_sentence_records` | Same FSRS pattern. Replace completely. |
| Story | stories | PORT-AS-IS | `stories` | Not in Drizzle. |
| Chapter | chapters | PORT-AS-IS | `chapters` | Not in Drizzle. |
| StoryTimepoint | story_timepoints | PORT-AS-IS | `story_timepoints` | Not in Drizzle. |
| StoryRecord | story_records | RESHAPE | `story_records` | Drizzle analytics.ts has wrong schema (articleId FK, completed bool). Prisma has storyId FK, status enum. Replace + update domain code. |
| ChapterTracking | chapter_trackings | RESHAPE | `chapter_trackings` | Drizzle has wrong SQL name (`chapter_tracking`) and wrong schema. Replace completely. |
| StoryAssignment | story_assignments | PORT-AS-IS | `story_assignments` | Not in Drizzle. |
| LessonRecord | lesson_records | PORT-AS-IS | `lesson_records` | Not in Drizzle. |
| AssignmentNotification | assignment_notifications | PORT-AS-IS | `assignment_notifications` | Not in Drizzle. |
| AIInsight | ai_insights | RESHAPE | `ai_insights` | Drizzle has 4-col stub; Prisma has 20-col schema. Replace completely. |
| AIInsightCache | ai_insight_cache | PORT-AS-IS | `ai_insight_cache` | Not in Drizzle. |
| LearningGoal | learning_goals | RESHAPE | `learning_goals` | Drizzle has simplified stub. Replace with full Prisma schema. |
| GoalMilestone | goal_milestones | PORT-AS-IS | `goal_milestones` | Not in Drizzle. |
| GoalProgressLog | goal_progress_logs | PORT-AS-IS | `goal_progress_logs` | Not in Drizzle. |
| GameRanking | game_rankings | RESHAPE | `game_rankings` | Drizzle has `score`/`level`/`completedAt`; Prisma has `difficulty`/`totalXp`/unique. Replace completely. |

---

## Science-Advantage Prisma Models

| Model | Classification | Drizzle target | Notes |
|-------|---------------|----------------|-------|
| account | AUTH-SKIP | `accounts` | unified-auth |
| session | AUTH-SKIP | `sessions` | unified-auth |
| user | AUTH-SKIP | `users` | unified-auth |
| verification | AUTH-SKIP | — | unified-auth |
| GamificationProfile | PORT-AS-IS | `gamification_profiles` | Not in Drizzle. |
| Achievement | PORT-AS-IS | `achievements` | Not in Drizzle. |
| Class (science) | KEEP-SEPARATE | `science_classes` | See decision below. |
| Standard | PORT-AS-IS | `science_standards` | Not in Drizzle. |
| StandardMastery | PORT-AS-IS | `science_standard_mastery` | Not in Drizzle. |
| Lesson (science) | KEEP-SEPARATE | `science_lessons` | See decision below. |
| CurriculumUnit | PORT-AS-IS | `science_curriculum_units` | FK to science_classes. |
| QuizQuestion (science) | KEEP-SEPARATE | `science_quiz_questions` | See decision below. |
| Attempt | PORT-AS-IS | `science_attempts` | Not in Drizzle. |
| QuestionResponse | PORT-AS-IS | `science_question_responses` | Not in Drizzle. |
| LessonCompletion | PORT-AS-IS | `science_lesson_completions` | Not in Drizzle. |
| MasteryRun | PORT-AS-IS | `science_mastery_runs` | Not in Drizzle. |
| Assignment (science) | KEEP-SEPARATE | `science_assignments` | See decision below. |

---

## Cross-App Collision Decisions (Unification Decision Rubric Applied)

### Collision 1: `Classroom` (reading) vs `Class` (science)

| Criterion | Reading `Classroom` | Science `Class` |
|-----------|--------------------|-----------------| 
| Domain concept | Reading classroom with article assignments | Science class with curriculum + standards |
| Key columns | schoolId, classCode, codeExpiresAt, grade | standardsAlignment enum, joinCode, gradeLevel |
| FK graph | → articles, → storyAssignments | → CurriculumUnit, → science_assignments |
| Tenant scope | schoolId (tenant-scoped) | global by teacherId only |
| Column overlap | ~30% (name, teacherId, grade/gradeLevel) | Low |

**Decision: KEEP-SEPARATE.** Column overlap ~30%, FK graphs incompatible, tenant-scoping differs. Drizzle: `classrooms` (existing) + `science_classes` (new).

### Collision 2: `Assignment` (reading) vs `Assignment` (science)

**Decision: KEEP-SEPARATE.** Reading assignment → articles; science assignment → science lessons. Completely different FK graphs. Drizzle: `assignments` (existing) + `science_assignments` (new).

### Collision 3: `LessonRecord` (reading) vs `Lesson` (science)

Reading `LessonRecord` tracks 14-phase article lesson progress (JSON blobs per phase). Science `Lesson` is curriculum content with NGSS standards. **Decision: KEEP-SEPARATE.** Drizzle: `lesson_records` + `science_lessons`.

### Collision 4: `MultipleChoiceQuestion` (reading) vs `QuizQuestion` (science)

Reading MCQ: article-based, simple string array options. Science QuizQuestion: lesson-based, polymorphic types, jsonb correctAnswer, standards-linked. **Decision: KEEP-SEPARATE.** Drizzle: existing MCQ tables + `science_quiz_questions`.

---

## Reshape Column Mapping

### `xp_logs` (XPLog)

| Drizzle old | Prisma | Action |
|-------------|--------|--------|
| `amount` | `xpEarned` (`xp_earned`) | REPLACE — rename, update domain |
| `source` | `activityType` (ActivityType enum text) | REPLACE — rename to `activity_type` |
| `sourceId` | `activityId` (`activity_id`) | REPLACE — rename |
| — | `updatedAt` | ADD |

Domain impact: `progress/index.ts` and `reports/index.ts`: `xpLogs.amount` → `xpLogs.xpEarned`.

### `story_records` (StoryRecord)

| Drizzle old | Prisma | Action |
|-------------|--------|--------|
| `articleId` | `storyId` (FK to stories) | REPLACE |
| `currentChapter`, `totalChapters`, `startedAt`, `completedAt` | — | REMOVE |
| `completed` bool | `status` (QuizStatus text enum) | REPLACE |
| — | `title`, `level`, `rated`, `score` | ADD |

Domain impact: `storyRecords.completed` → `inArray(storyRecords.status, ['COMPLETED','COMPLETED_MCQ','COMPLETED_SAQ','COMPLETED_LAQ'])`.

### Other reshapes

- `chapter_tracking` → `chapter_trackings`: SQL name + schema replaced. No domain usage.
- `ai_insights`: 4-col stub → 20-col Prisma schema. No domain usage.
- `learning_goals`: simplified → full Prisma schema with enums. No domain usage.
- `game_rankings`: `score`/`level`/`completedAt` → `difficulty`/`totalXp`/unique. No domain usage.
- `user_word_records` / `user_sentence_records`: simple → full FSRS. Domain only uses `.userId`.

---

## Dead Tables (DROP)

| Model | Reason |
|-------|--------|
| `VerificationToken` | Removed by unified-auth track; no importers found anywhere |

---

## Open Questions

None — all collisions resolved per rubric. No ambiguous cases requiring escalation.
