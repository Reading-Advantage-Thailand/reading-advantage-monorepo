# Dragon Flight Expiry-Recovery Foundation — 2026-08-02

## Scope

This record covers only the transport-independent Dragon Flight signed-attempt
recovery/finalization foundation: tenant binding, signed identity binding,
canonical completion reconciliation, durable claim recovery, and the bounded
Reading/Primary completion-route error mapping. It does not accept a catalog,
asset pack, title cutover, retirement, cohort, production deployment, or any
claim beyond server-observed checkpoint ordering/timing.

## Corrective result

An interrupted completion can now recover after the ten-minute credential TTL
only when an exact durable pending claim already exists. The expired branch
still validates the signed actor, tenant, attempt identity, idempotency key,
and complete checkpoint chain. It performs a non-mutating exact recovery
lookup, never begins or reclaims a claim, and never invokes generic completion
persistence. It rereads and verifies the canonical completion before
conditionally finalizing the pre-existing claim. Missing, divergent,
abandoned, or mismatched state rejects with safe expired-credential wording.

The canonical facts must match the replayed transcript and the existing
server-side XP formula. Accuracy alone uses a bounded `PostgreSQL REAL`
precision comparison; score, counts, duration, victory, XP, actor, tenant,
attempt, transcript digest, and expiry remain exact.

## Verification

- `CI=true pnpm --filter @reading-advantage/domain exec vitest run src/__tests__/dragon-flight-host-proof-attempt-adapter.test.ts src/__tests__/dragon-flight-host-proof-attempt.test.ts src/__tests__/dragon-flight-host-proof-store.test.ts` — 3 files, 39 tests passed.
- `CI=true PG_TEST_URL=<approved-local-admin-endpoint> pnpm --filter @reading-advantage/domain exec vitest run src/__tests__/dragon-flight-host-proof-recovery.real-db.test.ts --reporter=dot` — 1 test passed against a randomized disposable PostgreSQL database. It migrated and seeded the scratch database, left a real pending attempt after the generic completion/XP transaction, ran two concurrent retries after TTL, then proved exactly one `game_completions` row, one `xp_logs` row, and one completed immutable attempt result.
- `pnpm --filter @reading-advantage/domain exec tsc -p tsconfig.json --noEmit` — passed.
- Scoped ESLint over the Dragon Flight attempt/store/adapter implementation and focused tests — passed.
- `CI=true pnpm --filter reading-advantage test -- __tests__/api/host-proof-games-completions.test.ts` — 12 tests passed, including an expired canonical-recovery rejection mapped to the safe 400/no-leak response.
- `CI=true pnpm --filter primary-advantage exec vitest run lib/__tests__/api/host-proof-games-completions.test.ts --reporter=verbose` — 13 tests passed, including the equivalent safe 400/no-leak response.

Terra phase acceptance and independent Sol technical acceptance both accepted
this bounded recovery/finalization slice after the focused and real-database
evidence above.

## Explicit non-acceptance

This is not Task 5 acceptance or track closure. The active plan still requires
the wider Dragon Flight runtime/host evidence, independent review and explicit
product-owner authorization, a green Reading-wide TypeScript baseline or a
separately authorized remediation, manual local verification, and all
remaining cutover, retirement, cohort, and production gates. The quarantined
24-title candidate and its historical reports remain non-consumable.
