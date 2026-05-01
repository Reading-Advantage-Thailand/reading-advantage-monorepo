# Plan: Product Page Structure Redesign

---

## Phase 1: Shared Components & Infrastructure [checkpoint: TBD]

### Task 1.1: Create OverlappingSection Component

- [x] Create `src/components/ui/overlapping-section.tsx`
- [x] Props: `children`, `background`, `overlapAmount` (default `-mt-20`), `topRadius` (default `rounded-t-[40px]`)
- [x] Wraps content in section with negative margin-top and rounded top corners
- [x] Support for both light and dark backgrounds
- [x] Run `npm run build`

### Task 1.2: Create FloatingPill Component

- [x] Create `src/components/ui/floating-pill.tsx`
- [x] Props: `value`, `label`, `variant` (color), `size` (lg/md/sm)
- [x] Pill-shaped container with generous horizontal padding
- [x] Large stat value + smaller label below
- [x] Support for brand color variants
- [x] Run `npm run build`

### Task 1.3: Create HorizontalStrip Component

- [x] Create `src/components/ui/horizontal-strip.tsx`
- [x] Props: `children`, `background`, `padding`
- [x] Full-bleed container with `overflow-x-auto` and `flex gap-6`
- [x] Hide scrollbar but maintain scroll functionality
- [x] Snap scrolling on mobile (`scroll-snap-type: x mandatory`)
- [x] Run `npm run build`

### Task 1.4: Create LargeImageBreak Component

- [x] Create `src/components/ui/large-image-break.tsx`
- [x] Props: `src`, `alt`, `overlayText`, `overlayPosition` (center/bottom-left/bottom-right)
- [x] Full-bleed image with `min-h-[60vh]`
- [x] Glassmorphism text overlay
- [x] Gradient overlay for text readability
- [x] Run `npm run build`

### Task 1.5: Create StepFlow Component

- [x] Create `src/components/ui/step-flow.tsx`
- [x] Props: `steps` array with `title`, `description`, `icon`
- [x] Horizontal layout with connecting lines between steps
- [x] Responsive: horizontal on desktop, vertical on mobile
- [x] Support for brand color accents
- [x] Run `npm run build`

### Task 1.6: Create FAQAccordion Component

- [x] Create `src/components/ui/faq-accordion.tsx`
- [x] Props: `items` array with `question`, `answer`
- [x] Expandable/collapsible with animated chevron rotation
- [x] Support for brand-colored borders/accents
- [x] Accessible: keyboard navigation, aria-expanded
- [x] Run `npm run build`

### Task 1.7: Update Card Component for Mixed Styles

- [x] Add `borderStyle` prop: `"solid" | "dashed" | "mixed"`
- [x] Add `padding` prop for varied internal spacing
- [x] Add `offset` prop for negative margin positioning
- [x] Ensure backward compatibility
- [x] Run `npm run build`

**Manual Verification — Phase 1:**

1. Check all new components render without errors
2. Verify responsive behavior of StepFlow and HorizontalStrip
3. Test FAQAccordion keyboard navigation
4. Run `npm run build` — confirm exit 0

---

## Phase 2: Reading Advantage (Flagship) [checkpoint: TBD]

### Task 2.1: Write Test for New Structure (Red Phase)

- [x] Update `src/app/[locale]/(marketing)/products/reading-advantage/page.test.tsx`
- [x] Assert horizontal game strip exists
- [x] Assert floating stat pills exist (not grid)
- [x] Assert overlapping sections exist
- [x] Run `npm test` — confirm fails (Red phase)

### Task 2.2: Restructure Platform Features Section

- [x] Convert to full-width dark sky color room
- [x] Asymmetric 8/4 layout: screenshots left, features right
- [x] Add uppercase label: "PLATFORM"
- [x] Use glassmorphism cards for device mockups
- [x] Run `npm run build`

### Task 2.3: Add Overlapping Blended Learning Section

- [x] Wrap in OverlappingSection with `rounded-t-[40px]`
- [x] Asymmetric 7/5 split with stacked images
- [x] Add dashed border container for Teacher Tools
- [x] Run `npm run build`

### Task 2.4: Add Horizontal Games Strip

- [x] Replace grid with HorizontalStrip component
- [x] Game cards: 300px wide with screenshots
- [x] Add uppercase label: "EDUCATIONAL GAMES"
- [x] Run `npm run build`

### Task 2.5: Convert Stats to Floating Pills

- [x] Replace 3-column grid with FloatingPill components
- [x] Asymmetric placement (left, center-right, right)
- [x] Add uppercase label: "RESULTS"
- [x] Run `npm run build`

### Task 2.6: Make Test Pass (Green Phase)

- [x] Run `npm test` — confirm passes
- [x] Run `npm run build` — confirm no errors

**Manual Verification — Phase 2:**

1. Open `/en/products/reading-advantage`
2. Verify horizontal game strip scrolls
3. Verify floating stat pills are asymmetric
4. Verify overlapping section creates depth
5. Check mobile at 375px

---

## Phase 3: Primary Advantage [checkpoint: TBD]

### Task 3.1: Write Test for New Structure

- [x] Create/update page test
- [x] Assert timeline/step CEFR display exists
- [x] Assert reversed 5/7 split exists
- [x] Run `npm test` — confirm fails

### Task 3.2: Add CEFR Timeline Section

- [x] Full-width cyan color room
- [x] Use StepFlow component for CEFR levels (Pre-A1 → B1)
- [x] Connected steps with descriptions
- [x] Uppercase label: "CURRICULUM ALIGNMENT"
- [x] Run `npm run build`

### Task 3.3: Add Reversed 5/7 Key Features

- [x] Image on LEFT (5 cols), text on RIGHT (7 cols)
- [x] Large rounded image with floating feature badges
- [x] Uppercase label: "KEY FEATURES"
- [x] Run `npm run build`

### Task 3.4: Add Rotated Image Grid

- [x] Overlapping section with `rounded-t-[40px]`
- [x] 2×3 screenshot grid (not cards)
- [x] Alternating rotation: -2deg, +2deg
- [x] Uppercase label: "PLATFORM IN ACTION"
- [x] Run `npm run build`

### Task 3.5: Convert Stats to Staggered Cards

- [x] 1 large stat card + 2 smaller supporting cards
- [x] Staggered vertical positioning
- [x] Uppercase label: "IMPACT"
- [x] Run `npm run build`

### Task 3.6: Make Test Pass

- [x] Run `npm test` — confirm passes
- [x] Run `npm run build`

---

## Phase 4: Math Advantage [checkpoint: TBD]

### Task 4.1: Write Test for New Structure

- [x] Create/update page test
- [x] Assert organic bubble cluster exists
- [x] Assert single deep-dive feature section exists
- [x] Run `npm test` — confirm fails

### Task 4.2: Add Organic Bubble Cluster

- [x] Full-width orange color room
- [x] 6 subject bubbles of varying sizes
- [x] Floating at different heights with `translate-y` offsets
- [x] Uppercase label: "SUBJECTS COVERED"
- [x] Run `npm run build`

### Task 4.3: Add Deep-Dive Feature Section

- [x] Asymmetric 7/5: text left, large mockup right
- [x] Focus on ONE feature with detailed explanation
- [x] Uppercase label: "SMART PROBLEM GENERATION"
- [x] Run `npm run build`

### Task 4.4: Add Benefits with Mixed Borders

- [x] Overlapping section
- [x] 2 large cards with alternating border styles (solid/dashed)
- [x] Uppercase label: "BENEFITS"
- [x] Run `npm run build`

### Task 4.5: Convert Stats to Central + Floating

- [x] Large central stat with 2 floating pill stats beside it
- [x] Uppercase label: "RESULTS"
- [x] Run `npm run build`

### Task 4.6: Make Test Pass

- [x] Run `npm test` — confirm passes
- [x] Run `npm run build`

---

## Phase 5: Science Advantage [checkpoint: TBD]

### Task 5.1: Write Test for New Structure

- [x] Create/update page test
- [x] Assert full-bleed image break exists
- [x] Assert editorial 2-column layout exists
- [x] Run `npm test` — confirm fails

### Task 5.2: Add Generous Value Cards

- [x] Full-width rose color room
- [x] 3 large cards with `rounded-[40px]` and generous padding
- [x] Uppercase label: "WHY SCIENCE ADVANTAGE"
- [x] Run `npm run build`

### Task 5.3: Add Full-Bleed Image Break

- [x] Use LargeImageBreak component with `science-advantage-hero.jpg`
- [x] Glassmorphism overlay with key message
- [x] Cinematic, editorial feel
- [x] Run `npm run build`

### Task 5.4: Add Asymmetric NGSS Features

- [x] Text left, vertical feature stack right
- [x] Large checkmark icons, not small dots
- [x] Uppercase label: "NGSS ALIGNED"
- [x] Run `npm run build`

### Task 5.5: Add Editorial Target Audience

- [x] 2-column cards (not 3) with spacious layout
- [x] Uppercase label: "BUILT FOR"
- [x] Run `npm run build`

### Task 5.6: Add Overlapping Waitlist Card

- [x] FAQ + email capture in overlapping card
- [x] `-mt-12` overlap from previous section
- [x] Run `npm run build`

### Task 5.7: Make Test Pass

- [x] Run `npm test` — confirm passes
- [x] Run `npm run build`

---

## Phase 6: STEM Advantage [checkpoint: TBD]

### Task 6.1: Write Test for New Structure

- [x] Create/update page test
- [x] Assert horizontal timeline exists
- [x] Assert oversized stat callout exists
- [x] Run `npm test` — confirm fails

### Task 6.2: Add Grade Level Timeline

- [x] Full-width indigo color room
- [x] Horizontal timeline with 3 grade levels
- [x] Animated connecting dot
- [x] Uppercase label: "GRADE LEVELS"
- [x] Run `npm run build`

### Task 6.3: Add Reversed Split with Oversized Stat

- [x] 5/7 reversed: illustration left, text right
- [x] "75%" as oversized display text (80px+)
- [x] Uppercase label: "75% CODING, 25% STEM"
- [x] Run `npm run build`

### Task 6.4: Add Benefits with Alternating Borders

- [x] Overlapping section on indigo background
- [x] 3 cards: solid border, dashed border, solid border
- [x] Uppercase label: "BENEFITS"
- [x] Run `npm run build`

### Task 6.5: Add Vertical Checklist

- [x] Single-column technical requirements
- [x] Large check icons, generous spacing between items
- [x] Uppercase label: "TECHNICAL REQUIREMENTS"
- [x] Run `npm run build`

### Task 6.6: Make Test Pass

- [x] Run `npm test` — confirm passes
- [x] Run `npm run build`

---

## Phase 7: Storytime Advantage [checkpoint: TBD]

### Task 7.1: Write Test for New Structure

- [x] Create/update page test
- [x] Assert staggered cards exist
- [x] Assert FAQ accordion exists
- [x] Run `npm test` — confirm fails

### Task 7.2: Add Overlapping Feature Cards

- [x] Full-width amber color room
- [x] 2 large cards with slight overlap (negative margin)
- [x] Uppercase label: "KEY FEATURES"
- [x] Run `npm run build`

### Task 7.3: Add Asymmetric K-3 Split

- [x] 7/5 split with decorative dashed-border frame around image
- [x] Frame offset by 8px from image
- [x] Uppercase label: "K-3 CURRICULUM"
- [x] Run `npm run build`

### Task 7.4: Add Staggered Teacher Resources

- [x] Overlapping section
- [x] 3 cards with middle card offset by 20px downward
- [x] Uppercase label: "TEACHER RESOURCES"
- [x] Run `npm run build`

### Task 7.5: Add FAQ Accordion

- [x] FAQAccordion component with amber accents
- [x] 4-5 questions about the platform
- [x] Uppercase label: "FREQUENTLY ASKED QUESTIONS"
- [x] Run `npm run build`

### Task 7.6: Make Test Pass

- [x] Run `npm test` — confirm passes
- [x] Run `npm run build`

---

## Phase 8: Zhongwen Advantage [checkpoint: TBD]

### Task 8.1: Write Test for New Structure

- [x] Create/update page test
- [x] Assert level mapping visualization exists
- [x] Assert combined FAQ/waitlist section exists
- [x] Run `npm test` — confirm fails

### Task 8.2: Add Dual-Level Mapping

- [x] Full-width fuchsia color room
- [x] Connected mapping: Reading Advantage levels → HSK levels
- [x] Visual connection lines between levels
- [x] Uppercase label: "LEVEL MAPPING"
- [x] Run `npm run build`

### Task 8.3: Add Calligraphy Image Break

- [x] LargeImageBreak with `zhongwen-advantage-hero.jpg`
- [x] Feature highlights in glassmorphism overlay
- [x] Run `npm run build`

### Task 8.4: Add Editorial Interactive Learning

- [x] 7/5 split with 2 large stacked cards on right
- [x] Cards have `rounded-[40px]` and generous padding
- [x] Uppercase label: "INTERACTIVE LEARNING"
- [x] Run `npm run build`

### Task 8.5: Add Combined FAQ + Waitlist

- [x] FAQ accordion above waitlist form
- [x] Both in same container with fuchsia accents
- [x] Uppercase label: "QUESTIONS?"
- [x] Run `npm run build`

### Task 8.6: Make Test Pass

- [x] Run `npm test` — confirm passes
- [x] Run `npm run build`

---

## Phase 9: Tutor Advantage [checkpoint: TBD]

### Task 9.1: Write Test for New Structure

- [x] Create/update page test
- [x] Assert horizontal process flow exists
- [x] Assert floating testimonials exist
- [x] Run `npm test` — confirm fails

### Task 9.2: Add Process Flow

- [x] Full-width emerald color room
- [x] StepFlow: "Assess → Personalize → Progress"
- [x] Uppercase label: "THE PROCESS"
- [x] Run `npm run build`

### Task 9.3: Add Reversed Mockup Split

- [x] 5/7 reversed: screenshot left (with subtle rotation), text right
- [x] Uppercase label: "AI-POWERED PERSONALIZATION"
- [x] Run `npm run build`

### Task 9.4: Add Hexagonal Feature Grid

- [x] Overlapping section
- [x] 6 features in 2 rows with varied padding
- [x] Creates "hexagonal" feel through spacing
- [x] Uppercase label: "PLATFORM FEATURES"
- [x] Run `npm run build`

### Task 9.5: Add Floating Testimonials

- [x] 3 testimonial cards at different heights
- [x] Glassmorphism on emerald background
- [x] Uppercase label: "TRUSTED BY EDUCATORS"
- [x] Run `npm run build`

### Task 9.6: Add Combined Stats + CTA

- [x] Stats and CTA button in unified section
- [x] Not separate sections
- [x] Uppercase label: "READY TO START?"
- [x] Run `npm run build`

### Task 9.7: Make Test Pass

- [x] Run `npm test` — confirm passes
- [x] Run `npm run build`

---

## Phase 10: CodeCamp Advantage [checkpoint: TBD]

### Task 10.1: Write Test for New Structure

- [x] Create/update page test
- [x] Assert dark tech track cards exist
- [x] Assert horizontal tech strip exists
- [x] Run `npm test` — confirm fails

### Task 10.2: Add Dark Tech Tracks

- [x] Full-width dark slate room
-   - 3 track cards with amber accents
- [x] Monospace labels, bracket decorations `[ ]`
- [x] Uppercase label: "TRACKS" (in monospace font)
- [x] Run `npm run build`

### Task 10.3: Add Project Showcase Split

- [x] 7/5 split: text left, project cards right
- [x] Cards show "Code → Result" concept
- [x] Uppercase label: "PROJECT-BASED LEARNING"
- [x] Run `npm run build`

### Task 10.4: Add Horizontal Tech Strip

- [x] Full-bleed horizontal scrolling strip
- [x] Technology icons/logos on dark background
- [x] Uppercase label: "TECH STACK"
- [x] Run `npm run build`

### Task 10.5: Add Border-Left Feature Cards

- [x] Overlapping section on white background
- [x] 2 large cards with `border-l-4 border-amber-500`
- [x] Code snippet styling
- [x] Uppercase label: "KEY FEATURES"
- [x] Run `npm run build`

### Task 10.6: Make Test Pass

- [x] Run `npm test` — confirm passes
- [x] Run `npm run build`

---

## Phase 11: Cross-Page Consistency & QA [checkpoint: TBD]

### Task 11.1: Verify Layout Uniqueness

- [x] Open all 9 product pages side-by-side
- [x] Confirm no two pages share the same section sequence
- [x] Confirm each has at least one unique pattern
- [x] Document any similarities that need breaking

### Task 11.2: Verify Section Requirements

- [x] Count full-width color rooms per page (should be ≥2 each)
- [x] Count asymmetric 5/7 splits (should be ≥3 across all pages)
- [x] Count overlapping sections (should be ≥2)
- [x] Count horizontal strips (should be ≥2)
- [x] Verify full-bleed image breaks exist (Science, Zhongwen)
- [x] Verify FAQ accordion exists (Storytime)
- [x] Verify timeline/step flow exists (STEM, Tutor)
- [x] Verify dashed borders on secondary containers (≥3 pages)

### Task 11.3: Mobile Responsiveness Check

- [x] Test each page at 375px viewport
- [x] Confirm horizontal strips scroll correctly
- [x] Confirm overlapping sections don't break layout
- [x] Confirm asymmetric splits stack properly
- [x] Test at 768px (tablet) and 1024px (desktop)

### Task 11.4: Visual Polish

- [x] Ensure all uppercase labels use `tracking-widest text-xs font-semibold uppercase`
- [x] Ensure all cards have `rounded-3xl` minimum
- [x] Ensure all section containers have `rounded-[40px]` where applicable
- [x] Ensure consistent padding rhythm across pages
- [x] Fix any visual inconsistencies

### Task 11.5: Build & Test Verification

- [x] Run `npm test` — confirm all tests pass
- [x] Run `npm run build` — confirm exits 0
- [x] Run `npm run i18n:verify` — confirm exits 0
- [x] Review test coverage

### Task 11.6: Accessibility Check

- [x] Verify FAQ accordion keyboard navigation works
- [x] Verify horizontal strips are keyboard-scrollable
- [x] Confirm focus indicators on all interactive elements
- [x] Check color contrast on all sections

**Manual Verification — Phase 11:**

1. Systematic review of all 9 product pages
2. Confirm each page has unique personality
3. Test all breakpoints
4. Verify all i18n locales work
5. Confirm all tests pass
6. Final visual walkthrough

---

## Final Acceptance

Before marking this track complete:

- [x] All acceptance criteria from spec.md are met
- [x] All phases completed and verified
- [x] No two pages share identical structure
- [x] Every page has ≥2 full-width color rooms
- [x] Every page has at least one unique layout pattern
- [x] `npm run i18n:verify` exits 0
- [x] `npm run build` exits 0
- [x] `npm test` passes
- [x] Mobile layouts verified at 375px
- [x] Documentation updated (tracks.md)
- [x] Ready for review
