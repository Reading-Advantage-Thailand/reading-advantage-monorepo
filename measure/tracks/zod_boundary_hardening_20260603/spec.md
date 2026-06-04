# Specification: Zod Boundary + Env Hardening

## Overview

Add Zod validation to the 21 `apps/science-advantage/app/api/**/route.ts` files that currently skip it. Add `parseBody(request, schema)` / `parseQuery(request, schema)` helpers so future routes cannot omit the check. Extend `lib/env.ts` to cover the full `.env.example` surface (17+ unvalidated vars). Replace 17+ raw `process.env.*` reads in `lib/ai/*`, `lib/config/*`, `lib/analytics.ts`, and `proxy.ts` with references to the validated `env` export. Fulfills AGENTS.md §6.1 ("Zod at every external boundary"), §6.2 ("No raw `JSON.parse` / `req.json()` / `formData` → typed value paths that skip Zod validation"), §6.3 ("Env vars validated at boot via Zod; missing/invalid env causes process exit"), and §6.6 ("Forms on the client use the same Zod schema as the server").

## Problem

Audited 2026-06-03. Findings F-601 (High) + F-602 (Medium) + F-302 (High, partial) + F-603 (Low) + F-604 (Low) + F-704 (Low):

### F-601 — 21 route.ts files skip Zod validation; 4 use raw `request.json()` with hand-rolled `typeof` checks
- **`request.json()` without Zod** (4 sites):
  - `app/api/lessons/[lessonSlug]/quiz/route.ts:245-253` (manual `if (!attemptId || !responses || !Array.isArray(responses))`)
  - `app/api/classes/[classId]/assignments/route.ts:158-166, 297-305` (`const { lessonId, dueAt } = body as { lessonId?: string; dueAt?: string }`)
  - `app/api/classes/[classId]/roster/route.ts:113-121` (`body as { studentId?: string }`)
  - `app/api/classes/[classId]/route.ts:111+` (manual field checks for PATCH/DELETE)
- **No `request.json()` validation at all** (15+ routes reading query/path/header params without Zod)
- **Routes that DO validate correctly (6/27)**: `classes/join/route.ts:44`, `classes/route.ts:59`, `students/[studentId]/mastery-profile/route.ts:106` (query), `ai/update-mastery/route.ts:232`, `ai/recommendations/route.ts:302`, `teachers/classes/[classId]/intervention-alerts/route.ts:65` (query)
- **2 unvalidated `request.json()` sites are destructive handlers** (assignments POST/DELETE, roster DELETE) — High-severity per protocol.

### F-602 — `lib/env.ts` Zod schema covers only 5/22+ env vars
- `lib/env.ts:3-15` declares 5 fields: `DATABASE_URL`, `NODE_ENV`, `NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE`, `DEV_AUTH_ENABLED`, `REDIS_URL`.
- `.env.example` lists 22+ vars; 17+ are unvalidated: `DIRECT_DATABASE_URL`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `AI_RECOMMENDER_*` (8 vars), `AI_IMAGE_*` (3 vars), `GOOGLE_CLOUD_*` (3 vars), `NEXT_PUBLIC_*` (2 vars).
- **Direct unvalidated env reads in production code**:
  - `lib/ai/recommendation-service.ts:55-60` (3 reads)
  - `lib/ai/image-generator.ts:29-39` (4 reads)
  - `lib/config/ai.ts:15-24` (8 reads)
  - `lib/config/ai-images.ts:14-20` (6 reads)
  - `lib/config/features.ts:2-4` (3 reads)
  - `lib/analytics.ts:17` (1 read, redundant)
  - `lib/auth/session.ts:97` (1 read, redundant)
  - `proxy.ts:25` (1 read, redundant)
- **`DATABASE_URL` defaults to `postgresql://localhost:5432/test`** — a test-only URL silently used in production if env not set.

### F-302 (partial) — Zod contracts on the route layer
- This track covers the **route layer** (request bodies, query, path). The domain layer (Track 8) covers the per-function Zod schemas in `packages/domain/src/`.

### F-603 — Two Zod schemas for the same domain (`createClassSchema` + `createClassFormSchema`)
- `lib/validations/class.ts:26-30, 38-42` (server) and `:50-58` (form). Form pipes through server schema's field constraints. No hand-written parallel types.

### F-604 — Form schemas live in app-local `lib/validations/`
- `lib/validations/{class,student-classes}.ts` are app-local. `packages/types` exists in the monorepo but is not consumed by `apps/science-advantage/`.
- Drift risk: adding a field to one app's schema doesn't propagate to others.

### F-704 — `body as { ... }` casts in `app/api/classes/[classId]/assignments/route.ts`
- Same as F-601's destructive-handler concern; subsumed.

## Why

- AGENTS.md §6 has mandated Zod at every external boundary since the monorepo was scaffolded. This track is the implementation.
- The 2 destructive handlers (assignments POST/DELETE, roster DELETE) are an immediate data-integrity risk: malformed bodies crash in uncontrolled ways or slip through to Drizzle which raises 500s.
- The unvalidated env reads are a deployment-time risk: a misspelled `AI_RECOMMENDER_HASH_SECRET` is not caught until first request.
- The lenient `DATABASE_URL` default (`postgresql://localhost:5432/test`) is a real production risk: if the env is missing in a Vercel deploy, the app silently connects to a non-existent local DB and fails on first query.

## Functional Requirements

### FR-1: Zod Schemas for All 21 Routes

- Add a Zod schema to `lib/validations/` for each missing route. Reuse `lib/forms/from-zod` where possible.
- Schemas to add:
  - `submitQuizAttemptSchema` (for `app/api/lessons/[lessonSlug]/quiz/route.ts:245-253`)
  - `createAssignmentSchema` (for `app/api/classes/[classId]/assignments/route.ts:158-166`)
  - `deleteAssignmentSchema` (for `app/api/classes/[classId]/assignments/route.ts:297-305`)
  - `removeStudentFromRosterSchema` (for `app/api/classes/[classId]/roster/route.ts:113-121`)
  - `updateClassSchema` / `deleteClassSchema` (for `app/api/classes/[classId]/route.ts:111+`)
  - 16 more for the routes that don't read bodies but should validate path/query/header params
- Per schema: write a unit test asserting `safeParse` returns the expected shape; add an integration test asserting the route returns 400 on malformed input.

### FR-2: `parseBody` / `parseQuery` / `parsePath` Helpers

Create `lib/validations/api-helpers.ts`:

```ts
export async function parseBody<T>(request: Request, schema: ZodSchema<T>): Promise<T>;
export function parseQuery<T>(request: Request, schema: ZodSchema<T>): T;
export function parsePath<T>(params: Record<string, string | string[]>, schema: ZodSchema<T>): T;
```

Each helper returns the parsed value or throws a `ValidationError` with HTTP 400 + `{ error: 'invalid_input', details: ZodError }`.

- Write tests: parseBody returns the parsed value, throws ValidationError on bad input.
- Wire into the 4 unvalidated `request.json()` sites first (highest priority).

### FR-3: Extend `lib/env.ts` to Cover Full `.env.example`

- Extend the Zod schema in `lib/env.ts:3-15` to cover the full `.env.example` surface:
  - `DATABASE_URL` (required, URL format)
  - `DIRECT_DATABASE_URL` (required for migrations; URL format)
  - `DATABASE_POOL_MAX` (optional, default 3, integer)
  - `REDIS_URL` (optional, URL format)
  - `OPENAI_API_KEY` (required if `AI_PROVIDER === 'openai'`, string)
  - `GEMINI_API_KEY` (required if `AI_PROVIDER === 'google'`, string)
  - `AI_RECOMMENDER_MODEL_PRIMARY` (optional, default `gpt-5-mini`)
  - `AI_RECOMMENDER_MODEL_SECONDARY` (optional, default `gemini-2.5-flash`)
  - `AI_RECOMMENDER_MODEL` (deprecated alias, optional)
  - `AI_RECOMMENDER_TIMEOUT_MS` (optional, default 10000, integer)
  - `AI_RECOMMENDATION_TIMEOUT_MS` (optional, integer, separate from above)
  - `AI_RECOMMENDER_CACHE_TTL_SECONDS` (optional, default 900, integer)
  - `AI_RECOMMENDER_HASH_SECRET` (required, min 32 chars via `.refine`)
  - `AI_RECOMMENDER_MAX_REQUESTS_PER_MIN` (optional, default 3, integer)
  - `AI_IMAGE_PRIMARY_MODEL` (optional, default `google/gemini-3-pro-image`)
  - `AI_IMAGE_FALLBACK_MODELS` (optional, default `openai/dall-e-3`, comma-separated)
  - `AI_IMAGE_MAX_WIDTH` (optional, integer)
  - `AI_IMAGE_MAX_BYTES` (optional, integer)
  - `GOOGLE_CLOUD_PROJECT_ID` (optional, removed if F-102 latent path chosen; see Track 6)
  - `GOOGLE_CLOUD_STORAGE_BUCKET` (optional, ditto)
  - `GOOGLE_CLOUD_KEY_FILE` (optional, must exist if set via `.refine`)
  - `NODE_ENV` (`development` | `production` | `test`)
  - `DEV_AUTH_ENABLED` (optional, boolean)
  - `NEXT_PUBLIC_FEATURE_AI_RECOMMENDATION` (optional, boolean)
  - `NEXT_PUBLIC_STRUCTURED_CONTENT_ENABLED` (optional, boolean)
  - `NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE` (optional, boolean)
- Add `.refine` rules:
  - `AI_RECOMMENDER_HASH_SECRET` must be ≥ 32 chars.
  - `GOOGLE_CLOUD_KEY_FILE` must point to an existing file (if set).
  - `DATABASE_URL` and `DIRECT_DATABASE_URL` must have different hostnames (don't accidentally use the same DB for app + migrations).
- **At boot time** (top-level `envSchema.parse(process.env)`), missing required vars throw with a clear message. The `lib/env.test.ts` tests must continue to pass.

### FR-4: Replace 17+ Raw `process.env.*` Reads

- `lib/ai/recommendation-service.ts:55-60` — replace with `env.OPENAI_API_KEY`, `env.GEMINI_API_KEY`, `env.AI_RECOMMENDER_HASH_SECRET`, etc.
- `lib/ai/image-generator.ts:29-39` — same.
- `lib/config/ai.ts:15-24` — same.
- `lib/config/ai-images.ts:14-20` — same.
- `lib/config/features.ts:2-4` — same.
- `lib/analytics.ts:17` — replace with `env.NODE_ENV`.
- `lib/auth/session.ts:97` — replace with `env.NODE_ENV`. (Note: this file is deleted in Track 3 Argon2id + Auth Flatten; coordinate the timing.)
- `proxy.ts:25` — replace with `env.DEV_AUTH_ENABLED`.
- Grep gate: `rg "process\.env\." apps/science-advantage/lib/ apps/science-advantage/proxy.ts` returns 0 hits (modulo intentionally-test-only reads in test files).

### FR-5: Form Schema Sharing Across Apps (F-604 partial)

- Extract `lib/validations/{class,student-classes}.ts` and `lib/schemas/lesson-content.schema.ts` to `packages/types/src/contracts/`.
- Re-export from `packages/types/src/index.ts` barrel.
- Update `apps/science-advantage/` to import from `@reading-advantage/types`.
- Coordinate with other apps (reading-advantage, primary-advantage) — they have their own `lib/validations/`; decide whether to migrate or leave for a separate per-app track.
- **Phase 2 only** — the science-advantage migration is in scope; the other apps are optional.

### FR-6: Two-Schema Pattern Documentation (F-603)

- Document the `createClassSchema` + `createClassFormSchema` pattern in `lib/validations/README.md`.
- Note: a single shared "createClassInput" base schema with both server and form views is the cleaner approach. This track does not refactor; future maintenance follows the documented pattern.

## Non-Functional Requirements

- **Zero `body as { ... }` casts** in `apps/science-advantage/app/`. Grep gate: `rg "body as \{" apps/science-advantage/app/` returns 0 hits.
- **Zero raw `process.env.*` reads** in production code (modulo test fixtures). Grep gate: `rg "process\.env\." apps/science-advantage/lib/ apps/science-advantage/proxy.ts` returns 0 hits.
- **All 27 `route.ts` files Zod-validate** body, query, and path params.
- **Boot-time env validation fails fast** on missing required vars.
- **Lint + type-check + build** green for `apps/science-advantage` and the affected packages.

## Acceptance Criteria

1. 21 new Zod schemas in `lib/validations/`.
2. 4 unvalidated `request.json()` sites replaced with `parseBody(req, schema)`.
3. 0 `body as { ... }` casts in `apps/science-advantage/app/`.
4. `lib/env.ts` Zod schema covers 100% of `.env.example` vars.
5. 0 raw `process.env.*` reads in `apps/science-advantage/lib/` and `proxy.ts` (modulo test fixtures).
6. `lib/env.test.ts` covers all new env vars with passing tests.
7. Integration tests for the 4 destructive handlers: malformed body returns 400 with `{ error: 'invalid_input', details }`.
8. `pnpm turbo run test --filter=science-advantage` exits 0.
9. `pnpm turbo run build --filter=science-advantage` exits 0.
10. `pnpm turbo run check-types --filter=science-advantage` exits 0.

## Out of Scope

- The per-domain-function Zod contracts in `packages/domain/src/` (Track 8 covers this).
- Cross-app schema sharing for reading-advantage, primary-advantage, www-reading-advantage, codecamp-advantage — separate per-app tracks.
- Removing the test-only `process.env.*` reads in `lib/__tests__/` and `scripts/__tests__/`.
- Migrating `lib/forms/from-zod` to a shared package — out of scope.

## Constraints & Risks

- **Risk: 21 schemas is a lot of code; some routes may have non-trivial validation logic that doesn't map cleanly to Zod.** Mitigation: start with the 4 destructive handlers (highest impact); the other 17 are simpler (path/query param validation).
- **Risk: Boot-time env validation breaks the build if any env var is missing.** Mitigation: ensure `.env.example` is comprehensive and CI sets the required vars; add a `scripts/check-env.ts` that runs in CI to catch missing vars.
- **Risk: The `lib/auth/session.ts:97` `process.env.NODE_ENV` read is deleted in Track 3.** Mitigation: this track replaces the read; Track 3 deletes the file. Either order works; coordinate.
- **Risk: Cross-app schema sharing (F-605) is a non-trivial refactor with package boundary implications.** Mitigation: Phase 2 is optional; ship the science-advantage migration in Phase 1 and defer the cross-app work to a future track.

## References

- `measure/audit-reports/science-advantage_20260603/findings.md` §Section 6 (F-601, F-602, F-603, F-604) and §Section 2 (F-704) and §Section 3 (F-302 partial)
- `measure/audit-reports/science-advantage_20260603/migration-tracks.md` §Track 7
- `lib/env.ts:3-15` (the Zod schema to extend)
- `.env.example` (the full surface to cover)
- `lib/forms/from-zod` (the existing form-coercion helper to reuse)
- AGENTS.md §6: "Runtime validation is required at all external boundaries. Do not rely solely on TypeScript types."
