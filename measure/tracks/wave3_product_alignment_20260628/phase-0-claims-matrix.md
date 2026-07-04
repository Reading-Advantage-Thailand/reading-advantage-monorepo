# Phase 0 — Frozen Claims Evidence Matrix (Frozen 2026-07-04)

> **Track:** `wave3_product_alignment_20260628`
> **Baseline SHA:** `8a47d2df999e35d9d47de9eb590ae29523c70bae`
> **Source artifacts:**
> - `measure/audit-reports/www-reading-advantage_20260626/claims-matrix.md` (review
>   synthesis, 2026-06-27)
> - `measure/audit-reports/www-reading-advantage_20260626/executive-summary.md`
>   (LRF-001/002/012/013/014/015/017/029/031/034)
> - `measure/audit-reports/cross-app-workflows_20260626/findings.md` CA-008
> - `measure/audit-reports/monorepo-review-roadmap_20260626/deduplicated-findings.md`
>   MR-H06
>
> This matrix is the **frozen** Phase 0 input for Phase 1 (Website Claims Correction).
> It re-states the audit's claim rows with HEAD-confirmed file:line evidence (re-verified
> at `8a47d2df` on 2026-07-04) and assigns each row a Phase 1 disposition drawn from
> `phase-0-decisions.md`. Phase 1 Red tests assert the dispositions; Phase 1 Green
> implements them.

## Status legend

| Tag | Meaning for Phase 1 |
|-----|---------------------|
| `[FIX-MUST]` | Tier 1 floor — claim **must** be removed/replaced/relabeled. Red test asserts absence. |
| `[FIX-IF-NO-CONSENT]` | Claim may stay **only if** a consent/anonymization artifact is paired (A2). Otherwise removed. |
| `[NEEDS-PO]` | Tier 2 — specific replacement requires product-owner approval. Phase 1 substitutes neutral/illustrative copy; the `[NEEDS-PO]` marker is preserved in `plan.md` as `[b] deferred:po`. |
| `[KEEP]` | Claim verified accurate; no Phase 1 action. |
| `[OUT-OF-SCOPE]` | Owned by another wave (SEO metadata, i18n completeness, lead-capture forms, a11y, comparison-table freshness). Not a Wave 3 claims item. |

---

## A. Product-count claims (CA-008 root cause; MR-H06)

| Claim ID | Claim text | File:line (HEAD `8a47d2df`) | Audit status | Phase 1 disposition |
|----------|------------|------------------------------|---------------|---------------------|
| CC-01 | "One engine, nine products." | `src/locales/pages/home.ts:40` | LRF-001, LRF-029, LRF-034 `[FAIL]` | `[FIX-MUST]` — replace with truthful count "four products today + roadmap" (exact wording `[NEEDS-PO]`) |
| CC-02 | "One engine, nine products." | `src/locales/pages/mastery-advantage.ts:61` | LRF-001 `[FAIL]` | `[FIX-MUST]` — same as CC-01 |
| CC-03 | "THE SUITE — all 9 products" | `src/app/[locale]/(marketing)/(home)/page.tsx:175` | LRF-001 `[FAIL]` | `[FIX-MUST]` — same as CC-01 |

## B. Stale launch dates (LRF-002)

| Claim ID | Claim text | File:line (HEAD `8a47d2df`) | Audit status | Phase 1 disposition |
|----------|------------|------------------------------|---------------|---------------------|
| CC-04 | "Coming in 2025" (STEM) | `src/locales/pages/products/stem-advantage.ts:10` | LRF-002, C-STEM-01 `[FAIL]` | `[FIX-MUST]` — remove date; label "On our roadmap" (specific date `[NEEDS-PO]`) |
| CC-05 | "Coming in 2025" (Tutor) | `src/locales/pages/products/tutor-advantage.ts:10` | LRF-002, C-TA-01 `[FAIL]` | `[FIX-MUST]` — same as CC-04 |
| CC-06 | "Launching in 2025" + "Coming in 2025" (Storytime) | `src/locales/pages/products/storytime-advantage.ts:4,10`; `src/app/[locale]/(marketing)/products/storytime-advantage/page.tsx:24` | LRF-002, C-ST-01 `[FAIL]` | `[FIX-MUST]` — same as CC-04 |
| CC-07 | "Coming in 2026" (Math, page) vs "Coming in 2025" (locale conflict) | `src/locales/pages/products/math-advantage.ts:6` | LRF-002, C-MA-01 `[FAIL]` | `[FIX-MUST]` — same as CC-04 |
| CC-08 | "Coming Soon" (Zhongwen) + FAQ "early 2025" | `src/locales/pages/products/zhongwen-advantage.ts:7` | LRF-002, C-ZA-01 `[FAIL]` | `[FIX-MUST]` — same as CC-04 |
| CC-09 | "Launching in 2025" (Science) | (per audit LRF-002, C-SA-01) | LRF-002 `[FAIL]` | `[FIX-MUST]` — verify at HEAD; remove date or replace with "Live — Early Access" if Science is in fact deployed |
| CC-10 | "Launching in 2025" (CodeCamp) | (per audit LRF-002, C-CC-01) | LRF-002 `[FAIL]` (dateline) | `[FIX-MUST]` — CodeCamp is deployed (per `codecamp_advantage_*` archive notes); replace with "Live" or remove date |
| CC-11 | "New for SY2025" (Primary) | (per audit LRF-006, C-PA-01) | LRF-006 `[FAIL]` | `[FIX-MUST]` — remove stale badge |
| CC-12 | "Starting May 2026 Blended Learning" (Reading) | (per audit LRF-003, C-RA-01) | LRF-003 `[FAIL]` (past due) | `[FIX-MUST]` — remove past-due dateline |

## C. Nonexistent-app product pages (CA-008)

| Claim ID | Page | Code directory exists? | Audit status | Phase 1 disposition |
|----------|------|------------------------|---------------|---------------------|
| CC-13 | Math Advantage | No | C-MA-01/02 `[FAIL]` | `[FIX-MUST]` — label "On our roadmap" with no launch date, OR remove page. Per-page keep/hide/delete `[NEEDS-PO]`. |
| CC-14 | STEM Advantage | No | C-STEM-01 `[FAIL]` | `[FIX-MUST]` — same as CC-13 |
| CC-15 | Storytime Advantage | No | C-ST-01 `[FAIL]` | `[FIX-MUST]` — same as CC-13 |
| CC-16 | Tutor Advantage | No | C-TA-01 `[FAIL]` (dateline `[FAIL]`; page `[PASS]`) | `[FIX-MUST]` — same as CC-13 |
| CC-17 | Zhongwen (Chinese) Advantage | No | C-ZA-01 `[FAIL]` | `[FIX-MUST]` — same as CC-13 |

## D. AI model claims (LRF-013)

| Claim ID | Claim text | File:line (HEAD `8a47d2df`) | Audit status | Phase 1 disposition |
|----------|------------|------------------------------|---------------|---------------------|
| CC-18 | "Intelligent writing feedback with GPT-5" / "GPT-5 Writing Feedback" (en/th/zh) | `src/locales/pages/products/primary-advantage.ts:30,96,170,236,310,376` | LRF-013, C-PA-02 `[FAIL]` (unverifiable) | `[FIX-MUST]` — remove "GPT-5"; replace with provider-neutral "AI-powered writing feedback via our model adapter" (specific model `[NEEDS-PO]`) |
| CC-19 | Case-study `technology: "Google Gemini & GPT-5 AI"` (en/th/zh) | `src/locales/pages/home.ts:143,303,461` | LRF-013 `[FAIL]` | `[FIX-MUST]` — replace with neutral `technology: "AI-assisted learning"` (or remove field) |

## E. Placeholder case studies (LRF-012)

| Claim ID | Claim text | File:line (HEAD `8a47d2df`) | Audit status | Phase 1 disposition |
|----------|------------|------------------------------|---------------|---------------------|
| CC-20 | "School A (Coming Soon)" under "Real Results" | `src/locales/pages/case-studies.ts:23` (and `:48` `school: "School A"`) | LRF-012, C-MK-03 `[FAIL]` | `[FIX-MUST]` — relabel section "Illustrative examples"; remove "Real Results" heading; remove "Coming Soon" school names; no concrete metrics. Specific real case study `[NEEDS-PO]` + consent artifact (A2). |
| CC-21 | "School B (Coming Soon)" under "Real Results" | `src/locales/pages/case-studies.ts:58` (and `:83` `school: "School B"`) | LRF-012, C-MK-03 `[FAIL]` | `[FIX-MUST]` — same as CC-20 |

## F. Duplicated efficacy stats (LRF-014)

| Claim ID | Claim | File:line (HEAD `8a47d2df`) | Audit status | Phase 1 disposition |
|----------|-------|------------------------------|---------------|---------------------|
| CC-22 | Primary Advantage efficacy stats duplicated verbatim from Reading Advantage | (per audit LRF-014, C-PA-02) | LRF-014 `[FAIL]` | `[FIX-MUST]` — deduplicate; Primary either has its own evidence (Tier 2 `[NEEDS-PO]`) or omits the stat |

## G. Unverifiable stats and absolute claims (LRF-015, LRF-017, LRF-018, LRF-019, LRF-031)

| Claim ID | Claim text | File:line (HEAD `8a47d2df`) | Audit status | Phase 1 disposition |
|----------|------------|------------------------------|---------------|---------------------|
| CC-23 | "2,172+ mapped skills" | `src/app/[locale]/(marketing)/(home)/page.tsx:87` | LRF-015, C-RA-04 `[NEEDS-PO]` | `[FIX-MUST]` — remove unless PO provides verified source-of-truth count (Tier 2 `[NEEDS-PO]`) |
| CC-24 | "95%" stat (Math) | `src/app/[locale]/(marketing)/products/math-advantage/page.tsx:296` | LRF-031, C-MA-02 `[FAIL]` | `[FIX-MUST]` — remove (Math page is itself a roadmap page per CC-13) |
| CC-25 | "3x faster" (Math, per audit) | (per audit LRF-031, C-MA-02) | LRF-031 `[FAIL]` | `[FIX-MUST]` — remove |
| CC-26 | "ZERO RISK" (Managed Service) | `src/locales/pages/managed-service.ts:11` | LRF-019, C-SV-02 `[FAIL]` | `[FIX-MUST]` — replace with non-absolute qualifier ("Low-risk onboarding") or remove |
| CC-27 | "24/7" availability claims (Math/Primary) | `src/locales/pages/products/math-advantage.ts:57,149,241`; `src/locales/pages/products/primary-advantage.ts:73,213,353` | LRF-031, C-MA-02/C-PA-02 `[FAIL]` | `[FIX-MUST]` — replace with "always-on" or remove absolute "24/7" promise (uptime is an infra claim, not a product claim) |
| CC-28 | Research citations "Aka 2019", "+50% grammar", "2x vocab" | (per audit LRF-015, C-MK-02) | LRF-015 `[NEEDS-PO]` | `[FIX-MUST]` — remove unless PO provides full citation (publication, DOI/URL, peer-review status) and confirms applicability (Tier 2 `[NEEDS-PO]`) |

## H. Partner logos / school names (LRF-012, C-MK-04)

| Claim ID | Claim | File:line (HEAD `8a47d2df`) | Audit status | Phase 1 disposition |
|----------|-------|------------------------------|---------------|---------------------|
| CC-29 | Partner logos / school names presented as real partners | (per audit LRF-012, C-MK-04 `[FAIL]`) | LRF-012, C-MK-04 `[FAIL]` | `[FIX-IF-NO-CONSENT]` — each named partner/school must have a `consent-<subject>.{md,pdf}` artifact (signatory + date) AND an anonymization decision (A2). Without consent, remove. Enforced structurally by `wave2-product-claim-helper.ts` `audit()` `missingConsentCount`. |

## I. Stale timestamps (LRF-017)

| Claim ID | Claim | File:line (HEAD `8a47d2df`) | Audit status | Phase 1 disposition |
|----------|-------|------------------------------|---------------|---------------------|
| CC-30 | "Last updated Oct 2023/Oct 2024" on comparison & pricing tables | (per audit LRF-017, C-RA-05) | LRF-017, C-RA-05 `[FAIL]` (stale timestamp) / `[NEEDS-PO]` (figures) | `[FIX-MUST]` — remove stale timestamp or replace with current date; pricing figures `[NEEDS-PO]` |

---

## Out-of-scope (owned by other waves — recorded for boundary clarity)

These are public-website defects that are **not** claims-correction and therefore stay in
Wave 5 / other tracks. They are listed here so Phase 1 Red tests do **not** accidentally
assert against them (which would expand Wave 3 scope).

- **SEO metadata absence** (LRF-005, LRF-006) — Wave 5 Phase 2.
- **Broken lead-capture forms** (LRF-008, LRF-009) — Wave 5 Phase 1.
- **Empty component files** (LRF-010 — `fade-in`, `page-transition`, `scroll-fade`) —
  Wave 5 Phase 1.
- **Missing assets** (`grid-pattern.svg`, default `og-image.jpg`, LRF-011) — Wave 5 Phase 2.
- **i18n completeness / hardcoded English / Thai typos** (LRF-021..LRF-024, LRF-016) —
  Wave 5 Phase 3 (www) and Phase 7 (marketing).
- **Accessibility** (Mastery graph no ARIA, LRF-020; canvas a11y) — Wave 5 Phase 4 and
  Wave 6 Phase 3.
- **Blog unsanitized HTML / no Zod frontmatter** (LRF-028) — Wave 4 Phase 8 (Public Blog
  Security) per `medium-plus-coverage-matrix.md`.
- **Reading Advantage client-rendered page** (LRF-007, 516-line `use client`) —
  architecture/perf, not a claim; Wave 5/6.
- **Pricing figures** (C-RA-05 `[NEEDS-PO]` figures) — Tier 2 PO-gated; the **staleness**
  of the timestamp is Tier 1 (`[FIX-MUST]` per CC-30), the **figures** are not.

---

## Phase 1 Red test mapping (preview — full strategy in `test-strategy.md` §11)

Each `[FIX-MUST]` row above maps to at least one Phase 1 Red assertion. The Red tests use
the existing `apps/www-reading-advantage/src/testing/product-claim-helper.ts`
`createProductClaimHelper()` (from Wave 2 Phase 4) to classify claim artifacts harvested
from the locale/page source, plus direct source-text scans for the specific banned
literals ("GPT-5", "nine products", "Coming in 2025", "ZERO RISK", "School A (Coming
Soon)"). See `test-strategy.md` §11 for the full Red command, Green gate, and
anti-pattern coverage.
