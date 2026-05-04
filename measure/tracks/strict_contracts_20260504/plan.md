# Implementation Plan

## Phase 1: TenantDB Wrapper
- [x] Task: Create TenantDB Wrapper [247de12]
  - [x] Write unit tests for TenantDB wrapper enforcing tenant ID logic
  - [x] Implement `TenantDB` in `packages/domain/src/db-contract.ts`
- [x] Task: Refactor Domain Functions [2e2e85e]
  - [x] Update assignments domain functions to use TenantDB
  - [x] Update classes domain functions to use TenantDB
  - [x] Update users, students, progress, reports, articles domain functions to use TenantDB
  - [x] Extract users domain functions from tRPC router
  - [x] Ensure all domain tests pass with the new signature
- [x] Task: Measure - User Manual Verification 'Phase 1: TenantDB Wrapper' (Protocol in workflow.md)

## Phase 2: Branded Type Contracts
- [x] Task: Define Branded Types [ace2a06]
  - [x] Define `PolymorphicQuestionId` and `ExternalLessonId` in `packages/types/src/index.ts`
- [x] Task: Apply Branded Types to Domain
  - [x] Update parameters in lesson and question domain functions to require branded types
  - [x] Update tests to properly cast test data to branded types
- [x] Task: Measure - User Manual Verification 'Phase 2: Branded Type Contracts' (Protocol in workflow.md)

## Phase 3: tRPC Output Contracts
- [x] Task: Enforce Output Contracts
  - [x] Identify all endpoints in `packages/api/src/routers/*.ts` lacking `.output()`
  - [x] Apply exact `@reading-advantage/types` response schemas to all queries and mutations
  - [x] Verify endpoints correctly strip extraneous data via tests
- [x] Task: Measure - User Manual Verification 'Phase 3: tRPC Output Contracts' (Protocol in workflow.md)

## Phase 4: Boundary Validation
- [x] Task: Eradicate Unsafe Casts
  - [x] Add `sessionUserSchema` with `z.parse()` boundary validation to `reading-advantage/lib/session.ts`
  - [x] Export `SessionUser` type from session module for downstream consumers
  - [x] Remove `role as Role` and `role as string` casts in `auth-controller.ts`
  - [x] Replace `(req as any).session` pattern with `ExtendedNextRequest` in SRS metrics routes
  - [x] Replace `(req as any).params` pattern with typed `RequestWithParams` in classroom accuracy route
- [x] Task: Measure - User Manual Verification 'Phase 4: Boundary Validation' (Protocol in workflow.md)

## Summary

All four phases of the strict contracts track are complete:

1. **TenantDB Wrapper**: Proxy-based auto-injection of `schoolId` tenant scoping across all domain functions. 15 unit tests cover the wrapper, and all 51 domain tests pass.

2. **Branded Types**: `PolymorphicQuestionId` and `ExternalLessonId` branded Zod types defined in `packages/types` and applied to progress domain functions. Type-level distinctness prevents accidental mixing of ID kinds.

3. **tRPC Output Contracts**: Every endpoint in all 8 routers now has an explicit `.output()` schema from `@reading-advantage/types`. Tests verify that extraneous fields (e.g. `password`, `updatedAt`) are stripped at the API boundary. 23 API tests pass.

4. **Boundary Validation**: `getCurrentUser` now validates its return value with `sessionUserSchema.parse()` before crossing the auth→frontend boundary. Unsafe `as any` casts on `req.session` and `req.params` in API routes were replaced with proper `ExtendedNextRequest` typing.
