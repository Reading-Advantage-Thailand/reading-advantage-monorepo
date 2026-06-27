# Marketing App — Workflow Map

> Track: `marketing_app_review_20260626` · Baseline `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> Mappings confirmed by line-review evidence. Per-workflow verdicts cite LR finding IDs.

## Workflow families and their boundaries

| Workflow | Entry (UI/route) | API handler | App-local logic | Persistence | AI boundary | Verdict (evidence) |
|---|---|---|---|---|---|---|
| Topic research | campaign video editor (`app/campaigns/[id]/video/page.tsx`) | `app/api/video/research-topics/route.ts` | `topic-research.ts` (prompt), `topic-dedup.ts` | reads `settings`, `pastTopics` | `createAIClient(...).generateText` | No auth (LR-004-002); direct AI client (LR-004-003); dedup is prompt-only at the prompt unit (LR-marketing-app-006-005) |
| Topic saving / dedup | same editor | `app/api/video/save-topics/route.ts` | `topic-dedup.ts` (`deduplicateTopics`, `normalizeTopic`) | inserts `pastTopics` | — | No auth (LR-004-002); non-transactional loop insert (LR-004-005); no DB unique constraint (LR-007-001). Normalization logic itself is correct (batch 005) |
| Script generation | same editor | `app/api/video/generate-script/route.ts` | `script-generation.ts` (prompt), `script-schema.ts` (`safeParse`) | reads `settings` | `createAIClient(...).generateText` | No auth (LR-004-002); no input Zod (LR-004-001, Critical); raw `JSON.parse` (LR-004-006); output IS validated via `scriptSchema.safeParse` (good) |
| Scene editing | same editor | (client-side) | `scene-editor.ts` (reorder/add/remove) | persisted via project save | — | Immutable ops correct (batch 005); editor page lacks `res.ok` checks (LR-004-009) |
| Project persistence | same editor | `app/api/video/projects/route.ts` | `script-schema.ts` (re-validate) | inserts `videoProjects` | — | No auth (LR-004-002); `campaignId` unverified (LR-004-004); `script` jsonb unconstrained at schema level (LR-007-005); no `updatedAt` for future edits (LR-007-002) |
| Campaigns list/create | `app/campaigns/page.tsx` | `app/api/campaigns/route.ts` (GET/POST) | — | `campaigns` table | — | GET no auth/tenant (LR-marketing-app-003-001); POST no Zod / no `schoolId` (LR-marketing-app-003-002); list page no `res.ok` check → crash risk (LR-004-010) |
| Campaign detail/status | `app/campaigns/[id]/page.tsx` | `app/api/campaigns/[id]/route.ts` (GET/PATCH) | `campaign-status.ts` (transition validation) | `campaigns` table | — | GET/PATCH no auth/tenant (LR-marketing-app-003-003); PATCH no Zod (LR-marketing-app-003-004); detail page no `res.ok` / no error state (LR-004-007/008). State machine itself is sound (batch 005) |
| Settings (LLM config) | `app/settings/page.tsx` | `app/api/settings/route.ts`, `.../test-connection` | `encryption.ts` (AES-256-GCM at rest) | `settings` table | test-connection touches provider | GET leaks decrypted keys unauthenticated (LR-marketing-app-003-005, Critical); POST no Zod/allowlist (LR-marketing-app-003-006); test-connection no auth/validation (LR-marketing-app-003-007); page POSTs raw key unguarded (LR-marketing-app-006-001); brittle error surfaces (LR-marketing-app-006-007). Encryption primitive itself is correct (batch 005) |
| Auth | `app/login/page.tsx` | `app/api/auth/{login,logout,session}` | delegates to `@reading-advantage/api` | session infra | — | Routes are clean re-exports (batch 003); login route uses `console.error` not structured logger (LR-marketing-app-003-008); login page surfaces raw `err.message` (LR-marketing-app-006-007) |
| Health | — | `app/api/health/db/route.ts` | — | db ping | — | Clean; auth-free health check is conventional (batch 003, no finding) |

## State machine (campaign status)

`campaign-status.ts` defines `draft → in-progress → complete → archived` (terminal), enforced server-side in `PATCH /api/campaigns/[id]` via `isValidCampaignStatusTransition` (`route.ts:56-63`, returns 400 on invalid transition). The state machine and its enforcement are correct; the **gap is the missing runtime type guard on `body.status`** before the transition check (LR-marketing-app-003-004) and the absence of auth around the mutation (LR-marketing-app-003-003).

## Confirmed observations

- `videoAssets` table exists in schema but **no app route writes it yet** — the future media/export boundary is unbuilt (verified batch 004/007). Missing `updatedAt` on `videoAssets` will block the asset lifecycle workflow when it lands (LR-007-003).
- Multi-tenant scoping: marketing tables have **no `schoolId`**; this is **intentional and documented** (`packages/domain/src/tenant-registry.ts:233-239`, single-tenant/global content tool). It is not a finding, but the absence of any per-user owner/audit column is (LR-007-007).
- The systemic auth gap across campaign/video/settings handlers is the dominant cross-workflow risk — see `findings.md` and `migration-tracks.md`.
