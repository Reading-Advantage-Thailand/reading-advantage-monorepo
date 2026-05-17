# Implementation Plan: Update Science Advantage Product Page

## Phase 1: Contract & Schema Definition

- [ ] Task: Audit current science-advantage page and app features
  - [ ] Review current `/products/science-advantage` page code
  - [ ] Review `apps/science-advantage` for actual screenshots and features
  - [ ] Document all implemented features to showcase
  - [ ] Capture screenshots from actual app (teacher dashboard, student view, analytics)

## Phase 2: Test

- [ ] Task: Write tests for page components
  - [ ] Create test for updated hero section content
  - [ ] Create test for feature sections
  - [ ] Create test for CTA buttons
  - [ ] Verify tests fail with current implementation (Red phase)

## Phase 3: Implement

### Phase 3a: Content Updates

- [ ] Task: Update locale files
  - [ ] Update `messages/en.json` with new Science Advantage copy
  - [ ] Update `messages/th.json` with Thai translations
  - [ ] Update `messages/zh.json` with Chinese translations
  - [ ] Include: feature descriptions, role-based CTAs, availability status

### Phase 3b: Page Component Updates

- [ ] Task: Update hero section
  - [ ] Change headline from "Coming 2025" to "Early Access"
  - [ ] Update subtitle to mention actual features
  - [ ] Change CTA button text and target
  - [ ] Add "NGSS-Aligned" badge

- [ ] Task: Add student features section
  - [ ] Create component for student experience highlights
  - [ ] Include: class joining, lesson delivery, quizzes, gamification
  - [ ] Add screenshot of student lesson view

- [ ] Task: Add teacher features section
  - [ ] Create component for teacher tools
  - [ ] Include: intervention alerts, analytics, class management
  - [ ] Add screenshot of teacher dashboard

- [ ] Task: Add AI features section
  - [ ] Create component for AI-powered learning
  - [ ] Include: adaptive recommendations, mastery tracking
  - [ ] Add relevant imagery/iconography

- [ ] Task: Update screenshots and imagery
  - [ ] Capture actual screenshots from science-advantage app
  - [ ] Optimize images (WebP format)
  - [ ] Add alt text and lazy loading

### Phase 3c: Integration

- [ ] Task: Update page layout
  - [ ] Assemble all sections in correct order
  - [ ] Ensure consistent spacing and typography
  - [ ] Add smooth scroll animations

- [ ] Task: Verify build and tests
  - [ ] Run `pnpm turbo run build --filter=www-reading-advantage`
  - [ ] Run `pnpm turbo run lint --filter=www-reading-advantage`
  - [ ] Run tests and confirm they pass (Green phase)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update generated documentation
  - [ ] Run `measure/doctor.sh` if applicable
  - [ ] Verify no architecture violations

- [ ] Task: Measure — Manual Verification
  - [ ] Verify all three locales display correctly
  - [ ] Test mobile responsive layout
  - [ ] Confirm no console errors
  - [ ] Check all links are functional
