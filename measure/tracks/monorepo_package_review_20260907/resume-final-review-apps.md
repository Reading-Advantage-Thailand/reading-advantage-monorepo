# App and quiz final review

This bounded review found no confirmed Critical or High defect in the inspected changes.
The Medium quiz rollback validation gap is closed by the later transactional regression.
The previous auth refresh finding is closed after source review.

## Scope

The review covers Phase 2 of `monorepo_package_review_20260907`.
The source base is `291daf2f1a566cc14298602b6402ebff4dbd1081`.
The existing-work reference is `/tmp/monorepo-resume-baseline.diff`.

The review inspected the Primary security, writer, and UI implementation reports.
It inspected the Reading controller report and current controller changes.
It inspected Science quiz submission, migration 0057, request validation, instrumentation, service dependencies, and relevant tests.
It excluded the active Reading UI repairs.

## Medium: quiz rollback lacks a failure regression

Location: `packages/domain/src/quiz/submit-attempt.ts:210` and the Science quiz integration tests.

The new transaction includes completion, responses, mastery processing, XP, streak, and badge writes.
The existing concurrency test checks one accepted submission, one conflict, response count, mastery run count, and completion count.
The inspected tests do not inject a failure after earlier transaction writes.
They therefore do not verify that a reward failure restores a retryable attempt and removes earlier writes.

This finding concerns missing validation. The source appears to pass the transaction database to each dependency.
This review did not reproduce a runtime rollback defect.

Minimum regression:

1. Start a quiz with a valid persisted selection.
2. Inject a reward dependency failure after the completion and response writes.
3. Submit the selected answers.
4. Verify that the attempt remains incomplete.
5. Verify that no response or mastery run persists.
6. Verify that completion progress and XP retain their previous values.
7. Retry with successful dependencies.
8. Verify one completion and one reward.

Use a real transactional fixture or an existing rollback-capable fixture.
A mock that merely records calls cannot establish rollback behavior.
Also assert the expected XP total in the existing concurrent completion test.
The source change needs no expansion unless this regression exposes a defect.

## Confirmed behavior

### Auth refresh

The new catch clears loading only when the failed refresh generation remains current.
It preserves session fields and rethrows the failure.
The two new tests cover initial loading failure and a later logout.
The signed-out refresh check remains active.
The shared review report records the finding as closed.

### Science quiz

Migration 0057 gives historical attempts an empty selected-question list.
Submission returns 409 for incomplete attempts without a selection.
The implementation does not fabricate historical selections.
New attempts persist the selected IDs and their total points.

Submission rejects duplicate responses and responses outside the selected set before writes.
It requires the complete selected set and queries questions from the attempt lesson.
The tenant database scopes the attempt, and the student identity must match its owner.

The conditional completion update requires `completedAt` to remain null.
A concurrent loser returns 409 before response or reward writes.
All subsequent completion writes use the transaction database.
The route forwards that database to the actual reward and mastery dependencies.

The mastery service retains its existing structured `FAILED` result behavior.
A returned failure status differs from a thrown transaction error.
This review does not claim that every unsuccessful mastery result triggers rollback.

### Reading controllers

Each grading query now binds the question ID to the route article ID.
A mismatched question returns before activity or XP writes.

Teacher assignment access requires classroom membership and the authorized school.
Administrator assignment access requires the authorized school.
Individual assignment updates also verify the student's classroom membership and school.

Lifecycle validation precedes the upsert.
The conflict update compares the observed status before changing the row.
The missing-row path expects `NOT_STARTED`, so a concurrently inserted completed row causes a conflict.
The new negative tests cover both concurrent row changes and concurrent completed-row insertion.

Missing or expired license data resolves to Basic under the cited entitlement contract.
A valid license retains its stored type.
The completion tests retain the Enterprise long-answer requirement.

Activity input validation rejects malformed types and missing targets with HTTP 400.
Generated MCQ writers validate the answer index before storing generated questions.

### Primary

Classroom controllers obtain the actor from the server session.
They ignore the legacy caller identity and role arguments for classroom creation.
The shared access helper requires an allowed role and a school for non-system actors.
Teacher access additionally requires ownership or teacher membership.
Class code generation uses the same access helper before writing.

Writer changes supply required article content, assignment types, identity fields, and numeric answer indices.
The progress writer distinguishes standalone and assigned progress identities.
An initial 100 percent progress update stores completion fields on both records.
The reviewed tests include denied access and zero-write assertions.

### Instrumentation

The root entrypoint loads the Node SDK only for the Node runtime.
A shared promise prevents duplicate registration.
The legacy entrypoint re-exports the live registration function.
This removes the separate inactive implementation from the tested contract.

## Validation limits

This review ran no tests, builds, migrations, or full graph scans.
The root task and implementation agents own the final execution results.
The inspected Primary full-suite log reports 31 passing files and 140 passing tests.
Older failure logs remain historical evidence and do not establish the current result.

Graph caller queries for `submitAttempt` and `processMasteryRun` returned no results.
The review inspected the route and dependency implementations directly.
Those graph results do not establish complete caller coverage.

The review inspected selected runtime paths and authored negative tests.
It does not certify every Primary, Reading, or Science function.
No production file, migration, accepted record, Git note, or commit changed during this review.

## Quiz rollback follow-up

The Science owner added a real PostgreSQL failure regression and a successful retry.
It verifies rollback of completion, responses, mastery runs, XP, and achievements.
The concurrent submission test also verifies one XP award.
All 19 quiz integration tests passed. All nine Domain quiz unit tests passed.
The later Domain full suite passed 839 tests and skipped seven optional PostgreSQL cases.
These results close the validation gap.
