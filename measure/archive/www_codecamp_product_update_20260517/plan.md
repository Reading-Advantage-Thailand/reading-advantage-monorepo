# Implementation Plan: Update CodeCamp Advantage Product Page

## Phase 1: Contract & Schema Definition

- [x] Task: Audit current page and app features
  - [x] Review current `/products/codecamp-advantage` page code
  - [x] Review `apps/codecamp-advantage` curriculum structure
  - [x] Document all 18+ modules and 4 phases
  - [x] Capture screenshots (dashboard, AI tutor, GitHub PR review)

## Phase 2: Test

- [x] Task: Write tests for page components
  - [x] Create test for curriculum section
  - [x] Create test for feature highlights
  - [x] Create test for CTA buttons
  - [x] Verify tests fail (Red phase)

## Phase 3: Implement [checkpoint: e27afc5]

### Phase 3a: Content Updates

- [x] Task: Update locale files
  - [x] Update locale file with new CodeCamp copy (EN, TH, ZH)
  - [x] Include: curriculum modules, AI tutor, GitHub integration

### Phase 3b: Page Component Updates

- [x] Task: Update hero section
  - [x] Change "Coming Soon" to "Now Enrolling"
  - [x] Add "Full-Stack Web Dev Internship" badge
  - [x] Update CTA to "Apply Now" and "View Curriculum"

- [x] Task: Create curriculum showcase section
  - [x] Build phase timeline (A → B → C → D)
  - [x] List all modules per phase
  - [x] Highlight portfolio projects

- [x] Task: Add feature sections
  - [x] AI Chat Tutor feature card
  - [x] GitHub Integration feature card
  - [x] Progress Tracking feature card

### Phase 3c: Integration

- [x] Task: Assemble page
  - [x] Order sections: Hero → Curriculum → Features → Tech Stack → CTA
  - [x] Ensure consistent design

- [x] Task: Verify build and tests
  - [x] Build passes
  - [x] Lint clean
  - [x] Tests pass (Green phase)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update generated documentation
- [ ] Task: Manual verification (locales, mobile, links)
