# Shared Foundation Inventory — Track-Level Synthesis

> **Track:** `shared_foundation_review_20260626`  
> **Baseline SHA:** `86da18263307ac8dd2b5e2986cdeb33095af062d`  
> **Synthesis phase:** Phase 6-7 Reporting and Acceptance  
> **Evidence sources:** Phase 1 database/tenancy, Phase 2 auth/security, Phase 3 domain/API, and Phase 4-5 adapter/UI result JSONs plus package manifests and `build-graph stats ./graph.db`.

This inventory is a track-level synthesis. It replaces phase-only summaries and covers every package listed in `spec.md`.

---

## Graph and repository context

`build-graph stats ./graph.db` was run during acceptance and reported:

| Metric | Count |
|---|---:|
| Graph nodes | 22,185 |
| Graph edges | 46,017 |
| Graph files | 2,715 |
| Functions | 5,479 |
| Interfaces | 1,634 |
| Type aliases | 1,264 |
| Route nodes | 623 |
| Schema nodes | 544 |

Shared package graph file counts reported by the graph:

| Package graph label | Files |
|---|---:|
| `domain` | 134 |
| `db` | 61 |
| `api` | 45 |
| `ai` | 38 |
| `auth` | 34 |
| `ui` | 22 |
| `webhooks` | 10 |
| `utils` | 9 |
| `storage` | 8 |
| `github` | 6 |
| `auth-client` | 5 |
| `types` | 3 |

---

## In-scope package inventory

### `@reading-advantage/db` (`packages/db`)

| Attribute | Value |
|---|---|
| Version / module | `0.1.0`, ESM |
| Public exports | `.`, `./schema`, `./client`, `./seed` from `dist` |
| Scripts | `build`, `generate`, `migrate`, `push`, `studio`, `seed:codecamp`, `doctor`, `lint`, `test`, `check-types` |
| Key dependencies | `drizzle-orm ^0.45.0`, `drizzle-zod ^0.7.0`, `postgres ^3.4.5` |
| Review coverage | Schemas, migration journal, migration sentinels, seed/export surface, version declarations |

**Inventory notes:** This package owns Drizzle schema and migrations. Phase 1 found migration and schema hygiene issues: unclassified primary tables surfaced through domain tenant coverage, missing sentinel probes for migrations `0022`/`0023`, a table/export typo (`sentencs...`), inconsistent Drizzle versions in dependent packages, and a high-blast-radius historical reshape migration that needs explicit follow-up verification.

### `@reading-advantage/auth` (`packages/auth`)

| Attribute | Value |
|---|---|
| Version / module | `0.1.0`, ESM |
| Public exports | `.` from `dist/index.js` |
| Scripts | `build`, `lint`, `test`, `check-types` |
| Key dependencies | `@node-rs/argon2`, `@reading-advantage/db`, transitional `bcryptjs`, `drizzle-orm ^0.44.0`, `zod` |
| Review coverage | Password hashing, session creation/deletion, reset-password/register flows, audit events, permissions, rate limiting, tenant access helpers |

**Inventory notes:** Phase 2 verified the June auth hardening track's FRs are present in implementation. Residual monitor items are rate limiting (in-memory per process), CSRF token absence, environment-gated cookie `secure`, transitional `bcryptjs`, shallow nested audit redaction, and client response validation.

### `@reading-advantage/auth-client` (`packages/auth-client`)

| Attribute | Value |
|---|---|
| Version / module | `0.1.0`, ESM |
| Public exports | `.` from `dist/index.js` |
| Scripts | `build`, `lint`, `test`, `check-types` |
| Key dependencies | `@reading-advantage/types`, React peer dependency |
| Review coverage | Provider state, login/logout/session flows, auth response handling |

**Inventory notes:** Phase 2 found no JWT/Firebase remnants in the shared auth client. The main gap is that the login response is not validated against a Zod schema before setting auth state.

### `@reading-advantage/domain` (`packages/domain`)

| Attribute | Value |
|---|---|
| Version / module | `0.1.0`, ESM |
| Public exports | Root plus subpaths for `articles`, `assignments`, `classes`, `progress`, `reports`, `students`, `users`, `codecamp`, `mastery`, `ai`, `interventions`, `sales`, `curriculum`, `teachers`, `gamification`, `quiz`, `audit/dsar` |
| Scripts | `build`, `lint`, `test`, `check-types` |
| Key dependencies | `@reading-advantage/auth`, `@reading-advantage/db`, `@reading-advantage/integrations-github`, `@reading-advantage/types`, `drizzle-orm 0.44.7`, `zod` |
| Review coverage | TenantDB, tenant registry, module structure, contracts, permissions, domain/API separation, env/logging coupling |

**Inventory notes:** Domain is the main business-logic package, but Phase 1 and Phase 3 found that tenant registry coverage is stale, referential-scoping checks are partly vacuous, several modules do not follow the expected 7-file decomposition, multiple functions perform inline role checks, and some domain functions leak transport or environment concerns.

### `@reading-advantage/api` (`packages/api`)

| Attribute | Value |
|---|---|
| Version / module | `0.1.0`, ESM |
| Public exports | `.`, `./client`, `./routes/auth`, `./context` from `dist` |
| Scripts | `dev`, `build`, `start`, `lint`, `test`, `check-types` |
| Key dependencies | `@reading-advantage/ai`, `db`, `auth`, `domain`, `types`, `@trpc/server`, `@trpc/client`, `drizzle-orm ^0.44.0`, `zod` |
| Review coverage | tRPC routers, auth routes, context creation, router/domain contracts, error mapping, authorization boundary |

**Inventory notes:** The API package is mostly thin but has important exceptions. `reports.teacherDashboard` queries DB/schema directly. Some routers redefine contracts instead of importing domain Zod schemas, map errors by string matching, and contain inline role middleware. Type-check fails due to drift between API outputs and shared type schemas.

### `@reading-advantage/ai` (`packages/ai`)

| Attribute | Value |
|---|---|
| Version / module | `0.1.0`, ESM |
| Public exports | `AIClient` types, factory/singleton helpers, OpenAI/Google/OpenRouter/Mock providers, selected AI SDK re-exports |
| Scripts | `build`, `lint`, `test`, `check-types` |
| Key dependencies | `ai ^5.0.201`, `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/google-vertex`, `zod` |
| Review coverage | Provider-neutral interface, provider constructors, env validation, error wrapping, test coverage, direct SDK usage |

**Inventory notes:** Adapter seam is strong: providers accept config by constructor and factory validation uses Zod. Phase 4-5 gate evidence records 196 core adapter tests passing but 13 pre-existing package test failures from prior SDK migration closeout/setup suites, so the aggregate `@reading-advantage/ai` test gate is not green.

### `@reading-advantage/storage` (`packages/storage`)

| Attribute | Value |
|---|---|
| Version / module | `0.1.0`, ESM |
| Public exports | `.`, `./client` from `dist` |
| Scripts | `build`, `lint`, `test`, `check-types` |
| Key dependencies | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `zod` |
| Review coverage | StorageClient interface, S3 driver, env validation, URL helpers, error behavior |

**Inventory notes:** The adapter pattern is clean, with AWS SDK confined to the S3 driver. Gaps: no download/read `get()` method, `exists()` behavior can collapse infrastructure failures into `false`, and adoption is incomplete in apps that still use direct GCS/OpenAI storage-related code.

### `@reading-advantage/webhooks` (`packages/webhooks`)

| Attribute | Value |
|---|---|
| Version / module | `0.1.0`, ESM |
| Public exports | Raw TS exports: `.` -> `./src/index.ts`, `./github` -> `./src/github.ts` |
| Scripts | `dev`, `build`, `start`, `lint`, `check-types`, `test` |
| Key dependencies | `hono`, `@hono/node-server`, `@reading-advantage/ai`, `db`, `domain`, `types`, `zod` |
| Review coverage | GitHub webhook HMAC verification, replay window, payload validation, GitHub API operations, logging, package boundary |

**Inventory notes:** Security checks are strong: HMAC-SHA256, timing-safe comparison, timestamp skew protection, and Zod payload validation. Main issues are duplicated GitHub client logic versus `packages/integrations/github`, raw TypeScript package exports, ESM extension risk, and unstructured `console.*` logging.

### `@reading-advantage/integrations-github` (`packages/integrations/github`)

| Attribute | Value |
|---|---|
| Version / module | `0.1.0`, ESM |
| Public exports | `.`, `./client` from `dist` |
| Scripts | `build`, `lint`, `test`, `check-types` |
| Key dependencies | `zod`; no Octokit SDK dependency |
| Review coverage | GitHubClient interface, REST driver, JWT signing, env validation, test coverage |

**Inventory notes:** This package is the clean shared GitHub integration seam. It uses native `fetch` and `node:crypto` and has no GitHub SDK dependency. Its overlap with `packages/webhooks/src/github-client.ts` is the root of the duplicate-client finding.

### `@reading-advantage/types` (`packages/types`)

| Attribute | Value |
|---|---|
| Version / module | `0.1.0`, ESM |
| Public exports | `.`, `./contracts/class` from `dist` |
| Scripts | `build`, `lint`, `check-types`; no `test` script |
| Key dependencies | `zod` |
| Review coverage | Shared Zod schemas, inferred types, contract exports, role/output schema drift |

**Inventory notes:** Types are Zod-derived, but the package has no tests. Contract drift is already visible: shared user role schemas do not include the sales roles returned by domain/API, and one sales output nullability does not match domain behavior.

### `@reading-advantage/ui` (`packages/ui`)

| Attribute | Value |
|---|---|
| Version / module | `0.0.0`, ESM |
| Public exports | 15 component families from `dist/index.js` |
| Scripts | `build`, `dev`, `test`, `lint`; no `check-types` script in manifest |
| Key dependencies | Radix primitives, `class-variance-authority`, `lucide-react`, `tailwind-merge`, `@reading-advantage/utils` |
| Review coverage | Component inventory, Radix/a11y posture, ref/displayName pattern, test coverage |

**Inventory notes:** Components mostly follow shared UI conventions and use Radix where appropriate. Test coverage is partial: Button/Card/Dialog/Input/Tabs are covered; Alert, AlertDialog, Avatar, Badge, Checkbox, Label, Progress, Separator, Skeleton, and Tooltip are not.

### `@reading-advantage/utils` (`packages/utils`)

| Attribute | Value |
|---|---|
| Version / module | `0.0.0`, ESM |
| Public exports | `.`, `./cn`, `./hooks` from `dist` |
| Scripts | `build`, `dev`, `test`, `lint`; no `check-types` script in manifest |
| Key dependencies | `clsx`, `tailwind-merge` |
| Review coverage | `cn`, ffmpeg utilities, hooks, browser/server boundary, duplicated utilities |

**Inventory notes:** Utility package is small and tested. `cn()` has a tree-shakeable subpath but is duplicated in `apps/www-reading-advantage/src/lib/utils.ts`. Node-only ffmpeg utilities are present and should remain server-side.

### `@reading-advantage/config` (`packages/config`)

| Attribute | Value |
|---|---|
| Version / module | `0.0.0`, ESM |
| Public exports | `./tsconfig`, `./eslint`, `./tailwind` |
| Scripts | `test` only |
| Key dependencies | ESLint, TypeScript, Tailwind CSS, React ESLint plugins |
| Review coverage | Shared tsconfig, ESLint config, Tailwind config, config tests |

**Inventory notes:** Config package provides shared lint/type/style presets. It has config validation tests but no lint/check-types/build scripts of its own. Tailwind config uses a CJS-style `require("tailwindcss-animate")` in an ESM package.

### `@reading-advantage/scripts` (`packages/reading-advantage-scripts`)

| Attribute | Value |
|---|---|
| Version / module | `0.1.0`, CommonJS/legacy |
| Public exports | None; script package |
| Scripts | `test`: `jest --passWithNoTests` |
| Key dependencies | Legacy `openai ^4.57.3`, `@google-cloud/storage`, AI SDK packages, axios/csv/dotenv/readability utilities |
| Review coverage | Legacy AI/storage coupling, test posture, quality-gate inclusion |

**Inventory notes:** This is a legacy script surface, not aligned with current adapters. It directly imports provider SDKs, reads env directly, uses CommonJS, and has a vacuous Jest command that passes with no tests. It is not covered by the shared package lint/type gates.

---

## Gate evidence by package

Gate status is cited from the phase result JSONs. Gate failures are accepted review findings and were not hidden.

| Package | Lint | Check-types | Tests | Evidence / notes |
|---|---|---|---|---|
| `db` | Pass | Pass in Phase 1 direct run | Fail | Phase 1: 139 failed, 957 passed, 12 skipped; Drizzle version/lockfile/sentinel failures. Phase 3 dependency-chain check also reported a db check-types lifecycle failure in the combined run. |
| `domain` | Pass | Pass in Phase 1 direct run | Fail | Tenant coverage fails on 9 unclassified tables; full suite timed out in Phase 1 combined run. |
| `auth` | Not rerun by Phase 2 | Not rerun by Phase 2 | Timed out | Phase 2 tests timed out at 120s and were treated as review evidence, not hidden. |
| `auth-client` | Not rerun by Phase 2 | Not rerun by Phase 2 | Not rerun | Phase 2 was review-only and verified implementation by source inspection. |
| `api` | Pass with warnings | Fail | API standalone pass; combined test fail via dependency | Phase 3: `check-types` exits 2 due to user role/schema and nullable audio key drift; standalone API tests pass 168/168. |
| `ai` | Pass | Pass | Partial / fail aggregate | Phase 4-5: 196 core adapter tests pass; 13 pre-existing package failures remain. |
| `storage` | Pass | Pass | Pass | Phase 4-5: 12/12 tests pass. |
| `webhooks` | Pass | Pass | Pass | Phase 4-5: 78/78 tests pass. |
| `integrations-github` | Pass | Pass | Pass | Phase 4-5: 5/5 tests pass. |
| `types` | Pass | Pass | N/A | No test script. |
| `ui` | Pass | No script in manifest / Phase 4-5 cached check reported pass | Pass | Phase 4-5: 10/10 tests pass; manifest has no `check-types` script. |
| `utils` | Pass | No script in manifest / Phase 4-5 cached check reported pass | Pass | Phase 4-5: 22/22 tests pass; manifest has no `check-types` script. |
| `config` | N/A | N/A | Pass | Config-only package with `test` script. |
| `reading-advantage-scripts` | N/A | N/A | Vacuous | `jest --passWithNoTests`; not evidence of behavior. |

---

## Boundary coverage index

| Boundary | Inventory coverage | Primary evidence |
|---|---|---|
| Database | Covered | `db` schemas/migrations/sentinels/version declarations; findings F-SF-001, F-SF-006, F-SF-014 |
| Tenancy | Covered | Tenant registry, `TenantDB`, referential scoping tests; findings F-SF-001, F-SF-004, F-SF-005 |
| Auth | Covered | Password/session/rate-limit/audit/auth-client; findings F-SF-010, F-SF-011, F-SF-023 |
| Validation/contracts | Covered | `types`, API/domain contracts, Zod boundary drift; findings F-SF-002, F-SF-007, F-SF-017 |
| Domain | Covered | Domain module structure, permissions, environment/logging/HTTP leakage; findings F-SF-008, F-SF-012, F-SF-013 |
| API | Covered | tRPC routers, context, auth routes, transport/domain split; findings F-SF-002, F-SF-003, F-SF-004, F-SF-007 |
| AI | Covered | `AIClient`, providers, test status, app direct SDK exceptions; findings F-SF-019, F-SF-021 |
| Storage | Covered | Storage interface, S3 driver, URL helpers, adoption gaps; finding F-SF-022 |
| Webhooks | Covered | Hono webhook app, signature/replay/payload validation, logs/exports; findings F-SF-009, F-SF-015, F-SF-016 |
| GitHub | Covered | `integrations-github`, duplicated webhook client; finding F-SF-009 |
| UI | Covered | Component inventory, accessibility baseline, tests; finding F-SF-018 |
| Utils / types / config | Covered | `cn`, hooks, Zod contracts, shared config exports; findings F-SF-017, F-SF-020 |
| Legacy scripts | Covered | `reading-advantage-scripts`; finding F-SF-021 |
