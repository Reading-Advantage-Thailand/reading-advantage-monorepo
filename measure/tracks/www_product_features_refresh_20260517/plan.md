# Implementation Plan: Refresh Product Pages with Real Features

## Phase 1: Contract & Schema Definition

- [b] Task: Audit all product pages and apps — deferred:track-owner
  - [ ] Review Reading Advantage page (`/products/reading-advantage`)
  - [ ] Review Primary Advantage page (`/products/primary-advantage`)
  - [ ] Document actual features from `apps/reading-advantage` and `apps/primary-advantage`
  - [ ] Capture screenshots from both apps
  - [ ] Define feature comparison matrix structure

## Phase 2: Test

- [b] Task: Write tests for updated components — deferred:track-owner
  - [ ] Create test for feature sections
  - [ ] Create test for comparison matrix
  - [ ] Create test for screenshot galleries
  - [ ] Verify tests fail (Red phase)

## Phase 3: Implement

### Phase 3a: Reading Advantage Updates

- [b] Task: Update locale content — deferred:track-owner
  - [ ] Add AI content generation description (12 levels)
  - [ ] Add comprehension types (MCQ, SA, LAQ)
  - [ ] Add AI chatbot assistant features
  - [ ] Add FSRS flashcard system
  - [ ] Add teacher tools (workbook generator)
  - [ ] Add Google Classroom integration

- [b] Task: Update page sections — deferred:track-owner
  - [ ] Add/refresh AI Content section
  - [ ] Add Interactive Comprehension section
  - [ ] Add AI Chatbot section
  - [ ] Add Flashcards section
  - [ ] Add Teacher Portal section
  - [ ] Update screenshots with actual app images

### Phase 3b: Primary Advantage Updates

- [b] Task: Update locale content — deferred:track-owner
  - [ ] Add read-along audio feature
  - [ ] Add vocabulary/sentence practice
  - [ ] Add flashcard games (cloze, matching, ordering)
  - [ ] Add teacher portal features
  - [ ] Add school rankings feature

- [b] Task: Update page sections — deferred:track-owner
  - [ ] Add Read-Along Audio section
  - [ ] Add Vocabulary Practice section
  - [ ] Add Flashcard Games section
  - [ ] Add Teacher Portal section
  - [ ] Update screenshots with actual app images

### Phase 3c: Cross-Platform Features

- [b] Task: Create platform features section — deferred:track-owner
  - [ ] Multi-tenant architecture
  - [ ] Role-based access
  - [ ] Thai/English localization
  - [ ] Progress analytics
  - [ ] Assignment distribution
  - [ ] Mobile responsiveness

### Phase 3d: Feature Comparison Matrix

- [b] Task: Build comparison component — deferred:track-owner
  - [ ] Create `ProductComparisonTable` component
  - [ ] Rows: AI Content, Quizzes, Flashcards, Teacher Tools, Admin, Mobile, etc.
  - [ ] Columns: Reading, Primary, Science, CodeCamp, Games
  - [ ] Checkmarks/X marks for feature availability
  - [ ] Responsive design (horizontal scroll on mobile)

### Phase 3e: Screenshots & Assets

- [b] Task: Capture and optimize screenshots — deferred:track-owner
  - [ ] Reading Advantage: student view, teacher dashboard, admin panel
  - [ ] Primary Advantage: student view, teacher portal, flashcards
  - [ ] Optimize all images (WebP, lazy loading)
  - [ ] Add device mockups

### Phase 3f: Integration

- [b] Task: Assemble updated pages — deferred:track-owner
  - [ ] Reading Advantage: Hero → Features → Screenshots → Comparison → CTA
  - [ ] Primary Advantage: Hero → Features → Screenshots → Comparison → CTA
  - [ ] Ensure consistent spacing
  - [ ] Add scroll animations

- [b] Task: Verify build and tests — deferred:track-owner
  - [ ] Build passes
  - [ ] Lint clean
  - [ ] Tests pass (Green phase)

## Phase 4: Generate Docs & Doctor

- [b] Task: Update generated documentation — deferred:track-owner
- [b] Task: Manual verification (all locales, mobile, links, images) — deferred:track-owner
