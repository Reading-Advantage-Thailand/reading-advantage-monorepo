# Resumed package check repairs

This report covers AI, Types, UI, Practice Core, and CI wiring.
It excludes config console sites, Auth evidence, and lockfile reconciliation.

## Changes

- AI manifest tests now resolve `catalog:` values through the installed YAML parser.
- The AI package now declares `yaml` version `2.9.0` as a development dependency.
- AI lock tests parse pnpm lockfile version 9 keys.
- AI lock tests still reject conflicting SDK majors.
- The Zod check now validates the AI importer and the relevant SDK peer ranges.
- This scope permits unrelated workspace packages to use another Zod major.
- AI closeout tests now read the archived track artifacts.
- The stream scanner now accepts awaited member calls.
- Positive and negative scanner cases protect the await contract.
- AI setup tests resolve dependencies from the package context.
- The AI build smoke resolves TypeScript from the package context.
- The Types guard starts installed Vitest with `process.execPath`.
- The Types guard checks subprocess errors, status, and signals before JSON parsing.
- The UI setup imports the Vitest matcher declaration entry.
- The root `test` script again runs the Turbo workspace test task.
- A separate root script preserves the four Codecamp cold-start tests.
- CI runs the generator gate inside the `packages` job with `CI=true`.
- CI runs the Codecamp script and the full workspace test task.

The AI manifest change requires the later lockfile reconciliation task.
This task did not modify `pnpm-lock.yaml`.

## Verification

- `git diff --check` passed.
- A direct Node precheck parsed the workspace and lock YAML.
- The precheck found one target major for each selected AI SDK package.
- The precheck found all three archived artifacts.
- The precheck resolved the installed Vitest entry from the Types package context.
- The precheck parsed `package.json` and `.github/workflows/ci.yml`.
- TypeScript transpilation reported no syntax errors in the six changed TypeScript files.

The host had sustained load during direct checks.
The direct AI Vitest run started and reported two Phase 0 failures before it stalled.
The failed tests were the barrel export test and the TypeScript build smoke.
The runner did not return failure diagnostics before interruption.
The earlier complete AI failure log is `/tmp/monorepo-review-tests-packages-ai.log`.
The interrupted repair run did not create a separate log file.
The direct TypeScript check also stalled without output.
Both build-graph update attempts stalled without output.
The agent stopped each stalled process and left no package launcher running.

Final integration must run these commands sequentially:

```bash
node node_modules/vitest/vitest.mjs run packages/ai/src/__tests__/phase-11-sdk-version-contract.test.ts packages/ai/src/__tests__/phase-12-closeout-artifacts.test.ts packages/ai/src/__tests__/phase-13-adversarial-streamText-await.test.ts packages/ai/src/__tests__/phase-0-setup.test.ts --maxWorkers=1 --no-file-parallelism
node node_modules/vitest/vitest.mjs run packages/types/src/__tests__/wave2-types-regression-guard.test.ts --maxWorkers=1 --no-file-parallelism
node node_modules/vitest/vitest.mjs run packages/practice-core/src/generator-qa/__tests__/gate-wiring.test.ts --maxWorkers=1 --no-file-parallelism
node node_modules/typescript/bin/tsc --noEmit --pretty false -p packages/ui/tsconfig.json
node node_modules/vitest/vitest.mjs run packages/ui/src/__tests__ --maxWorkers=1 --no-file-parallelism
build-graph update ./graph.db packages/ai/src/__tests__/phase-11-sdk-version-contract.test.ts packages/ai/src/__tests__/phase-12-closeout-artifacts.test.ts packages/ai/src/__tests__/phase-13-adversarial-streamText-await.test.ts packages/ai/src/__tests__/phase-0-setup.test.ts packages/types/src/__tests__/wave2-types-regression-guard.test.ts packages/ui/src/__tests__/setup.ts
```

## Orchestrator verification

The focused AI run passed all 54 tests across four files with the package Vitest configuration.
The log is `/tmp/resume-verify-ai.log`.

The Types guard passed both tests after permitted subprocess access.
Its log is `/tmp/resume-verify-types-permitted.log`. The nested peer suite also passed.

The generator CI wiring tests passed all five cases.
The log is `/tmp/resume-verify-generator-gate.log`.

The UI type check completed successfully.
The log is `/tmp/resume-verify-ui-types.log`.

The complete UI suite passed all 13 tests across six files.
The log is `/tmp/resume-verify-ui-tests.log`.
