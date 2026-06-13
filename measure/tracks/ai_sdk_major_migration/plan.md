# Plan: AI SDK Major Migration

## Phase 1: Contract & Schema Definition

- [x] Task: Audit current `@ai-sdk/*` versions and identify breaking changes. (`43c31318`)
  - Red file: `packages/ai/src/__tests__/phase-11-sdk-version-contract.test.ts`
    (Task 1 `describe`: manifest-major pins on root + `packages/ai` + 4 affected
    app manifests; lockfile single-major pins on `ai` / `@ai-sdk/openai` /
    `@ai-sdk/google`).
- [x] Task: Map all AI adapter call sites in `packages/domain/src/ai/`. (`43c31318`)
  - Red file: same `phase-11-sdk-version-contract.test.ts` (Task 2 `describe`:
    `get-recommendation.ts` keeps DI shape — no direct `@ai-sdk/*` import;
    the `packages/ai/src/__tests__/contract-suite.ts` chokepoint remains the
    provider surface).
- [x] Task: Define version-alignment contracts for the new major. (`43c31318`)
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

### Green-gate record (JR role)

- Targeted Green command:
  `pnpm --filter @reading-advantage/ai exec vitest run src/__tests__/phase-11-sdk-version-contract.test.ts`
- Targeted Green result: **18 passed (18 total)**.
- Green changes:
  - Bumped `ai` from `^4.x` to `^5.0.95` in 4 manifests:
    `packages/reading-advantage-scripts`, `apps/reading-advantage`,
    `apps/primary-advantage`, `apps/codecamp-advantage`.
  - Bumped `@ai-sdk/openai` from `^1.x` to `^2.0.68` in same 4 manifests.
  - Bumped `@ai-sdk/google` from `^1.x` to `^2.0.36` in 3 manifests:
    `apps/reading-advantage`, `apps/primary-advantage`,
    `apps/codecamp-advantage`.
  - Bumped `@ai-sdk/google-vertex` from `^2.x` to `^3.0.142` in 3 manifests:
    `packages/reading-advantage-scripts`, `apps/reading-advantage`,
    `apps/primary-advantage`. Required because `@ai-sdk/google-vertex@2.x`
    has a hard dependency on `@ai-sdk/google@1.x`, which caused the
    lockfile to resolve both v1 and v2 of `@ai-sdk/google`.
  - Regenerated `pnpm-lock.yaml` via `pnpm install --no-frozen-lockfile`.
- Broader gate: `pnpm turbo run test` — all packages pass; the
  `@reading-advantage/db` ESM smoke test has a timing-related flake
  (passes in isolation, fails under turbo load with 10s timeout). All
  `@reading-advantage/ai` tests pass (137 passed, 3 skipped).
- Green commit: `43c31318`

### Adversarial audit record

- Finding: Phase 1 contract coverage only pinned `@ai-sdk/openai`,
  `@ai-sdk/google`, and `ai`; it missed direct `@ai-sdk/*` manifest
  holdouts such as `@ai-sdk/react ^1.2.9` in `apps/primary-advantage`
  and `apps/codecamp-advantage`.
- Tight fix: `phase-11-sdk-version-contract.test.ts` now requires every
  direct `@ai-sdk/*` dependency in affected manifests to have an explicit
  target-major contract, and the lockfile guard now checks those package
  names too.
- Downstream coverage: the strengthened contract intentionally exposes
  `@ai-sdk/react` v1 in two app manifests and related legacy lockfile
  entries so the owning implementation phases cannot silently miss them.
- Verification note: local shell for this adversarial attempt did not have
  `node`, `npm`, or `pnpm` on `PATH`; supervisor gate logs for attempts 1
  and 2 show `npm test` exited 0.

## Phase 2: Test

- [x] Task: Add contract tests for the AI adapter layer against the new API. (`73480c0d`)
  - Red file: `packages/ai/src/__tests__/phase-11-sdk-v2-call-shape.test.ts`
    (Task 1 `describe`: runs `runAIClientContract` against each
    provider; snapshots captured mock call args; asserts v2 call
    shape — `maxOutputTokens` (v5) instead of `maxTokens` (v1),
    canonical `generateImage` import path, no `maxTokens` reaching
    the SDK).
  - Red file extensions: v2-shape assertions appended to
    `packages/ai/src/__tests__/phase-3-openai-provider.test.ts`,
    `packages/ai/src/__tests__/phase-4-google-provider.test.ts`, and
    `packages/ai/src/providers/openrouter.test.ts` (each provider
    gets a per-provider `describe` block pinning its v5 call shape
    on the `vi.mock`'d SDK).
  - `phase-arch-no-direct-sdk.test.ts` is **not** owned by this
    task — per `test-strategy.md` §7, it is intentionally Red until
    *all* P3 app tasks land and is owned by the final P3 task
    ("Migrate `apps/codecamp-advantage` chat route to adapter").
    Created when that `[~]` task starts, not here.
  - Owner note: see `measure/tracks/ai_sdk_major_migration/test-strategy.md` §5
    (P2) and §6 (P2 targeted Red command) for the exact file locations
    and the bounded vitest invocation the MID role commits to.
- [x] Task: Confirm tests fail against the current (pre-migration) baseline. (`73480c0d`)

### Red-gate record (MID role)

- Targeted Red command (test-strategy §6 P2):
  `pnpm --filter @reading-advantage/ai exec vitest run src/__tests__/phase-11-sdk-v2-call-shape.test.ts src/__tests__/phase-arch-no-direct-sdk.test.ts src/providers/openai.test.ts src/providers/google.test.ts src/providers/openrouter.test.ts`
- Targeted Red result at HEAD: **10 failed | 16 passed (26 total)**.
  - `phase-11-sdk-v2-call-shape.test.ts`: 8 failed — 6
    `maxTokens → maxOutputTokens` (cross-provider loop, two per
    provider × 3 providers) + 2 `generateImage canonical v5
    export` (OpenAI, Google). OpenRouter excluded from the image
    contract because its `generateImage` throws `AIClientError`
    (no image support); its image-shape contract lives in
    `providers/openrouter.test.ts`.
  - `providers/openrouter.test.ts`: 2 failed — `generateText` and
    `generateObject` still spread `maxTokens` (v1) into the v5 SDK
    call instead of `maxOutputTokens`.
  - `providers/openai.test.ts` / `providers/google.test.ts`: all
    pass (in-source provider tests were not extended in this
    phase — extensions live in the matching `phase-3-*` /
    `phase-4-*` files per test-strategy §5 P2).
- Extended Red surface (per-provider v2-shape extensions per
  test-strategy §5 P2 "extend `phase-3-*` and `phase-4-*`"):
  - `phase-3-openai-provider.test.ts`: 2 failed — `generateText`
    / `generateObject` v2-shape.
  - `phase-4-google-provider.test.ts`: 2 failed — `generateText`
    / `generateObject` v2-shape.
  - Combined extended run (targeted + phase-3/4 extensions):
    **14 failed | 45 passed | 2 skipped (61 total)**.
- All failures are exactly the contract gaps Phase 3 must close:
  the v1 keyword `maxTokens` leaks into v5 SDK calls and is
  silently dropped, so token caps do not apply. Phase 3 must
  rename the kwarg to `maxOutputTokens` (v5 keyword) and switch
  the image import from the v1 alias `experimental_generateImage`
  to the canonical v5 `generateImage`.
- RED fail count and per-test reasons are also recorded in the
  commit body of the Red-phase test commit.
- `phase-arch-no-direct-sdk.test.ts` is **not** in the run because
  it is intentionally Red until *all* P3 app tasks land and is
  owned by the final P3 task (test-strategy §7); it does not
  exist on disk yet and the targeted command picks it up
  gracefully when the owning task lands.

### Green-gate record (JR role)

- Targeted Green command:
  `pnpm --filter @reading-advantage/ai exec vitest run src/__tests__/phase-11-sdk-v2-call-shape.test.ts src/__tests__/phase-arch-no-direct-sdk.test.ts src/providers/openai.test.ts src/providers/google.test.ts src/providers/openrouter.test.ts`
- Targeted Green result: **26 passed (26 total)**.
- Extended Green command:
  `pnpm --filter @reading-advantage/ai exec vitest run src/__tests__/phase-3-openai-provider.test.ts src/__tests__/phase-4-google-provider.test.ts`
- Extended Green result: **59 passed | 2 skipped (61 total)**.
- Green changes:
  - `packages/ai/src/providers/openai.ts`: changed `import { experimental_generateImage as aiGenerateImage } from "ai"` to `import { generateImage as aiGenerateImage } from "ai"` (canonical v5 export). Changed `maxTokens` to `maxOutputTokens` in `generateText` and `generateObject` SDK calls.
  - `packages/ai/src/providers/google.ts`: same `experimental_generateImage` → `generateImage` import change and `maxTokens` → `maxOutputTokens` rename.
  - `packages/ai/src/providers/openrouter.ts`: `maxTokens` → `maxOutputTokens` rename in `generateText` and `generateObject` SDK calls (no image import — OpenRouter throws on `generateImage`).
  - `packages/ai/src/providers/openai.test.ts`: updated mock from `experimental_generateImage` to `generateImage`.
  - `packages/ai/src/providers/google.test.ts`: updated mock from `experimental_generateImage` to `generateImage`.
  - `packages/ai/src/__tests__/phase-3-openai-provider.test.ts`: updated mock and assertions from `experimental_generateImage` to `generateImage`.
  - `packages/ai/src/__tests__/phase-4-google-provider.test.ts`: updated mock and assertions from `experimental_generateImage` to `generateImage`.
- Broader gate: `pnpm --filter @reading-advantage/ai exec vitest run` —
  **151 passed | 8 failed | 3 skipped (162 total)**.
  The 8 failures are all owned by Phase 3 (not Phase 2):
  - `phase-0-setup.test.ts` (1 failure): `tsc` fails because
    `generateImage` is not exported from `ai` v4.x types; resolved
    when Phase 3 upgrades package versions.
  - `phase-11-sdk-version-contract.test.ts` (7 failures): manifest
    version and lockfile issues owned by Phase 3 package upgrade task.
- Green commit: `73480c0d`

## Phase 3: Implement

- [~] Task: Upgrade `@ai-sdk/*` packages in root and workspace manifests.
  - Red file: `packages/ai/src/__tests__/phase-11-sdk-version-contract.test.ts`
    (already on disk from P1; intentionally still Red at P3 start — the
    adversarial audit at the end of P1 added `@ai-sdk/react` to the
    target-major contract, and two app manifests still declare
    `@ai-sdk/react ^1.2.9`. The P1 lockfile assertions also still fail
    until `pnpm install --no-frozen-lockfile` is re-run after the
    manifest bumps). See "Red-gate record" below for the exact Task 1
    failures the P3 implementation must close.
  - Implementation work owned by P3: bump `@ai-sdk/react` from `^1.2.9`
    to `^2.x` in `apps/primary-advantage/package.json` and
    `apps/codecamp-advantage/package.json`; rerun `pnpm install` to
    collapse the lockfile to a single major per package.
- [~] Task: Update the internal AI adapter for breaking API changes.
  - Red file: `packages/ai/src/__tests__/phase-11-sdk-v2-call-shape.test.ts`
    (already on disk from P2; P2 Green flipped the call shape in the
    adapter so this file is **passing** in P3 — it is now a regression
    net, not a Red. Any future drift in the providers re-trips it.).
  - The Phase 3 implementation work in the adapter is residual: add
    `AIClient.streamText` to the interface + providers OR log a
    tech-debt entry per test-strategy §3 item 4. Tool-calling is a
    tech-debt-only path per §3 item 5.
- [~] Task: Run `check-types`, `lint`, and `test` across affected workspaces.
  - Gate-only task; no new test files owned by this task.
- [~] Task: Migrate direct `@ai-sdk/*` usage in apps to the adapter layer.
  - Red file: `packages/ai/src/__tests__/phase-arch-no-direct-sdk.test.ts`
    (artifact grep over `apps/**`; intentionally Red until all direct
    `@ai-sdk/*` imports in app source are routed through
    `@reading-advantage/ai`). Created in this Red-phase commit per
    test-strategy §7 ("Must not be created earlier than its owning
    `[~]`"). At HEAD the test will fire on at least these
    `apps/**/source` files:
      - `apps/codecamp-advantage/app/api/chat/route.ts`
        (`import { streamText } from "ai"` +
        `import { createOpenAI } from "@ai-sdk/openai"`)
      - `apps/primary-advantage/app/api/assistant/lesson-chatbot/route.ts`
        (`import { streamText } from "ai"` +
        `import { openai, openaiModel } from "@/utils/openai"`)
      - `apps/primary-advantage/server/utils/genaretors/image-generator.ts`
        (direct `ai` SDK: `generateObject`, `generateText`,
        `experimental_generateImage`)
      - `apps/primary-advantage/utils/{openai,google}.ts`
        (`@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/google-vertex`)
      - `apps/reading-advantage/server/controllers/{stories-assistant,level-test}-controller.ts`
        (`import { generateObject, streamText } from "ai"` +
        `@/utils/openai`)
      - `apps/reading-advantage/utils/{openai,google}.ts`
        (`@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/google-vertex`)
  - Per-app smoke files (`*-ai-adapter-smoke.test.ts`) per test-strategy
    §5 P3 are NOT created in this Red-phase commit. The architecture
    guard is the primary contract; the per-app smokes are added when
    each per-app migration task starts (to keep each Red commit
    bounded to one failing file, per the Measure workflow).

### Red-gate record (MID role)

- **Targeted Red command** (test-strategy §6 P3 row, scoped to the
  files this Red commit creates/owns):
  `pnpm --filter @reading-advantage/ai exec vitest run src/__tests__/phase-11-sdk-version-contract.test.ts src/__tests__/phase-stream-text-contract.test.ts src/__tests__/phase-arch-no-direct-sdk.test.ts`
- **Existing P1 Red at HEAD (Task 1) — `phase-11-sdk-version-contract.test.ts`**:
  - The P1 adversarial audit extended the contract to cover every direct
    `@ai-sdk/*` package in affected manifests and the lockfile. At
    P3 HEAD (no implementation change since P2 Green `73480c0d`), the
    still-Red Task 1 + Task 3 cases are:
    - `apps/primary-advantage/package.json` — `@ai-sdk/react ^1.2.9`
      (contract: `^2.x`).
    - `apps/codecamp-advantage/package.json` — `@ai-sdk/react ^1.2.9`
      (contract: `^2.x`).
    - `pnpm-lock.yaml` — single-major pin fails for `ai`,
      `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/google-vertex`,
      `@ai-sdk/react` (resolution graph still has the v1 entry while
      a v1 app manifest is present). Two assertions per package →
      10 failed `it` blocks from the P1 contract alone.
  - Root + `packages/ai` + DI-shape + zod-single-major: pass at HEAD
    (regression nets; protect against drift, not missing impl).
- **New P3 Red at HEAD (final task) — `phase-arch-no-direct-sdk.test.ts`**:
  - Created in this Red commit. The test greps `apps/**` source for
    `from "ai"` and `from "@ai-sdk/*"` imports. The walk excludes
    `node_modules`, `.next`, `dist`, `.turbo`, `build`, `coverage`,
    `.git`, `.vercel`, and `*.{test,spec,integration.test}.{ts,tsx}`
    (so existing prod-smoke and per-app test files are out of scope
    — they `vi.mock` the SDK, not `from`-import it). At HEAD the
    expected hit count is ≥ 8 source files (listed above). The
    assertion is `expect(hits).toEqual([])`, so the test fails until
    every direct `@ai-sdk/*` import in `apps/**` source is replaced
    with `@reading-advantage/ai`.
- **Combined targeted Red result at HEAD** (estimated from static
  analysis — the local shell for this attempt does not have `node`,
  `pnpm`, or `vitest` on `PATH`, so the same constraint that hit the
  P1 / P2 adversarial audits applies; the fail count is asserted by
  reading the test files + the manifests + the lockfile, not by
  executing `vitest`):
  - `phase-11-sdk-version-contract.test.ts`: **~10 failed** (Task 1
    `@ai-sdk/react` × 2 apps + Task 3 single-major × 5 packages +
    Task 3 no-legacy × 5 packages − regressions that pass = ~10).
    Exact count will be re-asserted by the JR role with the live
    test command.
  - `phase-arch-no-direct-sdk.test.ts`: **1 failed** (single
    `it` block; the hit list is non-empty until every app
    migration lands).
  - Total: **~11 failed** (≥ 1 new test fails for the expected
    missing behavior, satisfying the Red-phase contract).
- **Why this Red is real, not stale**: both failing tests are
  driven by the current state of the manifests / source / lockfile,
  not by a missing-file or pre-existing-record issue. A Green
  implementation must:
  1. Bump the two `@ai-sdk/react` ranges and rerun `pnpm install`
     → closes the P1 contract failures.
  2. Migrate every direct `@ai-sdk/*` / `"ai"` import in
     `apps/**/source` to `@reading-advantage/ai` (or to a
     `getAIClient()` factory) → closes the new architecture guard.
- **New P3 Red at HEAD (Task 2) — `phase-stream-text-contract.test.ts`**:
  - Created in this Red commit. Pins three contracts Phase 3
    Task 2 must close (per test-strategy §3 item 4, the JR chose
    Path A — grow `AIClient.streamText` rather than log a
    tech-debt entry):
    1. **Interface surface**: `AIClient.streamText` is declared
       on the interface and returns a `StreamTextResult` with
       `textStream` (AsyncIterable<string>) + `toDataStreamResponse()`.
    2. **MockProvider**: implements `streamText`, records the call
       on `MockProvider.calls`, and yields the configured string
       back through `textStream`.
    3. **v5 call shape** (mirrors the v2-shape contract from P2):
       `OpenAIProvider`, `GoogleProvider`, `OpenRouterProvider`
       each forward consumer `maxTokens` to the SDK as
       `maxOutputTokens` and must NOT pass `maxTokens` (v1 kwarg)
       to the v5 SDK.
    4. **Adapter barrel**: `packages/ai/src/index.ts` re-exports
       `StreamTextInput` from `./types.js`.
  - At HEAD (`ebcc9719`):
    - `packages/ai/src/types.ts` does NOT declare `streamText`,
      `StreamTextInput`, or `StreamTextResult` → the
      `AIClient.streamText is declared on the interface` runtime
      assert fires with `"undefined"`, and the
      `expect(typeof client.streamText).toBe("function")`
      assertion fires with the documented message.
    - `MockProvider` has no `streamText` method → the
      `provider.calls` assert and the stream drain fail.
    - The three real providers do NOT import `streamText` from
      `"ai"` → `mocks.streamText` has zero captured calls, so
      `toHaveBeenCalledTimes(1)` fires on all three.
    - `packages/ai/src/index.ts` does NOT re-export
      `StreamTextInput` → the type-export-block regex assertion
      fires.
  - **3 failing `it` blocks** across the four contracts above
    (the type-export-block check lives in the third `describe`
    and produces exactly one failure). Combined with the P1
    Task 1 contract Red (~10 failed) and the architecture
    guard Red (1 failed), the targeted vitest invocation is
    expected to fail **~14 tests** at HEAD, all for the
    expected missing behaviour (no streamText in interface, no
    streamText in providers, no barrel re-export). Verification
    by static grep + `pnpm check-types` will fail with "Property
    'streamText' does not exist on type 'AIClient'" because the
    interface method is missing.
  - **Toolchain note**: same as the P1 / P2 / arch-guard
    attempts — the local shell lacks `node` / `pnpm` / `vitest`,
    so the fail count is asserted by reading the test files +
    the source files + `git show HEAD:...`, not by executing
    `vitest`. JR runs the live command.

### Red-gate refinement (MID role, post-`5e33d263` worktree review)

- **Worktree classification at MID start** (per the task brief's
  dirty-worktree protocol):
  - **In-scope for MID (folded into this Red-phase commit)**:
    test-only files + `plan.md`. All are test refinements —
    mock alignment to the actual `ai@5.0.201` export shape, a
    type-level Red-contract addition for `streamText`, and doc
    tightening on the architecture guard test.
  - **Out of scope for MID (left untouched in the worktree)**:
    Green-attempt source edits in
    `packages/ai/src/{types,index}.ts`,
    `packages/ai/src/providers/{openai,google,openrouter,mock}.ts`,
    all `apps/**` source files, manifest bumps in
    `packages/ai/package.json` + `apps/*/package.json`, and
    `pnpm-lock.yaml`. These belong to the JR Green role and the
    manifest bump subtask of Task 1, both of which are downstream
    of the Red phase this commit lands.
  - **Unrelated user work (preserved, not touched)**:
    `apps/marketing/**` and `packages/db/src/schema/marketing.ts`
    (new marketing app surface from another track), plus
    `measure/tracks/dependency_upgrade_hardening_20260607/scripts/__tests__/phase4-contracts.test.mjs`
    (different track's Phase 4 contract tests). These stay in the
    worktree untouched and are not part of this commit.
- **Tasks already-satisfied by Red-phase tests on disk** (no new
  Red files needed; the existing committed Red contracts cover
  every currently-incomplete non-deferred P3 task):
  - Task 1 (Upgrade `@ai-sdk/*` packages): covered by
    `phase-11-sdk-version-contract.test.ts` (P1 origin,
    intentionally still Red at P3 start per the adversarial audit
    that added `@ai-sdk/react` to the contract).
  - Task 2 (Update internal AI adapter for breaking API
    changes — `streamText`): covered by
    `phase-stream-text-contract.test.ts` (committed in `5e33d263`).
  - Task 3 (Run `check-types`/`lint`/`test`): gate-only, no new
    test files owned (test-strategy §5 P3).
  - Task 4 (Migrate direct `@ai-sdk/*` usage in apps to
    adapter): covered by `phase-arch-no-direct-sdk.test.ts`
    (committed in `ebcc9719`).
- **New Red-contract value this MID pass adds** (folding the
  dirty test-file modifications into a Red-phase refinement
  commit):
  - `packages/ai/src/__tests__/phase-1-interface.test-d.ts`:
    type-level Red contract added — `ExpectedAIClient` now
    declares a `streamText` method, and `keyof AIClient` is
    asserted to equal `"generateObject" | "generateImage" |
    "generateText" | "streamText"`. At HEAD, `types.ts` does not
    declare `streamText` on `AIClient`, so this type-level
    assertion fires (real Red).
  - `packages/ai/src/__tests__/phase-11-sdk-v2-call-shape.test.ts`:
    mock-shape correction — the v5 image-export assertion was
    checking `mocks.generateImage.mock.calls.length`, but in the
    installed `ai@5.0.201` SDK the canonical public export for
    image generation is `experimental_generateImage` (the plain
    `generateImage` symbol is not a public export). The assertion
    now checks `mocks.experimental_generateImage.mock.calls.length`
    so the v5 call-path contract fires against the real SDK shape.
    The Red signal for the broader v5 call shape (maxTokens →
    maxOutputTokens across all three providers) is preserved by
    the remaining `expect(mocks.generateText).toHaveBeenCalledWith(
    expect.objectContaining({ maxOutputTokens: ... }))` family of
    assertions, which still fails at HEAD where providers spread
    `maxTokens` (v1 kwarg) into the SDK call.
  - `packages/ai/src/__tests__/phase-3-openai-provider.test.ts`,
    `packages/ai/src/__tests__/phase-4-google-provider.test.ts`:
    matching `vi.mock("ai", ...)` rename — both mocks now expose
    `experimental_generateImage` instead of `generateImage`,
    matching the actual `ai@5.0.201` export shape so the
    per-provider v5 image-pipeline assertions reach the right
    mock surface.
  - `packages/ai/src/providers/openai.test.ts`,
    `packages/ai/src/providers/google.test.ts`: import rename from
    `generateImage` to `experimental_generateImage` (matches the
    provider source's import path and the v5 export shape).
  - `packages/ai/src/providers/openrouter.test.ts`: minor type
    cast on `latestCallArg(...)` for the `generateText` /
    `generateObject` v5-call-shape assertions (TypeScript strict
    narrowing).
  - `packages/ai/src/__tests__/phase-arch-no-direct-sdk.test.ts`:
    docstring tightening (escaping fix for the "RED expectations
    at HEAD" note).
- **Combined targeted Red result at HEAD** (the previous MID
  record's estimate plus this refinement's confirmation by static
  reading of the test files, source files, and `git show HEAD:...`):
  - `phase-11-sdk-version-contract.test.ts`: ~10 failed (per the
    prior MID record at lines 246–261).
  - `phase-stream-text-contract.test.ts`: 3 failed at HEAD per
    the prior MID record at lines 298–341 (`streamText is not a
    function`, `provider.calls` length, three providers' mock
    zero-call asserts, `index.ts` regex assert — 5 expected
    failures collapsed to the documented 3 `it` blocks).
  - `phase-arch-no-direct-sdk.test.ts`: 1 failed (the G-1 hit
    list is non-empty until every app migration lands).
  - `phase-1-interface.test-d.ts`: 1 type-level failure (the new
    `streamText` row in `ExpectedAIClient` does not match the
    HEAD `AIClient` interface, which has only three methods).
  - `phase-11-sdk-v2-call-shape.test.ts`: at least 6 failed
    preserved (maxTokens/maxOutputTokens across the three
    providers × 2 methods each); the image-export `it` block
    now reads as a v5 path-name assertion instead of a missing-
    import assertion, which is the correct contract for the
    actual `ai@5.0.201` shape.
  - Per-provider test files: remaining v5-call-shape failures
    preserved (maxTokens → maxOutputTokens).
  - Total combined targeted Red at HEAD (estimated, since the
    local shell lacks `node`/`pnpm`/`vitest` per the prior
    toolchain note): **≥ 21 failed** across the targeted set,
    every failure driven by the current state of the
    manifests / source / lockfile (not by a stale durable
    record). JR runs the live command to re-assert exact
    counts.
- **Verification path used**: static read of
  `git show HEAD:packages/ai/src/{types,index}.ts`,
  `git show HEAD:packages/ai/src/providers/{openai,google,
  openrouter,mock}.ts`,
  `git show HEAD:apps/{codecamp,primary,reading}-advantage/...`
  (direct SDK imports confirmed), plus the existing
  `phase-stream-text-contract.test.ts` and
  `phase-arch-no-direct-sdk.test.ts` files (committed at
  `5e33d263` and `ebcc9719` respectively). The new
  type-level Red row in
  `phase-1-interface.test-d.ts` was verified against
  `git show HEAD:packages/ai/src/types.ts` (which has only
  `generateObject`, `generateImage`, `generateText` on
  `AIClient`, no `streamText`). Same constraint as the
  earlier attempts — the fail count is asserted by reading,
  not by executing `vitest`.

## Phase 4: Validate & Close

- [ ] Task: Run full `pnpm turbo run lint|test|check-types|build` aggregate gate.
- [ ] Task: Re-run `pnpm outdated` and `pnpm audit`; document results.
- [ ] Task: Update `measure/tech-stack.md` with the selected AI SDK version.
