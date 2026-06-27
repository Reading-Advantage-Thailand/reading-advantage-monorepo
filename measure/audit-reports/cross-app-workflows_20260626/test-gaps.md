# Cross-App Workflows Review — Test Gaps

> **Track:** `cross_app_workflows_review_20260626`  
> **Type:** Review-only synthesis. No test implementation performed.

## Systemic Gaps

1. **Tenant isolation tests are not trustworthy.** Shared foundation referential-scope detection is vacuous; Science tenant fixtures omit `schoolId`; CodeCamp tests classify tables differently under Vitest than compiled runtime; Games tenant-coverage is red.
2. **Legacy app API contracts are nearly untested.** Reading has 0/54 controller tests, 0/209 route-handler tests, and ~1/209 endpoints with Zod validation. Primary has widespread route/auth/schema drift with minimal systematic tests.
3. **Shared contracts lack a test package.** `@reading-advantage/types` owns cross-app Zod contracts but has no test script; this allowed sales role and nullability drift.
4. **Provider-adapter guards are incomplete.** `@reading-advantage/ai` aggregate tests have known failures, and the AI barrel leak lets raw SDK usage pass architecture checks.
5. **Production smoke tests are used as CI substitutes.** CodeCamp prod-smoke tests hit live production by default and can report green while product launch docs say no-go.
6. **Game tests assert render/smoke, not learning-state integrity.** Advantage Games lacks scoring/completion/XP/tenant assertions; several games are NOT-READY despite existing tests.
7. **Marketing/UI tests contain false-green patterns.** Marketing tests include tautological assertions and stale RED docblocks; website review deferred build/lint/type/Lighthouse/aXe gates.

## Required Cross-App Test Tracks

| Track | Scope | Blocks |
|---|---|---|
| Tenant Isolation Harness | Shared fixture helper with mandatory `schoolId`, cross-tenant adversarial tests, compiled/runtime parity | TenantDB claims across all apps |
| API Contract Test Kit | Shared response envelopes, route adapter tests, typed error mapping | Reading/Primary/API migration |
| Provider Adapter Guard Suite | Detect direct SDK and raw barrel leaks; assert adapter-only use | AI/storage/observability compliance |
| Migration/Seed Doctor Suite | Sentinel probes, seed contract tests, deploy-gate doctor checks | Production rollout safety |
| Games Completion Contract Tests | Server completion, XP idempotency, tenant leaderboard, i18n navigation | Reading/Primary game import |
| Claims Verification Gate | Product-page claim matrix, app-existence checks, stale-date checks | Public website accuracy |

## Acceptance Rule for Remediation Tracks

No Critical/High remediation track spawned from this review should close with only source-string or existence assertions. Required tests must exercise behavior, authorization, tenancy, persistence, and failure modes at the boundary that originally failed.
