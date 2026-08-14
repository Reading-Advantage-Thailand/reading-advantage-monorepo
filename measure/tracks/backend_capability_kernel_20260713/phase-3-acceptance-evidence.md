# Phase 3 acceptance evidence

## Scope and identifiers

- Immutable `phase_base_sha`: `c1effc467109e6890907580ff0075919ab4267cd`
- Green implementation commit: `316bbe193`
- Historical Red commit: `569f4f2143810c403e2a15d1ea405cc64a933209`
- Red ancestry check: `569f4f214` is an ancestor of `phase_base_sha`.

The historical Red commit is outside `phase_base_sha..HEAD` because the phase
base follows the committed strategy evidence. The ancestor check preserves the
Red contract provenance.

## Green kernel proof

```bash
PG_TEST_URL=postgres://postgres:postgres@localhost:5432/postgres \
  CI=true pnpm --filter @reading-advantage/backend exec vitest run src/kernel/__tests__
```

Result: 10 test files passed and 165 tests passed. No test skipped.
The PostgreSQL 16 container was `measure-audit-pg` using `postgres:16`.

The integration migration lookup now resolves from `import.meta.url`.
The same proof no longer depends on the working directory.

## Coverage evidence

```bash
PG_TEST_URL=postgres://postgres:postgres@localhost:5432/postgres \
  CI=true pnpm --filter @reading-advantage/backend exec vitest run src/kernel/__tests__ --coverage
```

Result: 10 test files passed and 165 tests passed.
Kernel aggregate coverage was 95.48% statements, 92.76% branches, 100% functions,
and 95.46% lines. Every reported `src/kernel/**` file has at least 80% line coverage.
The added coverage regression tests cover request-context isolation and projection
rejection paths.

## Required focused subsets

`capability-idempotency-schema.test.ts`: 1 file and 2 tests passed.
`tenant-coverage.test.ts`: 1 file and 12 tests passed.

## R2 disposition: backend type gate

`pnpm --filter @reading-advantage/backend exec tsc --noEmit` passed.
`tsc --noEmit -p tsconfig.test.json` also passed on 2026-08-14.
R2 is closed.

## R3 and R4 dispositions

The complete database run passed 1,142 tests and failed 39 tests.
The classification assigns zero failures to the kernel and zero failures to an unknown cause.

The complete domain run passed 682 tests and failed 74 tests.
The classification assigns zero failures to the kernel and zero failures to an unknown cause.

The focused database and domain subsets passed.
The available summary records counts and failure classes.
It does not name every failing file.

The referenced temporary reports are not available in the repository.
R3 and R4 remain open until the track records each failing file.
The complete repository package gates remain red.

See `phase-3-repository-verification-20260814.md` for commands, hashes, and classifications.

## R5 architecture disposition

The immutable phase-base and current reports contain the same 697 findings.
They also contain the same 137 additions, zero removals, and 21 renames.

The kernel architecture delta is zero. Commit `a084bb4a9` restores the five frozen evidence paths without changing their accepted bytes.

Frozen evidence and hash validation pass.
The live baseline checker exits 1 with `debt-change`.
The existing 137 additions still require their owning tracks.

The phase-base and current debt records are equal. R5 is closed for kernel acceptance.

See `phase-3-repository-verification-20260814.md` for the comparison hashes.

## Doctor disposition

`bash measure/doctor.sh` exited 1. It reports deprecated `[ ]` task markers in
other active tracks. This track did not add those markers.

## Acceptance status

R1, R2, R5, and R7 are closed for kernel acceptance.
R3 and R4 need exact failing-file dispositions.
R6 awaits owner acceptance. Phase 3 is not accepted.
