# Plan Review: codecamp_advantage_20260513

**Reviewer**: Design review (pre-implementation)
**Date**: 2026-05-13
**Status**: Findings raised while implementation is in progress

## Verification Checks

- [x] Plan Compliance: Partial — Phase 1 work already done but plan status markers are stale
- [x] Style Compliance: Pass — schema/types follow codebase conventions
- [ ] Spec-Plan Consistency: Fail — several conflicts (see findings)

## Findings

### [High] Codecamp tables lack `schoolId` — multi-tenancy mismatch with domain function signatures

- **File**: `packages/db/src/schema/codecamp.ts`
- **Context**: All existing domain-scoped tables (users, classrooms, articles) have `schoolId`. The codecamp tables don't. The plan's domain function signatures include `tenant: Tenant` and use `TenantDB`, but the `TenantDB` proxy will silently pass through queries without scoping since these tables have no `schoolId` column. This is probably correct for an internal training tool (codecamp is school-agnostic), but it should be a deliberate choice, not an accident. The plan doesn't acknowledge this deviation.
- **Suggestion**: Either (a) add `schoolId` to codecamp tables if per-school curricula/progress are needed, or (b) document in the spec that codecamp is intentionally single-tenant and use plain `DB` instead of `TenantDB` in domain functions, or (c) keep `TenantDB` but add a comment explaining why it's a no-op for these tables.

### [High] Quiz design contradiction: static schema vs. LLM-generated quizzes

- **File**: Spec FR #4 says "LLM-generated quizzes" + "Adaptive difficulty"; `packages/db/src/schema/codecamp.ts` has static `codecamp_quiz_questions` table; Plan Phase 3 seeds static curriculum data
- **Context**: The spec promises dynamically generated, adaptive-difficulty quizzes. The schema stores static questions. The plan seeds them statically. These are fundamentally different designs. Static quizzes can't be adaptive.
- **Suggestion**: Decide: either (a) commit to static, pre-seeded quizzes (simpler, testable, reliable) and update the spec to drop "LLM-generated" and "adaptive difficulty", or (b) add an LLM-generated quiz pipeline and drop the static `codecamp_quiz_questions` table in favor of runtime generation (more complex, untestable). Option (a) is recommended for MVP.

### [High] Exercise evaluation has no execution sandbox

- **File**: Spec FR #2; Plan Phase 3 "LLM evaluates submitted code against acceptance criteria"
- **Context**: The spec says "LLM evaluates submitted code." LLMs are unreliable at evaluating code correctness — they can't execute code, they pattern-match. The `expectedOutput` field in the schema suggests output matching, but there's no sandbox runtime planned. For exercises like "Write a domain function that uses assertCan() and db.insert()", there's no way to verify the code actually works.
- **Suggestion**: Either (a) frame exercises as "code review" challenges where interns write code and get LLM feedback (not automated pass/fail), or (b) integrate a sandboxed execution environment (e.g., Docker + Node.js eval), or (c) use pattern-matching against expected output strings for simple exercises. Option (a) is most honest for MVP.

### [Medium] Chat streaming bypasses tRPC — needs explicit documentation

- **File**: Plan Phase 3: `apps/codecamp-advantage/app/api/chat/route.ts` using AI SDK `streamText`
- **Context**: The architecture says "tRPC is the primary product backend interface." The chat streaming endpoint is a raw Next.js route handler, not a tRPC procedure. This is technically correct (streaming over HTTP is better than tRPC), but it breaks the architectural convention. The AGENTS.md says "Hono is only for external HTTP boundaries" — this is a Next.js route handler, not Hono, and it's an internal boundary.
- **Suggestion**: Document this as a deliberate exception. Consider whether chat persistence (saveChatMessage/getChatHistory) should remain in tRPC (yes) while streaming stays as a route handler. Add a note to `tech-stack.md` or the spec explaining the split.

### [Medium] Architecture Walkthroughs (FR #3) have no implementation path

- **File**: Spec FR #3; Plan Phase 3 has no specific task for this
- **Context**: FR #3 describes "Interactive tours of the monorepo's architecture" with "Visual diagrams + LLM narration" and "Progressive disclosure." The plan has no task for building walkthrough components, no table for storing walkthrough state, and no UI task that covers this feature. It would just be content in `contentJson`, but the spec's description implies a dedicated interactive component.
- **Suggestion**: Either (a) reduce FR #3 to "architecture lessons use contentJson with embedded diagrams" and clarify that "walkthroughs" are just rich content pages, or (b) add a dedicated task with a spec for the walkthrough component (architecture diagram + expandable layers). Option (a) keeps scope manageable.

### [Medium] Phase 1 status markers are stale

- **File**: `measure/tracks/codecamp_advantage_20260513/plan.md`
- **Context**: `packages/db/src/schema/codecamp.ts` (109 lines, fully implemented), `packages/types/src/codecamp.ts` (178 lines, fully implemented), and both are exported from their index files. But Phase 1 only marks Task 1 as `[~]` while Tasks 2 and 3 are `[ ]`. The Zod contracts in `packages/types/src/codecamp.ts` are comprehensive and match the plan's requirements.
- **Suggestion**: Update plan markers to reflect actual state. Task 1 and Task 2 appear substantially complete. Task 3 (shared package wiring) is partially done (types exported, but domain barrel and router import paths not yet reserved).

### [Medium] No `schoolId` on codecamp tables means `assertCan()` checks may be insufficient

- **File**: `packages/db/src/schema/codecamp.ts`
- **Context**: Lessons learned note: "Cross-tenant authorization checks must be tested explicitly. `assertCan()` only checks role permissions; it does NOT verify school/class ownership. Every domain function that queries by caller-supplied ID needs an ownership guard." Since codecamp tables have no `schoolId`, there's no ownership to verify. But this means any authenticated user from any school can access any codecamp data. For an intern training tool, this may be fine — but it should be explicit.
- **Suggestion**: Add a spec note that codecamp data is globally accessible to all authenticated users, and that `assertCan()` only gates on role (e.g., only STUDENT/TEACHER can access, not unauthenticated).

### [Low] Missing error handling strategy for LLM failures

- **File**: Plan Phase 3 "Implement LLM integration"
- **Context**: No mention of handling LLM API failures (rate limits, timeouts, malformed responses). The codebase's existing AI usage has inconsistent error handling across apps.
- **Suggestion**: Add a task or subtask for LLM error handling: timeout limits, retry logic, graceful degradation (e.g., "AI tutor is unavailable, try again later" message), and rate limiting per user.

### [Low] No pagination for chat history or module lists

- **File**: `packages/types/src/codecamp.ts`
- **Context**: `chatMessageInputSchema` and module queries have no pagination parameters. As curriculum grows, unbounded queries will become a problem.
- **Suggestion**: Add `limit`/`offset` or cursor-based pagination to chat history and module listing schemas. Follow the existing pattern from `listUsers` which has `limit`/`offset`.

### [Low] Scope is very large for a single track

- **File**: Spec has 6 functional requirements, 5 curriculum modules, 8+ domain functions, 6+ UI pages, LLM integration, and seeding
- **Context**: The estimated_tasks is 20 but the actual work is likely 30-40+ subtasks. This risks the track dragging on or shipping incomplete.
- **Suggestion**: Consider splitting into two tracks: (1) Core CRUD + UI (schema, domain functions, routers, basic pages, progress tracking) and (2) LLM features (chat tutor, exercise evaluation, quiz generation). This would let the first track ship a working app faster.

## Recommendation

Fix the **High** severity findings before Phase 2 completes. Specifically:

1. **Decide on multi-tenancy** for codecamp tables and document the choice
2. **Resolve the quiz design contradiction** — commit to static or dynamic, update spec accordingly
3. **Reframe exercise evaluation** — LLM-as-reviewer, not LLM-as-autograder, or add a sandbox

The Medium findings (stale plan markers, walkthrough scope, chat architecture) should also be addressed but are less blocking.
