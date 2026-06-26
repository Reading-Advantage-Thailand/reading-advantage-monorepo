# Line Review Evidence: packages-ai-001

Reviewer: Measure Review A (correctness and architecture)
Files assigned: 8
Lines assigned: 871

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| packages/ai/README.md | 1-87 | reviewed | 1 |
| packages/ai/eslint.config.mjs | 1-3 | reviewed | 0 |
| packages/ai/package.json | 1-34 | reviewed | 1 |
| packages/ai/src/__tests__/contract-suite.ts | 1-119 | reviewed | 1 |
| packages/ai/src/__tests__/diagram.fixture.ts | 1-33 | reviewed | 0 |
| packages/ai/src/__tests__/phase-0-setup.test.ts | 1-115 | reviewed | 2 |
| packages/ai/src/__tests__/phase-1-interface.test-d.ts | 1-181 | reviewed | 1 |
| packages/ai/src/__tests__/phase-10-closeout.test.ts | 1-299 | reviewed | 1 |

## Findings

### LR-packages-ai-001-001 — README omits the OpenRouter provider supported by the public contract

- Severity: High
- File: `packages/ai/README.md:3`
- File: `packages/ai/README.md:29-37`
- File: `packages/ai/src/__tests__/phase-1-interface.test-d.ts:153`
- Evidence: The README opening paragraph (line 3) states the package "abstracts over OpenAI, Google Gemini, and a mock provider." The Provider Configuration table (lines 29-37) lists only OpenAI, Google, and Mock. However, the exported `AIProvider` type at `phase-1-interface.test-d.ts:153` is `"openai" | "google" | "openrouter" | "mock"`, and the OpenRouter provider implementation exists in `packages/ai/src/providers/openrouter.ts`. The README therefore does not document a supported public provider.
- Impact: Users of the package cannot discover OpenRouter support from the primary documentation, increasing the risk that application code continues to couple directly to the OpenRouter SDK instead of using the adapter. This undermines the AGENTS.md provider-neutrality goal.
- Recommendation: Add an OpenRouter row to the README Provider Configuration table, including its required env var (`OPENROUTER_API_KEY`) and default model, so the documented surface matches the exported `AIProvider` contract.

### LR-packages-ai-001-002 — `@ai-sdk/google-vertex` dependency is not reflected in the public provider contract or docs

- Severity: Low
- File: `packages/ai/package.json:23`
- File: `packages/ai/README.md:29-37`
- File: `packages/ai/src/__tests__/phase-1-interface.test-d.ts:153`
- Evidence: `package.json` declares `@ai-sdk/google-vertex` as a direct dependency (line 23), but the README provider table and the exported `AIProvider` type (`phase-1-interface.test-d.ts:153`) do not mention a Google Vertex provider.
- Impact: If the dependency is used only internally or is dead weight, it enlarges the supply-chain surface without a corresponding public API. If it is intended to be public, the contract and docs are incomplete.
- Recommendation: Verify whether `packages/ai/src/providers/google.ts` (or another source file) consumes `@ai-sdk/google-vertex`. If it is required, expose `"google-vertex"` in `AIProvider` and document it; otherwise remove the dependency.

### LR-packages-ai-001-003 — Shared contract suite only exercises three of the six `AIClient` methods

- Severity: Medium
- File: `packages/ai/src/__tests__/contract-suite.ts:69-118`
- File: `packages/ai/src/__tests__/phase-1-interface.test-d.ts:68-77`
- Evidence: `runAIClientContract` tests only `generateObject`, `generateImage`, and `generateText`. The exported `AIClient` interface (`phase-1-interface.test-d.ts:68-77`) also requires `generateObjectFromMedia`, `transcribeAudio`, and `streamText`. The suite's own header (lines 7-8) claims "every new provider must satisfy the same observable contract," but half of the contract is not exercised.
- Impact: A new provider could pass the shared suite while silently failing the un-tested methods, breaking callers that rely on the full interface. The comment at `phase-2-mock-provider.test.ts:141` explicitly states that Phases 3 and 4 will call `runAIClientContract`, so the gap propagates to real-provider tests.
- Recommendation: Extend `runAIClientContract` with fixture-driven tests for `generateObjectFromMedia`, `transcribeAudio`, and `streamText`, or split the suite and require providers to import the full contract harness.

### LR-packages-ai-001-004 — Phase 0 setup tests assume a non-hoisted package-local `node_modules` layout

- Severity: Medium
- File: `packages/ai/src/__tests__/phase-0-setup.test.ts:74-82`
- File: `packages/ai/src/__tests__/phase-0-setup.test.ts:99-112`
- Evidence: The test at lines 74-82 asserts that `packages/ai/node_modules/vitest` and `packages/ai/node_modules/zod` exist. The test at lines 99-112 executes `./node_modules/.bin/tsc --noEmit` from `PKG_ROOT`. In this workspace `packages/ai/node_modules` contains only `@reading-advantage` and `.vite` directories; `vitest` and `zod` are not linked locally, and `tsc` is available only at the repository root (`node_modules/.bin/tsc`). Running these tests produces failures: "expected false to be true" at line 80 and "tsc exited 1; output: /bin/sh: 1: ./node_modules/.bin/tsc: not found" at line 112.
- Impact: The Phase 0 gate is not portable across pnpm install layouts. A CI runner or contributor using the default pnpm hoisted/hybrid linker will see spurious failures even though the package is correctly installed.
- Recommendation: Resolve `tsc` via `pnpm exec tsc` or by walking to the nearest `node_modules/.bin/tsc`. For the local node_modules assertion, either check root resolution instead or document the required pnpm linker configuration.

### LR-packages-ai-001-005 — Comment references archived track path for test-strategy.md

- Severity: Low
- File: `packages/ai/src/__tests__/phase-0-setup.test.ts:87`
- Evidence: The inline comment cites `measure/tracks/ai_adapter_package_20260603/test-strategy.md`. The `ai_adapter_package_20260603` track has been moved to `measure/archive/ai_adapter_package_20260603/` (verified by `ls measure/archive/ai_adapter_package_20260603/test-strategy.md`).
- Impact: A9-class stale path reference. Future maintainers following the comment will look in the wrong directory.
- Recommendation: Update the comment to `measure/archive/ai_adapter_package_20260603/test-strategy.md`.

### LR-packages-ai-001-006 — Type-test file falsely claims `vitest --typecheck` is enabled in config

- Severity: Medium
- File: `packages/ai/src/__tests__/phase-1-interface.test-d.ts:6`
- File: `packages/ai/vitest.config.ts:1-10`
- Evidence: The comment states the tests are "picked up by `vitest --typecheck` (enabled in `vitest.config.ts`)." `packages/ai/vitest.config.ts` does not contain a `typecheck` block. The package `test` script (`packages/ai/package.json:18`) is simply `vitest run`, which skips `.test-d.ts` files by default.
- Impact: A5 false-claim text vs. config reality. The type-level contract tests are not exercised by the standard CI test command, so type drift in the public AIClient surface will not fail the package gate.
- Recommendation: Either add `typecheck: { enabled: true }` to `vitest.config.ts` or update the comment to explain that typecheck must be run manually with `vitest --typecheck`.

### LR-packages-ai-001-007 — Closeout test comments falsely claim assertions fail RED, but the suite passes

- Severity: High
- File: `packages/ai/src/__tests__/phase-10-closeout.test.ts:35-38`
- File: `packages/ai/src/__tests__/phase-10-closeout.test.ts:209-214`
- File: `packages/ai/src/__tests__/phase-10-closeout.test.ts:282-290`
- Evidence: The file header (lines 35-38) describes Task 3 as "the active RED contract — the four sub-assertions fail today because the track has not yet been moved to archive and tracks.md still says `[~]` / `./tracks/...`." Individual assertion messages repeat the claim (lines 211-214: "Today this dir still exists"; lines 283-284: "Today it is `[~]`"; lines 288-290: "Today it points to `./tracks/...`"). However, the track is already archived (`measure/tracks/ai_adapter_package_20260603` does not exist; `measure/archive/ai_adapter_package_20260603` exists with the full artifact set), and `measure/tracks.md:139` shows `[x]` with an archive link. Running the targeted test file produced `11 passed`.
- Impact: A5 false-claim text vs. test reality. Stale RED commentary misrepresents the expected state of the codebase and makes it harder to tell whether the closeout work is complete.
- Recommendation: Remove or rewrite the RED-phase commentary to describe the current Green state, or convert the file into regression tests that document the completed closeout.

## No-Finding Notes

- `packages/ai/eslint.config.mjs`: reviewed line-by-line; standard re-export of the shared ESLint config. No logic, no findings.
- `packages/ai/src/__tests__/diagram.fixture.ts`: reviewed line-by-line; deterministic 1×1 PNG fixture encoded as base64. No logic errors; the fixture is appropriate for Buffer identity tests.

## Anti-Pattern Checks

- **A3 (digit-only as a labeled count):** Checked. No bare-digit regex assertions used as counts in this batch. The closest matches (`phase-0-setup.test.ts:64` zod version check `/^\^?3\./`, `phase-10-closeout.test.ts:147` date regex `/\(\d{4}-\d{2}-\d{2},\s*ai_adapter_package[^)]*\)/`) are anchored/patterned, not bare counts.
- **A4 (vacuous-pass on nothing-done):** Checked. `phase-10-closeout.test.ts` assertions verify concrete file existence, specific substrings (`F-101`, `F-202`, `8075dad`), and exact marker/link states; they do not pass on missing deliverables. `phase-0-setup.test.ts` assertions that check file existence or barrel exports would fail if the deliverables were absent.
- **A5 (false-claim text vs. test reality):** Two confirmed instances in this batch:
  - `phase-1-interface.test-d.ts:6` claims typecheck is enabled in `vitest.config.ts`; it is not (LR-packages-ai-001-006).
  - `phase-10-closeout.test.ts` claims the closeout assertions fail RED; they pass (LR-packages-ai-001-007).
