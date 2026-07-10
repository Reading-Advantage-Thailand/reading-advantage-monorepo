# Phase S4 Test Strategy: Runtime Governance

Baseline: `52088fbe`  
Story: S4, shared-runtime ownership and compatibility  
Rule: land the manifest and Red compatibility tests before changing package versions, release metadata, or consumer documentation.

## 1. Bounded deliverables

Phase S4 adds only three governance deliverables:

1. An authoritative, machine-readable ownership and compatibility manifest for
   the four engine packages, the mastery persistence API, normative spec,
   schemas, graph releases, fixtures, and migrations.
2. A reusable consumer/release gate, including one synthetic Codecamp flow that
   uses public package imports and in-memory persistence to prove readiness ->
   validated evidence -> SRS update -> next projection.
3. A reproducible, documented `ra-math-advantage` cutover plan. This phase does
   not edit that repository, migrate real applications, publish to a registry,
   author a Codecamp graph, or add UI.

## 2. Exact owner files

| Concern | Owner file |
|---|---|
| Machine-readable versions, ownership, compatibility, and release set | `packages/mastery-runtime-compat/runtime-manifest.json` |
| Manifest Zod contract and compatibility evaluator | `packages/mastery-runtime-compat/src/index.ts` |
| Reusable consumer gate CLI | `packages/mastery-runtime-compat/src/check-consumer.ts` |
| Tooling-package exports/scripts/dependencies | `packages/mastery-runtime-compat/package.json` |
| Manifest and semver Red/Green tests | `packages/mastery-runtime-compat/src/__tests__/runtime-manifest.test.ts` |
| Synthetic Codecamp public-consumer flow | `packages/mastery-runtime-compat/src/__tests__/codecamp-proof.test.ts` |
| Pack contents and clean-install consumer fixture | `packages/mastery-runtime-compat/src/__tests__/release-artifact.test.ts` and `packages/mastery-runtime-compat/fixtures/consumer/package.json` |
| Consumer upgrade and rollback procedure | `packages/mastery-runtime-compat/README.md` |
| Read-only inventory and reproducible ra-math cutover plan | `measure/tracks/mastery_engine_v32_import_20260710/ra-math-cutover-plan.md` |
| Existing package consumer guidance | `packages/domain/src/mastery/README.md` and the four engine-package READMEs |

`@reading-advantage/mastery-runtime-compat` is private CI/tooling. It must not
become an engine facade or contain algorithms, app logic, database adapters, or
domain curriculum. Production behavior remains owned by the existing four
engine packages and `@reading-advantage/domain/mastery/*`.

## 3. Ownership and version policy

The manifest names one authority for each independent version axis:

| Axis | Authority | Compatibility rule |
|---|---|---|
| Normative behavior | `/home/daniel-bo/Desktop/mastery-advantage/SPECIFICATION.md` | `kst-srs.vMAJOR.MINOR`; major is breaking, minor is additive/corrective and requires acceptance fixtures before implementation |
| Engine packages | this monorepo's four package manifests and lockfile | normal package semver; breaking public contracts require a major, additive exports a minor, compatible fixes a patch |
| Persistence contract/schema | `@reading-advantage/domain/mastery/contracts` plus Drizzle migration ledger | contract major changes require an engine compatibility entry; migrations are append-only and deploy-before-code |
| Knowledge graph | the reviewed domain graph release in `mastery-advantage` | immutable release ID plus `knowledge-space.vMAJOR`; unknown majors fail closed, content-only releases may advance independently |
| Practice/SRS schemas | exported version constants and Zod schemas | unknown majors fail closed; readers may accept explicitly listed earlier versions only |
| Fixtures | versioned public synthetic fixtures in engine packages | immutable after release; normative changes add fixtures rather than rewrite historical expectations |

Every release-set entry records exact package versions, spec version, graph
schema, SRS/practice contract versions, persistence schema/migration head,
fixture version, source commit, and supported consumer range. Compatibility is
allow-listed: missing fields, wildcard versions, an unknown future major, a
package outside the declared range, or a migration head older than required is
a hard failure. Package versions need not numerically equal `kst-srs.v3.2`, but
the manifest must map the exact package set to that normative version.

## 4. Red contracts

Red lands these tests before implementation:

1. `runtime-manifest.test.ts` fails because no validated manifest/evaluator
   exists. It asserts unique authorities, exact package names/versions, semver
   ranges without `*`/`latest`, current `kst-srs.v3.2`, graph/schema/contract
   versions, migration head, fixture release, source commit, and ownership.
2. The same suite rejects mismatched engine majors, unknown spec/graph/schema
   majors, stale migration heads, missing provenance, undeclared exports, and a
   consumer that imports a package not in its release set.
3. `codecamp-proof.test.ts` initially fails at the compatibility gate. Its
   fixed two-skill coding fixture imports only public subpaths from
   `knowledge-space-core`, `practice-core`, `srs-engine`,
   `knowledge-space-practice`, and the DB-free mastery contracts/service/memory
   adapter. It uses fixed IDs, clock, graph release, parameter version, and
   idempotency key.
4. `release-artifact.test.ts` initially fails until all four engine packages
   produce deterministic pack manifests containing only declared `files` and
   valid export targets, and a temporary clean consumer can install the packed
   artifacts and run the reusable compatibility gate without workspace links.
5. A repository test fails until `ra-math-cutover-plan.md` inventories the four
   duplicate package directories, all `@math-platform/*` imports and manifest
   dependencies, the compatibility-gate command, tarball/registry options,
   ordered replacement, rollback, and deletion criteria.

Red failures must identify the absent or incompatible governance contract, not
fail from a missing build artifact, network call, wall clock, or external repo
mutation.

## 5. Green acceptance

Green is the minimum implementation that makes those contracts pass:

- Parse the manifest with strict Zod schemas and emit stable, actionable
  compatibility errors. The CLI accepts a consumer descriptor path and never
  reaches a registry or provider.
- The synthetic Codecamp proof validates its tiny graph, computes initial
  readiness, maps a fixed independent-practice submission to an SRS rating,
  processes the review, atomically commits evidence/card/state through
  `createInMemoryMasteryPersistence`, replays the same idempotency key without
  duplicate mutation, and uses the updated state to produce the deterministic
  next recommendation/projection. It does not import Codecamp app code or
  author the real Codecamp graph.
- Build the four packages, run `npm pack --dry-run --json` in each, then create
  real tarballs in a temporary ignored directory for the clean-install fixture.
  The gate verifies export targets, package metadata, exact release-set
  compatibility, and absence of workspace-only/runtime-forbidden dependencies.
  No registry publication or credentials are used.
- The ra-math plan is generated from read-only `rg`/manifest evidence and pins
  the source commit inspected. Its executable sequence is: create an external
  Measure track; install the canonical tarball or registry versions; replace
  package names/imports; run the reusable gate plus ra-math affected suites;
  remove duplicate sources only after all consumers are green; retain a lockfile
  rollback commit. S4 records the plan only.
- Update package/domain READMEs with the manifest location, upgrade command,
  compatibility failure behavior, release checklist, and normative ownership.

## 6. Parallel slices and handoffs

- **Slice A — manifest/semver:** owns `runtime-manifest.json`, `src/index.ts`,
  and `runtime-manifest.test.ts`.
- **Slice B — consumer proof/release gate:** begins after A's Red contract is
  fixed; owns `check-consumer.ts`, Codecamp proof, pack test, and consumer
  fixture. It may run the synthetic proof and pack verification in parallel.
- **Slice C — docs/cutover:** runs in parallel with B after the manifest shape is
  frozen; owns only READMEs and `ra-math-cutover-plan.md`, using the parent repos
  read-only.

Slices may not share writable files. Final integration reruns all three suites
against packed artifacts and the committed manifest.

## 7. Commands

```bash
# Red/Green governance and synthetic consumer contracts
TZ=UTC pnpm exec vitest run \
  packages/mastery-runtime-compat/src/__tests__/runtime-manifest.test.ts \
  packages/mastery-runtime-compat/src/__tests__/codecamp-proof.test.ts \
  packages/mastery-runtime-compat/src/__tests__/release-artifact.test.ts \
  --maxWorkers=1 --reporter=verbose

# Engine/public-persistence gates
pnpm turbo run check-types lint test build \
  --filter=@reading-advantage/mastery-runtime-compat \
  --filter=@reading-advantage/knowledge-space-core \
  --filter=@reading-advantage/knowledge-space-practice \
  --filter=@reading-advantage/practice-core \
  --filter=@reading-advantage/srs-engine \
  --filter=@reading-advantage/domain

# Publication dry-run and clean local artifact verification (no registry)
for package in knowledge-space-core knowledge-space-practice practice-core srs-engine; do
  (cd "packages/$package" && npm pack --dry-run --json)
done
pnpm --filter @reading-advantage/mastery-runtime-compat test:packed-consumer

# Read-only ra-math inventory used by the cutover document
git -C /home/daniel-bo/Desktop/ra-math-advantage rev-parse HEAD
rg -n '@math-platform/(knowledge-space-core|knowledge-space-practice|practice-core|srs-engine)' \
  /home/daniel-bo/Desktop/ra-math-advantage --glob '!**/node_modules/**' --glob '!**/dist/**'

# Repository architecture/discoverability gates
build-graph scan . ./graph.db
build-graph search ./graph.db mastery-runtime-compat
bash measure/doctor.sh
```

If a generated-architecture command is added or identified by the implementation
role, run it before `measure/doctor.sh` and require a clean generated-doc diff.
Do not invent a generator command when the repository exposes none.

## 8. Browser applicability

Browser verification is **not applicable** to Phase S4: every owned path is a
package, test fixture, CLI, manifest, or Markdown document, and the phase adds no
route, page, component, style, or user interaction. The synthetic Codecamp flow
is a package-level proof only. Browser acceptance remains mandatory in the
downstream user-facing Codecamp tracks.

Phase S4 is complete only when the manifest is authoritative and strict, the
same reusable gate passes from source and packed artifacts, the synthetic
Codecamp proof traverses the complete public flow deterministically, package
dry-runs are auditable, graph/docs discover the runtime, and the ra-math cutover
is reproducible without modifying the external repository.
