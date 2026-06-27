# Marketing App — Findings

> Track: `marketing_app_review_20260626` · Baseline SHA `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> Synthesized from line-review evidence (`line-review/evidence/marketing-app-00{1..7}.md`). All findings carry `file:line` evidence in the cited batch file. This is a review-only catalog; **no remediation has been performed**.

## Totals

**44 unique findings** — Critical: 3 · High: 6 · Medium: 18 · Low: 17.

Category distribution: tests-build 14 · persistence 9 · auth-api 7 · ux-i18n 6 · adapter-neutrality 4 · ai-boundary 3 · workflow 1.

Full per-batch catalog with file paths: `line-review/line-review-findings.md`. Machine-readable: `line-review/lrf-extracted.json`.

## Critical

- **LR-marketing-app-003-005 (auth-api)** — `GET /api/settings` decrypts and returns all secret-pattern values (LLM API keys) to any unauthenticated caller. `app/api/settings/route.ts:12-28`.
- **LR-004-001 (ai-boundary)** — `generate-script` casts `request.json()` to `{app,topic}` with no Zod validation before feeding the AI prompt builder. `app/api/video/generate-script/route.ts:11`.
- **LR-004-002 (auth-api)** — All four `/api/video/*` routes have no auth check; unauthenticated callers can spend LLM tokens and write to the DB. `app/api/video/generate-script/route.ts:9` (+ projects/research-topics/save-topics).

## High

- **LR-004-003 (adapter-neutrality)** — Route handlers instantiate `createAIClient(...)` per request instead of routing through the `ai.generateText()` adapter. `generate-script/route.ts:37-41`, `research-topics/route.ts:46-50`.
- **LR-004-004 (persistence)** — `videoProjects` insert trusts `body.campaignId` with no existence/ownership check. `app/api/video/projects/route.ts:28`.
- **LR-marketing-app-003-001 (auth-api)** — `GET /api/campaigns` returns all campaigns, no auth, no `schoolId` scoping. `app/api/campaigns/route.ts:6-18`.
- **LR-marketing-app-003-003 (auth-api)** — Campaign `[id]` GET/PATCH have no session check or tenant scoping; any UUID is readable/mutable. `app/api/campaigns/[id]/route.ts:10-87`.
- **LR-marketing-app-003-007 (ai-boundary)** — `test-connection` route has no auth and no runtime validation of `provider`/`apiKey` before calling the AI adapter. `app/api/settings/test-connection/route.ts:4-29`.
- **LR-marketing-app-001-001 (tests-build)** — Adversarial settings test carries a comment claiming the API key "IS leaked" while its assertion (`not.toContain`) forbids exactly that; the file cannot tell a reviewer whether the route leaks credentials. `phase-3-settings-adversarial.test.ts:308-317`.

## Medium (18)

auth-api: LR-marketing-app-002-007 (campaign tests never exercise an auth/session contract), LR-marketing-app-006-001 (settings page POSTs raw API key with no client-side guard).
adapter-neutrality: LR-marketing-app-003-004 (campaign PATCH no Zod), LR-marketing-app-003-006 (settings POST no Zod / no key allowlist).
ai-boundary: LR-004-006 (raw `JSON.parse` on LLM output → unhelpful error).
persistence: LR-marketing-app-003-002 (campaign POST no validation, no `schoolId`), LR-004-005 (loop insert without transaction in save-topics), LR-007-001 (`pastTopics` no `UNIQUE(app,topic)`), LR-007-004 (`settings.value` "encrypted at rest" comment unenforced by schema), LR-007-005 (`videoProjects.script` unconstrained `jsonb`).
tests-build: LR-marketing-app-001-002 (tautological 500-on-null assertion), LR-marketing-app-002-002 (`__fakeAIClient` leaked onto module surface), LR-marketing-app-006-002 (`vinext` pinned to `latest`), LR-marketing-app-006-003 (vitest `environment:"node"` vs DOM pages).
ux-i18n: LR-004-007 / LR-004-009 / LR-004-010 (no `res.ok` checks → broken UI/crash), LR-marketing-app-006-004 (`lang="th"` but UI is hardcoded English).

## Low (17)

tests-build: LR-marketing-app-001-003 (test title 88 vs assertion 122), LR-marketing-app-001-004 (`.env.example` overstates "required" list), LR-marketing-app-002-001 (brittle source-regex wiring tests), LR-marketing-app-002-003 / -004 (stale "RED at HEAD" docblocks), LR-marketing-app-002-005 (hand-rolled NextResponse stub), LR-marketing-app-002-006 (partial Drizzle chain mock), LR-marketing-app-002-008 ("ordered by createdAt desc" test asserts no ordering), LR-marketing-app-006-006 (eslint disables `no-explicit-any`).
adapter-neutrality: LR-marketing-app-003-008 (login route uses `console.error`).
persistence: LR-007-002 / -003 (`videoProjects`/`videoAssets` missing `updatedAt`), LR-007-006 (`appEnum` hardcodes app catalog).
auth-api: LR-007-007 (marketing tables lack owner/audit columns).
ux-i18n: LR-004-008 (no error state on campaign detail page), LR-marketing-app-006-007 (substring-based error styling, raw error passthrough, blocking `alert()`).
workflow: LR-marketing-app-006-005 (topic dedup relies on LLM prompt only, no programmatic guard at this unit).

## Verified clean (no findings)

- Batch 005 — 10 app-local libraries (`ai.ts`, `storage.ts`, `db.ts` adapter re-exports; `encryption.ts` AES-256-GCM via `node:crypto`; `scene-editor.ts` immutable ops; `topic-dedup.ts` Thai-aware normalization; `campaign-status.ts` state machine; `script-schema.ts`/`script-generation.ts`/`campaign-status.ts`) — 0 findings.
- `phase-5-topics.test.ts`, `phase-6-script.test.ts`, `phase-1-boot.test.ts`, the three auth re-export routes, and `health/db/route.ts` — reviewed line-by-line, no material findings.
- Marketing tables' absence of `schoolId` is intentional and documented (`packages/domain/src/tenant-registry.ts:233-239`) — verified in batch 007, not a finding.
