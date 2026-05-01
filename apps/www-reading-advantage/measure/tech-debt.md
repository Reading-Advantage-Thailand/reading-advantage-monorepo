# Technical Debt

Known issues, deferred cleanup, and shortcuts taken that will need to be addressed. Entries include the date identified and a priority level.

Priority: **P1** = blocks quality/production, **P2** = degrades DX or UX, **P3** = cleanup/polish.

---

## Open Debt

### [P1] ~~Revideo pipeline: missing upscale step after render~~ RESOLVED (2026-04-25)

**Status:** Resolved. The upscale step has been re-added and verified working.

**Verification:** Day 4 blog video (44s) rendered successfully at 1080×1920 with AAC audio. Pipeline output shows:
- Revideo renders at 540×960 (resolutionScale: 0.5)
- ffmpeg upscales to 1080×1920 using lanczos: `ffmpeg -i input.mp4 -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p output.mp4`
- ffmpeg muxes video + narration audio: `ffmpeg -i video.mp4 -i narration.mp3 -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest output.mp4`
- Final output verified: 7.6MB, 1080×1920, h264 video + AAC audio, 43.6s duration

**Remaining:** The ffmpeg fallback path (for error recovery) still exists in code but remains untested. Low priority since Revideo is now stable.

---

### [P2] `next.config.ts` only allows `localhost` as image domain (2026-02)

**Problem:** The `images.domains` (or `remotePatterns`) configuration in `next.config.ts` only permits `localhost`. Any production or CDN images from external domains will fail with a 400 error.

**Resolution:** Add the production image domain(s) to `remotePatterns` in `next.config.ts`.

---

### [P3] Tailwind config — verify `shadow-modern` variants (2026-04)

**Problem:** `tailwind.config.ts` defines custom shadows (`shadow-modern`, `shadow-glow`). Previous tech-debt entry incorrectly stated these were unused. They are used across product pages and components. `shadow-modern-lg` is used but may not be defined — needs audit.

**Resolution:** Verify all `shadow-*` variants used in code are defined in config. Remove any truly unused ones.

---

### [P3] Overlapping CSS utilities in `globals.css` (2026-02)

**Problem:** `globals.css` defines `.glass-morphism` and `.hero-glass` with near-identical styles. Additionally, several `@layer utilities` entries duplicate functionality already available via Tailwind classes.

**Resolution:** Consolidate into a single `.glass` utility class, remove duplicates, and replace any remaining uses of `.glass-morphism`/`.hero-glass` in component files.

---

### [P3] `console.log` removal in `next.config.ts` is commented out (2026-02)

**Problem:** The `next.config.ts` contains commented-out code that was intended to remove `console.log` statements from production builds. It is neither active nor deleted.

**Resolution:** Either enable the compiler option or remove the commented code entirely. Do not leave dead configuration.

---

### [P3] Blog section lacks pagination (2026-01)

**Problem:** The blog listing page (`/blog`) renders all posts in a single request. As content grows, this will cause slow page loads and large HTML payloads.

**Resolution:** Implement page-based or cursor-based pagination. The MDX pipeline supports static generation — use `generateStaticParams` with page numbers.

---

### [P3] Inline SVG icons in primary-advantage CTA (2026-04)

**Problem:** `primary-advantage/page.tsx` uses inline `<svg>` elements (email envelope and lightning bolt icons) in the CTA section instead of Lucide React components used everywhere else. Inconsistent icon approach.

**Resolution:** Replace inline SVGs with `Mail` and `Zap` Lucide icons (already imported).

---

## Resolved Debt

| Item                                                       | Resolved In                         | Date    |
| ---------------------------------------------------------- | ----------------------------------- | ------- |
| Hero image inconsistency on pricing and about pages        | hero_image_inconsistency_20260416   | 2026-04 |
| `conntainer` typo on pricing page                          | site_refactor_20260207              | 2026-02 |
| Broken `href="#"` on about page CTA                        | site_refactor_20260207              | 2026-02 |
| `ignoreBuildErrors: true` in next.config.ts                | site_refactor_20260207              | 2026-02 |
| Framer Motion `PageTransition` wrapper in marketing layout | site_refactor_20260207              | 2026-02 |
| `services/page.tsx` unnecessarily `"use client"`           | site_refactor_20260207              | 2026-02 |
| `case-studies/page.tsx` unnecessarily `"use client"`       | site_refactor_20260207              | 2026-02 |
| `features/page.tsx` unnecessarily `"use client"`           | site_refactor_20260207              | 2026-02 |
| Emoji icons on features page (accessibility)               | site_refactor_20260207              | 2026-02 |
| Missing test suite — no unit/integration tests             | testing_infrastructure_20260408     | 2026-04 |
| Services pages hard-coded English text                     | services_i18n_completion_20260408   | 2026-04 |
| Missing `sizes` prop on `fill` images                      | images_sizes_prop_20260414          | 2026-04 |
| Excessive client component boundaries inflate JS bundle    | client_component_reduction_20260415 | 2026-04 |
| Revideo EOF crash on long exports                          | blog_video_generation_20260423      | 2026-04 |
