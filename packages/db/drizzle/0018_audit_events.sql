-- =====================================================================
-- Migration 0018: Audit Events Table (Track 4 — Audit Log Infrastructure)
-- Creates the append-only audit_events table for SOC 2 / GDPR / FERPA
-- compliance. Enforced via REVOKE UPDATE, DELETE at the DB level.
--
-- ADR: append-only audit log; see AGENTS.md §4.7, §9.4, §9.5
-- See: measure/tracks/audit_log_infrastructure_20260603/spec.md
-- =====================================================================

-- Create the audit_events table
CREATE TABLE IF NOT EXISTS "audit_events" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_user_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "actor_role"    TEXT,
  "action"        TEXT NOT NULL,
  "target_type"   TEXT,
  "target_id"     TEXT,
  "ip_address"    TEXT,
  "user_agent"    TEXT,
  "metadata"      JSONB,
  "created_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for the admin query surface (FR-7)
CREATE INDEX IF NOT EXISTS "audit_events_actor_idx" ON "audit_events" ("actor_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_events_action_idx" ON "audit_events" ("action", "created_at");
CREATE INDEX IF NOT EXISTS "audit_events_target_idx" ON "audit_events" ("target_type", "target_id");

-- Append-only enforcement: REVOKE UPDATE, DELETE.
-- In local dev (postgres superuser), this is a no-op but documents intent.
-- In production, replace <app_role> with the actual application database role.
-- The superuser can still DELETE for test cleanup; the app role cannot.
-- ADR: append-only audit log; see AGENTS.md §9.5
DO $$
BEGIN
  -- Only revoke if a non-superuser app role exists
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    EXECUTE 'REVOKE UPDATE, DELETE ON audit_events FROM app_user';
  END IF;
END $$;

-- Down migration (run manually to revert):
-- DROP TABLE IF EXISTS "audit_events";
