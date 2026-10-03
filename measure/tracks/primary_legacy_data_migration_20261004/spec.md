# Spec — Primary Legacy Data Migration

Track ID: `primary_legacy_data_migration_20261004`
Type: feature
Program: [primary-tutor-parity-program](../../primary-tutor-parity-program.md)
Source: [primary-cutover-migration-spec.md](../../../docs/deployment/primary-cutover-migration-spec.md) v1.2 (decisions D1-D9, ETL rules §6, code tasks §7)

## Context

The cutover moves Primary from the legacy database (Prisma, text cuid keys, table
`article`) to the shared schema (Drizzle, `uuid` keys, table `articles`). Tutor
Advantage reads four legacy tables by name and stores cuid article IDs. Printed
Origins 2 and 3.1 QR codes carry cuid IDs. All teachers sign in with Google today;
after cutover the only sign-in is username and password. The five lanes of the
program did not own this work. Rehearsal 1 (Oct 8-9) needs the ETL.

## Functional Requirements

- FR-1 (D2): Table `primary_legacy_id_map (table_name text, legacy_id text, new_id uuid,
  primary key (table_name, legacy_id))` in an additive migration. Ask Lane A for the
  migration number (program rule 6).
- FR-2 (A7, D4): Schema `tutor_compat` with four read-only views named `article`,
  `multiple_choice_questions`, `short_answer_questions`, `sentencs_and_words_for_flashcard`.
  Each view exposes `coalesce(legacy_id, id::text)` as `id` / `article_id` and the
  exact columns Tutor's `PrimaryAdvantageDB.ts` selects. Lane A's Tutor read test
  (Lane A FR-5) passes against these views.
- FR-3 (A6, §6): One idempotent ETL script in `packages/db` that reads the legacy
  database (read only) and writes the new database, one transaction per table group,
  in the §6 order. It writes `primary_legacy_id_map` and ends with a reconciliation
  report (read, written, skipped with reason, per table). It resolves every §6 hazard,
  including a target or a "dropped, because" for each table with no known target.
  Google tokens are not copied.
- FR-4 (A5, D3): `student/read/[articleId]` and `/writing` accept a legacy cuid, look it
  up in `primary_legacy_id_map`, and redirect to the UUID URL.
- FR-5 (A9, D8): A script gives each migrated teacher a credential account with
  `username = lower(email)` (D6) and a random temporary password, and writes a
  hand-out list (outside git) for the team. The script also covers every migrated account
  whose password hash is not bcrypt or Argon2id (the 4 scrypt accounts in the April
  backup), because scrypt verification is dropped. A nullable column marks the password as
  temporary. After a sign-in with a temporary password the teacher must set a new
  password before any other page; the temporary password then stops working.
- FR-6 (A8): The teacher sign-in page says "Username or email" and accepts either.

## Non-goals

- No Google sign-in, OAuth, or scrypt verification (D7 dropped 2026-10-04).
- No change to the legacy database or the tutor-advantage repo.
- No deploy, Cloud Build submit, or Cloud Run change.
- Student class-code login (A3) belongs to `primary_student_login_20261003`.

## Acceptance Criteria

- Every migration is additive. Lane A's Tutor read test passes against `tutor_compat`.
- The ETL runs twice on a restored legacy copy with the same result and no
  unexplained skips.
- All 27 Origins 2 and 3.1 article IDs open by their old URL (by script).
- A migrated teacher signs in with the temporary password, must set a new one, and
  cannot reuse the temporary password.
- Tests for each FR. Tests, tsc, and ESLint green for the changed packages.
