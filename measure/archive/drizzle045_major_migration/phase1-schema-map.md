# Phase 1 — Schema-File & Migration-Script Map

> **Track:** `drizzle045_major_migration`
> **Phase:** 1 (Contract & Schema Definition)
> **Source of truth:** live filesystem under `packages/db/src/schema/`
> and `packages/db/drizzle/`.
> **Build-graph baseline:** `graph.db` mtime 2026-06-17 13:17,
> 2177 nodes / 3104 edges / 298 files.

This map is the deliverable for Phase 1 Task 2 of the
`drizzle045_major_migration` track. It enumerates every file in
`packages/db/src/schema/` (18 files including `marketing.ts`, `auth.ts`,
`primary.ts`, and `sales.ts`) and every migration SQL file in
`packages/db/drizzle/` (25 files: 0000 through 0024 inclusive), plus
the meta sidecars (`_journal.json`, per-idx `*_snapshot.json`) that
the journal-integrity invariant relies on. It also surfaces
`packages/db/src/client.ts` and `_journal.json` as Phase 3 risk
surfaces per `test-strategy.md` §3.3 and §3.6.

---

## 1. Schema files (18)

`packages/db/src/schema/` contains **18** TypeScript files. Every name
below is referenced in this artifact so the live-surface guardrail test
can verify the map is current.

| # | File | Lines | Tables / Enums | Role |
|---|------|-------|----------------|------|
| 1 | `analytics.ts` | 127 | analytics-side tables | Event/aggregation schema |
| 2 | `audit.ts` | 43 | audit events | Security audit log table |
| 3 | `auth.ts` | current | auth infrastructure tables such as `loginAttempts` | Shared auth/rate-limit schema |
| 4 | `classrooms.ts` | 58 | classrooms, classroom-students junction | Multi-tenant classroom model |
| 5 | `codecamp.ts` | 164 | codecamp tables (curriculum, repos, etc.) | CodeCamp Advantage app |
| 6 | `content.ts` | 86 | content (articles, lessons, modules) | Reading Advantage core content |
| 7 | `flashcards.ts` | 43 | flashcard decks + cards | Spaced-repetition schema |
| 8 | `index.ts` | current | barrel re-exporting schema files | Barrel |
| 9 | `licenses.ts` | 32 | license + license-tier tables | Subscription / licensing |
| 10 | `marketing.ts` | 106 | `campaigns`, `videoProjects`, `videoAssets`, `pastTopics`, `settings`, plus 6 `pgEnum` (`campaignTypeEnum`, `campaignStatusEnum`, `appEnum`, `assetTypeEnum`, `assetStatusEnum`, `videoProjectStatusEnum`) | Marketing video/campaign workflow |
| 11 | `primary.ts` | current | Primary Advantage migrated tables | Primary Advantage app |
| 12 | `progress.ts` | 97 | user progress records | Per-user lesson progress |
| 13 | `questions.ts` | 69 | question bank + answers | Quiz / assessment |
| 14 | `sales.ts` | current | Sales Advantage curriculum and roleplay tables | Sales Advantage app |
| 15 | `science.ts` | 385 | science-domain tables (largest schema file) | Science Advantage app |
| 16 | `stories.ts` | 189 | story-assignment tables | Storytime app |
| 17 | `taxonomy.ts` | 24 | taxonomy (subjects, topics) | Shared taxonomy |
| 18 | `users.ts` | 93 | `schools`, `users`, `accounts`, `sessions`, `usersRelations`, `accountsRelations`, `sessionsRelations`, `roleEnum` | Auth + tenancy primitives |

**Total schema lines:** 1,529.

### 1.1 marketing.ts (dirty-worktree addition)

`marketing.ts` is present on disk and is part of the schema surface.
Its tables and enums are re-exported from `packages/db/src/schema/index.ts`.

### 1.2 Barrel drift note

`packages/db/src/schema/index.ts` currently re-exports the current schema
surface, including marketing and newer app/auth schema files.

---

## 2. Migration SQL files (25)

`packages/db/drizzle/` contains **25** SQL migration files indexed
0000 through 0024 inclusive. Every index below is referenced in this
artifact so the migration-surface guardrail test can verify the map
covers the full set.

| # | Index | Filename | Size | Era | Notes |
|---|-------|----------|------|-----|-------|
| 0 | 0000 | `0000_wide_vengeance.sql` | 9,815 B | Pre-production ceiling | Initial schema |
| 1 | 0001 | `0001_thick_santa_claus.sql` | 6,861 B | Pre-production ceiling | Schema extension |
| 2 | 0002 | `0002_quick_skreet.sql` | 533 B | Pre-production ceiling | Small change (asserted by `migration-sql.test.ts`) |
| 3 | 0003 | `0003_slow_firebrand.sql` | 2,924 B | Pre-production ceiling | Re-stamped entry (old `when` 1746288000000 → new 1777880524315) |
| 4 | 0004 | `0004_sturdy_forge.sql` | 718 B | Pre-production ceiling | Small change |
| 5 | 0005 | `0005_codecamp_schema.sql` | 5,336 B | Pre-production ceiling | CodeCamp schema |
| 6 | 0006 | `0006_codecamp_indexes.sql` | 816 B | Pre-production ceiling | CodeCamp indexes |
| 7 | 0007 | `0007_codecamp_repos_reviews.sql` | 1,518 B | Pre-production ceiling | CodeCamp repos + reviews |
| 8 | 0008 | `0008_codecamp_phase.sql` | 197 B | Pre-production ceiling | CodeCamp phase |
| 9 | 0009 | `0009_add_github_username.sql` | 227 B | Pre-production ceiling | users.github_username |
| 10 | 0010 | `0010_codecamp_uniqueness.sql` | 497 B | Pre-production ceiling | CodeCamp uniqueness |
| 11 | 0011 | `0011_codecamp_webhook_events.sql` | 369 B | Pre-production ceiling | CodeCamp webhook events |
| 12 | 0012 | `0012_codecamp_intern_role.sql` | 52 B | Pre-production ceiling | roleEnum INTERN addition |
| 13 | 0013 | `0013_prisma_drizzle_schema_unification.sql` | 34,111 B | Pre-production ceiling | Largest migration (Prisma → Drizzle slice unification) |
| 14 | 0014 | `0014_users_license_expired_date.sql` | 367 B | Pre-production ceiling | users.license_id + expiredDate |
| 15 | 0015 | `0015_science_junction_tables.sql` | 1,767 B | Pre-production ceiling | 4 explicit science junctions (replaces Prisma implicit M:N) |
| 16 | 0016 | `0016_users_grade_level.sql` | 435 B | **Production ceiling** (`when: 1779120000000`) | users.grade_level |
| 17 | 0017 | `0017_science_school_id.sql` | 4,737 B | Post-production ceiling | science tables gain schoolId |
| 18 | 0018 | `0018_audit_events.sql` | 1,932 B | Post-production ceiling | audit_events table |
| 19 | 0019 | `0019_session_token_hash.sql` | 349 B | Post-production ceiling | sessions.tokenHash |
| 20 | 0020 | `0020_sessions_indexes.sql` | 146 B | Post-production ceiling | sessions indexes |
| 21 | 0021 | `0021_sales_advantage.sql` | current | Post-production ceiling | Sales Advantage and marketing campaign tables; adds Sales roles |
| 22 | 0022 | `0022_flowery_black_tarantula.sql` | current | Post-production ceiling | Reading/Primary legacy activity, flashcard, and subscription tables |
| 23 | 0023 | `0023_cultured_sunspot.sql` | current | Post-production ceiling | Allows nullable Sales roleplay `audio_storage_key` |
| 24 | 0024 | `0024_futuristic_vulture.sql` | current | Post-production ceiling | Durable login-attempt tracking for production rate limiter |

**Total migration SQL bytes:** current live surface across 25 files.

### 2.1 Re-stamp invariant

Per `packages/db/drizzle/MIGRATION_LEDGER.md` and
`packages/db/src/__tests__/journal-integrity.test.ts` (229 lines):

- `idx 0–16` MUST have `when <= 1779120000000` (production ceiling).
- `idx 17+` MUST have `when > 1779120000000`.
- The strict-`<` comparison in the migrator (`pg-core/dialect.js:62`)
  silently skips any entry whose `when` is `<=` the highest applied
  value, so monotonicity is required.

Phase 3 must preserve this invariant when re-running `drizzle-kit
generate`. If 0.45 changes the journal `version` field (currently
`"version": "7"`), the `journal-integrity.test.ts` assertion must be
updated to match the new value, but the **re-stamp invariant must
survive**.

### 2.2 Meta sidecars

`packages/db/drizzle/meta/` contains per-idx `*_snapshot.json` files
plus the journal. The contract test does NOT enumerate them (it only
asserts SQL file presence in `packages/db/drizzle/`), but Phase 3 must
not break them.

| File | Role |
|------|------|
| `_journal.json` | Migration journal (25 entries, see §3) |
| `0000_snapshot.json` … `0024_snapshot.json` | Per-migration schema snapshots |
| `README.md` | Drizzle-kit auto-generated readme |

---

## 3. Journal file (`_journal.json`)

`packages/db/drizzle/meta/_journal.json` is the **risk surface**
called out by `test-strategy.md` §3.3. Phase 3 must preserve the
re-stamp invariant (§2.1) and the `version: "7"` field, OR
`journal-integrity.test.ts` must be updated to accept the new version.

The journal's `entries[]` is 25 rows, indexed 0 through 24. Every
entry pairs a tag (matching the `*.sql` filename in `packages/db/drizzle/`)
with a `when` timestamp and a `breakpoints` flag.

---

## 4. Client construction risk surface

`packages/db/src/client.ts` is the **risk surface** called out by
`test-strategy.md` §3.6. It is the single point of failure for the
`drizzle(client, { schema })` factory call. The file is 29 lines and
exports `db`, `client`, and the `DB` type alias. The factory call is
on line 26:

```ts
export const db = drizzle(client, { schema });
```

If Drizzle 0.45 changes the factory signature, `client.ts` is the only
file Phase 3 must update. Build-graph confirms the call site is
isolated to this file (no other `drizzle(` import exists outside the
test fixtures in `packages/db/src/__tests__/`).

The `client.ts` file also wires `postgres(connectionString, options)`
from the `postgres` driver and pulls in `buildPostgresOptions` /
`normalizePostgresConnectionString` from `./connection-options.js`.
Phase 3 should re-run `connection-options.test.ts` after the bump to
verify the connection-pooling config still compiles.

---

## 5. Live-surface guardrail (asserted by contract test)

The Phase 1 contract test
(`packages/db/src/__tests__/drizzle045-phase1-contracts.test.ts`)
asserts:

1. `packages/db/src/schema/` contains every expected schema file
   (18 names, including `marketing.ts`, `auth.ts`, `primary.ts`, and `sales.ts`).
2. `packages/db/drizzle/` contains every expected migration SQL file
   (25 indices, 0000_ through 0024_).
3. This artifact mentions every schema file name above (proving the
   artifact was generated against the live surface, not a snapshot).
4. This artifact references every migration index (proving no
   migration is dropped from the audit).
5. This artifact mentions `client.ts` (§4 above) — Phase 3 risk surface.
6. This artifact mentions `_journal.json` (§3 above) — Phase 3 risk surface.

If the on-disk surface changes between Phase 1 and Phase 3, the
guardrail will fail and force Phase 3 to re-baseline the artifact.

---

## 6. Files NOT part of this map (Phase 1 out of scope)

| Path | Reason |
|------|--------|
| `packages/db/src/seed/` | Seed data (codecamp, curriculum, etc.) — Phase 3 verification, not Phase 1 surface |
| `packages/db/scripts/` | Doctor scripts (`migration-ledger-doctor.ts`, `sentinels.ts`) — Phase 3 verification |
| `packages/db/src/index.ts` | Package entry point, re-exports from `client.ts` and `schema/index.ts` |
| `packages/db/src/connection-options.ts` | Postgres connection-pooling config — Phase 3 verification via `connection-options.test.ts` |
| `packages/db/src/privileged.ts` | Privileged DB client (cross-tenant) — Phase 3 verification |
| `packages/db/src/shutdown.ts` | Connection-pool shutdown hook — Phase 3 verification |
| `packages/db/src/sentinels.ts` | Test-time sentinels — Phase 3 verification |

---

## 7. Provenance

- Schema file list: `ls packages/db/src/schema/` (18 files).
- Schema line counts: `wc -l packages/db/src/schema/*.ts`.
- Migration SQL list: `ls packages/db/drizzle/*.sql` (25 files).
- Migration SQL sizes: `ls -la packages/db/drizzle/`.
- Journal entries: `cat packages/db/drizzle/meta/_journal.json`.
- `client.ts` call site: `grep -n 'drizzle(' packages/db/src/client.ts` (line 26).
- Build-graph: `build-graph stats ./graph.db` (2177 nodes / 3104 edges / 298 files).
