# Batch-09 Evidence: Product Page Locales + Header Locale

> Track: `www_reading_advantage_review_20260626`
> Reviewed: 2026-06-27
> Files: 9 | Lines: 1,950

---

## File 1: Primary Advantage Locale — `src/locales/pages/products/primary-advantage.ts` (419 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-PA-01 | "Developmentally appropriate extensive reading application designed specifically for grades 3-6, built on CEFR-aligned curriculum" — hero description | Line 5 | `[NEEDS-PO]` |
| C-PA-01 | "Cambridge Young Learners vocabulary from Pre-A1 to A2" + "Cambridge for Schools vocabulary up to B1 (PET)" | Lines 13-14 | `[NEEDS-PO]` Specific exam board claims need product owner confirmation |
| C-PA-02 | "Personalized 1-on-1 tutoring with Google Gemini" + "Intelligent writing feedback with GPT-5" | Lines 29-30 | **GPT-5 not released** (as of June 2026). Claiming GPT-5 is speculative. Similar claim appears in RA locale (batch-08). |
| C-PA-02 | "Evidence-Based Methodology" — "+9.5 pts", "85% Weekly Active Usage", "100% Curriculum Alignment" | Lines 103-117 | **Stats identical to Reading Advantage locale** (batch-08). The "Aka, 2019" citation (line 107) refers to a general extensive reading study, not Primary Advantage specifically. Using identical values for both products is misleading. |
| C-PA-02 | "Multi-Language Support" — "Available in English, Thai, and Chinese" | Line 69 | `[PASS]` App has en, th, zh locales. |
| C-PA-03 | Grade claim: "Grades 3-6" | Lines 2, 4, 5, 15 | `[UNKNOWN]` |

### i18n

- All 3 locale exports present: en (lines 1-139), th (lines 141-279), zh (lines 281-419) ✓
- Key structure matches en ↔ th ↔ zh (same keys, same nesting) ✓
- `support` key at line 59 (en) / 199 (th) / 339 (zh) — single word, seems orphaned outside any section

### Key Observations

- The stat block (resultsSection) is a direct copy of Reading Advantage's stats — same values, same study citation. If this is intentional (same research applies to both products), the copy is fine; if Primary has its own efficacy data, it should be different.
- The adaptiveEngine block (lines 127-138) references Mastery Advantage — consistent cross-product branding.

---

## File 2: Science Advantage Locale — `src/locales/pages/products/science-advantage.ts` (395 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-SA-01 | "NGSS-Aligned K-12 Science Education Platform" | Lines 4, 9 | `[UNKNOWN]` Cannot verify NGSS alignment |
| C-SA-01 | "Early Access" badge | Line 12 | `[PASS]` Consistent with product status from page components |
| C-SA-01 | "Interactive science learning with adaptive AI recommendations, real-time progress tracking, and teacher intervention tools" | Line 11 | `[UNKNOWN]` Cannot verify from code |
| C-SA-02 | "Full coverage of Next Generation Science Standards with structured lessons and assessments" | Line 24 | `[UNKNOWN]` |
| C-SA-01 | "Enter a 6-character code to join your teacher's class" | Line 42 | `[UNKNOWN]` No Science Advantage app exists at `apps/science-advantage/` — feature claim unverifiable |
| C-SA-02 | "XP, levels, streaks, and badges gamify your learning journey" | Line 50 | `[UNKNOWN]` |

### i18n

- Metadata block present in en (lines 2-5), th (lines 135-138), zh (lines 268-271) — NOTE: this is locale data for page metadata, not the actual page metadata export. Good consistency.
- All 3 locales present, keys match structure ✓

### Key Observations

- The `hero.badge: "Early Access"` (line 12) is consistent with the product not being fully launched.
- No launch date mentioned in this locale file itself (note: B2B solutions locale in batch-10 says "Coming early 2026" — past due).
- The teacherFeatures block (lines 58-78) makes specific claims about teacher-facing functionality that would need app verification.

---

## File 3: CodeCamp Advantage Locale — `src/locales/pages/products/codecamp-advantage.ts` (386 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-CC-01 | "Full-Stack Web Development Internship" — hero subtitle | Line 3 | `[PASS]` CodeCamp is a web dev bootcamp |
| C-CC-01 | "An intensive 18-module bootcamp covering modern web development from fundamentals to production deployment" | Line 5 | `[UNKNOWN]` Curriculum details |
| C-CC-01 | "Now Enrolling" badge | Line 6 | `[UNKNOWN]` Needs PO to confirm active enrollment |
| C-CC-01 | "Active Bootcamp" status | Line 7 | `[UNKNOWN]` |
| C-CC-02 | "GitHub Integration" — "Fork-based exercise workflow with automated PR review via OpenRouter" | Lines 88-91 | `[UNKNOWN]` Cannot verify OpenRouter integration |
| C-CC-02 | Curriculum modules: "Next.js 16", "TypeScript", "Vitest", "tRPC & Server Actions", "AI Integration" | Lines 29-64 | `[UNKNOWN]` Specific tech stack claims |
| C-CC-02 | Portfolio projects: "Personal Portfolio Website", "Learning Dashboard", "Student Progress Tracker", "Full-Stack Production App" | Lines 69-73 | `[UNKNOWN]` |

### i18n

- All 3 locales present ✓
- Key structure identical across all 3 languages ✓
- Tech terms (Next.js, TypeScript, Vitest, tRPC, Docker) correctly remain untranslated ✓

### Key Observations

- Very detailed curriculum breakdown (18 modules across 4 phases) — this is the most specific product description in the site. Accuracy is critical.
- The module list includes "Next.js 16" (line 39, 168, 297) — Next.js 16 is current, correct naming.

---

## File 4: Math Advantage Locale — `src/locales/pages/products/math-advantage.ts` (275 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-MA-01 | "Coming in 2026" | Line 6 | `[PASS]` Current year, timeframe still valid |
| C-MA-01 | "Designed for grades 7-12" | Line 5 | `[UNKNOWN]` |
| C-MA-01 | "Customized practice problems matching your skill level" | Line 21 | `[UNKNOWN]` |
| C-MA-02 | '"I do, We do, You do" teaching method' | Line 29 | `[UNKNOWN]` |
| C-MA-02 | Subject coverage: "Arithmetic, Algebra, Geometry, Trigonometry, Calculus, Statistics" | Line 45 | `[UNKNOWN]` |

### i18n

- All 3 locales present ✓
- Note: `icon` fields in `benefits.reasons` (lines 51-69 en, 142-161 th, 233-254 zh) are emoji strings — these are locale data, which means the icons could be customized per language. Current all use same emoji ✓

### Key Observations

- Benefits section uses emoji icons in locale data — unconventional but allows per-locale icon customization.
- The `statsBenefits` key (line 12-15) defines "Faster Learning", "Confidence Boost", "AI Support" — short marketing labels, no specific numeric claims.
- No "launching in 2025" date issue (unlike STEM/Storytime/Tutor) — "Coming in 2026" is still valid in June 2026.

---

## File 5: STEM Advantage Locale — `src/locales/pages/products/stem-advantage.ts` (356 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-STEM-01 | **"Coming in 2025"** | Line 10 | **`[FAIL]` Past due by ~18 months** |
| C-STEM-01 | "Comprehensive K-12 Coding Education" — hero title | Line 7 | `[UNKNOWN]` No app at `apps/stem-advantage/` |
| C-STEM-01 | "75% Coding + 25% STEM Integration" | Lines 8, 114 | `[UNKNOWN]` Specific ratio claim |
| C-STEM-01 | "180-day learning path" | Line 22 | `[UNKNOWN]` |
| C-STEM-01 | Grade breakdown: "Grades 3-5", "6-8", "9-12" | Lines 47-57 | `[UNKNOWN]` |

### i18n

- All 3 locales present ✓
- Technical terms preserved across locales ✓
- Metadata block present in en (lines 2-4), th (lines 121-123), zh (lines 240-242)

### Key Observations

- "Coming in 2025" is the stale claim. B2B solutions locale (batch-10) says "Coming mid 2027" — the dates are inconsistent between locale files. The STEM product page uses the locale from stem-advantage.ts, not from b2b-solutions.ts.

---

## File 6: Storytime Advantage Locale — `src/locales/pages/products/storytime-advantage.ts` (323 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-ST-01 | **"Coming in 2025"** | Line 10 | **`[FAIL]` Past due by ~18 months** |
| C-ST-01 | "Complete K-3 Literacy Curriculum" | Lines 8-9 | `[UNKNOWN]` No app at `apps/storytime-advantage/` |
| C-ST-01 | "180-Day Structure" aligned with educational standards | Line 18-19 | `[UNKNOWN]` |
| C-ST-01 | "Digital Components": "Interactive phonics lessons", "Digital decodable texts", "Progress tracking tools" | Lines 36-39 | `[UNKNOWN]` |
| C-ST-01 | "Physical Materials": "Printable worksheets", "Hands-on activities", "Take-home resources" | Lines 45-48 | `[UNKNOWN]` Implies a blended physical+digital curriculum |
| C-ST-01 | FAQ: "Storytime Advantage will be accessible on any modern web browser, with mobile apps available for iOS and Android tablets" | Lines 82-83 | `[UNKNOWN]` |

### i18n

- All 3 locales present ✓
- FAQ content fully translated in all 3 languages ✓
- Teacher tools icons are emoji in locale data (👥, 📝, 📊) — same across all locales ✓

### Key Observations

- "Coming in 2025" date issue. B2B locale says "Coming early 2027" — conflict.
- Metadata description in th (line 112) says "เปิดตัวในปี 2025" / zh (line 220) "2025 年推出" — also stale.
- The mix of "Digital Components" and "Physical Materials" claims suggests a blended learning product.

---

## File 7: Tutor Advantage Locale — `src/locales/pages/products/tutor-advantage.ts` (272 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-TA-01 | **"Coming in 2025"** | Line 10 | **`[FAIL]` Past due by ~18 months** |
| C-TA-01 | "AI-Powered English tutoring platform launching in Thailand in 2025" | Line 4 | **`[FAIL]` Past due** |
| C-TA-01 | "Combining AI technology with personalized instruction for unprecedented learning outcomes" | Line 9 | `[UNKNOWN]` Marketing claim |
| C-TA-02 | "Professional Tutor Network" — "Qualified and certified tutors", "Ongoing professional development", "Standardized quality control" | Lines 36-41 | `[UNKNOWN]` |
| C-TA-02 | "Platform Features": "Interactive Lessons", "Translation Assistance", "Vocabulary Tools", "Progress Tracking", "Student Dashboard", "Multi-Platform Access" | Lines 48-55 | `[UNKNOWN]` |

### i18n

- All 3 locales present ✓
- Icon emoji in trustSignals: 🔬 (research), 🤝 (ethics), 💎 (quality) — consistent ✓

### Key Observations

- "Coming in 2025" stale — needs updating across all 3 locales.
- Tutor Advantage is described both as an AI tutoring platform AND a human tutor network — two different value props that may require clarification.
- All "launching" dates in product locales need systematic review.

---

## File 8: Zhongwen Advantage Locale — `src/locales/pages/products/zhongwen-advantage.ts` (201 lines)

### Claims Accuracy

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C-ZA-01 | "Coming Soon" badge | Line 7 | `[PASS]` Consistent with no launch date |
| C-ZA-01 | "HSK standards" alignment — "Maps to HSK 1-3" / "Maps to HSK 4-6" | Lines 28-29 | `[UNKNOWN]` |
| C-ZA-01 | "Extensive reading library", "AI-powered tutoring", "Cultural immersion content" | Lines 36-38 | `[UNKNOWN]` |
| C-ZA-01 | "Interactive learning system combines cutting-edge technology with proven pedagogical methods" | Line 43 | `[UNKNOWN]` Marketing language |

### i18n

- All 3 locales present ✓
- Note: The `levelMapping.levelLabel` key (line 27) uses `{level}` template — correct i18n pattern ✓
- `waitlist` section with `emailPlaceholder` and `subscribe` — lead capture ready ✓

### Key Observations

- Only product locale with NO "Coming in 20XX" date — just "Coming Soon". Most honest/least stale of the upcoming products.
- HSK 1-6 mapping claim (lines 28-29) is a specific claim about exam alignment.
- Smallest locale file in batch-09 (201 lines) — suggests the product page has less content than others.

---

## File 9: Header Locale — `src/locales/components/common/header.ts` (45 lines)

### Claims Accuracy

- Navigation links: Products, Features, Pricing, Blog, About, Contact — no navigation verifiable claims.
- Brand name: "Reading Advantage Thailand" — consistent.

### i18n

- All 3 locales present ✓
- Navigation text fully translated ✓
- href values are NOT locale-prefixed (e.g., `/products` not `/${locale}/products`) — this is expected if the localized-link component adds locale prefix internally.

### Key Observations

- **No "Services" entry in main nav**, even though service pages exist at `/services`, `/services/blended-learning`, `/services/managed-service`. This is a potential discoverability/conversion gap.
- Only 6 top-level nav items — clean and focused.
- `navigationMenu` (line 10) and `navigationDescription` (line 11) are ARIA labels — good accessibility practice.
- `openMenu` key (line 13) for mobile menu toggle button — present in all 3 locales ✓.

---

## Batch-09 Cross-Cutting Findings

### Critical Findings

1. **Three products have stale "Coming in 2025" dates**: STEM Advantage (line 10), Storytime Advantage (line 10), Tutor Advantage (line 10). Current date is June 2026. Dates are stale in ALL three locale languages.
2. **Primary Advantage copied Reading Advantage stats**: The "+9.5 pts", "85%", "100%" stats with "Aka, 2019" citation are identical to Reading Advantage (batch-08). Either this is intentional (same underlying research) or misleading (distinct product-specific data expected).

### High Findings

1. **GPT-5 claim in Primary Advantage** (line 30, 96): GPT-5 has not been released. Claiming it as a current powering model is inaccurate.
2. **Cross-product launch date inconsistency**: STEM Advantage locale says "Coming in 2025" but B2B solutions locale (batch-10) says "Coming mid 2027". Storytime says "Coming in 2025" vs "Coming early 2027". Dates need systematic reconciliation.
3. **Header lacks "Services" nav entry**: Three service pages exist (/services, /services/blended-learning, /services/managed-service) but no header nav link reaches them. Only discoverable via footer or direct URL.

### Medium Findings

1. **Primary Advantage `support` key** (line 59): Orphaned key fragment outside any section. Appears in all 3 locales.
2. **Header nav: 6 items but no Services link** — intentional or gap?

### i18n Findings

- All 9 files have complete en/th/zh triples ✓
- No translation gaps detected in batch-09
- Key structures are consistent across all 3 languages for all files

### Summary: Batch-09 Findings

| Severity | Count | Categories |
|----------|-------|------------|
| Critical | 2 | Stale launch dates (3 products), duplicated efficacy stats |
| High | 3 | GPT-5 unreleased claim, cross-file date inconsistency, missing Services in nav |
| Medium | 1 | Orphaned `support` key |

### Claims Matrix Updates Needed

- C-PA-01: `[FAIL]` GPT-5 claim inaccurate; efficacy stats duplicated from RA
- C-PA-02: `[UNKNOWN]` Most claims need PO verification
- C-PA-03: `[UNKNOWN]` Grade claims
- C-SA-01: `[FAIL]` "Coming in 2025" stale (via cross-reference with B2B locale)
- C-SA-02: `[UNKNOWN]` NGSS alignment
- C-CC-01: `[NEEDS-PO]` "Now Enrolling" enrollment status
- C-CC-02: `[UNKNOWN]` Specific tech stack and OpenRouter claims
- C-MA-01: `[PASS]` "Coming in 2026" still valid (current year)
- C-MA-02: `[UNKNOWN]` Teaching method and subject coverage claims
- C-STEM-01: `[FAIL]` "Coming in 2025" past due 18 months
- C-ST-01: `[FAIL]` "Coming in 2025" past due 18 months; B2B says "early 2027"
- C-TA-01: `[FAIL]` "Coming in 2025" past due 18 months
- C-TA-02: `[UNKNOWN]` Tutor network and platform features
- C-ZA-01: `[PASS]` "Coming Soon" is honest and current
