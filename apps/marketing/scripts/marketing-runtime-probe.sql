\set ON_ERROR_STOP on

DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
  retired_table text;
  forbidden_privilege text;
BEGIN
  IF NOT has_table_privilege(current_user, 'campaigns', 'SELECT,INSERT,UPDATE') THEN
    missing := array_append(missing, 'campaigns:SELECT,INSERT,UPDATE');
  END IF;
  IF NOT has_table_privilege(current_user, 'past_topics', 'SELECT,INSERT') THEN
    missing := array_append(missing, 'past_topics:SELECT,INSERT');
  END IF;
  IF NOT has_table_privilege(current_user, 'settings', 'SELECT,INSERT,UPDATE') THEN
    missing := array_append(missing, 'settings:SELECT,INSERT,UPDATE');
  END IF;
  IF NOT has_table_privilege(current_user, 'video_projects', 'SELECT,INSERT,UPDATE') THEN
    missing := array_append(missing, 'video_projects:SELECT,INSERT,UPDATE');
  END IF;

  FOREACH retired_table IN ARRAY ARRAY[
    'users', 'accounts', 'sessions', 'login_attempts', 'audit_events'
  ] LOOP
    FOREACH forbidden_privilege IN ARRAY ARRAY[
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
    ] LOOP
      IF has_table_privilege(current_user, retired_table, forbidden_privilege) THEN
        RAISE EXCEPTION 'Marketing runtime retains retired local-auth privilege %:%',
          retired_table, forbidden_privilege;
      END IF;
    END LOOP;
  END LOOP;

  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'Marketing runtime privilege probe failed: %', array_to_string(missing, ', ');
  END IF;
END
$$;

-- Resolve every required relation with the runtime credential. LIMIT 0 avoids
-- reading production data while proving that the granted schema is usable.
SELECT id FROM campaigns LIMIT 0;
SELECT id FROM past_topics LIMIT 0;
SELECT key FROM settings LIMIT 0;
SELECT id FROM video_projects LIMIT 0;

BEGIN;
INSERT INTO campaigns (id, type, app, name)
  VALUES ('00000000-0000-0000-0000-000000000041', 'video', 'reading-advantage', '__runtime_probe__');
UPDATE campaigns SET updated_at = updated_at
  WHERE id = '00000000-0000-0000-0000-000000000041';
-- Exercise the predecessor writer shape: migration 0041 must derive
-- normalized_key even when the serving revision does not send the column.
INSERT INTO past_topics (id, app, topic)
  VALUES ('00000000-0000-0000-0000-000000000042', 'reading-advantage', '__runtime_probe__');
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT id FROM past_topics
    WHERE id = '00000000-0000-0000-0000-000000000042'
      AND normalized_key = marketing_normalize_topic(topic)
  ) THEN
    RAISE EXCEPTION 'Marketing predecessor-writer normalization probe failed';
  END IF;
END
$$;
INSERT INTO settings (key, value)
  VALUES ('__marketing_runtime_probe__', 'probe')
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO video_projects (id, campaign_id, topic)
  VALUES (
    '00000000-0000-0000-0000-000000000043',
    '00000000-0000-0000-0000-000000000041',
    '__runtime_probe__'
  );
UPDATE video_projects SET script = script
  WHERE id = '00000000-0000-0000-0000-000000000043';
ROLLBACK;
