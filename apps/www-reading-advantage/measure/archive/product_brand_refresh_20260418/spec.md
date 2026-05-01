# Track: Product Brand Refresh

## Overview

The product pages across the Reading Advantage platform currently use incorrect, inconsistent, or arbitrary color schemes that do not align with the product brand identities. Additionally, most product heroes lack the product logo entirely. This track corrects all color assignments to match the official product brand palette, adds product logos to every hero section, and ensures visual consistency with the actual product guidelines (`measure/product-guidelines.md`).

**This track replaces the archived `complete_site_redesign_20260412` track**, which implemented a conflicting "Clay" design system (warm cream, Roobert font, broken button animations) that violated the product guidelines.

## Scope

### Pages to Update

All 9 product pages under `src/app/[locale]/(marketing)/products/`:

1. Reading Advantage (`/products/reading-advantage`)
2. Primary Advantage (`/products/primary-advantage`)
3. Math Advantage (`/products/math-advantage`)
4. Science Advantage (`/products/science-advantage`)
5. STEM Advantage (`/products/stem-advantage`)
6. Storytime Advantage (`/products/storytime-advantage`)
7. Zhongwen Advantage (`/products/zhongwen-advantage`)
8. Tutor Advantage (`/products/tutor-advantage`)
9. CodeCamp Advantage (`/products/codecamp-advantage`)

### Components to Update

1. **HeroSection component** — support product logo display alongside floating images
2. **Button component** — remove broken Clay artifacts, restore standard hover animations
3. **Card component** — remove Clay shadows, restore glassmorphism per product guidelines

## Design System (Authoritative)

### Source of Truth

The **only** authoritative design documents are:
- `measure/product.md` — Product vision and constraints
- `measure/product-guidelines.md` — Visual identity and brand guidelines

**NOT `measure/DESIGN.md`** — that document describes an experimental Clay aesthetic that was rejected and must not be used.

### Color System

#### Global Base
- **Page background:** `sky-50` (`#f0f9ff`) — the unifying platform base
- **Text primary:** `sky-900` (`#0c4a6e`)
- **Text secondary:** `slate-600` (`#475569`)
- **Card background:** `white` with `bg-white/90` glassmorphism
- **Borders:** `white/20` or subtle `sky-100` — **never** oat/warm tones

#### Product Brand Colors (Hero Gradients & Accents)

Each product page uses its specific brand gradient in the hero section and as accent colors throughout:

| Product | Gradient Start | Gradient End | Hex Values |
|---------|---------------|--------------|------------|
| Reading Advantage | Sky 400 | Sky 900 | `#38bdf8` → `#0c4a6e` |
| Primary Advantage | Cyan 400 | Cyan 800 | `#22d3ee` → `#155e75` |
| Math Advantage | Orange 300 | Orange 800 | `#fdba74` → `#9a3412` |
| Science Advantage | Rose 300 | Rose 800 | `#fda4af` → `#9f1239` |
| STEM Advantage | Indigo 300 | Indigo 800 | `#a5b4fc` → `#3730a3` |
| Storytime Advantage | Amber 300 | Amber 800 | `#fcd34d` → `#92400e` |
| Zhongwen Advantage | Fuchsia 300 | Fuchsia 800 | `#f0abfc` → `#86198f` |
| Tutor Advantage | Emerald 300 | Emerald 800 | `#6ee7b7` → `#065f46` |
| CodeCamp Advantage | Slate 700 | Slate 900 | `#334155` → `#0f172a` |

**Logo colors** (for reference when displaying logos):
- Reading Advantage: `sky-500` + `indigo-900`
- All others: use the gradient colors above as logo context

### Typography

- **Primary font:** Geist (variable font, already configured in project)
- **Monospace:** GeistMono (for code/technical sections)
- **Headings:** weight 600–700, tight letter-spacing (`tracking-tight`)
- **Body:** weight 400, comfortable line-height (`leading-relaxed`)
- **Labels/Overlines:** uppercase, weight 600, wide tracking (`tracking-widest`)

**No OpenType stylistic sets. No Roobert font references.**

### Visual Effects

- **Glassmorphism:** `bg-white/90 backdrop-blur-md` for cards on colored sections
- **Shadows:** Standard Tailwind `shadow-lg`, `shadow-xl` — **no** clay inset shadows
- **Hover animations:** Subtle `hover:-translate-y-1` or `hover:scale-105` with `transition-all duration-300`
- **Entry animations:** `tailwindcss-animate` utility classes (`animate-in fade-in slide-in-from-bottom-8`)
- **No Framer Motion** anywhere

### Hero Section Standard

Every product hero **must** include:
1. Product-specific gradient background (see table above)
2. Product logo image prominently displayed (right side on desktop, centered on mobile)
3. H1 title with product name
4. Subtitle + description
5. CTA button with `white` variant
6. Optional: subtle gradient orbs/blurs for depth

## Functional Requirements

### 1. Correct All Hero Gradients

Replace every incorrect hero gradient with the exact brand gradient specified above.

**Current wrong examples to fix:**
- Math: `emerald-500 via teal-500 to emerald-600` → `orange-300 to orange-800`
- Science: `violet-500 via purple-500 to violet-600` → `rose-300 to rose-800`
- STEM: `orange-500 via amber-500 to orange-600` → `indigo-300 to indigo-800`
- Storytime: `pink-500 via rose-500 to pink-600` → `amber-300 to amber-800`
- Zhongwen: `red-500 via rose-600 to red-700` → `fuchsia-300 to fuchsia-800`
- Tutor: `sky-500 via blue-500 to sky-600` → `emerald-300 to emerald-800`

### 2. Add Product Logos to All Heroes

Every product page must display its logo in the hero section.

**Available logo assets (700×700px):**
- `/reading-advantage.jpg`
- `/primary-advantage logo.png`
- `/math-advantage.png`
- `/science-advantage.png`
- `/stem-advantage.png`
- `/storytime-advantage.png`
- `/zhongwen-advantage.png`
- `/tutor-advantage.png`
- `/codecamp-advantage.png` (if exists; otherwise use text/SVG)

**Logo display requirements:**
- Size: approximately 300–400px on desktop, 200px on mobile
- Style: rounded corners (`rounded-3xl`), subtle shadow (`shadow-2xl`)
- Position: right side of hero on desktop (asymmetric 7/5 or 6/6 split), centered below text on mobile
- Animation: gentle `animate-in fade-in slide-in-from-right-8 duration-1000`
- Background: if logo has transparency, place on `bg-white/20 backdrop-blur-sm` circle/square

### 3. Remove Clay Design Artifacts

Remove all traces of the rejected Clay design system:

- **Remove:** `bg-warm-cream` → replace with `bg-sky-50` or `bg-white`
- **Remove:** `font-roobert` → use standard font classes (Geist is default)
- **Remove:** `border-oat-border` → replace with `border-sky-100` or `border-white/20`
- **Remove:** `shadow-clay`, `shadow-hard-offset` → use standard Tailwind shadows
- **Remove:** `hover:rotate-z-[-8deg]` — invalid CSS, never worked
- **Remove:** Any inline `fontFamily: "Roobert"` styles
- **Remove:** Any references to warm cream `#faf9f7` or oat `#dad4c8` colors

### 4. Standardize Button Hover States

All buttons should use consistent, subtle hover effects:
- `hover:-translate-y-1 hover:shadow-lg transition-all duration-300`
- Primary buttons: solid brand color → slightly darker shade
- White buttons: `bg-white` → `bg-sky-50`
- Ghost/outline buttons: `border-current` → `bg-white/10`

**No rotation. No aggressive -80% translate. No hard offset shadows.**

### 5. Standardize Card Styling

Cards should use the product-standard glassmorphism:
- `bg-white/90 backdrop-blur-md`
- `border border-white/20` (on dark/colored backgrounds) or `border-sky-100` (on light backgrounds)
- `rounded-3xl` (24px radius)
- `shadow-lg` or `shadow-xl`
- Hover: `hover:-translate-y-1 hover:shadow-xl transition-all duration-300`

### 6. Maintain i18n

- All text must remain sourced from existing locale files
- No new translation keys
- `npm run i18n:verify` must exit 0

## Non-Functional Requirements

- **Performance:** No new dependencies. Remove unused design tokens from Tailwind config.
- **Accessibility:** WCAG 2.1 AA contrast on all hero text (white text on brand gradients is generally fine, but verify)
- **Responsiveness:** Mobile-first, works at 375px, 768px, 1024px, 1440px
- **Build:** `npm run build` exits 0 with TypeScript strict mode
- **Tests:** `npm test` passes

## Acceptance Criteria

- [ ] All 9 product pages use their exact brand gradient in the hero
- [ ] All 9 product pages display their product logo in the hero section
- [ ] No `bg-warm-cream` classes remain in any product page
- [ ] No `font-roobert` classes remain in any product page
- [ ] No `border-oat-border` classes remain in any product page
- [ ] No `shadow-clay` or `shadow-hard-offset` classes remain
- [ ] No invalid `rotate-z` CSS classes remain
- [ ] No inline Roobert font styles remain
- [ ] All pages use `sky-50` or `white` backgrounds, not warm cream
- [ ] HeroSection component supports product logo display
- [ ] All pages render correctly in EN, TH, and ZH locales
- [ ] `npm run i18n:verify` exits 0
- [ ] `npm run build` exits 0 with no TypeScript errors
- [ ] `npm test` passes
- [ ] Mobile layout (375px) shows single-column stack with logo centered below text

## Out of Scope

- Redesigning the homepage (unless necessary for consistency)
- Redesigning About, Contact, or Blog pages
- Changing site structure or URL patterns
- Adding new translation keys or content
- Backend changes
- SEO optimization beyond what's necessary for the refresh
