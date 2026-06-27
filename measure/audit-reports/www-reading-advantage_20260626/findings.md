# Findings: www-reading-advantage

> Track: `www_reading_advantage_review_20260626`
> Generated: 2026-06-27
> Updated: 2026-06-27 (line-review synthesis)
>
> **Review-only audit. No source code remediation was performed.** All findings are observations with evidence references; remediation is proposed in `migration-tracks.md` only.
>
> Canonical finding detail lives in `line-review/line-review-findings.md` (44 unique LRF-NNN findings) and `line-review/lrf-extracted.json` (machine-readable). Per-file evidence is in `line-review/evidence/batch-01..10/evidence.md`. Claim statuses are in `claims-matrix.md`.

---

## Totals

| Severity | Count |
|----------|------:|
| Critical | 7 |
| High | 12 |
| Medium | 15 |
| Low | 10 |
| **Total** | **44** |

| Category | Count |
|----------|------:|
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

---

## Critical Findings

| ID | Title | Category | Evidence |
|----|-------|----------|----------|
| LRF-002 | Stale "Launching/Coming in 2025" claims across product pages & locales | Claims | batch-02/03/09 |
| LRF-005 | Homepage has no SEO metadata export | SEO | batch-01 |
| LRF-006 | Multiple pages missing SEO metadata entirely | SEO | batch-01/02/03 |
| LRF-007 | Reading Advantage product page fully client-rendered (`use client`) | Architecture | batch-02 |
| LRF-008 | Non-functional waitlist forms (no action/onSubmit) | Conversion | batch-02/03 |
| LRF-009 | Contact form mailto-only — no backend/analytics/CRM | Conversion | batch-04 |
| LRF-010 | Three empty layout component files (0 bytes) | Code Quality | batch-04 |

## High Findings

| ID | Title | Category |
|----|-------|----------|
| LRF-001 | "Nine products" overstated; only 4 have app directories | Claims |
| LRF-003 | "May 2026" datelines now past due | Claims |
| LRF-004 | Cross-file launch-date conflicts (product vs B2B locales) | Claims |
| LRF-011 | Missing static assets (grid-pattern.svg, og-image.jpg) → 404s | Assets |
| LRF-012 | Case studies are placeholder data under "Real Results" heading | Claims |
| LRF-014 | Primary Advantage efficacy stats duplicated from Reading Advantage | Claims |
| LRF-017 | Stale "Last updated" on comparison (Oct 2023) & pricing (Oct 2024) | Claims |
| LRF-020 | Mastery Advantage animated graph has no ARIA label/live region | Accessibility |
| LRF-021 | Hardcoded English strings not localized (systemic) | i18n |
| LRF-022 | Components branch en/th only; Chinese falls back to English | i18n |
| LRF-028 | Blog renders unsanitized HTML; no Zod frontmatter validation | Security |
| LRF-029 | Primary Advantage missing from nav dropdown descriptions | i18n |

> Medium (15) and Low (10) findings are enumerated in `line-review/line-review-findings.md`.

---

## Severity Classification

| Severity | Definition | Action |
|----------|------------|--------|
| **Critical** | Incorrect claim, legal/security risk, broken conversion flow, runtime risk | Immediate fix |
| **High** | Significant SEO/i18n/a11y gap, misleading/stale claim | Fix this cycle |
| **Medium** | Minor accuracy issue, missing metadata, untranslated string | Fix next cycle |
| **Low** | Consistency, style, minor optimization | Deferred |

---

## Cross-Cutting / Systemic Themes

- **product-count-overstatement** (LRF-001, LRF-029, LRF-034): "nine products" repeated everywhere; 4 apps exist; graph shows 8; nav lists 8 descriptions.
- **stale-launch-dateline** (LRF-002, LRF-003, LRF-004): 2025/May-2026 datelines past due, cross-file conflicts.
- **missing-seo-metadata** (LRF-005, LRF-006, LRF-011, LRF-036): several pages without metadata; missing OG image asset; non-locale-aware titles.
- **hardcoded-strings / missing-zh-locale** (LRF-021, LRF-022, LRF-023, LRF-024): i18n gaps and Thai translation typos.
- **broken-form** (LRF-008, LRF-009): conversion flows non-functional.
- **empty-component-file** (LRF-010): runtime risk if imported.

---

## Tracking

Remediation is **not** performed in this review track. See `migration-tracks.md` for proposed follow-up tracks mapped to these findings.
