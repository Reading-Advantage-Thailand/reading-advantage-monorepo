# ADR 0002: Drop JWT-Era Accounts Columns

**Date:** 2026-05

**Status:** Accepted

**Context**

The original authentication system used JWT-based tokens with OAuth provider support. This required columns in the `users`, `accounts`, and `sessions` tables that stored JWT-era artifacts: `password` (hashed), `email_verified`, `firebase_uid`, and eight OAuth-related columns on `accounts` (`type`, `provider`, `provider_account_id`, `expires_at`, `token_type`, `scope`, `id_token`, `session_state`). The system also had `refresh_tokens` and `verification_tokens` tables for token-based session management.

The migration to session-based authentication with Argon2id password hashing (via `@reading-advantage/auth`) made these JWT-era columns and tables obsolete.

**Decision**

We chose to drop the JWT-era columns and tables in a single destructive migration rather than keeping dead columns indefinitely. The migration `0003_slow_firebrand.sql`:

- Drops `refresh_tokens` and `verification_tokens` tables.
- Drops `users.password`, `users.email_verified`, `users.firebase_uid`.
- Drops eight OAuth columns from `accounts`.
- Drops two session-token columns from `sessions`.
- Adds `users.username`, `users.display_username` for username-based auth.
- Adds `accounts.provider_id` and `accounts.password` for credential-based auth.

**Consequences**

- The `users` table now uses `username` as the primary identifier; `email` is optional.
- All auth flows go through `@reading-advantage/auth` with Argon2id hashing.
- The old JWT-era / Firebase Auth / NextAuth patterns are fully removed.
- Any tooling or scripts that reference the dropped columns must be updated.

**References**

- Migration: `packages/db/drizzle/0003_slow_firebrand.sql`
- Track: `measure/archive/science_auth_migration_20260503/`
- Auth package: `packages/auth/`
