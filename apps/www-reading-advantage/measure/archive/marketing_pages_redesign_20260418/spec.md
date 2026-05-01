# Track: Marketing Pages Redesign

## Overview

The product pages were recently overhauled with a distinctive, high-quality design system: glassmorphism cards (`bg-white/90 backdrop-blur-md`), asymmetric 7/5 layouts, uppercase `tracking-widest` wayfinding labels, generous `rounded-3xl` radius, and standard Button component CTAs. The remaining marketing pages (Home, About, Features, Pricing, Services, Contact) still use older, inconsistent styling: `rounded-lg`, `text-gray-700`, custom inline Link CTAs, hard-coded English strings, emoji icons, and plain blocky layouts. This track brings every marketing page up to the same visual standard as the product pages.

## Scope

### Pages to Update

All non-product marketing pages under `src/app/[locale]/(marketing)/`:

1. **Home** (`/(home)/page.tsx`) — Remove inline styles, hardcoded stats; standardize cards/CTAs
2. **About** (`/about/page.tsx`) — Add asymmetric layouts, glassmorphism, uppercase labels; standardize cards/CTAs
3. **Features** (`/features/page.tsx`) — Remove hard-coded strings; add asymmetric layout; standardize cards/CTAs
4. **Pricing** (`/pricing/page.tsx`) — Add visual distinction beyond table; standardize CTA
5. **Services** (`/services/page.tsx`) — Standardize CTA to Button component; polish cards
6. **Contact** (`/contact/page.tsx`) — Remove emoji; standardize radius/colors/CTAs; add glassmorphism

### Out of Scope
- Blog pages (covered by `blog_pagination_20260408`)
- Case Studies page (separate track if needed)
- Services sub-pages (`blended-learning`, `managed-service`) — keep as-is for now
- Backend or API changes
- New features or functionality
- i18n content additions (except removing hard-coded English)

## Design System (Authoritative)

Source: `measure/product-guidelines.md` and the completed `product_brand_refresh_20260418` + `product_page_structure_redesign_20260418` tracks.

### Colors
- **Page background:** `sky-50` (`#f0f9ff`)
- **Text primary:** `sky-900` (`#0c4a6e`)
- **Text secondary:** `slate-600` (`#475569`)
- **Text on dark:** `white` or `sky-50`
- **Card background:** `white` or `bg-white/90 backdrop-blur-md` on colored sections
- **Borders:** `white/20` (on dark) or `sky-100` (on light)

### Typography
- **Primary font:** Geist (default, already configured)
- **Headings:** weight 600–700, `tracking-tight`
- **Body:** weight 400, `leading-relaxed`
- **Overlines/Labels:** `uppercase tracking-widest text-xs font-semibold`

### Spacing & Radius
- **Cards:** `rounded-3xl` (24px) minimum
- **Section containers:** `rounded-[40px]` (40px) where applicable
- **Pills/badges:** `rounded-full`
- **Images:** `rounded-3xl`

### Shadows & Effects
- **Cards:** `shadow-lg`, hover: `hover:-translate-y-1 hover:shadow-xl transition-all duration-300`
- **Glassmorphism:** `bg-white/90 backdrop-blur-md border border-white/20`
- **No clay shadows**, no `shadow-md` on primary cards

### Animations
- **Entry:** `animate-in fade-in slide-in-from-bottom-8 duration-700`
- **Hover:** subtle `hover:-translate-y-1` or `hover:scale-105` with `transition-all duration-300`
- **No Framer Motion**

### CTA Standard
Every page CTA must use the `<Button>` component (or `<Button asChild>` for links), not custom inline `<Link>` or `<a>` with hand-rolled Tailwind classes.

### Section Labels (Wayfinding)
Every major section should have an uppercase label above the heading:
```
<span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">
  SECTION LABEL
</span>
```

## Functional Requirements

### 1. Standardize All CTAs to Button Component
Replace every custom inline `<Link className="bg-... hover:...">` or `<a className="...">` in page files with the `<Button>` component from `@/components/ui/button`.

**Pages affected:** About, Features, Pricing, Services, Contact (and verify Home)

**Button variants to use:**
- Primary actions: `variant="primary"` or `variant="default"`
- On dark backgrounds: `variant="white"`
- Secondary/outline: `variant="outline"` or `variant="ghost"`

### 2. Standardize Card Border Radius
All card-like containers must use `rounded-3xl` minimum. Replace:
- `rounded-lg` → `rounded-3xl` (or `rounded-2xl` for small elements)
- `rounded-xl` → `rounded-3xl` for primary cards

### 3. Standardize Text Colors
Replace inconsistent gray shades:
- `text-gray-700` → `text-slate-600`
- `text-gray-600` → `text-slate-600`
- `text-gray-900` → `text-slate-900` or `text-sky-900`
- Keep `text-white` / `text-sky-50` on dark backgrounds

### 4. Add Glassmorphism to Cards on Dark/Colored Sections
Any card floating on a gradient or dark background must use:
```
bg-white/90 backdrop-blur-md border border-white/20 rounded-3xl
```

### 5. Add Uppercase Wayfinding Labels
Every major section (after the hero) should have an uppercase label above its H2.

### 6. Remove Hard-Coded English Strings
The Features page has a `features` array with hard-coded English `title` and `description` strings. These must be replaced with i18n `t()` calls.

### 7. Remove Emoji Icons
The Contact page uses `📱` emoji for TikTok. Replace with a Lucide icon (e.g., `Smartphone` or `ExternalLink`).

### 8. Remove Inline Styles
The Home page uses inline `style={{ letterSpacing: "..." }}` objects. Replace with Tailwind utility classes (`tracking-tight`, etc.) or remove if unnecessary.

### 9. Make Stats i18n-Compatible
The Home page has hardcoded stats: "10,000+", "12", and Big 4 text. These should use i18n keys if they exist, or be left as-is if no locale keys are available (document in deviation notes).

### 10. Apply Asymmetric Layouts Where Appropriate
Not every page needs full restructuring like the product pages, but add at least one asymmetric 7/5 or 5/7 split to:
- About page (text + image or stats)
- Features page (feature highlight section)

## Non-Functional Requirements

- **Performance:** No new dependencies
- **Accessibility:** WCAG 2.1 AA contrast on all text
- **Responsiveness:** Mobile-first, works at 375px, 768px, 1024px, 1440px
- **Build:** `npm run build` exits 0 with TypeScript strict mode
- **Tests:** `npm test` passes
- **i18n:** `npm run i18n:verify` exits 0; no hard-coded English strings remain

## Acceptance Criteria

- [ ] All CTAs on Home, About, Features, Pricing, Services, Contact use the `<Button>` component
- [ ] No custom inline `<Link>` or `<a>` with hand-rolled bg/hover/px/py classes remains as a CTA
- [ ] All primary cards use `rounded-3xl` minimum
- [ ] No `text-gray-700` or `text-gray-600` remains on marketing pages (use `slate` scale)
- [ ] Cards on dark/colored sections use glassmorphism (`bg-white/90 backdrop-blur-md`)
- [ ] Every major section has an uppercase wayfinding label
- [ ] Features page has no hard-coded English strings in the features array
- [ ] Contact page has no emoji icons
- [ ] Home page has no inline `style={{...}}` objects for typography
- [ ] At least 2 pages (About, Features) have an asymmetric 7/5 or 5/7 split
- [ ] All pages render correctly in EN, TH, and ZH locales
- [ ] `npm run i18n:verify` exits 0
- [ ] `npm run build` exits 0 with no TypeScript errors
- [ ] `npm test` passes

## Out of Scope

- Blog listing or post pages (handled by `blog_pagination_20260408`)
- Case studies page
- Services sub-pages (`blended-learning`, `managed-service`)
- Backend/API changes
- New features or functionality beyond visual standardization
- SEO metadata (handled by `seo_metadata_audit_20260408`)
