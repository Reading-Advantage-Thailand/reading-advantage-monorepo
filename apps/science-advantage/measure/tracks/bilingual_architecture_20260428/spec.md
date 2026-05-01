# Specification: Bilingual Architecture Reframe

## Overview

The current bilingual implementation uses a boolean `showThai` toggle that switches the entire page between English-only and Thai-only. This is wrong for the actual use case: Thai classrooms need Thai UI chrome with English scientific vocabulary visible simultaneously. The database `Lesson` model has no `titleThai` field; Thai is embedded via string convention. Text blocks replace English entirely when Thai is toggled.

This track reframes bilingual support from a UI-layer toggle to a content-layer concern where Thai and English coexist side by side at the block level.

## Functional Requirements

### 1. Content-Level Language Model
- Add `titleThai` field to the `Lesson` Prisma model
- Add `descriptionThai` field to the `Lesson` model for Thai lesson descriptions
- Extend the `LessonContent` Zod schema: every content block already has `contentThai`/`textThai` fields — ensure they are populated in seed data for at least vocabulary and key terms
- The `LanguageProvider` context becomes a **display preference** (which language to show first), not a binary switch

### 2. Side-by-Side Block Rendering
- **TextBlock**: When both English and Thai content exist, render Thai below English with a subtle divider, not as a replacement. English is primary, Thai is supplementary. When only one language exists, show only that language.
- **VocabularyBlock**: Show Thai term alongside English term on the flashcard front. Definition stays in the student's display language.
- **ReadingPassageBlock**: Show Thai title alongside English title. Content remains in the display language (toggle is still useful for long-form reading).
- **ProcedureBlock**: Show Thai instruction alongside English instruction on each step.
- **MaterialsBlock**: Show Thai item name alongside English item name.

### 3. Thai Content Population
- Audit all Grade 3 Unit 1 vocabulary terms and ensure `thai` field is populated
- Add `contentThai` to at least the vocabulary and key text blocks in all seeded lessons
- For lessons where Thai translation doesn't exist yet, show only the available language (no empty Thai placeholders)

### 4. Database Schema Migration
- Create Prisma migration adding `titleThai` and `descriptionThai` to `Lesson` model
- Backfill existing lessons: parse Thai from the "English / ไทย" title convention into the new `titleThai` field
- Update seed functions to populate `titleThai` directly
- Update API routes to return `titleThai` and `descriptionThai` as separate fields

### 5. Display Preference UI
- Replace the binary toggle with a "Preferred Language" selector: English, Thai, or Side-by-Side
- Persist preference to localStorage
- Default to "Side-by-Side" for new users
- The preference affects which language is shown first in blocks, not whether the other language is hidden

## Non-Functional Requirements

- The migration must be backward-compatible (existing data must not break)
- Thai content population is best-effort — missing translations should degrade gracefully, not block rendering
- Side-by-side rendering must not double the visual height of every block (use compact layout with Thai in smaller text or inline annotation)
- All new bilingual fields must be optional (nullable) to avoid breaking existing content

## Acceptance Criteria

1. `Lesson` model has `titleThai` and `descriptionThai` fields
2. Backfilled lessons have Thai titles parsed from the "English / ไทย" convention
3. Vocabulary flashcards show Thai terms alongside English terms
4. Text blocks render Thai content below English content (not replacing it)
5. "Preferred Language" selector replaces the binary toggle
6. Missing Thai content degrades gracefully (shows English only, no empty placeholders)
7. Seed functions populate `titleThai` for new lessons
8. API routes return separate `title` and `titleThai` fields

## Out of Scope

- Full Thai translation of all content blocks (that's a content authoring effort)
- Thai-language UI chrome (menus, buttons, navigation labels)
- Right-to-left or special Thai typography handling
- Audio pronunciation for Thai terms (deferred to vocabulary audio track)
