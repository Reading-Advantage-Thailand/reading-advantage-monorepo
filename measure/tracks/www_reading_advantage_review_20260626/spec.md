# Specification: Company Website Review

## Overview

Review `apps/www-reading-advantage`, the company website. This app is about two years old and is not tightly coupled to the product apps, so its review should focus on public-facing accuracy, conversion, SEO, accessibility, localization, performance, and product-claim consistency.

## Scope

Primary scope: `apps/www-reading-advantage`.

Known baseline:

- 143 TypeScript graph files.
- 1,129 graph nodes.
- 78 functions.
- 110 schema nodes.

Feature/page families:

- Homepage and brand story.
- Product pages for Reading, Primary, Science, CodeCamp, games, and future products.
- Pricing, contact, lead capture, calls to action.
- i18n/l10n and hardcoded copy.
- SEO metadata, structured data, performance, images, accessibility.
- Claims accuracy against actual app capabilities.

## Required Artifacts

Create `measure/audit-reports/www-reading-advantage_20260626/` containing:

- `00-inventory.md`
- `page-map.md`
- `claims-matrix.md`
- `checklist.md`
- `findings.md`
- `migration-tracks.md`
- `test-gaps.md`
- `executive-summary.md`

## Non-Goals

- Do not rewrite marketing copy during review unless necessary to document a claim mismatch.
- Do not perform visual redesign in this review track.
- Do not review private app features except as needed to verify public product claims.

## Acceptance Criteria

- Every public page has an inventory row.
- Product claims are checked against current app/product reality or marked unknown pending product owner confirmation.
- SEO/accessibility/performance/i18n findings are separated from product-claim findings.
