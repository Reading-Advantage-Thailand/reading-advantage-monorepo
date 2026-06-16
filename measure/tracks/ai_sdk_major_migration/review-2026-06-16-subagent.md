# Code Review — ai_sdk_major_migration — 2026-06-16

## Summary of Changes

In the last 24 hours the track moved through Phase 4 (Validate & Close) and an adversarial audit. Key commits:

- **`6580970c`** — Added Phase 4 closeout-artifacts contract (`phase-12-closeout-artifacts.test.ts`) requiring `artifacts/gate-result.json`, `outdated.json`, `audit.json`, and a `measure/tech-stack.md` version row.
- **`512f834f`** — Captured the first set of closeout artifacts and updated `tech-stack.md` with the selected AI SDK majors.
- **`52e3c900`** — Fixed a pre-existing ESLint `no-regex-spaces` error in `phase-11-sdk-version-contract.test.ts` so `@reading-advantage/ai#lint` exits clean.
- **`ed6716ac`** — Aligned the closeout test with spec intent:
  - Replaced the aggregate `exitCode === 0` assertion with a `migrationScopeCheck` block check (AC #3/#4/#9).
  - Filtered `outdated.json` by legacy (non-selected) majors instead of rejecting any `@ai-sdk/*` row (AC #8).
- **`73e38bc1` / `5891867c` / `d143ba62`** — Closed pre-existing gate blockers outside the migration scope: added `@types/bcryptjs` to `packages/auth`, added an ESLint flat config to `apps/marketing`, and added closeout artifacts for the archived `audit_log_retention_dsar_20260605` track.
- **`85e1be2b`** — Added `packages/auth/vitest.config.ts` to exclude `dist/` from test discovery, removing 11 duplicate/stale auth test failures.
- **`725c293a`** — Adversarial Phase 4 audit:
  - Fixed two production-blocker bugs: missing `await` on `streamText(...)` in `apps/codecamp-advantage/app/api/chat/route.ts` and `apps/reading-advantage/server/controllers/stories-assistant-controller.ts`.
  - Added three regression-net tests (`phase-13-adversarial-*`) covering the `streamText` await contract, arch-guard regex completeness, and `gate-result.json` anti-fabrication checks.
  - Filed a tech-debt entry for deferred tool-calling support.

## Spec Alignment

**Met** for all acceptance criteria within the migration scope:

| AC | Status | Evidence |
|----|--------|----------|
| #1 — `@ai-sdk/*` on target majors | Met | Manifests + lockfile resolve single majors: `ai ^5.x`, `@ai-sdk/openai ^2.x`, `@ai-sdk/google ^2.x`, `@ai-sdk/google-vertex ^3.x`, `@ai-sdk/provider-utils ^3.x`, `@ai-sdk/react ^2.x`. `phase-11-sdk-version-contract.test.ts` passes. |
| #2 — Adapter updated for new API | Met | `AIClient.streamText` implemented; v5 call shape (`maxOutputTokens`, `experimental_generateImage`) adopted across OpenAI/Google/OpenRouter providers. `phase-stream-text-contract.test.ts` passes. |
| #3 — `check-types` clean | Met in scope | `@reading-advantage/ai` and `@reading-advantage/auth` `check-types` exit 0. |
| #4 — AI-dependent tests pass | Met | `@reading-advantage/ai`: 192 passed, 3 skipped, 0 failed (verified live). |
| #5 — No direct `@ai-sdk` imports in apps | Met | `phase-arch-no-direct-sdk.test.ts` passes; zero `from "ai"` / `from "@ai-sdk/..."` imports in `apps/**` source. |
| #6 — Streaming/structured output verified | Partial | Streaming and structured output verified; tool calling explicitly deferred to tech-debt (now recorded). |
| #7 — Generate/embed verified | Met | `runAIClientContract` + per-provider v2-shape tests pass. |
| #8 — No legacy major holdouts | Met | `outdated.json` has 6 `@ai-sdk/*` / `ai` rows, all on migration-selected majors; zero legacy (v1/v4) majors. |
| #9 — No new advisories from upgrade | Met | `audit.json` captured; no AI-adjacent advisories introduced by the migration. |
| #10 — `tech-stack.md` updated | Met | Row declares `ai ^5.x`, `@ai-sdk/openai ^2.x`, `@ai-sdk/google ^2.x`, `@ai-sdk/google-vertex ^3.x`, and tags the track ID. |

The aggregate monorepo gate (`pnpm turbo run lint test check-types build`) still exits 1, but the sole remaining failure (`@reading-advantage/auth#test`) is pre-existing and owned by archived tracks, not this migration. The track's plan correctly scopes acceptance to the migration surface.

## Code Quality Observations

**Strengths**
- The adversarial audit caught real production bugs (unawaited `streamText` Promises) and added focused regression nets rather than broad new restrictions.
- The closeout test rewrite in `ed6716ac` is well-reasoned: it encodes the spec's actual intent instead of an impossible "zero outdated rows" literal reading.
- `packages/auth/vitest.config.ts` is a clean, config-only fix that follows the pattern used by apps.
- `gate-result.json` is an honest durable record: it reports `exitCode: 1`, names the failing task, documents ownership, and separates migration-scope greens from aggregate reds.
- All 26 targeted Phase 4 + adversarial tests pass; the full `@reading-advantage/ai` suite passes (192/3/0).

**Issues / Drift**
- **Stale stashes**: six `preserve-jr-green-work-mid-attempt-3/4*` stashes remain in the repo. Their contents have been superseded by committed work; they should be dropped to avoid confusion.
- **Metadata out of sync**: `measure/tracks/ai_sdk_major_migration/metadata.json` still lists `"status": "in_progress"` while `plan.md` marks all Phase 4 tasks `[x]`. Update to `"completed"` (or whatever the project's convention is) after final acceptance.
- **Unrelated worktree changes**: `apps/reading-advantage/lib/enums.ts`, `apps/science-advantage/{AGENTS.md,lib/enums.ts}`, and several `measure/*.md` files are modified but not part of this track. Ensure they are committed under their own track or reverted.
- **Tool calling deferred**: AC #6 mentions tool calling, but it is intentionally deferred and now recorded in `measure/tech-debt.md`. This is acceptable because the plan explicitly scoped it out, but it should not be forgotten in a future track.
- **Auth test failures remain**: although not owned by this track, the aggregate gate will stay red until `audit_log_retention_dsar_20260605` / `auth_security_hardening_20260611` archived test failures are resolved or excluded from the default auth test run.

## Risks / Blockers

1. **Aggregate gate still red** — `pnpm turbo run lint test check-types build` exits 1 because of 10 pre-existing `@reading-advantage/auth#test` failures (need `DIRECT_DATABASE_URL` or reference archived paths). This blocks any CI that treats the aggregate gate as mandatory, even though the migration scope is fully green.
2. **Stashes may be accidentally restored** — the six stale stashes contain partial/duplicate versions of already-committed adapter files. A future `git stash pop` could reintroduce conflicts.
3. **Dynamic-import gap in arch guard** — the adversarial test documents that `phase-arch-no-direct-sdk.test.ts` does not catch `await import("ai")`, `require("ai")`, or bare `import "ai"`. The apps currently do not use these forms, but a future app refactor could bypass the guard silently if the regex is not tightened.

## Recommended Next Actions

1. **Drop stale stashes** after verifying their contents are superseded by commits `38370826`, `512f834f`, `52e3c900`, `ed6716ac`, `aa193f58`, `73e38bc1`, `5891867c`, `d143ba62`, `17604323`, and `85e1be2b`:
   ```bash
   git stash list
   # review each with git show -p stash@{N}
   git stash drop stash@{N}
   ```
2. **Update `metadata.json`** to reflect the track's completed state and close it out.
3. **Commit or revert unrelated worktree changes** so they do not leak into this track's closeout.
4. **Decide on the aggregate gate policy**: either fix/ignore the pre-existing auth failures at the CI level, or spin up a small follow-up track to clean up the archived auth test surface.
5. **Schedule a future spike** to implement tool calling on `AIClient` and close the deferred tech-debt item when product priority allows.
