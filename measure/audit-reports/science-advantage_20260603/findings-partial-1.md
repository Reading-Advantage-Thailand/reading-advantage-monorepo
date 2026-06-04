# Section 1 — Findings

> **Audit target:** `apps/science-advantage/`
> **Auditor:** section-1 subagent (2026-06-03)
> **Rules covered:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
> **Severity guidance applied:** direct SDK in route/component = High; SDK in adapter module without interface = Medium; ≥5 source files importing SDKs = Critical. Threshold is **not** tripped here (only 2 source files import SDKs and they are inside the `lib/ai/` adapter module), so the AI-adapter finding lands at **Medium**.

## Summary

| ID | Rule | Title | Severity |
|----|------|-------|----------|
| F-101 | 1.1 / 1.3 / 1.6 | `lib/ai/` imports `@ai-sdk/openai`, `@ai-sdk/google`, and `ai` directly with no `AIClient` interface boundary | **Medium** |
| F-102 | 1.2 / 1.4 | No `lib/storage/` or `lib/email/` adapter modules — and no shared `@reading-advantage/ai` or `@reading-advantage/storage` package to absorb the coupling | **Low** (latent; no live feature depends on this yet) |

---

## F-101: `lib/ai/` couples directly to provider SDKs without an interface boundary

- **Rule:** 1.1 (no direct provider SDK imports), 1.3 (AI access via adapter), 1.6 (adapter modules export an interface)
- **Severity:** Medium — direct SDK import in an adapter module that lacks an interface. Per the protocol's severity guidance, this is a "refactor needed" finding, not yet Critical because the count of importing source files is 2 (below the ≥5 escalation threshold) and the imports are confined to a single adapter module.
- **Evidence:**
  - `apps/science-advantage/lib/ai/recommendation-service.ts:2` — `import { generateObject } from 'ai';`
  - `apps/science-advantage/lib/ai/recommendation-service.ts:3` — `import { createOpenAI } from '@ai-sdk/openai';`
  - `apps/science-advantage/lib/ai/recommendation-service.ts:4` — `import { createGoogleGenerativeAI } from '@ai-sdk/google';`
  - `apps/science-advantage/lib/ai/recommendation-service.ts:55–61` — provider client instantiated directly, gated only by env-var API-key presence
  - `apps/science-advantage/lib/ai/recommendation-service.ts:63–76` — `resolveModel()` branches on model-id string prefix (`gemini` vs default), not on an injected `AIClient` reference
  - `apps/science-advantage/lib/ai/image-generator.ts:1` — `import { experimental_generateImage } from 'ai';`
  - `apps/science-advantage/lib/ai/image-generator.ts:34–42` — `ensureApiKey()` mutates `process.env.OPENAI_API_KEY` / `process.env.GOOGLE_API_KEY` at call time to satisfy the AI SDK's env-var lookup
  - `apps/science-advantage/lib/ai/image-generator.ts:106–115` — `generateWithModel()` passes the raw model-id string straight to `experimental_generateImage` with no client abstraction
  - `apps/science-advantage/lib/ai/recommendation-service.ts:88,169` and `image-generator.ts:7,118` — exports are concrete functions and a data type only; **no `AIClient`/`AIClientProvider`/`LLMClient` interface is exported anywhere in `lib/ai/`**
  - `apps/science-advantage/package.json:22–23,37` — `@ai-sdk/google`, `@ai-sdk/openai`, and `ai` are direct app dependencies (the §2.3 subagent will own that file)
  - Caller side (acceptable): `apps/science-advantage/app/api/ai/recommendations/route.ts:21` imports `generateRecommendation` from the adapter (not from `@ai-sdk/*`), so route-handler coupling is mediated — the leak is contained inside `lib/ai/`
  - Positive reference (interface-bound adapter that `lib/ai/` could mirror): `apps/science-advantage/lib/platform/redis-client.ts:3` (`RedisClient` interface), `lib/platform/cache-adapter.ts:1,14` (`RedisLike` + `CacheAdapter`), `lib/platform/rate-limit-store.ts:1` (`RateLimitStore`), `lib/platform/session-cleanup.ts:1` (`SessionStore`)
- **Impact:** `lib/ai/` is the only module in the app that directly couples to external provider SDKs. Two provider SDKs (`@ai-sdk/openai`, `@ai-sdk/google`) plus the unified `ai` Vercel SDK are all imported by the same module. Adding a third provider (Anthropic, Mistral, OpenRouter, etc.) requires editing `recommendation-service.ts` and `image-generator.ts`; tests for those modules must re-mock the SDK; the env-mutating pattern in `image-generator.ts:30,39` is fragile (writes `process.env.OPENAI_API_KEY` and `process.env.GOOGLE_API_KEY` at request time to satisfy the AI SDK's own env lookup — a side-effect that would break under concurrent requests if these env vars were ever unset). The lack of an interface also blocks the §3 backend-as-code migration: domain functions cannot accept an `AIClient` parameter and be unit-tested without a real network.
- **Suggested fix:** Introduce a shared `packages/ai` (or app-local `lib/ai/client.ts`) adapter that exports an `AIClient` interface (`generateObject<T>(input): Promise<T>`, `generateImage(input): Promise<Buffer>`, `generateText(input): Promise<string>`) plus a provider selector driven by an `AI_PROVIDER` env var (`openai` | `google` | `mock`). Refactor `lib/ai/recommendation-service.ts` to depend on the interface, not on `@ai-sdk/*`; refactor `image-generator.ts` to stop mutating `process.env` at call time and instead pass the API key through the interface constructor. The existing `lib/platform/redis-client.ts` shape is the right template. Open as a Medium-priority migration track; no blocker for ongoing feature work, but should land before any new provider is added.

---

## F-102: No storage, email, or shared-AI adapter packages exist for science-advantage to consume

- **Rule:** 1.2 (storage via adapter), 1.4 (email via adapter), and the precondition for 1.1/1.3 (a shared adapter package to receive the migration)
- **Severity:** Low — latent. Storage and email are not actually used in code today, so there is no live call site violating the rule. The risk is that when storage/email are implemented, they will be added as direct SDK calls into route handlers, repeating the F-101 pattern.
- **Evidence:**
  - No `apps/science-advantage/lib/storage/` directory (`ls apps/science-advantage/lib/` enumerates 15 subdirs, none named `storage` or `email`).
  - No `packages/ai/` or `packages/storage/` directory exists in the monorepo (`ls packages/` returns `api auth auth-client config db domain reading-advantage-scripts types ui utils webhooks` — neither `ai` nor `storage` is present).
  - `apps/science-advantage/.env.example:34–36` declares `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_STORAGE_BUCKET`, `GOOGLE_CLOUD_KEY_FILE` — these env vars are validated by no Zod schema and consumed by no code (the §6.3 subagent will own the env-validation gap).
  - `apps/science-advantage/docs/archive/architecture/external-apis.md:62,195` describes GCS and SendGrid integrations as "Integrated via @google-cloud/storage SDK" and links `https://docs.sendgrid.com/api-reference`, but the corresponding source code does not exist.
  - `apps/science-advantage/docs/ai-image-generation.md:9` and `docs/specs/ai-structured-data-generation/spec.md:79–86` describe direct `@ai-sdk/openai` and `@ai-sdk/google` initialization as if it were the contract — this codifies the F-101 anti-pattern in the docs.
- **Impact:** The app has no escape hatch for storage or email without re-creating the F-101 anti-pattern. If a new route needs to upload a file or send a transactional email, the most direct path is `@google-cloud/storage` or `resend` in a route handler — which is the exact §1.1 violation we are trying to prevent. The missing `packages/ai` also means F-101's fix would have to land as an app-local adapter first and later be lifted to a shared package; a shared package from the start would avoid the second migration.
- **Suggested fix:** Track the creation of `packages/ai` and `packages/storage` (and a future `packages/email`) as part of the same F-101 migration track, or as a separate "shared-adapter-packages" prerequisite track. When storage is added for real (e.g. uploading user avatars, lesson media, exported reports), it must go through `packages/storage` from day one. Update `docs/specs/ai-structured-data-generation/spec.md` and `docs/ai-image-generation.md` to reference the new `packages/ai` interface instead of `@ai-sdk/openai` directly. The `.env.example` storage vars should be removed until the feature ships, or wired into the shared `packages/storage` adapter so they are validated at boot.

---

## Rules with no findings

- **1.5 (No Firebase) — PASS.** Zero `firebase/*` imports anywhere in `apps/science-advantage/`. `proxy.ts` uses `getSession` / `requireRole` from `@reading-advantage/auth`, the route handlers do not touch Firebase, and no test file mocks it. The inventory's note that "Some apps still use Firebase Auth" does not apply to science-advantage.
