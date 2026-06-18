# Plan: Jest 30 Major Migration

## Phase 1: Contract & Schema Definition

- [x] Task: Audit Jest 30 breaking changes relevant to the monorepo. (`ee707dfd`)
- [x] Task: Identify configuration and API changes needed. (`ee707dfd`)

### Phase 1 — Red proof (contract test)

Targeted Red command (bounded to a single file, no watch, no full-suite):

```
pnpm --filter reading-advantage exec jest __test__/jest30-config.contract.test.ts --no-coverage
```

Result at HEAD (Jest 29 baseline, current `apps/reading-advantage/jest.config.ts`):

```
Test Suites: 1 failed, 1 total
Tests:       2 failed, 4 passed, 6 total
```

The 2 failing tests are the load-bearing contract assertions and fail
**for the right reason** (current implementation is wrong, not because
of stale records):

1. `does NOT declare the redundant ts-jest preset` — fails because
   `apps/reading-advantage/jest.config.ts:16` still declares
   `preset: "ts-jest"`.
2. `does NOT use the full module-name 'jest-environment-jsdom' string`
   — fails because `apps/reading-advantage/jest.config.ts:15` still
   declares `testEnvironment: "jest-environment-jsdom"`.

The 4 passing tests (`jsdom` literal, `coverageProvider: "v8"`,
`setupFilesAfterEnv` for `jest.setup.ts`, `next/jest` wiring) pass
because the post-migration target keys are present as
`//`-commented placeholders in the current config and the test reads
the source as text. After Phase 3 replaces the comments with real
declarations (per `jest30-audit.md` §3), those 4 tests must continue
to pass — they are not false-positive Red and are not a contract
loophole.

### Phase 1 — Green proof (config shape applied)

Commit `04c76fc7` applied the §3 changes from `jest30-audit.md`:
removed `preset: "ts-jest"`, replaced `testEnvironment:
"jest-environment-jsdom"` with `"jsdom"`, and activated
`coverageProvider: "v8"`.

```
Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

## Phase 2: Test

- [x] Task: Add focused test verifying Jest 30 compatibility. (`f7dea19d`)
- [x] Task: Confirm tests fail under the current Jest 29 baseline with Jest 30 config. (`f7dea19d`)

### Phase 2 — Red proof (live-behavior test)

Targeted Red command (bounded to a single new file, no watch, no full
suite; the `jest.config.ts` already applied in Phase 1 — commit
`04c76fc7` — drives the contract test green, so this Red proof is the
**runtime** companion to the Phase 1 **config-shape** proof):

```
cd apps/reading-advantage && ./node_modules/.bin/jest __test__/jest30-red.test.ts --no-coverage
```

Red proof — recorded at the START of Phase 2, before any Phase 3
bump (commit `f7dea19d`):

```
Test Suites: 1 failed, 1 total
Tests:       3 failed, 1 passed, 4 total
```

The 3 failing tests fail **for the right reason** — the installed
`jest` runtime is on the 29.x release line, which is exactly the
missing-behavior Phase 3 will remediate. The 1 passing test
(`expect.getState() returns an object with a `testPath` field`) is a
sentinel that the test harness itself is healthy; it passes on both
Jest 29 and Jest 30 and is documented as such inline so reviewers
cannot mistake it for a false-positive Red.

Cross-app sanity (advantage-games is already on Jest 30.x — the
post-condition). Verified by placing a temporary copy of the same
test file at `apps/advantage-games/src/lib/` and running through
advantage-games' own jest config (Jest 30.3.0):

```
cd apps/advantage-games && ./node_modules/.bin/jest src/lib/jest30-red.cross-app-verify.test.ts --no-coverage
```

```
Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

The cross-app verify copy is deleted before commit (the strategy
specifies **one** test file in `apps/reading-advantage/`); the
"passes on advantage-games" half is therefore a *runtime* proof, not
just a logical one. The two halves are:

| App | Jest | Red result | Bound check |
|---|---|---|---|
| `apps/reading-advantage` | 29.7.0 | 3 fail / 1 pass (gate enforced) | `__test__/jest30-red.test.ts` |
| `apps/advantage-games` | 30.3.0 | 4 pass / 0 fail (gate satisfied) | `src/lib/jest30-red.cross-app-verify.test.ts` (temp) |

Node-level `require.resolve` from the advantage-games paths also
resolves `jest/package.json` to `jest@30.3.0` (major 30), confirming
the resolution path the test relies on is correct in the post-
condition environment.

The test file's value disappears once Phase 3 lands the runtime
bump; Phase 3 will re-run this Red command and expect 4 pass / 0
fail, after which the file can be retired (or kept as a permanent
regression test — to be decided at Phase 3 closeout).

See `jest30-red.test.ts` inline header for the design rationale
(version-resolved runtime check, bounded scope, no full-suite
hazard).

### Phase 2 — Mid-role hand-off (worktree state at 2026-06-19)

Dirty-worktree audit (per the user's MID-start instructions,
"classify every dirty path before editing"):

| Path | Status | Classification | Action by Phase 2 |
|---|---|---|---|
| `apps/reading-advantage/package.json` | modified | **Relevant to this track, AHEAD OF PHASE** — Phase 3 dependency bump (`jest` 29.7.0 → 30.2.0, `jest-environment-jsdom` 29.7.0 → 30.2.0, `ts-jest` 29.2.5 removed, `@types/jest` 29.5.12 → 30.0.0) | Leave untouched. Per "Do NOT modify existing source code except test files and Measure docs", and per "do not hide it in this track's commit", the Phase 3 work is **not** folded into this Phase 2 commit. It belongs to Phase 3. |
| `pnpm-lock.yaml` | modified | Same — generated by the package.json bump above | Leave untouched. |
| `apps/marketing/next-env.d.ts` | untracked | **Generated / ignorable** — Next.js auto-generated types file | Leave untracked. |
| `measure/tracks/agents_md_audit_science_advantage_20260603/` | untracked | **Unrelated user work** — different track (science-advantage AGENTS.md audit) | Leave untouched, do not commit. |

Consequence for the Phase 2 Red proof at this HEAD: the installed
`jest` package is now `30.3.0` (post-condition), so re-running the
canonical Red command returns **4 pass / 0 fail** instead of the
recorded **3 fail / 1 pass**. This is expected and is the natural
gate transition described in §Phase 2 — Red proof ("Phase 3 will
re-run this Red command and expect 4 pass / 0 fail"). The canonical
Red proof remains the `f7dea19d` record; this run is the Phase 3
preview, not a new Red.

Targeted Red/Green re-run at this HEAD (Mid-role confirmation, bounded
to the single Phase 2 file, no watch, no `--testPathPattern`
widening):

```
cd apps/reading-advantage && ./node_modules/.bin/jest __test__/jest30-red.test.ts --no-coverage
```

```
Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

Build-graph probe (per the user's "use build-graph before writing
tests" instruction; `graph.db` mtime 2026-06-19, fresh):

- `build-graph stats ./graph.db` → 2285 nodes / 3215 edges / 330 files
  (delta +8 nodes, +5 edges, +5 files vs. the `2277 / 3210 / 325`
  baseline recorded in `test-strategy.md` §0; matches the new test
  file `jest30-red.test.ts` + the existing Phase 1 contract test
  and audit doc).
- `build-graph inspect ./graph.db jest30-red.test.ts` →
  `file:jest30-red.test.ts` with 1 outgoing edge
  (`contains → function:resolveInstalledJest`), 0 incoming edges.
  The file is isolated (no production callers — Jest infrastructure
  tests are leaf nodes, as expected per `test-strategy.md` §0).
- `build-graph search ./graph.db jest30` returns the 3 jest30
  artifacts (audit md, contract test, red test). No symbol-level
  callers because Jest is infrastructure, not a graphed symbol —
  consistent with the strategy doc finding.

Phase 2 is closed by marking the two tasks `[x]` and recording this
hand-off note. **No new test file is written at this MID pass** —
the live-behavior gate was already produced and proven red in
`f7dea19d`; tightening the contract here would be a false-rewrite
(per the user instruction "do not create a false Red phase").
Phase 3 owns the runtime bump and the §3 schema updates; Phase 3
must re-run the targeted Red command above and confirm 4 pass / 0
fail at the post-condition HEAD before closing.

## Phase 3: Implement

- [ ] Task: Upgrade Jest to 30.x in reading-advantage and advantage-games.
- [ ] Task: Update Jest configuration for the new schema.
- [ ] Task: Fix any snapshot or mocking API changes.
- [ ] Task: Run test suites in both affected apps.

## Phase 4: Validate & Close

- [ ] Task: Run full `pnpm turbo run lint|test|check-types|build` aggregate gate.
- [ ] Task: Re-run `pnpm outdated` and `pnpm audit`; document results.
- [ ] Task: Update `measure/tech-stack.md` with the selected Jest version.
