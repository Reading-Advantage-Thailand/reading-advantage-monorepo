# Plan: Site-Wide Refactor — Appearance, Performance & Code Quality

---

## Phase 1: Critical Bug Fixes

These are quick, high-impact fixes that should be done first because they affect functionality and build safety.

---

### Task 1.1: Fix `conntainer` typo on pricing page

**What you are fixing:** The pricing page CTA section has a CSS class typo. The class `conntainer` (with two `n`s) is not a real Tailwind/CSS class, so the CTA section has no max-width or centering — it stretches to the full browser width.

**File to edit:** `src/app/[locale]/(marketing)/pricing/page.tsx`

**Steps:**

- [x] Open `src/app/[locale]/(marketing)/pricing/page.tsx`
- [x] Go to **line 46**. You will see this line:
  ```tsx
  <div className="conntainer mx-auto px-4 text-center">
  ```
- [x] Change `conntainer` to `container` (remove the extra `n`). The line should now read:
  ```tsx
  <div className="container mx-auto px-4 text-center">
  ```
- [x] Save the file
- [x] **Verify:** Run `npm run dev`, open `http://localhost:3000/en/pricing`, scroll down to the blue CTA section at the bottom. The text "Ready to Transform Your Reading Program?" should now be centered in the page with proper margins on each side, not stretching edge-to-edge.

---

### Task 1.2: Fix broken `href="#"` link on about page

**What you are fixing:** The "Contact Us" button at the bottom of the About page uses `href="#"` which does nothing when clicked. It should navigate to the contact page.

**File to edit:** `src/app/[locale]/(marketing)/about/page.tsx`

**Steps:**

- [x] Open `src/app/[locale]/(marketing)/about/page.tsx`
- [x] At the top of the file, check if `Link` from `next/link` is already imported. Currently it is **not** imported. Add this import after line 2:
  ```tsx
  import Link from 'next/link';
  ```
- [x] Go to **line 193**. You will see:
  ```tsx
  <a href="#" className="bg-sky-500 text-sky-50 hover:bg-sky-600 px-6 py-3 rounded-lg font-bold transition-colors inline-block">
  ```
- [x] Replace the entire `<a>` tag (lines 193-195) with a Next.js `Link` component pointing to `/contact`:
  ```tsx
  <Link href="/contact" className="bg-sky-500 text-sky-50 hover:bg-sky-600 px-6 py-3 rounded-lg font-bold transition-colors inline-block">
    {t('sections.cta.button')}
  </Link>
  ```
- [x] Save the file
- [x] **Verify:** Run `npm run dev`, open `http://localhost:3000/en/about`, scroll to the very bottom blue section. Click the button — it should navigate you to `http://localhost:3000/en/contact`.

---

### Task 1.3: Re-enable TypeScript build error checking

**What you are fixing:** `next.config.ts` has `ignoreBuildErrors: true` which means TypeScript errors are silently ignored during builds. This is dangerous because broken code can ship to production.

**File to edit:** `next.config.ts`

**Steps:**

- [x] Open `next.config.ts` (in the project root, NOT inside `src/`)
- [x] Go to **line 22**. You will see:
  ```ts
  ignoreBuildErrors: true,
  ```
- [x] Change `true` to `false`:
  ```ts
  ignoreBuildErrors: false,
  ```
- [x] Save the file
- [x] **Verify:** Run `npm run build` from the project root. Watch the output carefully. If there are TypeScript errors, they will now show up as red error messages. You need to fix ALL of them before moving on. Common fixes:
  - Missing type annotations → add the correct type
  - Unused imports → remove them
  - Type mismatches → fix the type or cast appropriately
- [x] Keep running `npm run build` until it succeeds with zero errors. Fix each error one at a time.

**Important:** This task may take longer than others because you might discover multiple type errors. Fix them all — do not skip any.

---

### Task 1.4: Configure production image domains in `next.config.ts`

**What you are fixing:** The `images.domains` config only allows `localhost`, which means if you ever load images from an external URL (like a CDN), they will fail in production.

**File to edit:** `next.config.ts`

**Steps:**

- [x] Open `next.config.ts`
- [x] Go to **lines 14-16**. You will see:
  ```ts
  images: {
    domains: ['localhost'],
  },
  ```
- [x] Replace `domains` with the modern `remotePatterns` syntax (Next.js 15 prefers this). Change it to:
  ```ts
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  ```
  **What this does:** Allows images from any HTTPS domain. If the team knows the exact CDN domains, those can be specified instead of `**` later.
- [x] Save the file
- [x] **Verify:** Run `npm run build` — it should still succeed without errors.

---

- [x] Task: Measure - User Manual Verification 'Phase 1: Critical Bug Fixes' (Protocol in workflow.md)

---

## Phase 2: Performance — Remove Framer Motion & Reduce Bundle Size

This phase removes the biggest performance bottleneck: the `framer-motion` library and unnecessary client components.

---

### Task 2.1: Remove `PageTransition` wrapper from marketing layout

**What you are fixing:** The marketing layout wraps ALL pages in a `PageTransition` component that imports `framer-motion`. This forces every page to load framer-motion's JavaScript (~50 KB gzipped) even though the transition effect is barely noticeable.

**Files to edit:**
1. `src/app/[locale]/(marketing)/layout.tsx`
2. `src/components/layout/page-transition.tsx` (delete this file)

**Steps:**

- [x] Open `src/app/[locale]/(marketing)/layout.tsx`
- [x] **Remove the import** on line 3:
  ```tsx
  import { PageTransition } from '@/components/layout/page-transition';
  ```
  Delete this entire line.
- [x] In the return statement, **remove the `<PageTransition>` wrapper** but KEEP everything inside it. The return should change from:
  ```tsx
  return (
      <>
          <Header />
          <PageTransition>
              <div className="flex flex-col min-h-screen">
                  <main className="flex-1">
                      {children}
                  </main>
                  <Footer />
              </div>
          </PageTransition>
      </>
  )
  ```
  To:
  ```tsx
  return (
      <>
          <Header />
          <div className="flex flex-col min-h-screen">
              <main className="flex-1">
                  {children}
              </main>
              <Footer />
          </div>
      </>
  )
  ```
- [x] Save the file
- [x] **Delete the file** `src/components/layout/page-transition.tsx` entirely. You can do this from your terminal:
  ```bash
  rm src/components/layout/page-transition.tsx
  ```
- [x] **Verify:** Run `npm run dev` and navigate between pages (e.g., from homepage → about → products). Pages should still load normally. There should be no console errors about missing imports.

---

### Task 2.2: Uninstall `framer-motion` from the project

**What you are doing:** Removing the framer-motion package entirely from the project since we no longer use it anywhere.

**Steps:**

- [x] First, make sure NO other file imports framer-motion. Run this search from the project root:
  ```bash
  grep -r "framer-motion" src/
  ```
  If this command returns ANY results, you need to go fix those files first (remove the framer-motion imports and replace with CSS animations). If it returns nothing, proceed.
- [x] Uninstall the package:
  ```bash
  npm uninstall framer-motion
  ```
- [x] **Verify:** Open `package.json` and confirm that `framer-motion` is no longer listed under `dependencies` or `devDependencies`.
- [x] Run `npm run build` to make sure the build still succeeds without framer-motion.

---

### Task 2.3: Convert services page from client to server component

**What you are fixing:** `services/page.tsx` has `"use client"` at the top, which means all its code runs in the browser as JavaScript. But this page only uses i18n translations and static rendering — it doesn't need to be a client component. Converting it to a server component means its JavaScript won't be sent to the browser at all.

**File to edit:** `src/app/[locale]/(marketing)/services/page.tsx`

**Steps:**

- [x] Open `src/app/[locale]/(marketing)/services/page.tsx`
- [x] **Remove** the `"use client";` directive on **line 1**. Delete the entire line.
- [x] **Change the i18n import** on line 6. Replace:
  ```tsx
  import { useScopedI18n } from "@/locales/client";
  ```
  With:
  ```tsx
  import { getScopedI18n } from "@/locales/server";
  ```
  **Why:** Client components use `useScopedI18n` (a React hook). Server components use `getScopedI18n` (an async function).
- [x] **Change the function signature** on line 8. Replace:
  ```tsx
  export default function Services() {
  ```
  With:
  ```tsx
  export default async function Services() {
  ```
  **Why:** Server components can be `async` to use `await`.
- [x] **Change the i18n call** on line 9. Replace:
  ```tsx
  const t = useScopedI18n("pages.services");
  ```
  With:
  ```tsx
  const t = await getScopedI18n("pages.services");
  ```
- [x] Save the file
- [x] **Verify:** Run `npm run dev`, open `http://localhost:3000/en/services`. The page should look exactly the same as before. Check the browser console for errors — there should be none.

---

### Task 2.4: Convert case-studies page from client to server component

**What you are fixing:** Same issue as the services page — `case-studies/page.tsx` is a client component but doesn't need to be.

**File to edit:** `src/app/[locale]/(marketing)/case-studies/page.tsx`

**Steps:**

- [x] Open `src/app/[locale]/(marketing)/case-studies/page.tsx`
- [x] **Remove** the `"use client";` directive on **line 1**
- [x] **Change the i18n import** on line 6. Replace:
  ```tsx
  import { useScopedI18n } from "@/locales/client";
  ```
  With:
  ```tsx
  import { getScopedI18n } from "@/locales/server";
  ```
- [x] **Change the function signature** on line 8. Replace:
  ```tsx
  export default function CaseStudies() {
  ```
  With:
  ```tsx
  export default async function CaseStudies() {
  ```
- [x] **Change the i18n call** on line 9. Replace:
  ```tsx
  const t = useScopedI18n("pages.caseStudies");
  ```
  With:
  ```tsx
  const t = await getScopedI18n("pages.caseStudies");
  ```
- [x] Save the file
- [x] **Verify:** Run `npm run dev`, open `http://localhost:3000/en/case-studies`. The page should look exactly the same. No console errors.

---

### Task 2.5: Remove excessive `priority` props from images

**What you are fixing:** The `priority` prop on a Next.js `<Image>` tells the browser to load that image immediately (preload). If you mark too many images as `priority`, the browser tries to load them ALL at once, which actually makes the page *slower*. Only the first image the user sees (above the fold) should have `priority`.

**Files to edit:** Multiple pages. Follow these rules for EACH file:
- **Keep `priority`** on: The very first hero image on the page (the one visible without scrolling)
- **Remove `priority`** from: ALL other images

**Step-by-step for each file:**

- [x] **`src/app/[locale]/(marketing)/services/page.tsx`**
  - Lines ~77-83: The service card images have `priority`. Remove `priority` from all of them. The hero section has no image, so no image needs `priority` on this page.

- [x] **`src/app/[locale]/(marketing)/case-studies/page.tsx`**
  - Lines ~102-127: There are 6+ images in the school sections, ALL with `priority`. Remove `priority` from ALL of them. The hero has no image.
  - Lines ~230-245: Dashboard and workbook images have `priority`. Remove these too.

- [x] **`src/app/[locale]/(marketing)/products/reading-advantage/page.tsx`**
  - Line ~118: Hero floating image — **keep** `priority` on this one (it's above the fold)
  - Lines ~184-198: Blended learning images — **remove** `priority`
  - Lines ~271-277: Game images — **remove** `priority`
  - Lines ~353-392: Platform demo images (desktop, tablet, mobile) — **remove** `priority`
  - Lines ~427-441: Teacher dashboard images — **remove** `priority`
  - Lines ~529-544: Student experience images — **remove** `priority`

- [x] **`src/app/[locale]/(marketing)/(home)/page.tsx`**
  - Line ~72: Hero image — **keep** `priority`
  - Line ~194: Flagship section image — **remove** `priority`

- [x] **`src/app/[locale]/(marketing)/products/page.tsx`**
  - Line ~84: Hero floating image — **keep** `priority`

- [x] **Verify:** Run `npm run build` to ensure no errors. Then run `npm run dev` and check that images still load (they just won't preload — they'll lazy-load instead, which is correct behavior).

---

### Task 2.6: Add `sizes` prop to all `fill` images

**What you are fixing:** When a Next.js `<Image>` uses the `fill` prop (instead of `width`/`height`), it needs a `sizes` prop to tell the browser what size the image will be displayed at. Without `sizes`, the browser downloads the largest possible image variant, wasting bandwidth.

**Rule:** Every `<Image>` that has the `fill` prop must also have a `sizes` prop. Use these standard values:
- Full-width images: `sizes="100vw"`
- Half-width on desktop: `sizes="(max-width: 768px) 100vw, 50vw"`
- Third-width on desktop: `sizes="(max-width: 768px) 100vw, 33vw"`
- Quarter-width on desktop: `sizes="(max-width: 768px) 50vw, 25vw"`

**Steps:**

- [x] Search the entire `src/` folder for `<Image` tags that have `fill` but no `sizes`. You can use this grep command:
  ```bash
  grep -rn "fill" src/ --include="*.tsx" | grep "Image"
  ```
- [x] For each `<Image fill>` found, add the appropriate `sizes` prop based on the layout context. For example:
  ```tsx
  {/* Before */}
  <Image src="/images/photo.png" alt="Photo" fill className="object-cover" />

  {/* After */}
  <Image src="/images/photo.png" alt="Photo" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
  ```
- [x] **Key files to check:**
  - `src/app/[locale]/(marketing)/case-studies/page.tsx` — many `fill` images in grid layouts (use `33vw`)
  - `src/app/[locale]/(marketing)/products/reading-advantage/page.tsx` — multiple `fill` images
  - `src/app/[locale]/(marketing)/services/page.tsx` — service card images
  - `src/app/[locale]/(marketing)/products/page.tsx` — hero image (use `50vw`)
  - `src/app/[locale]/(marketing)/(home)/page.tsx` — hero image (use `50vw`)
- [x] **Verify:** Run `npm run build` — no errors should appear.

---

- [x] Task: Measure - User Manual Verification 'Phase 2: Performance' (Protocol in workflow.md)

---

## Phase 3: Visual Consistency — Unified Color Palette

The site should use ONLY these accent colors: **amber/orange** (warm) and **sky blue** (brand). Remove all violet, purple, emerald, and pink usage.

---

### Task 3.1: Remove violet colors from about page

**What you are fixing:** The about page uses `text-violet-500` and `text-violet-600` for two headings, which clashes with the site's amber/sky color scheme.

**File to edit:** `src/app/[locale]/(marketing)/about/page.tsx`

**Steps:**

- [x] Open `src/app/[locale]/(marketing)/about/page.tsx`
- [x] Go to **line 42**. You will see:
  ```tsx
  <h2 className="text-3xl font-bold mb-6 text-violet-500">
  ```
  Change `text-violet-500` to `text-amber-600`:
  ```tsx
  <h2 className="text-3xl font-bold mb-6 text-amber-600">
  ```
- [x] Go to **line 150**. You will see:
  ```tsx
  <h2 className="text-4xl font-bold mb-6 text-violet-600">
  ```
  Change `text-violet-600` to `text-sky-700`:
  ```tsx
  <h2 className="text-4xl font-bold mb-6 text-sky-700">
  ```
- [x] Save the file
- [x] **Verify:** Run `npm run dev`, open `http://localhost:3000/en/about`. The "Our Story" heading should now be amber/orange colored, and "The Big 4 Quality Protocol" heading should be sky blue. No purple anywhere.

---

### Task 3.2: Remove emerald colors from contact page

**What you are fixing:** The contact page phone card uses `emerald` colors (green), which doesn't match the site's amber/sky palette. All three contact cards should use consistent brand colors.

**File to edit:** `src/app/[locale]/(marketing)/contact/page.tsx`

**Steps:**

- [x] Open `src/app/[locale]/(marketing)/contact/page.tsx`
- [x] Find the Phone Card section (starts around **line 61**). Replace ALL `emerald` references with `amber`:
  - Line 61: `from-emerald-50` → `from-amber-50`
  - Line 61: `border-emerald-100` → `border-amber-100`
  - Line 62: `bg-emerald-100` → `bg-amber-100`
  - Line 63: `text-emerald-600` → `text-amber-600`
  - Line 65: `text-emerald-900` → `text-amber-900`
  - Line 73: `bg-emerald-500` → `bg-amber-500`
  - Line 73: `hover:bg-emerald-600` → `hover:bg-amber-600`
- [x] Save the file
- [x] **Verify:** Run `npm run dev`, open `http://localhost:3000/en/contact`. The phone card should now be amber/orange tinted (matching the location card) instead of green. All three cards should look cohesive.

---

### Task 3.3: Fix Reading Advantage product page color scheme

**What you are fixing:** The Reading Advantage product page uses a completely different color scheme (sky-400/blue-600 hero, purple/pink games section) that clashes with the rest of the site.

**File to edit:** `src/app/[locale]/(marketing)/products/reading-advantage/page.tsx`

**Steps:**

- [x] Open `src/app/[locale]/(marketing)/products/reading-advantage/page.tsx`
- [x] **Fix the hero gradient** on **line 69**. Change:
  ```tsx
  <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 overflow-hidden">
  ```
  To:
  ```tsx
  <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-amber-50 via-orange-50 to-sky-100 overflow-hidden">
  ```
- [x] **Fix the hero blob colors** on lines 71-73. Change:
  ```tsx
  <div className="absolute top-32 right-20 w-80 h-80 bg-white/20 rounded-full blur-[100px] animate-pulse-slow" />
  <div className="absolute bottom-40 left-20 w-96 h-96 bg-sky-300/30 rounded-full blur-[120px] animate-float" />
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-[150px]" />
  ```
  To:
  ```tsx
  <div className="absolute top-32 right-20 w-80 h-80 bg-amber-300/40 rounded-full blur-[100px] animate-pulse-slow" aria-hidden="true" />
  <div className="absolute bottom-40 left-20 w-96 h-96 bg-sky-300/30 rounded-full blur-[120px]" aria-hidden="true" />
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-200/20 rounded-full blur-[150px]" aria-hidden="true" />
  ```
- [x] **Fix the hero text colors** since the background is now light (not dark). Update lines 78-87:
  - `text-white` → `text-slate-900` (h1)
  - `text-sky-50` → `text-slate-700` (h2)
  - `text-sky-100` → `text-slate-600` (p)
- [x] **Fix the hero gradient fade** on line 121. Change:
  ```tsx
  <div className="absolute inset-0 bg-gradient-to-r from-sky-600/90 via-sky-500/40 to-transparent rounded-[40px] z-20" />
  ```
  To:
  ```tsx
  <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/40 to-transparent rounded-[40px] z-20" />
  ```
- [x] **Fix the games section gradient** on **line 247**. Change:
  ```tsx
  <section className="relative py-32 bg-gradient-to-br from-purple-50 via-pink-50 to-sky-50">
  ```
  To:
  ```tsx
  <section className="relative py-24 bg-gradient-to-br from-amber-50 via-sky-50 to-white">
  ```
- [x] **Fix the games badge** on line 251. Change:
  ```tsx
  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-4 py-2 rounded-full text-sm font-bold mb-6">
  ```
  To:
  ```tsx
  <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-bold mb-6">
  ```
- [x] Save the file
- [x] **Verify:** Run `npm run dev`, open `http://localhost:3000/en/products/reading-advantage`. The page should now use the same warm amber/sky color palette as the homepage. No blue/white hero, no purple/pink games section.

---

### Task 3.4: Standardize section padding across all marketing pages

**What you are fixing:** Different pages use different padding values (`py-16`, `py-20`, `py-24`, `py-32`, `py-40`) creating an inconsistent rhythm. We will standardize to just two values: `py-16` for compact sections and `py-24` for spacious sections.

**Rule:**
- Use `py-16` for: CTA sections, small info sections, cards
- Use `py-24` for: Hero-adjacent sections, major content sections, feature grids

**Steps:**

- [x] Go through EACH marketing page file and update padding values:

  **Homepage** (`src/app/[locale]/(marketing)/(home)/page.tsx`):
  - Line 81: `py-32` → `py-24` (Mission section)
  - Line 99: `py-32` → `py-24` (Overview section)
  - Line 143: `py-32` → `py-24` (Flagship section)
  - Line 203: `py-32` → `py-24` (Innovation section)
  - Line 250: `py-32` → `py-24` (Big 4 section)
  - Line 303: `py-32` → `py-24` (Tech & Target section)
  - Line 359: `py-40` → `py-24` (Impact CTA section)

  **About** (`src/app/[locale]/(marketing)/about/page.tsx`):
  - All sections already use `py-16` — no changes needed.

  **Services** (`src/app/[locale]/(marketing)/services/page.tsx`):
  - Line 32: `py-32` → `py-24` (Hero)
  - Line 52: section already has `py-24` — OK
  - Line 128: `py-32` → `py-24` (CTA)

  **Case Studies** (`src/app/[locale]/(marketing)/case-studies/page.tsx`):
  - Line 53: `py-32` → `py-24` (Hero)
  - Line 80: already `py-24` — OK
  - Line 255: already `py-24` — OK
  - Line 291: `py-32` → `py-24` (CTA)

  **Reading Advantage** (`src/app/[locale]/(marketing)/products/reading-advantage/page.tsx`):
  - All `py-32` sections → `py-24`
  - Line 646: `py-40` → `py-24` (Final CTA)

  **Products** (`src/app/[locale]/(marketing)/products/page.tsx`):
  - Line 93: `py-20 md:py-32` → `py-24` (Grade bands section)

  **Contact** (`src/app/[locale]/(marketing)/contact/page.tsx`):
  - All sections use `py-16` or `py-20` — change `py-20` to `py-16` for consistency

- [x] Save all files
- [x] **Verify:** Run `npm run dev` and browse through all pages. Section spacing should feel consistent and rhythmic. No huge gaps or cramped sections.

---

### Task 3.5: Fix homepage footer gap

**What you are fixing:** There is a ~100px empty space between the last section on the homepage (the Impact CTA with trust badges) and the footer.

**File to edit:** `src/app/[locale]/globals.css`

**Steps:**

- [x] Open `src/app/[locale]/globals.css`
- [x] Find **line 52-54**:
  ```css
  main {
    @apply pb-12 min-h-screen;
  }
  ```
- [x] The `pb-12` (padding-bottom: 3rem) adds space after every page's `<main>` element. This creates the footer gap. Remove `pb-12`:
  ```css
  main {
    @apply min-h-screen;
  }
  ```
- [x] Save the file
- [x] **Verify:** Run `npm run dev`, check the homepage. The gap between the last colorful section and the footer should now be gone.

---

### Task 3.6: Fix products page card overlap

**What you are fixing:** On the products page, the grade band cards have conflicting hover translate values. The `.warm-card` CSS class applies `hover:-translate-y-1` and the inline class also has `hover:-translate-y-2`, creating a conflict.

**File to edit:** `src/app/[locale]/(marketing)/products/page.tsx`

**Steps:**

- [x] Open `src/app/[locale]/(marketing)/products/page.tsx`
- [x] Go to **line 102**. You will see:
  ```tsx
  <div className={`h-full p-8 rounded-2xl bg-gradient-to-br ${band.bgColor} warm-card border-0 transition-all duration-300 hover:-translate-y-2`}>
  ```
- [x] Remove the duplicate `hover:-translate-y-2` (since `.warm-card` already has `hover:-translate-y-1`):
  ```tsx
  <div className={`h-full p-8 rounded-2xl bg-gradient-to-br ${band.bgColor} warm-card border-0`}>
  ```
  **Why:** The `.warm-card` class in `globals.css` already includes `transition-all duration-300 hover:-translate-y-1`, so adding `hover:-translate-y-2` creates conflicting transforms.
- [x] Save the file
- [x] **Verify:** Run `npm run dev`, open `http://localhost:3000/en/products`. Hover over the grade band cards — they should lift smoothly without jittering or overlapping neighboring cards.

---

- [x] Task: Measure - User Manual Verification 'Phase 3: Visual Consistency' (Protocol in workflow.md)

---

## Phase 4: Accessibility & i18n

---

### Task 4.1: Replace emoji icons with lucide-react icons on features page

**What you are fixing:** The features page uses emoji strings (`🤖`, `📊`, etc.) as icons. Screen readers announce these as "robot face" and "bar chart" which is confusing. We need to use proper `lucide-react` icon components with `aria-hidden="true"`.

**File to edit:** `src/app/[locale]/(marketing)/features/page.tsx`

**Steps:**

- [x] Open `src/app/[locale]/(marketing)/features/page.tsx`
- [x] At the top of the file, add icon imports after the existing imports (around line 5):
  ```tsx
  import { Bot, User, Pencil, BarChart3, Smartphone, Globe } from 'lucide-react';
  ```
- [x] Replace the `features` array (lines 20-51). Change the `emoji` property to an `icon` property for each feature:
  ```tsx
  const features = [
    {
      icon: Bot,
      title: 'AI-Powered Content',
      description: 'Our advanced AI technologies generate personalized content tailored to each learner\'s needs and preferences.',
    },
    {
      icon: User,
      title: 'Personalized Learning',
      description: 'Our platforms adapt to individual learner needs, providing a customized educational experience for optimal results.',
    },
    {
      icon: Pencil,
      title: 'Interactive Exercises',
      description: 'Engage with our interactive simulations, quizzes, and exercises designed to reinforce learning and boost retention.',
    },
    {
      icon: BarChart3,
      title: 'Progress Tracking',
      description: 'Comprehensive analytics and reporting features allow learners and educators to monitor progress and identify areas for improvement.',
    },
    {
      icon: Smartphone,
      title: 'Cross-Platform Access',
      description: 'Access our educational content anytime, anywhere with our web, mobile, and tablet applications.',
    },
    {
      icon: Globe,
      title: 'Global Community',
      description: 'Connect with learners worldwide, share experiences, and participate in collaborative learning opportunities.',
    },
  ];
  ```
- [x] Update the rendering code on **line 72**. Replace:
  ```tsx
  <div className="text-4xl mb-4">{feature.emoji}</div>
  ```
  With:
  ```tsx
  <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-amber-400 rounded-xl flex items-center justify-center mb-4">
    <feature.icon className="w-6 h-6 text-white" aria-hidden="true" />
  </div>
  ```
- [x] Also fix the array index key on **line 69**. Change:
  ```tsx
  key={index}
  ```
  To:
  ```tsx
  key={feature.title}
  ```
- [x] Save the file
- [x] **Verify:** Run `npm run dev`, open `http://localhost:3000/en/features`. Each feature card should now show a styled icon (white icon on a gradient background) instead of an emoji.

---

### Task 4.2: Add `aria-hidden="true"` to all decorative blur elements

**What you are fixing:** Decorative blurred circle elements (the "organic blobs" behind sections) are visible to screen readers, which is confusing. They should be hidden from assistive technology.

**Files to edit:** ALL marketing pages that have decorative blur elements.

**Rule:** Any `<div>` that has `blur-[...px]`, `rounded-full`, and `animate-pulse-slow` or `animate-float` is a decorative element. Add `aria-hidden="true"` to it.

**Steps:**

- [x] Search for decorative elements:
  ```bash
  grep -rn "blur-\[" src/app/[locale]/(marketing)/ --include="*.tsx"
  ```
- [x] For EACH result, add `aria-hidden="true"` to the element. Example:
  ```tsx
  {/* Before */}
  <div className="absolute top-32 right-20 w-80 h-80 bg-amber-300/40 rounded-full blur-[100px] animate-pulse-slow" />

  {/* After */}
  <div className="absolute top-32 right-20 w-80 h-80 bg-amber-300/40 rounded-full blur-[100px] animate-pulse-slow" aria-hidden="true" />
  ```
- [x] Do this for ALL blur elements across ALL files:
  - `(home)/page.tsx` — lines 21-23, 66, 205-206, 360-361
  - `products/reading-advantage/page.tsx` — lines 71-73, 332-333, 647-648
  - `products/page.tsx` — lines 59-60, 78
  - `services/page.tsx` — lines 33-34, 129-130
  - `case-studies/page.tsx` — lines 54-55, 257-258, 292-293
- [x] Save all files
- [x] **Verify:** This is an invisible change. Run `npm run build` to make sure there are no errors.

---

### Task 4.3: Improve image alt text

**What you are fixing:** Multiple images reuse the same generic alt text like "Reading Advantage Platform". Each image should have unique, descriptive alt text.

**Steps:**

- [x] Search for generic alt text:
  ```bash
  grep -rn '"Reading Advantage Platform"' src/ --include="*.tsx"
  ```
- [x] Update each instance with descriptive alt text. Examples:
  - Hero images of students: `alt="Students working on Reading Advantage exercises in a classroom"`
  - Dashboard screenshots: `alt="Teacher dashboard showing student reading progress and analytics"`
  - Workbook images: `alt="Student workbook with guided reading exercises"`
  - App screenshots: `alt="Reading Advantage app displayed on a desktop monitor"`
- [x] Make sure NO two images on the same page have identical alt text
- [x] Save all files
- [x] **Verify:** Run `npm run build` — no errors.

---

### Task 4.4: Move hard-coded homepage strings to locale files

**What you are fixing:** The homepage has multiple hard-coded English strings that bypass the i18n system. This means they can't be translated.

**Files to edit:**
1. `src/locales/pages/home.ts` (add new translation keys)
2. `src/app/[locale]/(marketing)/(home)/page.tsx` (replace strings with `t()` calls)

**Hard-coded strings to move (from homepage):**
- Line 56: `"Get Started"`
- Line 116: `"Partner With Us"`
- Line 256: `"QUALITY GUARANTEE"`
- Line 259: `"The Big 4 Quality Protocol"`
- Line 262: `"The System is the Expert: Delivering international results through AI and rigorous fidelity protocols."`
- Lines 269-283: Four card items with `title` and `description` fields
- Line 309: `"Built for Thai Private Schools"`
- Line 312: `"Empower your Thai teachers to deliver Native-Standard English, addressing your unique challenges."`
- Lines 319-329: Three card items with `title` and `description` fields
- Line 350: `"Google Gemini & GPT-5 AI"`

**Steps:**

- [x] Open `src/locales/pages/home.ts`
- [x] Find the English (`en`) export object. Add new keys for each hard-coded string. For example, add these under the appropriate section:
  ```ts
  hero: {
    // ... existing keys ...
    getStarted: 'Get Started',
  },
  overview: {
    // ... existing keys ...
    partnerCta: 'Partner With Us',
  },
  bigFour: {
    badge: 'QUALITY GUARANTEE',
    title: 'The Big 4 Quality Protocol',
    description: 'The System is the Expert: Delivering international results through AI and rigorous fidelity protocols.',
    items: {
      0: { title: 'Uninterrupted Reading', description: 'Consistent extensive reading sessions without disruptions for maximum language exposure' },
      1: { title: 'Student Agency', description: 'Students choose articles that match their interests, driving intrinsic motivation' },
      2: { title: 'Data-Driven Consensus', description: 'Regular progress reviews based on comprehensive data from student performance' },
      3: { title: 'Workbook-First AI', description: 'Physical workbooks provide structure while AI adapts to individual learning paths' },
    },
  },
  targetMarket: {
    title: 'Built for Thai Private Schools',
    description: 'Empower your Thai teachers to deliver Native-Standard English, addressing your unique challenges.',
    items: {
      0: { title: 'Teacher Shortage', description: 'Comprehensive lesson plans and teacher guides reduce preparation time significantly' },
      1: { title: 'Large Classes', description: 'Individualized learning paths work effectively with 30+ students per class' },
      2: { title: 'Limited Devices', description: 'Blended learning model works with any device-to-student ratio' },
    },
    poweredBy: 'Google Gemini & GPT-5 AI',
  },
  ```
- [x] Do the same for the Thai (`th`) and Chinese (`zh`) exports in the same file (copy the English values as placeholder — translators will update later)
- [x] Open `src/app/[locale]/(marketing)/(home)/page.tsx` and replace each hard-coded string with the corresponding `t()` call:
  - `"Get Started"` → `{t('hero.getStarted')}`
  - `"Partner With Us"` → `{t('overview.partnerCta')}`
  - `"QUALITY GUARANTEE"` → `{t('bigFour.badge')}`
  - etc.
- [x] Save both files
- [x] **Verify:** Run `npm run dev`, check the homepage. All text should display the same as before (in English). Run `npm run i18n:verify` if available to check for missing keys.

---

### Task 4.5: Move hard-coded strings on Reading Advantage product page to locale files

**What you are fixing:** The Reading Advantage product page has several hard-coded strings.

**File to edit:**
1. `src/locales/pages/products/reading-advantage.ts` (add new keys)
2. `src/app/[locale]/(marketing)/products/reading-advantage/page.tsx` (replace strings)

**Hard-coded strings:**
- Line 102: `"Blended Learning"`
- Line 133: `"NEW IN MAY 2026"`
- Line 136: `"Blended Learning"` (heading)
- Line 154: `"Student Workbooks"`
- Line 155: `"Hands-on practice materials"`
- Line 253: `"NEW!"`

**Steps:**

- [x] Add translation keys to the locale file for each hard-coded string
- [x] Replace each hard-coded string in the page with a `t()` call
- [x] Save both files
- [x] **Verify:** Run `npm run dev`, check the Reading Advantage product page. All text should still display correctly.

---

### Task 4.6: Move hard-coded case-studies strings to locale files

**What you are fixing:** The case studies page has hard-coded strings.

**Hard-coded strings in `src/app/[locale]/(marketing)/case-studies/page.tsx`:**
- Line 61: `"PROVEN RESULTS"`
- Line 95: `"Implementation Period: "` (prefix text)
- Line 196: `"Key Highlights:"`

**Steps:**

- [x] Add translation keys to the case studies locale file
- [x] Replace hard-coded strings with `t()` calls
- [x] Save both files
- [x] **Verify:** Run `npm run dev`, check the case studies page.

---

- [x] Task: Measure - User Manual Verification 'Phase 4: Accessibility & i18n' (Protocol in workflow.md)

---

## Phase 5: Cleanup

---

### Task 5.1: Remove unused `teal-modern` gradient from Tailwind config

**What you are doing:** The `teal-modern` gradient is defined in `tailwind.config.ts` but never used in any component. Remove it to keep the config clean.

**File to edit:** `tailwind.config.ts`

**Steps:**

- [x] Open `tailwind.config.ts`
- [x] Go to **line 66**. You will see:
  ```ts
  "teal-modern": "linear-gradient(135deg, #14B8A6 0%, #06B6D4 100%)",
  ```
- [x] Delete this entire line
- [x] Save the file
- [x] **Verify:** Run `npm run build` — it should succeed without errors.

---

### Task 5.2: Consolidate `.glass-morphism` and `.hero-glass` in globals.css

**What you are fixing:** `.hero-glass` is a compound class that applies `.glass-morphism` plus additional styles. Since `.hero-glass` is only used once (on the products page), we should inline its styles and remove the class definition.

**Files to edit:**
1. `src/app/[locale]/globals.css`
2. `src/app/[locale]/(marketing)/products/page.tsx`

**Steps:**

- [x] First, check where `.hero-glass` is used:
  ```bash
  grep -rn "hero-glass" src/ --include="*.tsx"
  ```
  It should only be used in `products/page.tsx` line 64.
- [x] Open `src/app/[locale]/(marketing)/products/page.tsx`, line 64:
  ```tsx
  <div className="hero-glass">
  ```
  Replace with the expanded classes:
  ```tsx
  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-modern-lg">
  ```
- [x] Open `src/app/[locale]/globals.css` and delete the `.hero-glass` class (lines 92-94):
  ```css
  .hero-glass {
    @apply glass-morphism rounded-2xl p-8 shadow-modern-lg;
  }
  ```
  Delete these 3 lines.
- [x] Also delete the `.floating-element` class (lines 96-98) since `animate-float` will be removed:
  ```css
  .floating-element {
    @apply animate-float;
  }
  ```
- [x] Save both files
- [x] **Verify:** Run `npm run dev`, check `http://localhost:3000/en/products`. The hero section should look the same.

---

### Task 5.3: Remove unused shadow utilities from Tailwind config

**What you are doing:** `shadow-glow` and `shadow-glow-lg` are barely used. After this refactor, check if they're still used. If not, remove them.

**Steps:**

- [x] Search for usage:
  ```bash
  grep -rn "shadow-glow" src/ --include="*.tsx"
  ```
- [x] If no results (or only results in files you've already changed), remove from `tailwind.config.ts` lines 73-74:
  ```ts
  "glow": "0 0 20px rgba(14, 165, 233, 0.3)",
  "glow-lg": "0 0 40px rgba(14, 165, 233, 0.4)",
  ```
- [x] Save the file
- [x] **Verify:** Run `npm run build` — should succeed.

---

### Task 5.4: Reduce decorative CSS blur animations

**What you are fixing:** The homepage and Reading Advantage page have multiple large blur elements with infinite CSS animations (`animate-pulse-slow`, `animate-float`) that strain the GPU. We should reduce the count and remove infinite loops.

**Rule:**
- Maximum 2 decorative blur elements per section
- Remove `animate-float` from ALL blur elements (infinite animation = constant GPU use)
- Keep `animate-pulse-slow` on at most 1 element per section

**Steps:**

- [x] Open `src/app/[locale]/(marketing)/(home)/page.tsx`
  - Hero section (lines 21-23): Keep the first blob (line 21) with `animate-pulse-slow`. Remove `animate-float` from the second blob (line 22). Delete the third blob (line 23) entirely.
  - Innovation section (lines 205-206): Keep both blobs, remove `animate-pulse-slow` and `animate-float`. They can be static.
  - Impact CTA (lines 360-361): Keep both blobs, make them static (remove animations).

- [x] Open `src/app/[locale]/(marketing)/products/reading-advantage/page.tsx`
  - Hero blobs (lines 71-73): Already fixed in Task 3.3. Ensure `animate-float` is removed.
  - Platform demo (lines 332-333): Remove animations, keep blobs as static.
  - Final CTA (lines 647-648): Remove animations.

- [x] Open `src/app/[locale]/(marketing)/products/page.tsx`
  - Hero blobs (lines 59-60): Remove `animate-float` from line 60. Keep `animate-pulse-slow` on line 59.

- [x] Save all files
- [x] **Verify:** Run `npm run dev`, browse through pages. Decorative elements should still be visible as subtle background effects but should not be constantly animating.

---

### Task 5.5: Enable console removal in production build

**What you are fixing:** `next.config.ts` has commented-out code for removing `console.log` statements in production builds. We should enable this.

**File to edit:** `next.config.ts`

**Steps:**

- [x] Open `next.config.ts`
- [x] Find the commented-out block (lines 24-26):
  ```ts
  // compiler: {
  //   removeConsole: process.env.NODE_ENV === "production",
  // },
  ```
- [x] Uncomment it:
  ```ts
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  ```
- [x] Save the file
- [x] **Verify:** Run `npm run build` — should succeed without errors.

---

- [x] Task: Measure - User Manual Verification 'Phase 5: Cleanup' (Protocol in workflow.md)

---

## Phase 6: Final Verification

---

### Task 6.1: Run full build and verify acceptance criteria

**Steps:**

- [x] Run `npm run build` and confirm it succeeds with zero errors
- [x] Confirm `framer-motion` is NOT in `package.json`
- [x] Run these searches and confirm zero results:
  ```bash
  grep -rn "use client" src/app/[locale]/(marketing)/services/page.tsx
  grep -rn "use client" src/app/[locale]/(marketing)/case-studies/page.tsx
  grep -rn "violet-" src/app/[locale]/(marketing)/ --include="*.tsx"
  grep -rn "emerald-" src/app/[locale]/(marketing)/ --include="*.tsx"
  grep -rn "purple-" src/app/[locale]/(marketing)/ --include="*.tsx"
  grep -rn "pink-" src/app/[locale]/(marketing)/ --include="*.tsx"
  grep -rn "framer-motion" src/
  ```
- [x] Confirm every `<Image fill>` has a `sizes` prop:
  ```bash
  grep -A1 "fill" src/app/[locale]/(marketing)/ -rn --include="*.tsx" | grep -v "sizes"
  ```
- [x] Run `npm run dev` and manually check each page for visual correctness:
  - Homepage: `/en`
  - About: `/en/about`
  - Products: `/en/products`
  - Reading Advantage: `/en/products/reading-advantage`
  - Pricing: `/en/pricing`
  - Features: `/en/features`
  - Services: `/en/services`
  - Case Studies: `/en/case-studies`
  - Contact: `/en/contact`

---

- [x] Task: Measure - User Manual Verification 'Phase 6: Final Verification' (Protocol in workflow.md)
