# Codecamp Migration Evidence — 2026-07-19

## Applied change and source identity

- **Migration implementation:** `507ca16f` (`feat(codecamp): migrate accounts
  into company SSO`).
- **Applied migration SHA:** `0043_codecamp_company_principal_sync`; required
  function: `public.sync_codecamp_company_principal(uuid,text,uuid,text,text)`.
- **Source database:** authoritative Codecamp product database, checked by the
  preflight for expected database identity, schema, ledger, account count, and
  deterministic fingerprint before apply.
- **Source-DB fingerprint:** the apply manifest carried a 64-character
  lowercase SHA-256 fingerprint and the apply was accepted only when it
  matched the dry-run fingerprint. The raw fingerprint is intentionally not
  duplicated in this repository because the production connection evidence is
  secret-bearing; the immutable evidence anchor is the apply commit above and
  the rollout receipt in [`production-rollout-20260718.md`](./production-rollout-20260718.md).

## Migrated principals

Five legacy principals were migrated one-for-one. Pseudonyms are used here;
the operator manifest retains the real identifiers.

| Principal | Disposition | Product ownership |
|---|---|---|
| `codecamp-admin-01` | compatible credential, Codecamp `ADMIN` | preserved |
| `codecamp-intern-01` | compatible credential, Codecamp `INTERN` | preserved |
| `codecamp-intern-02` | compatible credential, Codecamp `INTERN` | preserved |
| `codecamp-intern-03` | compatible credential, Codecamp `INTERN` | preserved |
| `codecamp-intern-04` | compatible credential, Codecamp `INTERN` | preserved |

The result was five company identities, five stable local Codecamp principal
mappings, exact supported credential hashes, and immutable migration audit
rows. No product rows were copied or reassigned.

## Preservation and audit counts

The production comparison preserved **155 progress rows, 24 reviews, and 3
chats**. Product ownership and local user IDs remained unchanged. The migration
also emitted one immutable audit row per migrated principal: **5 migration audit
rows**. The audit table rejects update/delete/truncate for the runtime role.

## Idempotency proof

Apply used the migration idempotency key, serializable transaction, and advisory
lock. A replay of the same manifest returned the existing mappings without
creating duplicate company identities, local principals, roles, product rows,
or audit rows. A changed source fingerprint is rejected before writes; resume
and rollback paths do not delete source accounts.

## Rehearse versus apply

| Check | Rehearsal | Production apply | Result |
|---|---|---|---|
| Source fingerprint | captured and approved | matched the approved fingerprint | pass |
| Accounts / mappings | 5 / 5 | 5 / 5 | pass |
| Role disposition | explicit `ADMIN`/`INTERN` mapping | same mapping | pass |
| Product ownership | 155 progress, 24 reviews, 3 chats | unchanged | pass |
| Audit output | secret-safe migration events | immutable migration rows | pass |
| Replay | no-op deterministic rerun | no duplicate writes | pass |

The rehearsal and apply comparison is recorded in the production rollout and
the migration engine tests; the remaining S7 blocker is application deployment,
not identity-data migration.
