CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TABLE sessions ADD COLUMN token_hash TEXT;
UPDATE sessions SET token_hash = encode(digest(token, 'sha256'), 'hex');
ALTER TABLE sessions ALTER COLUMN token_hash SET NOT NULL;
ALTER TABLE sessions ALTER COLUMN token DROP NOT NULL;
CREATE UNIQUE INDEX sessions_token_hash_unique ON sessions(token_hash);
