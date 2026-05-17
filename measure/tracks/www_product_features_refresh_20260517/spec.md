# Specification: Refresh Product Pages with Real Features

## Overview

All product pages on the company website use generic or placeholder descriptions that don't reflect the actual implemented features in each app. This track updates Reading Advantage and Primary Advantage product pages with accurate feature lists, actual screenshots, and real capabilities based on the current codebase.

## Current State

- Reading Advantage: Has screenshots but feature list is generic
- Primary Advantage: Basic description, missing detailed feature breakdown
- Both pages: Missing actual app screenshots, no teacher portal highlights, no admin features

## Actual Implementation Summary

### Reading Advantage (apps/reading-advantage)
**Student Features:**
- Article library with AI-generated leveled content (12 levels)
- Serialized stories with chapters
- Interactive comprehension: MCQ, Short Answer, Long Answer
- AI chatbot assistant (translation, word lists, story help)
- Audio narration via Google Cloud Text-to-Speech
- First-run level placement test
- Flashcard decks with spaced repetition (FSRS algorithm)
- Cloze tests, sentence ordering, word ordering
- XP tracking, goals, recommendations
- Assignment distribution and completion tracking
- Google Classroom OAuth2 integration

**Teacher Features:**
- Class roster management
- Assignment creation and student progress per article
- Student progress tracking with reports
- Workbook Generator (upload article JSON + template)
- Reports and accuracy analytics per classroom

**Admin/System:**
- Admin dashboard, article creation
- System-level license management
- School dashboards, passage handling
- School-wide XP reports

### Primary Advantage (apps/primary-advantage)
**Student Features:**
- Leveled reading with fun stories and read-along audio
- Vocabulary and sentence learning pages
- Assignment tracking and reading history
- Progress reports
- Flashcard practice with cloze tests, matching, ordering

**Teacher Features:**
- Dashboard, my-classes, my-students overview
- Class roster and enrollment management
- Assignment management
- Student progress detail pages
- Reports

**Admin/System:**
- Article creation and bulk data import
- Student and teacher management
- License creation and management
- School management and ranking leaderboard

## Functional Requirements

### FR-1: Reading Advantage Page Updates
- Add "AI-Generated Content" section with 12-level system
- Add "Interactive Comprehension" section (MCQ, SA, LAQ)
- Add "AI Chatbot Assistant" section
- Add "Spaced Repetition Flashcards" section (FSRS)
- Add "Teacher Tools" section (workbook generator, class management)
- Add "Google Classroom Integration" badge
- Include actual app screenshots for each section

### FR-2: Primary Advantage Page Updates
- Add "Read-Along Audio" section
- Add "Vocabulary & Sentence Practice" section
- Add "Flashcard Games" section (cloze, matching, ordering)
- Add "Teacher Portal" section (class management, progress tracking)
- Add "School Rankings" feature highlight
- Include actual app screenshots

### FR-3: Add "Platform Features" Cross-Cutting Section
- Shared features across all products:
  - Multi-tenant school architecture
  - Role-based access (student, teacher, admin, system)
  - Thai and English localization
  - Progress analytics and reporting
  - Assignment distribution
  - Mobile-responsive design

### FR-4: Update Screenshots
- Replace generic/mock screenshots with actual app screenshots
- Show desktop, tablet, and mobile views
- Include teacher dashboard and student view side-by-side

### FR-5: Feature Comparison Matrix
- Add comparison table showing feature availability per product
- Columns: Reading, Primary, Science, CodeCamp, Games
- Rows: AI Content, Comprehension Quizzes, Flashcards, Teacher Tools, Admin Panel, Mobile App, etc.

## Non-Functional Requirements

### NFR-1: Consistent Design
- Maintain existing product color themes
- Use clay-inspired design tokens
- Consistent section spacing and typography

### NFR-2: i18n Support
- Update EN, TH, and ZH locale files with new feature descriptions
- Ensure technical terms have accurate translations

### NFR-3: Performance
- Optimize images (WebP format, lazy loading)
- Keep page bundle size reasonable

### NFR-4: Build Verification
- All updated pages build successfully
- No new lint errors

## Acceptance Criteria

1. Reading Advantage page reflects actual AI content generation, 12-level system, and chatbot
2. Primary Advantage page reflects actual audio read-along and flashcard games
3. Actual app screenshots replace generic/mock images
4. Feature comparison matrix shows real capabilities per product
5. All three locale versions updated
6. Build passes without errors
7. Mobile responsive maintained
8. No broken links or images

## Out of Scope

- Creating new features in actual apps
- Implementing login/auth on marketing site
- Backend API changes
- Changes to app functionality
