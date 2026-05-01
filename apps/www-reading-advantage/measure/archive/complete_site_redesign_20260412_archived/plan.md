# Plan: Complete Site Redesign

---

## Phase 1: Design System Setup & Infrastructure [checkpoint: 0c9431e]

### Task 1.1: Update Tailwind Configuration with Design Tokens

- [x] Add custom colors to `tailwind.config.ts`: warm-cream, oat-border, all product brand colors (sky, cyan, orange, rose, indigo, amber, fuchsia, emerald, slate)
- [x] Add custom box shadows: clay-shadow, hard-offset-shadow
- [x] Add custom font family: roobert, space-mono
- [x] Verify tailwindcss-animate is installed and configured
- [x] Run `npm run build` — confirm no config errors

### Task 1.2: Create/Update Shared Button Components

- [x] Create `src/components/ui/Button.tsx` if not exists
- [x] Implement variants: primary, secondary, ghost, outlined
- [x] Apply playful hover: `rotateZ(-8deg)`, `translateY(-80%)`, hard shadow `-7px 7px`
- [x] Use Roobert 16px weight 500 with 4 stylistic sets
- [x] Focus ring: `rgb(20, 110, 245) solid 2px`
- [x] Test all button variants in storybook or dev environment

### Task 1.3: Create/Update Shared Card Components

- [x] Create `src/components/ui/Card.tsx` if not exists
- [x] Implement variants: standard (12px radius), feature (24px radius)
- [x] White background, oat border `1px solid #dad4c8`
- [x] Clay shadow: `rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px`
- [x] Hover animation: `hover:-translate-y-3 transition-all duration-300`
- [x] Test card variants

### Task 1.4: Redesign Navigation/Header Component

- [x] Find header/nav component (likely in `src/components/` or layout)
- [x] Set background to warm cream (`#faf9f7`)
- [x] Add oat border bottom: `border-b border-[#dad4c8]`
- [x] Apply Roobert 15px weight 500 to nav links
- [x] Update CTA buttons to use new Button component
- [x] Ensure sticky positioning
- [x] Test mobile hamburger collapse at 767px
- [x] Remove any Framer Motion animations

### Task 1.5: Redesign Footer Component

- [x] Find footer component (likely in layout or `src/components/`)
- [x] Apply 40px radius to container
- [x] Warm cream or appropriate background
- [x] Oat borders: `border border-[#dad4c8]`
- [x] Roobert typography with appropriate stylistic sets
- [x] Test responsive behavior

**Manual Verification — Phase 1:**

1. Run `npm run dev`
2. Check that all new components render without errors
3. Verify button hover animations work (rotation + hard shadow)
4. Check card shadows and borders
5. Verify nav and footer styling
6. Run `npm run build` — confirm exit 0

---

## Phase 2: Homepage Redesign [checkpoint: f55485c]

### Task 2.1: Write Test for Homepage (Red Phase)

- [x] Create `src/app/[locale]/(marketing)/page.test.tsx`
- [x] Write test asserting main heading and key sections are present
- [x] Run `npm test` — confirm test runs (may fail)

### Task 2.2: Redesign Homepage Hero Section

- [x] Remove Framer Motion imports
- [x] Set page background to warm cream (`#faf9f7`)
- [x] Build inline hero with Sky 300/400 gradient (Reading Advantage brand color)
- [x] Apply Roobert 80px weight 600 with all 5 stylistic sets to headline
- [x] Subtitle at 20px weight 400, line-height 1.60, #9f9b93 text
- [x] Use new Button components with playful hover
- [x] Add Reading Advantage logo to hero

### Task 2.3: Redesign Homepage Feature/Content Sections

- [x] Update all sections to use warm cream backgrounds or product brand colors
- [x] Replace generic cards with new Card components
- [x] Apply Roobert typography with correct stylistic sets
- [x] Ensure all borders are oat tones (`#dad4c8`)
- [x] Remove Framer Motion, use `tailwindcss-animate`
- [x] Add appropriate spacing (`py-24` to `py-32`)

### Task 2.4: Redesign Homepage Stats/Results Section

- [x] Use dark gradient with Sky 900 background
- [x] White text on dark, Sky 300 for accent text
- [x] 3-column grid for stats
- [x] Apply proper typography

### Task 2.5: Make Homepage Test Pass (Green Phase)

- [x] Run `npm test` — confirm homepage test passes
- [x] Run `npm run build` — confirm no TypeScript errors
- [x] Check for any Framer Motion imports remaining

**Manual Verification — Phase 2:**

1. Open `/en/` homepage in browser
2. Confirm warm cream background
3. Verify Sky gradient hero with Reading Advantage logo
4. Check button hover animations (rotation + hard shadow)
5. Verify card styling (24px radius, oat borders, clay shadow)
6. Check Roobert typography with stylistic sets
7. Test mobile (375px) — confirm responsive layout
8. Test Thai (`/th/`) and Chinese (`/zh/`) — confirm translations
9. Check browser console — no JavaScript errors

---

## Phase 3: Product Pages Redesign — Group 1 (Reading & Primary) [checkpoint: 9868795]

### Task 3.1: Fix Reading Advantage Page

- [x] Check current implementation (`src/app/[locale]/(marketing)/products/reading-advantage/page.tsx`)
- [x] Update hero gradient to correct Sky 300/400/900 brand colors
- [x] Ensure Reading Advantage logo is prominently displayed
- [x] Remove any Framer Motion imports
- [x] Update all cards to use new Card component
- [x] Apply Roobert typography with stylistic sets
- [x] Replace emoji icons with `lucide-react`
- [x] Update animations to `tailwindcss-animate`

### Task 3.2: Fix Primary Advantage Page

- [x] Check current implementation (`src/app/[locale]/(marketing)/products/primary-advantage/page.tsx`)
- [x] Update hero gradient to correct Cyan 300/400/800 brand colors
- [x] Ensure Primary Advantage logo is prominently displayed
- [x] Remove any Framer Motion imports
- [x] Update all cards to use new Card component
- [x] Apply Roobert typography with stylistic sets
- [x] Replace emoji icons with Lucide equivalents
- [x] Update animations to `tailwindcss-animate`

### Task 3.3: Write and Pass Tests for Both Pages

- [x] Create `src/app/[locale]/(marketing)/products/reading-advantage/page.test.tsx`
- [x] Create `src/app/[locale]/(marketing)/products/primary-advantage/page.test.tsx`
- [x] Write tests asserting main headings and logos are present
- [x] Run `npm test` — confirm both tests pass
- [x] Run `npm run build` — confirm no errors

**Manual Verification — Phase 3:**

1. Open `/en/products/reading-advantage` — verify Sky gradient + logo
2. Open `/en/products/primary-advantage` — verify Cyan gradient + logo
3. Check both pages for proper button hover animations
4. Verify card styling on both pages
5. Test both pages in TH and ZH locales
6. Check mobile responsiveness

---

## Phase 4: Product Pages Redesign — Group 2 (Math, Science, STEM)

### Task 4.1: Redesign Math Advantage Page

- [ ] Create `src/app/[locale]/(marketing)/products/math-advantage/page.test.tsx` (failing test)
- [ ] Remove Framer Motion, build inline hero with Orange 300/400/800 gradient (logo color)
- [ ] Add product logo in hero section
- [ ] Replace emoji icons with Lucide equivalents
- [ ] Update all cards to use new Card component
- [ ] Apply Roobert typography with stylistic sets
- [ ] Run `npm test` — Green phase

### Task 4.2: Redesign Science Advantage Page

- [ ] Create `src/app/[locale]/(marketing)/products/science-advantage/page.test.tsx` (failing test)
- [ ] Remove Framer Motion, build inline hero with Rose 300/400/800 gradient (logo color)
- [ ] Add product logo in hero section
- [ ] Replace emoji icons with Lucide equivalents
- [ ] Update all cards to use new Card component
- [ ] Apply Roobert typography with stylistic sets
- [ ] Run `npm test` — Green phase

### Task 4.3: Redesign STEM Advantage Page

- [ ] Create `src/app/[locale]/(marketing)/products/stem-advantage/page.test.tsx` (failing test)
- [ ] Remove Framer Motion, build inline hero with Indigo 300/400/800 gradient (logo color)
- [ ] Add product logo in hero section
- [ ] Replace emoji icons with Lucide equivalents
- [ ] Update all cards to use new Card component
- [ ] Apply Roobert typography with stylistic sets
- [ ] Run `npm test` — Green phase

**Manual Verification — Phase 4:**

1. Open each of the three pages in `/en/`, `/th/`, `/zh/` locales
2. Confirm correct logo-based hero gradients (orange, rose, indigo)
3. Confirm product logos are visible
4. Confirm no emoji icons, all Lucide
5. Check button hover animations
6. Test mobile (375px) for all three
7. Check browser console — no errors

---

## Phase 5: Product Pages Redesign — Group 3 (Storytime, Zhongwen, Tutor)

### Task 5.1: Redesign Storytime Advantage Page

- [ ] Create `src/app/[locale]/(marketing)/products/storytime-advantage/page.test.tsx` (failing test)
- [ ] Remove Framer Motion, build inline hero with Amber 300/400/800 gradient (logo color)
- [ ] Add product logo in hero section
- [ ] Replace emoji icons with Lucide equivalents
- [ ] Update all cards to use new Card component
- [ ] Apply Roobert typography with stylistic sets
- [ ] Run `npm test` — Green phase

### Task 5.2: Redesign Zhongwen Advantage Page

- [ ] Create `src/app/[locale]/(marketing)/products/zhongwen-advantage/page.test.tsx` (failing test)
- [ ] Remove Framer Motion, build inline hero with Fuchsia 300/400/800 gradient (logo color)
- [ ] Add product logo in hero section
- [ ] Replace emoji icons with Lucide equivalents
- [ ] Update all cards to use new Card component
- [ ] Apply Roobert typography with stylistic sets
- [ ] Run `npm test` — Green phase

### Task 5.3: Redesign Tutor Advantage Page

- [ ] Create `src/app/[locale]/(marketing)/products/tutor-advantage/page.test.tsx` (failing test)
- [ ] Remove Framer Motion, build inline hero with Emerald 300/400/800 gradient (logo color)
- [ ] Add product logo in hero section
- [ ] Replace emoji icons with Lucide equivalents
- [ ] Update all cards to use new Card component
- [ ] Apply Roobert typography with stylistic sets
- [ ] Run `npm test` — Green phase

**Manual Verification — Phase 5:**

1. Open each of the three pages in `/en/`, `/th/`, `/zh/` locales
2. Confirm correct logo-based hero gradients (amber, fuchsia, emerald)
3. Confirm product logos are visible
4. Confirm no emoji icons, all Lucide
5. Check button hover animations
6. Test mobile (375px) for all three
7. Check browser console — no errors

---

## Phase 6: Product Pages Redesign — Group 4 (CodeCamp)

### Task 6.1: Redesign CodeCamp Advantage Page

- [ ] Confirm CodeCamp logo colors (TODO: verify if slate is correct)
- [ ] Create `src/app/[locale]/(marketing)/products/codecamp-advantage/page.test.tsx` (failing test)
- [ ] Remove Framer Motion, build inline hero with Slate 700/800/900 gradient
- [ ] Add product logo in hero section
- [ ] Replace emoji icons with Lucide equivalents
- [ ] Update all cards to use new Card component
- [ ] Apply Roobert typography with stylistic sets
- [ ] Run `npm test` — Green phase

**Manual Verification — Phase 6:**

1. Open `/en/products/codecamp-advantage` in browser
2. Confirm Slate gradient hero (or correct logo color if different)
3. Confirm product logo is visible
4. Confirm no emoji icons, all Lucide
5. Check button hover animations
6. Test mobile (375px)
7. Check browser console — no errors

---

## Phase 7: Products Overview Page Redesign

### Task 7.1: Redesign Products Overview Page

- [ ] Find and open `/products` overview page
- [ ] Set background to warm cream (`#faf9f7`)
- [ ] Create card grid for all 9 products
- [ ] Each card shows: product logo, name, short description, correct brand color accent
- [ ] Apply new Card component to each product card
- [ ] Add hover animations to cards
- [ ] Ensure links to individual product pages work
- [ ] Apply Roobert typography
- [ ] Remove Framer Motion

**Manual Verification — Phase 7:**

1. Open `/en/products` in browser
2. Confirm all 9 products displayed
3. Verify each card has correct brand color and logo
4. Check hover animations on cards
5. Click each card — confirm links to correct product page
6. Test mobile (375px) — confirm grid collapses appropriately

---

## Phase 8: Other Marketing Pages (About, Contact, Blog)

### Task 8.1: Redesign About Page

- [ ] Find About page (`/about`)
- [ ] Apply warm cream background
- [ ] Use new Button and Card components
- [ ] Apply Roobert typography with stylistic sets
- [ ] Use oat borders, proper spacing
- [ ] Remove Framer Motion
- [ ] Ensure all i18n content preserved

### Task 8.2: Redesign Contact Page

- [ ] Find Contact page (`/contact`)
- [ ] Apply warm cream background
- [ ] Use new Button and Card components
- [ ] Update form inputs: border `1px solid #717989`, radius 4px, focus ring `rgb(20, 110, 245) solid 2px`
- [ ] Apply Roobert typography with stylistic sets
- [ ] Remove Framer Motion
- [ ] Ensure all i18n content preserved

### Task 8.3: Redesign Blog Pages (if applicable)

- [ ] Check if blog exists under `/blog`
- [ ] Apply warm cream background to blog listing and individual posts
- [ ] Use new Button and Card components for post cards
- [ ] Apply Roobert typography with stylistic sets
- [ ] Remove Framer Motion
- [ ] Ensure all i18n content preserved

**Manual Verification — Phase 8:**

1. Open About page — verify design consistency
2. Open Contact page — verify form styling and buttons
3. If blog exists, open blog listing and individual posts
4. Test all pages in TH and ZH locales
5. Check mobile responsiveness

---

## Phase 9: Cross-Page Consistency & Quality Assurance

### Task 9.1: Visual Consistency Review

- [ ] Open all pages side-by-side (or systematically review each)
- [ ] Confirm all pages use warm cream (`#faf9f7`) background
- [ ] Confirm all borders are oat tones (`#dad4c8`) — no neutral gray
- [ ] Confirm all headings use Roobert with 5 stylistic sets
- [ ] Confirm all buttons have playful hover animations
- [ ] Confirm all cards have proper shadows and radius
- [ ] Confirm all product pages have correct brand colors and logos
- [ ] Fix any inconsistencies found

### Task 9.2: Remove All Framer Motion

- [ ] Search entire codebase for `from "framer-motion"` and `motion.`
- [ ] Remove all Framer Motion imports
- [ ] Replace all `motion.*` components with standard HTML/React elements
- [ ] Replace all Framer Motion animations with `tailwindcss-animate`
- [ ] Confirm `package.json` can remove framer-motion if unused elsewhere

### Task 9.3: Remove All Emoji Icons

- [ ] Search all page files for emoji characters used as icons
- [ ] Replace all emoji with appropriate `lucide-react` icons
- [ ] Confirm no emoji remain as decorative icons

### Task 9.4: Mobile Responsiveness Check

- [ ] Test each page at 375px viewport (mobile)
- [ ] Confirm hero sections stack correctly
- [ ] Confirm grids collapse to single column
- [ ] Confirm navigation hamburger works
- [ ] Test at 768px (tablet)
- [ ] Test at 1024px (small desktop)
- [ ] Fix any layout issues found

### Task 9.5: Cross-Browser Testing

- [ ] Test homepage and key pages in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari (if on Mac) or verify CSS compatibility
- [ ] Test in Edge
- [ ] Fix any browser-specific issues

### Task 9.6: i18n Verification

- [ ] Run `npm run i18n:verify` — confirm exits 0
- [ ] Visit each page in `/th/` (Thai) — confirm translations render
- [ ] Visit each page in `/zh/` (Chinese) — confirm translations render
- [ ] Check for any missing translation keys

### Task 9.7: Full Test Suite

- [ ] Run `npm test` — confirm all tests pass
- [ ] Review test coverage — aim for >80%
- [ ] Add tests for any critical paths not covered

### Task 9.8: Build Verification

- [ ] Run `npm run build` — confirm exits 0
- [ ] Review build output for any warnings
- [ ] Check TypeScript strict mode compliance
- [ ] Fix any build errors or warnings

### Task 9.9: Performance & Accessibility

- [ ] Run Lighthouse on homepage — aim for ≥85
- [ ] Run Lighthouse on a product page — aim for ≥85
- [ ] Check WCAG 2.1 AA color contrast on all sections
- [ ] Verify focus indicators on all interactive elements
- [ ] Fix any performance or accessibility issues

**Manual Verification — Phase 9:**

1. Complete systematic review of all pages
2. Confirm no Framer Motion remains
3. Confirm no emoji icons remain
4. Test all breakpoints (375px, 768px, 1024px, 1440px)
5. Test in multiple browsers
6. Verify all i18n locales work
7. Confirm all tests pass
8. Confirm build succeeds
9. Confirm Lighthouse scores ≥85
10. Final visual walkthrough of entire site

---

## Final Acceptance

Before marking this track complete:

- [ ] All acceptance criteria from spec.md are met
- [ ] All phases completed and verified
- [ ] No open issues or regressions
- [ ] Documentation updated if needed (README, etc.)
- [ ] Ready for review
