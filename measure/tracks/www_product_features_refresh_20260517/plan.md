# Implementation Plan: Refresh Product Pages with Real Features

## Phase 1: Contract & Schema Definition

- [ ] Task: Audit all product pages and apps
  - [ ] Review Reading Advantage page (`/products/reading-advantage`)
  - [ ] Review Primary Advantage page (`/products/primary-advantage`)
  - [ ] Document actual features from `apps/reading-advantage` and `apps/primary-advantage`
  - [ ] Capture screenshots from both apps
  - [ ] Define feature comparison matrix structure

## Phase 2: Test

- [ ] Task: Write tests for updated components
  - [ ] Create test for feature sections
  - [ ] Create test for comparison matrix
  - [ ] Create test for screenshot galleries
  - [ ] Verify tests fail (Red phase)

## Phase 3: Implement

### Phase 3a: Reading Advantage Updates

- [ ] Task: Update locale content
  - [ ] Add AI content generation description (12 levels)
  - [ ] Add comprehension types (MCQ, SA, LAQ)
  - [ ] Add AI chatbot assistant features
  - [ ] Add FSRS flashcard system
  - [ ] Add teacher tools (workbook generator)
  - [ ] Add Google Classroom integration

- [ ] Task: Update page sections
  - [ ] Add/refresh AI Content section
  - [ ] Add Interactive Comprehension section
  - [ ] Add AI Chatbot section
  - [ ] Add Flashcards section
  - [ ] Add Teacher Portal section
  - [ ] Update screenshots with actual app images

### Phase 3b: Primary Advantage Updates

- [ ] Task: Update locale content
  - [ ] Add read-along audio feature
  - [ ] Add vocabulary/sentence practice
  - [ ] Add flashcard games (cloze, matching, ordering)
  - [ ] Add teacher portal features
  - [ ] Add school rankings feature

- [ ] Task: Update page sections
  - [ ] Add Read-Along Audio section
  - [ ] Add Vocabulary Practice section
  - [ ] Add Flashcard Games section
  - [ ] Add Teacher Portal section
  - [ ] Update screenshots with actual app images

### Phase 3c: Cross-Platform Features

- [ ] Task: Create platform features section
  - [ ] Multi-tenant architecture
  - [ ] Role-based access
  - [ ] Thai/English localization
  - [ ] Progress analytics
  - [ ] Assignment distribution
  - [ ] Mobile responsiveness

### Phase 3d: Feature Comparison Matrix

- [ ] Task: Build comparison component
  - [ ] Create `ProductComparisonTable` component
  - [ ] Rows: AI Content, Quizzes, Flashcards, Teacher Tools, Admin, Mobile, etc.
  - [ ] Columns: Reading, Primary, Science, CodeCamp, Games
  - [ ] Checkmarks/X marks for feature availability
  - [ ] Responsive design (horizontal scroll on mobile)

### Phase 3e: Screenshots & Assets

- [ ] Task: Capture and optimize screenshots
  - [ ] Reading Advantage: student view, teacher dashboard, admin panel
  - [ ] Primary Advantage: student view, teacher portal, flashcards
  - [ ] Optimize all images (WebP, lazy loading)
  - [ ] Add device mockups

### Phase 3f: Integration

- [ ] Task: Assemble updated pages
  - [ ] Reading Advantage: Hero → Features → Screenshots → Comparison → CTA
  - [ ] Primary Advantage: Hero → Features → Screenshots → Comparison → CTA
  - [ ] Ensure consistent spacing
  - [ ] Add scroll animations

- [ ] Task: Verify build and tests
  - [ ] Build passes
  - [ ] Lint clean
  - [ ] Tests pass (Green phase)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update generated documentation
- [ ] Task: Manual verification (all locales, mobile, links, images)
