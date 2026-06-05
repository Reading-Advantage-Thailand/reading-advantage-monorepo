# Test Strategy: Shared `packages/ai` + `lib/ai/` Refactor

Tech-Lead guidance for the implementer. Scope: provider-neutral `AIClient`
interface, three providers (mock/openai/google), lazy `getAIClient()`
singleton, and refactor of `lib/ai/recommendation-service.ts` +
`image-generator.ts` to depend on the interface.

## 1. Testing pyramid per phase

| Phase | Unit | Contract | Integration | E2E |
|---|---|---|---|---|
| 0 Setup | — | — | `pnpm -F @reading-advantage/ai build` smoke | — |
| 1 Interface | type-level (`expectTypeOf`) | — | — | — |
| 2 Mock provider | heavy (happy path, schema-validation, unconfigured throw, snapshot) | acts as the **contract harness** for phases 3–4 | — | — |
| 3 OpenAI provider | mock the `@ai-sdk/openai` module, assert delegation | re-run the Phase-2 contract suite against this provider | 1 gated test behind `OPENAI_API_KEY` | — |
| 4 Google provider | mock `@ai-sdk/google`, assert delegation | re-run contract suite | 1 gated test behind `GEMINI_API_KEY` | — |
| 5 Selector / singleton | env-matrix table-driven tests; `resetAIClient()` between cases | — | — | — |
| 6 Recommendation refactor | inject `MockAIClient` into `RecommendationService`; existing tests stay green | — | reuse `recommendation-context.integration.test.ts` | — |
| 7 Image refactor | inject `MockAIClient` into `ImageGenerator`; assert **no `process.env` mutation** | — | reuse `image-generator.test.ts` | — |
| 8 SDK removal | grep gates (executed as Vitest assertions or `pnpm` script) | — | full `pnpm -F science-advantage test` | — |
| 9 Docs | — | — | — | — |
| 10 Closeout | — | — | full `pnpm turbo run test` | — |

## 2. Shared fixtures & mocks

Create once, import everywhere:

- `packages/ai/src/providers/mock.ts` — production mock (already exists per
  graph). Add an exported `createTestClient(overrides)` helper that returns
  a `MockAIClient` pre-loaded with the fixtures below.
- `packages/ai/src/__fixtures__/recommendations.ts` — captured production
  response satisfying `recommendationSchema` (used by Phase 6 + snapshot).
- `packages/ai/src/__fixtures__/diagram.png` — 1×1 PNG Buffer for Phase 7.
- `packages/ai/src/__fixtures__/contract-suite.ts` — exported
  `runAIClientContract(makeClient)` Vitest suite re-run by every provider.
- `packages/ai/src/__tests__/test-utils.ts` — `withEnv({...}, fn)` helper
  that snapshots+restores `process.env` and calls `resetAIClient()`.

Provider unit tests must `vi.mock('@ai-sdk/openai')` / `@ai-sdk/google`;
**no real network in unit tests**.

## 3. Cross-phase edge cases & dependencies

1. **Singleton state leaks across tests** — every Phase 5+ test must call
   `resetAIClient()` in `beforeEach`. Failure mode is order-dependent flakes.
2. **`process.env` mutation regression (FR-5)** — Phase 7 must include an
   explicit assertion: snapshot `process.env.OPENAI_API_KEY` /
   `GOOGLE_API_KEY` before and after `generateLessonDiagram()` and assert
   strict equality. This is the bug the track exists to fix.
3. **Schema-validation boundary** — `generateObject` must throw
   `SchemaValidationError`, not return malformed data. Test in Phase 2 and
   re-assert through the contract suite in Phases 3–4.
4. **Env-matrix coverage (Phase 5)** — required table cases:
   `{provider, OPENAI_API_KEY, GEMINI_API_KEY, NODE_ENV}` × expected client
   or thrown error. Must cover the `NODE_ENV=test` mock-default and the
   `NODE_ENV=production` no-key throw.
5. **Cache interaction in `recommendation-service.ts`** — the inline `Map`
   + Redis cache must still short-circuit before calling the AI client.
   Phase 6 test: call twice with same input, assert
   `mockClient.generateObject` called **once**.
6. **Buffer return type** — `generateImage` returns `Buffer`, not
   `Uint8Array`. Assert with `Buffer.isBuffer(...)` in Phase 2 contract.
7. **Integration tests are gated, not skipped silently** — use
   `it.skipIf(!process.env.OPENAI_API_KEY)` so CI shows them as skipped
   rather than hidden.
8. **Workspace install order (Phase 8)** — removing `ai`/`@ai-sdk/*` from
   `apps/science-advantage/package.json` must follow adding
   `@reading-advantage/ai`; otherwise the build between commits is broken.

## 4. Architecture guardrails (enforced as tests)

- **G-1**: `rg "from ['\"](ai|@ai-sdk/)" apps/science-advantage/` → 0 hits.
  Encode as a Vitest test in `apps/science-advantage/__tests__/architecture.test.ts`.
- **G-2**: `rg "process\.env\.(OPENAI|GOOGLE|GEMINI)_API_KEY" apps/science-advantage/lib/ai/` → 0 hits.
- **G-3**: No file in `packages/ai/src/providers/openai.ts` or `google.ts`
  may import `process` — provider constructors take keys explicitly (FR-3).
- **G-4**: `packages/ai/src/index.ts` barrel must export `AIClient`,
  `createAIClient`, `getAIClient`, `resetAIClient`, all three error
  classes, and `MockAIClient`. Assert via import in a barrel test.
- **G-5**: AGENTS.md §AI: application code calls `ai.generateText()` etc.
  through the adapter — no `@ai-sdk/*` allowed in any `apps/*` package
  going forward (extend G-1 to all apps in a follow-up).

## 5. Per-phase test approach notes

- **Phase 1**: type-only — `expectTypeOf<AIClient['generateObject']>().toBeCallableWith(...)`. No runtime tests.
- **Phase 2**: write the contract suite **here** so Phases 3–4 inherit it. Snapshot test uses a deterministic seed.
- **Phase 3/4**: prefer `vi.mock('@ai-sdk/openai', () => ({ createOpenAI: vi.fn(...) }))` over hand-rolled fakes; assert the SDK was constructed with the explicit `apiKey` (NOT pulled from env).
- **Phase 5**: every test wrapped in `withEnv()`; use `describe.each` for the env matrix.
- **Phase 6/7**: refactor under TDD — write the failing service-class test against `MockAIClient` **before** touching the existing exported function. The existing tests (`recommendation-context.integration.test.ts`, `image-generator.test.ts`) act as the regression net.
- **Phase 8**: the grep-gate Vitest tests from §4 are the deliverable; CI failure on regression is the point.

## 6. Build-graph findings that shaped this strategy

Graph queried at 2026-06-06 05:51 (db mtime 2026-06-05 14:39, ~15 h, fresh).

- `build-graph inspect generateRecommendation` and `generateLessonDiagram`
  both show `param_flow ← param:client` — **the refactor has already
  introduced constructor injection**. The Phase 6/7 test plan can assume
  the `client` parameter exists and focus regression tests on behavioural
  equivalence with the pre-refactor exported wrappers.
- `build-graph callers generateRecommendation` / `generateLessonDiagram`
  return no `calls` edges in this graph — call sites in
  `app/api/ai/recommendations/route.ts` and `components/.../image-block.tsx`
  exist (per spec §FR-4/FR-5) but aren't traced as `calls` edges, so
  **route-level integration tests are required** to catch breakage that
  the graph can't see. Do not rely on graph-callers alone for blast radius.
- `build-graph search MockAIClient | OpenAIClient | GoogleAIClient` returns
  0 — provider classes aren't yet exported as named symbols the graph can
  resolve. After Phase 2–4 land, run `build-graph update ./graph.db
  packages/ai/src/providers/*.ts packages/ai/src/client.ts` and re-verify
  the barrel.
- `unstable_recommendationTestkit` schema in the route file is an existing
  test seam — reuse it in Phase 6 instead of inventing a parallel fixture.
- Only `apps/science-advantage` imports the affected files (graph package
  breakdown shows AI files live solely under that app). Cross-app blast
  radius for this track is **zero**; other apps are unaffected until they
  opt in to `@reading-advantage/ai`.
