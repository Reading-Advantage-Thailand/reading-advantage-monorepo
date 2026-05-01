# Plan: Remaining Product Pages Redesign

---

## Phase 1: Audit and Design Token Setup

### Task 1.1: Audit all 7 product pages for Framer Motion usage

- [ ] Search `src/app/[locale]/(marketing)/products/` for `from "framer-motion"` and `motion.`
- [ ] Document which pages use Framer Motion and the specific component types used (motion.div, motion.h1, etc.)
- [ ] Record current section structure for each page (what sections exist, in what order)

### Task 1.2: Audit all 7 product pages for emoji icon usage

- [ ] Search each product page file for emoji characters used as icon substitutes
- [ ] Map each emoji to the appropriate `lucide-react` icon (e.g., "📚" → BookOpen, "🔬" → FlaskConical, "💻" → Code2)
- [ ] Create a reference mapping document as a comment in the first file changed

### Task 1.3: Confirm all locale keys are present for each product

- [ ] Run `npm run i18n:verify` and confirm no missing keys
- [ ] For each product, verify that the locale scope (e.g., `pages.products.mathAdvantage`) has all keys referenced in the current page component

**Manual Verification — Phase 1:**

1. Review the audit notes above — confirm the scope of changes is understood
2. Confirm `npm run i18n:verify` exits 0 before any code changes

---

## Phase 2: Math Advantage and Science Advantage Redesign

### Task 2.1: Write snapshot/render test for Math Advantage page (Red phase)

- [ ] Create `src/app/[locale]/(marketing)/products/math-advantage/page.test.tsx`
- [ ] Write a test that renders the page and asserts the main heading text is present
- [ ] Run `npm test` — confirm the test runs (may pass or fail depending on current state)

### Task 2.2: Redesign Math Advantage page

- [ ] Remove Framer Motion imports
- [ ] Remove `HeroSection` import; build inline hero with `from-orange-300 via-orange-400 to-orange-300` gradient (logo color)
- [ ] Add product logo in hero section
- [ ] Replace emoji icons with Lucide equivalents
- [ ] Update animations to `tailwindcss-animate` patterns
- [ ] Verify all text still uses `t("...")` locale calls

### Task 2.3: Make Math Advantage test pass

- [ ] Run `npm test` — confirm the test passes (Green phase)
- [ ] Run `npm run build` — confirm no TypeScript errors for this page

### Task 2.4: Write snapshot test for Science Advantage page (Red phase)

- [ ] Create `src/app/[locale]/(marketing)/products/science-advantage/page.test.tsx`
- [ ] Write the same heading-presence test pattern

### Task 2.5: Redesign Science Advantage page

- [ ] Remove Framer Motion imports
- [ ] Build inline hero with `from-rose-300 via-rose-400 to-rose-300` gradient (logo color)
- [ ] Add product logo in hero section
- [ ] Replace emoji icons with Lucide equivalents (BookOpen → Microscope, Sparkles → Atom, etc.)
- [ ] Update animations
- [ ] Run `npm test` — Green phase

**Manual Verification — Phase 2:**

1. Start dev server: `npm run dev`
2. Open `/en/products/math-advantage` — confirm orange gradient hero (logo color), product logo visible, no emoji icons, Lucide icons
3. Open `/en/products/science-advantage` — confirm rose gradient hero (logo color), product logo visible, no emoji icons
4. Switch locale to `/th/` for each — confirm Thai text renders

---

## Phase 3: STEM Advantage, Storytime Advantage, and Zhongwen Advantage Redesign

### Task 3.1: Redesign STEM Advantage page

- [ ] Write failing test in `src/app/[locale]/(marketing)/products/stem-advantage/page.test.tsx`
- [ ] Remove Framer Motion, build inline hero with `from-indigo-300 via-indigo-400 to-indigo-300` (logo color)
- [ ] Add product logo in hero section
- [ ] Replace emoji icons with Lucide (Code2, Cpu, Zap, etc.)
- [ ] Run `npm test` — Green phase

### Task 3.2: Redesign Storytime Advantage page

- [ ] Write failing test in `src/app/[locale]/(marketing)/products/storytime-advantage/page.test.tsx`
- [ ] Remove Framer Motion, build inline hero with `from-amber-300 via-amber-400 to-amber-300` (logo color)
- [ ] Add product logo in hero section
- [ ] Replace emoji icons with Lucide (BookOpen, Heart, Music, etc.)
- [ ] Run `npm test` — Green phase

### Task 3.3: Redesign Zhongwen Advantage page

- [ ] Write failing test in `src/app/[locale]/(marketing)/products/zhongwen-advantage/page.test.tsx`
- [ ] Remove Framer Motion, build inline hero with `from-fuchsia-300 via-fuchsia-400 to-fuchsia-300` (logo color)
- [ ] Add product logo in hero section
- [ ] Replace emoji icons with Lucide (Languages, Globe, BookMarked, etc.)
- [ ] Run `npm test` — Green phase

**Manual Verification — Phase 3:**

1. Open each of the three redesigned pages in `/en/`, `/th/`, `/zh/` locales
2. Confirm each has the correct logo-based hero gradient (indigo for STEM, amber for Storytime, fuchsia for Zhongwen)
3. Confirm product logos are visible on each page
4. Confirm no emoji icons are visible on any of the three pages
5. Check browser console — no JavaScript errors on any page

---

## Phase 4: CodeCamp Advantage and Tutor Advantage Redesign

### Task 4.1: Redesign CodeCamp Advantage page

- [ ] Write failing test in `src/app/[locale]/(marketing)/products/codecamp-advantage/page.test.tsx`
- [ ] Remove Framer Motion, build inline hero with `from-slate-700 via-slate-800 to-slate-900` (TODO: confirm logo colors)
- [ ] Add product logo in hero section
- [ ] Replace emoji icons with Lucide (Code2, Terminal, Cpu, Braces, etc.)
- [ ] Run `npm test` — Green phase

### Task 4.2: Redesign Tutor Advantage page

- [ ] Write failing test in `src/app/[locale]/(marketing)/products/tutor-advantage/page.test.tsx`
- [ ] Remove Framer Motion, build inline hero with `from-emerald-300 via-emerald-400 to-emerald-300` (logo color)
- [ ] Add product logo in hero section
- [ ] Replace emoji icons with Lucide (Users, GraduationCap, MessageCircle, etc.)
- [ ] Run `npm test` — Green phase

### Task 4.3: Run full test suite

- [ ] Run `npm test` — all tests pass
- [ ] Run `npm run build` — exits 0 with no TypeScript errors

**Manual Verification — Phase 4:**

1. Open `/en/products/codecamp-advantage` — confirm dark slate hero (TODO: confirm logo color), product logo visible, Lucide icons
2. Open `/en/products/tutor-advantage` — confirm emerald gradient hero (logo color), product logo visible, Lucide icons
3. Visit the `/en/products` overview page — confirm all product cards still link correctly to each product page
4. Run `npm run build` and confirm exit code 0

---

## Phase 5: Cross-Page Consistency Check

### Task 5.1: Visual consistency review across all product pages

- [ ] Open all 9 product pages (including Reading Advantage and Primary Advantage as reference) side-by-side
- [ ] Confirm each has a unique hero gradient (no duplicates)
- [ ] Confirm all use the same section padding rhythm (`py-24` or `py-32`)
- [ ] Confirm all feature card hover animations use the same pattern (`hover:-translate-y-3 transition-all duration-300`)
- [ ] Fix any inconsistencies found

### Task 5.2: Mobile responsiveness check

- [ ] Test each of the 7 redesigned pages at 375px viewport width
- [ ] Confirm hero sections stack correctly (text above any image)
- [ ] Confirm feature grids collapse to single column
- [ ] Fix any layout issues

### Task 5.3: Final build and i18n check

- [ ] Run `npm run i18n:verify` — exits 0
- [ ] Run `npm run build` — exits 0
- [ ] Run `npm test` — all tests pass

**Manual Verification — Phase 5:**

1. Open all 7 redesigned product pages at mobile size (375px) and tablet size (768px)
2. Confirm layout is correct at each breakpoint
3. Visit `/th/products/<each-product>` and `/zh/products/<each-product>` and confirm translated content
4. `npm run build` exits 0
