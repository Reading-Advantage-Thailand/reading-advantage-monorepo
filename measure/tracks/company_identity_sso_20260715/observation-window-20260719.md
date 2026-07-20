# S7 Observation Window — Draft Acceptance Contract

**Status: `draft-publish: signoff_pending`**

This contract carries forward the Phase S7 Task 42 rollout gates. It is an
acceptance definition, not evidence that the window has completed. The window
starts only after Codecamp is promoted and the operator records its start and
end timestamps.

## Acceptance window

Observe Accounts, Marketing, Sales, and Codecamp for 30 consecutive minutes
after the final traffic shift, with a two-hour log lookback for rollback
triage. Record request totals, auth outcomes, authorization outcomes, mapping
probes, p50/p95/p99 latency, severity ERROR logs, and the serving revision.

## Trigger thresholds

Rollback immediately to the verified revision if any threshold is met:

| Signal | Trigger |
|---|---|
| Authentication error | `>=2%` of auth attempts in any rolling 5-minute window, or `>=5` consecutive failed migrated-principal logins |
| Authorization error | Any confirmed cross-app privilege grant, or `>=1%` of authorized requests returning unexpected `401/403` in a rolling 5-minute window |
| Mapping mismatch | Any migrated principal resolving to the wrong company account, local principal, app role, or product owner; zero tolerance |
| Latency | p95 auth/callback latency `>1000 ms` for two consecutive 5-minute windows, or p99 `>2000 ms` in any 5-minute window |

Any severity-ERROR entry tied to the promoted revision is investigated before
acceptance; a security, data-ownership, or repeated 5xx error is a rollback
trigger even when the percentage threshold is not reached.

## Exit and rollback evidence

Acceptance requires zero mapping mismatches, no unresolved auth or product
ownership failures, thresholds below trigger for the full window, clean
revision-scoped error logs, successful role-isolation probes, and an operator
signoff naming the observed revisions. Rollback changes Cloud Run traffic to the
captured immutable anchor; it does not mutate a serving revision or delete
backup evidence. Legacy-auth retirement remains a separate explicit approval
after this signoff.

The Codecamp candidate cannot start this window until the
`roles/secretmanager.secretAccessor` grants documented in
[`secret-inventory-20260719.md`](./secret-inventory-20260719.md) are applied.
