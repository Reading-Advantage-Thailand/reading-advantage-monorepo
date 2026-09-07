# Verification priority implementation

## Result

Science tests now use separate runtime and CI verification configurations.
The Turbo verification task requires the Science build first.
The CI workflow runs Science verification immediately after the workspace build.
The Science verify script runs one compiler check before Vitest.
Seven CI gate files read `.turbo/verify-check-types.log` instead of starting ten compiler processes.

A direct Vitest command does not run the required Turbo build.
Use `pnpm verify:science` from the repository root for the complete CI gate.

## Files

- `apps/science-advantage/vitest.config.ts` excludes `lib/ci-gates/**` from runtime tests.
- `apps/science-advantage/vitest.unit.config.ts` excludes CI gates and keeps the Vitest default exclusions.
- `apps/science-advantage/vitest.verification.config.ts` runs only `lib/ci-gates/**/*.test.ts` in Node without database setup.
- `apps/science-advantage/package.json` defines the `verify` script.
- `package.json` defines `verify:science` and adds it to `validate`.
- `turbo.json` defines `science-advantage#verify` with a required build dependency and disabled verification caching.
- `.github/workflows/ci.yml` runs the required Science verification step after Build.
- `apps/science-advantage/lib/ci-gates/phase-8-ignore-build-errors.test.ts` reads the Turbo build log.
- `apps/science-advantage/lib/ci-gates/phase-12c-build-resolves.test.ts` reads the log and keeps its forbidden-output assertions.
- `apps/science-advantage/lib/ci-gates/phase-13-final-acceptance.test.ts` uses the verification config for its nested Phase 12 check.
- `apps/science-advantage/lib/ci-gates/verification-partition.test.ts` proves retained and disjoint discovery with the Vitest API.
- Seven compiler gate files now read the captured compiler log.

## Tests

The red run had two expected failures before the configuration changes.
The final focused run passed 17 tests across three files.
The Turbo dry run resolved `science-advantage#build` as the verification dependency.

Command:

```bash
PATH=/home/daniebo/.npm/_npx/9ddd603d7b7c182f/node_modules/.bin:$PATH pnpm_config_verify_deps_before_run=warn CI=true node ../../node_modules/vitest/vitest.mjs run --config vitest.verification.config.ts lib/ci-gates/verification-partition.test.ts lib/ci-gates/phase-8-ignore-build-errors.test.ts lib/ci-gates/phase-12c-build-resolves.test.ts --maxWorkers=1
```

The partition test uses `createVitest` and `globTestSpecifications` for each configuration.
It compares the two new discovered sets with the previous default discovered set.
Counterexamples prove the comparison detects a missing file and an overlapping file.
The command fixture proves a failed compiler blocks Vitest and replaces stale diagnostics.
The partition guard requires the exact `tsc --noEmit` package script.

The Turbo fixture confirmed that a cache hit restores a deleted task log.
The fixture also confirmed that a failed build prevents the verification task.
The evidence remains at `/tmp/architecture-turbo-restored.log` and `/tmp/architecture-turbo-failure.log`.

## Risks

The build-log assertions depend on Turbo task output restoration.
The fixture confirms this behavior when the build outputs match the repository ignore policy.
The complete verification task keeps the existing lint subprocess gates.
The orchestrator owns the final heavy verification run.
