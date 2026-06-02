# Specification: Add Exercise Lessons to All Codecamp Modules

## Overview

The codecamp-advantage PR review pipeline requires an `exercise` type lesson in each module to complete the `approve → lesson-completion` flow. Currently only 1 of 18 modules (Git & GitHub) has an exercise lesson. The other 17 modules have `theory` and `quiz` lessons but no `exercise` lesson, causing `completeApprovedPrReviewLesson` to throw "Exercise lesson not found" and blocking the PR review workflow.

The seed data (`packages/db/src/seed/codecamp-curriculum-data.ts`) already defines exercise lessons for all modules, but the seed script skips lesson insertion for existing modules (line 107) to avoid disrupting student progress. This track adds the missing exercise lessons directly to the production database and updates the seed script to support incremental lesson insertion.

## Functional Requirements

1. **Backfill Exercise Lessons** — Insert `exercise` type lessons into the 16 modules that are missing them (Modules 3–18, excluding Module 1 which has no exercise repo and Module 2 which already has one). Each exercise lesson must:
   - Have `type = 'exercise'`
   - Have `content_json` matching the seed data format: `{ "instructions": "..." }`
   - Be ordered after the last `theory` lesson and before the `quiz` lesson
   - Include the exercise records from the seed data (title, instructions, starter code, expected output, hints)

2. **Seed Script Enhancement** — Update `packages/db/src/seed/codecamp-seed.ts` to insert missing lessons for existing modules instead of skipping all lessons. The logic should:
   - For existing modules: check which lesson types are missing and insert only those
   - Never delete or modify existing lessons that students have progress on
   - Log which lessons were added vs skipped

3. **End-to-End Validation** — Verify the full PR review → lesson completion flow works for at least one module that was previously broken:
   - Open a PR against an exercise repo
   - Verify the LLM review runs and posts a comment
   - Verify the review status is set to `approved`
   - Verify `completeApprovedPrReviewLesson` succeeds
   - Verify the student's progress record is created

## Acceptance Criteria

- [ ] All 16 modules with exercise repos have an `exercise` type lesson in `codecamp_lessons`
- [ ] Each exercise lesson has associated `codecamp_exercises` records with instructions
- [ ] Exercise lessons are ordered correctly (after theory, before quiz)
- [ ] Seed script inserts missing lesson types for existing modules without duplicating or modifying existing lessons
- [ ] `pnpm --filter @reading-advantage/db run seed` is idempotent — running it twice produces the same result
- [ ] PR review → lesson completion flow works end-to-end for a module that was previously broken
- [ ] No existing student progress is disrupted (existing lesson IDs preserved)
- [ ] All existing tests pass

## Out of Scope

- Creating or modifying exercise GitHub repositories (covered by `codecamp_exercise_repos_20260515`)
- Changing the LLM review model or prompt
- Modifying the webhook handler (already fixed in this session)
- Adding exercise lessons to Module 1 (Dev Environment Setup — no exercise repo)
- Adding exercise lessons to Module 16 (Monorepo & Package Management — uses live monorepo)
