# Marketing App — Review Checklist

> Track: `marketing_app_review_20260626` · Baseline `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> Resolved with `file:line` evidence during line-review (7/7 batches). `[x]` = reviewed & verified; finding IDs cite the issue where one exists.

## Workflow

- [x] Topic research correctness, dedup behavior, capping — slice(0,5) + `deduplicateTopics` correct; dedup prompt-only at prompt unit (LR-marketing-app-006-005)
- [x] Topic saving idempotency / duplicate handling — in-memory Set only; no DB unique constraint (LR-007-001); non-transactional loop insert (LR-004-005)
- [x] Script generation flow + scene constraints (5–7) — `scriptSchema.safeParse` enforces bounds correctly (batch 005)
- [x] Scene editor reorder/add/remove correctness — immutable ops with boundary checks, correct (batch 005)
- [x] Project/campaign persistence + status state machine — state machine sound; `campaignId` unverified (LR-004-004); `script` jsonb unconstrained (LR-007-005)

## AI boundary

- [x] AI calls routed via `@reading-advantage/ai` adapter only (no direct SDK) — no direct SDK in app (batch 005), but per-request `createAIClient` bypasses `ai.generateText()` (LR-004-003)
- [x] Structured-output validation (Zod vs custom `script-schema.ts`) — custom validator correct but non-Zod; AGENTS.md deviation (LR-004-001 input gap; see test-gaps)
- [x] Malformed / non-JSON LLM output handling — raw `JSON.parse`, generic error (LR-004-006)
- [x] Prompt safety / untrusted input — unauthenticated + unvalidated input reaches prompts (LR-004-001/002)

## Persistence

- [x] Schema usage matches `packages/db/src/schema/marketing.ts` — matches; migration `0021` faithful, no drift (batch 007)
- [x] Multi-tenant model (no `schoolId` on marketing tables) intentional & documented — confirmed intentional (`tenant-registry.ts:233-239`); no per-user owner/audit column (LR-007-007)
- [x] `settings` encryption at rest correctness — AES-256-GCM primitive correct (batch 005); schema does not enforce it (LR-007-004)

## Auth / API

- [x] Auth/session enforcement on campaign/video/settings routes — **absent on all** (LR-004-002, LR-marketing-app-003-001/003/005/007)
- [x] Role/permission checks (admin vs contributor) — none present anywhere; no role model in marketing routes
- [x] API input validation at boundaries — no Zod on campaigns POST/PATCH, settings POST, video routes (LR-marketing-app-003-002/004/006, LR-004-001)

## Tests / build

- [x] Reconcile open `video_pipeline_20260613` test tasks into `test-gaps.md` — done; see `test-gaps.md`
- [b] Lint/type/test/build gates recorded — **deferred:review-execution** (review-only track; gates not run)

## UX / i18n

- [x] Thai-script handling (`normalizeTopic`, prompts) — `[\u0E00-\u0E7F]` regex correct (batch 005); but UI copy hardcoded English under `lang="th"` (LR-marketing-app-006-004)
- [x] Error surfaces / loading states — missing `res.ok` checks (LR-004-007/009/010), no error state (LR-004-008), brittle substring styling + `alert()` (LR-marketing-app-006-007)

## Adapter / provider neutrality

- [x] Storage via `@reading-advantage/storage` adapter — clean re-export (batch 005)
- [x] No direct provider coupling for AI/storage/auth/db/transport — no direct SDK in app; route-level AI client construction is the drift (LR-004-003); login uses raw `console.error` (LR-marketing-app-003-008)
