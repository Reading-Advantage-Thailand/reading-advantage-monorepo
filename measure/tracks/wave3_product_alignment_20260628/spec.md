# Specification: Wave 3 — Product-Facing Truth and Reusable Surfaces

## Overview

Align public-facing product claims with implementation reality and make Advantage Games safe to import into Reading/Primary. This wave follows Wave 0 shared safety foundations and should not be used to bypass Wave 1/2 app safety gates.

## Source Findings

- MR-H05 — Advantage Games cannot be imported safely yet.
- MR-H06 — Public website and marketing claims are out of sync with source reality.
- Cross-App CA-008 and CA-013.
- Product Risk Register rows: Games not import-ready, Website claims mismatch, Marketing public API exposure.

## Evidence References

- `measure/audit-reports/monorepo-review-roadmap_20260626/deduplicated-findings.md`
  - MR-H05 Advantage Games cannot be imported safely yet.
  - MR-H06 Public website and marketing claims out of sync with source reality.
- `measure/audit-reports/monorepo-review-roadmap_20260626/product-risk-register.md`
  - Games not import-ready, Website claims mismatch, Marketing public API exposure.
- `measure/audit-reports/cross-app-workflows_20260626/findings.md`
  - CA-008 Website claims materially inaccurate vs product reality.
  - CA-013 Advantage Games not import-ready for Reading/Primary.
- `measure/audit-reports/www-reading-advantage_20260626/executive-summary.md`
  - LRF-001 product count overstatement, LRF-002 stale launch dates, LRF-012 placeholder case studies, LRF-014 duplicated efficacy stats, LRF-013 unverifiable model claim.
- `measure/audit-reports/marketing-app_20260626/executive-summary.md`
  - Critical unauthenticated data/AI routes, API key exposure, missing Zod validation, AI adapter bypass.
- `measure/audit-reports/advantage-games_20260626/executive-summary.md`
  - All implemented games NOT-READY or AT-RISK; D-01 through D-11 import-contract gaps; tenant-unsafe leaderboard; mock API; no shared completion/scoring contract.
- `measure/audit-reports/advantage-games_20260626/game-readiness-matrix.md`
  - Per-game readiness rows and blockers.

## Scope

1. Public website claims correction: product counts, launch dates, nonexistent apps, placeholder case studies, duplicated efficacy stats, AI model claims.
2. Marketing app public API security hardening when claims/workflows depend on it: authz, Zod boundaries, AI adapter use, token/key leakage prevention.
3. Advantage Games import readiness: shared completion/scoring contract, server-side XP/progress persistence, tenant-safe leaderboard, i18n/embeddable navigation, shared runtime package.
4. Shared UI/i18n/accessibility cleanup required to support product-facing surfaces.

## Product Owner Decisions Required

1. Which public product pages remain visible for apps with no code directory?
2. Which AI provider/model claims are approved after implementation review?
3. Should Advantage Games remain standalone until all import contracts are ready, or should a limited pilot import be scoped?
4. Which efficacy stats and case studies are approved and evidence-backed?

## Non-Goals

- Do not import games before Wave 0 tenant/contracts and Games contract work are green.
- Do not invent product claims without product-owner approval and source evidence.
- Do not redesign the entire website unless needed to remove false claims.

## Acceptance Criteria

- Public website has no stale launch dates, nonexistent app claims, placeholder case studies presented as real results, or unverifiable model claims without `[NEEDS-PO]` resolution.
- Marketing data/AI routes required for public workflows require auth and validate inputs.
- Advantage Games completion/scoring contract is a single shared Zod schema with server-side XP calculation and idempotent completion.
- Leaderboard/progress persistence is tenant-safe and covered by tests.
- At least one representative game proves embeddable navigation, i18n, and host progress integration in a test harness before any product import.
