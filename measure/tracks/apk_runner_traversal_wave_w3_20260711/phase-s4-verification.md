# Phase S4 Verification

## Cutover and deletion

- Package catalog and literal loaders publish the exact nine accepted APK IDs, with the four W3 IDs after W2.
- Product cards route all four W3 IDs through `/[locale]/student/arcade/[cartridgeId]`.
- Generic route tests mount each W3 input mode; unknown IDs still fail closed through `notFound()`.
- Shared completion adapter tests accept all four W3 `gameType` values while continuing to reject client-owned XP, identity, tenant, and permission fields.
- Graph callers and bounded text searches found no production consumer of the retired W3 pages, components, state/config modules, or per-game APIs.
- The exact candidate trees were deleted: 44 files in commit `52426949`, while shared `RankingDialog` remained for Dragon Flight.
- Recursive deletion guards fail if any retired path becomes non-empty again.
- The full app suite exposed one broad legacy test that opened Griffin's deleted API file. It now asserts the strict shared arcade sentence fixture, and the repeated full suite passed.

## Package gates

- Lint: pass.
- Type-check: pass.
- Tests: 24 files, 120 tests, all pass.
- Coverage: 92.91% statements, 84.72% branches, 90.62% functions, 94.74% lines.
- Build: pass, including literal chunks for all four W3 cartridges.
- Graph: incrementally updated for all structural cartridge, catalog, scene, host, and deletion changes.

## Advantage Games gates

- Lint: exit 0 with zero errors. The full app reports 96 existing warnings outside the W3 change; no W3 file reports an error.
- Fresh type-check after clearing stale generated `.next/types`: pass.
- Focused host, QC, route, persistence, catalog, deletion, and data-array tests: pass.
- Full Jest: 182 suites, 1,646 tests, all pass.
- Production Next.js build: pass; 122 static pages generated, the generic arcade route remains dynamic, and the four retired per-game pages/APIs are absent from the route manifest.
- Post-build type-check against the regenerated Next types: pass.

## Browser and database gates

- Kimi real-browser authenticated route/accessibility checks: pass.
- Sixteen edition/viewport mount states: pass.
- Four Primary desktop keyboard completions: pass, shared persistence HTTP 200.
- Four Secondary mobile touch completions: pass, shared persistence HTTP 200.
- One-canvas lifecycle, readable controls, active edition, and no-overflow assertions: pass.
- Temporary student/school acceptance rows: removed; zero rows remain.

## Mandatory review

Initial review found one Medium hidden-surface simulation race and zero Critical/High findings. Commit `9c56ce15` moved the surface guard before simulation advancement and added all-four-cartridge zero-sized-frame coverage. Re-review passed with zero Critical, High, or Medium findings.
