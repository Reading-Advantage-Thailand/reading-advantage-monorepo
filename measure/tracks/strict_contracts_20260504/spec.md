# Specification: Implement Strict Contracts

## Overview
This track addresses recurring bugs and tech debt by enforcing strict data and authorization contracts across the monorepo. It transitions the team from relying on "developer memory" (e.g., remembering to filter by tenant, remembering to not leak fields) to compile-time structural guarantees using Zod and Drizzle wrappers.

## Functional Requirements
1. **TenantDB Contract:** 
   - Create a `TenantDB` wrapper around Drizzle in `packages/domain` that automatically injects `where: eq(table.schoolId, tenant.schoolId)` into `select`, `update`, and `delete` operations for tenant-scoped tables.
   - Refactor core domain functions (e.g., `assignments`, `classes`) to require `TenantDB` instead of the raw `Drizzle` instance.
2. **Branded Type Contracts:**
   - Introduce Zod branded types (`PolymorphicQuestionId`, `ExternalLessonId`) in `packages/types/src/index.ts`.
   - Update domain functions to accept these branded types instead of `string`, enforcing application-layer integrity for relations that lack Foreign Keys.
3. **tRPC Output Contracts:**
   - Update all endpoints in `packages/api/src/routers/*.ts` to explicitly define an `.output(schema)` contract to prevent accidental data leakage from the domain layer.
4. **Boundary Validation:**
   - Replace unsafe `as any` casts (such as those in `reading-advantage/lib/session.ts` for `teacherClassrooms`) with strict `z.parse()` boundary contracts.

## Acceptance Criteria
- [ ] `packages/domain/src/db-contract.ts` (or similar) exports a `TenantDB` wrapper.
- [ ] At least 3 core domain entities (`assignments`, `classes`, `users`) utilize `TenantDB` for cross-tenant query protection.
- [ ] `@reading-advantage/types` exports `PolymorphicQuestionId` and `ExternalLessonId` branded types.
- [ ] The TypeScript compiler strictly rejects raw strings passed to domain functions expecting branded IDs.
- [ ] Every tRPC endpoint in `packages/api` has an explicitly defined `.output()` modifier.
- [ ] All tests pass (`pnpm turbo run test`), including explicit cross-tenant unauthorized access tests.

## Out of Scope
- Migrating the legacy `reading-advantage` Prisma schemas to Drizzle (this is tracked separately).
- Implementing Zod-OpenAPI for Hono webhooks (deferred to a subsequent track to limit scope).
