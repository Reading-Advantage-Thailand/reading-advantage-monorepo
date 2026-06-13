# Plan: AI SDK Major Migration

## Phase 1: Contract & Schema Definition

- [~] Task: Audit current `@ai-sdk/*` versions and identify breaking changes.
  - Red file: `packages/ai/src/__tests__/phase-11-sdk-version-contract.test.ts`
    (Task 1 `describe`: manifest-major pins on root + `packages/ai` + 4 affected
    app manifests; lockfile single-major pins on `ai` / `@ai-sdk/openai` /
    `@ai-sdk/google`).
- [~] Task: Map all AI adapter call sites in `packages/domain/src/ai/`.
  - Red file: same `phase-11-sdk-version-contract.test.ts` (Task 2 `describe`:
    `get-recommendation.ts` keeps DI shape — no direct `@ai-sdk/*` import;
    the `packages/ai/src/__tests__/contract-suite.ts` chokepoint remains the
    provider surface).
- [~] Task: Define version-alignment contracts for the new major.
  - Red file: same `phase-11-sdk-version-contract.test.ts` (Task 3 `describe`:
    "no v1 holdout in any manifest" + "no v1 entry in `pnpm-lock.yaml`" + the
    single `target major` constant that the rest of the track will read).
  - Owner note: see `measure/tracks/ai_sdk_major_migration/test-strategy.md` §5
    (P1) and §6 (P1 targeted Red command) for the exact file location and the
    bounded vitest invocation the MID role commits to.

### Red-gate record (MID role)

- Targeted Red command:
  `pnpm --filter @reading-advantage/ai exec vitest run src/__tests__/phase-11-sdk-version-contract.test.ts`
  (per test-strategy §6 P1 row).
- Targeted Red result at HEAD: **10 failed | 8 passed (18 total)**.
  Failures are exactly the contract gaps Phase 3 must close:
  - **Task 1 (4 failed `it` blocks)** — manifest `ai` range is still on the
    legacy `^4.x` major in `packages/reading-advantage-scripts`
    (`^4.0.22`), `apps/reading-advantage` (`^4.0.22`),
    `apps/primary-advantage` (`^4.3.9`), `apps/codecamp-advantage`
    (`^4.3.9`). Each is asserted to require `^5.x`.
  - **Task 2 (0 failed `it` blocks)** — the DI shape in
    `packages/domain/src/ai/get-recommendation.ts` is intact today; the
    `deps.generateRecommendation` contract and the no-`@ai-sdk/*`-import
    rule both hold. The Task 2 `it` blocks pass and act as a regression
    net during P3.
  - **Task 3 (6 failed `it` blocks)** — `pnpm-lock.yaml` resolves
    **both** legacy and target majors for every `@ai-sdk/*` package:
    `ai` → `{4, 5}`, `@ai-sdk/openai` → `{1, 2}`, `@ai-sdk/google` →
    `{1, 2}`. The two assertions per package (single-major + no-legacy)
    both fire, producing the 6 failures.
  - Root manifest + `packages/ai` + DI-shape + zod-single-major: **all
    pass at HEAD** (regression nets; they protect against drift, not
    against missing implementation).
- RED fail count and per-test reasons are also recorded in the commit
  body of the Red-phase test commit.

## Phase 2: Test

- [ ] Task: Add contract tests for the AI adapter layer against the new API.
- [ ] Task: Confirm tests fail against the current (pre-migration) baseline.

## Phase 3: Implement

- [ ] Task: Upgrade `@ai-sdk/*` packages in root and workspace manifests.
- [ ] Task: Update the internal AI adapter for breaking API changes.
- [ ] Task: Run `check-types`, `lint`, and `test` across affected workspaces.

## Phase 4: Validate & Close

- [ ] Task: Run full `pnpm turbo run lint|test|check-types|build` aggregate gate.
- [ ] Task: Re-run `pnpm outdated` and `pnpm audit`; document results.
- [ ] Task: Update `measure/tech-stack.md` with the selected AI SDK version.
