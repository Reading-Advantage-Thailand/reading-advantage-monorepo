# Primary Security Repair

Date: 2026-09-07

## Implemented repairs

- Classroom controllers now use the uppercase session roles.
- Classroom operations allow only `TEACHER`, `ADMIN`, and `SYSTEM` actors.
- Non-system classroom queries include the actor's `schoolId` predicate.
- Teacher access requires primary ownership or a classroom teacher membership.
- Enrollment requires a same-school user with the `STUDENT` role.
- Student list queries now include the authorized school.
- Classroom creation now writes `teacherId` and `createdBy`.
- Class code generation checks access before reads and writes.
- The classroom response now returns the teacher user ID.
- Both CSV routes now query the `schools` table for school details.
- The combined upload route no longer shadows the `roles` table.
- Imported users now include `id`, `username`, `displayUsername`, and the uppercase role.
- Imported classrooms now include `teacherId` and `createdBy`.
- Student and teacher filenames now accept only their matching row role.

The requested `app/api/upload/users/route.ts` file does not exist.
The user upload implementation is `app/api/upload/csv/route.ts`.

## Verification

The fast authorization run passed 11 tests across three files.
The model authorization run passed four PGlite tests.
The tests cover denied students, foreign teachers, same-school admins, owners, and system upload access.
The denial tests confirm zero writes for blocked enrollment, code generation, and CSV uploads.
The CSV tests verify required account fields, classroom ownership fields, and the correct school table.

The first model run found one response mapping defect.
The implementation now maps `teacherId` from `teacherRows[0].userId`.

An early Primary type-check attempt printed no diagnostics before the final refinements.
The captured output did not include a reliable exit result.
This attempt does not establish a full Primary type-check pass.
The orchestrator reserved the final type check because the machine has limited memory.

The graph update exceeded the command window.
The graph modification time did not change.

## Remaining Primary diagnostics

These confirmed groups remain outside this repair assignment:

- Article pages: database shape, nullable values, and absent flashcards.
- Student reports and progress pages: database shape and nullable values.
- Completion components: undefined session refresh calls.
- Navigation and layouts: remaining role and nullable school issues.
- Student assignments: obsolete table and status contracts.
- License form: nullable defaults and form types.
- Article model: required content and numeric answers.
- Assignment model: required type and lesson identifier.
- Lesson model: required lesson identifier.
- Student, teacher, and user models: required identity fields and nullable values.
- Generator utilities: missing AI exports and nullable CEFR values.
- The CSV cleanup route still needs separate authorization review.

The full file and line inventory remains in `resume-review-apps.md`.

## Remaining verification

- Run the final Primary type check after all Primary repair batches finish.
- Run the full Primary test suite after all Primary repair batches finish.
- Run the existing sibling model suite when the PGlite process budget permits.
- Refresh `graph.db` after concurrent source changes stop.
