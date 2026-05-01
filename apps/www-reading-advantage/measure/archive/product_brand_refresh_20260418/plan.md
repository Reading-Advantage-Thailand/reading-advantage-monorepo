# Plan: Product Brand Refresh

---

## Phase 1: Cleanup Clay Artifacts & Shared Components [checkpoint: TBD]

### Task 1.1: Audit and Remove Clay Design Tokens from Tailwind Config

- [x] Open `tailwind.config.ts`
- [x] Remove `warm-cream`, `oat-border`, `oat-light` colors (if they exist as custom tokens)
- [x] Remove `shadow-clay`, `shadow-hard-offset` custom shadows
- [x] Remove `roobert`, `space-mono` font families (Geist is already the project default)
- [x] Verify build still passes: `npm run build`

### Task 1.2: Fix Button Component

- [x] Open `src/components/ui/button.tsx`
- [x] Remove all `clay*` variants (`clay`, `clay-white`, `clay-ghost`)
- [x] Remove invalid `hover:rotate-z-[-8deg]` classes
- [x] Remove `hover:-translate-y-[80%]` transforms
- [x] Standardize hover: `hover:-translate-y-1 hover:shadow-lg transition-all duration-300`
- [x] Ensure existing variants (primary, secondary, ghost, white) use subtle, consistent hover states
- [x] Run `npm run build` — confirm no config errors

### Task 1.3: Fix Card Component

- [x] Open `src/components/ui/card.tsx`
- [x] Remove `shadow-clay`, `shadow-hard-offset`
- [x] Replace with standard Tailwind shadows: `shadow-lg`, `hover:shadow-xl`
- [x] Remove `border-oat-border` → use `border-sky-100` or `border-white/20`
- [x] Ensure glassmorphism classes are available where needed (`bg-white/90 backdrop-blur-md`)
- [x] Run `npm run build`

### Task 1.4: Update Global Styles

- [x] Open `src/app/[locale]/globals.css`
- [x] Remove any `.modern-card` or clay-specific utility classes
- [x] Ensure body background is `bg-sky-50` or `bg-slate-50` consistently
- [x] Verify no warm cream color references in CSS

**Manual Verification — Phase 1:**

1. Run `npm run dev`
2. Check that buttons have subtle hover lift (not rotation)
3. Check card shadows are standard Tailwind
4. Run `npm run build` — confirm exit 0

---

## Phase 2: HeroSection Component Enhancement [checkpoint: TBD]

### Task 2.1: Write Test for HeroSection Logo Support (Red Phase)

- [x] Create or update `src/components/marketing/hero-section.test.tsx`
- [x] Write test asserting HeroSection renders logo image when `productLogo` prop is provided
- [x] Write test asserting logo is positioned correctly (right side on desktop)
- [x] Run `npm test` — confirm test fails (Red phase)

### Task 2.2: Implement Logo Support in HeroSection (Green Phase)

- [x] Open `src/components/marketing/hero-section.tsx`
- [x] Add optional `productLogo` prop: `{ src: string; alt: string }`
- [x] Render logo image in a 7/5 or 6/6 asymmetric layout:
  - Left: text content (title, description, CTA)
  - Right: product logo with `rounded-3xl shadow-2xl`
- [x] Mobile: stack vertically, logo centered below CTA
- [x] Add animation: `animate-in fade-in slide-in-from-right-8 duration-1000`
- [x] Logo container: `bg-white/20 backdrop-blur-sm rounded-3xl p-4` for glassmorphism effect
- [x] Run `npm test` — confirm passes (Green phase)

### Task 2.3: Refactor and Polish

- [x] Ensure HeroSection maintains backward compatibility (pages without `productLogo` still work)
- [x] Verify responsive behavior at 375px, 768px, 1024px
- [x] Run `npm run build`

**Manual Verification — Phase 2:**

1. Temporarily add a logo to one page to test the component
2. Verify logo appears on the right side at desktop width
3. Verify logo stacks below text at mobile width
4. Check animation plays on page load

---

## Phase 3: Product Pages — Batch 1 (Reading, Primary, Math) [checkpoint: TBD]

### Task 3.1: Fix Reading Advantage Page

- [x] Open `src/app/[locale]/(marketing)/products/reading-advantage/page.tsx`
- [x] Update hero gradient to exact spec: `from-sky-400 to-sky-900` (#38bdf8 → #0c4a6e)
- [x] Add `productLogo={{ src: "/reading-advantage.jpg", alt: "Reading Advantage Logo" }}` to HeroSection
- [x] Remove all `bg-warm-cream` → `bg-sky-50` or `bg-white`
- [x] Remove all `font-roobert`
- [x] Remove all `border-oat-border` → `border-sky-100`
- [x] Standardize all cards to glassmorphism (`bg-white/90 backdrop-blur-md border-white/20` on dark sections)
- [x] Standardize all buttons to subtle hover lifts
- [x] Run `npm run build`

### Task 3.2: Fix Primary Advantage Page

- [x] Open `src/app/[locale]/(marketing)/products/primary-advantage/page.tsx`
- [x] Update hero gradient to exact spec: `from-cyan-400 to-cyan-800` (#22d3ee → #155e75)
- [x] Add `productLogo` prop to HeroSection (logo already exists: `/primary-advantage logo.png`)
- [x] Remove `bg-warm-cream`, `font-roobert`, `border-oat-border`
- [x] Remove old `modern-card` and `shadow-card` classes → use standard glassmorphism
- [x] Standardize button hover states
- [x] Run `npm run build`

### Task 3.3: Fix Math Advantage Page

- [x] Open `src/app/[locale]/(marketing)/products/math-advantage/page.tsx`
- [x] **Critical fix:** Change hero gradient from `emerald-500 via teal-500 to emerald-600` → `from-orange-300 to-orange-800`
- [x] Add `productLogo={{ src: "/math-advantage.png", alt: "Math Advantage Logo" }}`
- [x] Remove all `bg-warm-cream` (if any), standardize backgrounds
- [x] Update accent colors throughout page: emerald → orange
- [x] Standardize cards and buttons
- [x] Run `npm run build`

### Task 3.4: Write Tests for Batch 1 Pages

- [x] Create/update page tests for Reading, Primary, and Math
- [x] Assert hero gradient classes are present
- [x] Assert product logo image is rendered
- [x] Run `npm test` — confirm all pass

**Manual Verification — Phase 3:**

1. Open `/en/products/reading-advantage` — verify Sky 400→900 gradient + logo
2. Open `/en/products/primary-advantage` — verify Cyan 400→800 gradient + logo
3. Open `/en/products/math-advantage` — verify Orange 300→800 gradient + logo
4. Check all three at 375px — confirm logo stacks below text
5. Verify no warm cream backgrounds

---

## Phase 4: Product Pages — Batch 2 (Science, STEM, Storytime) [checkpoint: TBD]

### Task 4.1: Fix Science Advantage Page

- [x] Open `src/app/[locale]/(marketing)/products/science-advantage/page.tsx`
- [x] **Critical fix:** Change hero from `violet-500 via purple-500 to violet-600` → `from-rose-300 to-rose-800`
- [x] Add `productLogo={{ src: "/science-advantage.png", alt: "Science Advantage Logo" }}`
- [x] Update all violet/purple accent colors → rose
- [x] Standardize backgrounds, cards, buttons
- [x] Run `npm run build`

### Task 4.2: Fix STEM Advantage Page

- [x] Open `src/app/[locale]/(marketing)/products/stem-advantage/page.tsx`
- [x] **Critical fix:** Change hero from `orange-500 via amber-500 to orange-600` → `from-indigo-300 to-indigo-800`
- [x] Add `productLogo={{ src: "/stem-advantage.png", alt: "STEM Advantage Logo" }}`
- [x] Update all orange/amber accent colors → indigo
- [x] Standardize backgrounds, cards, buttons
- [x] Run `npm run build`

### Task 4.3: Fix Storytime Advantage Page

- [x] Open `src/app/[locale]/(marketing)/products/storytime-advantage/page.tsx`
- [x] **Critical fix:** Change hero from `pink-500 via rose-500 to pink-600` → `from-amber-300 to-amber-800`
- [x] Add `productLogo={{ src: "/storytime-advantage.png", alt: "Storytime Advantage Logo" }}`
- [x] Update all pink/rose accent colors → amber
- [x] Standardize backgrounds, cards, buttons
- [x] Run `npm run build`

### Task 4.4: Write Tests for Batch 2 Pages

- [x] Create/update page tests for Science, STEM, and Storytime
- [x] Assert correct gradient classes and logos
- [x] Run `npm test` — confirm all pass

**Manual Verification — Phase 4:**

1. Open each page — verify correct gradient + logo
2. Check mobile responsiveness for all three
3. Verify accent colors match brand throughout page

---

## Phase 5: Product Pages — Batch 3 (Zhongwen, Tutor, CodeCamp) [checkpoint: TBD]

### Task 5.1: Fix Zhongwen Advantage Page

- [x] Open `src/app/[locale]/(marketing)/products/zhongwen-advantage/page.tsx`
- [x] **Critical fix:** Change hero from `red-500 via rose-600 to red-700` → `from-fuchsia-300 to-fuchsia-800`
- [x] Add `productLogo={{ src: "/zhongwen-advantage.png", alt: "Zhongwen Advantage Logo" }}`
- [x] Update all red/rose accent colors → fuchsia
- [x] Standardize backgrounds, cards, buttons
- [x] Fix hardcoded English text ("Key Features", "Interactive Learning Elements", etc.) — should use i18n
- [x] Run `npm run build`

### Task 5.2: Fix Tutor Advantage Page

- [x] Open `src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx`
- [x] **Critical fix:** Change hero from `sky-500 via blue-500 to sky-600` → `from-emerald-300 to-emerald-800`
- [x] Add `productLogo={{ src: "/tutor-advantage.png", alt: "Tutor Advantage Logo" }}`
- [x] Update all sky/blue accent colors → emerald
- [x] Standardize backgrounds, cards, buttons
- [x] Run `npm run build`

### Task 5.3: Fix CodeCamp Advantage Page

- [x] Open `src/app/[locale]/(marketing)/products/codecamp-advantage/page.tsx`
- [x] Verify hero gradient is correct: `from-slate-700 to-slate-900` (already correct)
- [x] Add `productLogo` — check if `/codecamp-advantage.png` exists; if not, create a text/SVG fallback
- [x] Standardize backgrounds, cards, buttons
- [x] Run `npm run build`

### Task 5.4: Write Tests for Batch 3 Pages

- [x] Create/update page tests for Zhongwen, Tutor, and CodeCamp
- [x] Assert correct gradient classes and logos
- [x] Run `npm test` — confirm all pass

**Manual Verification — Phase 5:**

1. Open each page — verify correct gradient + logo
2. Check mobile responsiveness
3. Verify accent colors match brand

---

## Phase 6: Cross-Page Consistency & Quality Assurance [checkpoint: TBD]

### Task 6.1: Global Search for Remaining Clay Artifacts

- [x] Search entire `src/` for `warm-cream`, `oat-border`, `font-roobert`, `rotate-z`, `shadow-clay`, `shadow-hard-offset`
- [x] Remove or replace any remaining instances
- [x] Search for `#faf9f7` and `#dad4c8` hex codes
- [x] Document any instances that cannot be removed (with justification)

### Task 6.2: Visual Consistency Review

- [x] Open all 9 product pages side-by-side
- [x] Confirm each has correct brand gradient
- [x] Confirm each displays product logo in hero
- [x] Confirm all backgrounds are `sky-50` or `white`
- [x] Confirm all cards use consistent glassmorphism
- [x] Confirm all buttons have subtle hover lift
- [x] Fix any inconsistencies

### Task 6.3: Mobile Responsiveness Check

- [x] Test each product page at 375px viewport
- [x] Confirm hero stacks correctly (logo below text)
- [x] Confirm grids collapse to single column
- [x] Test at 768px (tablet) and 1024px (desktop)

### Task 6.4: i18n Verification

- [x] Run `npm run i18n:verify` — confirm exits 0
- [x] Visit each page in `/th/` and `/zh/` — confirm translations render
- [x] Check Zhongwen page specifically for hardcoded English strings

### Task 6.5: Build & Test Verification

- [x] Run `npm test` — confirm all tests pass
- [x] Review test coverage — aim for >80% on new/modified code
- [x] Run `npm run build` — confirm exits 0 with no TypeScript errors
- [x] Review build output for warnings

### Task 6.6: Accessibility Check

- [x] Verify white text on brand gradients has sufficient contrast
- [x] Confirm focus indicators on all interactive elements
- [x] Check that logo images have meaningful alt text

**Manual Verification — Phase 6:**

1. Systematic review of all 9 product pages
2. Confirm no Clay artifacts remain
3. Test all breakpoints (375px, 768px, 1024px, 1440px)
4. Verify all i18n locales work
5. Confirm all tests pass
6. Confirm build succeeds
7. Final visual walkthrough

---

## Final Acceptance

Before marking this track complete:

- [x] All acceptance criteria from spec.md are met
- [x] All phases completed and verified
- [x] No Clay design artifacts remain in product pages
- [x] All 9 product pages display correct brand colors
- [x] All 9 product pages display product logo in hero
- [x] `npm run i18n:verify` exits 0
- [x] `npm run build` exits 0
- [x] `npm test` passes
- [x] Documentation updated (tracks.md, lessons-learned.md if applicable)
- [x] Ready for review
