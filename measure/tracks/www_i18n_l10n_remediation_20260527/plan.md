# Implementation Plan: www-reading-advantage i18n/l10n Remediation

## Phase 0: Audit Baseline & Missing Keys
_FR ref: FR-1, FR-8_

- [ ] Task: Run `npm run i18n:audit -- --json > measure/tracks/www_i18n_l10n_remediation_20260527/audit-baseline.json` to capture the full baseline
- [ ] Task: Add `main` array to `th` export in `src/locales/components/common/header.ts` (6 nav items with Thai titles)
- [ ] Task: Add `main` array to `zh` export in `src/locales/components/common/header.ts` (6 nav items with Chinese titles)
- [ ] Task: Run `npm run i18n:audit -- --keys` and verify 0 missing keys
- [ ] Task: Commit — `fix(i18n): Add missing header nav keys for th and zh`
- [ ] Task: Measure - User Manual Verification 'Phase 0: Audit Baseline & Missing Keys' (Protocol in workflow.md)

## Phase 1: Product Pages — Adaptive Engine & Eyebrow Labels
_FR ref: FR-2, FR-3_

- [ ] Task: Extract "Adaptive Engine" section text (heading, subheading, description paragraph) to translation keys for all 9 product pages:
  - reading-advantage, primary-advantage, math-advantage, science-advantage, stem-advantage, storytime-advantage, tutor-advantage, zhongwen-advantage, codecamp-advantage
- [ ] Task: Extract uppercase eyebrow labels to translation keys for all 9 product pages (`PLATFORM`, `BLENDED LEARNING`, `KEY FEATURES`, `THE PROCESS`, `GET STARTED`, `RESULTS`, `EDUCATIONAL GAMES`, `GRADE LEVELS`, `BENEFITS`, `LEVEL MAPPING`, `INTERACTIVE LEARNING`, `FOR EDUCATORS`, `QUESTIONS?`, etc.)
- [ ] Task: Add corresponding `th` and `zh` translations for all new keys
- [ ] Task: Run `npm run i18n:audit -- --hardcoded` and verify product page count drops significantly
- [ ] Task: Commit — `fix(i18n): Extract adaptive engine and eyebrow labels on product pages`
- [ ] Task: Measure - User Manual Verification 'Phase 1: Product Pages — Adaptive Engine & Eyebrow Labels' (Protocol in workflow.md)

## Phase 2: Product Pages — Remaining Hardcoded Strings
_FR ref: FR-4, FR-5, FR-6, FR-7_

- [ ] Task: Extract device labels (`Desktop`, `Tablet`, `Mobile`) on reading-advantage page to translation keys
- [ ] Task: Extract remaining section headings, subheadings, and paragraphs on all product pages (benefits, results, features, curriculum, FAQ, CTA sections)
- [ ] Task: Extract image `alt` text to translation keys across all product pages
- [ ] Task: Add corresponding `th` and `zh` translations for all new keys
- [ ] Task: Run `npm run i18n:audit -- --hardcoded` scoped to `products/` and verify 0 findings
- [ ] Task: Commit — `fix(i18n): Extract remaining hardcoded text on product pages`
- [ ] Task: Measure - User Manual Verification 'Phase 2: Product Pages — Remaining Hardcoded Strings' (Protocol in workflow.md)

## Phase 3: Marketing Pages — Home, About, Pricing, Features, Contact
_FR ref: FR-2, FR-5, FR-7_

- [ ] Task: Extract hardcoded text on `(home)/page.tsx` (KST+SRS label, Challenge pattern)
- [ ] Task: Extract hardcoded eyebrow labels on `about/page.tsx` (Introduction, Our Story, Mission & Vision, Technology & Impact, Our Values, Research, Quality Protocol, Positioning)
- [ ] Task: Extract hardcoded trust signals and section labels on `pricing/page.tsx` (No Hidden Fees, Instant Setup, Dedicated Support, Pricing Plans, Choose Your Plan)
- [ ] Task: Extract hardcoded text on `features/page.tsx` (AI-Powered Platform, Platform Features, Comparison, etc.)
- [ ] Task: Extract hardcoded text on `contact/page.tsx` (Get in Touch, Connect With Us, Stay Connected)
- [ ] Task: Add corresponding `th` and `zh` translations for all new keys
- [ ] Task: Commit — `fix(i18n): Extract hardcoded text on core marketing pages`
- [ ] Task: Measure - User Manual Verification 'Phase 3: Marketing Pages' (Protocol in workflow.md)

## Phase 4: Remaining Marketing Pages & Services
_FR ref: FR-7_

- [ ] Task: Extract hardcoded text on `blog/page.tsx`, `case-studies/page.tsx`, `mastery-advantage/page.tsx`, `services/page.tsx`, `services/blended-learning/page.tsx`
- [ ] Task: Add corresponding `th` and `zh` translations for all new keys
- [ ] Task: Run `npm run i18n:audit -- --hardcoded` and verify 0 findings across all files
- [ ] Task: Commit — `fix(i18n): Extract hardcoded text on remaining marketing pages`
- [ ] Task: Measure - User Manual Verification 'Phase 4: Remaining Marketing Pages & Services' (Protocol in workflow.md)

## Phase 5: Final Verification & Audit Gate
_FR ref: FR-8_

- [ ] Task: Run `npm run i18n:audit` and verify exit code 0 (0 missing keys, 0 hardcoded strings)
- [ ] Task: Run `npm run build` and verify build passes
- [ ] Task: Run `npm run test` and verify all tests pass
- [ ] Task: Run `npm run lint` and verify no new lint errors
- [ ] Task: If any false positives were discovered in the audit script, update `scripts/i18n-audit.ts` allowlists
- [ ] Task: Commit — `chore(i18n): Final audit verification and cleanup`
- [ ] Task: Measure - User Manual Verification 'Phase 5: Final Verification & Audit Gate' (Protocol in workflow.md)
