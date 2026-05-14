# Phase Code Review Findings

## Phase: Generate Docs & Doctor

**Reviewer:** change-quality-reviewer subagent  
**Date:** 2026-05-15  
**Revision Range:** `0be2194..HEAD`

---

### Findings

#### Medium

- **`plan.md` — Phase 8 commit hash annotations shifted by one.** The commit hashes for "Run architectural linting" and "Verify build" were initially misaligned (pointing to prior plan-update commits rather than the commits for those tasks). Fixed in follow-up commit.

#### Low

- **Phase 8 "Run architectural linting" omits app-level tests.** The task list originally recorded package tests (`@reading-advantage/domain`, `api`, `webhooks`) but did not list `pnpm turbo run test --filter=codecamp-advantage`. Added to the completed task record.

---

### Verification Results

| Command | Result |
|---|---|
| `pnpm turbo run lint --filter=codecamp-advantage` | 9 successful, 0 errors |
| `pnpm turbo run check-types --filter=codecamp-advantage` | 7 successful, 0 type errors |
| `pnpm turbo run test --filter=codecamp-advantage` | 39 passed (5 test files) |
| `pnpm turbo run build --filter=codecamp-advantage` | 9 successful, all routes generated |

---

### Resolution

Both findings addressed. No Critical or High findings. Phase approved for checkpoint.

---

## Phase 8: Generate Docs & Doctor (Follow-up Review)

**Reviewer:** change-quality-reviewer subagent  
**Date:** 2026-05-15  
**Revision Range:** `9392e50~1..HEAD`

### Findings

#### Medium

- **`packages/api/src/routers/codecamp.ts` (`reviewExercise`) — Missing test for admin guard.** A new ADMIN/SYSTEM role guard was added to the `reviewExercise` mutation, but `codecamp-router.test.ts` has zero test cases for this procedure. Every other admin-protected procedure in the same router has an explicit `"maps AuthError to FORBIDDEN"` test.

#### Low

- **`packages/api/src/routers/codecamp.ts` (`reviewExercise`) — Inline role check instead of domain `assertCan`.** The router uses an inline `ctx.auth.user.role !== "ADMIN"` check rather than delegating auth to the domain function's `assertCan`. Inconsistent with the rest of the codecamp router.
- **`apps/codecamp-advantage/app/api/chat/route.ts` — Duplicated LLM client pattern.** `createOpenAI` + `generateObject` boilerplate duplicates the LLM client pattern in `packages/webhooks/src/github.ts`. No shared LLM review utility exists.

### Verification Results

| Command | Result |
|---|---|
| `pnpm turbo run lint --filter=codecamp-advantage` | 9 successful, 0 errors |
| `pnpm turbo run check-types --filter=codecamp-advantage` | 7 successful, 0 type errors |
| `pnpm turbo run test --filter=codecamp-advantage` | 39 passed (5 test files) |
| `pnpm turbo run test --filter=@reading-advantage/api` | 86 passed (13 test files) |

### Resolution

- **Medium finding fixed** in commit `b6e36eb`: Added 3 tests for `reviewExercise` — admin access allowed, SYSTEM access allowed, non-admin rejected with FORBIDDEN. Also fixed `reviewResultSchema` mock to provide `parse()` for tRPC output validation.
- Low findings documented for future cleanup (inline role check consistency, shared LLM utility).
- No Critical or High findings remain. Phase approved for checkpoint.
