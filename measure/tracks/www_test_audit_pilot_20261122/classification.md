# Classification: www test audit pilot (Phase 1, task 1.2)

Track: `www_test_audit_pilot_20261122`. Spec: [spec.md](./spec.md).
Plan: [plan.md](./plan.md). Source: PM plan A-66 sections 3-7.

## Counting rule

Case counts below are runner counts from the Phase 1 Vitest run
(`baseline.json`: 3175 cases across 91 files, all passing). A static
counter cross-checked every file: each `it(`/`test(` call counts 1, each
`it.each` data row counts 1 as the runner reports it, `for`-of and
`describe.each` registrations expand by collection length, and
`it.skipIf` aliases count 1. Three suites discover cases from the
filesystem at collection time, so only the runner can count them:
`blog-posts-validation` (1726), `products-page-pictures` loops (23),
`real-logos-adversarial` loops (114). `scripts/__tests__/i18n-cli.test.ts`
(13 static cases) is excluded from the Vitest run by `vitest.config.ts`
and marked not counted, as are the 6 `e2e/*.spec.ts` Playwright files
per spec section 2.

## K rows (keep)

| File | Case(s) | n | Rule | Reason |
|---|---|---|---|---|
| src/__tests__/proxy-redirect.test.ts | all 5 redirect cases | 5 | locale-routing rule | behavior through the middleware response |
| src/lib/blog-locale.test.ts | postsDirectory ×4 (en default, th, zh, th-differs) | 4 | locale blog-path routing | behavior of the exported path builder |
| src/locales/navigation.test.tsx | uses the configured default for an unsupported locale | 1 | locale fallback default | fallback logic through the hook |
| src/__tests__/phase-2-seo-assets.red.test.ts | all 4 metadata cases | 4 | per-locale SEO metadata, real OG PNG | behavior through generateMetadata plus asset bytes |
| src/__tests__/phase-2-seo-blog-routes.red.test.ts | all 10 article and pagination cases | 10 | article and pagination SEO metadata | behavior through generateMetadata with the real blog lib |
| src/__tests__/phase-2-seo-remaining-static.red.test.ts | all 10 route cases | 10 | static-route SEO metadata | behavior through generateMetadata |
| src/__tests__/phase-3-group-b-types.test.ts | service and product keys complete; routing config; AST-guard fixtures (control); translator wiring | 4 | locale key completeness; routing config; no bypass casts (guard tool); translator wiring | data contracts and component wiring; fixtures are controls |
| src/__tests__/phase-3-i18n.red.test.ts | renders localized CTA interpolation and Sheet screen-reader text | 1 | CTA and accessibility copy comes from locale messages | true render behavior with real dictionaries |
| src/__tests__/phase-4-accessibility-navigation-contact.red.test.tsx | all 4 contracts | 4 | announced graph; discoverable controls; nav contract; single contact authority | render behavior with role-based selectors |
| src/__tests__/phase-4-browser-regressions.red.test.tsx | keeps Storytime FAQ locale keys complete | 1 | FAQ key completeness | data contract across locales |
| src/__tests__/phase-4-browser-regressions-final.red.test.tsx | catches the observed 490px counterexample | 1 | overflow detector fires | control proves the detector fails on a bad tree |
| src/__tests__/phase-4-contact-authority.red.test.tsx | rendered surfaces show approved values; no duplicate raw values; counterexample control | 2 | single contact authority | rendered proof plus control (source-text half split to D1) |
| src/__tests__/phase-5-pricing-legal.red.test.tsx | no guarantee copy; counterexample control | 2 | legal copy keeps evaluation language | locale-data absence sweep plus control |
| src/__tests__/products-page-pictures.red.test.tsx | 10 picture-file cases; 4 program cards; 4 product blocks; alt ×2; hero ×2 | 22 | product pictures ship, render, and carry alt text | asset bytes plus rendered page checks |
| src/__tests__/www-features-page.content.test.tsx | controls ×2; sections, anchor, cards, bullets, logos, hero, FAQ, links, h1/alt, 3000-floor per locale (10 ×3) | 32 | page composition, wiring, and money floor | render behavior; hero class asserts noted as R2 element |
| src/__tests__/www-features-pricing.assets.test.ts | all 21 budgeted-WebP cases | 21 | planned image files ship with size and aspect | asset bytes against the plan |
| src/__tests__/www-features-pricing.locale.test.ts | fixture and scanner controls ×2; Thai period rule; price figures; zh equality; no removed strings ×3; dead namespaces ×3 | 13 | locale key hygiene; money figures; removal rules | key-shape, absence, and money checks (prose pins split to D5) |
| src/__tests__/www-pricing-page.content.test.tsx | controls ×2; sections, price table, hero, FAQ, links, h1/alt, baht amounts per locale (7 ×3) | 23 | price-table wiring and money figures | render behavior with the FR-9 curve |
| src/__tests__/www-pricing-required-rows.red.test.ts | all 7 RA4 cases | 7 | no silent empty table | real-translator render behavior |
| src/__tests__/www-pricing-rows-fluid.red.test.ts | three-row fixture control; renders exactly the fixture row count; renders no missing-cell marker | 3 | fluid rows map the locale array | render behavior (source pins split to D1) |
| src/__tests__/www-pricing-stacking.red.test.ts | all 22 stacking cases | 22 | pricing stacking rule and baht figures | money rule, never-delete set |
| src/__tests__/www-reading-card.red.test.ts | rendered status line; cover file real; PM(2) absence ×3; rendered absence ×3 | 8 | kept status line; real cover file; deleted sentence stays deleted | rendered proof and asset bytes |
| src/__tests__/www-reading-cover.red.test.ts | JPEG-reader, ratio, rendered-alt, file-aspect, rendered-ratio controls | 5 | cover aspect and D13 alt | controls, asset bytes, rendered proof |
| src/__tests__/www-stem-date-line.locale.test.ts | no deleted phrases ×3; en/th sweeps ×2; meta/og/twitter case | 6 | release-date lines stay deleted | absence sweeps plus metadata behavior |
| src/__tests__/www-tutor-calculator.locale.test.ts | blocks exist; calculator deep-equals §2 ×5; no removed keys ×2; no superseded figures or claims ×3; 3000 default; zh equality; old lines absent plus control | 15 | payout figures, D-17/D-10 rules, claim guards | money pins and mechanism checks (prose pins split to D5) |
| src/__tests__/www-tutor-followups.adversarial.test.ts | all 5 follow-up cases | 5 | zh draft rule; narrowed Storytime guard | equality mechanism plus guard with vacuity checks |
| src/__tests__/www-tutor-reedy-claim.test.tsx | probe control; no forbidden claim page/component ×6 | 7 | Reedy availability claims stay truthful | absence sweeps plus control (exact pins split to D5) |
| src/__tests__/www-tutor-screens-copy.adversarial.test.ts | all 5 copy controls | 5 | screens copy completeness and D-10 spread | key-shape, equality, and absence checks |
| src/app/[locale]/(marketing)/(home)/page.test.tsx | all 6 home cases | 6 | home composition and links | render behavior |
| src/app/[locale]/(marketing)/blog/page.test.tsx | all 9 pagination cases | 9 | pagination routes, metadata, redirects | render and metadata behavior with explicit mocks |
| src/app/[locale]/(marketing)/products/codecamp-advantage/page.test.tsx | live CTA link; production sections; no obsolete claims | 3 | live application link; page composition; no stale claims | render behavior plus claim-absence sweep |
| src/app/[locale]/(marketing)/products/math-advantage/page.test.tsx | all 4 layout cases | 4 | page composition | render behavior |
| src/app/[locale]/(marketing)/products/primary-advantage/page.adversarial.test.tsx | all 40 scanner and closed-world cases | 40 | strict page scanners with controls | each scanner carries a positive or negative control |
| src/app/[locale]/(marketing)/products/primary-advantage/page.content.test.tsx | controls ×8; drops old keys ×3; containers, links-out, 16 images, old refs, price, forge, game names, script ×24; demo order, play, poster, iframe, link, demo price ×18 | 53 | page composition, wiring, claim absence | render behavior and absence sweeps (exact pins split to D5) |
| src/app/[locale]/(marketing)/products/reading-advantage/page.test.tsx | all 6 layout cases | 6 | page composition | render behavior |
| src/app/[locale]/(marketing)/products/science-advantage/page.test.tsx | all 4 layout cases | 4 | page composition | render behavior |
| src/app/[locale]/(marketing)/products/stem-advantage/page.test.tsx | all 4 layout cases | 4 | page composition | render behavior |
| src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx | zh equality; poster; no video host; 5 scanner controls + 25 CLAIM_CONTROLS rows | 33 | zh spread; poster rule; privacy rule; claim scanners | mechanism, behavior, and absence checks (exact pins split to D5) |
| src/app/[locale]/(marketing)/products/storytime-advantage/page.test.tsx | all 2 structure cases | 2 | page structure | render behavior |
| src/app/[locale]/(marketing)/products/tutor-advantage/page.adversarial.test.tsx | all 5 gallery controls | 5 | screens gallery order, alts, captions | render behavior |
| src/app/[locale]/(marketing)/products/tutor-advantage/page.followups.adversarial.test.tsx | duplicate control; content files distinct ×3 | 4 | content images stay distinct per preset | control plus per-locale behavior |
| src/app/[locale]/(marketing)/products/tutor-advantage/page.images.test.tsx | all 33 image cases | 33 | tutor page image files, alts, order, sizes | rendered proof with real dictionaries (kept duplicate for screens D2 rows) |
| src/app/[locale]/(marketing)/products/tutor-advantage/page.phase3.adversarial.test.tsx | all 25 engine, numeral, image-map, downline, preset-figure cases | 25 | payout UI figures and image rules | real-engine behavior with controls |
| src/app/[locale]/(marketing)/products/tutor-advantage/page.placeholders.test.tsx | all 3 locale placeholder cases | 3 | every requested placeholder has a value | render behavior |
| src/app/[locale]/(marketing)/products/tutor-advantage/page.test.tsx | 8 wiring and order cases; 6 downline cases | 14 | page composition; no downline wording | render behavior with real copy |
| src/app/[locale]/(marketing)/products/zhongwen-advantage/page.test.tsx | all 4 layout cases | 4 | page composition | render behavior |
| src/components/blog/blog-pagination.test.tsx | nav, links, ellipsis, empty ×5 | 5 | pagination wiring | render behavior (class pin split to R2) |
| src/components/common/localized-link.test.tsx | all 8 link cases | 8 | locale prefix wiring | render behavior |
| src/components/marketing/experience-demo.test.tsx | all 3 demo cases | 3 | demo poster, frame, link | render behavior |
| src/components/marketing/hero-section.test.tsx | title, description, CTA ×2, floating image | 5 | hero props contract and photo visibility | render behavior (gradient pins split to R2) |
| src/components/marketing/mastery-advantage-graph.test.tsx | all 13 buildSteps and interaction cases | 13 | graph build and interaction | behavior through the component |
| src/components/marketing/tutor-commission-calculator.test.tsx | all 22 first-paint, rows, preset, eligibility cases | 22 | payout calculator UI rules | rendered payout behavior |
| src/components/marketing/tutor-commission-calculator.adversarial.test.tsx | all 17 leg, edit, preset, price, display cases | 17 | payout calculator hostile inputs | rendered payout behavior |
| src/components/marketing/tutor-commission-calculator.legs.adversarial.test.tsx | all 30 add, remove, clear, bar, walk cases | 30 | leg-row interaction rules | rendered payout behavior with seeded walks |
| src/components/products/storytime-song-player.test.tsx | all 15 player cases | 15 | song player contract | render behavior |
| src/lib/__tests__/real-logos-adversarial.test.ts | all 114 sweep, mapping, artwork, manifest cases | 114 | no removed references; artwork integrity; manifest parity | file-set sweeps with vacuity controls (kept duplicate for references D2 rows) |
| src/lib/__tests__/real-logos-captures-adversarial.test.ts | all 103 capture cases | 103 | capture integrity and spec parity | byte checks with fixture controls (kept duplicate for favicon D2 rows) |
| src/lib/__tests__/real-logos-captures.red.test.ts | repo-root control; 15 capture PNG cases | 16 | capture files exist and read as PNG | asset bytes (order pins split to D4) |
| src/lib/__tests__/real-logos-favicon.red.test.ts | ICO magic in one copy | 1 | favicon is a real ICO file | magic bytes (length and identity rows split to D2) |
| src/lib/__tests__/real-logos-mapping.red.test.ts | maps the ten product ids; 30 per-kind file cases | 31 | logo manifest maps artwork that exists | data plus asset existence (removed-kind rows split to D2) |
| src/lib/__tests__/real-logos-references.red.test.ts | dir removals ×3; raster removals ×8; square SVGs | 12 | placeholders and rasters stay removed | public-tree absence and presence checks (literal sweeps split to D2) |
| src/lib/__tests__/site-assets.test.ts | manifest existence; chibi tags | 2 | assets exist; chibi art stays scoped | manifest and tag rules |
| src/lib/__tests__/storytime-page-images.test.ts | writes only the 10 lossless WebP files and the two song posters | 1 | delivered image set and encoding | asset bytes (source rows split to D3) |
| src/lib/__tests__/tutor-screens.adversarial.test.ts | size parity; distinct srcs; prefix and traversal; repo hygiene | 4 | screens asset integrity | header bytes and manifest rules (order row split to D2) |
| src/lib/__tests__/tutor-screens.test.ts | EXPECTED paths and sizes ×10; no tutor-desktop | 11 | screens manifest facts | data plus file existence (order row split to D2) |
| src/lib/blog-blocks.test.ts | all 18 block cases | 18 | blog block rendering and rejection | lib behavior with hostile inputs |
| src/lib/blog-draft.test.ts | all 6 draft cases | 6 | drafts stay out of production lists | lib behavior |
| src/lib/blog-locale.test.ts | postsDirectory en/th/zh; th differs | 4 | locale blog-path routing | behavior of the exported path builder |
| src/lib/blog-posts-validation.test.ts | all 1726 frontmatter, content, naming, consistency cases | 1726 | every post carries valid frontmatter and names | content-integrity gate over all posts (merge candidate, see projection) |
| src/lib/blog.test.ts | all 28 reading-time, pagination, heading, related cases | 28 | blog lib contracts | lib behavior (kept duplicate for blog-locale typeof D2 row) |
| src/lib/tutor-commission.test.ts | all 34 rate, preset, conservation, clamp, tax cases | 34 | payout math to the satang | money rule, never-delete set |
| src/lib/tutor-commission.adversarial.test.ts | all 24 float, boundary, hostile, conservation cases | 24 | payout math under attack | money rule, never-delete set |
| src/lib/tutor-commission.followups.adversarial.test.ts | all 4 edge cases | 4 | payout edge variants | money rule, never-delete set |
| src/lib/tutor-commission.settlement.adversarial.test.ts | all 37 settlement-parity cases | 37 | calculator matches the settlement system | money rule with independent model, never-delete set |
| src/lib/wave2-product-claim-helper.test.ts | all 12 helper and case-study cases | 12 | claim classification and consent proof | lib behavior with counterexamples |
| src/lib/__tests__/primary-page-images.test.ts | adds no 64-character hash to any file under apps/ | 1 | no hashes in the repo | process guard on the git diff |
| src/__tests__/phase-4-browser-regressions-final.red.test.tsx | catches the observed 490px counterexample | 1 | overflow detector fires | control proves the detector fails on a bad tree |

## D1 rows (source-text test: delete, or replace with a behavior test)

| File | Case(s) | n | Rule or none | Action | Reason |
|---|---|---|---|---|---|
| src/__tests__/blog-figure-natural-size.test.ts | all 4 figure CSS cases | 4 | none (layout detail) | delete | reads globals.css as text and regex-matches declarations |
| src/__tests__/blog-hero-height.red.test.ts | all 3 compact-hero cases | 3 | none (fixed hero height) | delete | matches `min-h-hero-compact` and HeroSection props in source text |
| src/__tests__/hero-text-contrast.red.test.ts | all 2 contrast cases | 2 | none (fixed hero color) | delete | extracts HeroSection calls from page sources as text |
| src/__tests__/products-entrance-visibility.red.test.ts | all 3 visibility cases | 3 | none (fixed animation guards) | delete | regex-matches globals.css and b2b-solutions.tsx source |
| src/__tests__/www-features-look-pins.red.test.ts | source class pins: controls ×3, F1, F2, F2r6 ×2, card order, base grid, F3r6 source ×2, picture column | 12 | none (fixed look defects) | delete | every case matches class names in program-card.tsx or features page source |
| src/__tests__/phase-3-group-b-types.test.ts | keeps both production components free of unsafe assertions | 1 | no bypass casts | delete | static TypeScript AST analysis of two .tsx files, not runtime behavior |
| src/__tests__/phase-3-i18n.red.test.ts | CTA copy in source; bypass casts grep; Thai typos in source; tsc diagnostics | 4 | locale copy sourcing; no casts; typo list; type validity | delete | all four read .tsx or locale .ts source as text; case 5 renders the same components |
| src/__tests__/phase-4-contact-authority.red.test.tsx | uses contactDetails references in page, footer, form sources | 1 | contact authority (rendered half stays) | rewrite | drops the `?raw` source-text asserts; the rendered asserts in the same case already prove the rule |
| src/__tests__/www-pricing-rows-fluid.red.test.ts | pricing page source is found; no literal four-row index list | 2 | fluid rows (rendered cases stay) | delete | source-presence and source-absence pins; two rendered cases prove the rule |
| src/__tests__/www-reading-card.red.test.ts | scanner control; new cover src; old src gone; no mt-auto | 4 | cover swap and featured-row fix (rendered and file cases stay) | delete | class-name and src-string pins in page and card source |
| src/__tests__/www-reading-cover.red.test.ts | declared dims; storytime, primary, tutor regression pins | 4 | cover dims; other cards unchanged | delete | reads CARD_IMAGES numbers and approved strings from page source |
| src/__tests__/no-gse-in-customer-copy.test.ts | all 4 sweep, pending, reason, print cases | 4 | CEFR-only customer copy | delete | scans .tsx, .ts, .md, and .svg source as text with regex |
| src/lib/__tests__/phase-w3-claims.test.ts | all 18 claim audits and positive controls | 18 | truthful product claims | delete | reads src/ files as text and matches banned literals; rendered page tests hold the live rules |
| src/__tests__/www-batch-20261119.locale.test.ts | roadmap tags in home source; zh roadmap source absence; reading-card badge source; planned-date default source; efficacy-stats and FAQ removals in page sources | 5 | 2027 copy rollout (locale pins stay) | delete | `readFileSync` plus `toContain`/`not.toContain` on page and locale sources |
| src/components/layout/layout-components.test.ts | does not retain empty layout component modules | 1 | none (one-time migration guard) | delete | reads source files only to check emptiness; git history holds the state |

## D2 rows (duplicate: delete; kept duplicate named)

| File | Case(s) | n | Kept duplicate |
|---|---|---|---|
| src/app/[locale]/(marketing)/products/primary-advantage/page.test.tsx | renders 11 containers; renders in page order; no old test id | 3 | page.content.test.tsx containers, order, and old-reference cases |
| src/lib/blog-locale.test.ts | returns the en directory when locale is en | 1 | same file: returns the en subdirectory by default |
| src/lib/blog-locale.test.ts | returns a number type for calculateReadingTime | 1 | src/lib/blog.test.ts calculateReadingTime value cases |
| src/lib/__tests__/real-logos-favicon.red.test.ts | byte-identical copies; byte length ×2; ICO magic in the second copy | 4 | real-logos-captures-adversarial.test.ts favicon byte rows |
| src/lib/__tests__/real-logos-mapping.red.test.ts | references no value containing the removed kind ×3 | 3 | real-logos-adversarial.test.ts FR-5 source sweep rows |
| src/lib/__tests__/real-logos-references.red.test.ts | references zero occurrences of each removed literal ×11 | 11 | real-logos-adversarial.test.ts FR-5 source sweep rows |
| src/__tests__/products-page-pictures.red.test.tsx | does not use the retired Storytime set | 1 | www-tutor-followups.adversarial.test.ts manifest guard case |
| src/lib/__tests__/tutor-screens.test.ts | holds the five PR section 2 slots in gallery order | 1 | tutor-advantage/page.images.test.tsx rendered screens-order case |
| src/lib/__tests__/tutor-screens.adversarial.test.ts | ADV-M4 slot order is fixed (portrait half rides with the manifest pins) | 1 | tutor-screens.test.ts EXPECTED order and portrait pins |
| src/__tests__/www-reading-card.red.test.ts | alts the cover in English per D13 | 1 | www-reading-cover.red.test.ts rendered D13-alt control |
| src/__tests__/www-reading-cover.red.test.ts | picture wrapper applies no crop fit | 1 | same file: rendered portrait-ratio case |
| src/__tests__/phase-3-i18n.red.test.ts | (no D2 row: the bypass-cast grep duplicates group-b case 4, but both are D1 and both go) | 0 | — |

## D3 rows (dead target: delete)

| File | Case(s) | n | Reason |
|---|---|---|---|
| src/lib/__tests__/primary-page-images.test.ts | has 16 rows; same names and alt text; SHA-256 per source; fills the output folder; lossless output sizes; pixel-equal crops; scaled Reedy check; drift guard | 8 | all eight read handoff sources outside the repo and skip without them |
| src/lib/__tests__/storytime-page-images.test.ts | manifest SHA-256 check; lanczos crop check | 2 | both read the external A45 handoff manifest and skip without it |

## D4 rows (weak check: delete, or merge)

| File | Case(s) | n | Reason |
|---|---|---|---|
| src/locales/navigation.test.tsx | returns the active locale ×3 | 3 | echoes the mocked locale; no logic under test |
| src/lib/__tests__/real-logos-captures.red.test.ts | names the first and last capture | 2 | pins the test file's own filename literals |
| src/lib/__tests__/primary-page-images.test.ts | are present when A34_REQUIRE_SOURCES=1 | 1 | returns early and passes vacuously without the env flag |

## D5 rows (copy pin on a marketing line: replace with a locale-key check)

| File | Case(s) | n | Reason |
|---|---|---|---|
| src/__tests__/www-batch-20261116.locale.test.ts | new en/th lines row A ×5, zh row A, STEM badge, new row B ×9, roadmap sentence, detail lines ×6, zh detail, week-1 book line | 25 | exact word-for-word en/th/zh pins of PM batch copy |
| src/__tests__/www-batch-20261119.locale.test.ts | roadmap strip ×3, STEM tag, zh roadmap note, detail 2027 ×18, limits ×3, managed service ×5 | 31 | exact word-for-word pins; source-text halves of two cases go with the pins |
| src/__tests__/www-stem-date-line.locale.test.ts | kept en/th lines ×3, zh lines, every other line | 5 | exact pins of the STEM lines |
| src/__tests__/www-tutor-calculator.locale.test.ts | screens deep-equals ×4; live-line en/th pins ×2 | 6 | exact prose pins (money pins stay as K) |
| src/__tests__/www-features-pricing.locale.test.ts | features EN/TH/meta ×3; pricing EN/TH/meta/managed ×4; scope guards ×2 | 9 | exact pins of the features and pricing copy |
| src/__tests__/www-tutor-reedy-claim.test.tsx | page and component descriptions ×6; FAQ answer; rendered bullets ×3 | 10 | exact Reedy sentences (absence sweeps stay as K) |
| src/__tests__/www-features-page.content.test.tsx | meta titles ×3; every spec string once ×3 | 6 | exact meta and page strings through the render |
| src/__tests__/www-pricing-page.content.test.tsx | meta titles ×3; every spec string once ×3 | 6 | exact meta and page strings through the render |
| src/app/[locale]/(marketing)/products/primary-advantage/page.content.test.tsx | locale meta ×6; brief strings per container ×30; links word-for-word ×30; demo experience keys ×3; demo eyebrow block ×3 | 102 | exact brief strings and labels (structure and absence cases stay as K) |
| src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx | overview handoff ×3; label handoff ×3; approved copy ×3; metadata ×3; song copy ×3 | 15 | exact handoff strings (structure and sweeps stay as K) |
| src/__tests__/www-tutor-screens-copy.adversarial.test.ts | (no D5 row: equality and absence checks are mechanisms, kept as K) | 0 | — |
| src/__tests__/phase-4-contact-copy.red.test.tsx | raw handle plus platform phrase; rendered TikTok phrase ×3 | 4 | exact TikTok sentences (config value stays covered by the contact-authority test) |
| src/app/[locale]/(marketing)/products/codecamp-advantage/page.test.tsx | keeps the real production denominators | 1 | exact stat pins ("4", "20", "106") and marketing phrases |

## R1 rows (over-mocked: rewrite against a boundary fake)

None. Boundary mocks (`@/locales/server`, `next/image`, i18n) stand in for
framework adapters, never for the code under test. Child-component mocks in
blog and product page tests isolate the page under test only.

## R2 rows (brittle: rewrite with fixed clocks and role-based selectors)

| File | Case(s) | n | Reason |
|---|---|---|---|
| src/__tests__/phase-4-browser-regressions.red.test.tsx | related cards safe at mobile width; contact eyebrow contrast | 2 | asserts `min-w-0`, `break-words`, `text-sky-800` class names |
| src/__tests__/phase-4-browser-regressions-remaining.red.test.tsx | 390px containment; pricing hero contrast | 2 | asserts containment and `text-slate-*` class names |
| src/__tests__/phase-4-browser-regressions-final.red.test.tsx | detects overflow in article tag and card structures | 1 | asserts class-name heuristics on rendered output |
| src/__tests__/www-features-look-pins.red.test.ts | renders pictured cards as full-width rows; text-only cards stay out | 2 | asserts responsive row classes on rendered cards |
| src/app/[locale]/(marketing)/services/page.test.tsx | keeps localized badge tones ×3 | 3 | pins design-token classes per service |
| src/app/[locale]/(marketing)/services/blended-learning/page.test.tsx | asymmetric desktop split | 1 | pins `lg:grid-cols-12` and span classes |
| src/app/[locale]/(marketing)/services/managed-service/page.test.tsx | asymmetric desktop split | 1 | pins `lg:grid-cols-12` and span classes |
| src/components/marketing/hero-section.test.tsx | default and custom background gradients | 2 | pins exact Tailwind gradient classes |
| src/components/blog/blog-pagination.test.tsx | wraps pagination controls on narrow screens | 1 | pins the `flex-wrap` class |

## R3 rows (unclear: split or rename)

None. Case names state the rule or the contract id throughout
(AC, FR, RA, FP, D, PM references).

## Not counted

| File | Case(s) | n | Note |
|---|---|---|---|
| scripts/__tests__/i18n-cli.test.ts | all 13 CLI cases | 13 | excluded from the Vitest run by vitest.config.ts; K behavior, not counted |
| e2e/contact.spec.ts | contact page email link | 1 | Playwright, not counted |
| e2e/homepage.spec.ts | home heading; Products nav link | 2 | Playwright, not counted |
| e2e/link-locale-preservation.spec.ts | internal links keep the locale prefix ×2 | 2 | Playwright, not counted |
| e2e/locale-middleware.spec.ts | redirects, static bypasses, pagination ×7 | 7 | Playwright, not counted |
| e2e/photos.spec.ts | marketing and products photo titles across the target and locale matrix | 2 | Playwright titles expand over the matrix at runtime, not counted |
| e2e/real-logos-captures.spec.ts | favicon serving; capture matrix | 2 | Playwright, not counted |

## Summary

Runner counts per class (Vitest suite, 3175 cases):

| Class | Cases | Share | Action |
|---|---|---|---|
| K keep | 2827 | 89.0 % | keep |
| D1 source-text | 68 | 2.1 % | delete (one rewrite keeps its case) |
| D2 duplicate | 28 | 0.9 % | delete, kept duplicate named |
| D3 dead target | 10 | 0.3 % | delete |
| D4 weak check | 6 | 0.2 % | delete |
| D5 copy pin | 221 | 7.0 % | replace with locale-key checks |
| R1 over-mocked | 0 | 0.0 % | — |
| R2 brittle | 15 | 0.5 % | rewrite with role-based selectors |
| R3 unclear | 0 | 0.0 % | — |

Check: 2827 + 68 + 28 + 10 + 6 + 221 + 15 = 3175.

## Projected cut of Vitest cases

- Certain deletes (D1 except the one rewrite, D2, D3, D4):
  67 + 28 + 10 + 6 = 111 cases, 3.5 %.
- D5 replacements collapse 220 exact-pin cases into locale-key checks.
  One key-shape check per pinned key group leaves about 60 to 80 cases.
  Cut from D5: about 140 to 160 cases, about 4.4 to 5.0 %.
- R2 rewrites keep their 15 cases (rewritten, not removed).
- Projected total cut: about 250 to 270 cases, about 7.9 to 8.5 %.
  The honest projection is below the 20 % target of 635 cases.
  The projection is not inflated to reach the target.

The largest lever outside these classes is the `blog-posts-validation`
gate (1726 cases, kept as K). It checks every post label by label.
A Phase 2 or Phase 3 merge into one case per rule (same assertions,
aggregated failures) would keep fault detection and cut about 1700 cases.
That merge is a Green-phase design decision, so it stays out of the
projection above. The second lever is the primary-advantage content
pin set (102 D5 cases); its replacement design decides the final count.
