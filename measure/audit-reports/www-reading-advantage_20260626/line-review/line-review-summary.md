# Line Review Summary: www-reading-advantage

> Track: `www_reading_advantage_review_20260626`
> Generated: 2026-06-27
> **Review-only synthesis. No source code remediation was performed.**

## Scope

- Inventory source files reviewed: **113**
- Test files reviewed (via coverage-patches/test-gaps): **17**
- Total coverage rows: **130** (see `line-review-coverage.tsv`)
- Total ts/tsx source lines: **20,033**
- Batches: **10** (all reviewed)
- Unique findings: **44** (deduplicated from ~120 raw per-file observations)

## Findings by Severity

| Severity | Count |
|----------|------:|
| Critical | 7 |
| High | 12 |
| Medium | 15 |
| Low | 10 |
| **Total** | **44** |

## Findings by Category

| Category | Count |
|----------|------:|
| Claims | 12 |
| Code Quality | 11 |
| i18n | 5 |
| SEO | 3 |
| Conversion | 3 |
| Accessibility | 3 |
| Assets | 2 |
| Performance | 2 |
| Architecture | 1 |
| Legal | 1 |
| Security | 1 |

## Findings Referenced per Batch

| Batch | Findings touching batch |
|-------|------------------------:|
| batch-01 | 13 |
| batch-02 | 9 |
| batch-03 | 8 |
| batch-04 | 8 |
| batch-05 | 8 |
| batch-06 | 5 |
| batch-07 | 4 |
| batch-08 | 6 |
| batch-09 | 6 |
| batch-10 | 9 |

## Systemic Themes (deduplicated)

| Theme | Findings |
|-------|----------|
| `stale-launch-dateline` | LRF-002, LRF-003, LRF-004 |
| `product-count-overstatement` | LRF-001, LRF-034 |
| `missing-seo-metadata` | LRF-005, LRF-006 |
| `broken-form` | LRF-008, LRF-009 |
| `hardcoded-strings` | LRF-021, LRF-023 |
| `cleanup` | LRF-041, LRF-044 |
| `client-render-seo` | LRF-007 |
| `empty-component-file` | LRF-010 |
| `missing-asset` | LRF-011 |
| `placeholder-content` | LRF-012 |
| `unverifiable-ai-claim` | LRF-013 |
| `duplicated-stats` | LRF-014 |
| `unverifiable-claim` | LRF-015 |
| `language-support-claim` | LRF-016 |
| `stale-dateline` | LRF-017 |
| `coming-soon-features` | LRF-018 |
| `absolute-claim` | LRF-019 |
| `missing-aria` | LRF-020 |
| `missing-zh-locale` | LRF-022 |
| `translation-quality` | LRF-024 |
| `a11y-gaps` | LRF-025 |
| `hardcoded-contact` | LRF-026 |
| `fragile-locale-keys` | LRF-027 |
| `xss-risk` | LRF-028 |
| `nav-coverage-gap` | LRF-029 |
| `nav-discoverability` | LRF-030 |
| `hardcoded-content` | LRF-031 |
| `duplicate-implementation` | LRF-032 |
| `fragile-locale-detection` | LRF-033 |
| `asset-naming` | LRF-035 |
| `non-locale-metadata` | LRF-036 |
| `alt-text` | LRF-037 |
| `render-perf` | LRF-038 |
| `layout-shift` | LRF-039 |
| `animation-antipattern` | LRF-040 |
| `html-entity-risk` | LRF-042 |
| `test-hygiene` | LRF-043 |

## Critical & High Findings (action priority)

- **LRF-002** (Critical, Claims): Stale "Launching in 2025" / "Coming in 2025" launch claims (past due ~6-18 months)
- **LRF-005** (Critical, SEO): Homepage has no metadata export (no title/description/OG)
- **LRF-006** (Critical, SEO): Multiple pages missing SEO metadata entirely
- **LRF-007** (Critical, Architecture): Reading Advantage product page is fully client-rendered ('use client')
- **LRF-008** (Critical, Conversion): Non-functional waitlist/email forms (no action or onSubmit handler)
- **LRF-009** (Critical, Conversion): Contact form is mailto-only — no backend submission, analytics, or CRM
- **LRF-010** (Critical, Code Quality): Three empty layout component files (0 bytes)
- **LRF-001** (High, Claims): "Nine products" claim overstated; only 4 products have app directories
- **LRF-003** (High, Claims): Blended Learning / Reading Advantage "May 2026" datelines now past due
- **LRF-004** (High, Claims): Cross-file launch date conflicts between product locales and B2B solutions locale
- **LRF-011** (High, Assets): Missing static assets referenced by pages/layout (404s)
- **LRF-012** (High, Claims): Case studies use placeholder data while heading claims "Real Results from Real Schools"
- **LRF-014** (High, Claims): Primary Advantage efficacy stats duplicated verbatim from Reading Advantage
- **LRF-017** (High, Claims): Stale 'Last updated' datelines on comparison and pricing tables
- **LRF-020** (High, Accessibility): Mastery Advantage animated graph has no ARIA label / live region
- **LRF-021** (High, i18n): Hardcoded English strings not localized (systemic i18n gaps)
- **LRF-022** (High, i18n): Components branch only en/th with Chinese falling back to English
- **LRF-028** (High, Security): Blog library renders unsanitized HTML and lacks Zod frontmatter validation
- **LRF-029** (High, i18n): Primary Advantage missing from navigation dropdown descriptions

## Notes

- All staleness/dateline findings are evaluated against the review date 2026-06-27.
- Many product-claim findings depend on cross-app or product-owner verification; these are reflected as `NEEDS-PO` / `UNKNOWN` in `claims-matrix.md`.
- This is a review artifact only; no fixes were applied to application source.
