# Shared Foundation Review — Proposed Migration Tracks

> **Track:** `shared_foundation_review_20260626`  
> **Purpose:** Proposed remediation roadmap for accepted shared-foundation findings. These are proposals only; review track scope does not remediate them unless required to complete evidence gathering.

---

## M-SF-1: Tenant registry, schema contract, and Drizzle alignment

- **Priority:** Critical
- **Resolves:** F-SF-001, F-SF-002, F-SF-014, F-SF-025; partially F-SF-006
- **Packages:** `db`, `domain`, `api`, `types`, `auth`
- **Scope:**
  1. Classify the 9 unregistered exported tables in `packages/domain/src/tenant-registry.ts` as FLAT, REFERENTIAL, or EXEMPT with explicit reasoning.
  2. Update user/role and sales roleplay output contracts so `@reading-advantage/types` matches domain/API behavior (`SALES_REP`, `SALES_ADMIN`, nullable audio storage key).
  3. Align Drizzle dependency declarations across db/domain/auth/api or add a root override with a deliberate compatibility note.
  4. Decide whether the `sentencs...` table/export typo is preserved as a legacy DB name or migrated through an explicit rename/backcompat plan.
- **Acceptance criteria:**
  - `pnpm turbo run test --filter=@reading-advantage/domain` passes the tenant coverage suite.
  - `pnpm turbo run check-types --filter=@reading-advantage/api --filter=@reading-advantage/types` passes.
  - Drizzle version guard tests pass or are replaced by a current-version guard.
- **Blocked downstream:** `primary_advantage_full_review_20260626`, `sales_advantage_full_review_20260626`, all tenant-sensitive app reviews.

---

## M-SF-2: Fail-closed TenantDB and referential-scope test hardening

- **Priority:** Critical
- **Resolves:** F-SF-004, F-SF-005
- **Packages:** `domain`, `api`
- **Scope:**
  1. Make `createTenantDB(db, { schoolId: null })` fail closed for FLAT-table operations or stop branding null-tenant DB values as `TenantDB`.
  2. Update `packages/api/src/context.ts` so unauthenticated requests cannot accidentally pass a scoped-looking DB into domain functions.
  3. Replace the vacuous referential-table detector in `tenant-coverage.test.ts` with a real static or behavioral assertion.
  4. Add context tests for no token, valid token, and auth-failure fallback.
- **Acceptance criteria:**
  - Null-tenant `TenantDB` cannot read/update/insert/delete FLAT tables.
  - Referential tables queried through TenantDB are caught by tests unless an explicit `unscoped("reason")` path is used.
  - Public API procedures cannot call tenant-scoped domain functions with a null tenant.
- **Blocked downstream:** All app reviews with public/authenticated mixed route surfaces.

---

## M-SF-3: Move remaining business logic out of API transport

- **Priority:** Critical
- **Resolves:** F-SF-003, F-SF-013 (transport portions), F-SF-026 opportunistically
- **Packages:** `api`, `domain`
- **Scope:**
  1. Move `reports.teacherDashboard` query into `packages/domain` and expose it as a backend function.
  2. Refactor `mastery/record-run.ts` to return a domain result; map HTTP status/body/headers in its caller.
  3. Move CodeCamp AI review provider lifecycle/wiring out of the router and into a domain/application service seam.
  4. Add a static gate forbidding `drizzle-orm` and `@reading-advantage/db/schema` imports from `packages/api/src/routers/**` except explicitly approved infrastructure files.
- **Acceptance criteria:**
  - API routers contain no business Drizzle queries.
  - Router tests assert delegation to domain functions rather than duplicating query behavior.
  - `pnpm turbo run lint --filter=@reading-advantage/api` and relevant API tests pass.
- **Blocked downstream:** `reading_advantage_full_review_20260626`, `primary_advantage_full_review_20260626`, `science_advantage_review_20260626`, `codecamp_advantage_review_20260626`.

---

## M-SF-4: Centralize permissions and typed error/contract mapping

- **Priority:** High
- **Resolves:** F-SF-007, F-SF-008
- **Packages:** `auth`, `domain`, `api`, `types`
- **Scope:**
  1. Export or create domain input contracts for routers that currently redefine Zod schemas.
  2. Replace router-local schema definitions with imports from domain contracts or a shared contracts package.
  3. Replace string-based error mapping with typed domain error classes and `instanceof` mapping.
  4. Replace inline `role ===` checks in API/domain with permission helpers and registered permission keys.
- **Acceptance criteria:**
  - Router input schemas are imported from shared/domain contracts.
  - Router error mapping does not inspect `err.message` substrings.
  - `rg "role ===|role !==" packages/api/src packages/domain/src` returns only approved non-authorization cases.
- **Blocked downstream:** All app reviews with shared tRPC/router usage or role-based flows.

---

## M-SF-5: Auth monitor hardening batch

- **Priority:** High
- **Resolves:** F-SF-010, F-SF-011, F-SF-023, F-SF-024
- **Packages:** `auth`, `auth-client`, `api`
- **Scope:**
  1. Implement or adopt the pending Postgres-backed rate limiter (`rate_limiter_v2_20260603`) with per-user and per-IP limits.
  2. Add explicit CSRF token handling for state-changing auth endpoints or document and test the chosen SameSite-only policy.
  3. Make cookie `secure` depend on deployment URL/protocol or explicit config, not only `NODE_ENV`.
  4. Validate auth-client login/session responses against Zod before mutating client state.
  5. Add nested metadata redaction tests and schedule removal of transitional `bcryptjs` once migration is complete.
- **Acceptance criteria:**
  - Auth tests cover multi-instance rate limiting semantics or a DB-backed locking path.
  - Auth route tests cover CSRF/cookie security configuration.
  - Auth-client rejects malformed login responses.
- **Blocked downstream:** Auth-sensitive app reviews can proceed with caveats, but security remediation should precede launch decisions.

---

## M-SF-6: Domain structure and portability cleanup

- **Priority:** Medium
- **Resolves:** F-SF-012, F-SF-013 (domain portions)
- **Packages:** `domain`
- **Scope:**
  1. Decompose classes/students/codecamp/AI/mastery/interventions/audit modules into the expected structure where beneficial.
  2. Move logic out of `index.ts` barrels.
  3. Inject sales roleplay model config instead of reading `process.env` directly.
  4. Replace domain `console.*` with typed errors or a logger adapter.
- **Acceptance criteria:**
  - Domain module `index.ts` files are barrels except documented exceptions.
  - `rg "process\.env" packages/domain/src` returns only tests/fixtures or approved config adapters.
  - `rg "console\.(log|warn|error)" packages/domain/src` returns only tests or approved logger shims.
- **Blocked downstream:** `sales_advantage_full_review_20260626` for sales evaluator config; otherwise can run parallel with app reviews.

---

## M-SF-7: Package gate integrity and compiled webhook boundary

- **Priority:** High
- **Resolves:** F-SF-006, F-SF-015, F-SF-016, F-SF-019
- **Packages:** `db`, `webhooks`, `ai`
- **Scope:**
  1. Add migration sentinel probes for `0022` and `0023` and restore db test signal.
  2. Change `packages/webhooks` exports to compiled `dist` outputs and add `.js` ESM import extensions where required.
  3. Replace webhook `console.*` logging with structured logger/context fields.
  4. Retire or fix stale `@reading-advantage/ai` prior-track tests so aggregate package tests are meaningful.
- **Acceptance criteria:**
  - `pnpm turbo run test --filter=@reading-advantage/db --filter=@reading-advantage/ai --filter=@reading-advantage/webhooks` is green or has only documented live-service skips.
  - `node dist/index.js` works for webhooks after build.
  - Webhook logs include request/event identifiers.
- **Blocked downstream:** `codecamp_advantage_review_20260626` and any AI-heavy app review that depends on aggregate AI gate signal.

---

## M-SF-8: Shared contract/UI utility test coverage

- **Priority:** Medium
- **Resolves:** F-SF-017, F-SF-018, F-SF-020
- **Packages:** `types`, `ui`, `utils`, plus `www-reading-advantage` adoption touchpoint
- **Scope:**
  1. Add a `test` script and Zod contract tests to `@reading-advantage/types` for user roles, sales outputs, class contracts, and branded IDs.
  2. Add tests for untested shared UI component families, prioritizing interactive/accessibility components.
  3. Replace duplicated `cn()` in `apps/www-reading-advantage` with `@reading-advantage/utils/cn` or document why the app-local helper remains.
  4. Consider adding no-op or real `check-types` scripts for `ui` and `utils` if they are expected in project-wide type gates.
- **Acceptance criteria:**
  - `@reading-advantage/types` has package-local tests that fail on the sales-role drift class.
  - Shared UI tests cover all 15 exported component families at least at smoke/a11y contract level.
  - No duplicate `cn()` implementations remain outside `@reading-advantage/utils` unless explicitly approved.
- **Blocked downstream:** `www_reading_advantage_review_20260626` for utility duplication; UI-heavy app reviews benefit from this but are not hard-blocked.

---

## M-SF-9: Consolidate GitHub integration and webhook review pipeline seam

- **Priority:** High
- **Resolves:** F-SF-009
- **Packages:** `webhooks`, `integrations-github`, `domain`, possibly `api`
- **Scope:**
  1. Move any missing webhook-specific GitHub operations into `@reading-advantage/integrations-github`.
  2. Make `packages/webhooks` consume the shared `GitHubClient` for installation tokens, PR metadata/comments, and signature helpers where appropriate.
  3. Preserve HMAC/replay protections with dedicated tests.
  4. Align with the planned webhook reliability/DLQ track so retry behavior has one GitHub seam.
- **Acceptance criteria:**
  - No duplicate JWT signing / installation token / PR comment logic remains in `packages/webhooks`.
  - Existing 78 webhooks tests and 5 GitHub integration tests pass with added consolidation tests.
- **Blocked downstream:** `codecamp_advantage_review_20260626`.

---

## M-SF-10: Legacy provider-adapter adoption for scripts and app exceptions

- **Priority:** Medium
- **Resolves:** F-SF-021, F-SF-022; tracks app exception F-A5-04 from Phase 4-5
- **Packages:** `reading-advantage-scripts`, `storage`, `ai`; downstream app packages as consumers
- **Scope:**
  1. Decide whether `packages/reading-advantage-scripts` should be migrated, quarantined, or archived.
  2. If retained, port scripts to ESM/TypeScript where practical, use `@reading-advantage/ai` and `@reading-advantage/storage`, and replace `jest --passWithNoTests` with behavioral tests.
  3. Decide whether `StorageClient` should grow a `get()` method or explicitly document URL-only read semantics.
  4. Route the direct OpenAI SDK import in `apps/primary-advantage/server/utils/genaretors/image-generator.ts` to the relevant app review/remediation track.
- **Acceptance criteria:**
  - Legacy scripts are either removed/quarantined from quality claims or covered by real tests and adapters.
  - No retained script directly imports provider SDKs unless behind a package-local adapter approved by architecture.
  - Storage read semantics are documented and tested.
- **Blocked downstream:** `primary_advantage_full_review_20260626`; legacy Reading content-generation review.

---

## Recommended execution order

1. **M-SF-1** — unblock tenant registry and API/type gates.
2. **M-SF-2** — close null-tenant and vacuous tenancy-test risks.
3. **M-SF-3** — restore strict API/domain separation before deep app route reviews.
4. **M-SF-4** and **M-SF-5** — centralize permissions/contracts and close auth monitor items.
5. **M-SF-7** and **M-SF-9** — make adapter/webhook gates trustworthy for CodeCamp and AI-heavy reviews.
6. **M-SF-8** — strengthen shared contracts/UI utilities before UI-heavy app review conclusions.
7. **M-SF-6** — domain structure hygiene; can run in parallel after critical boundaries are stable.
8. **M-SF-10** — legacy scripts/adoption cleanup coordinated with Reading/Primary reviews.

---

## Downstream review blockers

| Downstream review | Blocked / caveated by |
|---|---|
| `reading_advantage_full_review_20260626` | F-SF-003, F-SF-004, F-SF-008, F-SF-021 |
| `primary_advantage_full_review_20260626` | F-SF-001, F-SF-002, F-SF-014, F-SF-021, F-SF-025, direct OpenAI app exception from Phase 4-5 |
| `science_advantage_review_20260626` | F-SF-003, F-SF-004, F-SF-008 |
| `codecamp_advantage_review_20260626` | F-SF-009, F-SF-013, F-SF-015, F-SF-016, F-SF-019 |
| `sales_advantage_review_20260626` | F-SF-002, F-SF-010, F-SF-011, F-SF-013 |
| `marketing_app_review_20260626` | F-SF-019 for AI gate signal; auth/tenant caveats if shared auth/API are used |
| `advantage_games_review_20260626` | No hard shared-package blocker identified; app review should still account for types/UI test gaps if importing shared packages |
| `www_reading_advantage_review_20260626` | F-SF-020 and shared UI coverage caveats |
| `cross_app_workflows_review_20260626` | All Critical/High shared-foundation findings should feed the cross-app synthesis |
