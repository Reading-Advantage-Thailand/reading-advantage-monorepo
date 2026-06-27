# Claims Matrix: www-reading-advantage

> Track: `www_reading_advantage_review_20260626`
> Generated: 2026-06-27
> Updated: 2026-06-27 (line-review synthesis)
> See also: `findings.md`, `line-review/line-review-findings.md`, and `line-review/lrf-extracted.json`.
>
> **Status**: Statuses below are derived from the line-review batch evidence (`line-review/evidence/batch-01..10/evidence.md`). This is a **review-only** synthesis — **no source code remediation was performed**. Staleness is judged against the review date **2026-06-27**. Claims requiring cross-app or product-owner confirmation are marked `[NEEDS-PO]` or `[UNKNOWN]`.

---

## Status Definitions

| Status | Meaning |
|--------|---------|
| `[PASS]` | Claim verified accurate from available evidence |
| `[FAIL]` | Claim inaccurate, misleading, stale, or broken |
| `[UNKNOWN]` | Could not be verified from marketing-site code alone |
| `[NEEDS-PO]` | Requires product-owner confirmation |
| `[N/A]` | Not applicable |

---

## Product Claims

### Reading Advantage

| # | Claim | Location | Status | Evidence |
|---|-------|----------|--------|----------|
| C-RA-01 | Product description / USP; "Starting May 2026 Blended Learning" | reading-advantage page + locale | `[FAIL]` | LRF-003, LRF-007; reading-advantage.ts:5-6; batch-02, batch-08 |
| C-RA-02 | Feature list (games, multi-language) | product page features | `[PASS]` (games/locales) / `[NEEDS-PO]` (competitive features) | batch-02 (games verified); LRF-015, LRF-016 |
| C-RA-03 | Screenshots/demo match current UI | product page media | `[PASS]` | batch-02 (images exist) |
| C-RA-04 | Target audience / "2,172+ mapped skills" | page + locales | `[UNKNOWN]` / `[NEEDS-PO]` | LRF-015; home.ts:14 |
| C-RA-05 | Pricing / availability currency | pricing page + locale | `[FAIL]` (stale Oct-2024 timestamp) / `[NEEDS-PO]` (figures) | LRF-017, LRF-018; pricing-table.ts:7 |

### Primary Advantage

| # | Claim | Location | Status | Evidence |
|---|-------|----------|--------|----------|
| C-PA-01 | Product description; no SEO metadata; "New for SY2025" badge | product page + b2b locale | `[FAIL]` | LRF-006, LRF-004; b2b-solutions.ts:12 |
| C-PA-02 | Feature accuracy; GPT-5; duplicated efficacy stats; hardcoded pricing | product page + locale | `[FAIL]` (GPT-5, duplicated stats) / `[NEEDS-PO]` | LRF-013, LRF-014, LRF-031 |
| C-PA-03 | Age/grade claims (3-6) | product page | `[UNKNOWN]` | batch-09 |

### Science Advantage

| # | Claim | Location | Status | Evidence |
|---|-------|----------|--------|----------|
| C-SA-01 | Product description; "Launching in 2025"; broken waitlist form | product page + locale | `[FAIL]` | LRF-002, LRF-008, LRF-004 |
| C-SA-02 | NGSS curriculum alignment | product page | `[UNKNOWN]` | batch-02, batch-09 |

### CodeCamp Advantage

| # | Claim | Location | Status | Evidence |
|---|-------|----------|--------|----------|
| C-CC-01 | Product description; "Launching in 2025"; missing logo asset | product page | `[FAIL]` (dateline) / `[NEEDS-PO]` (enrollment) | LRF-002; batch-02, batch-09 |
| C-CC-02 | Coding tracks / tech stack / OpenRouter integration | product page + locale | `[UNKNOWN]` | batch-09; LRF-015 |

### Math Advantage

| # | Claim | Location | Status | Evidence |
|---|-------|----------|--------|----------|
| C-MA-01 | Product description; "Launching in 2025" (page) vs "Coming in 2026" (locale) | product page + locale | `[FAIL]` (page OG stale) | LRF-002; batch-02 vs batch-09 |
| C-MA-02 | "3x faster", "95%", "24/7" stats; subject coverage | product page | `[FAIL]` (unverifiable, hardcoded) | LRF-015, LRF-031 |

### STEM Advantage

| # | Claim | Location | Status | Evidence |
|---|-------|----------|--------|----------|
| C-STEM-01 | Product description; "Coming in 2025" vs "mid 2027" (b2b) | product page + locales | `[FAIL]` | LRF-002, LRF-004 |

### Storytime Advantage

| # | Claim | Location | Status | Evidence |
|---|-------|----------|--------|----------|
| C-ST-01 | Product description; "Coming in 2025" vs "early 2027" (b2b) | product page + locales | `[FAIL]` | LRF-002, LRF-004 |

### Tutor Advantage

| # | Claim | Location | Status | Evidence |
|---|-------|----------|--------|----------|
| C-TA-01 | Product description; page/images exist | product page | `[PASS]` (page) | batch-03 |
| C-TA-02 | "Launching in 2025"; hardcoded step titles/CEFR; 48h SLA | product page + locale | `[FAIL]` (dateline) / `[NEEDS-PO]` (SLA) | LRF-002, LRF-021 |

### Zhongwen (Chinese) Advantage

| # | Claim | Location | Status | Evidence |
|---|-------|----------|--------|----------|
| C-ZA-01 | "Coming Soon" (honest) but FAQ "early 2025"; broken waitlist; hardcoded English | product page + locale | `[FAIL]` | LRF-002, LRF-008, LRF-021 |

### Mastery Advantage

| # | Claim | Location | Status | Evidence |
|---|-------|----------|--------|----------|
| C-MV-01 | Spaced repetition (FSRS) claims | mastery page + locale | `[NEEDS-PO]` | batch-01, batch-08 |
| C-MV-02 | Knowledge-state tracking (KST) | mastery page + locale | `[NEEDS-PO]` | batch-01, batch-08 |
| C-MV-03 | Graph/data visualization present; "nine products" / CodeCamp omitted | mastery page + graph | `[PASS]` (visuals) / `[FAIL]` (9-products, no ARIA) | LRF-001, LRF-020, LRF-034 |

---

## Marketing Claims

| # | Claim | Location | Status | Evidence |
|---|-------|----------|--------|----------|
| C-MK-01 | "One engine, nine products" superlative/count | homepage, mastery, locales | `[FAIL]` | LRF-001, LRF-029, LRF-034 |
| C-MK-02 | Research citations / statistics (Aka 2019, +50% grammar, 2x vocab) | homepage, b2b, blog | `[NEEDS-PO]` | LRF-015 |
| C-MK-03 | Testimonial authenticity | homepage, case studies | `[FAIL]` (placeholders) | LRF-012 |
| C-MK-04 | Partner logos / school names; stale "Last updated" | case studies, comparison table | `[FAIL]` | LRF-012, LRF-017 |

---

## Service Claims

| # | Claim | Location | Status | Evidence |
|---|-------|----------|--------|----------|
| C-SV-01 | Blended Learning program description; no SEO metadata; nav-unreachable | services pages | `[PASS]` (content) / `[FAIL]` (SEO, nav) | LRF-006, LRF-030 |
| C-SV-02 | Managed Service scope; "ZERO RISK" absolute claim; no SEO metadata | services pages | `[FAIL]` | LRF-006, LRF-019, LRF-030 |
| C-SV-03 | Availability / roadmap dates | services pages | `[UNKNOWN]` | batch-03 (locale-dependent) |

---

## Technical Claims

| # | Claim | Location | Status | Evidence |
|---|-------|----------|--------|----------|
| C-TC-01 | SSL/HTTPS enforcement | infra | `[UNKNOWN]` | Not in source scope (deployment) |
| C-TC-02 | i18n (3 languages) complete & accurate | sitewide | `[FAIL]` | LRF-021, LRF-022, LRF-023, LRF-024, LRF-016 |
| C-TC-03 | SEO metadata presence & quality per page | per page | `[FAIL]` | LRF-005, LRF-006, LRF-011, LRF-036 |
| C-TC-04 | Performance claim | N/A | `[UNKNOWN]` | No Lighthouse run (review-only) |

---

## Verification Method & Limits

- **Static line-review** of every inventory file (130 coverage rows) per batch.
- **Filesystem checks** for product app directories and referenced public assets.
- **Cross-locale parity** observation across en/th/zh.
- **Not performed** (review-only): live browser/Lighthouse/aXe runs, running the test suite, and cross-app capability execution. Items needing those are `[UNKNOWN]`/`[NEEDS-PO]`.
