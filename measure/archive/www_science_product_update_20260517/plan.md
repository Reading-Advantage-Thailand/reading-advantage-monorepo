# Implementation Plan: Update Science Advantage Product Page

## Phase 1: Contract & Schema Definition

- [x] Task: Audit current science-advantage page and app features
  - [x] Review current `/products/science-advantage` page code
  - [x] Review `apps/science-advantage` for actual features
  - [x] Document all implemented features to showcase
  - [x] Verify student dashboard, teacher dashboard, analytics features

## Phase 2: Test

- [x] Task: Write tests for page components
  - [x] Create test for updated hero section content
  - [x] Create test for student feature sections
  - [x] Create test for teacher feature sections
  - [x] Create test for key feature sections
  - [x] Verify tests pass (Green phase)

## Phase 3: Implement [checkpoint: 1c384a1]

### Phase 3a: Content Updates

- [x] Task: Update locale files
  - [x] Update locale file with new Science Advantage copy (EN, TH, ZH)
  - [x] Include: student features, teacher features, platform features

### Phase 3b: Page Component Updates

- [x] Task: Update hero section
  - [x] Change badge from "Coming 2025" to "Early Access"
  - [x] Update subtitle to mention actual features
  - [x] Add secondary CTA "Learn More"

- [x] Task: Add student features section
  - [x] Create section with 4 feature cards
  - [x] Include: join classes, interactive lessons, progress tracking, AI recommendations

- [x] Task: Add teacher features section
  - [x] Create section with 4 feature cards
  - [x] Include: intervention alerts, class analytics, student progress, assignments

- [x] Task: Update key features section
  - [x] Interactive curriculum with NGSS-aligned lessons
  - [x] AI-powered insights with adaptive recommendations
  - [x] Assessment tools with real-time tracking

### Phase 3c: Integration

- [x] Task: Update page layout
  - [x] Assemble all sections in correct order
  - [x] Ensure consistent spacing and typography

- [x] Task: Verify build and tests
  - [x] Tests pass
  - [x] Lint clean
  - [x] No errors

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update generated documentation
- [ ] Task: Manual verification (locales, mobile, links)