# Shared Foundation Checklist — Phase 4-5

> **Track:** `shared_foundation_review_20260626`
> **Scoring:** ✅ Pass | ⚠️ Partial | ❌ Fail | N/A Not applicable

---

## Phase 4: Provider Adapters

### AI Adapter (`@reading-advantage/ai`)

| # | Criterion | Score | Evidence |
|---|-----------|-------|----------|
| 4.1 | Provider-neutral interface exists | ✅ | `AIClient` interface with 6 methods in `src/types.ts:131-172` |
| 4.2 | App code does not import provider SDKs directly | ✅ | `phase-arch-no-direct-sdk.test.ts` confirms zero `from "ai"` / `from "@ai-sdk/*"` in apps/** |
| 4.3 | Provider implementations accept config via constructor (no env reads in driver) | ✅ | `OpenAIProvider`, `GoogleProvider`, `OpenRouterProvider` all receive `apiKey` via constructor |
| 4.4 | Env validation via Zod schema at factory level | ✅ | `aiConfigSchema` in `src/client.ts:9-14` |
| 4.5 | Error wrapping with machine-readable codes | ✅ | `AIClientError` base class with `code` field; `ProviderNotConfiguredError`, `SchemaValidationError`, `UnsupportedError` |
| 4.6 | Singleton reset for test isolation | ✅ | `resetAIClient()` in `src/client.ts:113-115` |
| 4.7 | Test coverage for all providers | ✅ | Mock, OpenAI, Google, OpenRouter, provider-selector tests all present |
| 4.8 | No retry logic duplication | ⚠️ | `maxRetries: 1` passed to SDK; no app-level retry wrapper. Adequate but retry policy is implicit in SDK defaults |

### Storage Adapter (`@reading-advantage/storage`)

| # | Criterion | Score | Evidence |
|---|-----------|-------|----------|
| 4.9 | Provider-neutral interface exists | ✅ | `StorageClient` interface with 5 methods in `src/client.ts:33-73` |
| 4.10 | App code does not import AWS SDK directly | ✅ | `@aws-sdk/*` imports only in `drivers/s3.ts` |
| 4.11 | Env validation via Zod schema | ✅ | `storageConfigSchema` in `src/client.ts:8-15` |
| 4.12 | Error handling for missing config | ✅ | `ProviderNotConfiguredError` thrown by `getStorageClient()` |
| 4.13 | Interface completeness | ⚠️ | No `get()` (download/read) method. Only `getUrl`/`getSignedUrl` for reads. May be intentional if downloads are always proxied via URL |
| 4.14 | Test coverage | ✅ | 12 tests across factory, S3 driver, and URLs |

### GitHub Integration (`@reading-advantage/integrations-github`)

| # | Criterion | Score | Evidence |
|---|-----------|-------|----------|
| 4.15 | Provider-neutral interface exists | ✅ | `GitHubClient` interface with 3 methods in `src/client.ts:39-67` |
| 4.16 | No Octokit/SDK dependency | ✅ | Uses native `fetch` + `node:crypto` only |
| 4.17 | Env validation via Zod schema | ✅ | `githubConfigSchema` in `src/client.ts:83-87` |
| 4.18 | Test coverage | ✅ | 5 tests for client and factory |

### Webhooks (`@reading-advantage/webhooks`)

| # | Criterion | Score | Evidence |
|---|-----------|-------|----------|
| 4.19 | Webhook signature verification | ✅ | HMAC-SHA256 with timing-safe comparison in `src/github-client.ts:128-153` |
| 4.20 | Replay attack protection | ✅ | Timestamp skew check (5 min window) in `src/github-client.ts:108-113` |
| 4.21 | Payload validation via Zod | ✅ | `githubWebhookPayloadSchema.safeParse()` in `src/github.ts:135-139` |
| 4.22 | Error responses are consistent | ✅ | JSON error responses with appropriate HTTP status codes (401, 400, 500) |
| 4.23 | Structured logging | ❌ | All logging uses `console.log/warn/error` — no structured logging library. 20 console.* calls in production code |

---

## Phase 5: Shared UI/Utils/Types/Config

### Types (`@reading-advantage/types`)

| # | Criterion | Score | Evidence |
|---|-----------|-------|----------|
| 5.1 | All types derived from Zod schemas | ✅ | Every type in `src/index.ts` uses `z.infer<typeof schema>` |
| 5.2 | Contracts at external boundaries | ✅ | Zod schemas used for tRPC inputs, API payloads, form validation |
| 5.3 | Test coverage | ❌ | No test script, zero test files |
| 5.4 | Sub-path exports for selective imports | ✅ | `./contracts/class` sub-path for science-advantage contracts |
| 5.5 | No schema duplication risk | ⚠️ | `createClassSchema` exists in both `index.ts:21` and `contracts/class.ts:35` with different shapes (intentional but confusing) |

### UI Components (`@reading-advantage/ui`)

| # | Criterion | Score | Evidence |
|---|-----------|-------|----------|
| 5.6 | Components use Radix primitives for accessibility | ✅ | All interactive components wrap Radix UI |
| 5.7 | `forwardRef` pattern for ref forwarding | ✅ | Button, Input, Checkbox, Alert all use `React.forwardRef` |
| 5.8 | `displayName` set for all components | ✅ | All components set `displayName` |
| 5.9 | Consistent styling via `cn()` from utils | ✅ | All components import `cn` from `@reading-advantage/utils` |
| 5.10 | Test coverage | ⚠️ | 10 tests covering Button, Card, Dialog, Input, Tabs. Missing: Alert, AlertDialog, Avatar, Badge, Checkbox, Label, Progress, Separator, Skeleton, Tooltip tests |
| 5.11 | `role="alert"` on Alert | ✅ | `src/components/Alert.tsx:28` |
| 5.12 | Focus-visible ring styles | ✅ | `focus-visible:ring-1` on Button, Input, Checkbox |

### Utils (`@reading-advantage/utils`)

| # | Criterion | Score | Evidence |
|---|-----------|-------|----------|
| 5.13 | Single source of truth for `cn()` | ❌ | `cn()` duplicated in `apps/www-reading-advantage/src/lib/utils.ts` |
| 5.14 | Sub-path exports | ✅ | `./cn` and `./hooks` sub-paths |
| 5.15 | Test coverage | ✅ | 22 tests for cn, ffmpeg-process, useLocalStorage |
| 5.16 | Node-only utilities properly scoped | ✅ | `ffmpeg-process.ts` uses `node:child_process` — only callable server-side |

### Config (`@reading-advantage/config`)

| # | Criterion | Score | Evidence |
|---|-----------|-------|----------|
| 5.17 | Shared tsconfig base | ✅ | `tsconfig/base.json` with `strict: true` |
| 5.18 | Shared ESLint config | ✅ | `eslint/index.js` exports `baseConfig` and `plugins` |
| 5.19 | Shared Tailwind config | ✅ | `tailwind/tailwind.config.ts` with design tokens |
| 5.20 | Test coverage for configs | ✅ | `__tests__/` directory present |

---

## Cross-Cutting Concerns

| # | Criterion | Score | Evidence |
|---|-----------|-------|----------|
| X.1 | No direct provider SDK usage in app code | ⚠️ | `apps/primary-advantage/server/utils/genaretors/image-generator.ts:16` imports `Uploadable` from `openai/uploads` directly |
| X.2 | Package boundary hygiene | ⚠️ | `packages/webhooks` has `exports: { ".": "./src/index.ts" }` — exposes raw TS source, not compiled dist |
| X.3 | Duplicated GitHub client logic | ❌ | `webhooks/src/github-client.ts` duplicates JWT auth, signature verification, and PR API from `integrations/github` |
| X.4 | Legacy scripts bypass adapters | ❌ | `packages/reading-advantage-scripts` uses old `openai` SDK v4 directly, CommonJS |
| X.5 | Consistent error class hierarchy | ⚠️ | `ai` package has `AIClientError` hierarchy; `storage` has standalone `ProviderNotConfiguredError`; `integrations/github` has `GitHubClientError`. No shared error base |
| X.6 | All packages build successfully | ✅ | All packages with `build` scripts pass `tsc` or `tsup` |
