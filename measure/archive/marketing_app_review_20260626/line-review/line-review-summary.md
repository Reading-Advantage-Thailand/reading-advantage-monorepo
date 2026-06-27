# Marketing App — Line-Review Summary

> Track: `marketing_app_review_20260626` · Baseline `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> Mechanically verified synthesis of 7 review batches over 45 files / 4966 lines.

## Totals

- Files reviewed: **45 / 45** (100%), every `reviewed_ranges=1-N`.
- Evidence files: **7 / 7** present.
- Unique findings: **44**.
- Per-file `finding_count` column sums to 53 due to expected multi-file double-counting (batch-004 cites cross-file UX patterns on 3 page rows; batch-006 i18n finding spans multiple files). Unique-ID count (44) is authoritative.

## Severity distribution

| Severity | Count |
|---|---:|
| Critical | 3 |
| High | 6 |
| Medium | 18 |
| Low | 17 |
| **Total** | **44** |

## Category distribution

| Category | Count |
|---|---:|
| tests-build | 14 |
| persistence | 9 |
| auth-api | 7 |
| ux-i18n | 6 |
| adapter-neutrality | 4 |
| ai-boundary | 3 |
| workflow | 1 |
| **Total** | **44** |

## Top themes

1. **Missing authentication & multi-tenant scoping on API routes (auth-api, 7 findings).** The most severe systemic issue. `GET /api/settings` returns decrypted LLM API keys to any unauthenticated caller (LR-marketing-app-003-005, Critical). All four `/api/video/*` routes are publicly accessible (LR-004-002, Critical). Campaign list/detail/PATCH routes have no session check or `schoolId` scoping (LR-marketing-app-003-001/003). The settings page POSTs provider credentials with no client-side guard (LR-marketing-app-006-001).

2. **Absent Zod validation at external boundaries (ai-boundary + adapter-neutrality).** `generate-script` casts `request.json()` straight into the prompt builder (LR-004-001, Critical); campaigns, settings, and test-connection routes all skip runtime input validation (LR-marketing-app-003-002/004/006/007). Raw `JSON.parse` on LLM output yields unhelpful errors on malformed responses (LR-004-006).

3. **AI adapter neutrality drift.** Route handlers instantiate provider clients directly via `createAIClient(...)` per-request (LR-004-003), bypassing the internal `ai.generateText()` adapter mandated by AGENTS.md.

4. **Schema integrity gaps in `packages/db/src/schema/marketing.ts` (persistence, 9 findings).** `pastTopics` lacks a `UNIQUE(app, topic)` constraint so dedup is enforced only in memory (LR-007-001); `videoProjects.script` is unconstrained `jsonb` relying entirely on route-layer validation (LR-007-005); `settings.value` carries an 'encrypted at rest' comment with no schema enforcement (LR-007-004); missing `updatedAt`/owner-audit columns (LR-007-002/003/007).

5. **Test-suite truthfulness & coverage debt (tests-build, 14 findings — the largest category).** Stale 'RED at HEAD' docblocks describe modules that now exist (LR-marketing-app-002-003/004); a contradictory comment claims an API-key leak its own assertion forbids (LR-marketing-app-001-001); tautological/under-asserting tests give false confidence (LR-marketing-app-001-002, LR-marketing-app-002-008); `vitest` runs in `node` environment despite client/DOM pages (LR-marketing-app-006-003); `vinext` pinned to floating `latest` (LR-marketing-app-006-002).

6. **UX error-handling and i18n mismatch (ux-i18n, 6 findings).** Client pages call `res.json()` without checking `res.ok`, misrendering error bodies or crashing on `.map()` (LR-004-007/009/010); UI copy is hardcoded English while the document declares `lang="th"` for a Thai audience (LR-marketing-app-006-004).

## Clean areas (no findings)

- **Batch 005 (10 app-local libraries, 0 findings):** `ai.ts`/`storage.ts`/`db.ts` are clean adapter re-exports; `encryption.ts` implements AES-256-GCM correctly via `node:crypto`; `scene-editor.ts` uses immutable operations; `topic-dedup.ts` handles Thai script normalization correctly; `campaign-status.ts` defines a sound state machine.
- Multi-tenant `schoolId` absence on marketing tables is **intentional and documented** in `packages/domain/src/tenant-registry.ts:233-239` (marketing is a single-tenant/global content tool), verified in batch 007 — not a finding.
