# Plan — Real Advantage logos on the www site

Starts after the Primary cutover blockers (feature freeze until the Primary deployment).

## Phase 1: Files and mapping
- [ ] Copy `vector/horizontal`, `vector/horizontal-dark-inverse`, and `vector/square` for the ten products into `public/media/brand/logos/`
- [ ] Point `site-assets.ts` `color` and `reversed` at the new files; replace the `public/*.png` product images with `vector/square`
- [ ] Favicon from `png/favicon/reading-advantage.ico`
- [ ] `thaiLockup` → `vector/lockup-thai` (approved 2026-10-08), with the dark and dark-inverse files
- [~] Test: every logo path in `site-assets.ts` exists under `public/`; no reference to a removed placeholder
  - Red (mid-red, phase_base_sha `8f849e390`): exit 1, 59 failed / 3 passed (62). Failures are the expected Red causes, no import/config error. Mapping (33): all 30 color/reversed/thaiLockup fields still point at `/svg/`, `/reversed/`, `/lockups/` instead of `vector/horizontal`, `vector/horizontal-dark-inverse`, `vector/lockup-thai`; the 3 removed-kind sweeps hit. References (23): 11 removed-literal hits (svg/reversed/lockups + 8 rasters in `b2b-solutions.tsx` and product pages), placeholder dirs and 8 rasters still present, `vector/square/` missing. Favicon (3 of 5): `src/app/[locale]/favicon.ico` (25931 B) and `public/favicon.ico` (15406 B) are not byte-identical and neither is 6507 B; ICO magic `00 00 01 00` already correct (2 pass). Command: `pnpm vitest run --maxWorkers=1 src/lib/__tests__/real-logos-{mapping,references,favicon}.red.test.ts`.

## Phase 2: Checks
- [ ] Browser captures of the header, footer, and product pages (light and dark) to PR and Daniel
