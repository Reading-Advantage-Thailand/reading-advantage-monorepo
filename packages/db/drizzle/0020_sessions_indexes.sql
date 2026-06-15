CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
