# Phase 1 — Schema-File & Migration-Script Map

> **Track:** `drizzle045_major_migration`
> **Phase:** 1 (Contract & Schema Definition)
> **Current source:** committed files under `packages/db/src/schema/` and
> `packages/db/drizzle/`; size totals use the current filesystem.

This map records the current Phase 1 audit surface. The schema directory has
**27 TypeScript files**. The migration directory has **52 SQL files**, indexed
from `0000` through `0051`. The journal has **52 entries**, indexed from 0
through 51. The current meta snapshot set has **24 snapshot files**.

The Phase 1 contract and adversarial tests are historical tests for this
archived track. Their fixed expectations predate the current 27-file and
52-migration surface. This document records the current committed surface.

---

## 1. Schema files (27)

`packages/db/src/schema/` contains **27** committed TypeScript files. The
table lists every file and its filesystem line count.

| # | File | Lines | Current role |
|---:|---|---:|---|
| 1 | `activity.ts` | 147 | Activity sessions, tutorials, and reporting |
| 2 | `analytics.ts` | 217 | Analytics and event aggregation |
| 3 | `audit.ts` | 43 | Security audit events |
| 4 | `auth.ts` | 25 | Authentication and login-attempt support |
| 5 | `capability-idempotency.ts` | 63 | Capability idempotency records |
| 6 | `classrooms.ts` | 60 | Classrooms and classroom membership |
| 7 | `codecamp.ts` | 360 | CodeCamp curriculum, repositories, reviews, and exercises |
| 8 | `company-product-principals.ts` | 54 | Company and product principals |
| 9 | `content.ts` | 94 | Reading content, lessons, and modules |
| 10 | `finance-operations.ts` | 177 | Finance and operations records |
| 11 | `flashcards.ts` | 45 | Flashcard decks and cards |
| 12 | `index.ts` | 25 | Schema barrel exports |
| 13 | `licenses.ts` | 43 | Licenses and license tiers |
| 14 | `marketing-constants.ts` | 11 | Marketing schema constants |
| 15 | `marketing.ts` | 121 | Marketing campaigns, assets, and video projects |
| 16 | `mastery.ts` | 438 | Mastery learning records; **largest schema file** |
| 17 | `primary.ts` | 232 | Primary Advantage schema |
| 18 | `progress.ts` | 106 | User lesson progress |
| 19 | `questions.ts` | 69 | Questions and answers |
| 20 | `sales.ts` | 183 | Sales Advantage curriculum and roleplay |
| 21 | `science.ts` | 385 | Science Advantage schema |
| 22 | `standard-pack-successor-admission-receipts.ts` | 91 | Standard-pack successor admission receipts |
| 23 | `standard-pack-successor-commitments.ts` | 97 | Standard-pack successor commitments |
| 24 | `stories.ts` | 189 | Story assignments |
| 25 | `taxonomy.ts` | 24 | Subjects and topics |
| 26 | `users.ts` | 108 | Schools, users, accounts, sessions, and roles |
| 27 | `workbooks.ts` | 107 | Workbook publishing |

**Total schema lines:** **3,514**.

`mastery.ts` is the largest current schema file at **438 lines**. The schema
barrel in `packages/db/src/schema/index.ts` re-exports the current application
schema, including `marketing.ts`, `mastery.ts`, and the newer operational files.

---

## 2. Migration SQL files (52)

`packages/db/drizzle/` contains **52** SQL migration files. The table records
the filename, filesystem byte size, and matching journal `when` value.

| # | Index | Filename | Size | Journal `when` |
|---:|---|---|---:|---:|
| 0 | 0000 | `0000_wide_vengeance.sql` | 9,892 B | 1777693836597 |
| 1 | 0001 | `0001_thick_santa_claus.sql` | 6,945 B | 1777706107275 |
| 2 | 0002 | `0002_quick_skreet.sql` | 533 B | 1777729846648 |
| 3 | 0003 | `0003_slow_firebrand.sql` | 3,849 B | 1777880524315 |
| 4 | 0004 | `0004_sturdy_forge.sql` | 818 B | 1778031201982 |
| 5 | 0005 | `0005_codecamp_schema.sql` | 5,811 B | 1778181879649 |
| 6 | 0006 | `0006_codecamp_indexes.sql` | 960 B | 1778332557316 |
| 7 | 0007 | `0007_codecamp_repos_reviews.sql` | 1,668 B | 1778483234983 |
| 8 | 0008 | `0008_codecamp_phase.sql` | 197 B | 1778633912650 |
| 9 | 0009 | `0009_add_github_username.sql` | 251 B | 1778784590315 |
| 10 | 0010 | `0010_codecamp_uniqueness.sql` | 520 B | 1779075476967 |
| 11 | 0011 | `0011_codecamp_webhook_events.sql` | 475 B | 1779077988484 |
| 12 | 0012 | `0012_codecamp_intern_role.sql` | 154 B | 1779080500000 |
| 13 | 0013 | `0013_prisma_drizzle_schema_unification.sql` | 39,161 B | 1779090375000 |
| 14 | 0014 | `0014_users_license_expired_date.sql` | 391 B | 1779100250000 |
| 15 | 0015 | `0015_science_junction_tables.sql` | 1,867 B | 1779110125000 |
| 16 | 0016 | `0016_users_grade_level.sql` | 435 B | 1779120000000 |
| 17 | 0017 | `0017_science_school_id.sql` | 5,587 B | 1779120001000 |
| 18 | 0018 | `0018_audit_events.sql` | 2,107 B | 1779120002000 |
| 19 | 0019 | `0019_session_token_hash.sql` | 571 B | 1779120003000 |
| 20 | 0020 | `0020_sessions_indexes.sql` | 170 B | 1779120004000 |
| 21 | 0021 | `0021_sales_advantage.sql` | 9,547 B | 1782131020389 |
| 22 | 0022 | `0022_flowery_black_tarantula.sql` | 8,456 B | 1782208439534 |
| 23 | 0023 | `0023_cultured_sunspot.sql` | 85 B | 1782299938361 |
| 24 | 0024 | `0024_futuristic_vulture.sql` | 652 B | 1782627369208 |
| 25 | 0025 | `0025_review_jobs.sql` | 1,580 B | 1782700000000 |
| 26 | 0026 | `0026_game_completions.sql` | 2,937 B | 1782700000001 |
| 27 | 0027 | `0027_mastery_persistence.sql` | 10,516 B | 1782700000002 |
| 28 | 0028 | `0028_mastery_tenant_hardening.sql` | 6,229 B | 1783689951727 |
| 29 | 0029 | `0029_activity_sessions.sql` | 7,474 B | 1783750000000 |
| 30 | 0030 | `0030_activity_tutorial_reporting.sql` | 2,150 B | 1783755000000 |
| 31 | 0031 | `0031_tutorial_claim_fencing.sql` | 1,177 B | 1783758000000 |
| 32 | 0032 | `0032_tutorial_snapshot_submission_binding.sql` | 790 B | 1783760000000 |
| 33 | 0033 | `0033_codecamp_curriculum_assignments.sql` | 412 B | 1783762000000 |
| 34 | 0034 | `0034_codecamp_pr_rubric_evaluation.sql` | 93 B | 1783764000000 |
| 35 | 0035 | `0035_activity_tutorial_capture_leases.sql` | 610 B | 1783766000000 |
| 36 | 0036 | `0036_codecamp_mastery_evidence.sql` | 7,033 B | 1783817114207 |
| 37 | 0037 | `0037_sales_roleplay_attempt_number_unique.sql` | 550 B | 1784361600000 |
| 38 | 0038 | `0038_capability_idempotency_records.sql` | 1,761 B | 1784365200000 |
| 39 | 0039 | `0039_sales_progress_activity_timestamp.sql` | 87 B | 1784368800000 |
| 40 | 0040 | `0040_company_product_principals.sql` | 1,206 B | 1784372400000 |
| 41 | 0041 | `0041_marketing_past_topic_normalized_key.sql` | 1,641 B | 1784389963563 |
| 42 | 0042 | `0042_company_product_principal_local_unique.sql` | 7,717 B | 1784392115850 |
| 43 | 0043 | `0043_codecamp_company_principal_sync.sql` | 4,323 B | 1784446059725 |
| 44 | 0044 | `0044_standard_pack_successor_commitments.sql` | 7,572 B | 1785424051922 |
| 45 | 0045 | `0045_standard_pack_successor_admission_receipts.sql` | 6,433 B | 1785429127726 |
| 46 | 0046 | `0046_standard_pack_successor_admission_receipt_integrity.sql` | 12,909 B | 1785432407419 |
| 47 | 0047 | `0047_fluffy_joshua_kane.sql` | 1,149 B | 1785580312598 |
| 48 | 0048 | `0048_workbook_publishing.sql` | 2,877 B | 1785672462951 |
| 49 | 0049 | `0049_codecamp_exercise_quiz_repair.sql` | 12,215 B | 1785758864000 |
| 50 | 0050 | `0050_finance_operations_records.sql` | 7,232 B | 1785758865000 |
| 51 | 0051 | `0051_marketing_phase7_audit_and_script.sql` | 1,451 B | 1786537947030 |

**Total SQL bytes:** **211,226** across the 52 current migration files.

---

## 3. Migration journal (`_journal.json`)

`packages/db/drizzle/meta/_journal.json` contains **52 entries**, with `idx`
values 0 through 51. The first tag is `0000_wide_vengeance`; the last tag is
`0051_marketing_phase7_audit_and_script`. The journal uses version `"7"` and
the `postgresql` dialect.

Each journal entry has a matching SQL file in section 2. The table in section
2 records all 52 tags through their filenames and all 52 journal timestamps.

### 3.1 Re-stamp invariant

The committed journal preserves the migration ordering invariant:

- Entries 0–16 have `when <= 1779120000000`.
- Entries 17–51 have `when > 1779120000000`.
- Journal timestamps increase with `idx`.

This invariant is historical migration context that Phase 3 must preserve when
changing Drizzle versions. The strict-`<` migrator comparison can skip entries
whose `when` value is not above the highest applied value.

---

## 4. Current meta snapshot set (24)

`packages/db/drizzle/meta/` currently contains `_journal.json` and these **24**
snapshot files:

| # | Snapshot |
|---:|---|
| 1 | `0000_snapshot.json` |
| 2 | `0001_snapshot.json` |
| 3 | `0002_snapshot.json` |
| 4 | `0009_snapshot.json` |
| 5 | `0020_snapshot.json` |
| 6 | `0021_snapshot.json` |
| 7 | `0022_snapshot.json` |
| 8 | `0023_snapshot.json` |
| 9 | `0024_snapshot.json` |
| 10 | `0025_snapshot.json` |
| 11 | `0026_snapshot.json` |
| 12 | `0027_snapshot.json` |
| 13 | `0028_snapshot.json` |
| 14 | `0041_snapshot.json` |
| 15 | `0042_snapshot.json` |
| 16 | `0043_snapshot.json` |
| 17 | `0044_snapshot.json` |
| 18 | `0045_snapshot.json` |
| 19 | `0046_snapshot.json` |
| 20 | `0047_snapshot.json` |
| 21 | `0048_snapshot.json` |
| 22 | `0049_snapshot.json` |
| 23 | `0050_snapshot.json` |
| 24 | `0051_snapshot.json` |

The snapshot set is sparse. Snapshot presence does not change the 52-file SQL
migration count or the 52-entry journal count.

---

## 5. Client construction risk surface

`packages/db/src/client.ts` remains the Drizzle factory risk surface. It
exports `db`, `client`, and the `DB` type alias. The factory call is:

```ts
export const db = drizzle(client, { schema });
```

Phase 3 must re-check this call if Drizzle 0.45 changes the factory signature.
The file also wires the `postgres` driver and the connection-option helpers.

The journal risk surface is `packages/db/drizzle/meta/_journal.json`, described
in section 3. Phase 3 must preserve its version, tags, timestamps, and ordering.

---

## 6. Historical context (not current counts)

The earlier Phase 1 artifact recorded an older surface: **18 schema files** and
**26 migration SQL files**. Those counts are superseded by the current 27-file
and 52-file surfaces in sections 1 and 2.

The earlier artifact described `marketing.ts` as a dirty-worktree addition and
described `science.ts` as the largest file at 385 lines. Both statements belong
to that earlier baseline. `marketing.ts` is now committed, and `mastery.ts` is
now the largest file at 438 lines.

The earlier contract used fixed file lists. The current map instead records the
committed filesystem and journal surface requested for this refresh.

---

## 7. Provenance

- Schema file list: `git ls-tree -r --name-only HEAD -- packages/db/src/schema`.
- Schema line counts: `wc -l packages/db/src/schema/*.ts`.
- Schema total: **3,514 lines** from the current filesystem.
- Migration SQL list: `git ls-tree -r --name-only HEAD -- packages/db/drizzle`.
- Migration SQL sizes and total: `wc -c packages/db/drizzle/*.sql`.
- SQL total: **211,226 bytes** from the current filesystem.
- Journal entries and tags: `packages/db/drizzle/meta/_journal.json`.
- Snapshot set: `packages/db/drizzle/meta/*_snapshot.json`.
- Client factory risk surface: `packages/db/src/client.ts`.
