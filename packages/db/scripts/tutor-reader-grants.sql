-- Read-only database login for Tutor Advantage
-- (track primary_legacy_data_migration_20261004, cutover spec D4/A7).
--
-- Run one time on the new Primary database, after migration 0061, as the
-- migration owner. Create the login first, for example:
--   gcloud sql users create tutor_reader --instance=<instance> --password=<secret>
--
-- tutor_reader can read only the four tutor_compat views. The views run with
-- the rights of their owner, so tutor_reader gets no grant on public tables.
-- The search path is set on the role for this database only, so Tutor does
-- not depend on a URL parameter that some drivers and poolers ignore.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tutor_reader') THEN
    RAISE EXCEPTION 'Create the tutor_reader login before you run this script';
  END IF;
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO tutor_reader', current_database());
  EXECUTE format(
    'ALTER ROLE tutor_reader IN DATABASE %I SET search_path = tutor_compat',
    current_database()
  );
END
$$;

GRANT USAGE ON SCHEMA tutor_compat TO tutor_reader;

GRANT SELECT ON
  tutor_compat.article,
  tutor_compat.multiple_choice_questions,
  tutor_compat.short_answer_questions,
  tutor_compat.sentencs_and_words_for_flashcard
TO tutor_reader;

COMMIT;
