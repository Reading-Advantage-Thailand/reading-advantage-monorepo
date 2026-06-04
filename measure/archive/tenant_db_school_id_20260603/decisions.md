# ADR: TenantDB & schoolId Adoption — Path Selection

## Status

**Accepted** — 2026-06-04

## Context

The 2026-06-03 AGENTS.md compliance audit found:
- 0 `schoolId` predicates in any of 27 science-advantage `route.ts` files
- 17 `science_*` tables with no `schoolId` column
- No usage of `createTenantDB` from `packages/domain/src/db-contract.ts`
- User-centric model (teacher ownership + enrollment membership) instead of school-level isolation

Two concrete risks:
1. **Stale teacher ownership**: teacher transfer doesn't revoke prior class access
2. **Cross-school student access**: join-code model permits cross-school enrollment

## Decision

**Path (a) — AGENTS.md Compliant Migration**

Add `schoolId NOT NULL` to all 17 science tables, backfill existing data, and migrate all domain functions to use `createTenantDB`.

## Rationale

- **AGENTS.md compliance**: "Every query must be scoped by `schoolId`" is a hard requirement
- **District procurement**: SOC 2 / GDPR data isolation per school is a sales blocker
- **Structural enforcement**: `createTenantDB` auto-injects tenant predicates — no reliance on developer memory
- **Regression prevention**: `tenant-coverage.test.ts` enforces that every new domain function gets a tenant guard
- **Track 1 complete**: All domain modules exist in `packages/domain/src/` — the migration target is ready

## Alternatives Considered

### Path (b) — Documented Deviation
- Quick (~1 day) but doesn't solve the problem
- Leaves structural gap open — each domain author must remember predicates
- Blocks district procurement indefinitely
- Rejected because the long-term cost exceeds the migration investment

## Implementation Plan

1. Schema migration: add `schoolId UUID NOT NULL` to 17 tables + composite indexes
2. Backfill: derive `schoolId` from `users.schoolId` via FK chains
3. Domain adoption: wrap all domain functions with `createTenantDB`
4. Coverage test: `tenant-coverage.test.ts` enforces tenant guards
5. Acceptance test: 2-school fixture confirms cross-school isolation

## Risks

- **Backfill joins on NULL `users.schoolId`**: Mitigated by pre-migration data audit + quarantine
- **Script `db` imports need `withSchoolContext`**: Mitigated by dedicated wrapper for cron/backfill
- **17 tables touched in one migration**: Mitigated by reversible migration + test DB verification
