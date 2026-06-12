# @reading-advantage/auth

Authentication, authorization, and audit utilities for the Reading Advantage platform.

## Audit Retention Policy

Audit events are retained for a configurable period to satisfy FERPA compliance
requirements. The retention window controls how long `audit_events` rows remain
in the database before being purged by the automated retention job.

### Configuration

| Env var | Default | Minimum | Description |
|---------|---------|---------|-------------|
| `AUDIT_RETENTION_DAYS` | `2557` (≈7 years) | `365` (1 year) | Number of days to retain audit events |

The value is validated at parse time by `retentionConfigSchema`. Values below
365 are rejected with a schema error — the floor exists to prevent accidental
data loss in production.

#### Example

```bash
# Use the default (2557 days)
AUDIT_RETENTION_DAYS=2557

# Extend to 10 years
AUDIT_RETENTION_DAYS=3653
```

### Exports

- **`retentionConfigSchema`** — Zod schema that validates and transforms the
  `AUDIT_RETENTION_DAYS` env var. Parses the string to an integer and enforces
  the ≥ 365 floor via `.refine()`.
- **`getRetentionDays()`** — Convenience function that reads and validates the
  env var, returning the retention period as a number.

### Compliance

See [docs/compliance/retention.md](../../docs/compliance/retention.md) for the
full retention policy rationale and FERPA compliance details.

## Session Management

### Token Hashing (FR-1)

Session tokens are hashed with **SHA-256** before storage. The raw token is
returned to the caller and set as a cookie; the database stores only the
SHA-256 hex digest in the `tokenHash` column (`token_hash` in the `sessions`
table). This means a database dump cannot be used to replay sessions — the
raw plaintext token never touches the database.

The hashing is performed by the internal `sha256Hex` helper in `session.ts`.
All session lookups (`validateSession`, `deleteSession`) hash the incoming
token before querying, so the raw token is never compared against stored
data.

### Revoking All Sessions (FR-7a)

`revokeAllUserSessions(db, userId)` deletes every active session for a
given user. It is exported for use by:

- **Admin password reset** — when a teacher or admin resets a target
  student's password via the reset-password route, all prior sessions are
  revoked so the old cookie is no longer valid.
- **DSAR account closure** — when processing a data subject access request
  that results in account deletion, revoking sessions ensures immediate
  logout.

### Session Cap (FR-10)

Each user is limited to a maximum of **10 active sessions**. When an 11th
session is created, the oldest session (by `createdAt`) is evicted
automatically. This prevents unbounded session accumulation for accounts
that log in from many devices without explicitly logging out.
