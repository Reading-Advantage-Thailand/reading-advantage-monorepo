# Test Strategy: Jest 30 Major Migration

**Tech Lead role.** Concise plan for proving Jest 30 compatibility across `apps/reading-advantage` and `apps/advantage-games`.

## 0. Build-Graph Findings That Shaped This Strategy

`graph.db` is fresh (mtime 2026-06-18). `build-graph stats` reports 325 files, 2277 nodes, 3210 edges. `build-graph search ./graph.db jest` returns no nodes — Jest is **infrastructure**, not a graphed symbol; runtime exposure lives in `apps/<app>/jest.config.ts`, `jest.setup.ts`, and 264 `*.test.*` files (81 in reading-advantage, 183 in advantage-games). Therefore graph-wide blast-radius queries do not apply; the blast surface is the file-level test inventory and three top-imported packages (`db`, `auth`, `types`) that test mocks reach via `moduleNameMapper`.

Filesystem probe (not graph): `apps/advantage-games` is **already on `jest@^30.2.0` + `jest-environment-jsdom@^30.2.0`** (working reference). `apps/reading-advantage` is on `jest@^29.7.0` + `ts-jest@^29.2.5` + `@types/jest@^29.5.12` and uses `next/jest` AND `preset: "ts-jest"` simultaneously (redundant — next/jest already wires SWC). `jest.requireActual` is used in 7 files; `useFakeTimers` in 6 Konva/hook tests; no `toMatchSnapshot` callers. These are the hotspots Phase 3 must protect.

## 1. Testing-Pyramid Guidance Per Phase

| Phase | Pyramid emphasis | Why |
|---|---|---|
| 1 Contract/Schema | **Documentation + config-shape contract tests** (no live behavior) | Audit output is a markdown matrix; the only executable artifact is the new `jest.config.ts` shape. |
| 2 Test (Red) | **One narrow live unit** that exercises a Jest-30-only API path | Must fail under Jest 29 and pass under Jest 30 — proves the gate, not just the dependency manifest. |
| 3 Implement | **Existing unit-test pyramid runs unchanged** + targeted regression spot-checks on the 13 hotspot files (`requireActual`, fakeTimers) | Migration must not invent new tests; it must keep the existing pyramid green. |
| 4 Validate | **Aggregate gate** — turbo `lint|test|check-types|build` across the whole monorepo | Full-suite proof that no other package regressed. |

No new e2e or integration tests are introduced by this track. Playwright suites are out of scope (E2E uses its own `test:e2e` script and is excluded by `testPathIgnorePatterns`).

## 2. Shared Fixtures & Mocks

- **Reference config**: `apps/advantage-games/jest.config.ts` is the canonical Jest-30-shape next/jest config. Treat it as the fixture for the new reading-advantage config.
- **`jest.setup.ts` polyfills** (TextEncoder/TextDecoder, Request/Response stubs, `next-intl` mock) must be preserved verbatim — they are load-bearing for 81 RA tests.
- **`moduleNameMapper`** in reading-advantage points at TS source (`packages/*/src/index.ts`); advantage-games points at built `dist/`. Do not unify — that is a different track.
- **`jest.requireActual` callers** (7 files: castle-defense, dragon-rider, dragon-flight, dashboard-summary, assignment-prediction, query-optimizer, RPG store) are the canary — Jest 30 keeps the API but tightens module-graph caching; these must be re-run individually after the upgrade.
- **No bespoke harness is introduced.** Runner plumbing (turbo + pnpm) is unchanged.

## 3. Cross-Phase Edge Cases & Dependencies

1. **`ts-jest` peer drift.** ts-jest 29.x peer-depends on jest 29; bumping jest to 30 without bumping ts-jest is silently allowed by pnpm but breaks at runtime on TS-only test files. Phase 3 must bump ts-jest to a Jest-30-compatible release **or** drop the `preset: "ts-jest"` line entirely (next/jest's SWC already handles TS — this is the recommended path and matches advantage-games).
2. **`@types/jest` drift.** TS will green-light Jest-29-shaped types against a Jest-30 runtime; `check-types` will not catch this. Bump `@types/jest` in lockstep.
3. **Pre-existing hang in reading-advantage full Jest run** (>10min, see `tech-debt.md`). This is **not** caused by this track but will mask Jest-30 regressions. Phase 4 must declare whether the gate uses targeted `--testPathPattern="__test__"` (≈194 tests, known-passing baseline) or a CI-only full run; do not silently downgrade the gate.
4. **advantage-games is already Jest 30.** Its current state is the post-condition, not a hypothesis. Re-running its suite after lockfile changes is a smoke check, not a migration.
5. **Snapshot format.** No `toMatchSnapshot` callers exist — AC#3 ("Snapshot tests updated") is vacuously satisfied; record this in the audit so it is not faked with a new snapshot test.
6. **Module-graph caching change in Jest 30.** ESM-style mocks via `jest.unstable_mockModule` are not currently used (rg returns zero hits), so the largest Jest-30 ESM landmine is sidestepped.

## 4. Architecture Guardrails

- **No production source files may be edited** by this track — only `package.json`, `pnpm-lock.yaml`, `jest.config.ts`, `jest.setup.ts`, `measure/tech-stack.md`, and this track's docs.
- **No new test framework** is introduced. Vitest packages remain on Vitest; Jest packages remain on Jest. Mixed-runner status is intentional and tracked elsewhere.
- **No suppression of failures via `testPathIgnorePatterns`** beyond the existing E2E exclusion. If a test fails under Jest 30, it must be fixed in Phase 3, not skipped.
- **No global polyfill expansion.** If Jest 30 needs more polyfills, they are added to `jest.setup.ts` only — never to `global` in production code.
- **Adapter discipline (AGENTS.md):** Tests must not import provider SDKs directly even if Jest 30 made it easier. The `@reading-advantage/ai` adapter rule still applies.

## 5. Per-Phase Test Approach

- **Phase 1 — Audit (artifact contract).** Produce a breaking-changes matrix in this track folder. The only executable artifact is a *config-shape contract test* — a tiny ts file under `apps/reading-advantage/__test__/jest30-config.contract.test.ts` that imports the resolved config and asserts the keys/values required by Jest 30 (no runtime: pure shape). This is **not** a live-behavior test and must be labeled as such.
- **Phase 2 — Red.** Add ONE focused live-behavior test that uses a Jest-30 API guarantee (e.g., asserts `expect.getState().testPath` semantics or the tightened `jest.fn().mock.calls` typing). Verify it FAILS on the current Jest 29 runtime in reading-advantage and PASSES on advantage-games (already Jest 30). Without both halves, Phase 2 is incomplete.
- **Phase 3 — Green.** Bump `jest`, `jest-environment-jsdom`, `@types/jest` to ^30; either bump `ts-jest` to a Jest-30-compatible release or drop `preset: "ts-jest"` and rely on next/jest SWC. Run the 13 hotspot files individually first; only then run the targeted `__test__` suite (~194 tests).
- **Phase 4 — Closeout.** Aggregate gate. Update tech-stack.md with the chosen Jest 30 patch version and the ts-jest decision. Document the targeted-vs-full reading-advantage run choice in the closeout entry.

## 6. Live-Proof Plan (Red Command + Green Gate Per Phase)

| Phase | Targeted Red command | Green / closeout gate | Live or Artifact? |
|---|---|---|---|
| 1 | `pnpm --filter reading-advantage exec jest __test__/jest30-config.contract.test.ts` (assert config-shape contract — bounded, single file) | Same command exits 0; audit matrix committed | **Artifact contract** (config shape only) |
| 2 | `pnpm --filter reading-advantage exec jest <new red test path>` — must FAIL on Jest 29; same command on advantage-games must PASS | Red test passes after Phase 3 upgrade; bounded to the single new file (no `--testPathPattern` widening) | **Live behavior** |
| 3 | `pnpm --filter reading-advantage exec jest <each of the 13 hotspot files>` — each must PASS individually; then `pnpm --filter reading-advantage exec jest --testPathPattern="__test__"` | All 13 hotspots green; targeted `__test__` run matches the tech-debt-recorded 11 suites / 194 tests baseline; advantage-games `pnpm --filter vocabulary-games test` green | **Live behavior** (bounded smoke per file before any wider run) |
| 4 | `pnpm turbo run lint test check-types build` — full monorepo aggregate | Exit 0 across all packages; `pnpm outdated -r` shows Jest at 30.x in both apps; `measure/tech-stack.md` updated | **Live behavior** (full aggregate) |

**No fake harness is introduced by this track.** Runner plumbing is the existing turbo + pnpm + jest CLI; every command above invokes the real Jest binary against real test files. The Phase 1 contract test is explicitly scoped to *config shape*, not behavior, and is named so reviewers cannot mistake it for a runtime gate.

## Intentionally-Red Files Discovered By Aggregate Suites

None. `rg` for `describe.skip|it.skip|xtest|xit|test.todo|@skip` across both apps returns zero matches. There are no quarantined red files that the Phase 4 aggregate gate could fall through. If Phase 2's new red test is committed before Phase 3 lands, it becomes a transient intentionally-red file — it must remain owned by the still-`[~]` Phase 3 task, and no aggregate run may execute between commits. The plan already orders Phase 2 → Phase 3 contiguously, so this is enforced by task ordering, not by ignore-globs.

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: jest30_major_migration
phase: track setup (pre-Phase 1 strategy)
commits: none
tests_run: build-graph stats ./graph.db (PASS, 2277 nodes / 3210 edges); build-graph search ./graph.db jest (no symbol matches — expected, jest is infrastructure)
files_changed: measure/tracks/jest30_major_migration/test-strategy.md (new)
plan_updates: none — plan.md left untouched as instructed
known_failures: none from this strategy step. Pre-existing: full `pnpm --filter reading-advantage test` hangs >10min (tech-debt.md, 2026-05-23) — Phase 4 gate must explicitly choose targeted `__test__` pattern or CI-only full run, not silently mask.
handoff: Phase 1 implementer should: (a) confirm advantage-games Jest 30 baseline still green as the working reference; (b) decide ts-jest-bump vs drop-preset (recommended: drop, match advantage-games); (c) write the Phase 2 red test against a concrete Jest-30 API (e.g., `expect.getState()` typing, or `jest.fn` mock-call signature) and verify it fails on RA / passes on advantage-games before Phase 3 starts.
END_MEASURE_AGENT_RESULT
