# Marketing App — Executive Summary

> Track: `marketing_app_review_20260626` · Baseline SHA `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> **Status: line-review complete (review-only). No remediation performed.**

## What this is

A review-only Measure track for `apps/marketing` — the marketing-materials app whose current focus is the marketing-video production pipeline (topic research, dedup, Thai script generation, scene editing, project/campaign persistence, and the future media/export boundary).

## Coverage (mechanically verified)

- In-scope files: **45** (44 under `apps/marketing` + 1 directly-referenced shared schema file `packages/db/src/schema/marketing.ts`); **4966** lines; **0** binary files.
- Line-review: **7/7 batches, 45/45 files reviewed**, every `reviewed_ranges=1-N`, 7/7 evidence files present.
- Findings: **44 unique** — **3 Critical, 6 High, 18 Medium, 17 Low**.
- Category mix: tests-build 14 · persistence 9 · auth-api 7 · ux-i18n 6 · adapter-neutrality 4 · ai-boundary 3 · workflow 1.

## Headline risks

1. **No authentication on any data/AI route (Critical/High).** `GET /api/settings` returns decrypted LLM API keys to anyone (LR-marketing-app-003-005). All `/api/video/*` routes are public and spend LLM tokens unauthenticated (LR-004-002). Campaign list/detail/PATCH have no auth or tenant scoping (LR-marketing-app-003-001/003).
2. **Missing Zod validation at boundaries (Critical/Medium).** `generate-script` feeds unvalidated `request.json()` straight into the AI prompt (LR-004-001); campaigns, settings, and test-connection routes all skip runtime validation.
3. **AI adapter bypass (High).** Routes build provider clients per-request instead of using `ai.generateText()` (LR-004-003).
4. **Schema integrity is route-dependent (Medium).** Dedup, script shape, and "encrypted at rest" are enforced only in route code, not the schema (LR-007-001/004/005).
5. **Test-suite truthfulness debt (largest category).** Stale "RED at HEAD" docblocks, a contradictory credential-leak comment, tautological assertions, and a `node` test environment that cannot run the DOM pages.

## What is healthy

- App-local libraries are clean: correct AES-256-GCM encryption, immutable scene-editor ops, Thai-aware topic normalization, a sound campaign state machine, and no direct provider SDK imports (batch 005, 0 findings).
- Script-generation output **is** validated (`scriptSchema.safeParse`); the gap is input validation and auth, not output validation.
- The absence of `schoolId` on marketing tables is intentional and documented (`tenant-registry.ts:233-239`); the generated migration `0021` is faithful to the schema.

## Recommended next steps (proposals only)

Prioritize `marketing_api_authz_*` (Critical) and `marketing_zod_boundaries_*` (High), then `marketing_ai_adapter_*`, `marketing_schema_integrity_*`, `marketing_ux_error_handling_*`, `marketing_i18n_*`, and `marketing_test_truth_backfill_*`. See `migration-tracks.md`. Deduplicate against open `video_pipeline_20260613` tasks.

## Scope honesty

This is a technical review. No source was modified, no real marketing assets were generated, and app-local AI code was **not** consolidated (proposed as remediation only). All product verdicts are backed by `file:line` evidence in `line-review/evidence/`.
