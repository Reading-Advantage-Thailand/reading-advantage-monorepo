ALTER TABLE sessions ADD COLUMN token_hash TEXT;
UPDATE sessions SET token_hash = encode(digest(token, 'sha256'), 'hex');
ALTER TABLE sessions ALTER COLUMN token_hash SET NOT NULL;
CREATE UNIQUE INDEX sessions_token_hash_unique ON sessions(token_hash);
