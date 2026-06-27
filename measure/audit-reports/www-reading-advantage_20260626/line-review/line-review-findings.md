# Line Review Findings: www-reading-advantage

> Track: `www_reading_advantage_review_20260626`
> Generated: 2026-06-27
> Source: synthesized from `line-review/evidence/batch-01..10/evidence.md` and `coverage-patches/`
> **Review-only synthesis. No source code remediation was performed.**
> Date context for staleness findings: 2026-06-27.

Findings are unique line-review findings (LRF-NNN). Systemic themes are deduplicated into single findings; all file:line evidence is preserved in each finding's Evidence list. Severity/category totals are in `line-review-summary.md` and `lrf-extracted.json`.

---

### LRF-002: Stale "Launching in 2025" / "Coming in 2025" launch claims (past due ~6-18 months)

- **Severity**: Critical
- **Category**: Claims
- **Theme**: `stale-launch-dateline`  _(systemic)_
- **Batches**: batch-02, batch-03, batch-09
- **Related claims**: C-SA-01, C-CC-01, C-MA-01, C-STEM-01, C-ST-01, C-TA-02, C-ZA-01
- **Evidence**:
  - `src/app/[locale]/(marketing)/products/science-advantage/page.tsx:29`
  - `src/app/[locale]/(marketing)/products/codecamp-advantage/page.tsx:31`
  - `src/app/[locale]/(marketing)/products/math-advantage/page.tsx:26`
  - `src/app/[locale]/(marketing)/products/stem-advantage/page.tsx:27`
  - `src/app/[locale]/(marketing)/products/storytime-advantage/page.tsx:24`
  - `src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx:26`
  - `src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx:30`
  - `src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx:378`
  - `src/app/[locale]/(marketing)/products/zhongwen-advantage/page.tsx:85`
  - `src/locales/pages/products/stem-advantage.ts:10`
  - `src/locales/pages/products/storytime-advantage.ts:10`
  - `src/locales/pages/products/tutor-advantage.ts:10`
  - `src/locales/pages/products/tutor-advantage.ts:4`

**Description**: Multiple product pages and locales carry 'Launching in 2025' / 'Coming in 2025' / 'launching in early 2025' claims in OG metadata and body content across all three languages. Current date is June 2026, making these past due by 6-18 months.

**Recommendation**: Reconcile all launch dates with actual product status; replace stale 2025 datelines with current status or future-valid dates.

---

### LRF-005: Homepage has no metadata export (no title/description/OG)

- **Severity**: Critical
- **Category**: SEO
- **Theme**: `missing-seo-metadata`  _(systemic)_
- **Batches**: batch-01
- **Related claims**: C-TC-03
- **Evidence**:
  - `src/app/[locale]/(marketing)/(home)/page.tsx:1-215`

**Description**: The most important page on the site exports neither metadata nor generateMetadata. No title tag, description, or Open Graph tags.

**Recommendation**: Add locale-aware generateMetadata with title/description/OG tags.

---

### LRF-006: Multiple pages missing SEO metadata entirely

- **Severity**: Critical
- **Category**: SEO
- **Theme**: `missing-seo-metadata`  _(systemic)_
- **Batches**: batch-01, batch-02, batch-03
- **Related claims**: C-TC-03
- **Evidence**:
  - `src/app/[locale]/(marketing)/case-studies/page.tsx`
  - `src/app/[locale]/(marketing)/contact/page.tsx`
  - `src/app/[locale]/(marketing)/services/page.tsx`
  - `src/app/[locale]/(marketing)/services/blended-learning/page.tsx`
  - `src/app/[locale]/(marketing)/services/managed-service/page.tsx`
  - `src/app/[locale]/(marketing)/products/reading-advantage/page.tsx`
  - `src/app/[locale]/(marketing)/products/primary-advantage/page.tsx`

**Description**: Case studies, contact, services overview, blended-learning, managed-service, and the Reading/Primary Advantage product pages have no metadata or generateMetadata export. RA/PA product pages lack metadata because they are 'use client'.

**Recommendation**: Add metadata exports (or move metadata to a server layout for client pages).

---

### LRF-007: Reading Advantage product page is fully client-rendered ('use client')

- **Severity**: Critical
- **Category**: Architecture
- **Theme**: `client-render-seo`
- **Batches**: batch-02
- **Related claims**: C-RA-01
- **Evidence**:
  - `src/app/[locale]/(marketing)/products/reading-advantage/page.tsx:1`

**Description**: Entire 516-line content-heavy marketing page is client-rendered, which prevents server-side metadata, harms SEO and LCP. Layout-level metadata partially compensates.

**Recommendation**: Split into server shell with client islands; restore SSR for content.

---

### LRF-008: Non-functional waitlist/email forms (no action or onSubmit handler)

- **Severity**: Critical
- **Category**: Conversion
- **Theme**: `broken-form`  _(systemic)_
- **Batches**: batch-02, batch-03
- **Related claims**: C-SA-01, C-ZA-01
- **Evidence**:
  - `src/app/[locale]/(marketing)/products/science-advantage/page.tsx:380-392`
  - `src/app/[locale]/(marketing)/products/zhongwen-advantage/page.tsx:425-441`

**Description**: Science Advantage and Zhongwen Advantage waitlist forms have email inputs and submit buttons but no action or onSubmit handler. Submitting does a no-op page refresh; signups are lost.

**Recommendation**: Wire forms to a submission handler/endpoint or disable until functional.

---

### LRF-009: Contact form is mailto-only — no backend submission, analytics, or CRM

- **Severity**: Critical
- **Category**: Conversion
- **Theme**: `broken-form`
- **Batches**: batch-04
- **Related claims**: C-TC-03
- **Evidence**:
  - `src/components/contact/contact-form.tsx:28-43`

**Description**: Contact form submits via window.location.href = mailto:. No server-side capture, no validation beyond HTML required, no success/error feedback, no form reset, no analytics or CRM integration. Leads are lost if email fails.

**Recommendation**: Add server-side submission with confirmation UI and lead capture.

---

### LRF-010: Three empty layout component files (0 bytes)

- **Severity**: Critical
- **Category**: Code Quality
- **Theme**: `empty-component-file`  _(systemic)_
- **Batches**: batch-04
- **Related claims**: C-MK-01
- **Evidence**:
  - `src/components/layout/fade-in.tsx`
  - `src/components/layout/page-transition.tsx`
  - `src/components/layout/scroll-fade.tsx`

**Description**: fade-in.tsx, page-transition.tsx, scroll-fade.tsx are all 0 bytes. If imported anywhere they export undefined and cause runtime errors. Inventory listed them at 20/30/30 lines.

**Recommendation**: Implement or delete and remove imports; verify usage across codebase.

---

### LRF-001: "Nine products" claim overstated; only 4 products have app directories

- **Severity**: High
- **Category**: Claims
- **Theme**: `product-count-overstatement`  _(systemic)_
- **Batches**: batch-01, batch-07, batch-08
- **Related claims**: C-MK-01, C-MV-03
- **Evidence**:
  - `src/locales/pages/home.ts:6`
  - `src/locales/pages/home.ts:40`
  - `src/locales/pages/home.ts:200`
  - `src/locales/pages/home.ts:360`
  - `src/locales/pages/products/reading-advantage.ts:63`
  - `src/locales/pages/mastery-advantage.ts:62`
  - `src/locales/pages/mastery-advantage.ts:134`
  - `src/locales/pages/mastery-advantage.ts:207`
  - `src/app/[locale]/(marketing)/(home)/page.tsx:80`
  - `src/app/[locale]/(marketing)/mastery-advantage/page.tsx:37-46`

**Description**: "One engine, nine products." repeated in all 3 locales across home, mastery, and reading-advantage locales. Only 4 product app directories exist (reading-advantage, primary-advantage, science-advantage, codecamp-advantage). Math, STEM, Storytime, Tutor, Zhongwen have no app directories. The mastery-advantage-graph component renders only 8 domains (CodeCamp omitted), inconsistent with the 9-products claim.

**Recommendation**: Update locale strings to reflect actual launched product count and use 'Coming Soon' qualifiers for unbuilt products.

---

### LRF-003: Blended Learning / Reading Advantage "May 2026" datelines now past due

- **Severity**: High
- **Category**: Claims
- **Theme**: `stale-launch-dateline`
- **Batches**: batch-02, batch-08
- **Related claims**: C-RA-01
- **Evidence**:
  - `src/locales/pages/products/reading-advantage.ts:5-6`
  - `src/locales/pages/products/reading-advantage.ts:9`
  - `src/locales/pages/services.ts:12`
  - `src/locales/pages/blended-learning.ts:6`

**Description**: 'Starting May 2026', 'Launching May 2026', 'LAUNCHING MAY 2026', and 'NEW IN MAY 2026' badges are past due as of June 2026.

**Recommendation**: Update to 'Now Available' / 'Launched' messaging.

---

### LRF-004: Cross-file launch date conflicts between product locales and B2B solutions locale

- **Severity**: High
- **Category**: Claims
- **Theme**: `stale-launch-dateline`  _(systemic)_
- **Batches**: batch-09, batch-10
- **Related claims**: C-STEM-01, C-ST-01, C-SA-01, C-PA-01
- **Evidence**:
  - `src/locales/pages/products/stem-advantage.ts:10`
  - `src/locales/components/products/b2b-solutions.ts:34`
  - `src/locales/pages/products/storytime-advantage.ts:10`
  - `src/locales/components/products/b2b-solutions.ts:78`
  - `src/locales/components/products/b2b-solutions.ts:45`
  - `src/locales/components/products/b2b-solutions.ts:12`

**Description**: STEM product locale says 'Coming in 2025' but B2B locale says 'Coming mid 2027'; Storytime product locale says 'Coming in 2025' but B2B says 'Coming early 2027'. Science 'Coming early 2026' (B2B) is past due. Primary 'New for SY2025' badge past due at end of SY2025.

**Recommendation**: Establish single source of truth for product launch dates and reconcile across all locale files.

---

### LRF-011: Missing static assets referenced by pages/layout (404s)

- **Severity**: High
- **Category**: Assets
- **Theme**: `missing-asset`  _(systemic)_
- **Batches**: batch-01, batch-03
- **Related claims**: C-TC-03
- **Evidence**:
  - `src/app/[locale]/(marketing)/features/page.tsx:46`
  - `src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx:55`
  - `src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx:127`
  - `src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx:289`
  - `src/app/[locale]/(marketing)/products/zhongwen-advantage/page.tsx:112`
  - `src/app/[locale]/layout.tsx:221`

**Description**: public/grid-pattern.svg is referenced as a CSS background on features, tutor-advantage (3x), and zhongwen-advantage but does not exist. public/images/og-image.jpg referenced as default site OG image in root layout does not exist, breaking social sharing site-wide.

**Recommendation**: Add the missing assets or remove references.

---

### LRF-012: Case studies use placeholder data while heading claims "Real Results from Real Schools"

- **Severity**: High
- **Category**: Claims
- **Theme**: `placeholder-content`
- **Batches**: batch-01, batch-08
- **Related claims**: C-MK-03, C-MK-04
- **Evidence**:
  - `src/locales/pages/case-studies.ts:23-92`
  - `src/locales/pages/case-studies.ts:142-212`
  - `src/locales/pages/case-studies.ts:263-333`
  - `src/app/[locale]/(marketing)/case-studies/page.tsx:12-43`

**Description**: All three locales contain placeholders: 'School A (Coming Soon)', '+X points over Y months', 'X articles per student', 'Teacher Name'. No authentic testimonials, partner logos, or data exist, while the heading promises real results.

**Recommendation**: Populate with real data or hide the page until data exists.

---

### LRF-014: Primary Advantage efficacy stats duplicated verbatim from Reading Advantage

- **Severity**: High
- **Category**: Claims
- **Theme**: `duplicated-stats`
- **Batches**: batch-09
- **Related claims**: C-PA-02
- **Evidence**:
  - `src/locales/pages/products/primary-advantage.ts:103-117`
  - `src/locales/pages/products/primary-advantage.ts:107`

**Description**: '+9.5 pts', '85% Weekly Active Usage', '100% Curriculum Alignment' with 'Aka, 2019' citation are identical to Reading Advantage. Using identical efficacy numbers for distinct products is misleading unless the same research is explicitly cited.

**Recommendation**: Use product-specific data or clearly attribute shared research.

---

### LRF-017: Stale 'Last updated' datelines on comparison and pricing tables

- **Severity**: High
- **Category**: Claims
- **Theme**: `stale-dateline`  _(systemic)_
- **Batches**: batch-05, batch-10
- **Related claims**: C-MK-04, C-RA-05
- **Evidence**:
  - `src/locales/components/comparison-table.ts:3`
  - `src/locales/components/comparison-table.ts:74`
  - `src/locales/components/comparison-table.ts:145`
  - `src/locales/components/pricing-table.ts:7`
  - `src/locales/components/pricing-table.ts:178`
  - `src/locales/components/pricing-table.ts:351`

**Description**: Comparison table 'Last updated: October 2023' (33 months stale); pricing table 'Last updated: October 2024' (20 months stale). Competitor and pricing data may be outdated.

**Recommendation**: Refresh data and timestamps or automate the last-updated date.

---

### LRF-020: Mastery Advantage animated graph has no ARIA label / live region

- **Severity**: High
- **Category**: Accessibility
- **Theme**: `missing-aria`
- **Batches**: batch-04
- **Related claims**: C-TC-03
- **Evidence**:
  - `src/components/marketing/mastery-advantage-graph.tsx:136`
  - `src/components/marketing/mastery-advantage-graph.tsx:268-275`

**Description**: The major animated SVG knowledge graph has no aria-label or role=img and its dynamic caption is not in an ARIA live region, making it invisible/unannounced to screen readers. prefers-reduced-motion is respected.

**Recommendation**: Add role=img + aria-label and a polite live region for captions.

---

### LRF-021: Hardcoded English strings not localized (systemic i18n gaps)

- **Severity**: High
- **Category**: i18n
- **Theme**: `hardcoded-strings`  _(systemic)_
- **Batches**: batch-01, batch-03, batch-04, batch-05
- **Related claims**: C-TC-02
- **Evidence**:
  - `src/app/[locale]/(marketing)/blog/page.tsx:44-45`
  - `src/app/[locale]/(marketing)/blog/page/[page]/page.tsx:54-59`
  - `src/app/[locale]/(marketing)/products/zhongwen-advantage/page.tsx:46-59`
  - `src/app/[locale]/(marketing)/products/zhongwen-advantage/page.tsx:61-79`
  - `src/app/[locale]/(marketing)/products/zhongwen-advantage/page.tsx:81-97`
  - `src/app/[locale]/(marketing)/products/zhongwen-advantage/page.tsx:331-338`
  - `src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx:149`
  - `src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx:154`
  - `src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx:159`
  - `src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx:369`
  - `src/components/blog/blog-breadcrumbs.tsx:12`
  - `src/components/blog/blog-breadcrumbs.tsx:18`
  - `src/components/marketing/mastery-advantage-graph.tsx:110-211`
  - `src/components/contact/contact-form.tsx:43`

**Description**: Extensive hardcoded English: blog listing/pagination descriptions and CTA text, Zhongwen interactive/educator/FAQ/learning sections, Tutor step titles and CEFR stat, blog breadcrumb labels, and Mastery graph captions/labels (also in data file). These do not translate for th/zh users.

**Recommendation**: Move all user-facing strings to locale keys for all 3 languages.

---

### LRF-022: Components branch only en/th with Chinese falling back to English

- **Severity**: High
- **Category**: i18n
- **Theme**: `missing-zh-locale`  _(systemic)_
- **Batches**: batch-05, batch-06
- **Related claims**: C-TC-02
- **Evidence**:
  - `src/components/blog/contact-cta.tsx:14-26`
  - `src/components/blog/product-cta.tsx:22-34`

**Description**: ContactCTA and ProductCTA use isThai ternary branching with no zh variant; Chinese visitors see English copy.

**Recommendation**: Replace with i18n keys covering en/th/zh.

---

### LRF-028: Blog library renders unsanitized HTML and lacks Zod frontmatter validation

- **Severity**: High
- **Category**: Security
- **Theme**: `xss-risk`
- **Batches**: batch-01, batch-10
- **Evidence**:
  - `src/lib/blog.ts:74`
  - `src/lib/blog.ts:35-67`
  - `src/app/[locale]/(marketing)/blog/[slug]/page.tsx:101`

**Description**: remarkHtml runs with sanitize:false and blog content is injected via dangerouslySetInnerHTML, an XSS vector if any post contains malicious HTML. Frontmatter uses manual validation instead of a Zod schema (per project convention).

**Recommendation**: Sanitize HTML output and validate frontmatter with Zod.

---

### LRF-029: Primary Advantage missing from navigation dropdown descriptions

- **Severity**: High
- **Category**: i18n
- **Theme**: `nav-coverage-gap`
- **Batches**: batch-10
- **Related claims**: C-MK-01
- **Evidence**:
  - `src/locales/components/common/navigation.ts:13-20`

**Description**: navigation locale itemsDescription lists 8 products; Primary Advantage has no description, so the nav dropdown cannot render its description. config/navigation.ts does include Primary, creating inconsistency.

**Recommendation**: Add Primary Advantage description to navigation locale for all 3 languages.

---

### LRF-013: "GPT-5" AI model claim is unverifiable / likely inaccurate

- **Severity**: Medium
- **Category**: Claims
- **Theme**: `unverifiable-ai-claim`  _(systemic)_
- **Batches**: batch-07, batch-09
- **Related claims**: C-TC-02, C-PA-02
- **Evidence**:
  - `src/locales/pages/home.ts:143`
  - `src/locales/pages/home.ts:303`
  - `src/locales/pages/home.ts:461`
  - `src/locales/pages/products/primary-advantage.ts:30`
  - `src/locales/pages/products/primary-advantage.ts:96`

**Description**: 'Google Gemini & GPT-5 AI' and 'Intelligent writing feedback with GPT-5' named in locales. GPT-5 not confirmed released; specific model naming cannot be verified and contradicts adapter abstraction.

**Recommendation**: Use provider-neutral wording ('leading language models') or confirm actual models with PO.

---

### LRF-015: Unverifiable marketing/statistical claims requiring research citation or PO confirmation

- **Severity**: Medium
- **Category**: Claims
- **Theme**: `unverifiable-claim`  _(systemic)_
- **Batches**: batch-01, batch-02, batch-05, batch-09
- **Related claims**: C-MA-02, C-MK-02, C-RA-04
- **Evidence**:
  - `src/app/[locale]/(marketing)/products/math-advantage/page.tsx:288`
  - `src/app/[locale]/(marketing)/products/math-advantage/page.tsx:297`
  - `src/app/[locale]/(marketing)/products/math-advantage/page.tsx:305`
  - `src/locales/components/products/b2b-solutions.ts:27`
  - `src/locales/components/products/b2b-solutions.ts:28`
  - `src/locales/pages/home.ts:14`
  - `src/locales/pages/home.ts:57-58`

**Description**: Claims such as '3x faster learning', '95% confidence boost', '24/7 AI support', '50% greater grammar gains', 'twice the vocabulary growth', '2,172+ mapped skills', and the 'Aka, 2019 +9.5 pts' citation cannot be verified from code and need research citations or PO confirmation.

**Recommendation**: Attach citations or qualify claims; verify with PO.

---

### LRF-016: Vietnamese named as a supported language but app supports only en/th/zh on site

- **Severity**: Medium
- **Category**: Claims
- **Theme**: `language-support-claim`  _(systemic)_
- **Batches**: batch-08, batch-10
- **Related claims**: C-TC-02, C-RA-02
- **Evidence**:
  - `src/locales/pages/products/reading-advantage.ts:59`
  - `src/locales/pages/products/reading-advantage.ts:252`
  - `src/locales/pages/products/reading-advantage.ts:445`
  - `src/locales/components/comparison-table.ts:63`
  - `src/locales/components/pricing-table.ts:57`

**Description**: Marketing copy claims 'English, Thai, Chinese, Vietnamese' support and ELL support for Vietnamese. The www site supports only en/th/zh. (Note: the RA app itself reportedly has a vi locale per batch-02/10 cross-reference — verify scope of the claim.)

**Recommendation**: Verify actual app language support and align copy.

---

### LRF-018: Persistent 'coming-soon' pricing features with no launch dates

- **Severity**: Medium
- **Category**: Claims
- **Theme**: `coming-soon-features`
- **Batches**: batch-05, batch-10
- **Related claims**: C-RA-05
- **Evidence**:
  - `src/locales/components/pricing-table.ts:123-163`

**Description**: Pricing matrix rows 18-24 (gamification, parent portal, AI quizzes, personalized paths, AI analytics, AI content, virtual AI writing tutor) are marked 'coming-soon' across tiers with no launch dates and have persisted across releases.

**Recommendation**: Confirm roadmap delivery status with PO; add dates or remove.

---

### LRF-019: 'ZERO RISK' absolute claim on Managed Service (legal exposure)

- **Severity**: Medium
- **Category**: Legal
- **Theme**: `absolute-claim`
- **Batches**: batch-08
- **Related claims**: C-SV-02
- **Evidence**:
  - `src/locales/pages/managed-service.ts:11`
  - `src/locales/pages/managed-service.ts:76`
  - `src/locales/pages/managed-service.ts:140`

**Description**: 'ZERO RISK' / 'ความเสี่ยงเป็นศูนย์' / '零风险' is an absolute claim that may be legally problematic.

**Recommendation**: Use 'MINIMAL RISK' or 'RISK-MITIGATED'.

---

### LRF-023: Sheet close button sr-only label hardcoded English

- **Severity**: Medium
- **Category**: i18n
- **Theme**: `hardcoded-strings`
- **Batches**: batch-06
- **Related claims**: C-TC-02
- **Evidence**:
  - `src/components/ui/sheet.tsx:69`

**Description**: <span className="sr-only">Close</span> is hardcoded English; screen-reader users in all locales hear 'Close'.

**Recommendation**: Use a locale key for the accessible close label.

---

### LRF-024: Thai translation typos in services and managed-service locales

- **Severity**: Medium
- **Category**: i18n
- **Theme**: `translation-quality`
- **Batches**: batch-08
- **Related claims**: C-TC-02
- **Evidence**:
  - `src/locales/pages/services.ts:88`
  - `src/locales/pages/services.ts:114`
  - `src/locales/pages/services.ts:116`
  - `src/locales/pages/services.ts:119`
  - `src/locales/pages/managed-service.ts:106`
  - `src/locales/pages/managed-service.ts:107`
  - `src/locales/pages/managed-service.ts:109`

**Description**: Garbled/duplicated Thai: 'ยืดหยบ่ท์' (should be ยืดหยุ่น), 'แผนกวาน' (should be แผนก), 'วัสดุปครบถ้วน' (should be วัสดุครบถ้วน), 'แดชบอร์ดีตาลละเอียด', duplicated 'อย่างสม่ำเสมออย่างสม่ำเสมอ', 'ผู้ปกคุม' (should be ผู้ปกครอง). Likely unproofed AI translations.

**Recommendation**: Native-speaker proofread Thai locales and add review to translation pipeline.

---

### LRF-025: Accessibility gaps in interactive UI components

- **Severity**: Medium
- **Category**: Accessibility
- **Theme**: `a11y-gaps`  _(systemic)_
- **Batches**: batch-05, batch-06
- **Related claims**: C-TC-03
- **Evidence**:
  - `src/components/blog/table-of-contents.tsx:53`
  - `src/components/ui/faq-accordion.tsx:78-87`
  - `src/components/ui/horizontal-strip.tsx:34`
  - `src/components/pricing/pricing-table.tsx:189`
  - `src/components/pricing/pricing-table.tsx:198`
  - `src/components/pricing/pricing-table.tsx:208`
  - `src/components/features/comparison-table.tsx:25`
  - `src/components/blog/blog-pagination.tsx:70-76`

**Description**: TOC desktop nav lacks distinctive aria-label; FAQ accordion panel lacks role/aria-labelledby association; horizontal-strip hides scrollbar (undiscoverable scroll); pricing checkmarks are empty spans with no accessible label; comparison table marks announce literally; disabled pagination links use href=# (tab+Enter navigates to #).

**Recommendation**: Add aria-labels/associations, accessible text for icons, and render disabled links as spans.

---

### LRF-026: Hardcoded contact details and inconsistent email addresses

- **Severity**: Medium
- **Category**: Code Quality
- **Theme**: `hardcoded-contact`  _(systemic)_
- **Batches**: batch-01, batch-03, batch-04
- **Related claims**: C-TC-03
- **Evidence**:
  - `src/app/[locale]/(marketing)/contact/page.tsx:30`
  - `src/app/[locale]/(marketing)/contact/page.tsx:62`
  - `src/app/[locale]/(marketing)/contact/page.tsx:79`
  - `src/app/[locale]/(marketing)/contact/page.tsx:163`
  - `src/app/[locale]/(marketing)/contact/page.tsx:185`
  - `src/components/common/footer.tsx:73`
  - `src/components/common/footer.tsx:74`
  - `src/components/common/footer.tsx:77`
  - `src/components/common/footer.tsx:84`
  - `src/components/contact/contact-form.tsx:43`

**Description**: Email, phone, TikTok handle, and LINE QR alt text hardcoded in contact page and footer. Two different support emails are used: footer/contact 'support@reading-advantage.com' vs contact form 'contact@readingadvantage.com'.

**Recommendation**: Centralize contact details in locale/config and unify the email address.

---

### LRF-027: Pricing/B2B locale uses fragile numeric/order-dependent keys and 'as never' casts

- **Severity**: Medium
- **Category**: Code Quality
- **Theme**: `fragile-locale-keys`  _(systemic)_
- **Batches**: batch-01, batch-03, batch-05
- **Evidence**:
  - `src/components/pricing/pricing-table.tsx:15-166`
  - `src/components/products/b2b-solutions.tsx:140-144`
  - `src/app/[locale]/(marketing)/services/page.tsx:17-27`
  - `src/app/[locale]/(marketing)/features/page.tsx:25`

**Description**: Pricing features keyed by numeric indices 0-24; b2b-solutions and services pages use 'as never' casts to bypass type checking; features page uses a fragile IndexRange union that must match locale length.

**Recommendation**: Use named, typed locale keys.

---

### LRF-030: Services pages unreachable from header/primary navigation

- **Severity**: Medium
- **Category**: Conversion
- **Theme**: `nav-discoverability`
- **Batches**: batch-09, batch-10
- **Related claims**: C-SV-01, C-SV-02
- **Evidence**:
  - `src/locales/components/common/header.ts:1-45`
  - `src/config/navigation.ts:1-82`

**Description**: Three service pages exist (/services, /services/blended-learning, /services/managed-service) but no header/primary nav link reaches them; only discoverable via footer or direct URL.

**Recommendation**: Add a Services entry to primary navigation.

---

### LRF-031: Pricing hardcoded in mailto links and marketing stats hardcoded in components

- **Severity**: Medium
- **Category**: Code Quality
- **Theme**: `hardcoded-content`  _(systemic)_
- **Batches**: batch-02
- **Related claims**: C-PA-02, C-MA-02
- **Evidence**:
  - `src/app/[locale]/(marketing)/products/primary-advantage/page.tsx:111`
  - `src/app/[locale]/(marketing)/products/primary-advantage/page.tsx:359`
  - `src/app/[locale]/(marketing)/products/math-advantage/page.tsx:288`
  - `src/app/[locale]/(marketing)/products/math-advantage/page.tsx:297`
  - `src/app/[locale]/(marketing)/products/math-advantage/page.tsx:305`

**Description**: Primary Advantage encodes '100 baht per student per month' and free pilot offer in mailto bodies; Math Advantage hardcodes '3x', '95%', '24/7' stats in the component rather than locale.

**Recommendation**: Move pricing/stats into locale data.

---

### LRF-032: Duplicate/parallel locale-aware Link implementations

- **Severity**: Medium
- **Category**: Code Quality
- **Theme**: `duplicate-implementation`
- **Batches**: batch-04, batch-07
- **Evidence**:
  - `src/components/common/localized-link.tsx:1-46`
  - `src/locales/navigation.ts:1-27`

**Description**: LocalizedLink duplicates the Link from @/locales/navigation. Two parallel locale-aware link components risk inconsistent routing behavior.

**Recommendation**: Consolidate on a single locale-aware Link.

---

### LRF-036: Hardcoded non-locale-aware page titles

- **Severity**: Medium
- **Category**: SEO
- **Theme**: `non-locale-metadata`  _(systemic)_
- **Batches**: batch-01, batch-03
- **Related claims**: C-TC-03
- **Evidence**:
  - `src/app/[locale]/(marketing)/about/page.tsx:9-22`
  - `src/app/[locale]/(marketing)/features/page.tsx:10-23`
  - `src/app/[locale]/(marketing)/pricing/page.tsx:9-22`
  - `src/app/[locale]/layout.tsx:7-19`
  - `src/app/[locale]/(marketing)/products/reading-advantage/layout.tsx:3-11`
  - `src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx:24`
  - `src/app/[locale]/(marketing)/products/zhongwen-advantage/page.tsx:82`

**Description**: Several metadata titles are hardcoded English (e.g., 'About Us - Reading Advantage (Thailand)', 'Features - Reading Advantage Thailand'); th/zh users see English titles. Many pages also lack metadataBase, hreflang, and canonical tags. Pricing title says 'Feature Matrix' (SEO mismatch).

**Recommendation**: Use locale-aware metadata with metadataBase, hreflang, and canonical.

---

### LRF-043: Skipped homepage test and duplicate Primary Advantage test files

- **Severity**: Medium
- **Category**: Code Quality
- **Theme**: `test-hygiene`
- **Batches**: batch-01, batch-02
- **Evidence**:
  - `src/app/[locale]/(marketing)/(home)/page.test.tsx.skip`
  - `src/app/[locale]/(marketing)/products/primary-advantage/page.test.tsx`
  - `src/app/[locale]/(marketing)/products/primary-advantage/page.test.tsx.skip`

**Description**: Homepage test is skipped (.skip) and Primary Advantage has both an active test and a duplicate skipped test. Product page tests are shallow (4 DOM-presence selectors).

**Recommendation**: Unskip/fix homepage test, remove the duplicate, and deepen product page assertions.

---

### LRF-033: navigation.ts locale derivation/locale-change lacks robustness

- **Severity**: Low
- **Category**: Code Quality
- **Theme**: `fragile-locale-detection`
- **Batches**: batch-07
- **Evidence**:
  - `src/locales/navigation.ts:13`
  - `src/locales/navigation.ts:24-26`

**Description**: useCurrentLocale derives locale via pathname.split('/')[1] (fragile); useChangeLocale calls router.replace without validating the locale against routing.locales.

**Recommendation**: Use next-intl detection and validate locale values.

---

### LRF-034: Mastery Advantage graph omits CodeCamp domain (8 of 9 products)

- **Severity**: Low
- **Category**: Claims
- **Theme**: `product-count-overstatement`
- **Batches**: batch-04
- **Related claims**: C-MK-01
- **Evidence**:
  - `src/components/marketing/mastery-advantage-graph.tsx:130`
  - `src/components/marketing/mastery-advantage-graph-data.ts:166`

**Description**: Animated graph cycles 8 domains (reading, primary, storytime, math, science, stem, zhongwen, tutor); CodeCamp is absent, contradicting the 9-products narrative.

**Recommendation**: Reconcile graph domains with marketed product set.

---

### LRF-035: Image filename contains a space character

- **Severity**: Low
- **Category**: Assets
- **Theme**: `asset-naming`
- **Batches**: batch-05
- **Evidence**:
  - `src/components/products/b2b-solutions.tsx:61`

**Description**: src="/primary-advantage logo.png" contains a space; may cause URL-encoding issues in some CDN/proxy/build contexts.

**Recommendation**: Rename asset to kebab-case without spaces.

---

### LRF-037: Reused alt text across distinct images on About page

- **Severity**: Low
- **Category**: Accessibility
- **Theme**: `alt-text`
- **Batches**: batch-01
- **Related claims**: C-TC-03
- **Evidence**:
  - `src/app/[locale]/(marketing)/about/page.tsx:76`

**Description**: altText.team key reused for two different images (about-team.jpg and teacher-at-board.png).

**Recommendation**: Provide distinct alt text per image.

---

### LRF-038: MarketingSvg server component uses synchronous fs and lacks error fallback

- **Severity**: Low
- **Category**: Performance
- **Theme**: `render-perf`
- **Batches**: batch-04
- **Evidence**:
  - `src/components/marketing/marketing-svg.tsx:20`
  - `src/components/marketing/marketing-svg.tsx:25-31`

**Description**: fs.existsSync at render time; <object> tag has no fallback content if SVG fails to load. zh locale has no SVG variant (uses default).

**Recommendation**: Cache/move to build-time and add fallback content.

---

### LRF-039: Global button hover transform causes minor layout shift

- **Severity**: Low
- **Category**: Performance
- **Theme**: `layout-shift`
- **Batches**: batch-06
- **Evidence**:
  - `src/components/ui/button.tsx:8`

**Description**: hover:-translate-y-1 hover:shadow-lg applied to every button variant produces a 1px hover shift cumulatively across the UI.

**Recommendation**: Scope the hover effect or use transform that doesn't reflow.

---

### LRF-040: FAQ accordion uses max-h transition (animation clipping/stutter)

- **Severity**: Low
- **Category**: Code Quality
- **Theme**: `animation-antipattern`
- **Batches**: batch-06
- **Evidence**:
  - `src/components/ui/faq-accordion.tsx:80-82`

**Description**: max-h-96 transition clips content taller than 24rem and delays collapse for shorter content.

**Recommendation**: Use grid-template-rows 0fr/1fr or measured height animation.

---

### LRF-041: Locale-switcher leftover commented code and arbitrary style values

- **Severity**: Low
- **Category**: Code Quality
- **Theme**: `cleanup`
- **Batches**: batch-10
- **Evidence**:
  - `src/switcher/locale-switcher.tsx:18`
  - `src/switcher/locale-switcher.tsx:34`
  - `src/switcher/locale-switcher.tsx:35`

**Description**: Commented-out '{ preserveSearchParams: true }', arbitrary w-[100px] and focus:ring-[rgb(20,110,245)] values rather than theme tokens.

**Recommendation**: Remove dead code and use theme tokens.

---

### LRF-042: Footer copyright uses HTML entity that may render literally

- **Severity**: Low
- **Category**: Code Quality
- **Theme**: `html-entity-risk`
- **Batches**: batch-10
- **Evidence**:
  - `src/locales/components/common/footer.ts:20`

**Description**: &copy; embedded in a locale string; if the consumer HTML-escapes output the entity will display literally. {year} template handled correctly.

**Recommendation**: Use the © character or ensure consumer renders entity correctly.

---

### LRF-044: Work-in-progress comment and fragile string manipulation in product pages

- **Severity**: Low
- **Category**: Code Quality
- **Theme**: `cleanup`
- **Batches**: batch-02
- **Evidence**:
  - `src/app/[locale]/(marketing)/products/math-advantage/page.tsx:78`
  - `src/app/[locale]/(marketing)/products/science-advantage/page.tsx:270`

**Description**: Math Advantage has a '/* Hero Section — Already done, keep as-is */' WIP comment; Science Advantage uses point.replace(/^[\u2713\u2022]\s*/, '') fragile bullet stripping.

**Recommendation**: Remove WIP comments; avoid fragile locale text manipulation.

---
