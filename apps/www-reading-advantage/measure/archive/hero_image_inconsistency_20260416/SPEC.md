# Track: Hero Image Inconsistency Fix

**Status:** New

**Type:** bug | **Estimated Tasks:** 4

**Problem:** The pricing and about pages reuse the same `students_at_computers.jpg` background image, cropped to show only hands. This looks accidental rather than intentional and reduces visual distinctiveness.

**Resolution:** Source page-specific hero images for both pricing and about. Add to `public/images/` and update the `HeroSection` calls.

## Notes

- Build: `npm run build` ✓ passing
- No existing tests for pricing/about hero sections
- `HeroSection` uses `bg-warm-cream` gradient background (no actual image) — the "same image" concern may be about a shared visual style, not literal same file
- Need to audit `HeroSection` usage across pages to understand what "inconsistency" means in this context
- `next.config.ts` `remotePatterns` already allows all HTTPS domains — no config change needed

---

## Phases

### Phase 1: Audit — Understand current hero image usage

- [ ] Read `HeroSection` component fully
- [ ] Audit all HeroSection call sites for `floatingImage` usage
- [ ] Identify if the "same image" issue is about `floatingImage` prop or background styling
- [ ] Confirm resolution approach with actual page inspection

### Phase 2: Implement pricing page hero

- [ ] Source or confirm appropriate image for pricing page
- [ ] Update HeroSection call on pricing page with page-specific `floatingImage`

### Phase 3: Implement about page hero

- [ ] Source or confirm appropriate image for about page
- [ ] Update HeroSection call on about page with page-specific `floatingImage`

### Phase 4: Verify

- [ ] `npm run build` passes
- [ ] Update tech-debt.md and lessons-learned.md
- [ ] Commit checkpoint
