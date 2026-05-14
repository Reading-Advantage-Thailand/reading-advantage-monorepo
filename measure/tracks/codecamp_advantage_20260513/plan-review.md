# Phase 3 Review: Implement GitHub Integration

**Commit range:** `dbcd9bf` → `HEAD`  
**Reviewer:** automated phase review  
**Date:** 2026-05-15

---

## Command Results

| Command | Status | Notes |
|---|---|---|
| `pnpm turbo run lint --filter=@reading-advantage/api --filter=@reading-advantage/webhooks --filter=@reading-advantage/domain` | ✅ Pass | 0 errors. 1 unused-var warning in `webhooks/src/__tests__/github-webhook.test.ts:19`. Pre-existing warnings in other packages. |
| `pnpm turbo run check-types --filter=@reading-advantage/api --filter=@reading-advantage/webhooks --filter=@reading-advantage/domain` | ❌ **FAIL** | 2 errors in `@reading-advantage/api` (see Critical #1). |
| `CI=true pnpm turbo run test --filter=@reading-advantage/api --filter=@reading-advantage/webhooks --filter=@reading-advantage/domain` | ✅ Pass | 138 domain, 78 api, 8 webhooks tests pass. |

---

## Findings

### 🔴 Critical

#### C1. `check-types` failure blocks merge (`@reading-advantage/api`)
- **`src/routers/codecamp.ts(339)`** — `getModulesByPhase` returns raw DB rows (`{ id, title, …, createdAt, updatedAt }[]`) that are missing the computed fields `lessonCount`, `completedLessons`, and `progress` required by `moduleResponseSchema`.
- **`src/__tests__/codecamp-router.test.ts(540)`** — `getPrReviewByPrUrl` is inferred in the built `.d.ts` as `Promise<PrReview>` (no `| null`). The test calls `mockResolvedValue(null)`, which TypeScript rejects because `null` is not assignable to `PrReview`.
- **Root cause:** Drizzle’s query-builder type for `const [result] = await db.select()…` does not include `| undefined` in the destructured element, so `return result ?? null` is collapsed to just `PrReview` in the emitted declaration.

#### C2. Webhook handler cannot look up existing PR reviews
- `packages/webhooks/src/github.ts` calls `getPrReviewByPrUrl` using `systemUser.id = "system"`.
- The domain function filters by `eq(codecampPrReviews.userId, user.id)`. Real reviews are created via the tRPC router with the logged-in user’s actual ID.
- **Impact:** `synchronize` events never find existing reviews (always fall through to the no-op branch). `opened` events also cannot be matched. The webhook is non-functional for its intended purpose.

#### C3. Runtime tRPC validation failure on `modulesByPhase`
- Because `getModulesByPhase` omits `lessonCount`, `completedLessons`, and `progress`, the tRPC `z.array(moduleResponseSchema)` output validation will throw at runtime when the endpoint is hit, producing 500 errors to clients.

---

### 🟠 High

#### H4. Incomplete LLM review pipeline
- `packages/domain/src/codecamp/review-exercise.ts` implements prompt building and LLM call via injected `generateReview`, but it does **not**:
  - Fetch the PR diff from the GitHub API.
  - Post review comments back to GitHub.
  - Update `codecamp_pr_reviews` with the review status/summary.
- The plan Phase 3 explicitly requires all three steps.

#### H5. Cross-tenant data leaks in admin queries
- `listInterns` selects **all** users with `role = "INTERN"` without filtering by `schoolId`.
- `getInternProgress` accepts any `userId` without verifying that the intern belongs to the caller’s tenant.
- **Violates** `measure/lessons-learned.md`: *“Cross-tenant authorization checks must be tested explicitly. `assertCan()` only checks role permissions; it does NOT verify school/class ownership.”*

#### H6. `createInternAccount` lacks duplicate-username guard
- Inserts directly into `users` without checking whether the username already exists.
- Will surface as an unhandled DB unique-constraint violation instead of a clean domain error.

---

### 🟡 Medium

#### M7. `getPrReviewByPrUrl` runtime nullability hidden from TypeScript
- Even though the function can and does return `null` at runtime, consumers of the built `.d.ts` do not see `| null` in the type.
- Callers may omit null checks, leading to potential runtime `null` dereferences in frontend or downstream code.

#### M8. `checkModulePrerequisite` assumes gapless ordering
- It looks up the previous module with `eq(codecampModules.order, targetModule.order - 1)`.
- If modules are ever reordered or gaps are introduced, prerequisite logic will reference the wrong module or return `canStart: true` incorrectly.

#### M9. `linkExerciseRepo` does not validate module existence
- Can create orphaned `codecamp_exercise_repos` rows that reference non-existent `moduleId`s.

#### M10. Zod version mismatch between `webhooks` and `api`
- `webhooks` depends on `zod ^4.4.3`; `api` depends on `zod ^3.24.0`.
- The schemas used are simple enough to be compatible today, but version drift is tech debt that can cause subtle runtime issues (e.g., different `ZodError` shapes).

---

### 🟢 Low

#### L11. Phase 6 admin domain functions landed early
- `createInternAccount`, `listInterns`, and `getInternProgress` are scoped to Phase 6 (“Implement Admin Dashboard”) but are already present in `packages/domain/src/codecamp/index.ts`.
- No tRPC routers expose them yet, so they are unreachable from the frontend, but they add scope bleed.

#### L12. Unused import in webhook test
- `packages/webhooks/src/__tests__/github-webhook.test.ts:19` — `createPrReview` is imported but never referenced. Already flagged by linter.

---

## Plan Compliance Summary

| Phase 3 Task | Status | Notes |
|---|---|---|
| Create GitHub App and configure credentials | ⚠️ Partial | `GITHUB_WEBHOOK_SECRET` env var referenced, but no `lib/github-app.ts` auth helper created. |
| Implement GitHub webhook endpoint | ⚠️ Partial | Hono route, signature verification, and payload parsing are present. PR review lookup is broken (C2); LLM job queuing is a TODO. |
| Implement LLM PR review pipeline | ⚠️ Partial | `reviewExercise` domain function exists with DI for `generateReview`, but missing GitHub diff fetch, comment posting, and DB update (H4). |
| Implement exercise repo management domain functions | ✅ Complete | `getExerciseRepos`, `linkExerciseRepo`, `getPrReviewsForUser` implemented. |
| Implement tRPC routers for new procedures | ⚠️ Partial | All procedures wired, but `modulesByPhase` has a runtime bug (C3). |
| Measure — User Manual Verification | ❌ Not done | Checkbox still unchecked in `plan.md`. |

---

## Recommended Fixes (in priority order)

1. **Fix `getModulesByPhase`** to compute `lessonCount`, `completedLessons`, and `progress` (mirror `getModulesWithProgress`), or introduce a dedicated `moduleListSchema` that omits computed fields and update the router accordingly.
2. **Fix `getPrReviewByPrUrl` nullability** by replacing `const [result] = …` with `const results = …; return results[0] ?? null;`. Array indexing forces TypeScript to include `| undefined`, which then widens to `| null`. Add an explicit return-type annotation `Promise<PrReview | null>`.
3. **Fix webhook PR lookup** by adding a system-scoped domain function (e.g., `getPrReviewByPrUrlSystem`) that queries by `prUrl` alone, or by looking up the codecamp user from the GitHub username in the payload.
4. **Complete the LLM review pipeline:** add a GitHub API client utility, fetch the PR diff, post comments, and call `updatePrReview` after LLM generation.
5. **Add tenant scoping** to `listInterns` and `getInternProgress`.
6. **Add duplicate-username guard** to `createInternAccount`.

---

*Review generated by automated phase review agent.*
