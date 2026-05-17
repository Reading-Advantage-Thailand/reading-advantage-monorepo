# Implementation Plan: Create Unified App Directory Page

## Phase 1: Contract & Schema Definition

- [ ] Task: Define app directory structure
  - [ ] Determine URL: `/apps` (recommended) or `/products`
  - [ ] Document all 5 apps with metadata:
    - Name, color theme, target audience, description, status
    - Key features (3-4 per app)
    - Links to product pages and actual apps
  - [ ] Define role-based filtering logic

## Phase 2: Test

- [ ] Task: Write tests for app directory
  - [ ] Create test for app cards grid
  - [ ] Create test for role-based filtering
  - [ ] Create test for navigation links
  - [ ] Verify tests fail (Red phase)

## Phase 3: Implement

### Phase 3a: Content & Locale

- [ ] Task: Create locale entries
  - [ ] Add app directory content to `messages/en.json`
  - [ ] Add app directory content to `messages/th.json`
  - [ ] Add app directory content to `messages/zh.json`
  - [ ] Include: page title, role names, app descriptions, CTAs

### Phase 3b: Page Components

- [ ] Task: Create app directory page
  - [ ] Create `app/[locale]/(marketing)/apps/page.tsx`
  - [ ] Set up metadata and SEO
  - [ ] Add to navigation/header if needed

- [ ] Task: Build hero section
  - [ ] "Reading Advantage Platform" headline
  - [ ] Subtitle: "Complete educational ecosystem for schools"
  - [ ] Brief platform overview

- [ ] Task: Build role selector
  - [ ] Tab/button group: Student, Teacher, Admin, Parent, Intern
  - [ ] Client-side filtering of app cards
  - [ ] Default view: Show all apps

- [ ] Task: Build app cards
  - [ ] Create `AppDirectoryCard` component
  - [ ] 5 cards: Reading, Primary, Science, CodeCamp, Games
  - [ ] Each card: icon, name, color theme, audience badge, description, features, links
  - [ ] Status badge: Live, Early Access, etc.

- [ ] Task: Build getting started section
  - [ ] Step-by-step flow: Choose role → Select product → Contact sales
  - [ ] CTA: "Contact Sales for School Licenses"
  - [ ] Alternative: "Request Demo" form link

- [ ] Task: Build technical info section
  - [ ] Browser requirements
  - [ ] Device support icons
  - [ ] Integration mentions (Google Classroom, SSO)
  - [ ] Security/compliance badges

### Phase 3c: Navigation Integration

- [ ] Task: Update site navigation
  - [ ] Add "Apps" or "Products" link to header
  - [ ] Consider updating footer with app links
  - [ ] Ensure mobile nav includes new page

### Phase 3d: Quality Gates

- [ ] Task: Verify build and tests
  - [ ] Build passes
  - [ ] Lint clean
  - [ ] Tests pass (Green phase)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update generated documentation
  - [ ] Update routes.md if generated
  - [ ] Verify no architecture violations

- [ ] Task: Manual verification
  - [ ] Test all three locales
  - [ ] Test role filtering on mobile/desktop
  - [ ] Verify all links work
  - [ ] Check SEO metadata
  - [ ] Test page load performance
