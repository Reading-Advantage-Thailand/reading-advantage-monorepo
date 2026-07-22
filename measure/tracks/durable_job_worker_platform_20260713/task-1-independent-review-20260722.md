# Review Report: Durable Job Worker Platform Task 1

## Decision

**FAIL.** The package, health process, tests, type checks, and runtime image are
otherwise healthy, but the worker-specific Docker ignore rules send ignored
package artifacts—and would send any package-local environment files—to the
container builder. This is a High-severity build-context and secret-boundary
failure. Task 1 must remain in progress until the context is fail-closed.

## Scope

- Reviewed only Task 1 changes in `services/worker`, `pnpm-workspace.yaml`, and
  the `services/worker` lockfile importer.
- No Task 2+ implementation was accepted or reviewed as complete.
- Browser checks were skipped because this change contains no frontend files.
- Graph Caller Check was skipped because `graph.db` was last updated on
  2026-07-15 and is stale by the Measure review protocol.

## Verification Checks

- [x] **Plan Compliance**: Partial — the package/health/OCI scaffold exists,
  but the build-context contract is not safely bounded.
- [x] **Style Compliance**: Pass — package lint passes and exported worker APIs
  carry JSDoc.
- [x] **New Tests**: Yes — 18 focused tests across startup config, health, and
  OCI contracts.
- [x] **Test Coverage**: Partial evidence — the default combined report lists
  only `health.ts`; isolated runs prove `startup-config.ts` and
  `oci-contract.ts` each at 100% statements, branches, functions, and lines.
- [x] **Test Results**: Passed — 18/18.
- [x] **Browser Console Errors**: Skipped — no frontend changes.
- [x] **Network Errors**: None — disposable container returned HTTP 200 from
  `/livez` and `/readyz`.
- [x] **Visual Check**: Skipped — no frontend changes.
- [x] **Graph Caller Check**: Skipped — stale `graph.db`; all touched exports
  are additive.
- [ ] **Architecture Aggregate**: The repository-wide check exits 1 on 67
  unrelated company-identity/database findings and reports zero
  `services/worker` findings. The scoped worker boundary scan found no DB,
  queue, polling, lease, or handler imports.

## Findings

### High: Worker build context re-includes ignored artifacts and potential secrets

- **Files**: `services/worker/Dockerfile.dockerignore` (lines 1–13),
  `services/worker/src/oci-contract.ts` (lines 97–124)
- **Context**: The ignore file excludes the repository and then re-includes all
  of `packages/config/**` and `services/worker/**`. Docker and Podman do not
  apply `.gitignore` after these rules. Consequently package-local
  `node_modules`, `dist`, `.turbo`, `coverage`, and `.env*` paths enter the
  build context. A scratch proof using the checked-in ignore file successfully
  copied the ignored file
  `services/worker/.turbo/turbo-lint.log` into an image. The current validator
  makes this worse by rejecting every rule outside its exact allowlist, so
  safe nested exclusions cannot be added without changing production code and
  tests. This makes remote-builder context non-minimal and can disclose a
  future package-local environment file to the builder.
- **Required correction**: Add explicit nested exclusions after the package
  allowlist for at least `node_modules`, `dist`, `.turbo`, `coverage`, `.env`,
  and `.env.*` in both admitted trees. Make those exclusions mandatory in
  `validateWorkerBuildContextDefinition`; add counterexample tests proving
  ignored artifacts and an environment-file sentinel cannot be copied with the
  checked-in ignore file. Rebuild the exact image and repeat runtime probes.

### Low: Combined coverage evidence does not enumerate all claimed modules

- **Files**: `services/worker/package.json` (line 41),
  `measure/tracks/durable_job_worker_platform_20260713/plan.md`
- **Context**: `test:coverage` and the plan's expanded include command report
  the 98.82/89.79/100/100 totals for `health.ts` only. Isolated coverage runs
  prove the other two modules are fully covered, so this is evidence/config
  accuracy rather than an untested implementation.
- **Required correction**: Configure the package coverage include/exclude rules
  so one canonical command enumerates every Task 1 production module, then
  record that output rather than presenting the health-only totals as a
  combined result.

## Independent Command Evidence

- `CI=true pnpm --dir services/worker run test:coverage` — 3 files and 18 tests
  passed; default report listed only `health.ts` at 98.82% statements, 89.79%
  branches, 100% functions, and 100% lines.
- Isolated startup coverage — 9/9 tests; 100% statements, branches, functions,
  and lines.
- Isolated OCI coverage — 5/5 tests; 100% statements, branches, functions, and
  lines.
- Direct uncached ESLint, TypeScript no-emit, and TypeScript build — exit 0.
- Direct Turbo `lint test check-types build` — 4/4 successful; cached log replay
  was not used as the sole independent evidence.
- Dual-target OCI validation for `cloud-run` and `ecs-fargate` — exit 0.
- `pnpm install --offline --frozen-lockfile --lockfile-only` — all 40 workspace
  projects already up to date; exit 0.
- Exact producer image inspection — non-root `node`, Linux/amd64, port 8080,
  command `node dist/main.js`, 169,372,264 bytes.
- Disposable image runtime — `/livez` 200, `/readyz` 200, structured ready log;
  SIGTERM emitted draining/stopped logs and exited 0; invalid `PORT=0` failed
  closed with exit 1 and a safe structured error.
- Scoped leakage scan — no worker DB, PostgreSQL, queue, polling, claim, lease,
  heartbeat, dead-letter, or handler implementation; the sole match is the OCI
  validator's forbidden-token check.
- Scratch build-context proof — `COPY services/worker/.turbo/turbo-lint.log`
  succeeded under the checked-in `Dockerfile.dockerignore`; the disposable
  proof Dockerfile and image were removed afterward.
- `git diff --check` — exit 0.

## Re-review Gate

Do not restore Task 1 to `[x]` or unlock acceptance based on this review until
the High finding is fixed, the canonical combined coverage evidence is
truthful, the exact image is rebuilt, and a fresh independent review passes.
