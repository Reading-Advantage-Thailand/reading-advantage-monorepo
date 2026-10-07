# Plan — Real Advantage logos on the www site

Starts after the Primary cutover blockers (feature freeze until the Primary deployment).

## Phase 1: Files and mapping
- [ ] Copy `vector/horizontal`, `vector/horizontal-dark-inverse`, and `vector/square` for the ten products into `public/media/brand/logos/`
- [ ] Point `site-assets.ts` `color` and `reversed` at the new files; replace the `public/*.png` product images with `vector/square`
- [ ] Favicon from `png/favicon/reading-advantage.ico`
- [ ] Test: every logo path in `site-assets.ts` exists under `public/`; no reference to a removed placeholder

## Phase 2: Thai lockups and checks
- [ ] `thaiLockup` → `vector/lockup-thai` after PR confirms the Thai check
- [ ] Browser captures of the header, footer, and product pages (light and dark) to PR and Daniel
