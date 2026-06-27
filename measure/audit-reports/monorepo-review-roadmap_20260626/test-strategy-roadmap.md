# Test Strategy Roadmap

## Principles

- Behavior tests over source-text assertions.
- Tenant tests must include at least two schools and fail when `schoolId` is missing.
- Route/API contract tests must validate status codes, response envelopes, auth requirements, and Zod errors.
- Provider tests must prove apps use adapters, not raw SDKs.
- Live production smoke tests are opt-in verification, not default CI gates.

## Workstreams

1. **Tenant Isolation Harness** — shared factories with `schoolId`, cross-tenant adversarial cases, TenantDB compiled/runtime parity.
2. **Shared Contract Test Package** — `@reading-advantage/types` test script; response envelope and role schema tests.
3. **Legacy Route Test Backfill** — Reading top 25 risky endpoints first; Primary crash/admin/flashcard/auth endpoints first.
4. **Provider Architecture Guards** — fail direct SDK imports and raw barrel leaks; test adapter behavior with mock providers.
5. **Migration Doctor Gates** — DB sentinels, Drizzle version alignment, seed contract checks, deploy migration parity.
6. **Games Completion Tests** — fire-once completion, server XP calculation, tenant leaderboard, i18n navigation, no localStorage-only persistence.
7. **Claims Verification Tests** — product count, stale launch dates, missing app directories, placeholder case-study checks.

## Minimum Gates for Closing Remediation Tracks

| Remediation type | Required tests |
|---|---|
| Auth/security | authenticated, unauthenticated, wrong-role, cross-tenant, rate-limit cases |
| Tenant/data | two-school isolation, owner FK checks, null-tenant fail-closed behavior |
| API contract | valid input, invalid input, domain error, response shape, status code |
| AI/storage adapter | mock provider success/failure, architecture import guard, no direct SDK |
| Migration/seed | fresh DB, existing DB, sentinel, seed validation, deploy doctor |
| UI/product claim | localized render, accessibility smoke, app-existence/claim matrix |
