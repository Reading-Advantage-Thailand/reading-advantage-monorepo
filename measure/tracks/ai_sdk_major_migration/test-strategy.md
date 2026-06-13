# Test Strategy: AI SDK Major Migration

Tech Lead: strategy-only. No source/test edits in this document.

## 0. Build-graph findings that shaped this strategy

`graph.db` mtime ~17h, fresh. Key facts via `stats`, `search "ai-sdk|google|openai"`,
`inspect getAIClient|OpenAIProvider|GoogleProvider`:

- **Spec drift**: spec.md names `packages/domain/src/ai/`, but the adapter is
  `packages/ai/` (`AIClient`, `OpenAIProvider`, `GoogleProvider`, `OpenRouterProvider`,
  `MockAIProvider`, `getAIClient`). `packages/domain/src/ai/get-recommendation.ts` is a
  *consumer* via injected `deps.generateRecommendation`. Plan must target `packages/ai/`.
- **Already on v2 in adapter**: `packages/ai/package.json` is `@ai-sdk/openai ^2.0.68`,
  `@ai-sdk/google ^2.0.36`, `ai ^5.0.183`. The migration is a *closeout & alignment*
  centred on app- and script-level v1 holdouts, not a v1→v2 flip everywhere.
- **v1 holdouts** (acceptance criteria #5 & #8 currently violated):
  - `packages/reading-advantage-scripts`: `@ai-sdk/openai ^1.0.8`, `ai ^4.0.22`.
  - `apps/reading-advantage` & `apps/primary-advantage`: `ai ^4.3.9`,
    `@ai-sdk/openai ^1.3.x`, `@ai-sdk/google ^1.2.x`, `@ai-sdk/react ^1.2.9`,
    plus ~30 direct `createOpenAI`/`createGoogleGenerativeAI`/`createVertex` imports
    in `utils/{google,openai}.ts`, `server/controllers/*`, `server/utils/generators/*`.
  - `apps/codecamp-advantage/app/api/chat/route.ts`: direct `streamText` + `createOpenAI`.
- **Existing harness**: `packages/ai/src/__tests__/contract-suite.ts`
  (`runAIClientContract`) + phases 0/2/3/4/5/9/10. Phase 0 already asserts presence of
  `ai`, `@ai-sdk/openai`, `@ai-sdk/google` in `packages/ai/package.json` — extend, do not
  duplicate. Phase 10 is doc-only file-content assertions.
- **Blast radius**: `AIClient` is the chokepoint (provider classes have unresolved
  `implements → interface:AIClient` edges). `streamText` is **not** in `AIClient` today
  (`types.ts` exposes `generateObject`, `generateText`, `generateImage` only).

## 1. Testing pyramid per phase

| Phase | Layer | Why |
|---|---|---|
| P1 Contract & Schema | Static / artifact | `package.json` + lockfile reads; breaking-changes inventory. |
| P2 Test (Red) | Unit + contract | Extend `runAIClientContract`; assert v2 call shapes via `vi.mock`. |
| P3 Implement | Unit (Green) → bounded integration | Adapter green, then one smoke per app. |
| P4 Validate & Close | Aggregate + doc | Turbo gate, `pnpm outdated`/`audit` capture, tech-stack. |

Heavy unit (mocked SDK), thin per-app smoke, zero E2E. Real-provider tests stay
opt-in behind `AI_PROVIDER` env, never CI default.

## 2. Shared fixtures & mocks

- **Reuse, don't fork**: `contract-suite.ts` (`runAIClientContract`,
  `defaultContractFixtures`), `recommendations.fixture.ts`, `diagram.fixture.ts`,
  `test-utils.ts`. `vi.mock("@ai-sdk/openai")` / `vi.mock("@ai-sdk/google")` patterns
  from `phase-3-*` and `phase-4-*` are the canonical Red shape.
- **New (P2)**: `sdk-v2-shape.fixture.ts` — literal expected-call snapshots for
  v2-shaped args. Do **not** import `node_modules/@ai-sdk/*` types at test time.
- **App-side**: a single `MockAIProvider` injection helper so app tests never import
  `@ai-sdk/*` (mirrors AGENTS.md "no direct provider SDKs").

## 3. Cross-phase edge cases & dependencies

1. **`zod` peer**: `ai@5` and `@ai-sdk/*@2` pin zod ranges; lockfile must end with one
   `zod` major. P1 + P4 assert via `pnpm-lock.yaml` read.
2. **`@ai-sdk/google-vertex`**: only in two apps + scripts. v2 has its own breaking
   changes. Either upgrade to ^2 *and* route via adapter, or log to tech-debt.
3. **`@ai-sdk/react` / `useChat`**: `ai@5` aligns with `@ai-sdk/react ^2`. Need at
   least one render-smoke that `useChat` mounts post-upgrade.
4. **Streaming** (acceptance #6): codecamp uses `streamText` directly. Either grow
   `AIClient.streamText` or document codecamp as exempt in tech-debt.
5. **Tool calling** (acceptance #6): not in `AIClient` today. If deferred, must be a
   tech-debt entry, not a silent gap.
6. **OpenRouter**: shares `createOpenAI` import path; v2 kwargs hit it too. Extend
   `phase-5-provider-selector.test.ts` in P2.

## 4. Architecture guardrails

- After P3, no `@ai-sdk/*` import in `apps/**` source. Enforced by P2 grep-test
  `phase-arch-no-direct-sdk.test.ts` (file-content scan; excludes
  `packages/ai/src/providers/**`, `node_modules`, `dist`).
- `packages/domain/src/ai/get-recommendation.ts` keeps DI shape — no direct
  `@ai-sdk` import there, re-asserted by the same grep-test.
- `vitest.config.ts` in `packages/ai` stays a pass-through; no per-file excludes to
  mask Red. Use `[~]` task ownership instead.
- Lockfile guardrail: P1 + P4 assert exactly one major of `ai`, `@ai-sdk/openai`,
  `@ai-sdk/google` resolves in `pnpm-lock.yaml`.

## 5. Per-phase test approach

**P1 (artifact).** New `phase-11-sdk-version-contract.test.ts` reads each affected
`package.json` + `pnpm-lock.yaml`. Pure `node:fs` — no network, no SDK import. This is
a contract test over *artifacts*, not proof of live behaviour.

**P2 (Red, behaviour against mocked SDK).** Extend `phase-3-*` and `phase-4-*` with
v2-shape assertions on `vi.mock`'d `createOpenAI` / `createGoogleGenerativeAI` call
args. Add `phase-11-sdk-v2-call-shape.test.ts` running `runAIClientContract` against
each provider and snapshotting captured mock call args. Add
`phase-arch-no-direct-sdk.test.ts` (artifact grep). All Red on a real delta-set; if
zero deltas the migration is a no-op for the adapter and reduces to apps + scripts.

**P3 (Green).** Provider edits flip P2 Green. Per app, one `*-ai-adapter-smoke.test.ts`
mocking `@reading-advantage/ai` and asserting the controller/generator calls
`generateText`/`generateObject` (never `createOpenAI`). One bounded smoke per app, not
a full controller suite.

**P4 (Validate & close).** Aggregate `pnpm turbo run test|lint|check-types|build`.
Capture `pnpm outdated -r --json` and `pnpm audit --json` to
`measure/tracks/ai_sdk_major_migration/artifacts/`. Final artifact test
`phase-12-closeout-artifacts.test.ts` asserts the JSON files exist and contain zero
`@ai-sdk/*` rows in `outdated`. Update `measure/tech-stack.md`.

## 6. Live-proof plan — Red command + Green/closeout gate per phase

No fake harnesses. `runAIClientContract` is real (real `AIClient` impls vs mocked
SDK — the correct level for an adapter package). Every Red phase has a
**filter + path-targeted vitest invocation** so a forgotten Red elsewhere cannot
mask failure; aggregate `turbo run test` runs only at P4.

| Phase | Targeted Red command | Green/closeout gate | Proof type |
|---|---|---|---|
| P1 | `pnpm --filter @reading-advantage/ai exec vitest run src/__tests__/phase-11-sdk-version-contract.test.ts` | Same exits 0 | Artifact |
| P2 | `pnpm --filter @reading-advantage/ai exec vitest run src/__tests__/phase-11-sdk-v2-call-shape.test.ts src/__tests__/phase-arch-no-direct-sdk.test.ts src/providers/openai.test.ts src/providers/google.test.ts src/providers/openrouter.test.ts` | Same exits 0 with v2-shape assertions live | Behaviour (mocked SDK) + artifact (grep) |
| P3 | `pnpm --filter @reading-advantage/ai exec vitest run` **and** `pnpm --filter <each-app> exec vitest run <path>/*-ai-adapter-smoke.test.ts` | Per-app smoke + adapter suite all green | Behaviour (mocked adapter at app boundary) |
| P4 | `pnpm turbo run lint test check-types build` **and** `pnpm --filter @reading-advantage/ai exec vitest run src/__tests__/phase-12-closeout-artifacts.test.ts` | Aggregate exits 0; artifact test confirms captured JSON clean | Aggregate (live) + artifact |

`phase-arch-no-direct-sdk.test.ts` is an *artifact* test, clearly labelled — it proves
no app re-imports `@ai-sdk/*`, not that the adapter works. Behaviour proof comes from
the contract suite + per-app smokes.

## 7. Intentionally-red files & aggregate-suite ownership

Every new test file is created in the same task that flips it Green — P2 tasks own
their Red files until the matching P3 task lands.

- Each Red file is listed by exact path in its owning `[~]` task in `plan.md`. While
  `[~]`, `pnpm turbo run test` is allowed to fail *only* on listed paths; confirm by
  re-running the §6 targeted command and diffing the failure set.
- No `it.skip` / `describe.skip` and no `vitest.config.ts` `exclude` additions to
  silence Red.
- `phase-arch-no-direct-sdk.test.ts` is intentionally Red until **all** P3 app tasks
  land; owned by the final P3 task ("Migrate `apps/codecamp-advantage` chat route to
  adapter"). Must not be created earlier than its owning `[~]`.
- `phase-12-closeout-artifacts.test.ts` is Red until P4 task 2 writes the artifacts;
  owned by that task only. Any app-side smoke picked up by a sibling package's
  `turbo run test` is listed by exact path in its owning task; the §6 targeted
  vitest is the gate. Aggregate runs only at end of phase, never as a Red probe.
