# Implementation plan: Sales Advantage shared Mastery consumer

## Phase 0 — reconcile and admit the consumer

- [x] Task: Reconcile Sales go-live documentation with the current production
  truth, replace obsolete local-rep provisioning acceptance with Accounts SSO,
  and register this successor track without closing the still-open authenticated
  QA gate. Completed in `a4be6a73c`.
- [x] Task: Inspect the runtime compatibility boundary before admission. The
  current release set pins `knowledge-space-synthetic-codecamp-proof-v1.0.0`;
  reusing that graph in a Sales descriptor would be a false cross-course claim.
  The attempted admission was stopped before production/runtime files changed.
- [~] Task: Execute the one-shot Red/Green Sales runtime admission defined in
  `test-strategy.md`. Check in the exact Sales consumer descriptor and the
  failing `sales-runtime-admission.red.test.ts`, then make the focused Green
  gate pass by extending only `@reading-advantage/mastery-runtime-compat`
  (manifest release set, descriptor schema, packed-consumer gate, clean-consumer
  script). Do not change the four shared engine packages or the accepted
  `sales-knowledge` package. Do not reuse the Codecamp graph. The current dirty
  candidate under `packages/mastery-runtime-compat` is unaccepted and must be
  re-derived against this strategy. Red command:
  `pnpm --filter @reading-advantage/mastery-runtime-compat exec vitest run
  src/__tests__/sales-runtime-admission.red.test.ts --maxWorkers=1`. Phase 1
  dependency is satisfied by `86a6503ac`.
- [b] Task: Run the runtime manifest, consumer, packed-consumer, lint, and type
  gates; record independent review evidence. Depends on the Task A Green gate
  being accepted. deferred:task-a-green-acceptance

## Phase 1 — bind the approved course to a knowledge graph

- [x] Task: Define the versioned Sales objective graph, activity variants,
  rubric/evaluation bindings, and immutable release provenance. Depends on the
  existing approved curriculum digest and precedes runtime admission. Accepted
  in `phase1-sales-graph-acceptance-20260811.md`.
- [x] Task: Write Red tests for complete curriculum coverage, stable identities,
  graph/rubric drift, forbidden prose inference, and release-owner approval.
- [x] Task: Implement and verify the deterministic Sales graph and binding
  artifact without rewriting the approved curriculum. Depends on accepted Red
  contracts and independent curriculum review. Accepted in
  `phase1-sales-graph-acceptance-20260811.md`.

## Phase 2 — company tenant mapping and durable projection

- [b] Task: Define and migrate the fail-closed Company Identity organization to
  Mastery tenant mapping after the Phase 0 Sales admission is accepted. Depends
  on the preceding Finance migration landing so migration identifiers remain
  serial and reviewable. deferred:finance-migration
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
