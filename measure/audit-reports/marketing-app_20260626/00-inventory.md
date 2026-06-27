# Marketing App — Inventory (00)

> Track: `marketing_app_review_20260626`
> Baseline SHA: `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> Status: **line-review complete** (7/7 batches, 45/45 files reviewed). Counts mechanically verified.

## Scope

- Primary: `apps/marketing`
- Shared surface directly referenced by the app: `packages/db/src/schema/marketing.ts` (imported via `@reading-advantage/db/schema` in `apps/marketing/app/lib/db.ts`).
- No additional shared marketing domain module exists; business logic is app-local under `app/lib` (a remediation observation, not a defect on its own).

## Exclusions (generated/dependency/cache only)

`node_modules`, `.next`, `dist`, `.turbo`, `.vite`, `.vinext`, `coverage`, build/cache dirs, `*.tsbuildinfo`, `graph.db*`.

## Totals

- In-scope files: **45**
- Total lines: **4966**
- Binary/static files: **0**
- Line-review batches: **7** (all within ≤1200 lines / ≤10 files cap; 0 oversized single-file batches)
- Findings produced: **44** (3 Critical / 6 High / 18 Medium / 17 Low)

Source of truth: `line-review/file-inventory.tsv` (inventory) and `line-review/line-review-coverage.tsv` (merged coverage, all rows `reviewed`, `reviewed_ranges=1-N`).

## Category breakdown (path-based)

| Category | Files | Notes |
|---|---:|---|
| App pages (`app/**/page.tsx`, `layout.tsx`) | 7 | login, home, settings, campaigns list/detail, campaign video editor, layout |
| API routes (`app/api/**/route.ts`) | 12 | auth (login/logout/session), campaigns (list, [id]), settings (get/post, test-connection), health/db, video (research-topics, save-topics, generate-script, projects) |
| App-local libraries (`app/lib/*.ts`) | 10 | ai, storage, db (re-exports), encryption, campaign-status, scene-editor, script-generation, script-schema, topic-dedup, topic-research |
| Tests (`app/__tests__/*.test.ts`) | 7 | phase-1-boot (+adversarial), phase-3-settings (+adversarial), phase-4-campaigns, phase-5-topics, phase-6-script |
| Config / manifest | 8 | package.json, tsconfig.json, vite.config.ts, vitest.config.ts, eslint.config.mjs, next-env.d.ts, .env.example, .gitignore |
| Shared schema (db) | 1 | `packages/db/src/schema/marketing.ts` |

## Adapter / dependency surface (from `package.json`, line-review confirmed)

- **AI**: `@reading-advantage/ai` — `app/lib/ai.ts` re-exports `createAIClient`/`getAIClient` (adapter, no direct provider SDK in app — confirmed batch 005). However route handlers call `createAIClient(...)` per request rather than `ai.generateText()` (LR-004-003, adapter-neutrality drift).
- **Storage**: `@reading-advantage/storage` — `app/lib/storage.ts` clean re-export (confirmed batch 005). No app route writes assets yet.
- **Auth**: `@reading-advantage/auth`, `@reading-advantage/auth-client`, `@reading-advantage/api` (`handleLogin`/`handleLogout`/`handleSession`). Auth routes are thin re-exports; **no app route enforces auth at the handler level** (auth-api findings).
- **DB**: `@reading-advantage/db` + `@reading-advantage/db/schema`. Marketing tables registered REFERENTIAL / single-tenant in `packages/domain/src/tenant-registry.ts:233-239`.

## Schema surface (`packages/db/src/schema/marketing.ts`, 106 lines)

Five tables: `campaigns`, `videoProjects`, `videoAssets`, `pastTopics`, `settings`; five pgEnums; cascade chain `campaigns → videoProjects → videoAssets`. Integrity gaps catalogued in `findings.md` (LR-007-001..007). The generated migration `packages/db/drizzle/0021_sales_advantage.sql` was cross-checked and found faithful to the Drizzle source (no drift).

## Build / runtime stack

- `vinext` (Vite-based Next.js reimplementation) for dev/build/start — pinned to floating `latest` (LR-marketing-app-006-002).
- Vitest test runner configured with `environment: "node"` (LR-marketing-app-006-003).
- TypeScript `strict: true`; bundler module resolution; `@`→`./app` alias.
