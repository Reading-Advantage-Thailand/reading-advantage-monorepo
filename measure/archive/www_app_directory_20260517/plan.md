# Implementation Plan: Create Unified App Directory Page

## Phase 1: Contract & Schema Definition

- [b] Task: Define app directory structure — deferred:track-owner
  - [ ] Determine URL: `/apps` (recommended) or `/products`
  - [ ] Document all 5 apps with metadata:
    - Name, color theme, target audience, description, status
    - Key features (3-4 per app)
    - Links to product pages and actual apps
  - [ ] Define role-based filtering logic

## Phase 2: Test

- [b] Task: Write tests for app directory — deferred:track-owner
  - [ ] Create test for app cards grid
  - [ ] Create test for role-based filtering
  - [ ] Create test for navigation links
  - [ ] Verify tests fail (Red phase)

## Phase 3: Implement

### Phase 3a: Content & Locale

- [b] Task: Create locale entries — deferred:track-owner
  - [ ] Add app directory content to `messages/en.json`
  - [ ] Add app directory content to `messages/th.json`
  - [ ] Add app directory content to `messages/zh.json`
  - [ ] Include: page title, role names, app descriptions, CTAs

### Phase 3b: Page Components

- [b] Task: Create app directory page — deferred:track-owner
  - [ ] Create `app/[locale]/(marketing)/apps/page.tsx`
  - [ ] Set up metadata and SEO
  - [ ] Add to navigation/header if needed

- [b] Task: Build hero section — deferred:track-owner
  - [ ] "Reading Advantage Platform" headline
  - [ ] Subtitle: "Complete educational ecosystem for schools"
  - [ ] Brief platform overview

- [b] Task: Build role selector — deferred:track-owner
  - [ ] Tab/button group: Student, Teacher, Admin, Parent, Intern
  - [ ] Client-side filtering of app cards
  - [ ] Default view: Show all apps

- [b] Task: Build app cards — deferred:track-owner
  - [ ] Create `AppDirectoryCard` component
  - [ ] 5 cards: Reading, Primary, Science, CodeCamp, Games
  - [ ] Each card: icon, name, color theme, audience badge, description, features, links
  - [ ] Status badge: Live, Early Access, etc.

- [b] Task: Build getting started section — deferred:track-owner
  - [ ] Step-by-step flow: Choose role → Select product → Contact sales
  - [ ] CTA: "Contact Sales for School Licenses"
  - [ ] Alternative: "Request Demo" form link

- [b] Task: Build technical info section — deferred:track-owner
  - [ ] Browser requirements
  - [ ] Device support icons
  - [ ] Integration mentions (Google Classroom, SSO)
  - [ ] Security/compliance badges

### Phase 3c: Navigation Integration

- [b] Task: Update site navigation — deferred:track-owner
  - [ ] Add "Apps" or "Products" link to header
  - [ ] Consider updating footer with app links
  - [ ] Ensure mobile nav includes new page

### Phase 3d: Quality Gates

- [b] Task: Verify build and tests — deferred:track-owner
  - [ ] Build passes
  - [ ] Lint clean
  - [ ] Tests pass (Green phase)

## Phase 4: Generate Docs & Doctor

- [b] Task: Update generated documentation — deferred:track-owner
  - [ ] Update routes.md if generated
  - [ ] Verify no architecture violations

- [b] Task: Manual verification — deferred:track-owner
  - [ ] Test all three locales
  - [ ] Test role filtering on mobile/desktop
  - [ ] Verify all links work
  - [ ] Check SEO metadata
  - [ ] Test page load performance
