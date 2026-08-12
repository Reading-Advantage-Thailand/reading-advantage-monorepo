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
- [x] Task: Execute the one-shot Red/Green Sales runtime admission defined in
  `test-strategy.md`, extending only `@reading-advantage/mastery-runtime-compat`
  for the admitted Sales release set, descriptor schema, packed-consumer gate,
  and clean-consumer script. The accepted Green commit is
  `324d81a838ccab07907720a7c3f79482dd1205e0` (full SHA), with no engine or
  `sales-knowledge` source changes. Evidence: the authoritative command
  `CI=true /home/daniebo/Desktop/reading-advantage-monorepo/node_modules/.bin/vitest
  run src/__tests__/sales-runtime-admission.red.test.ts --maxWorkers=1` passed
  11/11; `src/__tests__/release-artifact.test.ts` passed 8/8; the focused FIFO
  scheduler test passed 1/1 and its non-vacuous legacy counterexample reached
  `A,B,C,W` with `maxActive=3`, while production token handoff remained FIFO
  `A,B,W,C` with `maxActive=2`; runtime-manifest and Codecamp regressions passed
  20/20; lint, typecheck, build, and `git diff --check` passed. Final source
  hashes are `runtime-manifest.json` b069bdc2d054ae24a7dddb55e25a84557162adf7713e8e569ef33bccc586245a,
  `src/index.ts` 29e85540740da64d459170205849fcf1eb0e66145053d1779fbba1515f55180e,
  `src/release-artifact.ts` 7ead9d382b4211f8822e3615541f515b81b231579d51cf3e82e5c21769deeeab,
  `fixtures/consumer/check-consumer.mjs` bf386bdbd02770fd80413e7a5270031c22b91f771baca6620ca723e7cc2cf805,
  and `src/__tests__/release-artifact.test.ts`
  d2f9a9f288c9d4450cb785e799eee2e2b8450641b0ae9585bc298da633c97c4c. Review
  A ACCEPT and Security Review B ACCEPT both bind the committed Green and these
  final hashes; their receipts are recorded in the commit note.
- [~] Task: Run and record the runtime manifest, consumer, packed-consumer,
  lint, type, build, and immutable-source closeout gates after Task A Green
  acceptance. Local installed ESLint and TypeScript binaries passed for both
  `mastery-runtime-compat` and `sales-knowledge`; runtime-compat passed 4 test
  files / 39 tests and sales-knowledge passed 3 test files / 19 tests; runtime
  build passed; the clean-consumer CLI against
  `fixtures/consumer/sales-advantage.json` returned `compatible: true` with no
  issues; and the phase-base diff guard for the four engine packages plus
  `sales-knowledge` was empty. The repository pnpm shim attempted a registry
  fetch for pnpm (`EAI_AGAIN`), so the equivalent installed local binaries were
  used for evidence. Broad `measure/doctor.sh` and generate/structural gates
  are explicitly deferred to the root shared gate while Finance source is
  active. Task B remains open pending those deferred shared gates and final
  closeout acceptance.

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
