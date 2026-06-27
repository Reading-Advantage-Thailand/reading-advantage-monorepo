# Implementation Plan: Company Website Review

> **Track ID:** `www_reading_advantage_review_20260626`  
> **Parent:** `monorepo_feature_review_masterplan_20260626`

---

## Phase 0: Setup and Inventory

- [x] **Task**: Confirm fresh `graph.db` and record `www-reading-advantage` file/node/function counts. — Evidence: `00-inventory.md` (270 src files, 20033 ts/tsx lines, 130 ts/tsx files, 23 pages, 3 layouts)
- [x] **Task**: Create `measure/audit-reports/www-reading-advantage_20260626/`. — Evidence: 8 artifacts created (00-inventory.md, page-map.md, claims-matrix.md, checklist.md, findings.md, migration-tracks.md, test-gaps.md, executive-summary.md)
- [x] **Task**: Inventory pages, layouts, metadata, translations, tests, and product-page data sources. — Evidence: `00-inventory.md` with full counts by category, `line-review/file-inventory.tsv` with 130 files
- [x] **Task**: Create `page-map.md` and initial `claims-matrix.md`. — Evidence: `page-map.md` (23 pages, 3 layouts), `claims-matrix.md` (44 claim rows all PENDING)

## Phase 1: Claims and Content Accuracy

- [x] Task: Review product pages against actual app capabilities and Measure history. — Static line review of all product pages/locales + filesystem app-dir checks (only 4 of 9 product apps exist). Cross-app capability execution not performed; such items flagged NEEDS-PO. Evidence: `line-review/evidence/batch-01..03,07..10/evidence.md`.
- [x] Task: Identify outdated, overstated, missing, or unverifiable claims. — 44 unique findings synthesized (LRF-001..LRF-044); claims cluster includes 9-products overstatement, stale 2025/May-2026 datelines, placeholder case studies, GPT-5/efficacy-stat issues. Evidence: `audit-reports/www-reading-advantage_20260626/findings.md`, `line-review/line-review-findings.md`.
- [x] Task: Record findings in `claims-matrix.md` and `findings.md`. — claims-matrix.md statuses updated to PASS/FAIL/UNKNOWN/NEEDS-PO with LRF evidence refs.

## Phase 2: SEO, Accessibility, Performance, i18n

- [x] Task: Review metadata, headings, links, images, structured data, language alternates, and localization completeness. — SEO metadata verified per page (`page-map.md` table); i18n gaps and Thai typos catalogued (LRF-021/022/024). JSON-LD/robots/sitemap not in ts/tsx scope — noted in checklist.
- [b] Task: Review accessibility and responsive behavior with targeted browser checks if approved. — deferred:review-execution — static a11y review done (LRF-020/025); no live browser/aXe/Lighthouse run performed.
- [x] Task: Record findings and test gaps. — `findings.md`, `test-gaps.md` (coverage-patches integrated), `line-review/coverage-patches/batch-01..10.tsv`.

## Phase 3: Conversion and Lead Flows

- [x] Task: Review CTAs, contact/lead forms, app directory flows, role-based navigation, and analytics/measurement assumptions. — CTAs/nav/forms reviewed statically; found broken waitlist forms (LRF-008), mailto-only contact form with no analytics/CRM (LRF-009), Services unreachable from nav (LRF-030). End-to-end submission not executed (deferred).
- [x] Task: Propose remediation tracks for content, design, or technical issues. — 18 proposed remediation tracks (T1..T18) in `migration-tracks.md` mapped to LRF findings.

## Phase 4: Gates and Reporting

- [b] Task: Run targeted website lint/type/test/build gates and record results. — deferred:review-execution — gates (lint/check-types/test/build/Playwright/Lighthouse) NOT run in this review-only synthesis.
- [x] Task: Complete all artifacts and run Measure phase acceptance. — All 8 reports + line-review artifacts complete; acceptance recorded in `line-review/line-review-acceptance-result.json` and `line-review/phase-acceptance.log`.
