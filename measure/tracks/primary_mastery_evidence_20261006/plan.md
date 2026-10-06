# Plan — Primary Mastery Evidence (T2)

Measure TDD workflow; one commit per task with `(track_id: primary_mastery_evidence_20261006)`;
tests before implementation; type check and lint once per phase before the phase commit.
Branch `primary/lane-h-objective-tags` in `~/Desktop/rama-worktrees/lane-h` (T1 merged into
`primary-parity-integration`). One heavy job on the machine at a time. Lessons that apply:
rebuild the dependency `dist/` folders after any rebase; `npx tsx` for scripts (`pnpm run`
can hang); the Drizzle mocks must be thenables; the tenant-coverage test scans every domain
file for `createTenantDB` or `unscoped`.

## Phase 0: Discovery
- [x] Task: Confirm the durable job runner: who reads `durable_jobs` today (grep `durableJobs` found only the registry in `packages/domain`); record the enqueue and handler API, or the fallback `processPrimaryEvidenceJobs` loop (FR-5)
  - Answer: `@reading-advantage/backend` owns the API: `createDurableJobQueuePort({ sql })` (postgres.js) with `enqueue({ jobName, queueName, tenant: { mode: "tenant", tenantId }, idempotencyKey, payload, maxAttempts, availableAt })`, and `defineDurableJobHandler({ jobName, tenantMode, payload, result, handle(context, payload) })`. `services/worker` has the composition (`worker-composition.ts`, a handler registry) but `main.ts` wires no handlers yet. Neither `packages/domain` nor `apps/primary-advantage` depends on `@reading-advantage/backend` today. Decision: the domain defines the job name, payload contract, and a transport-free `runPrimaryEvidenceJob({ db, payload })`; a thin `definePrimaryEvidenceJobHandler()` wraps it for the worker registry; the app enqueues through the backend port (new workspace dependency on the app). No fallback loop needed.
- [x] Task: Confirm the question step knows `questionId`, `questionType`, first try, hint, audio played, and mode at submit time (`apps/primary-advantage/actions/question.ts` and its callers); record the `details` keys (FR-5a)
  - Answer: `finishQuiz(articleId, data, type)` is called once per quiz with `data = { responses, score, timer }` and writes one `user_activity` row (unique on user, activity type, target) with `details` jsonb. The MCQ engine (`mc-question-content.tsx`) holds `questions[i].id` (`MCQuestion.id`), per-question `responses` (question text, chosen answer), and `progress` (last status); a student may change an answer before moving on, so first try is the first click per question. No hint or audio state exists in the component today. Decision: add `details.questions: [{ questionId, questionType, correct, firstTry }]`, `details.mode` (`independent` from the article page, `teacher_led` from `components/lesson/practice`), and optional `hintUsed`, `audioPlayed` (false until the UI tracks them). A retake deletes the row; the new row gets a new id and new evidence.
- [x] Task: Confirm the 3D game host posts `metadata.learningEvidence` as `storyGameEvidence` with `itemId` = word record id (apk3d port merged 2026-10-06); record the item kinds the expedition emits (FR-2, FR-3)
  - Answer: `storyGameEvidence` items carry `itemId` (the story item id such as `w-brave`), `kind` (`word`, `sentence`, `fill`, `question`), `label` (the term, sentence, or question text), `attempts`, `correctFirstTry`, `solved`, `paragraph`. The id is story-local, not a word record id. Decision: resolve `word` and `fill` items by `label` against the article's word nodes (same normalize and stem rule as the coverage report); `question` items by question text against the article's question rows (the backfill's text rule); `sentence` items record nothing (no objective tag). `apps/primary-advantage/lib/story-games/completion.ts` already puts the evidence in `metadata.learningEvidence` of `recordGameCompletion`.
- [x] Task: Confirm `buildActivityMasteryCommand` input (`ActivityPracticeSubmissionEnvelope`) carries confidence and `counts`; record how a 0.4 game rating maps to the v3.2 thresholds (FR-1, FR-3)
  - Answer: the envelope is `practice.v1` (`packages/activity-runtime/src/core.ts`): `parts[{ partId, rawAnswer, isCorrect, score, maxScore, hintsUsed, revealStepsSeen }]` and `analytics{ activityId, activityVersion, graphVersion, objectiveId, variantKey, stepId, submissionId, attemptNumber, hintsUsed, revealsUsed, scaffoldLevel, interventionLevel, evidenceConfidence, timing{ wallClockMs, activeMs } }`. The SRS rating comes from the parts (`mapPracticeToSrsRating`: all correct Good, mixed Hard, none Again; hints cap at Hard). `evidenceConfidence` sets the placement confidence (0.8 high, 0.5 medium, else low); there is no `counts` flag. Decision: encode the rating in the parts (Good one correct part, Hard one correct and one incorrect, Again one incorrect), pass the matrix confidence as `evidenceConfidence`, and reuse `projectActivitySubmissionToMastery` (it already replays on the idempotency key `activity:<submissionId>`). "Counts toward mastered" is a policy flag kept in the evidence type string (`activity_direct` vs `activity_support`) for T3 to read; the v3.2 thresholds stay in the engine.
- [ ] Task: Measure - User Manual Verification 'Phase 0: Discovery' (Protocol in workflow.md)

## Phase 1: Contract and Schema Definition
- [x] Task: Evidence policy data and contract (FR-1) (6d1c0708c)
    - [x] `primary-mastery/evidence-policy.ts`: the matrix constant, `evidencePolicySchema`, `rateEvidence(surface, outcome, context)`
    - [x] JSDoc with the program 4.2 source and the version
- [x] Task: Source event contracts (FR-2) (240d36410)
    - [x] `primary-mastery/evidence-contracts.ts`: `questionAnswerEventSchema`, `flashcardReviewEventSchema`, `gameCompletionEventSchema`, `primaryEvidenceEventSchema` (discriminated union), `recordPrimaryEvidenceResultSchema` with receipts and skipped items
    - [x] Job payload contract `primaryEvidenceJobPayloadSchema` (`sourceTable`, `rowId`) and the job kind constant
    - [x] Export from `primary-mastery/index.ts`; the registry needed no change
- [x] Task: Question step details contract (FR-5a): `questionStepDetailsSchema` in `evidence-contracts.ts`, shared by the action and the adapter (240d36410)
- [ ] Task: Measure - User Manual Verification 'Phase 1: Contract and Schema Definition' (Protocol in workflow.md)

## Phase 2: Test
- [x] Task: `__tests__/evidence-policy.test.ts`: one test per matrix row and per rule (teacher-led step, hint step, blank, under two seconds, LAQ, listening without audio) (AC-1) (aa9a35c71)
- [x] Task: `__tests__/record-evidence.test.ts` with `createInMemoryMasteryPersistence` and the in-memory resolver: MCQ two objectives, teacher-led confidence, replay writes nothing, SAQ score ratio, flashcard node and off-list skip, game items at 0.4, expedition question item, unknown item skipped, 201 items rejected (AC-2 to AC-4) (aa9a35c71)
- [x] Task: `__tests__/evidence-sources.test.ts`: the three source rows become events; legacy quiz rows by text (FR-5, FR-5d) (aa9a35c71, 6498a0193)
- [x] Task: `__tests__/evidence-jobs.test.ts`: the enqueue request, the port call, the runner (recorded, row-missing, tenant-mismatch), the handler definition (FR-5, FR-6) (aa9a35c71)
- [x] Task: `__tests__/evidence-summary.test.ts`: counts per surface, day, confidence, and the job results (FR-8) (aa9a35c71)
- [ ] Task: App-side tests: the question action writes the new `details` keys and enqueues; the flashcard route enqueues after the FSRS write; `recordGameCompletion` enqueues on story evidence (AC-5)
- [ ] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md)

## Phase 3: Implement
- [x] Task: `recordPrimaryEvidence` in `primary-mastery/record-evidence.ts`: resolution through the T1 read functions, FR-1 rating, `buildActivityMasteryCommand` per objective, `commitMasteryEvidence` with the idempotency key, skipped list (FR-3, FR-4) (08dcb487a; reuses `projectActivitySubmissionToMastery`, which carries the replay)
- [x] Task: Source adapters in `primary-mastery/evidence-sources.ts`: `userActivity` row to event, `cardReviews` + `flashcardCards` + `flashcardDecks` row to event (the Primary flashcard store; `userWordRecords` is the Reading one), `gameCompletions` row to event; owner-FK school check through `users.schoolId` with `unscoped(reason)` (FR-5, FR-6) (05186260b)
- [x] Task: Job enqueue and handler in `primary-mastery/evidence-jobs.ts` (`primaryEvidenceEnqueueRequest`, `enqueuePrimaryEvidence`, `runPrimaryEvidenceJob`, `definePrimaryEvidenceJobHandler`) (FR-5) (59741550a)
- [ ] Task: Request-path changes: `actions/question.ts` details keys and enqueue; flashcard review route enqueue; `recordGameCompletion` enqueue (FR-5a-c); keep the app layers thin
- [x] Task: `summarizePrimaryEvidence` in `primary-mastery/evidence-summary.ts` (FR-8) (2793824f2)
- [x] Task: Legacy quiz rows yield evidence by question text; `recordGameCompletion` returns `completionId` (FR-5d; owner rule "evidence is kept", 2026-10-06; proposal sent to the monorepo session, confidence 0.5 and SAQ scale 1-5 confirmed from `lib/authorization.ts`)
- [ ] Task: One-time backfill script `apps/primary-advantage/scripts/backfill-primary-evidence.ts`: enqueue one job per existing quiz row, flashcard review, and story game run (FR-5d)
- [ ] Task: Phase gate: type check, lint, the domain suite, and the primary-advantage targeted tests once; commit
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs and Doctor
- [ ] Task: Local run on `primary_advantage_laneh` (migrations through 0070, the 14 tagged articles): one MCQ through the action, the job, the `masteryEvidence` rows, the replay (AC-6); record the row counts here
- [ ] Task: `summarizePrimaryEvidence` output for the local run saved as `evidence-summary.md` in this track folder (AC-7)
- [ ] Task: Run `measure/generate.sh` and `measure/doctor.sh`; `build-graph update ./graph.db` for the new and changed files
- [ ] Task: Tutor read test: not affected (no change to the tables Tutor reads); record the reasoning or the run
- [ ] Task: Update `measure/tracks.md`, this plan, `lessons-learned.md`, `tech-debt.md`, and the program status line; tell the advantage-pr session that the Q-UX-01 resolution is in code (policy file path and version)
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs and Doctor' (Protocol in workflow.md)
