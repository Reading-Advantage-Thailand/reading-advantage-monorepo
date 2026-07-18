\set ON_ERROR_STOP on

DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
BEGIN
  IF NOT has_table_privilege(current_user, 'users', 'SELECT') THEN
    missing := array_append(missing, 'users:SELECT');
  END IF;
  IF NOT has_table_privilege(current_user, 'accounts', 'SELECT,UPDATE') THEN
    missing := array_append(missing, 'accounts:SELECT,UPDATE');
  END IF;
  IF NOT has_table_privilege(current_user, 'sessions', 'SELECT,INSERT,DELETE') THEN
    missing := array_append(missing, 'sessions:SELECT,INSERT,DELETE');
  END IF;
  IF NOT has_table_privilege(current_user, 'login_attempts', 'SELECT,INSERT,UPDATE,DELETE') THEN
    missing := array_append(missing, 'login_attempts:SELECT,INSERT,UPDATE,DELETE');
  END IF;
  IF NOT has_table_privilege(current_user, 'audit_events', 'INSERT') THEN
    missing := array_append(missing, 'audit_events:INSERT');
  END IF;
  IF NOT has_table_privilege(current_user, 'campaigns', 'SELECT,INSERT,UPDATE') THEN
    missing := array_append(missing, 'campaigns:SELECT,INSERT,UPDATE');
  END IF;
  IF NOT has_table_privilege(current_user, 'past_topics', 'SELECT,INSERT') THEN
    missing := array_append(missing, 'past_topics:SELECT,INSERT');
  END IF;
  IF NOT has_table_privilege(current_user, 'settings', 'SELECT,INSERT,UPDATE') THEN
    missing := array_append(missing, 'settings:SELECT,INSERT,UPDATE');
  END IF;
  IF NOT has_table_privilege(current_user, 'video_projects', 'SELECT,INSERT') THEN
    missing := array_append(missing, 'video_projects:SELECT,INSERT');
  END IF;

  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'Marketing runtime privilege probe failed: %', array_to_string(missing, ', ');
  END IF;
END
$$;

-- Resolve every required relation with the runtime credential. LIMIT 0 avoids
-- reading production data while proving that the granted schema is usable.
SELECT id FROM users LIMIT 0;
SELECT id FROM accounts LIMIT 0;
SELECT id FROM sessions LIMIT 0;
SELECT id FROM login_attempts LIMIT 0;
SELECT id FROM campaigns LIMIT 0;
SELECT id FROM past_topics LIMIT 0;
SELECT key FROM settings LIMIT 0;
SELECT id FROM video_projects LIMIT 0;

BEGIN;
UPDATE accounts SET updated_at = updated_at WHERE false;
DELETE FROM sessions WHERE false;
INSERT INTO login_attempts (identifier, kind)
  VALUES ('__marketing_runtime_probe__', 'username')
  ON CONFLICT (identifier, kind)
  DO UPDATE SET failed_count = login_attempts.failed_count;
DELETE FROM login_attempts WHERE identifier = '__marketing_runtime_probe__';
INSERT INTO audit_events (id, action)
  VALUES ('__marketing_runtime_probe__', 'deployment:runtime_probe');
INSERT INTO campaigns (id, type, app, name)
  VALUES ('00000000-0000-0000-0000-000000000041', 'video', 'reading-advantage', '__runtime_probe__');
UPDATE campaigns SET updated_at = updated_at
  WHERE id = '00000000-0000-0000-0000-000000000041';
INSERT INTO past_topics (id, app, topic)
  VALUES ('00000000-0000-0000-0000-000000000042', 'reading-advantage', '__runtime_probe__');
INSERT INTO settings (key, value)
  VALUES ('__marketing_runtime_probe__', 'probe')
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO video_projects (id, campaign_id, topic)
  VALUES (
    '00000000-0000-0000-0000-000000000043',
    '00000000-0000-0000-0000-000000000041',
    '__runtime_probe__'
  );
ROLLBACK;
