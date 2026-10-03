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
- [ ] Migrate the ~1,000 existing warnings (hex to tokens first), then raise rules to `error`
- [ ] Fix `prose` classes (no CSS is generated for them)
