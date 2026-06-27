# Executive Summary: www-reading-advantage Review

> Track: `www_reading_advantage_review_20260626`
> Generated: 2026-06-27
> Updated: 2026-06-27 (line-review synthesis)
> Status: **Line review complete (130/130 coverage rows). Review-only — no source code remediation was performed. Build/lint/type/test/Lighthouse gates were NOT executed.**

---

## Scope

Comprehensive read-only line review of `apps/www-reading-advantage` — the company public website. Covers claims accuracy, SEO, accessibility, i18n, conversion flows, code quality, and product-claim consistency across en/th/zh.

---

## App at a Glance

| Metric | Value |
|--------|-------|
| Total src files | 270 |
| Total ts/tsx lines | 20,033 |
| Coverage rows reviewed | 130 (113 source + 17 test files) |
| Published pages | 23 (across en, th, zh locales) |
| Locale definition files | 38 (7,540 lines) |
| Components | 41 |
| Blog posts | 96 (49 en + 47 th) |
| Unit tests | 15 active + 2 skipped |
| E2E tests | 4 |
| Static assets | 192 |

---

## Line Review Results

| Severity | Findings |
|----------|---------:|
| Critical | 7 |
| High | 12 |
| Medium | 15 |
| Low | 10 |
| **Total** | **44** |

| Category | Findings |
|----------|---------:|
| Claims | 12 |
| Code Quality | 11 |
| i18n | 5 |
| SEO | 3 |
| Accessibility | 3 |
| Conversion | 3 |
| Performance | 2 |
| Assets | 2 |
| Security | 1 |
| Legal | 1 |
| Architecture | 1 |

> 44 unique findings (LRF-NNN) were consolidated from ~120 raw per-file observations across 10 batches, deduplicating systemic themes while preserving all file:line evidence. Detail: `findings.md`, `line-review/line-review-findings.md`, `line-review/lrf-extracted.json`.

---

## Top Risks (Critical)

1. **Stale launch dates** (LRF-002): "Launching/Coming in 2025" across 6+ product pages and locales, past due by 6-18 months; cross-file conflicts with B2B locale.
2. **Missing SEO metadata** (LRF-005, LRF-006): Homepage, contact, case-studies, all 3 service pages, and Reading/Primary product pages have no metadata export.
3. **Reading Advantage is fully client-rendered** (LRF-007): 516-line marketing page is `use client`, blocking SSR/SEO.
4. **Broken lead-capture forms** (LRF-008, LRF-009): Science & Zhongwen waitlist forms are no-ops; contact form is mailto-only with no backend/analytics/CRM — lead loss risk.
5. **Three empty component files** (LRF-010): `fade-in`, `page-transition`, `scroll-fade` are 0 bytes — runtime risk if imported.

## Other Significant Risks (High)

- "Nine products" overstated; only 4 apps exist (LRF-001); nav lists 8 descriptions (LRF-029); graph shows 8 (LRF-034).
- Missing assets `grid-pattern.svg` and default `og-image.jpg` cause 404s and broken social cards (LRF-011).
- Case studies use placeholder data under a "Real Results" heading (LRF-012).
- Primary Advantage efficacy stats duplicated verbatim from Reading Advantage (LRF-014).
- Stale "Last updated" timestamps (Oct 2023 / Oct 2024) on comparison & pricing tables (LRF-017).
- Mastery animated graph has no ARIA label/live region (LRF-020).
- Systemic hardcoded English + zh-fallback i18n gaps and Thai translation typos (LRF-021, LRF-022, LRF-024).
- Blog renders unsanitized HTML with no Zod frontmatter validation (LRF-028).

---

## Claims Verification Snapshot

| Status | Count (approx, claim rows) |
|--------|----------------------------|
| `[FAIL]` | Majority of dateline, SEO, i18n, count, and placeholder claims |
| `[PASS]` | Reading Advantage games/screenshots, mastery visuals present |
| `[NEEDS-PO]` | Research citations, AI models, SLAs, pricing currency, FSRS/KST implementation |
| `[UNKNOWN]` | NGSS/curriculum/tech-stack specifics, infra/SSL/perf (not in source scope) |

Detail in `claims-matrix.md`.

---

## Coverage & Verification Limits (Review-Only)

- **Performed**: static read of every inventory file (130 coverage rows), filesystem checks for app dirs & referenced assets, cross-locale parity observation, per-file test-gap cataloguing.
- **Not performed**: live browser/Lighthouse/aXe runs, executing the test suite, build/lint/type gates, and cross-app capability execution. These are explicitly deferred (`deferred:review-execution`) in `plan.md` and `checklist.md`.

---

## Recommended Next Steps

1. Schedule remediation tracks T1–T18 (`migration-tracks.md`), starting with the 7 Critical findings.
2. Obtain product-owner confirmation for `[NEEDS-PO]` claims (AI models, efficacy stats, pricing, launch dates).
3. Run the deferred gates (lint/type/test/build) and a Lighthouse/aXe pass in a follow-up execution track.
