# Implementation Plan

## Phase 1: TenantDB Wrapper
- [ ] Task: Create TenantDB Wrapper
  - [ ] Write unit tests for TenantDB wrapper enforcing tenant ID logic
  - [ ] Implement `TenantDB` in `packages/domain/src/db-contract.ts`
- [ ] Task: Refactor Domain Functions
  - [ ] Update assignments domain functions to use TenantDB
  - [ ] Update classes domain functions to use TenantDB
  - [ ] Ensure all domain tests pass with the new signature
- [ ] Task: Measure - User Manual Verification 'Phase 1: TenantDB Wrapper' (Protocol in workflow.md)

## Phase 2: Branded Type Contracts
- [ ] Task: Define Branded Types
  - [ ] Define `PolymorphicQuestionId` and `ExternalLessonId` in `packages/types/src/index.ts`
- [ ] Task: Apply Branded Types to Domain
  - [ ] Update parameters in lesson and question domain functions to require branded types
  - [ ] Update tests to properly cast test data to branded types
- [ ] Task: Measure - User Manual Verification 'Phase 2: Branded Type Contracts' (Protocol in workflow.md)

## Phase 3: tRPC Output Contracts
- [ ] Task: Enforce Output Contracts
  - [ ] Identify all endpoints in `packages/api/src/routers/*.ts` lacking `.output()`
  - [ ] Apply exact `@reading-advantage/types` response schemas to all queries and mutations
  - [ ] Verify endpoints correctly strip extraneous data via tests
- [ ] Task: Measure - User Manual Verification 'Phase 3: tRPC Output Contracts' (Protocol in workflow.md)

## Phase 4: Boundary Validation
- [ ] Task: Eradicate Unsafe Casts
  - [ ] Replace `as any` casts in `reading-advantage/lib/session.ts` with `z.parse()`
  - [ ] Identify and replace remaining cross-boundary `as any` usages with Zod schema parsing
- [ ] Task: Measure - User Manual Verification 'Phase 4: Boundary Validation' (Protocol in workflow.md)
