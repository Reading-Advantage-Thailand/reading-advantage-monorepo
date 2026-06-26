# Shared Foundation Inventory — Phase 4-5: Provider Adapters and Shared UI/Utils/Types/Config

> **Track:** `shared_foundation_review_20260626`
> **Phase:** 4-5 (Provider Adapters + Shared UI/Utils/Types/Config)
> **Baseline SHA:** `86da18263307ac8dd2b5e2986cdeb33095af062d`

---

## Package Inventory

### `@reading-advantage/ai` (packages/ai)

| Attribute | Value |
|-----------|-------|
| **Version** | 0.1.0 |
| **Type** | ESM (`"type": "module"`) |
| **Entry** | `./dist/index.js` |
| **Build** | `tsc` |
| **Test framework** | Vitest |
| **Dependencies** | `ai` ^5.0.201, `@ai-sdk/openai` ^2.0.68, `@ai-sdk/google` ^2.0.36, `@ai-sdk/google-vertex` ^3.0.142, `zod` ^3.25.76 |
| **Source files** | `src/index.ts`, `src/client.ts`, `src/errors.ts`, `src/types.ts`, `src/providers/{openai,google,openrouter,mock}.ts` |
| **Test files** | 25 files (core + phase-specific tests from prior migration track) |
| **Exports** | Types (`AIClient`, `GenerateObjectInput`, etc.), factory (`createAIClient`, `getAIClient`, `resetAIClient`), providers (`OpenAIProvider`, `GoogleProvider`, `OpenRouterProvider`, `MockProvider`), re-exports from `ai` SDK |

**Adapter seam:** Clean. `AIClient` interface defines 6 methods (`generateObject`, `generateObjectFromMedia`, `generateImage`, `generateText`, `transcribeAudio`, `streamText`). Provider implementations accept config via constructor, never read `process.env` directly (env reads are in `createAIClient` factory only).

**SDK coupling:** Acceptable. The `ai` SDK is used inside provider implementations only. App code uses `@reading-advantage/ai` exports. The barrel re-exports `createOpenAI`, `createGoogleGenerativeAI`, `createVertex` from provider SDKs (used by webhooks package).

**Env validation:** Uses `zod` schema in `createAIClient` for config validation. Individual provider constructors receive explicit `apiKey`.

**Retry/error:** All provider methods wrap errors in `AIClientError` with `PROVIDER_ERROR` code. `maxRetries: 1` is passed to the AI SDK. No custom retry logic.

---

### `@reading-advantage/storage` (packages/storage)

| Attribute | Value |
|-----------|-------|
| **Version** | 0.1.0 |
| **Type** | ESM |
| **Entry** | `./dist/index.js` + `./dist/client.js` |
| **Build** | `tsc` |
| **Test framework** | Vitest |
| **Dependencies** | `@aws-sdk/client-s3` ^3.750.0, `@aws-sdk/s3-request-presigner` ^3.750.0, `zod` ^3.25.76 |
| **Source files** | `src/index.ts`, `src/client.ts`, `src/factory.ts`, `src/urls.ts`, `src/drivers/s3.ts` |
| **Test files** | 3 files (`factory.test.ts`, `s3-driver.test.ts`, `urls.test.ts`) |
| **Exports** | Types (`StorageClient`, `StorageConfig`, `PutOptions`), factory (`createStorageClient`, `getStorageClient`, `resetStorageClient`), driver (`S3StorageDriver`), `getStorageUrl` |

**Adapter seam:** Clean. `StorageClient` interface defines 5 methods (`put`, `getUrl`, `getSignedUrl`, `delete`, `exists`). Single driver `S3StorageDriver` implements the interface. Missing: no `get` (download) method — interface only has `getUrl`/`getSignedUrl` for reads.

**SDK coupling:** Acceptable. `@aws-sdk/client-s3` is used only inside `drivers/s3.ts`. Application code depends on `StorageClient` interface.

**Env validation:** `storageConfigSchema` (Zod) validates all required fields. `getStorageClient()` throws `ProviderNotConfiguredError` if validation fails.

**Retry/error:** No explicit retry logic. S3 client uses SDK defaults. `exists()` swallows errors and returns `false`.

---

### `@reading-advantage/webhooks` (packages/webhooks)

| Attribute | Value |
|-----------|-------|
| **Version** | 0.1.0 |
| **Type** | ESM |
| **Entry** | `./src/index.ts` (raw TS — no dist build) |
| **Build** | `tsc` |
| **Test framework** | Vitest |
| **Dependencies** | `hono` ^4.7.0, `@hono/node-server` ^1.14.0, `@reading-advantage/ai`, `@reading-advantage/db`, `@reading-advantage/domain`, `@reading-advantage/types` |
| **Source files** | `src/index.ts`, `src/github.ts`, `src/github-client.ts`, `src/health.ts` |
| **Test files** | 6 files |
| **Exports** | Default Hono app |

**Architecture:** Hono-based HTTP server for webhook ingestion. `github.ts` handles PR webhook events with signature verification, payload validation, and LLM code review pipeline. `github-client.ts` provides GitHub App JWT auth, signature verification, and PR API operations.

**Webhook authentication:** HMAC-SHA256 signature verification via `verifyWebhookSignature()`. Replay attack protection via timestamp skew check (`MAX_TIMESTAMP_SKEW_SECONDS = 300`). Timing-safe comparison.

**Notable:** The `github.ts` webhook handler imports from `./github-client` without `.js` extension (line 16), which is an ESM compatibility risk. However, the package is consumed via `tsx watch` (dev) and the TypeScript config handles this.

---

### `@reading-advantage/integrations-github` (packages/integrations/github)

| Attribute | Value |
|-----------|-------|
| **Version** | 0.1.0 |
| **Type** | ESM |
| **Entry** | `./dist/index.js` + `./dist/client.js` |
| **Build** | `tsc` |
| **Test framework** | Vitest |
| **Dependencies** | `zod` ^3.25.76 (no GitHub SDK dependency) |
| **Source files** | `src/index.ts`, `src/client.ts`, `src/factory.ts`, `src/drivers/rest.ts` |
| **Test files** | 2 files |
| **Exports** | Types (`GitHubClient`, `GitHubConfig`, `PracticeIssue`, `Repository`, `ListIssuesOptions`), factory (`createGitHubClient`, `getGitHubClient`, `resetGitHubClient`), driver (`GitHubRestDriver`) |

**Adapter seam:** Clean. `GitHubClient` interface defines 3 methods (`getPracticeIssues`, `getInstallationTokenForRepo`, `listRepositoriesForInstallation`). Single driver `GitHubRestDriver` implements it using native `fetch` — no Octokit SDK dependency.

**SDK coupling:** None. Uses native `fetch` and `node:crypto` for JWT signing. This is provider-neutral and lightweight.

**Env validation:** `githubConfigSchema` (Zod) validates `appId` and `privateKey` are non-empty strings.

**Retry/error:** `GitHubClientError` wraps HTTP errors with status code. No explicit retry logic.

**Notable:** This package has a clean adapter pattern with zero SDK dependencies. However, the `webhooks` package has its own parallel GitHub client implementation (`github-client.ts`) that duplicates JWT auth, signature verification, and PR API operations — this is a significant duplication issue (see findings).

---

### `@reading-advantage/types` (packages/types)

| Attribute | Value |
|-----------|-------|
| **Version** | 0.1.0 |
| **Type** | ESM |
| **Entry** | `./dist/index.js` |
| **Build** | `tsc` |
| **Test framework** | None (no test script) |
| **Dependencies** | `zod` ^3.24.0 |
| **Source files** | `src/index.ts`, `src/codecamp.ts`, `src/contracts/class.ts` |
| **Test files** | 0 |
| **Exports** | Zod schemas + inferred types for User, Classroom, Assignment, Auth, Article, Activity, LessonProgress, Report, Student, Session, Codecamp, Science-Advantage contracts. Branded types (`PolymorphicQuestionId`, `ExternalLessonId`). |

**Type safety:** All types are Zod-schema-derived. Schemas validate at external boundaries. `contracts/class.ts` exports science-advantage class contracts with re-aliases to avoid name collisions.

**Notable:** The `createClassSchema` is defined in both `src/index.ts` (line 21) and `src/contracts/class.ts` (line 35) with different shapes. The main index exports `createClassSchema` (simple) and re-exports `createClassSchema as scienceCreateClassSchema` from `contracts/class.ts` (with gradeLevel and standardsAlignment). This dual-schema pattern is intentional but confusing — the main `createClassSchema` is used by reading-advantage classrooms while the science variant is used by science-advantage.

---

### `@reading-advantage/ui` (packages/ui)

| Attribute | Value |
|-----------|-------|
| **Version** | 0.0.0 |
| **Type** | ESM |
| **Entry** | `./dist/index.js` |
| **Build** | `tsup` (ESM + DTS) |
| **Test framework** | Vitest + @testing-library/react |
| **Dependencies** | Radix UI primitives (alert-dialog, avatar, checkbox, dialog, icons, label, progress, separator, slot, tabs, tooltip), `class-variance-authority`, `lucide-react`, `tailwind-merge`, `@reading-advantage/utils` |
| **Source files** | 15 component files in `src/components/` |
| **Test files** | 5 files (Button, Card, Dialog, Input, Tabs) |
| **Exports** | 15 component families (Button, Card, Dialog, Input, Tabs, Label, Badge, Separator, Skeleton, Avatar, Alert, AlertDialog, Progress, Checkbox, Tooltip) |

**Accessibility:** Components use Radix UI primitives which provide ARIA attributes. `Alert` has `role="alert"`. `Button` uses `focus-visible:ring-1`. Missing: no `aria-label` props on components that could benefit from them (e.g., icon-only buttons). Checkbox has no explicit `aria-label` or associated `<Label>` requirement.

**Boundary hygiene:** Clean. Uses `@reading-advantage/utils` for `cn()` helper. No direct app dependencies.

---

### `@reading-advantage/utils` (packages/utils)

| Attribute | Value |
|-----------|-------|
| **Version** | 0.0.0 |
| **Type** | ESM |
| **Entry** | `./dist/index.js` + `./dist/cn.js` + `./dist/hooks/index.js` |
| **Build** | `tsup` (ESM + DTS) |
| **Test framework** | Vitest |
| **Dependencies** | `clsx`, `tailwind-merge` |
| **Source files** | `src/index.ts`, `src/cn.ts`, `src/ffmpeg-process.ts`, `src/hooks/{index,useLocalStorage,useMediaQuery}.ts` |
| **Test files** | 3 files (cn, ffmpeg-process, useLocalStorage) |
| **Exports** | `cn()`, `probeDurationSeconds()`, `concatMp3Files()`, `useLocalStorage()`, `useMediaQuery()` |

**Duplicated utilities:** `cn()` is duplicated in `apps/www-reading-advantage/src/lib/utils.ts` (identical implementation). This should be the single source of truth.

**Notable:** The `cn` export has a dedicated sub-path export (`@reading-advantage/utils/cn`) for tree-shaking. The hooks sub-path is also exported. `ffmpeg-process.ts` contains Node.js-specific `child_process` utilities that are not browser-safe.

---

### `@reading-advantage/config` (packages/config)

| Attribute | Value |
|-----------|-------|
| **Version** | 0.0.0 |
| **Type** | ESM |
| **Exports** | `./tsconfig` (base.json), `./eslint` (index.js), `./tailwind` (tailwind.config.ts) |
| **Build** | None (config files only) |
| **Test framework** | Vitest (for config validation tests) |
| **Dependencies** | ESLint, TypeScript, Tailwind CSS, eslint-plugin-react, eslint-plugin-react-hooks |

**Purpose:** Shared configuration presets for tsconfig, eslint, and tailwind across all packages and apps.

**Notable:** The `tailwind.config.ts` uses `require("tailwindcss-animate")` (CJS style) in an ESM package. The ESLint config exports `plugins` and `baseConfig` for consumption. The tsconfig base has `strict: true` enabled.

---

### `@reading-advantage/scripts` (packages/reading-advantage-scripts)

| Attribute | Value |
|-----------|-------|
| **Version** | 0.1.0 |
| **Type** | CommonJS (no `"type": "module"`) |
| **Test framework** | Jest (`--passWithNoTests`) |
| **Dependencies** | `openai` ^4.57.3 (OLD SDK — v4), `@ai-sdk/google-vertex` ^3.0.142, `@ai-sdk/openai` ^2.0.68, `ai` ^5.0.95, `@google-cloud/storage`, `axios`, `csv-parser`, `csv-writer`, `dotenv` |
| **Source files** | `generateArticle.js`, `generateQuestion.js`, `googleai.js`, `readabilityCalculator.js` |

**Legacy status:** This is a legacy script surface. Uses CommonJS (`require`), the OLD OpenAI SDK v4 (`import { Configuration, OpenAIApi } from 'openai'`), and direct `process.env` reads. Not built, not linted, not part of the quality gates.

**SDK coupling:** Direct coupling to `openai` (old v4 SDK), `@google-cloud/storage`, and `@ai-sdk/*` packages. These scripts bypass the adapter pattern entirely.

---

## Gate Results Summary

| Package | Lint | Check-Types | Tests | Notes |
|---------|------|-------------|-------|-------|
| `@reading-advantage/ai` | ✅ (cached) | ✅ (cached) | ❌ 13 failing | Pre-existing failures from prior SDK migration track (phase-0, phase-11, phase-12 tests) |
| `@reading-advantage/storage` | ✅ (cached) | ✅ (cached) | ✅ 12/12 | |
| `@reading-advantage/webhooks` | ✅ (cached) | ✅ (cached) | ✅ 78/78 | |
| `@reading-advantage/integrations-github` | ✅ | ✅ | ✅ 5/5 | |
| `@reading-advantage/types` | ✅ (cached) | ✅ (cached) | N/A | No test script |
| `@reading-advantage/ui` | ✅ | ✅ | ✅ 10/10 | |
| `@reading-advantage/utils` | ✅ | ✅ | ✅ 22/22 | |
| `@reading-advantage/config` | N/A | N/A | ✅ | Config-only package |
| `@reading-advantage/scripts` | N/A | N/A | N/A | Legacy; Jest with `--passWithNoTests` |
