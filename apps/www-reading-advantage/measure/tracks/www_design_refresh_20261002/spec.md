# Spec: www design refresh (home, Tutor Advantage, Mastery Advantage)

Baseline defects found on 2026-10-02 (desktop 1440, phone 390):
- Tutor page: "How It Works" text is near-invisible on green; secondary CTA has no label; hero uses a stock photo of an adult and child; the `ra-marketing-tutor-advantage` SVG says "AI tutoring".
- Mastery page: static SVG panels; one empty grey grid cell; product tiles repeat the home page.
- Home: plain tiles for product lines; no real imagery.

## Design rules
1. Shared parts: `SiteImageView`, `SectionHeader`, `siteImages`, `siteLogos`, `siteVideos`.
2. Neutrals from the home page: page `#faf9f7`, ink black, body `#55534e`, border `#dad4c8`. Product accent is a highlight only.
3. Accents: Tutor emerald `#34d399` (text on light: emerald-800 `#065f46`); Primary cyan `#22d3ee`; Reading sky `#38bdf8`; CodeCamp lime `#a3e635`. Mastery graph states: Mastered `#22c55e`, You are here `#ffffff`, Ready `#fbbf24`, Locked `#0c1437`.
4. Fonts stay Geist until Q-BR-03 closes.
5. Contrast at least AA. Respect `prefers-reduced-motion`. Layout works at 390 px.
6. All text through next-intl in en, th, zh. Alt text for every non-decorative image, in all three locales.
7. Copy rules: see `www_copy_truth_pass_20261002` spec. No new claims.
8. Chibi Quest art on Primary and Tutor pages only. No Reedy on Home or Mastery except where already stated.

## Acceptance
- `check-types`, `lint`, `test`, `i18n:verify` pass.
- Screenshots at 1440 and 390 for en and th show no overflow or invisible text.
