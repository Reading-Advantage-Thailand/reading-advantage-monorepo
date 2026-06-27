# Line Review Evidence: marketing-app-007

Reviewer: coder-minimax-m3/marketing-app-007
Files assigned: 1
Lines assigned: 106
Batch manifest: `measure/tracks/marketing_app_review_20260626/line-review/batch-manifest.json`
File inventory: `measure/tracks/marketing_app_review_20260626/line-review/file-inventory.tsv`

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `packages/db/src/schema/marketing.ts` | 1-106 | reviewed | 7 |

## Findings

### LR-007-001 — `pastTopics` table has no unique constraint on `(app, topic)`

- Severity: Medium
- Category: persistence
- File: `packages/db/src/schema/marketing.ts:71-78`
- Evidence: The `pastTopics` table (lines 71-78) declares only a single-column index `past_topics_app_idx` on `app` (line 77). No unique index or unique constraint covers the `(app, topic)` pair. Confirmed against the generated SQL at `packages/db/drizzle/0021_sales_advantage.sql:22-27` and `0021_sales_advantage.sql:166` (only `past_topics_app_idx` exists; no `UNIQUE("app","topic")`). The dedup contract lives in `apps/marketing/app/lib/topic-dedup.ts:9-23` (`deduplicateTopics`) and is invoked by the route `apps/marketing/app/api/video/save-topics/route.ts:11-24`, but the in-memory normalization is not enforced at the DB level.
- Impact: Two concurrent `POST /api/video/save-topics` requests for the same `(app, topic)` can each race past the in-memory `Set` and persist duplicate rows. The migration `0021_sales_advantage.sql` was generated from this Drizzle definition, so the gap is the schema's, not the migration's. The intent of the table — "topics we have already used" — is therefore not a hard guarantee.
- Recommendation: Add a unique index/constraint `UNIQUE(app, topic)` (lowercased via the same `normalizeTopic` rule, or store a normalized `topic_key` column) in a follow-up migration; expose the constraint in Drizzle via `uniqueIndex("past_topics_app_topic_unique").on(table.app, table.topic)`.

### LR-007-002 — `videoProjects` table is missing an `updatedAt` column

- Severity: Low
- Category: persistence
- File: `packages/db/src/schema/marketing.ts:39-50`
- Evidence: The `videoProjects` pgTable declaration (lines 39-50) declares only `createdAt` (line 47). There is no `updatedAt` column, and no Drizzle `.onUpdateNow()` extension. The sibling `campaigns` table (lines 24-35) does declare `updatedAt: timestamp("updated_at").defaultNow().notNull()` (line 31), so the absence on `videoProjects` is intentional or an oversight, but it is asymmetric with the parent table. The current `app/api/video/projects/route.ts:25-32` is `POST`-only, but `app/campaigns/[id]/video/page.tsx:172-196` (`handleSaveScript`) and `app/lib/scene-editor.ts` (`addScene`, `removeScene`, `reorderScenes`) clearly anticipate in-place edits.
- Impact: When the future PATCH/PUT path is added, there is no place to record the last-saved timestamp. Stale projects (saved once, edited many times in the browser) cannot be ordered or surfaced. Audit and "last-modified" UX cannot be implemented without a schema change.
- Recommendation: Add `updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date())` to `videoProjects`, paired with a Drizzle migration that also backfills existing rows from `created_at`.

### LR-007-003 — `videoAssets` table is missing an `updatedAt` column

- Severity: Low
- Category: persistence
- File: `packages/db/src/schema/marketing.ts:54-67`
- Evidence: `videoAssets` (lines 54-67) declares `createdAt` (line 64) only. The `assetStatusEnum` (line 19) defines a four-state lifecycle — `pending`, `generated`, `approved`, `rejected` — which strongly implies a state-transition workflow with audit. There is no `updatedAt` column to record when a status moved (e.g., pending → generated, or generated → approved). The relation `videoAssetsRelations` (lines 101-106) does not help, and the `app/api/video/save-topics/route.ts` and the campaign routes do not currently touch assets; no PATCH is defined for assets.
- Impact: Operators cannot answer "when was this asset approved?" or "how long did generation take?" without inspecting external logs. A "stale pending" cleanup job has no schema-level signal.
- Recommendation: Mirror the recommendation for `videoProjects` — add `updatedAt` with `$onUpdate`, and consider also `approvedAt` / `generatedAt` as discrete timestamps because the asset lifecycle is multi-stage.

### LR-007-004 — `settings.value` carries an "encrypted at rest" comment but the schema carries no enforcement and no sensitivity marker

- Severity: Medium
- Category: persistence
- File: `packages/db/src/schema/marketing.ts:82-85`
- Evidence: The `settings` table (lines 82-85) declares `value: text("value").notNull()` with a single-line comment `// encrypted at rest` (line 84). The comment is a runtime promise, not a schema artifact: the column is plain `text`, and the encryption policy is implemented entirely in `apps/marketing/app/lib/encryption.ts:23-37` (`encrypt`) and `apps/marketing/app/api/settings/route.ts:6-10, 35-46` (regex-based `isSecretKey` check + per-key `encrypt(value)` on write, `decrypt(value)` on read). There is no `isSecret` boolean column, no separate `encrypted_value` + `plaintext_value` pair, and no DB role separation. The SQL at `packages/db/drizzle/0021_sales_advantage.sql:29-32` confirms there is no check constraint or marker.
- Impact: Any code path that bypasses the route handler (a future worker, an admin tool, a `tenantDb.unscoped("marketing settings")` direct read, or a manual psql session) returns ciphertext for sensitive keys and plaintext for non-sensitive ones — which is fine for confidentiality, but the type of a given `key` is not discoverable from the schema. The "encrypted at rest" promise is a route-layer invariant, not a schema invariant, and is not asserted in CI.
- Recommendation: Either (a) split into `settings(key, value_plain, value_encrypted, is_secret)` and let a single repository function decide, or (b) add a `check (key not like '%apikey%' or value ~ '^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$')` constraint to assert ciphertext shape, plus a migration to a typed `bytea` column for ciphertext. Also document the secret-key regex in a single source of truth (currently duplicated only in `app/api/settings/route.ts:6`).

### LR-007-005 — `videoProjects.script` is unconstrained `jsonb`; integrity relies entirely on route-layer `scriptSchema`

- Severity: Medium
- Category: persistence
- File: `packages/db/src/schema/marketing.ts:45`
- Evidence: The `script` column is declared as `jsonb("script")` (line 45) with no `.notNull()`, no `.default(...)`, no `.$type<ScriptScene[]>()`, and no Drizzle CHECK constraint. The application-level shape is defined in `apps/marketing/app/lib/script-schema.ts:1-61` (`ScriptScene` with `narration`, `imagePrompt`, `motionDirection`; `MIN_SCENES=5`, `MAX_SCENES=7`) and is invoked by `apps/marketing/app/api/video/projects/route.ts:14-23` (`scriptSchema.safeParse(body.script)`) before insert. The Drizzle definition does not pin the type, so the column accepts `null`, any object, or any array of arbitrary length.
- Impact: The route handler is the only enforcement point. A future worker, a migration seed, an admin route, or a manual psql update can persist malformed scripts (`null`, `{}`, `[{ "foo": 1 }]`, or a 1000-scene array). Reading the row in the scene editor (`app/campaigns/[id]/video/page.tsx`) will then crash or render an empty editor without a clear cause. The schema offers no defense in depth for the AI-generated artifact that the whole module is built around.
- Recommendation: Add `.$type<ScriptScene[]>().notNull()` (or split into `script` typed and `script_draft` untyped) and consider a Postgres CHECK constraint that the jsonb is an array of length 5-7 with the three string fields. Update the `safeParse` callsite to align the column type with the schema.

### LR-007-006 — `appEnum` hardcodes the app catalog; no shared source of truth

- Severity: Low
- Category: persistence
- File: `packages/db/src/schema/marketing.ts:8-17`
- Evidence: The `app` enum lists eight apps (lines 8-17): `reading-advantage`, `primary-advantage`, `storytime`, `math-advantage`, `science-advantage`, `stem-advantage`, `zhongwen-advantage`, `tutor-advantage`. The same list is duplicated in the client at `apps/marketing/app/campaigns/[id]/video/page.tsx:19-28` (`appNames` mapping). The actual app set under `apps/` is broader — `apps/` also contains `codecamp-advantage`, `sales-advantage`, `marketing`, `advantage-games`, and `www-reading-advantage` (none of which appear in the enum). The migration `0021_sales_advantage.sql:1` makes the same hardcoded list canonical at the DB level.
- Impact: Adding a new Advantage app to the catalog requires (a) a Drizzle migration to add the enum value, (b) an update to the client-side `appNames` map, and (c) coordination between the schema, the client, and any analytics downstream. There is no test asserting the enum matches the app catalog. Drift is undetectable from this file alone.
- Recommendation: Extract a single `APPS` tuple in `packages/db/src/schema/_apps.ts`, derive both the Drizzle enum and the client `appNames` map from it, and add a vitest check that the schema's enum values equal the constant.

### LR-007-007 — Marketing tables lack per-row owner/audit attribution

- Severity: Low
- Category: auth-api
- File: `packages/db/src/schema/marketing.ts:24-106`
- Evidence: None of the five tables — `campaigns` (lines 24-35), `videoProjects` (lines 39-50), `videoAssets` (lines 54-67), `pastTopics` (lines 71-78), `settings` (lines 82-85) — declare `createdBy`, `updatedBy`, or any user-FK column. The `settings` table is the most exposed: it stores the global LLM API key (read by `app/api/video/research-topics/route.ts:13-22` and `app/api/video/generate-script/route.ts:13-22`) but does not record who set it. The intentional single-tenant/global design is documented at `packages/domain/src/tenant-registry.ts:233-239`, so `schoolId` is correctly absent, but no per-user attribution is substituted.
- Impact: Audit questions such as "which user set the LLM key in production?" or "which user archived this campaign?" must be answered by correlating external logs (e.g., `audit_events` migration 0018, if it is wired to marketing) instead of by reading the row itself. There is no DB-level signal to revoke a user's actions against marketing data.
- Recommendation: Add `createdBy uuid`/`updatedBy uuid` (FK to `users.id`) to `campaigns`, `videoProjects`, and `settings` at minimum, paired with a Drizzle migration. Leave the tables' REFERENTIAL classification in `tenant-registry.ts` unchanged — attribution is orthogonal to multi-tenant scoping.

## No-Finding Notes

- `packages/db/src/schema/marketing.ts:1-2` — Drizzle imports are minimal and correct (`pgTable`, `uuid`, `text`, `timestamp`, `jsonb`, `pgEnum`, `index` from `drizzle-orm/pg-core`; `relations` from `drizzle-orm`).
- `packages/db/src/schema/marketing.ts:4-20` — Enum declarations for `campaignTypeEnum` (line 6), `campaignStatusEnum` (line 7), `assetTypeEnum` (line 18), `assetStatusEnum` (line 19), and `videoProjectStatusEnum` (line 20) are straightforward and consistent with their usage in route handlers and the `app/lib/campaign-status.ts` transition validator. No findings.
- `packages/db/src/schema/marketing.ts:24-35` — `campaigns` table: `id` PK (line 25), `type`/`app`/`name`/`status` columns (lines 26-29), `createdAt`/`updatedAt` with `defaultNow()` (lines 30-31), and the two indexes (lines 33-34) match the route handlers' read patterns (`eq(campaigns.id, ...)`, `desc(campaigns.createdAt)` in `app/api/campaigns/route.ts:11`, `eq(campaigns.status, ...)` lookups). Cascade path is symmetric.
- `packages/db/src/schema/marketing.ts:39-43, 54-58` — The cascading delete chain (`campaigns → videoProjects → videoAssets`) is intentional and clearly expressed via the FK `onDelete: "cascade"` clauses. Documented for the marketing app's "delete campaign removes projects and assets" semantics. Noted as a related risk in a separate migration/UX track, not as a schema defect here.
- `packages/db/src/schema/marketing.ts:89-106` — Relations declarations (`campaignsRelations`, `videoProjectsRelations`, `videoAssetsRelations`) are correct and consistent with the FK columns. `settings` and `pastTopics` correctly have no relations (no FK in or out). No findings.
- **Multi-tenant scoping intent (whole file):** The absence of `schoolId` columns is intentional. `packages/domain/src/tenant-registry.ts:233-239` registers all five tables as `REFERENTIAL` with the explicit note that marketing is single-tenant/global and is accessed via `tenantDb.unscoped()`. The marketing app is a content-tooling surface (campaigns, scripts, settings) rather than a per-school learner surface, so multi-tenant scoping is correctly deferred. Noted but not a finding.
- `packages/db/drizzle/0021_sales_advantage.sql:1-168` (cross-checked for completeness against the Drizzle source): the generated migration is faithful to the schema definitions reviewed above; no drift detected.
