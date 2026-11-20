# Spec: www features and pricing rewrite (A-70, row FP1)

> **Track ID:** `www_features_pricing_20261120` · **Plan:** [plan.md](./plan.md) · **Strategy:** [test-strategy.md](./test-strategy.md)
> **App:** `apps/www-reading-advantage` only. **Branch:** `www/features-pricing-a70` from master `4da73415d`.
> **Worktree:** `/home/daniebo/Desktop/rama-worktrees/www-features-pricing`.

## 1. Source and owner words

PM assignment A-70 (priority P2, behind A-71) hands this work to the Monorepo.

Daniel wrote on Google Tasks (V28tU2lwdE9QUS1WVU5vdQ, 2026-11-20 18:04): "We need to update the old www pages on features and pricing now that we have more apps and different pricing".

Daniel added at 18:4x via the PM: "When I say 'We need to update the old www pages on features and pricing' I mean an entire rewrite."

Source of truth (read only, never written from the Monorepo):

- Copy spec: `/home/daniebo/Desktop/advantage-pr/11-content/www-features-pricing-spec.md` v1.0 (advantage-pr commit `c54d2742`). Sections 3, 4 and 5 hold the copy. Section 6 holds the blocks that go. Section 7 holds the notes for the www lane.
- Change-list row FP1 in `/home/daniebo/Desktop/advantage-pr/11-content/www-change-list.md` v1.63. The row status is "WAITS FOR THAI (Daniel)".
- Thai check page: `/home/daniebo/Desktop/advantage-pr/11-content/thai-check/2026-11-20-features-pricing.html`. It holds 95 Thai lines, TH-FP-01 to TH-FP-95. Daniel checks all Thai himself.
- Open question Q-PR-33 (zh copy): "Default: The zh pages drop the old figures and the competitor table now. They show the new numbers and English section copy until the checked zh copy lands." The PM accepted this default on 2026-11-20 21:34 ICT.
- Price source: the school price sheet v0.2. Daniel approved it for public pricing on 2026-11-20 ("This is all fine").

Rules from the sources that bind this track:

- The English and Thai copy is word for word. The layout is the www lane's choice (spec section 7).
- CEFR only. Product names in full. No percentage, no outcome claim, no public date beyond 30 November 2026 and the 2027 school year, no price beyond the approved curve and the 3,000 baht Tutor floor, no school or student count.
- The page never offers a Managed Service quotation (the approved line of 2026-11-12).
- A screenshot comes only from the current sets in `assets/screenshots/CURRENT.md` v1.12. No admin or system screen, no price screen, no defect capture. Storytime screens crop to the picture card with no banner and no half face.
- No white Western teacher and no student face without consent in any picture.

## 2. Track decision

The standing track `www_change_list_20261027` is active. Its plan has a weekly template and one phase for each batch. Its "Out of scope" section says: "New design, a new page, a new image or a new feature. The batch records these and sends them to the PM orchestrator." FP1 holds new sections, new pictures and a new price table. The standing template has no review gate and no browser look gate.

Default D1: this work is a new track, `www_features_pricing_20261120`. The standing track gets no phase. The tracks registry gets one row.

## 3. Scope

In scope: the four routes `/en/features`, `/th/features`, `/en/pricing`, `/th/pricing`, and the two zh routes `/zh/features` and `/zh/pricing`.

Out of scope:

- Any other www page. The `roadmap.description` of `managed-service` in en and th is the only other edit (spec section 5).
- The zh `roadmap.description` in `managed-service.ts`. It keeps its stale text until the contracted Chinese speaker checks new zh copy (Q-PR-33).
- New zh copy. zh shows English section copy.
- Push, merge to master and deploy. These wait for Daniel's Thai check and his deploy word.
- New picture generation (paid generation is Daniel's gate).
- The header and footer navigation labels ("Features", "Pricing") and the route names.

## 4. What exists today (read at master `4da73415d`)

All paths start at `apps/www-reading-advantage/`.

### 4.1 Pages and components

| Path | Role |
|---|---|
| `src/app/[locale]/(marketing)/features/page.tsx` | The features route. Uses `getScopedI18n("pages.feature")`, `HeroSection`, six icon cards and `ComparisonTable`. Metadata uses `hero.title` and `hero.description`. |
| `src/app/[locale]/(marketing)/pricing/page.tsx` | The pricing route. Uses `getScopedI18n("pages.pricing")`, `HeroSection`, three trust cards and `PricingTable`. Metadata uses `hero.title` and `hero.description`. |
| `src/components/features/comparison-table.tsx` | The competitor table (client component). Only the features page uses it. |
| `src/components/pricing/pricing-table.tsx` | The three-tier matrix (client component). Only the pricing page uses it. |
| `src/components/marketing/hero-section.tsx` | Shared hero (client component). Other pages use it too. It stays unchanged. |
| `src/lib/seo.ts` | `buildMarketingMetadata`. It stays unchanged. |
| `src/config/navigation.ts`, `src/locales/components/common/header.ts` | Nav labels and hrefs for `/features` and `/pricing`. They stay unchanged. |

### 4.2 Locale files (each has an `en`, a `th` and a `zh` export)

| Path | Lines | Fate |
|---|---|---|
| `src/locales/pages/feature.ts` | 149 | Rewritten (spec section 3). |
| `src/locales/pages/pricing.ts` | 89 | Rewritten (spec section 4). |
| `src/locales/components/comparison-table.ts` | 233 | Deleted (spec section 6, item 1 and 3). The `comparisonTable` key goes from `src/locales/en.ts`, `th.ts` and `zh.ts`. |
| `src/locales/components/pricing-table.ts` | 231 | Deleted (spec section 6, items 2, 3, 6 and 7). The `pricingTable` key goes from `src/locales/en.ts`, `th.ts` and `zh.ts`. |
| `src/locales/pages/managed-service.ts` | 206 | One edit: `roadmap.description` in en and th (spec section 5). The `description:` keys sit on lines 54 and 124 and the values on lines 55 and 125. |

Other places that carry a removed claim, found by `grep` at master: `src/locales/pages/pricing.ts` lines 4, 34 and 64 ("App-Only, Blended Learning and Managed Service") and the values on `managed-service.ts` lines 55 and 125. No other locale file names Raz-Kids, Lexia, Achieve3000, Accelerated Reader or the 1,000 and 1,500 baht prices. One test fixture, `src/__tests__/fixtures/storytime-page-expected.ts` line 277, lists "Raz-Kids" as a banned term. It is harmless and stays.

### 4.3 Tests that pin the old pages or the old copy

| Test file | What it pins | Fate |
|---|---|---|
| `src/__tests__/phase-5-pricing-legal.red.test.tsx` | Renders `PricingTable` and `ComparisonTable`. Pins the old baht amounts, the "Contact us for current pricing" line, the copy-review dates in en, th and zh. | Green removes the table cases, the table imports and every case that reads `pricingTable` or `comparisonTable` (the `it` blocks at lines 233 to 352). Green keeps the guarantee and zero-risk cases on `managedService` and `services` (lines 354 to 380) and the helpers they need. The file stays. |
| `src/lib/__tests__/phase-w3-claims.test.ts` (block "1I — Stale timestamps", line 452 to the end of the file) | Reads `pricing-table.ts` and `comparison-table.ts`. Requires a "Copy reviewed: 2026" stamp. | The block goes in Green. The rest of the file stays. |
| `src/__tests__/www-batch-20261119.locale.test.ts` (const `MANAGED_SERVICE`, lines 172 to 224, and the describe "Managed Service condition goes", lines 279 to 288) | Pins `components.pricingTable.*`, `pages.managedService.roadmap.description` (old text) and `pages.pricing.trustSignals.noHiddenFees.description`. | The entries for `pricingTable` keys, the quotation-link test, `roadmap.description` and `trustSignals` change or go in Green. FP1 replaces those places (spec section 7). The entries for `managedService.hero.badge`, `roadmap.title`, `roadmap.targetDate` and `services.services.1.*` stay. |
| `src/__tests__/phase-4-accessibility-navigation-contact.red.test.tsx` | Imports `ComparisonTable` and `PricingTable`. Checks `.check` marks (lines 139 and 140, fragments of one `it` that runs from line 86 to 189). | Green removes the table fragments and the two imports. The rest of the `it` stays. |
| `src/__tests__/phase-4-browser-regressions.red.test.tsx` | Imports `PricingTable`. Contrast of pricing status text (lines 108 to 125). | Green removes the pricing-table case and the import. Other cases stay. |
| `src/__tests__/phase-4-browser-regressions-remaining.red.test.tsx` | Imports `PricingTable` and `PricingPage`. Scrollport keyboard access (line 66). Hero contrast (lines 89 to 111): the first `main > section` has an `h1` and a `p` with dark-text classes. | The scrollport case goes. The hero contrast case stays and the new pricing hero must pass it (decision D11 gives the hero its dark classes). |
| `src/__tests__/phase-2-seo-assets.red.test.ts` (lines 101 to 116 and 218 to 250) | Metadata of `/features` and `/pricing` read from `pages.feature.hero.*` and `pages.pricing.hero.*`. | Updated in Green. The loop at lines 218 to 250 keeps `about` on `hero.*` and reads `metadata.title` and `metadata.description` for `feature` and `pricing`. Green also checks the per-locale loop after line 250. |
| `src/__tests__/phase-3-i18n.red.test.ts` (line 244) | Reads `locales/pages/managed-service.ts` source. | Run it. It must stay green. |
| `src/__tests__/phase-3-group-b-types.test.ts` | Type shape of locale groups. | Run it. It must stay green. |
| `src/__tests__/no-gse-in-customer-copy.test.ts`, `src/__tests__/hero-text-contrast.red.test.ts` | Site-wide copy and contrast guards. | Run them. They must stay green. |
| `e2e/photos.spec.ts` (line 78) | `pricing` entry with `heroSrc: "app-on-desktop.png"`. | The entry goes in Green (D7 gives the new pricing hero no picture). |
| `e2e/locale-middleware.spec.ts` (lines 9 to 22) | Redirects of `/pricing`. | Unchanged. |

Existing pattern for a page content test: `src/app/[locale]/(marketing)/products/primary-advantage/page.content.test.tsx` with its fixture `src/__tests__/fixtures/primary-page-expected.ts`. Existing pattern for a copy-pin test: `src/__tests__/www-batch-20261119.locale.test.ts`. Existing pattern for browser captures: `e2e/real-logos-captures.spec.ts` with `BASE_URL` and `next start -p 3123`.

## 5. Decisions (defaults taken by the planner)

The planner took each default below because the spec is silent or the choice has one sensible answer. Each default is open to the PM.

- **D1** New track (section 2).
- **D2** Locale schema. `pages.feature` and `pages.pricing` each get a `metadata` block with `title` and `description`. These two key names are fixed. The Meta title and Meta description of spec sections 3 and 4 go into them, and each route's `generateMetadata` reads them. Green chooses every other key name, including the keys for the four text values of each hero. The old `hero.*` and `features.*` keys of the two page files go. `pages.about` keeps its own `hero.*` keys.
- **D3** Components. `comparison-table.tsx`, `pricing-table.tsx` and the two locale files are deleted in task 2.5, after the new pages no longer import them. The new price table and the new sections live in the two page files and in small components under `src/components/features/` and `src/components/pricing/` only where a section repeats (the program card, the FAQ list, the price table). No new dependency.
- **D4** zh. `pages.feature.zh` and `pages.pricing.zh` are the English objects (`...en` spread, the pattern of `src/locales/pages/products/storytime-advantage.ts`). The new numbers show. No old zh string stays in these two files. `managed-service.ts` zh is untouched.
- **D5** Thai text. The spec text and the Thai check page differ in 23 Thai lines. The spec lines end with a stray period ("." after the last Thai word). The check page, which Daniel approves, has no such period. Thai values follow the check page. No Thai value ends with ".". The Thai abbreviation dots inside "ป.2", "ป.3" and "ป.6" stay.
- **D6** Buttons. Every closing or contact button points to `/contact` (spec section 7). Both "Explore Tutor Advantage" buttons point to `/products/tutor-advantage`. The features S1 button "Find the right program" points to the in-page anchor `#programs` (the id of the features S2 section), because its label asks the visitor to choose a program. Open to the PM (question Q3).
- **D7** Pictures. No picture is generated or bought. The four screenshot cards use crops of the current screenshot sets (task 2.1). Each slot that the spec describes as "Photo or illustration" has no fitting file in `public/images/` (checked 2026-11-20: the nearest files are product hero art and app screens, not a Thai teacher, an adult learner or a school shelf). Green builds those sections text-first with an optional picture entry. With no file the section shows no picture. The look check judges the result. PR or Forge may supply the six pictures later. See question Q2.
- **D8** Logos. The seven product logos for features S7 come from `siteLogos.<id>.square` in `src/lib/site-assets.ts` (files under `public/media/brand/logos/vector/square/`, already in the repo). The order is storytime, primary, reading, tutor, science, math, zhongwen. Each tile has the hook `data-testid="app-logo-<id>"` and the `alt` text of D13.
- **D13** Alt text. A logo tile `alt` is the full product name in English (for example "Storytime Advantage"). A screenshot `alt` is the English text of the image table in section 7. The same English `alt` shows in th and zh, because new Thai text would need Daniel's check (question Q7). A decorative picture has `alt=""`.
- **D9** FAQ. The FAQ uses native `<details>` and `<summary>`. No new dependency, no client script.
- **D10** Price table. A real `<table>` with a `<caption>` (the S2 body line), `<th scope="col">` and `<th scope="row">`. At 390 px the three columns wrap and do not scroll sideways.
- **D11** Design and hero. Green follows `apps/www-reading-advantage/DESIGN.md` and `docs/design-rules.md` and reuses existing tokens and classes. Both pages use a custom hero, not `HeroSection`, because `HeroSection` has no eyebrow, no second body line and a fixed white text class for a node description. The hero is the first `<section>` in `<main>`. It holds, in this order: the eyebrow as a `<span>` (never a `<p>`), one `<h1>` with a dark class (`text-slate-900`), a first body `<p>` with a dark class (`text-slate-700`), a second body `<p>`, and the button. The background is light. This keeps `phase-4-browser-regressions-remaining.red.test.tsx` green (the first `p` has a dark class). `HeroSection` stays unchanged for the other pages.
- **D12** Merge order. The Monday 2026-11-23 batch (change-list row of 2026-11-12) also edits `pricing-table.ts` and `managed-service.ts`. FP1 deletes the first file. Before the push, the branch rebases on the current master. On a conflict in these two files, the FP1 version wins (spec section 7: "Row FP1 replaces those places when it ships").

## 6. Functional requirements

### Features page (spec section 3)

- **FR-1** `/en/features` and `/th/features` render sections S1 to S9 in the spec order. Every EN and TH string of spec section 3 appears word for word (with D5 for Thai).
- **FR-2** The S2 section has the id `programs` and five cards in this order: Storytime Advantage, Primary Advantage, Reading Advantage books, CodeCamp Advantage, Science, Math and Zhongwen Advantage. Each card shows its For line, its Status line, its Body and its bullets (three for Storytime, three for Primary, none for the others).
- **FR-3** The Storytime, Primary, Reading and Tutor (S5) screens use the paths named in the spec. The Storytime screen crops to the picture card, with no banner and no half face. The Reading screen crops the staff header (XP, level, profile picture) away. The Tutor screen is the live class leaderboard screen with no price.
- **FR-4** S7 shows seven logo tiles, Storytime first.
- **FR-5** S8 shows three questions with answers.
- **FR-6** The page metadata uses the Meta title and Meta description of spec section 3.
- **FR-7** The six old feature cards, the comparison table, the "Copy reviewed" stamp and the old hero text are gone.

### Pricing page (spec section 4)

- **FR-8** `/en/pricing` and `/th/pricing` render sections S1 to S10 in the spec order with every EN and TH string word for word (with D5).
- **FR-9** The S2 price table has the columns "Subjects", "Added per subject", "Total per student per year" and five rows: 1 subject 1,200 baht 1,200 baht; 2 subjects +600 baht 1,800 baht; 3 subjects +400 baht 2,200 baht; 4 subjects +250 baht 2,450 baht; 5 subjects +250 baht 2,700 baht. The Thai rows use "บาท" and "วิชา". The row 1 "Added per subject" cell shows "1,200 baht" as the spec says.
- **FR-10** The page shows the 3,000 baht Tutor floor and the 22–23 hours line (S7, S9). It shows no other price and no quotation offer for Managed Service (S8 states the fuller service is in planning).
- **FR-11** The Tutor buttons point to `/products/tutor-advantage`. Every other button points to `/contact` (D6).
- **FR-12** The page metadata uses the Meta title and Meta description of spec section 4.
- **FR-13** The three tiers (App-Only, Blended Learning, Managed Service), the 1,000 and 1,500 baht figures, the 14 feature rows, the trust-signal cards and the "Copy reviewed" stamp are gone.

### zh pages

- **FR-14** `/zh/features` and `/zh/pricing` show the English section copy and the new numbers (D4). They show no 1,000 baht, no 1,500 baht, no competitor table, no "需报价" and no old zh Managed Service line.

### Managed-service page

- **FR-15** `roadmap.description` in `managed-service.ts` en and th is the pair of spec section 5. The zh value stays as it is.

### Whole site

- **FR-16** No locale file under `src/locales/` holds "Raz-Kids", "Lexia", "Accelerated Reader", "Achieve3000", "Copy reviewed", "ทบทวนข้อความเมื่อ", "文案审核日期", "Want to see Reading Advantage?" or a "1,000 baht" or "1,500 baht" tier price. The word "App-Only" appears in no locale value (spec section 8, point d).
- **FR-17** Each of the two pages has one `<h1>`, no horizontal overflow at 390, 980 and 1280 px, and no broken image.

## 7. Hooks that Red and Green share

Red writes tests against these names. Green builds them. A change of a name changes spec and plan first.

- Features `data-testid`: `features-hero`, `features-programs` (id `programs`), `program-card-storytime`, `program-card-primary`, `program-card-reading`, `program-card-codecamp`, `program-card-school-subjects`, `features-engine`, `features-blended`, `features-tutor`, `features-next-subjects`, `features-app-family`, `features-faq`, `features-next-step`.
- Pricing `data-testid`: `pricing-hero`, `pricing-subjects`, `subject-price-table`, `pricing-example`, `pricing-included`, `pricing-books`, `pricing-which-subjects`, `pricing-family`, `pricing-managed`, `pricing-faq`, `pricing-next-step`.
- Each section element is a `<section>` in the spec order. Each table row of `subject-price-table` is a `<tr>` in the `<tbody>`.
- Locale keys: `pages.feature.metadata.{title,description}`, `pages.pricing.metadata.{title,description}`. Section keys follow the spec section names (for example `pages.feature.programs.storytime.status`). Green chooses the section key names. Red reads strings by the rendered text and by `getScopedI18n`-independent fixtures, so a key rename does not break Red.
- Fixture: `src/__tests__/fixtures/features-pricing-expected.ts`. It holds every EN and TH string, copied from the sources. Review A checks the fixture against the sources with a scratch script (task 1.4).
- Logo hook: `data-testid="app-logo-<id>"` with `<id>` in storytime, primary, reading, tutor, science, math, zhongwen (D8).
- Hero: the first `<section>` of `<main>` carries the hero hook (D11).

### Image table (task 2.1)

The planner viewed each source and each output on 2026-11-20. Boxes are `x0,y0,x1,y1` in source pixels. Output is WebP (lossy, quality 80, RGB). Sources are under `/home/daniebo/Desktop/advantage-pr/assets/screenshots/` (read only). The tool is Pillow (`python3 -I`). The planner left a working script at `~/.cache/opencode/www-features-pricing/make-images.py`. The table is enough to rebuild it.

| Output file in `public/images/features/` | Source | Box | Output size | `alt` (D13) |
|---|---|---|---|---|
| `storytime-reader-card.webp` | `storytime-advantage/app-2026-11-15/reader-390x844.png` (390x844) | 12,142,378,424 (the picture card; the banner and the half face stay out) | 366x282 | Storytime Advantage reader screen |
| `primary-lesson-step05.webp` | `primary-advantage/parity-run2-2026-10-19/student/lesson-step05-deep-reading-phone.png` (375x812) | none (whole screen) | 375x812 | Primary Advantage lesson screen |
| `reading-article-selection.webp` | `reading-advantage/2026-06-11/12-2026-06-11-article-selection-full-page.png` (2880x4014) | 570,165,2820,1245 (the staff header, the sidebar and the leaderboard stay out), then resize to width 1200 | 1200x576 | Reading Advantage article selection screen |
| `tutor-class-leaderboard.webp` | `tutor-advantage/dev-2026-11-16/student-mobile/010-screen.png` (520x1125) | 0,0,520,880 (the empty lower part stays out) | 520x880 | Tutor Advantage live class leaderboard screen |

## 8. Acceptance criteria

- **AC-1** Every EN and TH string of spec sections 3, 4 and 5 appears word for word in the rendered pages and the locale files (FR-1, FR-8, FR-15). Test: `www-features-pricing.locale.test.ts`.
- **AC-2** The Thai strings follow D5 and no Thai value ends with a period (FR-1, FR-8). Test: same file.
- **AC-3** The numbers 1,200, +600, 1,800, +400, 2,200, +250, 2,450, 2,700, 3,000, 22–23, 14, 28, 30 November 2026 and the 2027 school year appear as the spec says. No other baht amount appears on the two pages (FR-9, FR-10). Test: both content tests.
- **AC-4** The section order, the five program cards, the seven logos, the three FAQ items on each page, the price-table rows and the button targets match sections 6 and 7 (FR-1 to FR-5, FR-8, FR-9, FR-11). Test: `www-features-page.content.test.tsx`, `www-pricing-page.content.test.tsx`.
- **AC-5** zh pages show the new numbers and the English copy and none of the removed strings (FR-14). Test: both content tests with the zh locale, and the locale test.
- **AC-6** No removed claim stays anywhere in `src/locales/` (FR-16). Test: `www-features-pricing.locale.test.ts`.
- **AC-7** The four image files exist, are WebP, are not empty, are at most 200 KB and have the pixel sizes of the image table in section 7 (FR-3). The crop content is person-checked in tasks 2.1 and 4.2. Test: `www-features-pricing.assets.test.ts`.
- **AC-8** Scope guards pass: the zh `managed-service` `roadmap.description` and the header labels for "Features" and "Pricing" in en, th and zh are unchanged, as literal values in the test (section 3). The products pages and the Storytime locale keys have no test guard: the diff check of task 2.7 shows that no file outside the listed ones changes. Test: `www-features-pricing.locale.test.ts` and task 2.7.
- **AC-9** The route metadata of both pages equals the Meta title and Meta description of the spec in en and th (FR-6, FR-12). Test: `phase-2-seo-assets.red.test.ts` (updated) and the locale test.
- **AC-10** `pnpm check-types`, ESLint on the changed files and the full www vitest suite exit 0. `next build` exits 0 (all FR). Gate commands in the plan task 2.6.
- **AC-11** Captures of `/features` and `/pricing` in en, th and zh at 390, 980 and 1280 px show no horizontal overflow and no broken image, and the browser review passes the look (FR-17). Evidence: the capture run and the review report.
- **AC-12** Daniel passes the Thai and the look, and gives the deploy word, before any push. Evidence class: owner-passed. Plan task 5.2.

## 9. Open questions for the PM

- **Q1 Thai trailing period.** The spec has a stray period at the end of 23 Thai lines. The check page has none. Default D5: follow the check page. The PM can ask PR to fix the spec text.
- **Q2 Seven pictures.** The spec asks for seven "Photo or illustration" pictures: features S1, S3, S4, S6, the CodeCamp card and the Science, Math and Zhongwen card, and the pricing S1 picture. No fitting file exists. Default D7: sections without a picture, no generation. Who supplies the pictures, and by when? A late picture is one follow-up task (an optional entry in the page config). The browser review reports the empty slots as a note and does not fail a page for them alone.
- **Q3 Features S1 button target.** Spec section 7 says CTA buttons go to `/contact`. Default D6: "Find the right program" goes to `#programs`. The PM confirms or changes it.
- **Q4 Screenshot crops.** The spec names the crops in words ("picture card", "cut the staff header"). The boxes of the image table are the planner's reading, checked by eye on 2026-11-20. The look check judges the crops.
- **Q5 Order with the Monday batch.** The Monday 2026-11-23 batch touches `pricing-table.ts` and `managed-service.ts`. D12 says FP1 wins. The PM tells the batch session to expect this.
- **Q7 Alt text.** The spec gives no `alt` text. Default D13: English `alt` in every locale. The PM can ask PR for Thai alt text, which Daniel then checks.
- **Q6 zh `lang` and font.** zh pages show English copy. The browser review checks that the zh page does not show a mixed-language look (English body with a Chinese header and footer). This is expected under Q-PR-33. The default is no change.

## 10. Constraints

- Hard gates stay with Daniel: the Thai check, the look check, the push and the deploy word. A push to master deploys www live.
- Heavy commands run one at a time through `heavy-run.sh`. The machine has 7 GB of memory.
- The Next production build needs the heavy-run build settings (floor 3000 MB, wait 3600 s). The script sets them for a `pnpm build` command that follows a `cd` into `apps/www-reading-advantage`.
- Commit subjects follow Conventional Commits, carry `(track_id: www_features_pricing_20261120)` and have 100 characters or less.
