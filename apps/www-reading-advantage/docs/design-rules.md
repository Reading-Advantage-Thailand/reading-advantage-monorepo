# Design rules for www-reading-advantage

Source: the site redesign (track `www_design_refresh_20261002`) and `DESIGN.md`.
Agents and people must follow these rules. Run `pnpm --filter www-reading-advantage lint`
after each UI change and fix every `shadcn/*` error in the files you touched.

## Enforced by `@shadcn/lint` (errors)

| Rule | Do not | Do |
| ---- | ------ | -- |
| `shadcn/no-raw-colors` | Use palette classes such as `text-slate-600` or `bg-sky-50`. | Use a theme color. Site neutrals: `site-page`, `site-body`, `site-border`, `site-navy`. Mastery states: `mastery-mastered`, `mastery-here`, `mastery-ready`, `mastery-locked`. Product accents are the declared `emerald`, `cyan`, `sky`, `amber`, `orange`, `rose`, `indigo`, `fuchsia` shades. |
| `shadcn/no-arbitrary-values` | Write `border-[#dad4c8]`, `rounded-[40px]`, `w-[500px]`, `tracking-[0.18em]`. | Use a scale class (`w-125`, `aspect-4/3`, `w-2/5`) or a theme token. Existing tokens: `tracking-eyebrow`, `tracking-eyebrow-wide`, `blur-glow`, `rounded-panel`, `shadow-panel`, `shadow-float`, `leading-display`, `text-display`, `text-2xs`, `bg-grid-pattern`, `min-h-hero`. Declare a value that repeats in `src/app/[locale]/globals.css`. |
| `shadcn/no-inline-styles` | Use `style={{...}}` or a `<style>` element for static design. | Use classes. An inline style may only set a CSS custom property or a value computed at run time. |
| `shadcn/no-unknown-classes` | Use a class that Tailwind cannot generate, such as `prose`. | Fix the spelling, or declare the class with `@utility`. |

## Not enforced by lint (check in review)

1. Mastery graph state colors are fixed: Mastered `#22c55e`, You are here `#ffffff`, Ready `#fbbf24`, Locked `#0c1437`. Never reuse them for other meaning.
2. One accent per product page. Accent is a highlight only. Page background, body text and borders use the site neutrals.
3. Fonts stay Geist until Q-BR-03 closes.
4. Contrast must be at least AA. Text on emerald, sky or amber uses the `-800` or `-900` shade.
5. Respect `prefers-reduced-motion`. Any looping animation needs a pause control.
6. The layout must work at 390 px with no horizontal scroll.
7. All visible text goes through next-intl in en, th and zh. Every non-decorative image has alt text in all three locales.
8. Use the shared parts: `SiteImageView`, `SectionHeader`, `siteImages`, `siteLogos`, `siteVideos`. Do not add a second image or heading component.
9. Chibi Quest art appears on the Primary and Tutor pages only. No Reedy on Home or Mastery except where the copy already states it.
10. Copy rules: no new claims, CEFR only, no GSE, Pearson or YLE names, no launch dates for planned product lines. See the `www_copy_truth_pass_20261002` spec.
11. Pass next-intl placeholders as values. Call `t(key, { n: "{n}" })` when the client fills the value later. A bare `{n}` in a string causes a server formatting error.

## Existing code

The four rules are errors. The count is zero, so lint fails on a new violation.
Inline styles may only set CSS custom properties (`style={{ "--delay": "100ms" }}`);
a class or a rule in `globals.css` reads the property.
