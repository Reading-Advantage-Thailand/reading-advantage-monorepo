# Specification: Tablet & Mobile Responsiveness

## Overview

The product guidelines state the app must work on "laptops and tablets in classroom usage." The current implementation has no mobile navigation pattern (no hamburger menu, no responsive nav collapse), minimal responsive layouts, and no touch-optimized targets. The horizontal nav squeezes on narrow screens. This track makes the app work properly on tablets and phones.

## Functional Requirements

### 1. Responsive Navigation Shell
- Create a `MobileNav` component: hamburger menu icon on mobile/tablet that opens a slide-out sheet/drawer with navigation links
- On desktop (>= 1024px): show the current horizontal nav as-is
- On tablet (768px-1023px): collapse nav into hamburger, keep logo and user menu visible
- On mobile (< 768px): full hamburger menu with logo, nav links, and user menu items
- The mobile menu must be keyboard-accessible and trap focus when open

### 2. Role-Group Layout Responsiveness
- Update all four role-group layouts (`(student)`, `(teacher)`, `(admin)`, `(system)`) to use the responsive nav shell
- Main content area: reduce padding on mobile (`px-4 sm:px-6 lg:px-8`)
- Ensure all page content stacks vertically on mobile (no horizontal overflow)

### 3. Touch-Friendly Targets
- All interactive elements (buttons, links, nav items) must have minimum 44x44px touch targets
- Increase spacing between clickable items in lists and tables on mobile
- Quiz question options must be large enough to tap comfortably on a tablet

### 4. Dashboard Card Responsiveness
- Student dashboard: cards stack to single column on mobile, 2 columns on tablet, original grid on desktop
- Teacher dashboard: same responsive card stacking
- Class cards: full-width on mobile, 2-column on tablet, 3-column on desktop

### 5. Lesson Viewer Mobile Optimization
- Lesson content blocks must not overflow horizontally on mobile (code blocks, tables, images)
- Vocabulary flashcards must be swipeable on mobile (touch gestures for carousel mode)
- Quiz navigation (Previous/Next) must be fixed at the bottom of the viewport on mobile
- Progress indicator must remain visible during scroll

### 6. Analytics Tables Mobile Layout
- Teacher analytics tables must switch to a card-based layout on mobile (each row becomes a card)
- Sort controls must be accessible via a dropdown on mobile instead of column header clicks
- Student detail analytics must stack sections vertically

## Non-Functional Requirements

- All pages must pass Google Lighthouse mobile accessibility audit (score >= 90)
- No horizontal scroll on any page at 375px width (iPhone SE)
- Touch targets must meet WCAG 2.5.5 Target Size (Level AAA) at 44x44px
- Navigation transition (sheet open/close) must complete in under 300ms
- The app must be usable in both portrait and landscape orientation on tablets

## Acceptance Criteria

1. On mobile (< 768px), navigation collapses into a hamburger menu that opens a sheet
2. On tablet (768-1023px), navigation uses the hamburger menu
3. On desktop (>= 1024px), navigation remains horizontal as-is
4. All pages render without horizontal overflow at 375px width
5. Touch targets are minimum 44x44px on all interactive elements
6. Dashboard cards stack responsively across breakpoints
7. Vocabulary flashcards support touch swipe on mobile
8. Analytics tables convert to card layout on mobile
9. Lighthouse mobile accessibility score >= 90

## Out of Scope

- Native mobile app (React Native / Expo)
- Offline support or service worker caching
- Push notifications
- Camera or device sensor integration
