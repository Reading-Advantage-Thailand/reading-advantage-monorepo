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

## Rate Limiting

The login endpoint applies two independent rate-limit buckets so that a
single attacker cannot bypass the limit by spreading attempts across
identifiers. Both buckets are backed by Postgres in production so the
limits apply consistently across replicas.

| Bucket | Window | Max attempts | Purpose |
|--------|--------|--------------|---------|
| Per-username | 15 min | 5 | Per-username rate limit — blocks brute-force on a single account |
| Per-IP (client IP address) | 15 min | 30 | Per-IP rate limit — blocks brute-force from a single network |

A bucket is considered "triggered" once it accumulates `5` (or `30`)
failures. Failed-attempt counters reset automatically on a successful
login via `resetLimit(username, ip)`.

### Production Default (Postgres)

The Postgres-backed `login_attempts` table is the production default.
Rate-limit state is durable across process restarts and shared between
all server replicas — a user blocked on one instance cannot retry on
another. Configure the auth package once at startup with:

```ts
import { configurePostgresRateLimiter } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";

configurePostgresRateLimiter(db);
```

### Dev-only In-Memory Fast-Path

For local development you can opt into a process-local `Map` instead of
Postgres. The fast-path is **dual-gated** to prevent accidental
production use: BOTH `NODE_ENV=development` AND
`RATE_LIMIT_INMEMORY_FASTPATH=true` must be set on the same line below
(`RATE_LIMIT_INMEMORY_FASTPATH=true only active in development`).

```bash
# .env.local — opt into the in-memory dev fast-path (NODE_ENV=development required)
RATE_LIMIT_INMEMORY_FASTPATH=true   # only active in development; ignored in production
```

Never set `RATE_LIMIT_INMEMORY_FASTPATH=true` in production. The flag
exists to speed up local iteration only; in production a process-local
rate-limit state would let attackers bypass the limit by retrying across
instances.

### Captcha Trigger

Once either bucket accumulates **3** failed attempts within the active
window, the rate-limit check signals `captchaRequired: true`. The login
route surfaces this in the response so the UI can prompt the user to
complete a captcha before retrying. Successful login (`resetLimit`)
clears the captcha counter alongside the rate-limit counter.

Captcha **verification** (e.g., reCAPTCHA / hCaptcha / Turnstile) is a
follow-up track. This package only emits the trigger flag — the caller
decides how to enforce it.

### Client IP / Proxy Trust

The login route extracts the client IP from `X-Forwarded-For` and
`X-Real-IP` for per-IP rate limiting. By default it uses the leftmost
XFF entry for backward compatibility, which is safe only when the app
sits directly on the internet or a single trusted proxy always replaces
the header.

For deployments behind multiple reverse proxies, set
`TRUST_PROXY_COUNT` to the number of proxies between the internet and
the application. The rightmost N XFF entries are then treated as trusted
proxies and skipped, so an attacker cannot prepend arbitrary IPs to
bypass the per-IP limit or poison another client's bucket.

| Env var | Default | Description |
|---------|---------|-------------|
| `TRUST_PROXY_COUNT` | unset | Number of trusted reverse proxies. Unset = legacy leftmost-XFF behavior. |

Example for a Cloudflare → Vercel chain (two proxies):

```bash
TRUST_PROXY_COUNT=2
```

### API Reference

```ts
import {
  checkRateLimit,
  checkRateLimitByIp,
  recordFailure,
  resetLimit,
  cleanupOldAttempts,
  createRateLimitCleanupJob,
} from "@reading-advantage/auth";

// Check before attempting authentication (both username + IP buckets).
const { allowed, retriesAfter, captchaRequired } = await checkRateLimit(
  username,
  clientIp,
);
if (!allowed) {
  // Return 429 with Retry-After header set to `retriesAfter` (seconds).
}

// Check only the IP bucket (e.g., IP-level middleware).
const ipCheck = await checkRateLimitByIp(clientIp);
if (!ipCheck.allowed) {
  // Block the IP before looking up a username.
}

// Record a failed attempt (both buckets increment).
await recordFailure(username, clientIp);

// Clear on successful login.
await resetLimit(username, clientIp);

// Periodic cleanup of stale rows (>24h old).
const job = createRateLimitCleanupJob({ intervalMs: 60 * 60 * 1000 });
job.start();
```

`cleanupOldAttempts(conn, now?)` returns `{ deleted: number }` and
deletes `login_attempts` rows whose `window_start` is older than 24
hours in batches of 1000.
