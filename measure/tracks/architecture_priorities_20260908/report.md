# Architectural priorities

The implementation reduces repeated verification, narrows Science imports, and shares cookie parsing across three applications.
Astra low agents reviewed the changes.
Sol medium agents implemented the changes.

## Results

- Science verification reuses one build and one compiler result. It removes two nested builds and nine repeated compiler runs.
- Runtime tests and CI verification tests have separate configurations. Discovery tests prove complete coverage without overlap.
- Seventeen Science imports now use existing Domain subpaths. Production builds no longer emit the previous Sales-related tracing warning.
- Codecamp, Sales, and Marketing share one cookie reader. Six tests cover the preserved parsing behavior.
- Audit tests generate temporary fixtures and remove them after execution. They preserve the archived evidence and active track registry.

The applications retain different authentication mode rules because those rules express different requirements.
The review found no justified shared domain operation within the selected scope.

## Verification

- Science runtime: 1,595 tests passed; one test skipped.
- Science verification: 138 tests passed across 17 files.
- Auth package: 312 tests passed; nine integration tests skipped.
- Affected authentication routes: 85 tests passed across three applications.
- Domain contract and teacher functions: 40 tests passed.
- Final audit fixture suite: 71 tests passed.
- Affected lint and type checks: 50 Turbo tasks passed.
- Codecamp, Sales, and Marketing builds: 25 Turbo tasks passed.
- Final Science build and verification: 21 Turbo tasks passed.
- Final Science lint: zero errors and 16 existing warnings.

The final verification tests took 44.74 seconds after the compiler completed.
The earlier configuration took 301.12 seconds.
Different cache states prevent a controlled performance comparison.

The temporary PostgreSQL container has been removed.
The graph received incremental updates and remains outside these commits because it contains unrelated changes.

## Global check limitations

The baseline and final source each produce 637 architecture findings and eight parse errors.
Four existing findings moved by one line; no new semantic findings appeared.
The V2 record remains a candidate under the existing V1 default policy.
Its comparison with the frozen V2 baseline still contains 78 additions, one removal, and 48 renames.
The candidate refresh does not approve these differences or change the frozen baselines.
The normal architecture command accepts the refreshed manifest, then fails on 27 pre-existing Games file deletions.
All 27 paths appear in the captured baseline status.
Global Measure validation flags pending markers in eleven unrelated active tracks.
This track passes its scoped marker check and the review truthfulness check.

Detailed execution evidence appears in [verification.md](verification.md).
Independent findings and resolutions appear in [review.md](review.md).

## Commits

- `79865be43`: Narrow Science Domain imports.
- `f59c60b9a`: Share cookie parsing.
- `3a573ec2f`: Reuse verification results.
- `26b16fb59`: Isolate generated audit fixtures.
- `221081178`: Refresh the existing architecture candidate.
