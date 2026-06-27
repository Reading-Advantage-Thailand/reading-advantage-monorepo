# Marketing App — AI Boundary Map

> Track: `marketing_app_review_20260626` · Baseline `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> Reliability verdicts confirmed by line-review evidence.

## Adapter routing

- `app/lib/ai.ts` re-exports `createAIClient`, `getAIClient`, `AIClient`, `AIConfig` from `@reading-advantage/ai`. **No direct OpenAI/Google SDK import exists in `apps/marketing`** (confirmed line-by-line, batch 005).
- `app/lib/storage.ts` re-exports `createStorageClient`, `getStorageClient`, `getStorageUrl` from `@reading-advantage/storage` (clean, batch 005).

**Adapter-neutrality drift (LR-004-003, High):** although the app does not import provider SDKs directly, the route handlers construct provider clients per request via `createAIClient({ provider, model, apiKey })` (`generate-script/route.ts:37-41`, `research-topics/route.ts:46-50`). AGENTS.md requires AI access via the internal adapter (`ai.generateText()`). Routes bypass any future adapter-level rate limiting, logging, or fallback. Remediation candidate, not consolidated during this review (per spec non-goal).

## AI call sites

| Call site | Auth | Provider selection | Prompt builder | Input validation | Output validation |
|---|---|---|---|---|---|
| `app/api/video/research-topics/route.ts` | **none (LR-004-002)** | from `settings` (`llm.provider`/`llm.model`/`llm.apiKey`), default `google`/`gemini-pro` | `buildTopicResearchPrompt` | none (no Zod) | `JSON.parse` (raw, LR-004-006) → `Array.isArray` → cap 5 → `deduplicateTopics`; no per-string schema |
| `app/api/video/generate-script/route.ts` | **none (LR-004-002)** | same settings source | `buildScriptGenerationPrompt` | **none — `request.json() as {app,topic}` (LR-004-001, Critical)** | `JSON.parse` (raw, LR-004-006) → `scriptSchema.safeParse` (custom validator: 5–7 scenes, non-empty narration/imagePrompt/motionDirection) — present and correct |
| `app/api/settings/test-connection/route.ts` | **none (LR-marketing-app-003-007, High)** | request body (`provider` cast, not validated) | — | none (no Zod, no provider enum guard) | n/a (connectivity probe) |
| `app/api/video/projects/route.ts` | **none (LR-004-002)** | — | — | `body.campaignId` unverified (LR-004-004) | `scriptSchema.safeParse(body.script)` before insert — present and correct |

## Structured-output validation assessment

- `script-schema.ts` is a **custom hand-rolled validator**, not Zod. It is functionally correct (validates array type, 5–7 scene bounds, required non-empty string fields per scene; batch 005, no finding) but AGENTS.md mandates Zod for AI structured outputs. The open `video_pipeline_20260613` task "Replace custom validator with Zod and add exhaustive schema-edge-case tests" remains valid — see `test-gaps.md` and `migration-tracks.md`.
- `research-topics` validates output only via `Array.isArray` + `String()` coercion + `slice(0,5)`; there is **no schema for the topic strings** (length/empty checks). Output dedup itself (`deduplicateTopics`) is applied correctly.
- Both AI routes call `JSON.parse(result)` directly (LR-004-006, Medium). Malformed/non-JSON LLM output is caught by the surrounding `try/catch` → 500, but the user-facing error is a generic "Unexpected token" rather than an LLM-output-specific message.

## Secrets / key handling

- LLM API key stored in `settings` table, encrypted at rest via `encryption.ts` (AES-256-GCM, key from `ENCRYPTION_KEY` env, 32-byte hex required; IV 12B, tag 16B; format `iv:authTag:ciphertext`). The primitive is correct (batch 005, no finding).
- **Exposure risk (LR-marketing-app-003-005, Critical):** `GET /api/settings` decrypts secret-pattern keys (`apiKey`/`secret`/`token`) and returns plaintext to **any unauthenticated caller**. The encryption-at-rest guarantee is also a route-layer invariant only, not a schema invariant (LR-007-004).
- The secret-key regex (`SECRET_KEY_PATTERNS`) lives only in `app/api/settings/route.ts:6` — single point of truth not shared with the schema (noted in LR-007-004).

## Prompt safety

- Prompts embed user/`topic` input directly. Combined with the missing input validation (LR-004-001) and absent auth (LR-004-002), untrusted callers control prompt content and can drive token spend. No prompt-injection mitigation is present; flagged as part of the auth/validation remediation track rather than a separate finding.

## Net assessment

The AI module's **primitives are sound** (correct encryption, correct custom script validation, no direct SDK coupling). The **boundary is weak**: every AI-touching route lacks authentication and input validation, and the adapter is bypassed at the route layer. This is the highest-leverage remediation cluster (`marketing_api_authz_*` + `marketing_zod_ai_contracts_*`).
