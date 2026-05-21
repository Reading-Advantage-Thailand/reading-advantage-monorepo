# Plan: Mastery Advantage Showcase

---

## Phase 1: Asset Preparation

### Task 1.1: Copy SVGs to public/marketing/
- [x] Create `public/marketing/` directory
- [x] Copy all 24 SVGs from `mastery-advantage/docs/` into `public/marketing/`:
  - `mastery-advantage-graph.svg`
  - `ma-marketing-adaptive-path.svg`, `ma-marketing-adaptive-path-th.svg`
  - `ma-marketing-spaced-repetition.svg`, `ma-marketing-spaced-repetition-th.svg`
  - `ma-marketing-progress.svg`, `ma-marketing-progress-th.svg`
  - `ra-marketing-reading-advantage.svg`, `ra-marketing-reading-advantage-th.svg`
  - `ra-marketing-primary-advantage.svg`, `ra-marketing-primary-advantage-th.svg`
  - `ra-marketing-storytime-advantage.svg`, `ra-marketing-storytime-advantage-th.svg`
  - `ra-marketing-math-advantage.svg`, `ra-marketing-math-advantage-th.svg`
  - `ra-marketing-science-advantage.svg`, `ra-marketing-science-advantage-th.svg`
  - `ra-marketing-stem-advantage.svg`, `ra-marketing-stem-advantage-th.svg`
  - `ra-marketing-zhongwen-advantage.svg`, `ra-marketing-zhongwen-advantage-th.svg`
  - `ra-marketing-tutor-advantage.svg`, `ra-marketing-tutor-advantage-th.svg`
  - `ra-marketing-codecamp-advantage.svg`, `ra-marketing-codecamp-advantage-th.svg`

### Task 1.2: Create `<MarketingSvg>` component
- [x] Create `src/components/marketing/marketing-svg.tsx`
- [x] Props: `baseName: string` (e.g. `"ra-marketing-math-advantage"`), `className?: string`
- [x] Resolves locale: if current locale is `th`, append `-th` suffix; otherwise use base name
- [x] Renders as `<Image>` with `unoptimized` to preserve CSS animations
- [x] Add `width`, `height`, `alt` props with sensible defaults
- [x] Create client-side variant `MarketingSvgClient` for client components

**Manual Verification — Phase 1:**
1. Run `npm run dev`
2. Open `/en` and `/th` in browser
3. Confirm SVGs load from `/marketing/` path
4. Confirm `/th/` URLs show Thai variants, `/en/` shows English

---

## Phase 2: Landing Page Rewrite

### Task 2.1: Add locale keys for new home page copy
- [x] Add `pages.home` keys in `src/locales/en.ts` and `src/locales/th.ts`:
  - `hero.eyebrow`, `hero.title`, `hero.description`, `hero.cta`, `hero.secondaryCta`
  - `hero.stats.products`, `hero.stats.skills`, `hero.stats.engine`
  - `engine.eyebrow`, `engine.title`, `engine.description`, `engine.cta`
  - `engine.pillars.kst.title`, `engine.pillars.kst.description`
  - `engine.pillars.srs.title`, `engine.pillars.srs.description`
  - `engine.pillars.placement.title`, `engine.pillars.placement.description`
  - `suite.eyebrow`, `suite.title`, `suite.description`
  - Keep existing `thaiSchools.*` and `impact.*` keys (reuse/adapt)

### Task 2.2: Rewrite home page component
- [x] Read `src/app/[locale]/(marketing)/(home)/page.tsx`
- [x] Replace hero image (`reading-advantage-demo.png`) with `<MarketingSvg baseName="mastery-advantage-graph" />`
- [x] Update hero stats: "9 products", "2,172+ mapped skills", "KST + SRS engine"
- [x] Replace "Flagship" section with "The Engine" section — 3 pillars (KST, SRS, Placement) in a 3-column grid
- [x] Add "The Suite" section — compact grid of all 9 products with brand colors and links
- [x] Keep Thai schools section and CTA section (update copy to reference engine)
- [x] Ensure component remains server-side (`getScopedI18n`)

### Task 2.3: Update locale files
- [x] Write all new English keys to `src/locales/en.ts`
- [x] Write all new Thai keys to `src/locales/th.ts`
- [x] Write all new Chinese keys to `src/locales/zh.ts`

**Manual Verification — Phase 2:**
1. Run `npm run dev`
2. Open `/en` — confirm hero shows knowledge graph SVG, headline references Mastery Advantage
3. Open `/th` — confirm Thai copy renders correctly
4. Confirm "The Engine" section shows 3 pillars with links to `/mastery-advantage`
5. Confirm "The Suite" section shows all 9 products with correct brand colors

---

## Phase 3: Dedicated Mastery Advantage Page

### Task 3.1: Create page route and layout
- [x] Create `src/app/[locale]/(marketing)/mastery-advantage/page.tsx` (server component)
- [x] Add `metadata` export with title, description, openGraph

### Task 3.2: Add locale keys for MA page
- [x] Add `pages.masteryAdvantage` keys in `en.ts`, `th.ts`, and `zh.ts`

### Task 3.3: Implement page sections
- [x] Hero section with `ma-marketing-adaptive-path.svg`
- [x] Spaced repetition section with `ma-marketing-spaced-repetition.svg`
- [x] Progress tracking section with `ma-marketing-progress.svg`
- [x] Technical overview section — KST graph, FSRS scheduling, edge calibration, placement (text-only, from SPECIFICATION.md)
- [x] "Powers every product" section — grid of all 9 products with brand colors
- [x] Final CTA section

### Task 3.4: Add navigation link
- [x] Add "Mastery Advantage" link to the site header navigation
- [x] Ensure it appears in all locales

**Manual Verification — Phase 3:**
1. Open `/en/mastery-advantage` — confirm 3 animated SVGs render and animate
2. Open `/th/mastery-advantage` — confirm Thai SVG variants render
3. Confirm technical overview section is readable and accurate
4. Confirm product grid links to all 9 product pages
5. Confirm nav link to MA page is visible

---

## Phase 4: Product Page SVGs

### Task 4.1: Embed SVGs in each product page
- [x] For each of the 9 product pages, import `<MarketingSvg>` and add the SVG to an appropriate section:
  - `reading-advantage/page.tsx` → `baseName="ra-marketing-reading-advantage"` (client component, uses `MarketingSvgClient`)
  - `primary-advantage/page.tsx` → `baseName="ra-marketing-primary-advantage"`
  - `storytime-advantage/page.tsx` → `baseName="ra-marketing-storytime-advantage"`
  - `math-advantage/page.tsx` → `baseName="ra-marketing-math-advantage"`
  - `science-advantage/page.tsx` → `baseName="ra-marketing-science-advantage"`
  - `stem-advantage/page.tsx` → `baseName="ra-marketing-stem-advantage"`
  - `zhongwen-advantage/page.tsx` → `baseName="ra-marketing-zhongwen-advantage"`
  - `tutor-advantage/page.tsx` → `baseName="ra-marketing-tutor-advantage"`
  - `codecamp-advantage/page.tsx` → `baseName="ra-marketing-codecamp-advantage"`
- [x] Add as new "Adaptive Engine" sections after hero
- [x] Ensure SVGs scale correctly on mobile

### Task 4.2: Add CodeCamp Advantage to product grid
- [x] Read `src/components/products/b2b-solutions.tsx`
- [x] Add CodeCamp to `productConfigs` array with brand color (fuchsia/indigo)
- [x] Add appropriate icon (`Code` from lucide-react)
- [x] Add locale keys for CodeCamp title, features, grade range in `en.ts`, `th.ts`, and `zh.ts`

**Manual Verification — Phase 4:**
1. Open each product page at `/en/products/<name>` — confirm SVG renders and animates
2. Open `/th/products/<name>` — confirm Thai SVG variant renders
3. Open `/en/products` — confirm CodeCamp appears in the B2B grid
4. Resize browser to mobile width — confirm SVGs scale correctly

---

## Phase 5: Final Build and Verification

### Task 5.1: Run full build
- [ ] Run `npm run build`
- [ ] Confirm exit code 0 and no TypeScript errors

### Task 5.2: Run test suite
- [ ] Run `CI=true npm test`
- [ ] Confirm all tests pass including new `<MarketingSvg>` tests

### Task 5.3: Manual verification sweep
- [ ] Home page: hero SVG, engine section, suite section all render correctly
- [ ] MA page: all 3 animated SVGs, technical overview, product grid
- [ ] All 9 product pages: matching SVG renders
- [ ] Thai locale: all Thai SVG variants render on MA page and product pages
- [ ] CodeCamp appears in B2B grid
- [ ] No hardcoded strings visible in page source

**Manual Verification — Phase 5:**
1. `npm run build` exits 0
2. `CI=true npm test` passes
3. Open `/en` — landing page shows MA graph, engine pillars, product suite
4. Open `/en/mastery-advantage` — 3 animated SVGs + technical overview
5. Open `/th/mastery-advantage` — Thai SVG variants
6. Open all 9 product pages — each shows its matching SVG
7. Open `/th/products/math-advantage` — Thai SVG variant
8. Open `/en/products` — CodeCamp in grid
