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
