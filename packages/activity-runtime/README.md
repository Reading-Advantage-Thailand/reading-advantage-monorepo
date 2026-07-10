# `@reading-advantage/activity-runtime`

Framework-neutral contracts for Advantage I Do and We Do activities. The package
owns authored media resources, trusted timestamp segments, checkpoints, tutorial
steps, normalized activity events, server verification, and direct `practice.v1`
evidence mapping.

## Boundaries

- `@reading-advantage/activity-runtime/core` — Zod contracts, migration, state
  projection, trusted resolution, and evidence mapping.
- `@reading-advantage/activity-runtime/authoring` — referential and provider-policy
  validation for curriculum authors.
- `@reading-advantage/activity-runtime/server` — transport-independent repository,
  session, evidence, and correctness-verification ports.
- `@reading-advantage/activity-runtime/testing` — a minimal valid fixture builder.
- The root export combines core, authoring, and server APIs.

React, Next, Vinext, databases, authentication providers, and media-provider SDKs
are intentionally absent. `@reading-advantage/activity-react` will consume this
package without changing its public contracts.

## Trusted remediation

Models and application clients select stable resource identifiers. They do not
supply authoritative timestamps, URLs, or repository paths. A video remediation
uses `{ kind: "video_segment", resourceId, segmentId }`; `resolveVideoSegment()`
then obtains the trusted time range from validated activity content.

## Correctness and evidence

Client activity events cannot submit correctness, verification results, or tutorial
check outcomes. Server adapters call `assessCheckpointAttempt()` or
`assessTutorialStep()`. Each operation verifies or executes the authored criteria and
maps the result to `practice.v1` atomically. Raw verification constructors and mapping
helpers live behind non-exported package paths. Watch ranges and opened resources remain
`activity_engagement.v1` context and never fabricate mastery.

Atomic assessment also returns a server-generated event that survives JSON
serialization and deterministic replay through `reduceAssessedActivityEvent()`. The S3
persistence phase owns durable signatures, tenant storage, and idempotency; S1 does not
pretend an in-memory capability is durable authentication.

Evidence metadata always carries activity, graph, objective, variant, step,
submission, attempt, timing, scaffold, intervention, and confidence fields.

## Migration

`loadActivity()` accepts `activity.v1` and the explicitly bounded `activity.v0`
shape. Other versions fail with `ActivityContractError.code ===
"UNSUPPORTED_VERSION"`; malformed v0 content fails with
`"INVALID_LEGACY_ACTIVITY"`.

## Verification

```bash
pnpm --filter @reading-advantage/activity-runtime test
pnpm --filter @reading-advantage/activity-runtime test:coverage
pnpm --filter @reading-advantage/activity-runtime check-types
pnpm --filter @reading-advantage/activity-runtime lint
pnpm --filter @reading-advantage/activity-runtime build
```
