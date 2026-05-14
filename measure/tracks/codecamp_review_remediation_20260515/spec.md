# Specification: Codecamp Review Remediation

**Track ID**: `codecamp_review_remediation_20260515`
**Type**: Bug/Security Fix
**Created**: 2026-05-15

## Overview

Remediate 5 High, 10 Medium, and 12 Low findings from the codecamp-advantage code review (2026-05-15). The fixes are prioritized by severity: security and data integrity first, then architectural violations, then UI/UX polish and test coverage gaps.

## Functional Requirements

### Security (Phase 1)

1. **H1 — Admin route protection**: `/admin/*` routes must be protected at the server level. Middleware must verify session and redirect non-admins. tRPC admin procedures must use a dedicated `adminProcedure` that checks `ctx.auth.user.role === "ADMIN"`.

2. **H2 — `updatePrReview` reviewedAt stamp**: The `reviewedAt` field must only be set when `reviewStatus` is not "pending". When re-triggering a review (setting status back to "pending"), `reviewedAt` must retain its previous value or be set to null.

3. **H4 — LLM prompt injection hardening**: The `reviewExercise` domain function must wrap PR diffs in markdown code-fence delimiters and include an explicit system-prompt instruction treating diff content as code, not instructions.

4. **H5 — Chat message role injection**: Remove `role` from `chatMessageInputSchema`. Client-submitted messages must always be `role: "user"`. If assistant messages need to be saved from the streaming route, use an internal function or separate schema.

### Architecture & Access Control (Phase 2)

5. **H3 — Chat route bypasses domain layer**: Refactor `/api/chat/route.ts` to call domain functions (`getModuleBySlug`, `getLessonWithContent`) or a new `codecampChatContext` domain function instead of querying raw `db`. Add `assertCan(user, "codecamp:chat", tenant)`.

6. **M1 — Admin tRPC procedures**: Replace `protectedProcedure` with `adminProcedure` on `createIntern`, `listInterns`, and `getInternProgress`.

7. **M7 — Dual authorization on reviewExercise**: Remove the manual role check in the router (`ctx.auth.user.role !== "ADMIN" && ctx.auth.user.role !== "SYSTEM"`) and rely on the domain layer's `assertCan(user, "admin:dashboard", tenant)`.

8. **M8 — In-memory rate limiter**: Replace the custom `Map`-based rate limiter in the chat route with `checkRateLimit` from `@reading-advantage/auth` or a bounded LRU cache.

### Data Integrity & Type Safety (Phase 3)

9. **M3 — `getExerciseRepos` type mismatch**: Change `DomainInput<{ moduleId: string }>` to `DomainInput<{ moduleId?: string }>`.

10. **M4 — Duplicate PR review prevention**: Add duplicate check in `createPrReview` domain function: query for existing review with same `prUrl` before inserting, or add a unique DB constraint.

11. **M9 — `createPrReview` uses `codecamp:read`**: Change permission from `codecamp:read` to a more appropriate permission. Validate that `exerciseRepoId` exists.

12. **M10 — Redundant `allModules` recomputation**: Move the `allModules` computation outside the `PHASE_ORDER.map()` callback in `page.tsx`.

13. **L10 — `listInterns` in-place `.sort()`**: Change `internProgress.sort(...)` to `[...internProgress].sort(...)` or `internProgress.toSorted(...)`.

14. **L11 — Unsafe JSONB type assertions**: Add runtime validation (Zod `.parse()` or `Array.isArray()`) on `contentJson`, `hintsJson`, and `optionsJson` in the domain layer.

### UI/UX Fixes (Phase 4)

15. **L4 — Array index React key**: Use `section.heading ?? index` as key in `LessonContent`.

16. **L5 — Unsafe `as TheorySection[]` cast**: Add a `.filter()` guard for non-null objects with expected fields.

17. **L6 — SSH clone by default**: Show HTTPS clone command by default, offer SSH as an alternative in `fork-instruction.tsx`.

18. **L7 — Disabled Link keyboard nav**: When locked, render the button without `asChild` or add `tabIndex={-1}` and `aria-disabled`.

19. **L8 — Missing ARIA labels**: Add `aria-label` to chat input, PR URL input, and admin table.

20. **L9 — Import after function body**: Move `import { getPrDisplayName }` from line 59 to the top of `review-history.tsx`.

### Test Coverage (Phase 5)

21. **M5 — `github-client.ts` unit tests**: Create `packages/webhooks/src/__tests__/github-client.test.ts` with unit tests for `verifyWebhookSignature`, `generateAppJWT`, `parsePrUrl`, `fetchPrDiff`, and `postPrComment`.

22. **M6 — `parsePrUrl` SSRF hardening**: Validate that `owner` and `repo` match `^[a-zA-Z0-9\-_.]+$` after parsing, or use `encodeURIComponent()`.

### Low Priority (Deferred)

The following Low items are documented but **out of scope** for this track:
- **L1** — Stale file header (trivial, cosmetic)
- **L2** — Old seed slugs (requires manual DB cleanup, track separately)
- **L3** — Exercise repos for modules without exercises (design decision, not a bug)
- **L12** — `createInternAccount` sets `schoolId: null` (intentional for codecamp's global nature, document in comments)
- **M2** — Quiz auto-progress raw `fetch()` (needs investigation: domain function may already persist progress)

## Acceptance Criteria

1. All 5 High findings are resolved with tests.
2. Admin routes return 403/redirect for non-admin users at the HTTP middleware level and the tRPC level.
3. `reviewedAt` is never set for "pending" reviews.
4. PR diffs are wrapped in delimiters with anti-injection system prompt.
5. Clients cannot inject `role: "assistant"` via `chatMessageInputSchema`.
6. Chat route uses domain functions and TenantDB, not raw `db`.
7. All existing tests continue to pass (`pnpm turbo run test`).
8. Type checking passes (`pnpm turbo run check-types`).
9. Lint passes (`pnpm turbo run lint`).

## Out of Scope

- L1 (stale comment), L2 (seed slug cleanup), L3 (repos without exercises), L12 (deliberate schoolId:null)
- M2 (quiz raw fetch) — requires investigation of whether `submitQuizAnswers` already persists progress
- Integration tests against real DB (known gap per tech-debt)
- Redis-backed rate limiter (production concern, use auth package's `checkRateLimit` for now)