# Line Review Evidence: primary-advantage-103

Reviewer: coder-xiaomi-mimo-v2-5/primary-advantage-103
Files assigned: 7
Lines assigned: 746

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/primary-advantage/types/index.d.ts | 1-582 | reviewed | 1 |
| apps/primary-advantage/types/types.d.ts | 1-2 | reviewed | 0 |
| apps/primary-advantage/utils/google.ts | 1-34 | reviewed | 1 |
| apps/primary-advantage/utils/openai.ts | 1-12 | reviewed | 0 |
| apps/primary-advantage/utils/resend.ts | 1-3 | reviewed | 0 |
| apps/primary-advantage/utils/storage.ts | 1-98 | reviewed | 1 |
| apps/primary-advantage/vitest.config.ts | 1-15 | reviewed | 0 |

## Findings

### LR-103-001 — Direct Google Cloud Storage SDK bypass

- Severity: High
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/utils/storage.ts:1-2`
- Evidence: Lines 1-2 import `Storage` from `@google-cloud/storage` and `fs` directly, creating a local storage adapter rather than using the shared `@reading-advantage/storage` adapter pattern. The code at line 4-18 instantiates `new Storage()` with Google Cloud credentials directly.
- Impact: Violates provider neutrality policy from AGENTS.md. Direct SDK coupling prevents swapping storage providers without touching application code. The app has a local adapter instead of using the shared backend storage abstraction.
- Recommendation: Migrate to shared `@reading-advantage/storage` adapter or create one if not yet available. This is a shared package migration blocker for the monorepo.

### LR-103-002 — Dual type definitions for Article interfaces

- Severity: Medium
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/types/index.d.ts:64-121`
- Evidence: The `ArticleShowcase` interface (lines 64-84) and `Article` interface (lines 86-121) define overlapping but different article shapes. `ArticleShowcase` has `is_read`, `is_completed`, `is_approved` boolean fields while `Article` has `sentences`, `words`, question arrays, and audio URLs. This creates two parallel type systems for article data.
- Impact: Increases type maintenance burden and can lead to confusion about which type to use. The `Article` type is more comprehensive while `ArticleShowcase` appears to be a simplified view model.
- Recommendation: Document why two article types exist and whether one should be deprecated or if they serve distinct UI vs data purposes.

### LR-103-003 — Direct AI provider SDK instantiation

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/utils/google.ts:8-17`
- Evidence: Lines 8-17 instantiate `createVertex` directly with Google Cloud credentials, creating a local AI provider configuration. The code references `process.env.VERTEX_CLIENT_EMAIL` and `process.env.VERTEX_PRIVATE_KEY` for service account authentication.
- Impact: Violates the provider neutrality principle. AI access should go through a shared adapter rather than being configured at the app level. This pattern is repeated across the monorepo.
- Recommendation: Create or use a shared `@reading-advantage/ai` adapter that centralizes provider configuration. Store this in a backend module rather than app-level utils.

## No-Finding Notes

- `apps/primary-advantage/types/types.d.ts`: reviewed line-by-line; no findings. Just a comment indicating AuthUser type moved to @reading-advantage/auth-client.
- `apps/primary-advantage/utils/openai.ts`: reviewed line-by-line; no findings. Follows the shared AI adapter pattern via `@reading-advantage/ai`.
- `apps/primary-advantage/utils/resend.ts`: reviewed line-by-line; no findings. Entire file is commented out, email functionality appears disabled.
- `apps/primary-advantage/vitest.config.ts`: reviewed line-by-line; no findings. Standard Vitest configuration with path alias and test patterns.
