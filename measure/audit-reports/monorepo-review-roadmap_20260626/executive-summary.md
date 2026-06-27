# Monorepo Review Roadmap — Executive Summary

> **Track:** `monorepo_review_roadmap_20260626`  
> **Status:** Final synthesis complete. No remediation performed.  
> **Inputs:** Shared Foundation, Reading, Primary, Science, CodeCamp, Sales, Marketing, Advantage Games, Company Website, and Cross-App Workflows review artifacts.

## Bottom Line

The monorepo review program is effectively complete as a review effort. It found a consistent pattern: the target architecture is sound and partially proven, but its guarantees are not yet uniformly enforced across apps. The highest-priority work is therefore not new product functionality; it is making the shared guarantees true: auth, tenant isolation, contracts, domain boundaries, deploy/migration gates, provider adapters, and meaningful tests.

## Top Risks

1. **Tenant isolation cannot be trusted across the monorepo** until tenant registry drift, null-tenant behavior, and vacuous tests are fixed.
2. **Auth/session adoption is fractured** across Reading, Primary, Sales, Marketing, and Games; rate limiting is not deployment-safe.
3. **Reading and Primary have legacy/fork-critical failures** that block safe product claims and student use.
4. **Contracts and tests provide false confidence**: shared `types` has no tests; many app tests are absent, vacuous, tautological, or live-production dependent.
5. **Provider adapters and deployment gates are unevenly enforced**, allowing direct SDK calls, seed/deploy drift, and schema mismatches.
6. **Public-facing claims and game import ambitions exceed implementation readiness.**

## Recommended Execution Order

### Wave 0 — Shared safety foundations
- Tenant registry + fail-closed TenantDB.
- Shared auth/roles/rate limiter.
- Shared contracts/types tests.
- API/domain boundary enforcement.

### Wave 1 — Stop high-risk product failures
- Primary core crash/admin/flashcard/security stabilization.
- Reading Critical security + XP idempotency.
- CodeCamp TenantDB/webhook/streaming reliability.
- Sales role/IDOR/audio privacy hardening.

### Wave 2 — Restore confidence
- Migration/seed/deploy governance.
- Provider adapter enforcement.
- Monorepo test signal restoration.

### Wave 3 — Product-facing alignment
- Website and marketing claims correction.
- Advantage Games import-readiness program.
- Shared UI/i18n/accessibility cleanup.

## Coverage Limits

- This roadmap does not claim product readiness.
- It does not mark any source finding remediated.
- Some child summaries still used “acceptance pending” language at the time of synthesis; this roadmap treats their line-review artifacts as complete evidence while preserving that remediation remains unstarted.
- Deferred build/lint/type/browser gates in review-only tracks are accepted as review-execution deferrals, not as product-green signals.

## Final Recommendation

Approve the roadmap as the source of truth for opening remediation tracks. Do not start broad new feature work in Reading, Primary, Sales, CodeCamp, Marketing, or Games import until the Wave 0 and relevant Wave 1 tracks are opened and scheduled.
