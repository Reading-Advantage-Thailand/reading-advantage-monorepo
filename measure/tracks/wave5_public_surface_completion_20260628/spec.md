# Specification: Wave 5 — Public Surface Completion

## Overview

Finish the public-facing website and marketing-app remediation that Wave 3 did not own. Wave 3 corrected **claims** and secured marketing's **Critical** API routes; this wave closes the remaining **Critical/High/Medium** public-surface defects: broken lead-capture, empty/dead layout components, missing SEO metadata and assets, i18n completeness, accessibility, stale comparison/pricing data, navigation/contact gaps, and marketing schema/UX/i18n hardening. It also lands the Science build/deploy de-Prisma correctness fix so deploys stop invoking Prisma.

Ownership of record: `measure/audit-reports/monorepo-review-roadmap_20260626/medium-plus-coverage-matrix.md`.

## Source Findings

- **www (non-claims tracks):** T1 Broken lead-capture forms (Critical), T2 Empty layout components (Critical), T3 SEO metadata / client-render SEO (Critical), T6 Restore missing static assets (High), T8 i18n completeness pass (High), T11 Accessibility remediation (High/Medium), T12 Stale comparison/pricing data (High/Medium), T13 Add Services to primary nav (Medium), T14 Centralize contact details (Medium), T15 Typed locale accessors (Medium), T16 Test hygiene (Medium), T17 Legal copy review (Medium).
- **Marketing:** marketing_schema_integrity (Medium), marketing_ux_error_handling (Medium), marketing_i18n (Medium).
- **Science deploy correctness:** ST-6 Build/deploy de-Prisma (High, deploy-blocking).

## Evidence References

- `measure/audit-reports/www-reading-advantage_20260626/migration-tracks.md` — T1, T2, T3, T6, T8, T11, T12, T13, T14, T15, T16, T17.
- `measure/audit-reports/www-reading-advantage_20260626/findings.md` / `line-review/` — LRF-005..011, LRF-016..027, LRF-030, LRF-036, LRF-043.
- `measure/audit-reports/marketing-app_20260626/migration-tracks.md` — marketing_schema_integrity, marketing_ux_error_handling, marketing_i18n.
- `measure/audit-reports/science-advantage-full_20260626/migration-tracks.md` — ST-6 (HI-08, F-SA-B36-001/003, DOC-01).
- `measure/audit-reports/monorepo-review-roadmap_20260626/medium-plus-coverage-matrix.md`.

## Product Owner Decisions Required

Phase 0 is a blocking decision gate. Do not implement affected Wave 5 surfaces until these answers are recorded in the track plan or a linked decision artifact:

1. Which lead-capture backend/adapter receives waitlist + contact submissions (T1)?
2. Which efficacy/comparison/pricing figures are approved and evidence-backed (T12 overlaps Wave 3 claims gate)?
3. Final legal language to replace "ZERO RISK" copy (T17)?

## Dependencies

- Wave 3 claims gate should be complete so claim copy is not re-edited in conflict; T12 pricing/comparison overlaps the claims matrix and must reconcile with it.
- ST-6 de-Prisma should land before or with Wave 2 migration-doctor deploy gates so Science deploy is verified end-to-end.

## Scope

1. Make waitlist + contact forms submit to a real backend/adapter with validation and analytics; remove or implement empty layout components.
2. Add SEO metadata (titles, OG image, hreflang, canonical, locale-aware) and fix client-render SEO; restore missing static assets.
3. i18n completeness: externalize hardcoded strings, add zh fallback, fix Thai typos; add typed locale accessors replacing `as never` casts.
4. Accessibility remediation (graph ARIA, UI component a11y); add Services to primary navigation; centralize contact details/support email.
5. Refresh stale comparison/pricing data and timestamps (reconciled with Wave 3 claims matrix); replace "ZERO RISK" with measured legal language.
6. www test hygiene: unskip homepage test, dedupe Primary test, deepen product tests.
7. Marketing: schema integrity (`UNIQUE(app, topic)`, typed/`updatedAt`/`createdBy` columns, encryption invariant, shared `APPS` tuple), `res.ok`/error-state UX, and i18n layer.
8. Science: replace Prisma build command with Drizzle migrate; align tsconfig test inclusion.

## Non-Goals

- Do not re-edit approved Wave 3 claim copy except where T12 pricing/comparison must reconcile.
- Do not change security/auth behavior of marketing routes already hardened in Wave 3.
- Do not pick up Low-severity www T18 cleanup.

## Acceptance Criteria

- Waitlist and contact forms submit successfully to a backend/adapter, validate input, and surface success/error states; no dead/empty layout components remain imported.
- Phase 0 records the approved lead-capture backend/adapter, comparison/pricing figures, and legal replacement copy before implementation touches those surfaces.
- All public pages export SEO metadata; OG image and previously-missing static assets resolve; client-render SEO regressions are fixed.
- Hardcoded public strings are localized with zh fallback; locale access is typed (no `as never`).
- Accessibility checks pass for remediated components; Services appears in primary nav; contact details resolve from a single source.
- Comparison/pricing data matches the approved claims matrix; "ZERO RISK" legal copy is replaced.
- Marketing schema constraints exist with migration; marketing client pages handle non-OK responses with inline status UI; marketing UI strings are localizable.
- Science build invokes Drizzle migrate (not Prisma) and the deploy path is verified.
- Targeted www/marketing/science tests, type checks, and lint pass for touched surfaces.

## Required Verification Commands

```bash
CI=true pnpm turbo run test --filter=www-reading-advantage --filter=marketing-app --filter=science-advantage
CI=true pnpm turbo run check-types --filter=www-reading-advantage --filter=marketing-app --filter=science-advantage
CI=true pnpm turbo run lint --filter=www-reading-advantage --filter=marketing-app --filter=science-advantage
```
</content>
