# Phase S1 Test Strategy: Activity Contracts

## Boundary decision

`@reading-advantage/activity-runtime` is the framework-neutral owner of activity
schemas, validation, migration, state transitions, practice-envelope mapping,
authoring helpers, server ports, and test fixtures. It exposes `./core`,
`./authoring`, `./server`, and `./testing` subpaths. Phase S2 adds a separate
`@reading-advantage/activity-react` package so core consumers never acquire a
React, Next, Vinext, browser, database, authentication, or media-provider
dependency accidentally.

## Red contract matrix

1. Parse a bilingual-aware activity containing YouTube media, trusted segments,
   a diagram, an assessed checkpoint, remediation references, and fading
   tutorial steps.
2. Reject unknown schema versions with an actionable version error.
3. Migrate the intentionally bounded `activity.v0` shape to `activity.v1` and
   reject all other legacy versions deterministically.
4. Reject duplicate activity-local identifiers, dangling resources or segments,
   non-increasing segment ranges, and hard-gated YouTube checkpoints.
5. Prove remediation and checkpoint triggers select stable resource/segment IDs;
   raw model timestamps, URLs, and file paths are not accepted intervention
   references.
6. Reduce playback, checkpoint, tutorial, hint, reveal, and completion events
   into a deterministic framework-neutral state.
7. Map an assessed checkpoint into a validated `practice.v1` envelope containing
   objective, variant, scaffold usage, timing, and confidence metadata. Map
   engagement-only activity to context without fabricating correctness.
8. Import every declared package subpath and statically reject forbidden layer
   dependencies.

## Gates

- Red tests must fail because public runtime modules do not exist.
- Green: package test, coverage above 80%, type-check, lint, and build.
- Architecture: source-level forbidden-import audit plus `build-graph update` and
  inspection of new exports.
- UX: not applicable in S1 because no UI or browser surface is introduced;
  browser acceptance begins with S2.
