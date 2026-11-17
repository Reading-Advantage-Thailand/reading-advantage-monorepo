# Spec: www STEM Advantage release-date line

Track: `www_stem_date_line_20261116` (light lane, chore).
Author model: opencode-go/deepseek-v4.1-flash

## Goal

Delete the release-date text from the STEM Advantage page in en and th, and add no new copy.

PM decision 2026-11-16: "STEM keeps no date and the page says nothing about one. No new copy."

## Places

File `apps/www-reading-advantage/src/locales/pages/products/stem-advantage.ts` on `origin/master`
`a7ba202cd`:

| Line | Locale | Before | After |
|------|--------|--------|-------|
| 4 | en | `... planned K-12 coding and STEM book line. No launch date.` | `... planned K-12 coding and STEM book line.` |
| 9 | en | `... STEM book line with no release date. Not to be confused with ...` | `... STEM book line. Not to be confused with ...` |
| 100 | en | `STEM Advantage is on our roadmap. It has no release date. Tell us what you need.` | `STEM Advantage is on our roadmap. Tell us what you need.` |
| 123 | th | `... ชุดหนังสือการเขียนโค้ดและ STEM ที่วางแผนไว้ ยังไม่มีกำหนดวันเปิดตัว` | `... ชุดหนังสือการเขียนโค้ดและ STEM ที่วางแผนไว้` |
| 128 | th | `... ที่วางแผนไว้ ยังไม่มีกำหนดวันเปิดตัว ไม่ใช่ CodeCamp Advantage ...` | `... ที่วางแผนไว้ ไม่ใช่ CodeCamp Advantage ...` |
| 219 | th | `STEM Advantage อยู่ในแผนงานของเรา ยังไม่มีกำหนดวันเปิดตัว บอกเราว่าคุณต้องการอะไร` | `STEM Advantage อยู่ในแผนงานของเรา บอกเราว่าคุณต้องการอะไร` |

Each deletion keeps one space where a space separates two kept sentences. No other character
changes.

## Scope rules

- The zh lines of the same file stay as they are, including `暂无发布日期`.
- No other page, component, or locale file changes.
- A grep of the file and of
  `apps/www-reading-advantage/src/app/[locale]/(marketing)/products/stem-advantage/page.tsx` for
  `release date`, `launch date`, `no date`, `กำหนดวัน`, and `วันเปิดตัว` finds only these six
  places. A further hit takes the same deletion rule when a deletion alone fixes it. Otherwise the
  plan lists it and leaves it.

## Acceptance criteria

- AC-1: `apps/www-reading-advantage/src/__tests__/www-stem-date-line.locale.test.ts` fails before
  the edit and passes after it. The test holds the exact kept text of the six places, finds no date
  phrase in any en or th STEM string, and finds the zh lines unchanged.
- AC-2: The en and th description, og:description, and twitter:description values of the route
  hold no date phrase. `buildMarketingMetadata` derives all three from `hero.description`.
- AC-3: The www vitest suite, `tsc --noEmit`, ESLint on the touched files, `next build`, and the
  root `scripts/ci/__tests__/` suite pass.
- AC-4: The affected-app selector prints `["www-reading-advantage"]` or `[]`.
