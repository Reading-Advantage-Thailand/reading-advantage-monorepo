# Specification: Content Pipeline & Mastery Wiring

## Overview

The content pipeline has critical gaps that prevent the app from delivering real curriculum. Grade 4 content exists but isn't integrated. The mastery computation pipeline is defined but never triggered. Question formats are incompatible between grades. Seed validation is incomplete. This track fixes the plumbing so the app can actually deliver and track curriculum.

## Functional Requirements

### 1. Wire the Mastery Pipeline
- After quiz submission (POST `/api/lessons/{lessonSlug}/quiz`), create a `MasteryRun` record and trigger mastery computation
- Implement the mastery worker/consumer that reads PENDING `MasteryRun` records and calls `recordStandardMastery()` for each standard covered by the attempt
- Mastery computation: for each question in the attempt, look up the question's standards, compute a weighted mastery adjustment based on correctness and question difficulty, and upsert the `StandardMastery` record
- Handle edge cases: multiple standards per question, retry attempts (weight recent attempts higher), attempt ordering
- After mastery update, set `MasteryRun` status to COMPLETED with `updatedCount`

### 2. Integrate Grade 4 Content
- Extend the seed pipeline to read from `data/content/grade-4/` directory
- Normalize Grade 4 question format: map `multiple_choice` → `MULTIPLE_CHOICE` (and similar for all question types) during seed
- Create `seed-data/standards/thai-grade-4.json` from the existing `standards-mapping.json`
- Create `seed-data/curriculum-units/thai-grade-4.json` to define unit structure for Grade 4
- Add Grade 4 to the selective seeding CLI: `--grade=4`

### 3. Fix Content Stub Gap
- Audit all Grade 3 Units 2-10 seed lessons and replace one-line stubs with at minimum:
  - A `text` block with a 2-3 sentence lesson introduction
  - A `vocabulary` block with 3-5 key terms for the lesson
  - Standards mapped to each lesson
- This is not full content authoring — it's ensuring every lesson has minimum viable structured content so students don't see blank pages

### 4. Seed-Time Validation
- Run Zod validation (`LessonContentSchema.safeParse`) on all structured content during seed
- Validate quiz questions against `QuizQuestionSchema` before insertion
- Report validation errors with clear messages (which file, which lesson, what failed)
- Fail the seed on validation errors (don't silently insert broken content)

### 5. Implement Review and Quiz Block Renderers
- Create `ReviewBlock` component that renders review questions in an interactive format (question → answer → reveal)
- Create `QuizBlock` component that renders an inline quiz experience within structured content
- Wire both into the `BlockRenderer` switch in `LessonPlayer`

## Non-Functional Requirements

- Mastery computation must complete within 5 seconds for a single attempt
- MasteryRun failures must be logged with enough context to debug (question IDs, student ID, error message)
- Seed validation must run in under 30 seconds for the full Grade 3 + Grade 4 dataset
- Grade 4 question normalization must be idempotent (re-seeding doesn't create duplicates)

## Acceptance Criteria

1. After submitting a quiz, `StandardMastery` records are updated within 5 seconds
2. `MasteryRun` status transitions from PENDING → PROCESSING → COMPLETED with correct `updatedCount`
3. `npx prisma db seed --grade=4` successfully seeds Grade 4 curriculum, standards, lessons, and questions
4. Grade 3 Units 2-10 lessons all have minimum viable structured content (not one-line stubs)
5. Seed with invalid content fails with clear validation error messages
6. Review blocks render interactively in the lesson viewer
7. Quiz blocks render inline in the lesson viewer
8. The student mastery profile updates after quiz submission (not just showing seeded data)

## Out of Scope

- Full content authoring for Grade 3 Units 2-10 (that's a separate curriculum authoring track)
- AI-powered mastery computation or recommendation refinement
- Content versioning or rollback mechanisms
- Teacher-authored content creation tools
