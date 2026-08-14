# Phase 3 repository verification — 2026-08-14

## Result

Phase 3 remains active. Focused kernel checks passed, and the repository failures contain zero known kernel failures.

The database and domain package gates remain red. The architecture package still reports existing debt, but the kernel added no architecture finding.

A Company Identity owner must decide D1 and D2.

## Evidence scope

- Immutable phase base: `c1effc467109e6890907580ff0075919ab4267cd`
- Verification revision: `622c4c5dfd56a123acb188f58c6b558384efa287`
- Architecture compatibility source: `a084bb4a9`
- PostgreSQL container: `measure-audit-pg`
- PostgreSQL version: 16.14

The database and domain runs used the shared source checkout. The kernel scope remained unchanged during both runs.

The architecture repair landed after those package runs. It changes no kernel implementation file.

These runs record the observed counts and failure classes.
They do not provide the required failing-file list.
They do not certify a clean repository snapshot.

## Focused kernel verification

Working directory: `packages/backend`

```bash
PG_TEST_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres \
  CI=true node ../../node_modules/vitest/vitest.mjs run src/kernel/__tests__
```

Result: 10 files passed and 165 tests passed.

The coverage run reported 95.48% statements, 92.76% branches, 100% functions, and 95.46% lines for `src/kernel`.

Both backend type gates passed:

```bash
../../node_modules/.bin/tsc --noEmit
../../node_modules/.bin/tsc --noEmit -p tsconfig.test.json
```

## Database package verification

Working directory: `packages/db`

```bash
env -u DATABASE_URL -u DIRECT_DATABASE_URL \
  CI=true \
  PG_TEST_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres \
  COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
  ../../node_modules/.bin/vitest run \
  --maxWorkers=2 \
  --reporter=default \
  --reporter=json \
  --outputFile.json=/tmp/backend-kernel-db-full-corrected-20260814.json
```

The command exited 1 after 246.72 seconds.

| Result | Count |
|---|---:|
| Test files passed | 77 |
| Test files failed | 14 |
| Tests passed | 1,142 |
| Tests failed | 39 |
| Tests skipped | 6 |

| Failure class | Count |
|---|---:|
| Kernel-caused | 0 |
| Unrelated repository | 33 |
| Environment or transient | 6 |
| Unknown | 0 |

The 33 repository failures cover active durable-job Red tests, append-only reset guards, and stale Company Identity fixtures.

The six environment failures cover Podman limits, missing `psql`, Docker access, and two aggregate timeouts. Both timed-out tests passed alone.

The kernel schema test passed before, during, and after the package run. Each focused run passed both tests.

Evidence files:

- JSON SHA-256: `0d996f4f07714cdb76f1bf18d1cca6590a8de876f79a2a7f6b4430c5d7530e8c`
- Classification SHA-256: `a18716468a0973217ba4f6cb2748a109c6cf494d270c385736b79742059623ea`

The referenced temporary evidence files are not available in the repository.
The complete database gate and R3 remain open.

## Domain package verification

Working directory: `packages/domain`

```bash
CI=true env -u DATABASE_URL -u DIRECT_DATABASE_URL -u POSTGRES_URL \
  RUN_SALES_REAL_DB_TESTS=false \
  RUN_SALES_MAPPING_REAL_DB_TESTS=false \
  node ../../node_modules/vitest/vitest.mjs run \
  --maxWorkers=1 \
  --no-file-parallelism \
  --reporter=json \
  --outputFile=/tmp/backend-kernel-domain-full-622c4c5d.json
```

The command exited 1 after 839.92 seconds.

| Result | Count |
|---|---:|
| Test files | 70 |
| Tests passed | 682 |
| Tests failed | 74 |
| Tests skipped | 16 |

| Failure class | Count |
|---|---:|
| Kernel-caused | 0 |
| PGlite reset failures | 47 |
| Later state collisions | 22 |
| Unrelated assertions | 5 |
| Unknown | 0 |

The PGlite reset tried to truncate new append-only Finance tables. The trigger rejected the reset, and 22 later tests found stale state.

The five unrelated assertions cover curriculum flags and duplicated activity contract drift. No failure stack entered the kernel.

The focused tenant coverage test passed all 12 tests. The capability idempotency coverage also passed within its 29-test file.

JSON SHA-256: `1a43ff890f16956415bac52262abb200298efd5a0d90b7c6ca46fc7d66f34850`.

The referenced temporary evidence file is not available in the repository.
The complete domain gate and R4 remain open.

## Architecture comparison

The checker ran against a detached phase-base checkout and the current checkout. Both runs used complete workspace manifests and installed package links.

| Report | Files | Findings | Parse errors | Additions | Removals | Renames |
|---|---:|---:|---:|---:|---:|---:|
| Phase base | 4,249 | 697 | 0 | 137 | 0 | 21 |
| Current | 4,255 | 697 | 0 | 137 | 0 | 21 |

The normalized findings and comparison objects match exactly. The six extra scanned files do not change a finding or comparison entry.

- Findings SHA-256: `dd00b46eb501f56d5760da67931cf49eeeb00151bbacea28a359c0ac2a2671b9`
- Comparison SHA-256: `53cb53d1456e7b25ed222d6cc5aa3cf8e6380bf009f757964fbe7693f340a90b`
- Phase-base report SHA-256: `5c2a1d8cac7905324594a9b3f6d2b258cb83e74ff41ca6427f7189d67da00ded`
- Current report SHA-256: `b35b5d1eb3724844fc9ba27bc5ed98487067783ac7c6031dca1f3087013d3ed8`

All 137 additions existed at the phase base. Git blame assigns every addition line to an earlier commit.

The kernel architecture delta is zero.

## Architecture evidence compatibility

An archive commit moved five accepted evidence files from `measure/tracks` to `measure/archive`. The frozen validator still requires the original paths.

Commit `a084bb4a9` adds a relative directory alias. Each original path resolves to its same-name archived evidence file.

The repair preserves the frozen manifest, evidence bytes, implementation trees, and review subject. It does not add the 137 findings to a baseline.

A focused test binds the alias target, manifest hash, five evidence hashes, and five paths. CI runs the test for either evidence location.

Verification results:

- Focused compatibility test: 1 test passed.
- Architecture package lint: passed.
- Architecture package type check: passed.
- Complete architecture package: 28 files and 211 tests passed.
- Frozen evidence and hash validation: passed.
- Live baseline checker: exited 1 with `debt-change`.

The repository architecture gate remains red because the existing 137 additions still require their owning tracks. Equal debt closes kernel item R5.

The Measure doctor passed the archive, catalog, and supervisor guards. It then found deprecated markers in nine unrelated active tracks.

## Acceptance status

- R1 is closed by the kernel coverage proof.
- R2 is closed because both backend type gates pass.
- R3 remains open until the track names each database failure file.
- R4 remains open until the track names each domain failure file.
- R5 is closed because the phase-base and current architecture debt are equal.
- R6 remains open until a Company Identity owner records D1 and D2.
- R7 is closed by the existing caller audit.

Focused checks found no kernel defect.
Phase 3 needs the R3 and R4 dispositions and the R6 owner decision.
