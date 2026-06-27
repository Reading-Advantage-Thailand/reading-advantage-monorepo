# Critical/High Remediation Plan

> **Track:** `monorepo_review_roadmap_20260626`

## Wave 0 — Make shared guarantees true

1. **Tenant Registry + TenantDB Fail-Closed**
   - Owners: `packages/db`, `packages/domain`, `packages/api`.
   - Sources: M-SF-1, M-SF-2, CAX-2, MR-C01.
   - Blocks: Reading/Primary tenant migration, CodeCamp/Sales/Games tenant claims.
2. **Shared Auth/Role/Rate-Limit Hardening**
   - Owners: `packages/auth`, `packages/auth-client`, `packages/api`.
   - Sources: M-SF-5, CAX-1, MR-C02.
   - Blocks: Sales tRPC correctness, Marketing auth, app-wide login security.
3. **Shared Contracts and Types Test Package**
   - Owners: `packages/types`, `packages/domain`, `packages/api`.
   - Sources: M-SF-1, M-SF-4, CAX-3, MR-C04.

## Wave 1 — Stop active high-risk app failures

4. **Primary Core Stabilization**
   - Fix undefined session/update crashes, admin CRUD/commented UI, flashcard schema mismatch, unprotected routes, tenant scoping.
   - Sources: Primary M1-M6, M8, M11.
5. **Reading Critical Security + XP Idempotency**
   - Tenant/ownership checks, unauthenticated system endpoints, audit logs, XP double-award race, AI assessment/content validation.
   - Sources: Reading C-1..C-5, PB-1..PB-3.
6. **CodeCamp Runtime Reliability**
   - CodeCamp TenantDB unscoped fixes, false-green tests, webhook async/idempotency/DLQ, streaming protocol verification.
   - Sources: CodeCamp executive summary, CAX-4, shared M-SF-9.
7. **Sales Security/Privacy**
   - Role enum, IDOR/cross-tenant reporting, audio validation/privacy/consent, XSS, contract drift.
   - Sources: Sales C1-C13, CAX-1/CAX-3/CAX-5.

## Wave 2 — Restore deployment/test/provider confidence

8. **Migration/Seed Governance**
   - Sentinels, Drizzle alignment, deploy doctor, Science seed/build fixes, CodeCamp backfill safety.
9. **Provider Adapter Enforcement**
   - AI barrel leak, direct SDK removal, storage semantics, observability boundary.
10. **Monorepo Test Signal Restoration**
   - Tenant harness, contract tests, route/domain tests, provider guards, migration doctor tests, games completion tests.

## Wave 3 — Product-facing truth and reusable surfaces

11. **Website Claims + Marketing API Security**
   - Correct public claims, stale dates, placeholder case studies; secure marketing data/AI routes.
12. **Advantage Games Import Readiness**
   - Completion contract, XP idempotency, tenant leaderboard, i18n/embeddable navigation, shared runtime package.

## Wave 4 — App security & correctness backlog (Medium+)

13. **Per-App Security/Correctness Completion**
   - Close remaining Medium+ security/tenant/authz/contract/correctness tracks not in Wave 1.
   - Sources: Science ST-1/ST-2/ST-4, SP-3; Reading M-RA-SEC-6..10 / PB-4..8; CodeCamp MT-8..11/13/14; Sales T5/T8/T9; Primary M7/M9; www T9.

## Wave 5 — Public surface completion

14. **Public Website + Marketing Surface + Deploy Correctness**
   - Finish non-claims www defects (forms, SEO, assets, i18n, a11y, comparison/pricing, nav, contact, test hygiene), marketing schema/UX/i18n, and Science build/deploy de-Prisma.
   - Sources: www T1/T2/T3/T6/T8/T11..T17; marketing schema_integrity/ux_error_handling/i18n; Science ST-6.

## Wave 6 — Quality, i18n, accessibility, adapters & docs completion

15. **Medium Maintainability/Adapter/i18n/Docs Completion**
   - Close remaining Medium tracks: shared M-SF-6; Primary M10/M12/M13; Sales T10/T11; Science ST-5/ST-7/ST-8/SP-2; CodeCamp curriculum MT-C1..C4 + MT-X1; marketing test backfill; Games T5-T10.

> **Full Medium-and-above coverage** is tracked in `medium-plus-coverage-matrix.md`. Waves 4–6 exist so no Medium+ migration track is left unowned; Low-severity items are explicitly deferred there.

## Do Not Start Before Prerequisites

- Do not import games into Reading/Primary before Wave 0 tenant/contracts and Games Wave 3 readiness.
- Do not claim Sales/CodeCamp production readiness before Wave 1 runtime/security tracks.
- Do not use website claims as product facts until Wave 3 claims gate is complete.
