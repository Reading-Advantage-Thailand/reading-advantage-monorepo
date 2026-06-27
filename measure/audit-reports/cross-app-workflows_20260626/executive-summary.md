# Cross-App Workflows Review — Executive Summary

> **Track:** `cross_app_workflows_review_20260626`  
> **Parent:** `monorepo_feature_review_masterplan_20260626`  
> **Status:** Review synthesis complete. No product code changed. No remediation performed.

## Scope

This review synthesizes cross-app risks from nine child review artifact sets: Shared Foundation, Reading Advantage, Primary Advantage, Science Advantage, CodeCamp Advantage, Sales Advantage, Marketing App, Advantage Games, and the public company website.

It does **not** re-list every app finding. It deduplicates symptoms into shared root causes that affect multiple apps, shared packages, integration boundaries, or product claims.

## Inputs Covered

| Review | Coverage signal |
|---|---|
| Shared Foundation | 26 findings; review accepted, product readiness failed |
| Reading Advantage | 1,016 files / 51 batch reports; acceptance still pending in source summary but synthesis complete |
| Primary Advantage | 446 files / 118,709 lines / 893 findings; archived review complete |
| Science Advantage | 738 files / 37 batches / 922 raw IDs; synthesis complete |
| CodeCamp Advantage | 209 files / 11 batches; synthesis complete |
| Sales Advantage | 110 files / 6 batches / 138 findings; synthesis complete |
| Marketing App | 45 files / 7 batches / 44 findings; archived review complete |
| Advantage Games | 929 files / 47 batches / 1,749 findings; synthesis complete |
| Company Website | 130 coverage rows / 44 findings; archived review complete |

## Headline Verdict

The monorepo has a strong intended architecture — shared auth, domain functions, TenantDB, provider adapters, Drizzle migrations, and Zod contracts — but adoption is uneven. Science shows the model can work, while Reading/Primary remain legacy-heavy; CodeCamp/Sales expose edge cases in REFERENTIAL/single-tenant models; Marketing/Games are pre-hardening apps; and the public website currently overstates product reality.

The top cross-app risk is not one broken feature. It is **false confidence**: shared packages and review artifacts sometimes claim architectural guarantees that app code, test fixtures, or deployment gates do not actually enforce.

## Deduplicated Cross-App Findings

| ID | Severity | Finding |
|---|---|---|
| CA-001 | Critical | Auth/session adoption is fractured across apps. |
| CA-002 | Critical | Tenant isolation is untrustworthy until registry/null-tenant/test drift is fixed. |
| CA-003 | Critical | API boundary contracts are inconsistent and under-tested. |
| CA-004 | Critical | Business logic still leaks into transport/UI/request paths. |
| CA-005 | High | AI adapter compliance is bypassed in several apps and via barrel exports. |
| CA-006 | High | Storage adapter adoption is incomplete, especially in legacy apps. |
| CA-007 | High | Database migration and seed governance remain inconsistent. |
| CA-008 | High | Website claims are materially inaccurate versus product reality. |
| CA-009 | High | Rate limiting is in-memory and not multi-instance safe. |
| CA-010 | High | Test strategy is fragmented and provides false confidence. |
| CA-011 | Medium | Observability is ad-hoc and occasionally bypasses intended adapters. |
| CA-012 | Medium | CodeCamp curriculum teaches some security/architecture anti-patterns. |
| CA-013 | High | Advantage Games are not import-ready for Reading/Primary. |

## Required Remediation Lanes

1. **Critical foundation:** shared auth/roles, TenantDB fail-closed, contract-first API boundary, and transport-thin domain migration.
2. **Provider and deployment hardening:** AI/storage/observability adapters, migration sentinels, seed/deploy gates, and rate limiter v2.
3. **Test signal restoration:** tenant-isolation harness, API contract tests, provider architecture guards, migration doctor tests, game completion tests.
4. **Product truth and import readiness:** website claims correction and Advantage Games contract/runtime consolidation.

## Acceptance Decision

**Review acceptance: PASS.** The track's acceptance criteria are met:

- Cross-app risks are tied to at least one child review artifact.
- Shared-root-cause findings deduplicate app-level symptoms.
- Proposed migration tracks identify affected apps and package/package-owner areas.

**Product readiness: FAIL / remediation required.** This synthesis should feed the final roadmap before any new product-facing feature work is prioritized over Critical/High security, tenancy, contract, and deployment risks.
