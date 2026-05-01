# Track: Product Page Structure Redesign

## Overview

All 9 product pages currently follow the exact same rigid template: Hero → 3-column feature cards → dark stats section → CTA. This creates "AI slop" — pages that are indistinguishable except for swapped colors. This track restructures every product page with a **unique, distinctive layout** that breaks the repetitive pattern.

The redesign draws structural inspiration from the Clay design system's principles (asymmetric layouts, generous radius, full-width color "rooms", dashed borders, uppercase labels as wayfinding) while maintaining the product's actual brand identity: `sky-50` base, correct product brand gradients, Geist typography, and glassmorphism.

**This track builds on `product_brand_refresh_20260418`** which fixed colors and logos. This track fixes structure and layout.

## Problem Statement

### Current Template (Repeated on All 9 Pages)
1. Hero gradient + title + description + CTA button
2. 3-column feature cards with icons
3. Dark gradient stats section (3 stats)
4. Final CTA section

### Why This Is "AI Slop"
- Every page is visually identical in structure
- No differentiation between product personalities
- Sections never overlap or break the grid
- All cards are the same size/shape
- No asymmetric layouts
- No horizontal breaks in vertical flow
- No distinctive "moments" per page

## Design Principles (From Clay, Adapted)

### 1. Generous Border Radius
- **Cards**: `rounded-3xl` (24px) minimum
- **Section containers**: `rounded-[40px]` (40px)
- **Pills/badges**: `rounded-full` (1584px)
- **Images**: `rounded-3xl` — never sharp corners

### 2. Asymmetric Layouts
- **7/5 splits** for text + image sections
- **5/7 splits** (reversed) for variety
- **Full-bleed images** breaking container bounds
- **Overlapping sections**: negative margin-top (`-mt-20`) creating depth
- **Offset cards**: cards that extend beyond grid lines

### 3. Full-Width Color "Rooms"
- Each page has at least 2 full-width sections in its product brand color
- These are not subtle accents — they're bold, immersive spaces
- White content cards float inside colored rooms with generous padding
- Creates visual rhythm through hue, not just whitespace

### 4. Dashed Borders (Selective)
- Used for secondary containers, decorative elements, and "sketch" feeling
- Never on primary CTA cards — always on supporting content
- Example: `border-dashed border-sky-200` on feature comparison tables

### 5. Uppercase Labels as Wayfinding
- Section overlines: `uppercase tracking-widest text-xs font-semibold`
- Create rhythm and scan-ability
- Example: "PLATFORM FEATURES" above a section heading

### 6. Mixed Card Sizes
- Not every card is identical
- Large "hero" cards mixed with smaller supporting cards
- Staggered grid layouts (2 large + 3 small, etc.)

### 7. Horizontal Breaks
- Horizontal scrolling strips for games, features, or testimonials
- Breaks the vertical monotony of the page
- Full-bleed image sections with text overlay

### 8. Floating/Overlapping Elements
- Stats as floating pills, not grid columns
- Cards that overlap section boundaries
- Images that break out of containers

## Scope

### Pages to Restructure

All 9 product pages under `src/app/[locale]/(marketing)/products/`:

1. Reading Advantage
2. Primary Advantage
3. Math Advantage
4. Science Advantage
5. STEM Advantage
6. Storytime Advantage
7. Zhongwen Advantage
8. Tutor Advantage
9. CodeCamp Advantage

### Out of Scope
- Homepage (already distinct enough)
- About, Contact, Blog pages
- Color changes (already done in previous track)
- Logo additions (already done)
- i18n content changes
- New features or functionality

## Per-Page Layout Specifications

### Reading Advantage (Flagship — Most Content)

**Section Flow:**
1. **Hero** — Asymmetric 7/5 with logo (already done)
2. **Full-Width Color Room (Sky)** — "Platform Features" showcase
   - Dark sky gradient background (`from-sky-600 via-sky-700 to-sky-800`)
   - Large glassmorphism cards showing desktop/tablet/mobile screenshots
   - Asymmetric layout: screenshots on left (8 cols), feature list on right (4 cols)
   - Uppercase label: "PLATFORM"
3. **Overlapping Section** — "Blended Learning" (overlaps previous by `-mt-20`)
   - `bg-sky-50` with `rounded-t-[40px]` creating overlap effect
   - 7/5 asymmetric split: text left, stacked images right
   - Dashed border container for "Teacher Tools" sub-section
4. **Horizontal Strip** — "Educational Games"
   - Full-width with `overflow-x-auto` for game cards
   - Game cards are wide (300px) with screenshots
   - Not a grid — a scrolling strip
5. **Stats as Floating Pills** — "Results"
   - 3 large stat pills on `bg-white` with `rounded-full`
   - Asymmetric placement: left, center-right, right
   - Not a 3-column grid
6. **Final CTA** — Full-width sky gradient with asymmetric text/image split

**What Makes It Unique:** Horizontal game strip + floating stat pills + overlapping sections

---

### Primary Advantage (Early Literacy Focus)

**Section Flow:**
1. **Hero** — Asymmetric 7/5 with logo
2. **Full-Width Color Room (Cyan)** — "CEFR Aligned"
   - Cyan gradient background
   - Large centered card with CEFR levels (Pre-A1, A1, A2, B1)
   - Levels shown as connected timeline/steps, not grid
   - Uppercase label: "CURRICULUM ALIGNMENT"
3. **Asymmetric 5/7 (Reversed)** — "Key Features"
   - Image on LEFT (5 cols), text on RIGHT (7 cols) — reversed from usual
   - Large rounded image with floating feature badges
4. **Overlapping Section** — "Platform in Action"
   - `-mt-20` overlap from previous
   - 2×3 image grid (not 3-column cards) showing screenshots
   - Images have `rounded-3xl` with subtle rotation (-2deg, +2deg alternating)
5. **Stats** — Single large stat card + 2 smaller supporting cards (staggered)
6. **Final CTA** — Centered with floating decorative elements

**What Makes It Unique:** Reversed 5/7 split + timeline CEFR display + rotated image grid

---

### Math Advantage (Problem-Solving Focus)

**Section Flow:**
1. **Hero** — Asymmetric 7/5 with logo
2. **Full-Width Color Room (Orange)** — "Subject Coverage"
   - Orange gradient background
   - 6 subject bubbles (not cards) arranged in organic cluster
   - Bubbles are different sizes, floating at different heights
   - Uppercase label: "SUBJECTS COVERED"
3. **Asymmetric 7/5** — "Smart Problem Generation"
   - Text left, large illustration/mockup right
   - Deep-dive into ONE feature (not 3 cards)
4. **Overlapping Section** — "Benefits"
   - `-mt-20` overlap
   - 2-column large cards (not 3) with icon + description
   - Cards have mixed border styles: one solid, one dashed
5. **Stats** — Large central stat with 2 supporting stats as floating pills beside it
6. **Final CTA** — Full-width orange gradient

**What Makes It Unique:** Organic bubble cluster + single deep-dive feature + mixed border styles

---

### Science Advantage (Exploration Focus)

**Section Flow:**
1. **Hero** — Asymmetric 7/5 with logo
2. **Full-Width Color Room (Rose)** — "Core Value Proposition"
   - Rose gradient background
   - 3 large value cards with generous padding (not compact)
   - Cards have `rounded-[40px]` — more generous than usual
   - Uppercase label: "WHY SCIENCE ADVANTAGE"
3. **Large Image Break** — Full-bleed photo with text overlay
   - Uses the generated `science-advantage-hero.jpg`
   - `min-h-[60vh]` with centered text and glassmorphism overlay
   - Cinematic moment breaking the page flow
4. **Asymmetric 7/5** — "NGSS Aligned Features"
   - Text left, feature list right with large checkmark icons
   - Feature list is vertical stack (not grid)
5. **Target Audience** — 2-column cards (not 3) on light background
   - More spacious, editorial feel
6. **Waitlist CTA** — Card with email input, overlapping the previous section by `-mt-12`

**What Makes It Unique:** Full-bleed image break + editorial 2-column layout + overlapping waitlist card

---

### STEM Advantage (Coding + Building Focus)

**Section Flow:**
1. **Hero** — Asymmetric 7/5 with logo
2. **Full-Width Color Room (Indigo)** — "Grade Level Breakdown"
   - Indigo gradient background
   - Horizontal timeline showing 3 grade levels
   - Timeline has connecting line with animated dot
   - Each level is a large card with icon and description
   - Uppercase label: "GRADE LEVELS"
3. **Asymmetric 5/7 (Reversed)** — "75% Coding, 25% STEM"
   - Large illustration left (5 cols), deep-dive text right (7 cols)
   - Big stat callout ("75%") as oversized text
4. **Overlapping Section** — "Benefits"
   - `-mt-20` overlap on indigo background
   - 3 benefit cards with generous spacing (not compact grid)
   - Cards have alternating border styles (solid, dashed, solid)
5. **Technical Requirements** — Checklist in single-column with large check icons
   - Not a grid — a vertical checklist with generous spacing
6. **Final CTA** — Full-width indigo gradient

**What Makes It Unique:** Horizontal timeline + oversized stat callout + alternating border styles

---

### Storytime Advantage (Warm, Inviting Focus)

**Section Flow:**
1. **Hero** — Asymmetric 7/5 with logo
2. **Full-Width Color Room (Amber)** — "For Every Classroom"
   - Amber gradient background
   - 2 large cards (not 3) with generous padding
   - Cards overlap slightly (negative margin between them)
   - Uppercase label: "KEY FEATURES"
3. **Asymmetric 7/5** — "K-3 Curriculum"
   - Text left, large teacher-tools image right
   - Image has decorative dashed-border frame offset by 8px
4. **Overlapping Section** — "Teacher Resources"
   - `-mt-20` overlap
   - 3 resource cards in staggered layout (not aligned grid)
   - Middle card is offset downward by 20px
5. **FAQ Accordion** — Unique to this page!
   - Expandable FAQ section with amber accents
   - Not present on any other product page
   - Creates distinct personality for Storytime
6. **Final CTA** — Full-width amber gradient

**What Makes It Unique:** Staggered cards + decorative dashed frame + FAQ accordion (page-unique)

---

### Zhongwen Advantage (Cultural + Technical Focus)

**Section Flow:**
1. **Hero** — Asymmetric 7/5 with logo
2. **Full-Width Color Room (Fuchsia)** — "Dual-Level Learning System"
   - Fuchsia gradient background
   - 3-column system (Reading Advantage levels → HSK levels)
   - Shown as connected mapping, not isolated cards
   - Uppercase label: "LEVEL MAPPING"
3. **Large Image Break** — Calligraphy photo with text overlay
   - Uses generated `zhongwen-advantage-hero.jpg`
   - Glassmorphism overlay with feature highlights
4. **Asymmetric 7/5** — "Interactive Learning"
   - Text left, 2 large feature cards stacked vertically on right
   - Cards have generous padding and `rounded-[40px]`
5. **Teacher Features** — 3-column grid (this page keeps the grid intentionally)
   - But cards are taller, more editorial
6. **FAQ + Waitlist** — Combined section with email capture
   - FAQ above, waitlist form below in same container
7. **Final CTA** — Full-width fuchsia gradient

**What Makes It Unique:** Level mapping visualization + combined FAQ/waitlist section + editorial card sizing

---

### Tutor Advantage (Personal + Professional Focus)

**Section Flow:**
1. **Hero** — Asymmetric 7/5 with logo
2. **Full-Width Color Room (Emerald)** — "How It Works"
   - Emerald gradient background
   - 3 step cards in horizontal flow with connecting arrows
   - Steps: "Assess → Personalize → Progress"
   - Uppercase label: "THE PROCESS"
3. **Asymmetric 5/7 (Reversed)** — "AI-Powered Personalization"
   - Large screenshot/mockup left, text right
   - Mockup has subtle shadow and rotation
4. **Overlapping Section** — "Platform Features"
   - `-mt-20` overlap
   - 6 feature items in 2 rows of 3 (hexagonal feel through spacing)
   - Not standard grid — items have varied padding
5. **Trust Signals** — Floating testimonial cards
   - 3 cards floating at different heights
   - Cards have glassmorphism on emerald background
6. **Stats + CTA Combined** — Stats above, CTA button below in same section
   - Not separate sections — unified closing moment

**What Makes It Unique:** Horizontal process flow + floating testimonials + combined stats/CTA

---

### CodeCamp Advantage (Dark, Technical Focus)

**Section Flow:**
1. **Hero** — Asymmetric 7/5 with logo (on dark slate gradient)
2. **Full-Width Dark Room (Slate)** — "Technology Tracks"
   - Dark slate background (`from-slate-800 via-slate-900 to-slate-950`)
   - 3 track cards with amber accents
   - Cards have code-like styling: monospace labels, bracket decorations
   - Uppercase label: "TRACKS" (in monospace)
3. **Asymmetric 7/5** — "Project-Based Learning"
   - Text left, project showcase cards right
   - Cards show "Before/After" or "Code/Result" split
4. **Technology Stack Strip** — Horizontal scrolling strip
   - Logos/technologies as horizontal scroll
   - Full-bleed with dark background
   - Breaks vertical monotony
5. **Overlapping Section** — "Key Features"
   - `-mt-20` overlap on white background
   - 2 large feature cards with code snippets
   - Cards have `border-l-4 border-amber-500` accent
6. **Final CTA** — Dark slate with amber accent button

**What Makes It Unique:** Dark theme throughout + code styling + horizontal tech strip + border-left accent cards

## Component Requirements

### New Shared Components Needed

1. **OverlappingSection** — Wrapper that creates `-mt-20` overlap with `rounded-t-[40px]`
2. **FloatingPill** — Stat display as pill-shaped container with generous padding
3. **HorizontalStrip** — Full-bleed horizontal scrolling container
4. **LargeImageBreak** — Full-bleed image section with text overlay
5. **StepFlow** — Horizontal connected steps with arrows
6. **Timeline** — Vertical or horizontal timeline with dots and connecting lines
7. **FAQAccordion** — Expandable FAQ with animated chevron

### Updated Existing Components

1. **Card** — Support for mixed border styles, varied padding, offset positioning
2. **Button** — Support for monospace variant (CodeCamp)

## Technical Requirements

- All pages remain server components where possible
- All animations use `tailwindcss-animate` (no Framer Motion)
- All images use `next/image` with proper sizing
- Responsive: works at 375px, 768px, 1024px, 1440px
- `npm run build` exits 0
- `npm test` passes
- `npm run i18n:verify` exits 0

## Acceptance Criteria

- [ ] No two product pages share the same section sequence
- [ ] Every page has at least one unique layout pattern not used on other pages
- [ ] Every page has at least 2 full-width color "room" sections
- [ ] At least 3 pages use asymmetric 5/7 splits (reversed from 7/5)
- [ ] At least 2 pages have overlapping sections (-mt-20)
- [ ] At least 2 pages have horizontal scrolling strips
- [ ] At least 1 page has a full-bleed image break
- [ ] At least 1 page has an FAQ accordion (Storytime)
- [ ] At least 1 page has a timeline/step flow (STEM/Tutor)
- [ ] At least 3 pages use dashed borders on secondary containers
- [ ] Every section has an uppercase label with tracking-widest
- [ ] No page uses the generic "3-column feature cards → stats → CTA" template
- [ ] Cards have varied sizes within pages (not all identical)
- [ ] All pages render correctly in EN, TH, and ZH locales
- [ ] `npm run build` exits 0
- [ ] `npm test` passes
- [ ] `npm run i18n:verify` exits 0
