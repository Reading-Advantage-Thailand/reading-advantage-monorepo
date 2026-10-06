# Plan — Primary Mastery Evidence (T2)

Measure TDD workflow; one commit per task with `(track_id: primary_mastery_evidence_20261006)`;
tests before implementation; type check and lint once per phase before the phase commit.
Branch `primary/lane-h-objective-tags` in `~/Desktop/rama-worktrees/lane-h` (T1 merged into
`primary-parity-integration`). One heavy job on the machine at a time. Lessons that apply:
rebuild the dependency `dist/` folders after any rebase; `npx tsx` for scripts (`pnpm run`
can hang); the Drizzle mocks must be thenables; the tenant-coverage test scans every domain
file for `createTenantDB` or `unscoped`.

## Phase 0: Discovery
- [ ] Task: Confirm the durable job runner: who reads `durable_jobs` today (grep `durableJobs` found only the registry in `packages/domain`); record the enqueue and handler API, or the fallback `processPrimaryEvidenceJobs` loop (FR-5)
- [ ] Task: Confirm the question step knows `questionId`, `questionType`, first try, hint, audio played, and mode at submit time (`apps/primary-advantage/actions/question.ts` and its callers); record the `details` keys (FR-5a)
- [ ] Task: Confirm the 3D game host posts `metadata.learningEvidence` as `storyGameEvidence` with `itemId` = word record id (apk3d port merged 2026-10-06); record the item kinds the expedition emits (FR-2, FR-3)
- [ ] Task: Confirm `buildActivityMasteryCommand` input (`ActivityPracticeSubmissionEnvelope`) carries confidence and `counts`; record how a 0.4 game rating maps to the v3.2 thresholds (FR-1, FR-3)
- [ ] Task: Measure - User Manual Verification 'Phase 0: Discovery' (Protocol in workflow.md)

## Phase 1: Contract and Schema Definition
- [ ] Task: Evidence policy data and contract (FR-1)
    - [ ] `primary-mastery/evidence-policy.ts`: the matrix constant, `evidencePolicySchema`, `rateEvidence(surface, outcome, context)`
    - [ ] JSDoc with the program 4.2 source and the version
- [ ] Task: Source event contracts (FR-2)
    - [ ] `primary-mastery/evidence-contracts.ts`: `questionAnswerEventSchema`, `flashcardReviewEventSchema`, `gameCompletionEventSchema`, `primaryEvidenceEventSchema` (discriminated union), `recordPrimaryEvidenceResultSchema` with receipts and skipped items
    - [ ] Job payload contract `primaryEvidenceJobPayloadSchema` (`sourceTable`, `rowId`) and the job kind constant
    - [ ] Export from `primary-mastery/index.ts`; update `tenant-registry.ts` comments if a table's reason changes
- [ ] Task: Question step details contract (FR-5a): Zod schema for the additive `userActivity.details` keys, shared by the action and the adapter
- [ ] Task: Measure - User Manual Verification 'Phase 1: Contract and Schema Definition' (Protocol in workflow.md)

## Phase 2: Test
- [ ] Task: `__tests__/evidence-policy.test.ts`: one test per matrix row and per rule (teacher-led step, hint step, blank, under two seconds, LAQ, listening without audio) (AC-1)
- [ ] Task: `__tests__/record-evidence.test.ts` with `createInMemoryMasteryPersistence` and the mock DB: MCQ two objectives, teacher-led confidence, replay writes nothing, SAQ score ratio, flashcard node and off-list skip, game 20 items at 0.4, expedition question item, unknown item skipped, state before and after recorded (AC-2 to AC-4)
- [ ] Task: `__tests__/evidence-adapters.test.ts`: the three source rows become events; a row of another school is refused before any write (FR-6)
- [ ] Task: `__tests__/evidence-jobs.test.ts`: enqueue inserts one `durable_jobs` row per source write; the handler loads the row and calls `recordPrimaryEvidence`; a 201-item run is rejected (FR-5, NFR)
- [ ] Task: `__tests__/evidence-summary.test.ts`: counts per surface, day, confidence, and skipped reason (FR-8)
- [ ] Task: App-side tests: the question action writes the new `details` keys and enqueues; the flashcard route enqueues after the FSRS write; `recordGameCompletion` enqueues on story evidence (AC-5)
- [ ] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md)

## Phase 3: Implement
- [ ] Task: `recordPrimaryEvidence` in `primary-mastery/record-evidence.ts`: resolution through the T1 read functions, FR-1 rating, `buildActivityMasteryCommand` per objective, `commitMasteryEvidence` with the idempotency key, skipped list (FR-3, FR-4)
- [ ] Task: Source adapters in `primary-mastery/evidence-sources.ts`: `userActivity` row to event, `cardReviews` + `userWordRecords` row to event, `gameCompletions` row to event; owner-FK school check through `users.schoolId` with `unscoped(reason)` (FR-5, FR-6)
- [ ] Task: Job enqueue and handler in `primary-mastery/evidence-jobs.ts` (`enqueuePrimaryEvidenceJob`, `runPrimaryEvidenceJob` or `processPrimaryEvidenceJobs` per Phase 0) (FR-5)
- [ ] Task: Request-path changes: `actions/question.ts` details keys and enqueue; flashcard review route enqueue; `recordGameCompletion` enqueue (FR-5a-c); keep the app layers thin
- [ ] Task: `summarizePrimaryEvidence` in `primary-mastery/evidence-summary.ts` (FR-8)
- [ ] Task: Phase gate: type check, lint, the domain suite, and the primary-advantage targeted tests once; commit
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs and Doctor
- [ ] Task: Local run on `primary_advantage_laneh` (migrations through 0070, the 14 tagged articles): one MCQ through the action, the job, the `masteryEvidence` rows, the replay (AC-6); record the row counts here
- [ ] Task: `summarizePrimaryEvidence` output for the local run saved as `evidence-summary.md` in this track folder (AC-7)
- [ ] Task: Run `measure/generate.sh` and `measure/doctor.sh`; `build-graph update ./graph.db` for the new and changed files
- [ ] Task: Tutor read test: not affected (no change to the tables Tutor reads); record the reasoning or the run
- [ ] Task: Update `measure/tracks.md`, this plan, `lessons-learned.md`, `tech-debt.md`, and the program status line; tell the advantage-pr session that the Q-UX-01 resolution is in code (policy file path and version)
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs and Doctor' (Protocol in workflow.md)
