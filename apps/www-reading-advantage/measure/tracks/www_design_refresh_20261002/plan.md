# Plan: www design refresh

## Phase 1: Shared parts
- [x] `SiteImageView`, `SectionHeader`; classroom images in the manifest.

## Phase 2: Pages
- [x] Home
- [x] Tutor Advantage
- [x] Mastery Advantage

## Phase 3: Verify
- [x] Screenshots at 1440 and 390, en and th (Thai home and Mastery not fully reviewed)
- [x] check-types, lint, test, i18n:verify

## Phase 4: Interactive Mastery graph
- [x] Step-based graph: subject tabs, play/pause, previous/next step, hover details, "What is next" view
- [x] Mastery page "Explore the graph" section; home inset stays a decorative loop
- [x] en, th, zh strings; "Illustrative example, not real student data." always visible
- [x] Home graph localized, pause button added
- [x] Level labels: Reading A1− to A2+, Primary Pre-A1 to A2 (A2 ceiling)
- [x] Mastery page duplicate heading changed
- [ ] Screenshots: only en desktop Mastery explorer seen; home, th, zh and 390 px still open

## Phase 5: Design-rule lint pilot
- [x] Install `@shadcn/lint` in www-reading-advantage only; register in `eslint.config.mjs` (warnings)
- [x] Site neutral and Mastery state tokens in `globals.css`; `components.json` css path fixed
- [x] `docs/design-rules.md` and an AGENTS.md pointer
- [x] Hex to tokens: 84 classes in 16 files (warnings 1,002 to 921)
- [x] Raw-color step 1: 35 ramp tokens declared with Tailwind default values (raw colors 676 to 327, no page edits)
- [x] Raw-color step 2: neutrals (slate, gray, stone) to site tokens; light text on dark sections to site-border/site-page (raw colors 327 to 177)
- [x] Raw-color steps 3-5: shades 500/700/900 collapsed, blue/green/yellow/teal to product families, 85 light-background text uses to -800, SVG hex to token variables, dead classes replaced (raw colors 177 to 0)
- [x] Arbitrary values: tracking, blur, radius, shadow, leading and text sizes as theme tokens; grid, hero-height and split-column patterns as utilities; scale classes for sizes and fractions; one-off hex snapped to tokens (178 to 0)
- [ ] Inline styles (37 warnings), then raise rules to `error`
- [x] `prose` and `prose-lg` defined as `@utility` in globals.css (blog body and About story); no dependency added
- [x] Unknown classes cleared (14 to 0): dead classes removed, graph and panel `<style>` moved to globals.css; graph controls use lucide icons
