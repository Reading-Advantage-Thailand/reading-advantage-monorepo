---
title: Sprint Retrospective Log
type: retrospective
status: active
created_at: 2025-11-22
tags: [retrospective, lessons-learned, changelog, sprint-review]
description: A running log of sprint retrospectives, documenting what went well, lessons learned, and technical notes from completed PRs.
---

# Retrospective Log

## PR #152 - Design Lesson Content JSON Schema

**Date**: 2025-11-22
**Issue**: #144
**Epic**: #143 - Rich Curriculum and Interactive Content

### What Went Well
- Clean implementation of Zod schemas for structured lesson content
- Comprehensive test coverage (27 tests)
- Good alignment with existing content-parsers.ts interfaces
- Forward compatibility with unknown field stripping

### Lessons Learned
- Discriminated unions in Zod are powerful for type-safe block rendering
- Optional Thai translations support bilingual content without breaking existing data

### Technical Notes
- Schema location: `lib/schemas/lesson-content.schema.ts`
- Block types: text, vocabulary, image, reading_passage, procedure, materials
- All blocks support optional `id` field for analytics tracking

## PR #153 - Implement Lesson Player Component

**Date**: 2025-11-22
**Issue**: #146
**Epic**: #143 - Rich Curriculum and Interactive Content

### What Went Well
- Clean component architecture with separate block renderers
- Comprehensive test suite (33 tests covering all scenarios)
- Good accessibility implementation (ARIA roles, keyboard nav)
- IntersectionObserver for analytics tracking
- Error boundaries prevent single block failures from crashing player

### Lessons Learned
- Default aspect ratios needed for optional image dimensions to prevent CLS
- useEffect refs need to reset when dependencies change for proper re-triggering
- ARIA list semantics require both role="list" and role="listitem"

### Technical Notes
- Main component: `components/features/lesson/lesson-player.tsx`
- Block components: `components/features/lesson/blocks/`
- Dependencies added: react-markdown, remark-gfm
- Placeholder blocks for #147 (Vocabulary) and #148 (Image Gallery)

## PR #154 - Update Lesson Detail Page

**Date**: 2025-11-23
**Issue**: #151
**Epic**: #143 - Rich Curriculum and Interactive Content

### What Went Well
- Clean integration of LessonPlayer into existing pages
- Feature flag allows safe rollback in production
- LanguageContext handles hydration correctly with mounted state
- Backward compatible - legacy content still works

### Lessons Learned
- NEXT_PUBLIC env vars are inlined at build time - no need for window checks
- Feature flags need consistent server/client behavior to avoid hydration mismatches
- safeParse is cleaner than try/catch for Zod validation in React components

### Technical Notes
- Added structuredContent Json field to Lesson model
- Created LanguageContext for En/Thai toggle with localStorage persistence
- API returns contentType: 'legacy' | 'structured' for explicit handling
- Feature flag: NEXT_PUBLIC_STRUCTURED_CONTENT_ENABLED
- Teacher preview includes "Preview Mode" badge

## PR #155 - Vocabulary Flashcard Component

**Date**: 2025-11-23
**Issue**: #147
**Epic**: #143 - Rich Curriculum and Interactive Content

### What Went Well
- Implemented full 3D flip animation with CSS transforms
- Carousel and grid modes working with proper keyboard navigation
- Self-assessment tracking with easy/hard buttons
- Excellent test coverage (34 tests)

### Lessons Learned
- Always toggle aria-hidden on flip card sides to prevent screen reader confusion
- matchMedia.addEventListener needs feature detection for Safari < 14 (use addListener fallback)
- prefers-reduced-motion should disable transform animations but keep visual flip indication

### Technical Notes
- Created components/features/lesson/vocabulary-flashcards.tsx (main component)
- Updated components/features/lesson/blocks/vocabulary-block.tsx to use new component
- CSS 3D transforms with perspective and rotateY
- IntersectionObserver pattern for card visibility
- Keyboard: Enter/Space to flip, Arrow keys for navigation

## PR #156 - Migration Script for Existing Content

**Date**: 2025-11-23
**Issue**: #145
**Epic**: #143 - Rich Curriculum and Interactive Content

### What Went Well
- Comprehensive CLI with --dry-run, --force, --lesson-id, --validate-only, --output flags
- Reused existing content parsers from lib/content-parsers.ts
- Excellent test coverage (46 tests) covering all conversion scenarios
- MD5 hashing for idempotency - prevents redundant migrations
- Golden fixtures for regression testing

### Lessons Learned
- Separate vitest config for scripts avoids database reset issues during tests
- Unknown markdown sections should always become TextBlocks (never drop content)
- Word count calculation needed for ReadingPassageBlock creation

### Technical Notes
- Created scripts/migrate-lesson-content.ts (737 lines)
- Created scripts/__tests__/migrate-lesson-content.test.ts (626 lines, 46 tests)
- Created scripts/fixtures/golden-lesson.md and .expected.json
- Created vitest.scripts.config.ts for script tests
- Section mapping: Key Vocabulary→VocabularyBlock, Materials→MaterialsBlock, Procedure→ProcedureBlock, Reading Passage→ReadingPassageBlock, Images→ImageBlock, Unknown→TextBlock

## PR #157 - Author Grade 4 Lesson Content

**Date**: 2025-11-23
**Issue**: #149
**Epic**: #143 - Rich Curriculum and Interactive Content

### What Went Well
- Created 10 comprehensive Grade 4 science lessons covering life, physical, and earth sciences
- Generated 200 questions (20 per lesson) with difficulty distribution
- Content validation script ensures quality and schema compliance
- Thai translations provided for vocabulary and reading passages
- Reading passages incorporate Thai cultural context (Chiang Mai, elephants, rice farming)

### Lessons Learned
- Flesch-Kincaid Grade 4-5 reading level requires simple sentences and accessible vocabulary
- Question difficulty distribution (40% easy, 40% medium, 20% hard) provides good assessment range
- Standards mapping helps ensure curriculum alignment with Thai and NGSS standards

### Technical Notes
- Created prisma/data/content/grade-4/ directory structure
- 10 lesson JSON files following LessonContentSchema
- 10 question bank JSON files with 20 questions each
- Standards mapping to Thai and NGSS standards
- Created scripts/validate-content.ts for content validation
- Thai translations flagged for native speaker review
