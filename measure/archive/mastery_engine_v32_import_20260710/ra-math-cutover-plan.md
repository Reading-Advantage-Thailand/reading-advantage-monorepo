# ra-math-advantage canonical mastery runtime cutover

Inventory source: read-only checkout `/home/daniel-bo/Desktop/ra-math-advantage`  
Pinned commit: `3e0b3517c42cfe0b603295a1ec48548505617169`  
Inventory date: 2026-07-10

The checkout was already dirty, so this track does not edit or stage anything
there. Create a dedicated Measure track in that repository before execution.

## Duplicate packages and consumers

The four duplicate sources are:

- `packages/knowledge-space-core`
- `packages/knowledge-space-practice`
- `packages/practice-core`
- `packages/srs-engine`

Read-only `rg -l` found references in 66, 84, 159, and 87 files respectively
(including historical Measure documents). Live manifest dependencies use the
`@math-platform/*` names in Bus Math v2, Integrated Math 1–3, Pre-Calculus,
activity-components, efficacy-core, math-content, and the duplicate packages.
Every discovered live range is `*`; these must become exact compatible
`@reading-advantage/*` versions from `runtime-manifest.json`.

## Ordered cutover

1. Start a ra-math Measure track at the pinned or refreshed commit and preserve
   its dirty-worktree owners.
2. Produce the four canonical tarballs locally (or publish the exact manifest
   versions to the approved registry). Save hashes and the source commit.
3. Add the compatibility descriptor and run
   `runConsumerCompatibilityGate()` before changing imports.
4. Replace manifest names and subpath imports one package at a time:
   practice-core, srs-engine, knowledge-space-core, then
   knowledge-space-practice. Never use `*`, `latest`, or unresolved workspace
   aliases in the packed consumer.
5. After each package, run its package suite and affected app suites. At minimum:
   IM1–IM3, Bus Math v2, Pre-Calculus, math-content, activity-components, and
   efficacy-core type checks/tests.
6. Run ra-math `measure/doctor.sh`, the reusable compatibility gate, public
   export probes, graph validation, and its complete affected Turbo/npm gates.
7. Only after all consumers are green, delete the four duplicate source
   directories and remove `@math-platform/*` lockfile/workspace entries.

## Rollback and deletion criteria

Commit the pre-cutover lockfile and manifest as the rollback point. A rollback
restores that commit and the four duplicate directories; it does not rewrite a
published canonical version. Deletion is permitted only when no live source or
manifest imports `@math-platform/{knowledge-space-core,knowledge-space-practice,practice-core,srs-engine}`,
all canonical package versions match the compatibility manifest, packed export
probes pass, and every affected suite is green.

The external cutover is intentionally not performed by Phase S4. This plan is
reproducible evidence for its owning repository and avoids mutating a dirty
checkout from a different project.
