# Review Checklist: www-reading-advantage

> Track: `www_reading_advantage_review_20260626`
> Generated: 2026-06-27
> Updated: 2026-06-27 (line-review synthesis)
>
> **Review-only audit. No source code remediation was performed.** Items completed via static line review are marked `[x]`. Items requiring live tooling (browser/Lighthouse/aXe) or running the gates were **not executed** and are marked `[ ]` with a deferred note.
>
> Each checklist item maps to a Phase in `plan.md`.

---

## Phase 0 — Setup and Inventory

- [x] **Task 0.1**: Confirm fresh `graph.db` and record www-reading-advantage file/node/function counts.
- [x] **Task 0.2**: Create `measure/audit-reports/www-reading-advantage_20260626/`.
- [x] **Task 0.3**: Inventory pages, layouts, metadata, translations, tests, and product-page data sources.
- [x] **Task 0.4**: Create `page-map.md` and initial `claims-matrix.md`.

### Evidence
- `00-inventory.md` — Full file inventory with counts
- `page-map.md` — Route tree with 23 pages, 3 layouts
- `claims-matrix.md` — Initial claim registry (all PENDING)
- `line-review/` — Batch manifest and file inventory TSV

---

## Phase 1 — Claims and Content Accuracy

- [x] **Task 1.1**: Review product pages against actual app capabilities and Measure history. — Static review + filesystem app-dir checks; cross-app execution not performed (NEEDS-PO items flagged). Evidence: `line-review/evidence/batch-01..03,07..10`.
- [x] **Task 1.2**: Identify outdated, overstated, missing, or unverifiable claims. — Evidence: `findings.md`, `line-review/line-review-findings.md` (LRF-001..LRF-019 claims cluster).
- [x] **Task 1.3**: Record findings in `claims-matrix.md` and `findings.md`. — Evidence: updated `claims-matrix.md` (statuses PASS/FAIL/UNKNOWN/NEEDS-PO).

### Sub-checks

#### Reading Advantage
- [x] Compare product page claims with `apps/reading-advantage` capabilities — partial: filesystem/games verified; deep capability check NEEDS-PO
- [x] Verify feature list accuracy — LRF-016 (Vietnamese), batch-02
- [x] Check screenshots/media against current app UI — images exist (batch-02); pixel comparison not performed

#### Primary Advantage
- [x] Compare product page claims with `apps/primary-advantage` capabilities — LRF-013/014 (GPT-5, duplicated stats)

#### Science Advantage
- [x] Compare product page claims with `apps/science-advantage` capabilities — no app dir; LRF-002/008

#### CodeCamp Advantage
- [x] Compare product page claims with `apps/codecamp-advantage` capabilities — LRF-002; tech-stack specifics NEEDS-PO

#### Other Products (Math, STEM, Storytime, Tutor, Zhongwen, Mastery)
- [x] Verify existence/current state of each product — 5 products have no app dir (LRF-001)
- [x] Flag any product listed but not yet built or deprecated — LRF-001, LRF-002, LRF-004

#### Marketing Claims
- [x] Review superlatives, testimonials, partner logos — LRF-001, LRF-012
- [x] Verify research citations — NEEDS-PO (LRF-015)
- [x] Check case study authenticity — placeholders confirmed (LRF-012)

---

## Phase 2 — SEO, Accessibility, Performance, i18n

- [x] **Task 2.1**: Review metadata, headings, links, images, structured data, language alternates, and localization completeness. — Evidence: `page-map.md` SEO table, LRF-005/006/036/021/022/024.
- [ ] **Task 2.2**: Review accessibility and responsive behavior with targeted browser checks. — **deferred:review-execution** — static a11y review performed (LRF-020/025); no live browser/aXe run.
- [x] **Task 2.3**: Record findings and test gaps. — Evidence: `findings.md`, `test-gaps.md`, `line-review/coverage-patches/`.

### Sub-checks

#### SEO
- [x] Verify `generateMetadata` or `metadata` export on every page — `page-map.md` table (LRF-005/006)
- [x] Check title tags are unique and descriptive — LRF-036 (hardcoded/non-locale titles)
- [x] Check meta descriptions exist and are meaningful — per `page-map.md`
- [x] Verify canonical URLs — mostly missing (LRF-036)
- [x] Check hreflang/language alternates — missing (LRF-036)
- [x] Check Open Graph / Twitter card metadata — partial; default OG image missing (LRF-011)
- [ ] Verify structured data (JSON-LD) on relevant pages — **deferred:review-execution** — none observed in scanned pages
- [ ] Check robots.txt and sitemap presence — **deferred:review-execution** — outside ts/tsx line-review scope
- [x] Check for broken internal links — nav/CTA links reviewed (LRF-030); no crawl performed

#### Accessibility
- [x] Check heading hierarchy (h1-h6) — reviewed (batch-01/04); HeroSection ReactNode-title risk noted
- [x] Verify image alt text — reviewed (LRF-037, batch-01..06)
- [ ] Check color contrast — **deferred:review-execution** — needs rendering
- [ ] Verify keyboard navigation — **deferred:review-execution** — partial static review (LRF-025 pagination href=#)
- [x] Check ARIA labels on interactive elements — LRF-020, LRF-023, LRF-025
- [ ] Run automated aXe/Lighthouse audit — **deferred:review-execution** — not run

#### Performance
- [x] Check image optimization (next/image usage) — reviewed; next/image used widely
- [x] Verify lazy loading — partial (LRF-038 fs.existsSync, LRF-035)
- [ ] Check bundle size — **deferred:review-execution**
- [ ] Run Lighthouse performance audit — **deferred:review-execution**
- [ ] Check Core Web Vitals — **deferred:review-execution** (LRF-007 client-render LCP risk noted statically)

#### i18n
- [x] Verify all 3 locales (en, th, zh) have complete translations — parity observed; gaps in LRF-021/022/029
- [x] Check for hardcoded English in components — LRF-021, LRF-022, LRF-023
- [ ] Verify locale switcher works on all pages — **deferred:review-execution** — component reviewed statically (batch-10)
- [x] Check RTL support (if applicable for zh) — N/A (zh is LTR)
- [x] Verify date/number formatting locale-aware — Intl.DateTimeFormat used (batch-05)

---

## Phase 3 — Conversion and Lead Flows

- [x] **Task 3.1**: Review CTAs, contact/lead forms, app directory flows, role-based navigation, and analytics/measurement assumptions. — Evidence: LRF-008/009/030; analytics absent (batch-04).
- [x] **Task 3.2**: Propose remediation tracks for content, design, or technical issues. — Evidence: `migration-tracks.md` (T1..T18).

### Sub-checks

#### CTAs
- [x] Verify CTA consistency across pages — reviewed; most CTAs → /contact
- [x] Check CTA links resolve to correct targets — static review (batches 01-05)
- [x] Review CTA copy for urgency and clarity — reviewed

#### Contact/Lead Forms
- [ ] Verify form submission works end-to-end — **deferred:review-execution** — static review shows mailto-only + broken waitlists (LRF-008/009)
- [x] Check validation messages — only HTML `required` (LRF-009)
- [x] Verify form data reaches destination — mailto-only, no backend (LRF-009)
- [x] Check for spam protection — none (LRF-009)
- [x] Review thank-you/follow-up flow — none (LRF-009)

#### Navigation
- [x] Verify main navigation links — LRF-030 (Services missing from nav)
- [x] Check footer links — reviewed (batch-03/10)
- [x] Verify breadcrumb accuracy (blog) — LRF-021 (hardcoded labels)
- [x] Check locale switcher placement and behavior — static review (batch-10)

#### Analytics
- [x] Verify analytics/tracking code presence — none observed (batch-04)
- [x] Check conversion event tracking — none observed (LRF-009)
- [x] Review measurement plan assumptions — no measurement infra found

---

## Phase 4 — Gates and Reporting

- [ ] **Task 4.1**: Run targeted website lint/type/test/build gates and record results. — **deferred:review-execution** — gates NOT run in this review-only synthesis.
- [x] **Task 4.2**: Complete all artifacts and run Measure phase acceptance. — Artifacts complete; acceptance in `line-review/line-review-acceptance-result.json` / `phase-acceptance.log`.

### Sub-checks

#### Gates
- [ ] Run `pnpm turbo run check-types --filter=@reading-advantage/www` — **deferred:review-execution**
- [ ] Run `pnpm turbo run lint --filter=@reading-advantage/www` — **deferred:review-execution**
- [ ] Run `pnpm turbo run test --filter=@reading-advantage/www` — **deferred:review-execution**
- [ ] Run `pnpm build` for www-reading-advantage — **deferred:review-execution**
- [ ] Run Playwright E2E tests — **deferred:review-execution**
- [ ] Run Lighthouse CI if configured — **deferred:review-execution**

#### Reporting
- [x] Complete `findings.md` with all findings — 44 LRF findings synthesized
- [x] Complete `migration-tracks.md` with remediation track proposals — T1..T18
- [x] Complete `test-gaps.md` with coverage analysis — coverage-patches integrated
- [x] Complete `executive-summary.md` with synthesized results — updated
