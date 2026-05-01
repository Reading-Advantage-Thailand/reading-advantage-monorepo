# Implementation Plan

## Phase 1: Responsive Navigation Shell

- [ ] Task: Build MobileNav component
  - [ ] Write tests for mobile nav open/close, keyboard accessibility, focus trapping
  - [ ] Create `MobileNav` component with hamburger button and slide-out sheet
  - [ ] Use shadcn Sheet component (or build minimal drawer) for the slide-out panel
  - [ ] Include logo, role-appropriate nav links, and user menu items in the sheet
  - [ ] Implement focus trap when menu is open (Tab cycles within the sheet)
  - [ ] Close menu on route change
- [ ] Task: Update role-group layouts for responsive nav
  - [ ] Modify `(student)/layout.tsx` to use `MobileNav` on tablet/mobile
  - [ ] Modify `(teacher)/layout.tsx` to use `MobileNav`
  - [ ] Modify `(admin)/layout.tsx` to use `MobileNav`
  - [ ] Modify `(system)/layout.tsx` to use `MobileNav`
  - [ ] Keep horizontal nav on desktop (>= 1024px), switch to hamburger on tablet/mobile
- [ ] Task: Measure - Manual Verification 'Responsive Nav'
  - [ ] Verify hamburger menu appears at 768px and below
  - [ ] Verify sheet opens/closes with animation
  - [ ] Verify keyboard navigation works (Escape to close, Tab to cycle)

## Phase 2: Layout and Content Responsiveness

- [ ] Task: Update main content areas for responsive padding
  - [ ] Change `container mx-auto px-4 py-8` to responsive padding: `px-4 sm:px-6 lg:px-8`
  - [ ] Apply across all role-group layouts
- [ ] Task: Make dashboard cards responsive
  - [ ] Update student dashboard card grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-4`
  - [ ] Update teacher dashboard card grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`
  - [ ] Ensure cards have proper spacing on mobile (gap-4 or gap-6)
- [ ] Task: Make tables responsive
  - [ ] Write tests for card-based table layout on mobile
  - [ ] Create `ResponsiveTable` wrapper component that switches to card layout at < 768px
  - [ ] Apply to teacher analytics tables (class overview, lesson detail, student detail)
  - [ ] Sort controls become a dropdown on mobile instead of column headers
- [ ] Task: Fix horizontal overflow on mobile
  - [ ] Audit all pages at 375px width for horizontal scroll
  - [ ] Fix any overflow: code blocks get `overflow-x-auto`, images get `max-w-full`, tables get responsive treatment
  - [ ] Ensure lesson content blocks don't overflow (text wrapping, image scaling)
- [ ] Task: Measure - Manual Verification 'Layout'
  - [ ] Verify no horizontal scroll at 375px on all major pages
  - [ ] Verify dashboard cards stack on mobile
  - [ ] Verify analytics tables convert to cards on mobile

## Phase 3: Touch and Interaction Optimization

- [ ] Task: Increase touch targets
  - [ ] Audit all interactive elements for 44x44px minimum
  - [ ] Update buttons, nav links, and form inputs that are too small
  - [ ] Add min-h-[44px] and min-w-[44px] where needed
- [ ] Task: Optimize lesson viewer for touch
  - [ ] Add touch swipe support to vocabulary flashcard carousel (using touch event handlers)
  - [ ] Fix quiz navigation to be thumb-friendly on mobile (larger buttons, bottom-anchored)
  - [ ] Ensure quiz options are large enough to tap (min 44px height)
- [ ] Task: Add tablet landscape support
  - [ ] Verify layouts work in landscape orientation (1024x768)
  - [ ] Adjust grid breakpoints if needed for landscape tablets
- [ ] Task: Measure - Manual Verification 'Touch'
  - [ ] Verify touch swipe works on vocabulary flashcards
  - [ ] Verify quiz navigation is comfortable on mobile
  - [ ] Verify all buttons are tappable at 44x44px minimum
- [ ] Task: Run Lighthouse audit
  - [ ] Run Lighthouse mobile accessibility audit
  - [ ] Fix any issues to achieve score >= 90
  - [ ] Document final score
