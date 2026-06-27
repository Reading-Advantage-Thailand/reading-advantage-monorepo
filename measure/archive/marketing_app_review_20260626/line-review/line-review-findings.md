# Marketing App — Line-Review Findings Catalog

> Track: `marketing_app_review_20260626` · Baseline `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> Synthesized from per-batch evidence under `line-review/evidence/`. Every LR finding ID is preserved; full evidence/impact/recommendation live in the cited batch evidence file.

**Total findings: 44** — Critical: 3, High: 6, Medium: 18, Low: 17

Category distribution — tests-build: 14, persistence: 9, auth-api: 7, ux-i18n: 6, adapter-neutrality: 4, ai-boundary: 3, workflow: 1

## marketing-app-001 (4 findings)

| ID | Severity | Category | File | Title |
|---|---|---|---|---|
| LR-marketing-app-001-001 | High | tests-build | `apps/marketing/app/__tests__/phase-3-settings-adversarial.test.ts:308-317` | Test comment claims an API-key leak that its own assertion forbids (stale/contradictory security documentation) |
| LR-marketing-app-001-002 | Medium | tests-build | `apps/marketing/app/__tests__/phase-1-boot-adversarial.test.ts:172-187` | Tautological assertion accepts both pass/fail outcomes, providing no real regression protection |
| LR-marketing-app-001-003 | Low | tests-build | `apps/marketing/app/__tests__/phase-3-settings-adversarial.test.ts:366-371` | Test title disagrees with its assertion threshold (88 vs 122 hex chars) |
| LR-marketing-app-001-004 | Low | tests-build | `apps/marketing/.env.example:1-5` | `.env.example` claims to list "required environment variables" but documents only one |

## marketing-app-002 (8 findings)

| ID | Severity | Category | File | Title |
|---|---|---|---|---|
| LR-marketing-app-002-001 | Low | tests-build | `apps/marketing/app/__tests__/phase-3-settings.test.ts:143-174` | Brittle raw-source regex assertions for page structure |
| LR-marketing-app-002-002 | Medium | tests-build | `apps/marketing/app/__tests__/phase-3-settings.test.ts:104-118, 386-391, 420-425` | Mock factory re-exports `__fakeAIClient` on the `@reading-advantage/ai` module surface |
| LR-marketing-app-002-003 | Low | tests-build | `apps/marketing/app/__tests__/phase-3-settings.test.ts:24-46, 184, 268-271, 282, 333` | Stale "RED at HEAD" framing in header docblock and inline comments |
| LR-marketing-app-002-004 | Low | tests-build | `apps/marketing/app/__tests__/phase-4-campaigns.test.ts:24-29, 274-275, 326-328` | Stale "RED at HEAD" framing in phase-4-campaigns header docblock |
| LR-marketing-app-002-005 | Low | tests-build | `apps/marketing/app/__tests__/phase-4-campaigns.test.ts:40-45` | `next/server` NextResponse is replaced with a hand-rolled Response stub |
| LR-marketing-app-002-006 | Low | tests-build | `apps/marketing/app/__tests__/phase-4-campaigns.test.ts:93-99` | Drizzle select-chain mock supports only `.where()` and `.orderBy()`; unknown chain operations silently succeed |
| LR-marketing-app-002-007 | Medium | auth-api | `apps/marketing/app/__tests__/phase-4-campaigns.test.ts:173-204, 234-265, 321-374` | Auth/session contract is not exercised in any PATCH or POST test in this batch |
| LR-marketing-app-002-008 | Low | tests-build | `apps/marketing/app/__tests__/phase-4-campaigns.test.ts:159-171` | "ordered by createdAt desc" test does not assert ordering |

## marketing-app-003 (8 findings)

| ID | Severity | Category | File | Title |
|---|---|---|---|---|
| LR-marketing-app-003-001 | High | auth-api | `apps/marketing/app/api/campaigns/route.ts:6-18` | Campaigns listing returns all campaigns without auth or tenant scoping |
| LR-marketing-app-003-002 | Medium | persistence | `apps/marketing/app/api/campaigns/route.ts:21-38` | Campaign creation lacks input validation and schoolId |
| LR-marketing-app-003-003 | High | auth-api | `apps/marketing/app/api/campaigns/[id]/route.ts:10-34, 36-87` | Campaign [id] GET and PATCH lack auth and multi-tenant access control |
| LR-marketing-app-003-004 | Medium | adapter-neutrality | `apps/marketing/app/api/campaigns/[id]/route.ts:41-42` | Campaign [id] PATCH lacks Zod runtime validation on request body |
| LR-marketing-app-003-005 | Critical | auth-api | `apps/marketing/app/api/settings/route.ts:12-28` | Settings GET returns decrypted API keys with no authentication |
| LR-marketing-app-003-006 | Medium | adapter-neutrality | `apps/marketing/app/api/settings/route.ts:30-54` | Settings POST lacks Zod schema validation |
| LR-marketing-app-003-007 | High | ai-boundary | `apps/marketing/app/api/settings/test-connection/route.ts:4-29` | Settings test-connection route lacks auth and input validation |
| LR-marketing-app-003-008 | Low | adapter-neutrality | `apps/marketing/app/api/auth/login/route.ts:9-14` | Login route uses console.error instead of shared structured logger |

## marketing-app-004 (10 findings)

| ID | Severity | Category | File | Title |
|---|---|---|---|---|
| LR-004-001 | Critical | ai-boundary | `apps/marketing/app/api/video/generate-script/route.ts:11` | Missing Zod input validation on generate-script POST body |
| LR-004-002 | Critical | auth-api | `apps/marketing/app/api/video/generate-script/route.ts:9` | No authentication on video API routes |
| LR-004-003 | High | adapter-neutrality | `apps/marketing/app/api/video/generate-script/route.ts:37-41` | Direct AI client instantiation in route handler |
| LR-004-004 | High | persistence | `apps/marketing/app/api/video/projects/route.ts:28` | Unvalidated campaignId in video project creation |
| LR-004-005 | Medium | persistence | `apps/marketing/app/api/video/save-topics/route.ts:19-24` | Loop insert without transaction in save-topics |
| LR-004-006 | Medium | ai-boundary | `apps/marketing/app/api/video/generate-script/route.ts:48` | Unsafe JSON.parse on LLM output |
| LR-004-007 | Medium | ux-i18n | `apps/marketing/app/campaigns/[id]/page.tsx:36-38` | No HTTP response status validation in campaign detail page |
| LR-004-008 | Low | ux-i18n | `apps/marketing/app/campaigns/[id]/page.tsx:24-41` | No error state in campaign detail page |
| LR-004-009 | Medium | ux-i18n | `apps/marketing/app/campaigns/[id]/video/page.tsx:57-59` | No HTTP response status validation in video production page |
| LR-004-010 | Medium | ux-i18n | `apps/marketing/app/campaigns/page.tsx:45-47` | No HTTP response status validation in campaigns list page |

## marketing-app-006 (7 findings)

| ID | Severity | Category | File | Title |
|---|---|---|---|---|
| LR-marketing-app-006-001 | Medium | auth-api | `apps/marketing/app/settings/page.tsx:35-51` | Settings page collects and POSTs raw LLM API key with no client-side access control |
| LR-marketing-app-006-002 | Medium | tests-build | `apps/marketing/package.json:23` | `vinext` dependency pinned to floating `latest` |
| LR-marketing-app-006-003 | Medium | tests-build | `apps/marketing/vitest.config.ts:21` | Vitest configured with `environment: "node"` despite client/DOM pages |
| LR-marketing-app-006-004 | Medium | ux-i18n | `apps/marketing/app/page.tsx:4-5` | UI strings hardcoded in English while document `lang="th"`; no i18n for Thai audience |
| LR-marketing-app-006-005 | Low | workflow | `apps/marketing/app/lib/topic-research.ts:9-12` | Topic dedup relies entirely on LLM prompt instruction, no programmatic guard |
| LR-marketing-app-006-006 | Low | tests-build | `apps/marketing/eslint.config.mjs:20-27` | ESLint config disables `no-explicit-any` to pin pre-existing tech debt |
| LR-marketing-app-006-007 | Low | ux-i18n | `apps/marketing/app/settings/page.tsx:173-184` | Brittle string-matching error surfaces and raw error passthrough in UI |

## marketing-app-007 (7 findings)

| ID | Severity | Category | File | Title |
|---|---|---|---|---|
| LR-007-001 | Medium | persistence | `packages/db/src/schema/marketing.ts:71-78` | `pastTopics` table has no unique constraint on `(app, topic)` |
| LR-007-002 | Low | persistence | `packages/db/src/schema/marketing.ts:39-50` | `videoProjects` table is missing an `updatedAt` column |
| LR-007-003 | Low | persistence | `packages/db/src/schema/marketing.ts:54-67` | `videoAssets` table is missing an `updatedAt` column |
| LR-007-004 | Medium | persistence | `packages/db/src/schema/marketing.ts:82-85` | `settings.value` carries an "encrypted at rest" comment but the schema carries no enforcement and no sensitivity marker |
| LR-007-005 | Medium | persistence | `packages/db/src/schema/marketing.ts:45` | `videoProjects.script` is unconstrained `jsonb`; integrity relies entirely on route-layer `scriptSchema` |
| LR-007-006 | Low | persistence | `packages/db/src/schema/marketing.ts:8-17` | `appEnum` hardcodes the app catalog; no shared source of truth |
| LR-007-007 | Low | auth-api | `packages/db/src/schema/marketing.ts:24-106` | Marketing tables lack per-row owner/audit attribution |

