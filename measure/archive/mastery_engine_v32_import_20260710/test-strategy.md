# Test Strategy: Phase S1 — Import the Proven v2 Core

## Purpose

Prove that the four existing Mastery Advantage v2 packages enter this workspace as a
mechanical, framework-neutral import before any v3.2 behavior is changed. Phase S1 is
an extraction/import proof, not an algorithm migration.

## Frozen source provenance

- Repository: `/home/daniel-bo/Desktop/ra-math-advantage`
- Commit: `3e0b3517c42cfe0b603295a1ec48548505617169`
- Package paths are clean at the frozen commit despite unrelated sibling-repository
  worktree changes.
- Tracked package-set inventory: 199 files, including 101 `*.test.ts`/`*.spec.ts`
  files.

| Source package | Frozen tree | Destination package |
|---|---|---|
| `packages/knowledge-space-core` | `59d65b7820bed92bfd81796369c4265d8e37b84f` | `@reading-advantage/knowledge-space-core` |
| `packages/knowledge-space-practice` | `def1ea044552c026ee4a2bbb700068dab13e1bc5` | `@reading-advantage/knowledge-space-practice` |
| `packages/srs-engine` | `30ee7d4533f0aaa5dffa0fb5cf4a292bc1f30901` | `@reading-advantage/srs-engine` |
| `packages/practice-core` | `fa72f9313d35dda8ffc22c098fd62c3ad7f8ff19` | `@reading-advantage/practice-core` |

The implementation role must record a source-to-destination file inventory and a
normalized content comparison. Allowed normalization is limited to package scope,
workspace dependency syntax, import specifiers, build output/exports, and repository
configuration required by this pnpm/Turborepo workspace. Every other difference must
be listed in an import deviation report.

## Known source baseline

Source tests must be executed sequentially with one worker and a deterministic timezone
to avoid concurrent-load noise. The strategy-role probe observed:

- `practice-core`: 193/193 passing.
- `srs-engine`: 232/233 passing; one inherited 1 ms `Date.now()` boundary failure.
- `knowledge-space-core`: 672/673 passing; one inherited five-second runtime-export
  timeout under concurrent/noisy execution.
- `knowledge-space-practice`: baseline run was not completed before handoff and must be
  captured by the Red role using the sequential command below.

These are source-baseline observations, not accepted destination failures. Red must
reproduce/classify them, and Green must either make the import deterministic without
changing algorithm semantics or document a still-reproducible source defect. Do not
claim a clean baseline while either failure remains unexplained.

## Phase S1 contract tests

### 1. Workspace and export contract

- All four destination manifests are discovered by pnpm and Turborepo.
- Package names and subpath exports match the approved neutral mapping.
- Cross-package dependencies use `workspace:*` and resolve only through declared
  dependencies.
- TypeScript ESM output and `.js` import conventions match this monorepo.

### 2. Provenance and equivalence contract

- A machine-readable provenance artifact records source repository, commit, package
  tree IDs, destination names, and normalized transformation rules.
- A test compares the frozen source inventory to the destination inventory and fails on
  unexplained added, removed, or behavior-bearing changed files.
- Original source tests are retained and remain attributable to their original paths.

### 3. Forbidden-import contract

Engine package production source must not import:

- React, Next.js, Vinext, Vite UI/runtime helpers, or app-private modules.
- Drizzle, PostgreSQL clients, Convex, Firebase, Prisma, or transport routers.
- Provider SDKs, AI SDK providers, authentication, storage, webhooks, or environment
  access.

Allowed production dependencies for S1 are the source dependency set plus neutral
workspace links: Zod and `ts-fsrs` where already used.

### 4. Behavioral baseline contract

- Run every retained source test in its destination package.
- Use a fixed `TZ=UTC`, one worker, and deterministic test order where supported.
- Run package tests separately so one package cannot hide or starve another.
- Any timeout/boundary stabilization must have a focused regression test and must not
  change public algorithm results.

## Red role scope and command

Red may add only tests, test fixtures, and Measure artifacts. It must not create the
four destination production packages.

Expected Red files:

- `packages/__tests__/mastery-engine-import-contract.test.ts` or an equivalently
  isolated root/package-boundary test location.
- Track-local provenance/equivalence fixtures as needed.
- `test-strategy.md` or `plan.md` evidence updates only.

Required Red command after the test is written:

```bash
TZ=UTC pnpm exec vitest run packages/__tests__/mastery-engine-import-contract.test.ts --maxWorkers=1
```

It must fail because the four destination packages/provenance artifact do not yet
exist, not because of syntax, missing test dependencies, or unrelated repository debt.

## Green role scope and commands

Green may create only:

- `packages/knowledge-space-core/**`
- `packages/knowledge-space-practice/**`
- `packages/srs-engine/**`
- `packages/practice-core/**`
- narrowly required workspace/catalog/Turbo/TypeScript configuration
- the Phase S1 provenance/deviation artifact and plan evidence

Required focused Green gates:

```bash
TZ=UTC pnpm exec vitest run packages/__tests__/mastery-engine-import-contract.test.ts --maxWorkers=1
pnpm --filter @reading-advantage/knowledge-space-core test -- --maxWorkers=1
pnpm --filter @reading-advantage/knowledge-space-practice test -- --maxWorkers=1
pnpm --filter @reading-advantage/srs-engine test -- --maxWorkers=1
pnpm --filter @reading-advantage/practice-core test -- --maxWorkers=1
pnpm --filter @reading-advantage/knowledge-space-core check-types
pnpm --filter @reading-advantage/knowledge-space-practice check-types
pnpm --filter @reading-advantage/srs-engine check-types
pnpm --filter @reading-advantage/practice-core check-types
```

Phase acceptance additionally runs package lint/build, dependency/boundary guards,
source-equivalence verification, `build-graph update` or rescan for the imported TypeScript
surface, and the affected root Turbo gates.

## Anti-pattern defenses

- A4: no phase pass when zero tasks/tests are complete.
- A5/A6: no clean-baseline or equivalence claim without command and inventory evidence.
- A7: forbidden-import filters match package/import paths, not broad English words.
- A8: top-level plan markers remain `[~]`, `[x]`, or structured `[b]` only.
- A10: structural import requires graph refresh before phase acceptance.

## Handoff

The Mid Red role should first create the import contract test and prove it fails for the
missing destination packages. It should then capture the four source package baselines
sequentially and attach exact logs. The Jr Green role performs the mechanical import,
resolves only deterministic harness/config issues needed to reproduce source behavior,
and records every normalized deviation. v3.2 algorithm changes are forbidden until
Phase S2.
