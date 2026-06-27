# Marketing App — Proposed Migration / Remediation Tracks

> Track: `marketing_app_review_20260626` · Baseline `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> **Proposals only.** Evidence-backed by line-review. No remediation has been performed in this track.

## Proposed tracks (evidence-confirmed)

| ID (proposed) | Theme | Backing findings | Priority |
|---|---|---|---|
| `marketing_api_authz_*` | Add auth/session + role enforcement and tenant/owner context to all campaign/video/settings API routes; mask secrets in `GET /api/settings` | LR-marketing-app-003-001/003/005/007, LR-004-002, LR-marketing-app-006-001, LR-marketing-app-002-007 | **Critical** |
| `marketing_zod_boundaries_*` | Introduce Zod input schemas at every external boundary (campaigns POST/PATCH, settings POST, all video routes); validate `provider` enum and `campaignId` existence | LR-004-001/004, LR-marketing-app-003-002/004/006 | **High** |
| `marketing_ai_adapter_*` | Route AI calls through `ai.generateText()` instead of per-request `createAIClient`; wrap LLM `JSON.parse` with descriptive errors; consider replacing custom `script-schema.ts` with Zod | LR-004-003/006, ai-boundary assessment | High |
| `marketing_schema_integrity_*` | Add `UNIQUE(app, topic)` to `pastTopics`; type/constrain `videoProjects.script` jsonb; add `updatedAt` to `videoProjects`/`videoAssets`; add `createdBy`/`updatedBy`; enforce or document `settings` encryption invariant; extract shared `APPS` tuple | LR-007-001..007, LR-004-005 | Medium |
| `marketing_ux_error_handling_*` | Add `res.ok` checks + error states to all client pages; replace substring-based error styling and `alert()` with status-driven inline UI | LR-004-007/008/009/010, LR-marketing-app-006-007 | Medium |
| `marketing_i18n_*` | Introduce an i18n layer (or correct `lang`) and externalize hardcoded English UI strings for the Thai audience | LR-marketing-app-006-004 | Medium |
| `marketing_test_truth_backfill_*` | Fix stale "RED at HEAD" docblocks, tautological/under-asserting tests, mock plumbing, and `vitest` DOM environment; backfill missing tests per `test-gaps.md`; pin `vinext` | LR-marketing-app-001-001/002/003/004, LR-marketing-app-002-001..008, LR-marketing-app-006-002/003/006 | Medium |

## Relationship to existing tracks

- `video_pipeline_20260613` already owns "Replace custom validator with Zod + edge-case tests" and several missing-test tasks — fold those into `marketing_zod_boundaries_*` / `marketing_test_truth_backfill_*` rather than duplicating.

## Non-goals (per spec)

- Do not consolidate app-local AI code during this review; proposed above as remediation only because evidence (LR-004-003) warrants it.
- Do not generate real marketing assets with paid/external providers.
- Do not change campaign content or brand positioning.
