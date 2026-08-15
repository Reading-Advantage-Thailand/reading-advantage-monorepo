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
  final hashes; their receipts are recorded in the commit note. The architecture
  audit recorded zero findings introduced by `324d81a83`.
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
  used for evidence. The combined build-graph refresh succeeded for 71 unique
  TS/TSX paths (canonical sorted path-list hash
  `40df25b062d742ccb715e301b4a2914a079473575e504733de7dae7d70a2fb0d`; Sales
  subset hash `f50b92dafd22f2a842b16abe2cf1f12f4398e8f8dbc7645b3f0405e5bfdebd7f`),
  growing the graph from 527 to 1360 nodes and 682 to 1538 edges. Generated
  facts freshness is independent evidence from commit `390448dd2`, embedding
  sourceRevision `b4b11a3057e3645e6ab29bff304c7a93a00d440b`, architecture hash
  `df81e0948c1f01b59b8be3ee5659075d4cba4de4fefe5f477d2a9b2a695a1555`, and
  routes hash `a380a66544af846ba4057267c8023089b01fc83b7a6c0f97dc2ed69cf98fb1fb`;
  its pre-commit rerun matched staged bytes. `bash measure/doctor.sh` was then
  executed and exited 1 at the marker guard after finding 80 deprecated `[ ]`
  markers across nine unrelated active plans, so its architecture stage did not
  run. The separate direct installed architecture checker also exited 1
  (`files=4247`, `findings=697`, `parseErrors=0`, debt additions 137,
  removals 0, renames 21). A whole-repository build-graph audit attempt emitted
  no output and was terminated after about four minutes with exit 130; it is
  not Green evidence. Phase 0 base remains exactly
  `8adc57cb0af0693c1b3420842b3a504939a36b2e`. Task B remains `[~]` pending
  shared-root red-gate remediation and final closeout acceptance; this does not
  claim Phase 0 closeout, doctor Green, or architecture-audit Green.

  Bounded environment diagnosis (2026-08-14): the five accepted Green source
  hashes were recomputed and match the Green commit note exactly. The five-path
  diff from `324d81a838ccab07907720a7c3f79482dd1205e0` is empty. The earlier
  nested-Node control explains the sandbox empty `stdout` and `stderr`
  observation. Sandbox PID isolation prevents a host-level liveness claim. The
  two outside-sandbox stale-lease runs timed out at 240 seconds before `npm
  pack`. Independent lease review attributes both waits to a recent foreign
  lease: reclaim requires 15 minutes of staleness, while acquisition waits 300
  seconds. These timeout results do not prove a source regression, and this
  note does not claim that every timeout reached `npm pack`. The accepted Green
  remains valid, and no production source changed. Sales-owned closeout
  evidence still includes focused package gates, the consumer CLI,
  immutable-source parity, and the independent receipt. The root-owned doctor
  and architecture gates remain blockers, so this note does not claim Phase 0
  closeout or Phase 2 admission.

  Sales lease Green source receipt (2026-08-14): accepted commit
  `d4ea61c92e554c85b3122b5977c8d5f1c105ca72`; final independent review:
  `ACCEPT`. The focused seam gate passed 17 tests with 8 skipped; installed
  typecheck, lint, and `git diff --check` passed. The accepted three-path
  SHA-256 values are `release-artifact.ts`
  `894bf1c979e1c352158b6db18fc36a8693954af13a631a253b7330834258d8cb`,
  `release-artifact.test.ts`
   `509876483a470a124ce70ff1136ed7647a601598a541c802525aa973d64859a0`, and
  `test-strategy.md`
  `c141bd99f2126937b08d8aebce7cc2b63b8215d5cefcada929ed52ce0f72d4d2`.
  The review ran no packed, install, or canonical-lease gates. Task B remains
   `[~]`; this receipt does not claim Phase 0 closeout, shared-root Green, or
   unblock later work.

   Security remediation receipt (2026-08-15): implementation commit
   `5ac0cbfc9342204a368c51f54a5522f1180ebc28` retains the production lease
   capability and checks process-start identity. It enforces exact Sales imports,
   uses descriptor-driven packed imports, snapshots inputs, and returns audited
   HEAD, source, and archive digests. Focused gates exited zero. Task B remains
   `[~]` because the shared-root doctor and architecture gates remain open.

   Security remediation receipt (2026-08-15): implementation commit
   `5ac0cbfc9342204a368c51f54a5522f1180ebc28` retains the production lease
   capability, enforces exact unique Sales imports, uses descriptor-driven packed
   imports, snapshots inputs, and returns audited HEAD and digest data. Focused
   lease, admission, packed-consumer, Codecamp, type, lint, build, format, clean
   CLI, immutable-diff, and diff checks exited zero. The source digest was
   `590d2d3dd7081f0152563f07b4ae86b4ceca5bdb2dd728b9c64342b2e6c5bf1e`.
   Task B remains `[~]` because shared-root doctor and architecture gates remain
   outside this remediation.

   Green test-correction receipt (2026-08-15): implementation commit
   `b3578c678` replaces a formatting-sensitive source assertion with a live Linux
   lease proof. The proof records a numeric process-start identity, then reclaims
   a stale owner that has the live PID but a mismatched identity. The targeted
   remediation test passed 3/3. Prettier, `git diff --check`, and the immutable
   engine and Sales-knowledge diff guard passed. Earlier focused lease, admission,
   packed-consumer, Codecamp, Sales-knowledge, type, lint, build, and clean CLI
   gates passed. The aggregate runtime-compat test was stopped by the 360-second
   command timeout after its packed suite passed. It is not Green evidence.
   Task B remains `[~]` because shared-root doctor and architecture gates remain
   outside this remediation.

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

- [x] Task: Produce the bounded, docs-only Phase 2 strategy and contract design
  for the fail-closed Company Identity organization-to-Mastery tenant mapping
  and durable projection. The Finance ordering prerequisite is satisfied: the
  accepted additive/journaled `0003_finance_attestation_audit_metadata`
  migration and `meta/0003_snapshot.json` landed in
  `48470311d4f6b06b7e9ebcce7ba1f380444f0a79`. Completed as docs-only strategy
  `test-strategy-phase2.md` in strategy commit
  `457ed7b7d20e1dd110b33ea4f8dd2b8251e5ff0f` with role evidence in
  `orchestration/phase2-strategy-role.log`. The task changed no source, tests,
  or migrations, and it did not capture `phase2_base_sha`; the capture point is
  defined in `test-strategy-phase2.md` section 12. This does not claim Phase 0
  closeout or Phase 2 admission.
- [b] Task: After Phase 0 Task B shared-root closeout and final acceptance,
  migrate the fail-closed Company Identity organization-to-Mastery tenant
  mapping. Migration identifiers must remain serial and reviewable.
  deferred:phase0-task-b-closeout
- [b] Task: Write Red authorization, cross-organization, replay, conflict,
  retry, concurrency, and append-only outbox tests only after Phase 0 Task B
  shared-root closeout and final acceptance. deferred:phase0-task-b-closeout
- [b] Task: Implement the tenant mapping and durable idempotent projection port
  behind existing Mastery/activity adapters only after Phase 0 Task B shared-root
  closeout and final acceptance. Do not reuse Codecamp's fixed namespace.
  deferred:phase0-task-b-closeout

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
