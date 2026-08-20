# Implementation Plan: Codecamp PR Review Recovery

> **Browser acceptance:** Submit a real pull request from an intern account and
> watch the lesson page move through `processing` to `reviewed`. Then submit a
> pull request containing only generated files and confirm the `skipped` state
> and its reason. Unit and worker tests alone do not close a phase.

> **Production probe first.** Before Phase 1, run the confirmation query in
> `spec.md#reproduction` against production and paste the result into this plan
> under "Production baseline". The failure mix decides the order of FR-2 and
> FR-5 inside Phase 3.

## Production baseline

- [ ] Task: Record the `review_jobs` status and error mix from production
    - [ ] Run `SELECT status, left(last_error, 80) AS err, count(*) FROM review_jobs GROUP BY 1, 2 ORDER BY 3 DESC`
    - [ ] Paste the result here with the date and the operator name
    - [ ] Record how many `dead` rows have a learner review still at `pending`

## Phase 1: Contract & Schema Definition
_Blast radius: `settleJob` and `processJob` are reached through the dependency-injection seams in `runWorkerTick`, so `build-graph callers` resolves no static edges. Grep confirms the call sites are `packages/webhooks/src/review-worker.ts` and its test suite only._

- [ ] Task: Define the terminal outcome contract
    - [ ] Add `ReviewJobTerminalOutcome` to `packages/webhooks/src/review-worker.ts`: `succeeded | skipped_generated | failed_permanent | failed_exhausted`
    - [ ] Extend `SettleJobPayload` with `outcome` and `failureReason` (max 240 characters)
    - [ ] Keep the existing `status` column values unchanged; `outcome` is derived, not a new database enum
- [ ] Task: Define the learner-visible review contract
    - [ ] Extend `prReviewSchema` consumers to use `prReviewReportSchema` on the learner path in `packages/types/src/codecamp.ts`
    - [ ] Add `failureReason: z.string().nullable()` to `prReviewReportSchema`
    - [ ] Add the `skipped` member to `prReviewOperationalStatusSchema`
    - [ ] Confirm no database migration is required, and record the `ALTER TYPE` rationale in the task note
- [ ] Task: Define the diff preparation contract
    - [ ] Add `prepareReviewDiff(prDiff: string): { diff: string; removedPaths: string[]; empty: boolean }` to `packages/domain/src/codecamp/review-exercise.ts`
    - [ ] Keep `assertSafeReviewDiff` for the permanent checks: secret, binary, oversize measured after stripping
    - [ ] Export both from `packages/domain/src/codecamp/index.ts`
- [ ] Task: Define the model repair contract
    - [ ] Add `ReviewContractFailureKind = "model_shape" | "input_safety"` and stamp every `CodecampPrReviewContractError` with it
    - [ ] Set `retryable` from the kind rather than the constant `false`
    - [ ] Add `buildReviewRepairPrompt(violation: string, authorizedObjectiveIds: string[], changedPaths: string[]): string`
- [ ] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' (Protocol in workflow.md)

## Phase 2: Test

Red-phase commits contain ONLY the new test files and Measure document edits.
Check `git status --short` before staging; the tree carries unrelated
modifications (lessons-learned 2026-06-07).

- [ ] Task: Write diff preparation Red tests
    - [ ] `packages/domain/src/__tests__/review-diff-preparation.test.ts`
    - [ ] Strips a whole `diff --git` section for `dist/`, `build/`, `.next/`, `coverage/`, `node_modules/`
    - [ ] Strips `.map`, `.min.js`, `.min.css` by suffix
    - [ ] Keeps a source file named `builder.ts` and a directory named `rebuild` — segment match, not substring match
    - [ ] Reports every removed path exactly once, in diff order
    - [ ] Returns `empty: true` when nothing remains
    - [ ] Measures the 200,000 character limit after stripping, not before
    - [ ] Still throws on a secret pattern and on binary content
- [ ] Task: Write contract failure classification Red tests
    - [ ] `packages/domain/src/__tests__/review-contract-failure-kind.test.ts`
    - [ ] Each of the five model-shape messages carries `kind = "model_shape"` and `retryable = true`
    - [ ] Each of the five input-safety messages carries `kind = "input_safety"` and `retryable = false`
    - [ ] `isCodecampPrReviewContractError` keeps its existing structural shape for the worker
- [ ] Task: Write repair-loop Red tests
    - [ ] `packages/domain/src/__tests__/review-repair-loop.test.ts`
    - [ ] A generator that omits one bound objective on call 1 and is correct on call 2 produces a review
    - [ ] A generator that is wrong three times throws, and the thrown error is `model_shape`
    - [ ] The repair prompt names the violated rule and every authorized objective identifier
    - [ ] The loop makes at most three generator calls in total
- [ ] Task: Write settle and outcome Red tests
    - [ ] `packages/webhooks/src/__tests__/review-worker-outcomes.test.ts`
    - [ ] `input_safety` failure settles `dead` with `outcome = "failed_permanent"` and a reason
    - [ ] `model_shape` failure settles `pending` with backoff while attempts remain
    - [ ] Exhaustion settles `dead` with `outcome = "failed_exhausted"`
    - [ ] An empty stripped diff settles `succeeded` with `outcome = "skipped_generated"`
    - [ ] Every terminal settle writes exactly one structured log line
- [ ] Task: Write tick deadline Red tests
    - [ ] `packages/webhooks/src/__tests__/review-worker-deadline.test.ts`
    - [ ] `runWorkerTick` stops claiming after the deadline passes and returns cleanly
    - [ ] A job already claimed before the deadline still settles
    - [ ] The default deadline is 120,000 milliseconds
- [ ] Task: Write learner-visible status Red tests
    - [ ] `apps/codecamp-advantage/components/__tests__/review-history.test.tsx`
    - [ ] Renders `failed` with a reason and a retry action when the job is dead
    - [ ] Renders `skipped` with the removed paths when the outcome is `skipped_generated`
    - [ ] Renders `processing` and `retrying` from the job state
    - [ ] Never renders `pending` for a dead job
    - [ ] Both locale files carry every new key (`i18n-key-parity.test.ts` must stay green)
- [ ] Task: Write deployment contract Red tests
    - [ ] Extend `apps/codecamp-advantage/lib/__tests__/review-worker-deployment-contract.test.ts`
    - [ ] `cloudbuild.yaml` sets `REVIEW_WORKER_BACKOFF_BASE_MS=30000`
    - [ ] `cloudbuild.yaml` sets `CODECAMP_PR_REVIEW_MODEL` to a pinned version, and the value contains no `~` alias prefix
    - [ ] `configure-review-worker-scheduler.sh` passes `--attempt-deadline=180s`
- [ ] Task: Confirm the Red phase
    - [ ] Run each new suite and record the failing assertion counts in this plan
    - [ ] Commit the test files and this plan only
- [ ] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md)

## Phase 3: Implement

- [ ] Task: Implement diff preparation
    - [ ] Add `prepareReviewDiff` and split the generated-path check out of `assertSafeReviewDiff`
    - [ ] Call it at the top of `reviewExercise`, before the module resolution query
    - [ ] Thread `removedPaths` through the `ReviewResult` return so the worker can render it
    - [ ] Match path segments exactly; never match a substring
- [ ] Task: Implement contract failure classification
    - [ ] Add `kind` to `CodecampPrReviewContractError` and set `retryable` from it
    - [ ] Update the five model-shape throw sites in `validateReviewObjectiveEvidence`
    - [ ] Leave `isPermanentReviewContractFailure` in the worker reading `retryable`, so the worker needs no new import
- [ ] Task: Implement the repair loop
    - [ ] Wrap the `generateReview` call in `reviewExercise` with a bounded repair loop, maximum two repairs
    - [ ] Pass the violated rule, the authorized objective identifiers, and the changed paths into the repair prompt
    - [ ] Record the repair count in the review provenance
- [ ] Task: Implement outcomes and logging
    - [ ] Extend `settleJob` to return `outcome` and `failureReason`
    - [ ] Extend `applySettle` to persist `failureReason` into `review_jobs.last_error` when the outcome is terminal
    - [ ] Write the structured terminal log line in `runWorkerTick`
    - [ ] Handle the `skipped_generated` outcome without calling the model
- [ ] Task: Implement the advisory comment for removed paths
    - [ ] Add the ignored-path section to the comment body in `processJob`
    - [ ] Post the comment for the `skipped_generated` outcome as well, so the intern learns why
- [ ] Task: Implement the tick deadline
    - [ ] Add `deadlineMs` to `CreateReviewWorkerOptions` with a 120,000 default
    - [ ] Stop the drain loop when the deadline passes, after the current job settles
    - [ ] Leave `MAX_ITERATIONS_PER_RUN` in place as the second guard
- [ ] Task: Implement the learner-visible status
    - [ ] Join `review_jobs` in `getPrReviewsForUser` and return `operationalStatus` and `failureReason`
    - [ ] Switch the `codecamp.prReviews` output schema to `prReviewReportSchema`
    - [ ] Extend `ReviewHistory` props and rendering
    - [ ] Add the English and Thai strings for `failed`, `skipped`, `processing`, `retrying`, and the retry action
    - [ ] Wire the retry action to the existing `createPrReview` path so no new procedure is needed
- [ ] Task: Implement the deployment changes
    - [ ] Add `REVIEW_WORKER_BACKOFF_BASE_MS=30000` and a pinned `CODECAMP_PR_REVIEW_MODEL` to `--set-env-vars` in `cloudbuild.yaml`
    - [ ] Add `--attempt-deadline=180s` to both the create and the update branches of `configure-review-worker-scheduler.sh`
- [ ] Task: Confirm the Green phase
    - [ ] Run the domain, webhooks, and app suites; record the counts
    - [ ] Run `pnpm --filter codecamp-advantage check-types` and `lint`
    - [ ] Run the top-level build, because it is the supervisor gate (lessons-learned 2026-06-10)
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update documentation
    - [ ] Record the failure taxonomy in `apps/codecamp-advantage/docs/pr-review-e2e-runbook.md`
    - [ ] Document the new environment variables in `apps/codecamp-advantage/.env.example`
    - [ ] Correct the `REVIEW_WORKER_ENABLED` note: the interval worker belongs to the standalone Hono server, not to this Cloud Run service
- [ ] Task: Run the generated-facts and architecture gates
    - [ ] Run `measure/generate.sh`
    - [ ] Run `measure/doctor.sh`
    - [ ] Run `build-graph update ./graph.db` for the changed files
- [ ] Task: Production verification
    - [ ] Deploy, then re-run the baseline query and compare the dead-row mix
    - [ ] Requeue the existing dead jobs and record how many now complete
    - [ ] Record the residual dead rows and their reasons here
- [ ] Task: Retrospective
    - [ ] Add the enum-in-transaction constraint to `measure/lessons-learned.md` if it is not already there
    - [ ] Close or update the related `tech-debt.md` rows for the review pipeline
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)

## Checkpoints

Record a commit SHA only after the commit is an ancestor of HEAD
(`git merge-base --is-ancestor <sha> HEAD`). Recording a pre-rebase SHA has
produced six dangling references in this repository (lessons-learned 2026-06-07).

- Phase 1 contracts:
- Phase 2 Red:
- Phase 3 Green:
- Phase 4 docs and doctor:
