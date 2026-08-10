# Implementation plan: Sales Advantage shared Mastery consumer

## Phase 0 — reconcile and admit the consumer

- [~] Task: Reconcile Sales go-live documentation with the current production
  truth, replace obsolete local-rep provisioning acceptance with Accounts SSO,
  and register this successor track without closing the still-open authenticated
  QA gate.
- [ ] Task: Write Red runtime-compat tests and add the exact Sales consumer
  descriptor/package admission without changing the shared engine.
- [ ] Task: Run the runtime manifest, consumer, packed-consumer, lint, and type
  gates; record independent review evidence.

## Phase 1 — bind the approved course to a knowledge graph

- [b] Task: Define the versioned Sales objective graph, activity variants,
  rubric/evaluation bindings, and immutable release provenance. Depends on
  Phase 0 runtime admission and the existing approved curriculum digest.
- [b] Task: Write Red tests for complete curriculum coverage, stable identities,
  graph/rubric drift, forbidden prose inference, and release-owner approval.
- [b] Task: Implement and verify the deterministic Sales graph and binding
  artifact without rewriting the approved curriculum. Depends on accepted Red
  contracts and independent curriculum review.

## Phase 2 — company tenant mapping and durable projection

- [b] Task: Define and migrate the fail-closed Company Identity organization to
  Mastery tenant mapping. Depends on Phase 1 and the preceding Finance migration
  landing so migration identifiers remain serial and reviewable.
- [b] Task: Write Red authorization, cross-organization, replay, conflict,
  retry, concurrency, and append-only outbox tests.
- [b] Task: Implement the tenant mapping and durable idempotent projection port
  behind existing Mastery/activity adapters. Do not reuse Codecamp's fixed
  namespace.

## Phase 3 — project Sales evidence into KST/SRS

- [b] Task: Project validated quiz attempts and eligible immutable roleplay
  evaluations into graph-linked `practice.v1` evidence. Theory completion and
  chat must remain unable to mutate mastery.
- [b] Task: Add durable AI/mutation rate limiting, release-owner curriculum
  approval audit, and versioned evaluator/rubric provenance.
- [b] Task: Expose organization-scoped due review, recommended practice, and
  mastery evidence through Sales domain/API boundaries and learner/admin UI.

## Phase 4 — verification and release

- [b] Task: Run focused shared-runtime, domain, API, DB, and Sales build/test/
  type/lint gates from a clean dependency build.
- [b] Task: Deploy through the existing Sales release path and complete
  authenticated browser QA for Accounts provisioning/SSO, the course loop,
  KST/SRS changes, i18n, audio privacy/orphan cleanup, and durable rate limits.
- [b] Task: Reconcile `sales_advantage_golive_20260701`, deployment status,
  technical debt, and lessons learned; archive only after independent and owner
  acceptance.
