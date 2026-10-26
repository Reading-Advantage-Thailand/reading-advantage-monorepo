# Reading and Science bounded review

This review inspected current source and the supplied logs. It ran no suites, scans, or production writes.
The review applied root instructions, Science instructions, the Measure skill, and the current workflow.
The parent requested no scans. The existing graph query for `updateAssignment` returned ambiguous symbols.
The assignments below use Sol medium, as the user requested.

## P1: Science quiz integrity

Owner: Shared Domain repair agent.
Files: `packages/domain/src/quiz/submit-attempt.ts`, its tests, and existing quiz contracts.

`startQuiz` selects one quarter of the question bank and stores their total points as `maxScore`.
It does not store the selected question identifiers in the attempt.
`submitAttempt` accepts any question from the lesson bank at lines 163–178.
It also counts repeated identifiers repeatedly. The response table has no unique attempt/question constraint.
Thus, students can submit additional or repeated correct responses and exceed the attempt maximum.
The app input schema requires a nonempty response array, but does not reject duplicates.

The completion check at line 161 occurs before the transaction.
The update at line 185 has no incomplete-state condition, so concurrent submissions can both process the attempt.

Preserve the existing tenant and owner checks.
Reject duplicate responses before writes.
Bind grading to the questions selected for the attempt through the minimum existing persistence mechanism.
Use an atomic incomplete-to-completed update before response and reward processing.
Test additional questions, duplicates, concurrent submissions, foreign owners, and foreign schools.
Coordinate any necessary schema change with the database owner.

## P1: Reading question and article association

Owner: Reading controller repair agent.
File: `apps/reading-advantage/server/controllers/question-controller.ts`.

`answerSAQuestion` selects by question identifier alone at line 611.
The MCQ handler does the same at line 831.
Both handlers then associate the activity with the article identifier supplied in the route.
A question from another article can therefore create completion evidence for the requested article.

Require the question and route article identifiers to match before grading or writes.
Inspect the LAQ handler for the same condition.
Test mismatched identifiers with zero activity and XP writes.
Preserve the completion contract: five MCQs and SAQ; Enterprise also requires LAQ.

The existing article completion test does not prove this contract.
Its mock returns MCQ rows for every activity query, including SAQ, LAQ, and existing ARTICLE_READ queries.
Its assertion checks only the table name, not the inserted activity type.
Replace those fixtures with predicate-aware results and inspect inserted values.
Test incomplete requirements and repeated completion as negative controls.

## P1: Reading assignment writes and lifecycle

Owner: Reading assignment repair agent.
File: `apps/reading-advantage/server/controllers/assignment-controller.ts`.

The assignment insert at line 384 omits required `teacherId` and `type` fields.
The governing schema is `packages/db/src/schema/content.ts:63`.
Use the actual authorized teacher and the established article assignment type.
Apply the same correction to `scripts/seed/seed.ts`.

`updateAssignment` copies status at line 538 without reading the current status or enforcing transitions.
`packages/types/src/assignment-status.ts` already defines transition validation and terminal completion.
Use that contract through an explicit mapping from persisted `NOT_STARTED` values.
Preserve numeric response compatibility where current clients require it.
Add a derived overdue field or update consumers together if the response contract changes.
Test terminal-state regression, invalid statuses, unauthorized classrooms, and missing teacher identity.
The teacher access branch checks membership but omits the classroom school check.
Require both membership and the authorized school before assignment writes.

## P1: Reading activity validation

Owner: Reading activity repair agent.
File: `apps/reading-advantage/server/controllers/user-controller.ts`.

`postActivityLog` accepts an empty target at lines 242–248 and persists it at line 307.
It calls `toUpperCase` before validating the activity type.
Its invalid-type response embeds status 400 in JSON but returns HTTP 200.
The PATCH path repeats target resolution at line 444.

Validate input before normalization and return HTTP 400 for invalid input.
Resolve targets using current caller fields, then require a nonempty target.
The historical test demands a literal `targetId`; current code accepts `articleId`, `storyId`, and `contentId`.
Inspect callers before changing those accepted fields.
Preserve existing XP idempotency behavior while testing missing targets and malformed types.

The license failure reflects actual current behavior.
A user without a license or expiration receives Enterprise at line 103.
The test expects Basic. Confirm the governing entitlement specification before changing this legacy fallback.
Do not silently convert that mismatch into a passing fixture.

## P1: Reading generated question writers

Owner: Reading generator repair agent.
Files: `server/controllers/generator-controller.ts` and focused generator tests, relative to Reading.

Three MCQ writers omit the required numeric `correctAnswer` value.
The governing schema is `packages/db/src/schema/questions.ts:13`: an index into the options array.
Resolve generated answers against the actual options before insertion.
Reject missing or ambiguous answers instead of inventing a default index.
Preserve the existing answer text for legacy readers.

## P2: Science instrumentation compatibility

Owner: Science observability repair agent.
Files: `instrumentation.ts`, `lib/instrumentation.node.ts`, `next.config.ts`, package declarations, and focused tests.

The app declares trace-base/resources 2.8 with Node SDK and HTTP exporter 0.57.
The supplied diagnostics confirm incompatible processor and exporter interfaces.
The live root file still constructs the incompatible processor at line 46.
The library file also constructs `Resource`, which is a type in the declared resources version.
The root comment says the duplicate library file exists only for historical tests.

Align the OpenTelemetry components with one compatible installed API generation.
Reuse the live implementation instead of preserving broken runtime code for old mocks.
Use the installed Sentry configuration contract instead of the unsupported `disable` option.
Test runtime gating, exporter selection, and repeated registration.
Run the Science type check after focused tests.

## P2: Test repairs with current contracts

Owner: Separate test repair assignment.

Reading game component failures include `next-intl/navigation` transformation failures.
Controller and FSRS suites also fail while resolving Codecamp Knowledge through Domain.
Repair module resolution before interpreting their behavioral assertions.
The six Jest migration suites reference records that moved to `measure/archive/jest30_major_migration`.
Use the existing records; create no replacement success evidence.
Game timing and presentation failures still require their own current-contract review.

Science historical audit tests explicitly require old defects.
Examples require zero telemetry imports, missing storage, `ignoreBuildErrors: true`, and direct provider dependencies.
Those expectations describe a historical snapshot, not current application behavior.
Preserve historical evidence while replacing live assertions with current regression requirements.
Do not restore defects to satisfy these tests.

The remaining Science diagnostics include obsolete mocks, environment mutation, fixture typing, and an undefined integration-test identifier.
Repair these against current interfaces without weakening tenant-denial tests.
The supplied isolated Science log has no final suite summary; it does not establish a complete pass or failure count.

## Verification limits

Science quiz routes delegate to Domain with session-derived tenant context.
Domain checks tenant access and attempt ownership before submission.
This source review confirms those checks exist, but does not prove every isolation path.
No runtime verification occurred in this bounded review.
