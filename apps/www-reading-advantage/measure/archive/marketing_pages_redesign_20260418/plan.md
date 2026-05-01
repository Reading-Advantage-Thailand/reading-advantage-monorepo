# Plan: Marketing Pages Redesign

---

## Phase 1: Audit & Shared Component Fixes [checkpoint: TBD]

### Task 1.1: Audit All Marketing Pages for Inconsistencies

- [ ] Open each page: Home, About, Features, Pricing, Services, Contact
- [ ] Document every custom inline CTA (non-Button `<Link>` or `<a>`)
- [ ] Document every `rounded-lg` or `rounded-xl` on primary cards
- [ ] Document every `text-gray-*` usage
- [ ] Document every missing uppercase section label
- [ ] Document hard-coded strings and emoji icons
- [ ] Document inline `style={{...}}` objects
- [ ] Create checklist per page

### Task 1.2: Fix Features Page Hard-Coded Strings

- [ ] Open `src/app/[locale]/(marketing)/features/page.tsx`
- [ ] Remove the `features` array with hard-coded English titles/descriptions
- [ ] Replace with i18n `t()` calls using existing locale keys under `pages.feature.features.*`
- [ ] Verify locale files (EN, TH, ZH) have matching keys; add if missing
- [ ] Run `npm run i18n:verify`
- [ ] Run `npm run build`

### Task 1.3: Fix Contact Page Emoji Icon

- [ ] Open `src/app/[locale]/(marketing)/contact/page.tsx`
- [ ] Replace `📱` emoji with `<Smartphone className="w-5 h-5" />` from `lucide-react`
- [ ] Import `Smartphone` from `lucide-react`
- [ ] Run `npm run build`

**Manual Verification — Phase 1:**

1. Confirm no hard-coded English in Features page
2. Confirm no emoji in Contact page
3. Run `npm run i18n:verify` — confirm exit 0

---

## Phase 2: Home Page Polish [checkpoint: TBD]

### Task 2.1: Remove Inline Styles

- [ ] Open `src/app/[locale]/(marketing)/(home)/page.tsx`
- [ ] Find all `style={{ letterSpacing: "..." }}` objects
- [ ] Replace with Tailwind `tracking-tight` or `tracking-normal` as appropriate
- [ ] Remove empty `style={{}}` objects
- [ ] Run `npm run build`

### Task 2.2: Standardize Home Page Cards

- [ ] Ensure all `Card` components use `rounded-3xl`
- [ ] Ensure hover states use `hover:-translate-y-1 hover:shadow-xl transition-all duration-300`
- [ ] Verify glassmorphism cards in dark sections use `bg-white/90 backdrop-blur-md`
- [ ] Run `npm run build`

### Task 2.3: Verify Home Page CTAs Use Button Component

- [ ] Check all CTA links use `<Button asChild>` or `<Button>`
- [ ] Replace any remaining custom inline `<Link>` CTAs with `<Button variant="...">`
- [ ] Run `npm run build`

### Task 2.4: Add Uppercase Labels to Major Sections

- [ ] Add uppercase wayfinding labels to: Overview, Flagship, Innovation, Quality Protocol, Thai Schools, Impact sections
- [ ] Use pattern: `<span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">LABEL</span>`
- [ ] Run `npm run build`

### Task 2.5: Write/Update Home Page Tests

- [ ] Update `src/app/[locale]/(marketing)/(home)/page.test.tsx` or create if missing
- [ ] Assert no inline style objects exist (snapshot or regex)
- [ ] Assert uppercase labels exist
- [ ] Run `npm test` — confirm passes

**Manual Verification — Phase 2:**

1. Open home page at `/en/` — verify no visual regression
2. Check all cards have `rounded-3xl`
3. Verify CTAs use Button component styling
4. Confirm uppercase labels visible

---

## Phase 3: About Page Redesign [checkpoint: TBD]

### Task 3.1: Write Test for New Structure (Red Phase)

- [ ] Create/update `src/app/[locale]/(marketing)/about/page.test.tsx`
- [ ] Assert at least one asymmetric 7/5 or 5/7 split exists
- [ ] Assert uppercase wayfinding labels exist
- [ ] Assert no `text-gray-700` classes remain
- [ ] Run `npm test` — confirm fails (Red phase)

### Task 3.2: Standardize Colors and Radius

- [ ] Replace all `text-gray-700` → `text-slate-600`
- [ ] Replace all `rounded-lg` on cards → `rounded-3xl`
- [ ] Replace `text-amber-600` heading → `text-sky-900` or product-appropriate color
- [ ] Run `npm run build`

### Task 3.3: Add Asymmetric Layout to Key Section

- [ ] Convert Mission & Vision or Technology & Impact section to 7/5 asymmetric split
- [ ] Add image to the smaller side if available, or use stats/visual element
- [ ] Ensure mobile stacks correctly (single column at 375px)
- [ ] Run `npm run build`

### Task 3.4: Add Glassmorphism and Uppercase Labels

- [ ] Add uppercase labels to all major sections (Introduction, Our Story, Mission, Values, Research, Big 4, Positioning)
- [ ] Convert Big 4 cards to glassmorphism if on colored background
- [ ] Add hover lifts to cards: `hover:-translate-y-1 hover:shadow-xl transition-all duration-300`
- [ ] Run `npm run build`

### Task 3.5: Standardize CTA to Button Component

- [ ] Replace final CTA `<Link>` with `<Button variant="white" size="lg" asChild>`
- [ ] Ensure href is preserved
- [ ] Run `npm run build`

### Task 3.6: Make Test Pass (Green Phase)

- [ ] Run `npm test` — confirm passes
- [ ] Run `npm run build`

**Manual Verification — Phase 3:**

1. Open `/en/about` — verify asymmetric layout
2. Check all cards are `rounded-3xl`
3. Verify uppercase labels present
4. Test mobile at 375px

---

## Phase 4: Features Page Redesign [checkpoint: TBD]

### Task 4.1: Write Test for New Structure (Red Phase)

- [ ] Create/update `src/app/[locale]/(marketing)/features/page.test.tsx`
- [ ] Assert no hard-coded English strings in rendered output
- [ ] Assert asymmetric layout exists
- [ ] Assert uppercase labels exist
- [ ] Run `npm test` — confirm fails

### Task 4.2: Add Asymmetric Feature Highlight Section

- [ ] Add a new asymmetric 7/5 section after the hero (before or after the grid)
- [ ] Left (7 cols): deep-dive text about one flagship feature
- [ ] Right (5 cols): large image or illustration
- [ ] Use `rounded-3xl` for image container
- [ ] Run `npm run build`

### Task 4.3: Redesign Features Grid

- [ ] Update feature cards to use `rounded-3xl`, `shadow-lg`, `hover:shadow-xl`
- [ ] Change icon circles from `bg-sky-100` to gradient `bg-gradient-to-br from-sky-400 to-amber-400`
- [ ] Add hover lift: `hover:-translate-y-1 transition-all duration-300`
- [ ] Ensure all text uses `t()` calls, no hard-coded strings
- [ ] Run `npm run build`

### Task 4.4: Add Uppercase Labels and Glassmorphism

- [ ] Add uppercase label above features grid: "PLATFORM FEATURES"
- [ ] Add uppercase label above comparison table: "COMPARISON"
- [ ] Run `npm run build`

### Task 4.5: Standardize CTA to Button Component

- [ ] Replace final CTA `<Link>` with `<Button variant="white" size="lg" asChild>`
- [ ] Run `npm run build`

### Task 4.6: Make Test Pass (Green Phase)

- [ ] Run `npm test` — confirm passes
- [ ] Run `npm run build`

**Manual Verification — Phase 4:**

1. Open `/en/features` — verify asymmetric section
2. Confirm feature cards have gradient icons and `rounded-3xl`
3. Verify no hard-coded English visible
4. Test mobile

---

## Phase 5: Pricing Page Polish [checkpoint: TBD]

### Task 5.1: Add Visual Distinction Beyond Table

- [ ] Add a brief asymmetric section above the pricing table (value proposition)
- [ ] Or: add a trust signals strip (badges, guarantees) below the table
- [ ] Use `rounded-3xl` containers
- [ ] Run `npm run build`

### Task 5.2: Standardize CTA to Button Component

- [ ] Replace final CTA `<Link>` with `<Button variant="white" size="lg" asChild>`
- [ ] Run `npm run build`

### Task 5.3: Add Uppercase Label

- [ ] Add uppercase label above pricing table: "PRICING PLANS"
- [ ] Run `npm run build`

### Task 5.4: Write/Update Tests

- [ ] Create/update pricing page test
- [ ] Assert Button component used for CTA
- [ ] Run `npm test` — confirm passes

**Manual Verification — Phase 5:**

1. Open `/en/pricing` — verify visual polish
2. Confirm CTA uses Button component

---

## Phase 6: Services Page Polish [checkpoint: TBD]

### Task 6.1: Standardize Service Cards

- [ ] Ensure all service cards use `rounded-3xl` (already mostly correct)
- [ ] Standardize card hover to `hover:-translate-y-1 hover:shadow-xl transition-all duration-300`
- [ ] Verify glassmorphism on any dark section cards
- [ ] Run `npm run build`

### Task 6.2: Standardize CTA to Button Component

- [ ] Replace final CTA `<Link>` with `<Button variant="white" size="lg" asChild>`
- [ ] Run `npm run build`

### Task 6.3: Add Uppercase Labels

- [ ] Add uppercase label above services grid: "OUR SERVICES"
- [ ] Add uppercase label above CTA section if not already present
- [ ] Run `npm run build`

### Task 6.4: Write/Update Tests

- [ ] Create/update services page test
- [ ] Assert Button component used for CTA
- [ ] Run `npm test` — confirm passes

**Manual Verification — Phase 6:**

1. Open `/en/services` — verify card consistency
2. Confirm CTA uses Button component

---

## Phase 7: Contact Page Redesign [checkpoint: TBD]

### Task 7.1: Write Test for New Structure (Red Phase)

- [ ] Create/update `src/app/[locale]/(marketing)/contact/page.test.tsx`
- [ ] Assert no emoji characters in output
- [ ] Assert `rounded-3xl` used on primary cards
- [ ] Assert Button component used for CTAs
- [ ] Run `npm test` — confirm fails

### Task 7.2: Standardize Card Styling

- [ ] Replace all `rounded-2xl` on primary cards → `rounded-3xl`
- [ ] Standardize card shadows to `shadow-lg`, hover: `hover:shadow-xl`
- [ ] Unify accent colors: use sky/amber consistently (keep current pairing but standardize)
- [ ] Replace `text-gray-*` with `text-slate-*`
- [ ] Run `npm run build`

### Task 7.3: Add Glassmorphism to Dark Section

- [ ] Social/Line QR section uses dark gradient — ensure cards use `bg-white/10 backdrop-blur-sm border border-white/20`
- [ ] Verify contrast is adequate
- [ ] Run `npm run build`

### Task 7.4: Standardize CTAs to Button Component

- [ ] Replace email `<a>` CTA in contact cards with `<Button>`
- [ ] Replace phone `<a>` CTA with `<Button>`
- [ ] Replace bottom CTA `<a>` with `<Button variant="white" size="lg">`
- [ ] Run `npm run build`

### Task 7.5: Add Uppercase Labels

- [ ] Add uppercase label above contact cards: "GET IN TOUCH"
- [ ] Add uppercase label above social section: "CONNECT WITH US"
- [ ] Run `npm run build`

### Task 7.6: Make Test Pass (Green Phase)

- [ ] Run `npm test` — confirm passes
- [ ] Run `npm run build`

**Manual Verification — Phase 7:**

1. Open `/en/contact` — verify no emoji
2. Check all cards are `rounded-3xl`
3. Verify CTAs use Button component
4. Test mobile

---

## Phase 8: Cross-Page Consistency & QA [checkpoint: TBD]

### Task 8.1: Global Search for Remaining Custom CTAs

- [ ] Search `src/app/[locale]/(marketing)/` for inline `<Link` or `<a` with `className="bg-` or `className="...px-6 py-3..."`
- [ ] Verify all CTAs use `<Button>`
- [ ] Document any exceptions (must be justified)

### Task 8.2: Global Search for Radius Inconsistencies

- [ ] Search for `rounded-lg` in marketing pages
- [ ] Replace with `rounded-3xl` on primary cards/containers
- [ ] Keep `rounded-lg` only for small UI elements (badges, inputs) if appropriate
- [ ] Run `npm run build`

### Task 8.3: Global Search for Color Inconsistencies

- [ ] Search for `text-gray-` in marketing pages
- [ ] Replace with `text-slate-600` or `text-slate-900`
- [ ] Run `npm run build`

### Task 8.4: i18n Verification

- [ ] Run `npm run i18n:verify` — confirm exits 0
- [ ] Check all pages in `/th/` and `/zh/` — confirm no hard-coded English

### Task 8.5: Mobile Responsiveness Check

- [ ] Test Home, About, Features, Pricing, Services, Contact at 375px
- [ ] Confirm asymmetric splits stack correctly
- [ ] Confirm cards don't overflow
- [ ] Test at 768px and 1024px

### Task 8.6: Build & Test Verification

- [ ] Run `npm test` — confirm all tests pass
- [ ] Run `npm run build` — confirm exits 0
- [ ] Review test coverage on new/modified code

### Task 8.7: Visual Polish

- [ ] Ensure all uppercase labels use `uppercase tracking-widest text-xs font-semibold`
- [ ] Ensure consistent padding rhythm (`py-24` for major sections, `py-16` for minor)
- [ ] Ensure all cards have consistent hover states
- [ ] Fix any visual inconsistencies

**Manual Verification — Phase 8:**

1. Side-by-side comparison of all 6 pages
2. Confirm consistent CTA styling
3. Confirm consistent card radius and shadows
4. Confirm uppercase labels on all major sections
5. Verify all i18n locales
6. Confirm all tests pass
7. Final visual walkthrough

---

## Final Acceptance

Before marking this track complete:

- [ ] All acceptance criteria from spec.md are met
- [ ] All phases completed and verified
- [ ] No custom inline CTAs remain on marketing pages
- [ ] All primary cards use `rounded-3xl`
- [ ] No `text-gray-*` remains (use `slate` scale)
- [ ] Every major section has uppercase wayfinding label
- [ ] Features page has no hard-coded English
- [ ] Contact page has no emoji
- [ ] Home page has no inline styles
- [ ] At least 2 pages have asymmetric splits
- [ ] `npm run i18n:verify` exits 0
- [ ] `npm run build` exits 0
- [ ] `npm test` passes
- [ ] Mobile layouts verified at 375px
- [ ] Documentation updated (tracks.md, lessons-learned.md if applicable)
- [ ] Ready for review
