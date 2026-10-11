# Implementation Plan: Shared Accounts Across Apps

Track: `shared_accounts_20261009`. Spec: [spec.md](./spec.md).
No task starts before the preconditions in Phase 0 are true.

## Phase 0: Preconditions

- [ ] Task: Confirm that the Primary cutover passed and the owner ended the feature freeze.
- [x] Task: Record the owner's answers to OD-1 to OD-5 in `spec.md`. (2026-10-09)
- [x] Task: Record the owner's answer to OD-6 (Reading self sign-up) in `spec.md`. (2026-10-10: no public sign-up)
- [ ] Task: Connection gate: count instances × apps × pools against `max_connections` of `cloud-sql`, set the identity pool size, and stop if the count does not fit. (NFR)
- [ ] Task: List every DNS record of the `reading-advantage.com` zone and ask the owner to remove the unused ones. (NFR, OD-1)
- [ ] Task: Owner creates the database `learner_identity` and its Postgres role; store the URL as the secret `IDENTITY_DATABASE_URL`.
- [ ] Task: Measure - User Manual Verification 'Phase 0: Preconditions' (Protocol in workflow.md)

## Phase 1: Contract and Schema Definition

- [ ] Task: Define the identity schema in `packages/db` with its own Drizzle config and migrations folder, outside the app schema barrel. (FR-1)
    - [ ] `identity_users`, `identity_credentials`, `identity_sessions`, the rate-limit table, and `identity_audit_events`.
- [ ] Task: Define the adapter surface and its Zod contracts: sign in, sign out, session create and validate with two databases, cookie write and clear, rate-limit store, auth audit sink, and the `AUTH_ACCOUNT_STORE` setting. (FR-3)
- [ ] Task: Define the cookie contract for `ra_session`, the `Domain` on clear, and the bridge rule with a new token. (FR-4, FR-9)
- [ ] Task: Define the session rule `full` by default with an explicit `code_only` opt-in. (FR-5)
- [ ] Task: Define the read-copy sync at validation and the conflict rule with `staff-` usernames. (FR-2, FR-8)
- [ ] Task: Define the collision rule before the Primary move. (FR-9)
- [ ] Task: Check the licence model in Primary and Reading: can a licence or a school add an existing identity account by username? Record the result and any licence change in `spec.md`. (OD-5)
- [ ] Task: Define the access rule for a missing local row and the "no access" result. (FR-7)
- [ ] Task: Define the account lifecycle rules. (FR-12)
- [ ] Task: Define the application keys `primary` and `reading` and the role keys for staff. (FR-8)
- [ ] Task: Measure - User Manual Verification 'Phase 1: Contract and Schema Definition' (Protocol in workflow.md)

## Phase 2: Tests

- [ ] Task: Write adapter tests for `shared` mode (red first): sign in, sign out in all apps, the bcrypt rehash, and the row lock on `identity_users`. (FR-3, FR-4)
- [ ] Task: Write a test that a change of `AUTH_ACCOUNT_STORE` needs no code change. (AC-7)
- [ ] Task: Write tests for the student session rules and `full` by default in `shared` mode (red first). (FR-5, AC-3)
- [ ] Task: Write tests for the read-copy sync and the conflict rule (red first). (FR-2)
- [ ] Task: Write tests for the access rule with and without a local row (red first). (FR-7, AC-1)
- [ ] Task: Write tests for the collision rule (red first). (FR-9, AC-8)
- [ ] Task: Write tests for the staff mapping in Primary and Reading (red first). (FR-8, AC-4)
- [ ] Task: Write tests for the move script: same IDs, a second run with the same result, the reconciliation counts, and the 7-day double write (red first). (FR-9, AC-5, AC-6)
- [ ] Task: Measure - User Manual Verification 'Phase 2: Tests' (Protocol in workflow.md)

## Phase 3: Implementation

- [ ] Task: Apply the identity migrations to `learner_identity` through the deploy gate. (FR-1)
- [ ] Task: Implement the adapter with both modes; `local` stays the default. (FR-3, FR-4, FR-5)
- [ ] Task: Move the call sites behind the adapter. (FR-3)
    - [ ] `packages/api/src/routes/auth/login.ts` and `logout.ts`
    - [ ] `packages/auth/src/session.ts` and `audit.ts` (`recordAuditEvent` takes a database)
    - [ ] `packages/domain/src/student-login/roster.ts`
    - [ ] `apps/primary-advantage/lib/student-login/http.ts`
    - [ ] `apps/reading-advantage/middleware.ts` and `lib/session.ts`
- [ ] Task: Implement the read-copy sync at validation. (FR-2)
- [ ] Task: Implement the "no access" page in Primary and Reading. (FR-7)
- [ ] Task: Implement the roster, invite, and licence link by username. (FR-7, OD-5)
- [ ] Task: Remove the Reading sign-up page and `/api/auth/signup`, and change the Reading forgot-password path to the adapter. (FR-7, OD-6)
- [ ] Task: Owner registers the Primary and Reading OIDC clients in `company_identity`; add both keys to the accounts application catalogue. (FR-8)
- [ ] Task: Add company sign-in to Primary and Reading and map the staff roles with `staff-` usernames. (FR-8)
- [ ] Task: Deploy Reading in `shared` mode at the Reading cutover, with the collision rule on. (FR-9, FR-10)
- [ ] Task: Build the Primary move script with the reconciliation report and the session bridge. (FR-9)
- [ ] Task: Run Primary move rehearsal 1 on a copy of production, with the rollback test. (FR-9, AC-6)
- [ ] Task: Run Primary move rehearsal 2 with no code change after it.
- [ ] Task: Move the Primary users in a quiet hour, with the owner present. (FR-9, AC-5)
- [ ] Task: Remove the local staff passwords in Primary after the staff mapping works. (FR-8)
- [ ] Task: After the 7-day window, stop the double write, remove the collision rule, and plan the removal of the old app tables. (FR-2, FR-9)
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implementation' (Protocol in workflow.md)

## Phase 4: Docs and Doctor

- [ ] Task: Write `docs/architecture/accounts.md`: the two account systems, the cookie and its risks, the access rule, the staff roles, the lifecycle, and how a new app joins.
- [ ] Task: Update the AGENTS.md "Current Auth State" and "Known Issues" lines (they still name Firebase and JWT).
- [ ] Task: Run `measure/generate.sh` and `measure/doctor.sh`.
- [ ] Task: Measure - User Manual Verification 'Phase 4: Docs and Doctor' (Protocol in workflow.md)
