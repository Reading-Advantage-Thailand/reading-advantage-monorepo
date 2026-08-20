# Implementation Plan: Codecamp Mastery Evidence Projection

> **Browser acceptance:** Complete one full Phase A module end to end as an
> intern: read the theory, answer the checkpoints, submit the exercise, take the
> quiz, and open the pull request. Then show the resulting objective evidence in
> the administrator surface. Unit tests do not close a phase in this track.

> **Evidence quality gates projection.** S2, S3, and S4 must be green before S5
> runs. Projecting today's evidence would write self-clicked completions into the
> shared mastery graph and corrupt it for Sales Advantage and every other
> consumer. Do not reorder these stories.

> **Database discipline.** Every new table needs a real-database smoke test.
> Mock-database unit tests have passed in this repository while real constraints
> were violated (lessons-learned 2026-05-14). Follow the `when` monotonicity rule
> in `packages/db/drizzle/MIGRATION_LEDGER.md`; the next migration index is 0054.

## Phase S1: The bindings match the curriculum, and CI proves it
_Story ref: spec.md#story-s1_
_Blast radius: `curriculumBindings` is imported by `packages/domain/src/codecamp/review-exercise.ts` and `pr-review-attempts.ts`. A regenerated file changes data, not signatures, so the caller risk is the objective identifier set, not the type._

- [ ] Task: Contract and schema definition
    - [ ] Record the current drift in this plan: recorded `sourceDigest`, current file digest, recorded `curriculumVersion`, and the true module count
    - [ ] Confirm the generator at `packages/codecamp-knowledge/scripts/generate-curriculum-bindings.ts` handles 20 modules
    - [ ] Decide how the APK module appears in the bindings, since it is authored separately in `codecamp-apk-curriculum-data.ts`
- [ ] Task: Write Red tests
    - [ ] Extend `packages/codecamp-knowledge/src/__tests__/authored-bindings.test.ts` with the true post-regeneration counts
    - [ ] Assert `provenance.sourceDirty` is false
    - [ ] Assert the recorded `sourceDigest` equals the digest of the curriculum source at HEAD
    - [ ] Assert every objective identifier in the bindings exists in the graph
    - [ ] Assert every repository binding still resolves for the 16 modules that have one
- [ ] Task: Implement
    - [ ] Regenerate the bindings from a clean tree
    - [ ] Update `curriculumVersion` to the true module and lesson counts
    - [ ] Add `bindings:verify-source` and `graph:verify-source` to `.github/workflows/ci.yml`
    - [ ] Confirm the added CI time and record it here
- [ ] Task: Generate docs and doctor
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
    - [ ] Run `build-graph update ./graph.db`
- [ ] Task: Measure - User Manual Verification 'Phase S1: The bindings match the curriculum, and CI proves it' (Protocol in workflow.md)

## Phase S2: Exercise submissions are stored and answered
_Story ref: spec.md#story-s2_
_Blast radius: `submitExerciseAttempt` in `packages/domain/src/codecamp/exercises.ts`. Callers: `packages/api/src/routers/codecamp.ts:137` and the `ExerciseCard` component in the lesson page. The return shape widens, so both callers change._

- [ ] Task: Contract and schema definition
    - [ ] Add `codecamp_exercise_submissions`: id, exercise_id, lesson_id, user_id, code, status, score, feedback, grader, graded_at, created_at
    - [ ] Write migration `0054_codecamp_exercise_submissions.sql` and respect the ledger `when` rule
    - [ ] Widen `exerciseResultSchema` in `packages/types/src/codecamp.ts` with `submissionId`, `status`, and `attempts`
    - [ ] Define the grader seam: the same domain-level `(system, prompt)` callback shape used by `reviewExercise`, so the domain package stays provider neutral
- [ ] Task: Write Red tests
    - [ ] `packages/domain/src/__tests__/exercise-submission.test.ts`
    - [ ] A submission persists the code, the exercise, the lesson, and the user
    - [ ] The response carries a real pass or fail verdict and a reason
    - [ ] A second submission creates a second row and returns the attempt count
    - [ ] A grader failure still persists the code and returns a pending status
    - [ ] Submissions are readable only by their owner and by an administrator
    - [ ] A real-database smoke test covers the insert and the foreign keys
- [ ] Task: Implement
    - [ ] Persist the submission before grading
    - [ ] Grade through the seam and store the verdict
    - [ ] Return previous attempts to the lesson page and render them
    - [ ] Update progress to completed only on a passing verdict
- [ ] Task: Generate docs and doctor
    - [ ] Run `measure/generate.sh`, `measure/doctor.sh`, and the database ledger doctor
- [ ] Task: Measure - User Manual Verification 'Phase S2: Exercise submissions are stored and answered' (Protocol in workflow.md)

## Phase S3: Quiz attempts are recorded and the answers stay hidden
_Story ref: spec.md#story-s3_
_Blast radius: `submitQuizAnswers` in `packages/domain/src/codecamp/quizzes.ts`. Callers: `packages/api/src/routers/codecamp.ts:153` and `QuizComponent` in the lesson page._

- [ ] Task: Contract and schema definition
    - [ ] Add `codecamp_quiz_attempts`: id, lesson_id, user_id, attempt_number, answers_json, score, passed, created_at
    - [ ] Write migration `0055_codecamp_quiz_attempts.sql`
    - [ ] Define the attempt budget and record the chosen value with its rationale
    - [ ] Split the result contract: a withheld variant and a revealed variant
- [ ] Task: Write Red tests
    - [ ] `packages/domain/src/__tests__/quiz-attempts.test.ts`
    - [ ] Each submission writes one attempt row with an increasing attempt number
    - [ ] A failing attempt with budget remaining returns per-question correctness and no answer key
    - [ ] The final attempt returns the answer key and the explanations
    - [ ] The pass threshold stays 70 and the passing attempt marks the lesson complete
    - [ ] A concurrent double submission does not skip or duplicate an attempt number
    - [ ] A real-database smoke test covers the insert and the unique constraint
- [ ] Task: Implement
    - [ ] Persist the attempt inside the grading transaction
    - [ ] Return the withheld result until the budget is spent
    - [ ] Update `QuizComponent` to render both variants
    - [ ] Add the English and Thai strings and keep key parity
- [ ] Task: Generate docs and doctor
    - [ ] Run `measure/generate.sh`, `measure/doctor.sh`, and the ledger doctor
- [ ] Task: Measure - User Manual Verification 'Phase S3: Quiz attempts are recorded and the answers stay hidden' (Protocol in workflow.md)

## Phase S4: Theory completion is earned
_Story ref: spec.md#story-s4_
_Blast radius: `markTheoryComplete` in `packages/domain/src/codecamp/quizzes.ts` and `TheoryCompleteButton` in the lesson page. 71 theory lessons are affected, so the authoring volume is the real cost, not the code._

- [ ] Task: Contract and schema definition
    - [ ] Define the lesson checkpoint contract, reusing the APK checkpoint shape from `@reading-advantage/activity-runtime` where it fits
    - [ ] Decide where a checkpoint is authored: the lesson `contentJson`, or a new column; record the decision and its migration cost
    - [ ] Define the fallback: a lesson with no authored checkpoint keeps the button and is listed in the authoring backlog
    - [ ] Define the retry and hint policy, matching the tutor support ladder
- [ ] Task: Write Red tests
    - [ ] `packages/domain/src/__tests__/theory-checkpoint.test.ts`
    - [ ] A correct checkpoint answer completes the lesson
    - [ ] An incorrect answer leaves the lesson in progress and returns a hint
    - [ ] A lesson with no authored checkpoint keeps the current behavior
    - [ ] `markTheoryComplete` rejects a lesson that has an authored checkpoint
    - [ ] The authoring backlog report lists every lesson still without a checkpoint
- [ ] Task: Implement
    - [ ] Add the checkpoint assessment path and the lesson page surface
    - [ ] Author checkpoints for Phase A first; record coverage per phase in this plan
    - [ ] Keep the fallback until coverage reaches 100 percent
- [ ] Task: Generate docs and doctor
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S4: Theory completion is earned' (Protocol in workflow.md)

## Phase S5: Assessed lesson evidence reaches the knowledge space
_Story ref: spec.md#story-s5_
_Blast radius: `projectActivitySubmissionToMastery` in `packages/domain/src/activity/activity-mastery-projection.ts`, already called by `drizzle-activity-persistence.ts:236`. This story adds a second caller family. The pattern to copy is `packages/domain/src/sales-mastery.ts`, which already projects `quiz-response` evidence at runtime._

- [ ] Task: Contract and schema definition
    - [ ] Define `projectCodecampLessonEvidence({ bindingKind, attempt })` covering `quiz-response` and `exercise-check`
    - [ ] Define the idempotency key per attempt, following the PR attempt key format
    - [ ] State the rule that `lesson-view` bindings project nothing, because their evidence weight is zero
    - [ ] Reuse the outbox status columns on the activity event rows, or define the Codecamp equivalent
- [ ] Task: Write Red tests
    - [ ] `packages/domain/src/__tests__/codecamp-lesson-evidence-projection.test.ts`
    - [ ] A graded quiz attempt projects evidence for exactly the bound objectives
    - [ ] A graded exercise attempt projects evidence for exactly the bound objectives
    - [ ] A `lesson-view` completion projects nothing
    - [ ] A repeated projection returns `replayed` and writes no duplicate
    - [ ] A projection failure records the failure and leaves the learner path green
    - [ ] An unbound lesson projects nothing and raises no error
- [ ] Task: Implement
    - [ ] Call the projection from the quiz and exercise settle paths
    - [ ] Resolve the bindings through `curriculumBindings`, never through a hard-coded map
    - [ ] Record the projection receipt and expose it in the administrator surface
- [ ] Task: Generate docs and doctor
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
    - [ ] Run `build-graph update ./graph.db`
- [ ] Task: Measure - User Manual Verification 'Phase S5: Assessed lesson evidence reaches the knowledge space' (Protocol in workflow.md)

## Phase S6: Approved pull requests project for every module
_Story ref: spec.md#story-s6_
_Blast radius: `projectApprovedAPKReview` in `packages/domain/src/codecamp/pr-reviews.ts:231` and `projectVerifiedPrObjectiveToMastery` in `pr-review-attempts.ts:221`. The second function has no production caller today; this story gives it one._

- [ ] Task: Contract and schema definition
    - [ ] Define the evaluator attestation contract: which deterministic checks must pass, and who attests
    - [ ] Reuse `fetchPrCheckEvidence` as the deterministic source
    - [ ] Keep the existing guard that requires `passed` and a score of at least 80
    - [ ] Preserve the APK spaced follow-up schedule exactly
- [ ] Task: Write Red tests
    - [ ] `packages/domain/src/__tests__/pr-mastery-projection-all-modules.test.ts`
    - [ ] An approved pull request in a non-APK module with passing checks projects evidence
    - [ ] An approved pull request with failing checks projects nothing and records the reason
    - [ ] An approved pull request with unavailable check evidence projects nothing
    - [ ] Advisory model evidence never projects
    - [ ] The APK path keeps its follow-up card schedule at 2 and 7 days
    - [ ] A repeated approval returns `replayed`
- [ ] Task: Implement
    - [ ] Replace the `apk-game-creation` early return with a binding lookup
    - [ ] Call `projectVerifiedPrObjectiveToMastery` for every module that has a repository binding
    - [ ] Keep the APK-specific card seeding behind its own branch
- [ ] Task: Generate docs and doctor
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S6: Approved pull requests project for every module' (Protocol in workflow.md)

## Phase S7: Due mastery cards reach the learner
_Story ref: spec.md#story-s7_
_Blast radius: `masteryCards` is written in `pr-reviews.ts:246` and read nowhere in Codecamp. This story adds the first reader._

- [ ] Task: Contract and schema definition
    - [ ] Define the due-review query scoped to the Codecamp tenant and the learner
    - [ ] Define the dashboard review section contract
    - [ ] Reuse the existing scheduling engine; define no new scheduler
- [ ] Task: Write Red tests
    - [ ] Due cards appear; absent cards render no section
    - [ ] A completed review reschedules through the existing engine
    - [ ] A card belonging to another learner never appears
- [ ] Task: Implement
    - [ ] Add the query, the procedure, and the dashboard section
    - [ ] Add the English and Thai strings and keep key parity
- [ ] Task: Generate docs and doctor
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S7: Due mastery cards reach the learner' (Protocol in workflow.md)

## Phase S8: Module gating uses graph prerequisites
_Story ref: spec.md#story-s8_
_Blast radius: `isModuleLocked` and `getLockedByModuleTitle` in `apps/codecamp-advantage/lib/module-utils.ts`. Callers: `dashboard-content.tsx` and the module page. This is the only story that changes what a learner may open, so it ships last._

- [ ] Task: Contract and schema definition
    - [ ] Define prerequisite resolution from the graph edges, honoring the non-compensatory weight in `packages/codecamp-knowledge/src/validation.ts:15`
    - [ ] Define the fallback to the current order rule when no edge exists
    - [ ] Define the learner message naming the missing prerequisite
- [ ] Task: Write Red tests
    - [ ] A held prerequisite unlocks a module out of list order
    - [ ] An unheld prerequisite locks a module and names it
    - [ ] A module with no prerequisite edge falls back to the order rule
    - [ ] An in-progress cohort keeps its current unlock state after deployment
- [ ] Task: Implement
    - [ ] Resolve prerequisites through the graph and the learner's mastery state
    - [ ] Keep the order rule as the documented fallback
    - [ ] Verify no current learner is locked out of a module they already opened
- [ ] Task: Generate docs and doctor
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
    - [ ] Run `build-graph update ./graph.db`
- [ ] Task: Retrospective
    - [ ] Record the central lesson: a knowledge graph is only as good as the evidence feeding it, and weak evidence must be fixed before the projection is opened
    - [ ] Close the related `tech-debt.md` rows and update `measure/codecamp-mastery-learning-platform-program.md`
- [ ] Task: Measure - User Manual Verification 'Phase S8: Module gating uses graph prerequisites' (Protocol in workflow.md)

## Checkpoints

Record a commit SHA only after the commit is an ancestor of HEAD.

- S1 bindings and CI:
- S2 exercise submissions:
- S3 quiz attempts:
- S4 theory checkpoints:
- S5 lesson evidence projection:
- S6 pull request projection:
- S7 due reviews:
- S8 graph gating:
