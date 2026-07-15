# Implementation Status — 2026-07-15

## Implemented slice

- PR review now resolves `CODECAMP_PR_REVIEW_MODEL` explicitly, defaulting to
  `~x-ai/grok-latest`, and carries requested/resolved model provenance through
  the internal AI adapter.
- Advisory worker output is persisted as immutable advisory evidence only;
  it cannot approve a PR or mutate mastery.
- Structured review output now requires each graph-bound PR objective exactly
  once and rejects file or line references outside the reviewed diff; objective-level
  evidence is derived inside the database-owning command, persisted as advisory
  data, rendered in the GitHub feedback, and never promotes itself to Mastery.
- Added graph-bound PR attempt and objective-evidence records. The APK unit's
  versioned independent-practice contract is explicitly resolved alongside
  the legacy curriculum binding release.
- Authenticated deterministic APK approval now records an immutable trusted
  attempt before the existing server-owned activity and Mastery projection.
- Added release-policy primitives for fixture scoring, model-drift detection,
  and non-mutating shadow/fallback rollout decisions.
- Calibration fixtures now require a versioned fixture-set identifier, a
  content digest, and explicit label/approval metadata. The implementation
  enforces this governance but does not claim the local test fixtures are a
  production human-labelled dataset.
- Admins can now record a tenant-verified PR-review correction through the
  existing append-only audit log. It carries the original attempt ID,
  corrected disposition, reason, and bounded objective corrections; it never
  edits the model attempt in place or auto-mutates Mastery.
- The intern admin page now exposes only safe attempt provenance, graph-bound
  objective scores, and prior corrections, and lets an admin append a
  disposition/reason correction. It does not expose trusted context, prompts,
  or model reasoning.
- Removed the webhook-local background review path. A post-ACK webhook now
  only enqueues and dispatches the locked durable worker, and the webhooks
  service starts that worker in production. This prevents a second path from
  bypassing advisory-attempt persistence or racing to post duplicate comments.
- Added bounded GitHub Check Runs context for the durable review worker. The
  adapter keeps only allowed names, statuses, conclusions, and GitHub HTTPS
  URLs; missing credentials or check access are explicit unavailable states.
  The domain validates that context before prompt construction and tells the
  model it is factual data, never instructions or permission to invent a run.
- Revision attempts now receive a bounded, immutable summary of earlier
  attempts for the same review and a different head SHA. It contains only
  attempt status/authority and per-objective score, confidence, and evidence
  state; it excludes messages, prompts, trusted context, provider reasoning,
  and raw webhook data.
- Runtime release policy is now enforced by the worker: the default is private
  shadow evaluation; disabled/fallback skip model work; active or deterministic
  canary feedback require an explicit approver. Shadow output remains immutable
  advisory evidence and cannot update learner-visible review status or post a
  GitHub comment.
- Cloud Build now requires migration `0036_codecamp_mastery_evidence` in the
  Drizzle ledger before traffic shifts. The migration-doctor sentinel registry
  covers every journal entry through `0036`.

## Evidence run locally

- Tutor, PR attempt, release-policy, override, and review-contract domain
  suites: 39 passing tests in the latest focused run; domain build passed.
- Codecamp API router suite: 47 passing tests; OpenRouter provenance: 2
  passing tests; Codecamp app type check: passed.
- Durable-worker webhook/adversarial/acceptance suites: 28 passing tests after
  the single-path dispatch change. A transactional local PostgreSQL probe
  applied migration `0036_codecamp_mastery_evidence.sql`, verified all five
  evidence tables, then rolled back without altering the shared database.
- GitHub check adapter, trusted-context domain contract, and durable-worker
  handoff: 40 focused tests passing; webhooks build passed.
- Prior-attempt projection, prompt construction, and durable-worker handoff:
  25 focused domain tests and 7 focused worker tests passing.
- Release-mode policy tests and shadow/disabled/active-worker handoffs: 15
  focused tests passing. Deploy-gate and journal-integrity contracts: 24
  passing tests.
- Full webhooks suite: 211 passing and 3 skipped tests. Its only two failures
  are the unrelated Phase 7 assertions that shared `measure/tech-debt.md` and
  `measure/lessons-learned.md` exceed their 51-line caps (53 and 54 lines).
- Domain and webhooks builds, type checks, and lint pass; lint reports only
  pre-existing package warnings. The standalone DB type check remains blocked
  by an unrelated `rootDir` error from `codecamp-users-seed.ts` importing the
  auth package.
- Migration `0036_codecamp_mastery_evidence` passed the production migration
  doctor before traffic shifted. The implementation shipped in Cloud Run
  revision `codecamp-advantage-00019-682` with 100% traffic and rollout mode
  intentionally set to `shadow`.
- The credentialed production-alias preflight passed on 2026-07-15:
  `~x-ai/grok-latest` resolved to `x-ai/grok-4.5`, returned schema-valid
  structured output, and supplied provider response provenance. Commit
  `37ff6fd3` updated the checked-in preflight to verify this actual alias.
- Authenticated Chrome acceptance verified the admin `PR Evidence & Corrections`
  surface and its explicit advisory/append-only semantics. No immutable attempts
  existed for the inspected learner yet, which is consistent with a new shadow rollout.

## Remaining closure work

- Human-labelled frozen evaluation fixtures and audited human approval of a
  canary/active rollout remain. The runtime controls are implemented and
  intentionally remain in private shadow mode; marketing and product docs must
  not claim PR review currently mutates Mastery.
- Revision/redelivery and end-to-end GitHub/browser acceptance coverage need
  completion before this track can close.
- Credentialed GitHub Checks acceptance remains before the prompt can claim
  production evidence coverage; no raw webhook payload is treated as test
  evidence.
