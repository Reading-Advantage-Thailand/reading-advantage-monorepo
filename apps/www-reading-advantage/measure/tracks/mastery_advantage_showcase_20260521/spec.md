# Track: Mastery Advantage Showcase

## Overview

The company website (`www-reading-advantage`) currently reads as a Reading Advantage product site. In reality, Reading Advantage is just one of 9 products powered by **Mastery Advantage** — the proprietary KST + SRS adaptive engine that is the true differentiator. This track repositions the website to surface Mastery Advantage as the unifying technology, adds a dedicated Mastery Advantage page, embeds animated marketing SVGs into product pages, and adds CodeCamp Advantage to the product grid.

## Functional Requirements

### 1. Landing Page — Mastery Advantage as the Hero

The home page (`[locale]/(home)/page.tsx`) is rewritten to position Mastery Advantage as the proprietary engine that powers all products:

- **Hero section** replaces the Reading Advantage screenshot with the `mastery-advantage-graph.svg` from `mastery-advantage/docs/`. The headline, eyebrow, and description speak to the engine, not a single product.
- **Evidence stats** in the hero are updated to reflect the engine's scope (e.g., "9 products", "2,172+ mapped skills", "KST + SRS engine") instead of Reading Advantage-only numbers.
- **Flagship section** becomes "The Engine" — a brief explanation of Knowledge Space Theory + Spaced Repetition and how they work together. Links to the dedicated Mastery Advantage page.
- **The Suite section** — a compact grid showing all 9 products with their brand colors, linking to each product page. Replaces the current Reading Advantage-only flagship section.
- **"How it works" and Thai schools sections** remain structurally but are updated to reference the engine, not just reading.
- **CTA** remains "Book a demo".

### 2. Dedicated Mastery Advantage Page

A new marketing page at `/mastery-advantage` (under `[locale]/(marketing)/mastery-advantage/page.tsx`) dedicated to explaining the Mastery Advantage engine:

- **Hero**: `ma-marketing-adaptive-path.svg` — "Always know what's next"
- **Section 2**: `ma-marketing-spaced-repetition.svg` — "Review at the perfect moment"
- **Section 3**: `ma-marketing-progress.svg` — "Every skill, tracked and visible"
- **Section 4**: Technical overview — KST graph, FSRS scheduling, edge calibration, placement, proficiency assessment (drawn from SPECIFICATION.md)
- **Section 5**: "Powers every product" — grid of all 9 products with brand colors
- **CTA**: "Book a demo"

Page is a server component using `getScopedI18n`. All copy is locale-keyed.

### 3. SVG Embedding on Product Pages

Each product page gets its matching animated marketing SVG from `mastery-advantage/docs/`:

| Product Page | SVG File |
|---|---|
| `/products/reading-advantage` | `ra-marketing-reading-advantage.svg` |
| `/products/primary-advantage` | `ra-marketing-primary-advantage.svg` |
| `/products/storytime-advantage` | `ra-marketing-storytime-advantage.svg` |
| `/products/math-advantage` | `ra-marketing-math-advantage.svg` |
| `/products/science-advantage` | `ra-marketing-science-advantage.svg` |
| `/products/stem-advantage` | `ra-marketing-stem-advantage.svg` |
| `/products/zhongwen-advantage` | `ra-marketing-zhongwen-advantage.svg` |
| `/products/tutor-advantage` | `ra-marketing-tutor-advantage.svg` |
| `/products/codecamp-advantage` | `ra-marketing-codecamp-advantage.svg` |

**Locale-aware SVG resolution:**
- Create a `<MarketingSvg>` component that takes a `baseName` prop (e.g. `ra-marketing-math-advantage`) and resolves the correct file:
  - `/th/` URL → `{baseName}-th.svg`
  - All other locales (`/en/`, `/zh/`, default) → `{baseName}.svg`
- SVGs are copied to `public/marketing/` and rendered via `<Image>` or inlined as static imports. Since these are animated SVGs with CSS, they should be rendered as static assets (not processed by Next.js Image optimization).
- Each product page replaces its current hero image or adds a new section featuring the SVG.

### 4. CodeCamp Advantage in Product Grid

- Add CodeCamp Advantage to the `productConfigs` array in `b2b-solutions.tsx` with fuchsia/indigo brand color, appropriate icon, and link to `/products/codecamp-advantage`.
- Add CodeCamp to the products overview page grade bands or a "Specialized Programs" section.

## Non-Functional Requirements

- Landing page remains a server component (`getScopedI18n`) — no unnecessary `"use client"`.
- All new copy is locale-keyed in `en.ts` and `th.ts` locale files. No hardcoded strings.
- SVGs are served as static files from `public/marketing/` — no Next.js Image optimization (CSS animations require raw SVG).
- `npm run build` exits 0 after all changes.
- Mobile responsive: SVGs scale via `viewBox` and `preserveAspectRatio`.
- `prefers-reduced-motion` is already handled in the SVGs themselves.

## Acceptance Criteria

- [ ] Home page hero displays `mastery-advantage-graph.svg` (not a product screenshot)
- [ ] Home page headline and copy reference Mastery Advantage as the engine, not Reading Advantage as the product
- [ ] `/en/mastery-advantage` page exists with 3 animated SVG sections + technical overview + product grid
- [ ] `/th/mastery-advantage` page renders Thai SVG variants where available
- [ ] All 9 product pages display their matching animated SVG
- [ ] Thai locale (`/th/`) shows `-th.svg` variants; English and Chinese show default SVGs
- [ ] CodeCamp Advantage appears in the B2B product grid with correct brand color
- [ ] `npm run build` exits 0
- [ ] No hardcoded strings — all copy locale-keyed

## Out of Scope

- Creating Chinese (`-zh`) SVG variants (do not exist; English default is used for `/zh/`).
- Rewriting individual product page copy beyond SVG insertion.
- Creating new SVGs or modifying existing ones.
- Adding the other MA SVGs to the landing page (they belong on the dedicated MA page only).
- Blog posts or marketing content about Mastery Advantage.
