# Implementation Plan

## Phase 1: Database Schema and Migration

- [x] Task: Add Thai fields to Lesson model
  - [x] Write tests for new fields (titleThai, descriptionThai nullable strings)
  - [x] Add `titleThai` and `descriptionThai` fields to Prisma `Lesson` model
  - [x] Create and run Prisma migration
  - [x] Verify existing data is not broken (fields are nullable)
- [x] Task: Backfill Thai titles from convention
  - [x] Write a migration script that parses "English / ไทย" title convention
  - [x] Split on " / " delimiter, assign left to `title`, right to `titleThai`
  - [x] Handle edge cases: no Thai portion (set titleThai to null), multiple " / " (split on first occurrence only)
  - [x] Run backfill and verify results
- [x] Task: Update seed functions for Thai fields
  - [x] Update `seedLessons()` to populate `titleThai` and `descriptionThai` directly
  - [x] Update lesson seed JSON files to include explicit `titleThai` field
  - [x] Verify seed produces correct bilingual data

## Phase 2: Side-by-Side Block Rendering

- [x] Task: Update TextBlock for side-by-side rendering
  - [x] Write tests for TextBlock with both languages present
  - [x] Modify `TextBlock` to render Thai content below English content with a subtle divider
  - [x] Thai content uses smaller text size or muted color to maintain visual hierarchy
  - [x] When only one language exists, show only that language (no empty Thai placeholder)
- [x] Task: Update VocabularyBlock for bilingual display
  - [x] Write tests for vocabulary flashcard showing Thai term alongside English
  - [x] Modify vocabulary flashcard front to show both `term` and `thai` fields
  - [x] Definition remains in the display language
- [x] Task: Update ReadingPassageBlock for bilingual titles
  - [x] Show Thai title alongside English title
  - [x] Content remains in display language (long-form reading toggle still works)
- [x] Task: Update ProcedureBlock and MaterialsBlock
  - [x] Show Thai instruction/item alongside English on each step/material
  - [x] Use compact inline layout (Thai in parentheses or smaller text below)
- [x] Task: Measure - Manual Verification 'Side-by-Side'
  - [x] Verify text blocks show Thai below English
  - [x] Verify vocabulary flashcards show Thai terms
  - [x] Verify no empty Thai placeholders when Thai content is missing

## Phase 3: Display Preference and API Updates

- [x] Task: Replace binary toggle with display preference
  - [x] Write tests for DisplayPreference context (English, Thai, SideBySide modes)
  - [x] Create `DisplayPreferenceProvider` context replacing `LanguageProvider`
  - [x] Add preference selector UI (three options: English, Thai, Side-by-Side)
  - [x] Default to "Side-by-Side" for new users
  - [x] Persist preference to localStorage
- [x] Task: Update API routes for bilingual fields
  - [x] Update `/api/lessons/[lessonSlug]` to return `titleThai` and `descriptionThai` as separate fields
  - [x] Update `/api/classes/[classId]/curriculum` to return `titleThai` for lessons
  - [x] Update curriculum accordion to display `titleThai` alongside `title`
- [x] Task: Update lesson viewer for display preference
  - [x] In "English" mode: show only English content
  - [x] In "Thai" mode: show Thai content as primary (fallback to English if Thai missing)
  - [x] In "Side-by-Side" mode: show both with Thai as secondary/supplementary
  - [x] Pass `displayPreference` to all block renderers
- [x] Task: Populate Thai content for key lessons
  - [x] Audit Grade 3 Unit 1 vocabulary terms — ensure `thai` field is populated
  - [x] Add `contentThai` to vocabulary blocks in all seeded lessons
  - [x] For lessons without Thai translation, verify graceful degradation (English only)
- [x] Task: Measure - Manual Verification 'Display Preference'
  - [x] Verify the three-way preference selector works
  - [x] Verify "Side-by-Side" shows both languages
  - [x] Verify "Thai" mode shows Thai content with English fallback
  - [x] Verify API returns separate title/titleThai fields
