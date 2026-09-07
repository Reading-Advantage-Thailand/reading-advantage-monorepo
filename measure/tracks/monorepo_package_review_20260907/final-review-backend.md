# Backend final review

## Summary

The B1–B6 changes address the confirmed defects. This review found no actionable defect in the assigned patch.

## Scope and evidence

The review compared the implementation report's 13 files against HEAD `2ce752b32293708836cf3ce8c5f3a7eb75beb2cf`.
The review included the new script test file and excluded unrelated changes.
The reviewer read the specification, initial review, implementation report, repository instructions, Measure guidance, style guidance, and relevant lessons.

| Finding | Review result |
| --- | --- |
| B1 | Reset permits TEACHER and ADMIN actors. TEACHER targets remain same-school STUDENT users. ADMIN targets permit only STUDENT and TEACHER. |
| B2 | Registration rejects other actor roles before route database access. The existing TEACHER school check remains active. |
| B3 | Logout sets the mount-check guard before state changes and network access. Both success and failure tests reject stale authenticated state. |
| B4 | Cache reuse requires matching installation identity and valid expiry. The A, B, B regression checks token acquisition and B-token reuse. |
| B5 | The script loads the installed SDK interface lazily. It validates article fields, bounds attempts, and appends results after success. |
| B6 | Session creation locks the identified user row before counting sessions. Count, eviction, and insertion use the same transaction. |

The session eviction limit also restores the cap when earlier races left more than ten sessions.
The patch preserves existing exports and adds optional script parameters without breaking existing calls.
The changes follow the Ponytail scope. They introduce no dependencies, framework upgrades, or hashing machinery.

## Verification checks

- Plan compliance: Pass for the assigned repairs, subject to the verification limits below.
- Style compliance: Pass for the changed code and prose.
- New tests: Present for all six repairs.
- Focused tests: 72 tests passed independently.
- API: 32 tests passed across registration and password reset.
- Auth: 18 session tests passed.
- Auth-client: 16 hook tests passed.
- GitHub: 3 tests passed.
- Scripts: 3 tests passed with `node --test --test-isolation=none generateArticle.test.js`.
- Type checks: The implementation report records passing API, auth, auth-client, and GitHub checks.
- Lint: The implementation report records zero errors in focused checks.
- Script lint: The package lacks an ESLint configuration; the implementation report records that limit.
- Whitespace: The implementation report records passing `git diff --check` for assigned paths.
- Graph Caller Check: Skipped because `graph.db` predates this review by more than 24 hours. No TypeScript signature changes require caller migration.
- Browser checks: Skipped. Hook tests exercise the changed state behavior without a live app.

The reviewer used the direct NVM Node binary for independent tests.
The ordinary script runner reported one passing file. Disabling test isolation exposed and passed all three named tests.

## Findings

- Critical: None.
- High: None.
- Medium: None.
- Low: None.

## Limits and verdict

The session tests verify the lock mode, user predicate, transaction handle, query order, and eviction count through mocks.
A live PostgreSQL concurrency test was not run. The review does not claim that verification.
The logout regression resolves the mount response after logout settles. Source inspection also confirms protection while logout remains pending.
The script tests mock provider responses. They do not verify a live provider request.
The implementation report records four unrelated auth closeout failures that require historical records and Git notes.
The reviewer did not rerun those historical checks or the recorded lint and type checks.

Verdict: Accept the B1–B6 patch with the recorded verification limits. This verdict does not certify the full monorepo.
