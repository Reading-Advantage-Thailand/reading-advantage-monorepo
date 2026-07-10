# Mastery runtime compatibility gate

`@reading-advantage/mastery-runtime-compat` is private release tooling for the
shared KST, practice, SRS, and persistence runtime. It does not contain learning
algorithms or application code.

The committed `runtime-manifest.json` is the allow-list connecting exact engine
package versions to the normative `kst-srs.v3.2` behavior, graph and contract
majors, persistence contract, migration head, fixtures, provenance, and
supported consumers. Unknown majors, wildcard versions, undeclared imports,
missing provenance, and stale migrations fail closed.

## Consumer and release commands

```bash
pnpm --filter @reading-advantage/mastery-runtime-compat check-types
pnpm --filter @reading-advantage/mastery-runtime-compat test
pnpm --filter @reading-advantage/mastery-runtime-compat check:consumer -- descriptor.json
pnpm --filter @reading-advantage/mastery-runtime-compat test:packed-consumer
```

Before upgrading an Advantage app, update its descriptor to the proposed exact
package set and run the gate. A failure is actionable compatibility evidence;
do not bypass it with `*`, `latest`, or a workspace-only dependency.

## Release checklist

1. Land normative acceptance fixtures before behavioral code.
2. Update the manifest and compatibility tests in the same change.
3. Build and test all four engine packages plus the domain persistence surface.
4. Dry-run/pack locally and verify every declared export from the artifact.
5. Run the synthetic Codecamp proof and a clean non-workspace consumer gate.
6. Deploy append-only migrations before dependent application code.
7. Retain the previous lockfile and manifest as the rollback point.

No browser verification applies to this tooling package. Browser acceptance is
required in each downstream app that presents the runtime to a learner.
