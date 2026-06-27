# Migration Roadmap

## Lane A — Shared Foundation First

1. Tenant registry, fail-closed TenantDB, referential-scope test hardening.
2. Shared role/schema/contract parity and `@reading-advantage/types` tests.
3. API/domain separation and router contract/error cleanup.
4. Auth monitor hardening: Postgres-backed rate limiter, CSRF/cookie policy, auth-client validation.

## Lane B — Legacy App Modernization

1. Reading Advantage: tenant scoping → auth endpoints → audit logging → domain migration → Zod validation → tests.
2. Primary Advantage: crash/admin/flashcard fixes → auth/tenant → Prisma/artifact cleanup → dashboard truth → adapter compliance.

## Lane C — Newer App Hardening

1. Science Advantage: gamification/lib-services tenancy, Sentry/observability boundary, seed/build cleanup, docs truth-up.
2. CodeCamp Advantage: TenantDB runtime fix, webhook job/DLQ/idempotency, streaming protocol, curriculum standard alignment.
3. Sales Advantage: role enum/auth, IDOR/cross-tenant reporting, audio/AI privacy, input hardening, schema nullability.
4. Marketing App: authz/Zod boundaries, AI adapter, schema integrity, UX/i18n/test truth.

## Lane D — Product Surface Alignment

1. Company website claim correction and product-owner verification.
2. Advantage Games shared runtime and import contract.
3. Shared UI/type utility consolidation.

## Dependency Graph

```text
Lane A Tenant/Auth/Contracts
  ├─> Reading modernization
  ├─> Primary modernization
  ├─> CodeCamp/Sales runtime hardening
  └─> Advantage Games import readiness

Provider adapter enforcement
  ├─> Reading/Primary AI+storage cleanup
  ├─> Marketing video pipeline hardening
  └─> Sales multimodal evaluator hardening

Test signal restoration
  └─> Required closeout gate for every lane
```
