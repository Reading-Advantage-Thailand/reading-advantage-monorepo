# Phase S3 Test Strategy: APK Learning Branch

## Contract under test

Phase S3 owns a provider-neutral, versioned APK learning blueprint in
`@reading-advantage/codecamp-knowledge`. It must reconcile the reviewed graph
with the existing Advantage Play Kit ABI without importing Phaser, React, an
application, or a provider implementation at runtime.

The blueprint contract must encode:

- the eleven reviewed game-development objectives and their existing graph
  prerequisites;
- the runtime cartridge manifest, educational input/result, edition, host, and
  client-only Phaser boundaries;
- worked code-reading/debugging, guided extension, and independent construction
  as distinct practice families;
- per-objective grading, checks, hints, reveal policy, misconceptions, and
  remediation resources;
- explicit curriculum-owner and APK-maintainer review evidence.

## Red tests

1. Reject missing, unknown, duplicate, draft, or retired APK objective IDs.
2. Reject duplicate technology objectives instead of reusing the reviewed graph.
3. Require JavaScript, TypeScript, React, testing, and Git prerequisite ancestry.
4. Reject ABI profiles that omit manifest fields, educational inputs/results,
   host responsibilities, edition selection, or client-only Phaser isolation.
5. Require all three gradual-release stages for every objective, with distinct
   variant IDs/families and different artifact outcomes.
6. Reject absent grading checks, hints, reveal policies, misconceptions, and
   graph-linked remediation resources.
7. Prove that repeated full-game construction is not used as the only evidence
   family and that code reading/debugging remains independently assessable.
8. Pack the blueprint JSON and run its validator/report through the published
   CLI surface.

## Green and verification gates

- `vitest` contract, authored-data, counterexample, boundary, and packed-release
  suites;
- coverage, test-inclusive TypeScript, lint, build, blueprint validation/report,
  graph validation/source verification, and `build-graph update`;
- human correctness audit by curriculum-owner and APK-maintainer roles.

Browser verification is not applicable to S3 because it publishes data,
schemas, reports, and review evidence only. S4 is the first phase that owns a
learner-visible unit and therefore requires live browser acceptance.
