# Specification: Identity and provider debt in the v1 architecture baseline

**Track ID:** `architecture_identity_provider_debt_20261111`
**Type:** chore (classic FR list with acceptance checks)
**Status:** new. Opened 2026-11-11.
**Author model:** claude-code/claude-sonnet-5-5
**Priority:** P2
**Start:** not before 2026-11-21 (after the 2026-11-20 Storytime release).
**Due:** 2026-12-15.
**Owner chain:** Daniel (owner; deploy gate) → PM orchestrator (CI process owner; decision of 2026-11-11) → Monorepo orchestrator (track owner)
**Plan:** [plan.md](./plan.md)
**Depends on:** [architecture_ci_input_pin_20261110](../architecture_ci_input_pin_20261110/) task 1.4d `[x]`. That task writes the 111 findings into the v1 baseline.

## 1. Purpose

Track `architecture_ci_input_pin_20261110` baselines 332 additions in the v1 architecture
baseline, so that the architecture step can go green. This track fixes 111 of the 332.
The 111 findings belong to four rules: `COMPANY_IDENTITY_PRODUCT_ISOLATION`,
`COMPANY_IDENTITY_DB_BOUNDARY`, `AI_PROVIDER_BOUNDARY`, and `INTEGRATION_PROVIDER_BOUNDARY`.
The PM accepted these 111 findings only until this track closes.

The track is done when the 111 findings are fixed in code, the baseline no longer lists them,
and `pnpm architecture:check` exits 0. A new finding of these four rules fails CI during the
whole track and after it. The baseline freezes only the old findings.

## 2. Evidence (read only, 2026-11-11, at ed10bc39d)

- **Source of the 111.** The read-only preview
  `measure/runs/architecture_ci_input_pin_20261110/r9-debt-preview.json` at commit `ed10bc39d`.
  The path `/report/comparison/additions` holds 332 entries. The 111 entries of this track
  are the entries with the four rule ids of section 1. The summary log is `green-p1-1.4-r9.log`
  in the same folder.
- **Counts of the other 221 additions.** `DATABASE_BOUNDARY` 205 and
  `DURABLE_JOB_DATABASE_BOUNDARY` 16. They are not in this track (section 7).
- **The rules.** `packages/architecture-enforcement/src/config/ownership-map.v2.json` defines them:
  - `COMPANY_IDENTITY_DB_BOUNDARY` (`:95`): Company Identity persistence is reachable only from
    `packages/db/src/company-identity/` and
    `packages/backend/src/modules/company-identity/adapters/postgres/`. It also covers the
    environment variables `COMPANY_AUTH_DATABASE_URL` and `COMPANY_AUTH_DIRECT_DATABASE_URL`.
  - `COMPANY_IDENTITY_PRODUCT_ISOLATION` (`:149`): Company Identity tables and migrations stay
    outside education schemas, migrations, and tenant registries. The matchers are the import
    paths `@reading-advantage/db/company-identity` and the resources `database-table:company_*`.
  - `AI_PROVIDER_BOUNDARY` (`:190`): AI provider SDKs and client construction stay inside
    `packages/ai/src/providers/`.
  - `INTEGRATION_PROVIDER_BOUNDARY` (`:302`): integration SDKs and direct clients stay inside
    named driver directories. The GitHub driver directory is
    `packages/integrations/github/src/drivers/`.
- **The kinds of evidence.** 88 static imports, 10 environment reads, 8 dynamic imports,
  2 client constructions, 2 re-exports, and 1 namespace import. Of the 111 findings,
  57 `ISOLATION`, 4 `DB_BOUNDARY`, 5 `AI`, and 0 `INTEGRATION` are in production files.
  The other 45 are in test or fixture files (36 `ISOLATION`, 1 `DB_BOUNDARY`, 6 `AI`, and
  2 `INTEGRATION`).
- **Existing exceptions.** The ownership map already holds reviewed exact exceptions for test
  and fixture files of `AI_PROVIDER_BOUNDARY` (`ownership-map.v2.json:524-583`) and of
  `INTEGRATION_PROVIDER_BOUNDARY` (`:1308`). See OQ-1.
- **Age.** The findings come from commits of 2026-07-19 to 2026-10-14. They come before
  the track `architecture_ci_input_pin_20261110`.
- **Not read.** This spec reads no source file. The plan tasks read the code that they change.

## 3. Decisions

- **D-1 (PM decision of 2026-11-11). DECIDED (PM, 2026-11-11).** The PM wrote, word for word:
  "1. Baseline ALL 332 additions now (with the 16 removals and 161 renames), so the architecture step can go green and per-app CD is not blocked. Owner: \"Monorepo session (architecture owner), approved by the PM 2026-11-11\". Rationale, by class: DATABASE_BOUNDARY 205 + DURABLE_JOB_DATABASE_BOUNDARY 16: pre-existing debt (commits 2026-07-19 to 2026-10-14, before this track), part of the tech-debt entry on the 294 legacy API routes. COMPANY_IDENTITY_PRODUCT_ISOLATION 93 + COMPANY_IDENTITY_DB_BOUNDARY 5 + AI_PROVIDER_BOUNDARY 11 + INTEGRATION_PROVIDER_BOUNDARY 2: pre-existing debt, accepted only until the remediation track below closes; name that track id in the rationale. 2. Open a remediation track (build session: yes, my word) for the 111 auth/identity and provider-adapter findings: P2, starts after the 11-20 Storytime release, done-when the 111 are fixed and removed from the baseline, due 2026-12-15. A new finding of these rules still fails CI (the baseline freezes only the old ones). 3. Then one more pin refresh check, architecture:check, and task 1.5, on the routes your plan names."
  This track is item 2 of that decision. The baseline step is item 1, and task 1.4d of the
  track `architecture_ci_input_pin_20261110` carries it.
- **D-2 (scope). DECIDED (PM, 2026-11-11).** The scope is exactly the 111 findings of section 9.
  The track does not fix the other 221 additions. The track does not change a rule.
- **D-3 (the fix is in code). DECIDED (PM, 2026-11-11).** "Fixed" means that the analyzer no
  longer reports the finding. The code changes. The track writes no new exception and changes no rule. A change of
  `ownership-map.v2.json` is a rule change. It needs a reviewed decision (OQ-1).
- **D-4 (order). DECIDED (build role, 2026-11-11).** The order is: the identity code that owns
  the persistence (`packages/backend`), then the shared packages, then `apps/accounts`, then the
  other apps, then the provider adapters, then the final check. Reason: the apps import the
  packages. A change in the package first avoids a second edit of the app imports.
- **D-5 (the baseline shrinks in each phase). DECIDED (build role, 2026-11-11).** Each phase
  removes its own findings from the v1 baseline with `pnpm architecture:baseline:update
  --acknowledge`. Reason: the architecture step stays green after each phase, and each phase
  proves its count (`removals` equals the phase count, `additions` is 0).
- **D-6 (a new finding fails CI). DECIDED (PM, 2026-11-11).** The track writes no rule that
  skips a new finding. The existing tests `ratchet.test.ts`, `ratchet.red.test.ts`,
  `baseline-update.test.ts`, and `baseline-validation.test.ts` prove it. The track does not
  edit them.
- **D-7 (start gate). DECIDED (PM, 2026-11-11).** No task starts before 2026-11-21. The
  Storytime release of 2026-11-20 comes first.

## 4. Functional requirements

### FR-1 Identity isolation in `packages/backend`

The 35 `ISOLATION` findings in `packages/backend` (section 9.3) are fixed. Code of the
Company Identity module that reaches a Company Identity table or the `@reading-advantage/db/company-identity`
path sits in an owned root, or the code reaches the table through an adapter port. Test and fixture
files follow OQ-1.

### FR-2 Identity isolation in the shared packages

The 13 findings in `packages/domain` (11), `packages/auth` (1), and `packages/db` (1) are fixed.
The education tenant registry (`packages/domain/src/tenant-registry.ts`) and the sales queries
and mutations do not reference a Company Identity table.

### FR-3 Identity isolation and database boundary in `apps/accounts`

The 38 `ISOLATION` findings and the 5 `DB_BOUNDARY` findings in `apps/accounts` are fixed.
The app reaches Company Identity through the backend module interface. No route handler,
page, or script of the app reads `COMPANY_AUTH_DATABASE_URL` or imports a Company Identity
table.

### FR-4 Identity isolation in the other apps

The 7 `ISOLATION` findings in `apps/accounting` (1), `apps/codecamp-advantage` (1),
`apps/marketing` (2), `apps/sales-advantage` (2), and `apps/workbooks` (1) are fixed. The
product apps use the shared client in `packages/auth` and do not import a Company Identity
table.

### FR-5 AI provider boundary

The 11 `AI` findings are fixed: 3 in `packages/ai/src/client.ts` and 8 in
`apps/codecamp-advantage` (section 9.3). The provider SDK, the client construction, and the
`OPENROUTER_API_KEY` read sit in `packages/ai/src/providers/`. The app code calls the AI
adapter (`ai.generateText()` and the other adapter functions of `AGENTS.md`).

### FR-6 Integration provider boundary

The 2 `INTEGRATION` findings in
`packages/integrations/github/src/__tests__/client.test.ts` are fixed (OQ-1).

### FR-7 The baseline and the check

After the last phase, the v1 baseline files `database.v1.json` and `provider.v1.json` in
`packages/architecture-enforcement/src/config/baselines/` hold no entry of the four rules.
`pnpm architecture:check` exits 0. `pnpm architecture:baseline:validate` exits 0.

### FR-8 No new debt

No task adds a finding. After each phase, the baseline update reports `additions=0`. A
task that needs a new finding stops and reports.

## 5. Constraints

- The AGENTS.md backend rules apply: provider code sits behind adapters, authorization sits in
  permissions modules, business logic stays in `packages/backend`, and each program is its own app.
- No new hash, checksum, or manifest (`AGENTS.md`, Hashing and Provenance Policy). The pin refresh
  and the baseline update write the files that they already write, and no other file.
- No change to `packages/architecture-enforcement/src` production code, to the ratchet tests, or to
  `ownership-map.v2.json` without a reviewed decision (D-3, OQ-1).
- No change to the other 221 additions.
- No change to measure/archive.
- No push and no deploy. The orchestrator and Daniel keep the deploy gate. A change in an app is
  a change in code only.
- Heavy commands run through `heavy-run.sh` with `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800`.
  Each named-file vitest command carries `--maxWorkers=1`.

## 6. Acceptance criteria

- **AC-1 (the baseline holds none of the 111).** After Phase 6, a count of entries with the four
  rule ids in `database.v1.json` and `provider.v1.json` returns 0. Before Phase 1, the count is 111.
- **AC-2 (the check passes).** After Phase 6, `pnpm architecture:check` exits 0 and prints no
  `new-debt` line.
- **AC-3 (each phase removes exactly its findings).** After each phase, the baseline update
  reports `removals` equal to the phase count (35, 13, 43, 7, 13) and `additions=0`.
- **AC-4 (a new finding fails).** `ratchet.test.ts`, `ratchet.red.test.ts`, `baseline-update.test.ts`,
  and `baseline-validation.test.ts` exit 0 at the final HEAD. `git diff --name-only <phase_base>..HEAD
  -- packages/architecture-enforcement/src/__tests__/ratchet.test.ts packages/architecture-enforcement/src/__tests__/ratchet.red.test.ts
  packages/architecture-enforcement/src/__tests__/baseline-update.test.ts packages/architecture-enforcement/src/__tests__/baseline-validation.test.ts`
  returns an empty list.
- **AC-5 (each fix is proven by the analyzer).** For each phase, the new test
  `packages/architecture-enforcement/src/__tests__/identity-provider-debt.test.ts` runs the analyzer on the
  files of the phase and finds 0 findings of the four rules. The test fails at the Red HEAD of the
  phase. A positive-control case in the test proves that the test can fail.
- **AC-6 (behavior stays).** For each phase, the named tests of the touched package exit 0 at the
  Green HEAD, and the touched package type check and lint exit 0.
- **AC-7 (the rules stay).** `git diff --name-only <first_phase_base>..HEAD --
  packages/architecture-enforcement/src/config/ownership-map.v2.json
  packages/architecture-enforcement/src/config/ownership-map.v1.json` returns an empty list,
  unless OQ-1 gives a reviewed decision.
- **AC-8 (the other debt stays as it is).** After Phase 6, the baseline holds 221 of the 332
  additions (`DATABASE_BOUNDARY` 205 and `DURABLE_JOB_DATABASE_BOUNDARY` 16), and the removals and
  renames of the task 1.4d stay.

## 7. Out of scope

- The 205 `DATABASE_BOUNDARY` findings and the 16 `DURABLE_JOB_DATABASE_BOUNDARY` findings. They are
  part of the tech-debt entry on the 294 legacy API routes.
- A change of a rule, of the ownership map, of the analyzer, or of the ratchet.
- A new feature in an app or a package.
- A deploy, a traffic move, or a push.
- The other open tracks of the Company Identity program (`company_identity_sso_20260715`). This track
  moves no behavior. See OQ-2.

## 8. Open questions

- **OQ-1 (test and fixture files).** 45 findings are in test or fixture files (section 2). The
  ownership map already holds reviewed exact exceptions for such files in the AI and the integration
  rules. **Default:** fix each file in code. A test imports the module interface or sits in the owned
  root. A fixture that is a deliberate violation (for example
  `apps/accounts/lib/server/__fixtures__/company-identity-route-denominator/paired-swap-route.ts`)
  moves to a path that the analyzer does not select, or it builds the violating source as a string in the test.
  If a file cannot change without losing its test meaning, the task stops and reports. A new exact
  exception in `ownership-map.v2.json` needs a reviewed decision of the PM, and the manifest pins
  change with it.
- **OQ-2 (open work in the same files).** The track `company_identity_sso_20260715` has a task in
  progress, and it changes files in `packages/backend/src/modules/company-identity/` and `apps/accounts`.
  **Default:** Task 0.1 checks `git log` of the phase paths. A phase waits when another track has an
  uncommitted or in-progress change in a phase path, and the orchestrator decides.
- **OQ-3 (a moved file changes the finding keys).** A move of a file can change `sourcePath` and so the
  baseline key. **Default:** the fix removes the finding, so the baseline update reports a removal and
  not a rename. A rename count above 0 in a phase update stops the task (AC-3).
- **OQ-4 (scoped analysis).** The test of AC-5 analyzes the files of one phase. **Default:** the Red role
  reads the analyzer entry point, and the test reproduces the preview findings at HEAD. If the scoped
  analysis does not reproduce them, the Red task stops and reports. The fallback is to analyze the whole
  repository once in the test, behind a heavy-run call.
- **OQ-5 (the pin refresh).** Each phase changes analyzed files, so the v2 manifest pins and the report go
  stale. **Default:** each phase ends with a pin refresh series as the task 1.4 of
  `architecture_ci_input_pin_20261110` runs it (about 130 s in round 8) before `pnpm architecture:check`.

## 9. Scope list (the 111 findings)

Source: `measure/runs/architecture_ci_input_pin_20261110/r9-debt-preview.json`, commit `ed10bc39d`, path
`/report/comparison/additions`, filtered by the four rule ids.

### 9.1 Count by rule

| Rule | Findings |
|---|---|
| `COMPANY_IDENTITY_PRODUCT_ISOLATION` | 93 |
| `COMPANY_IDENTITY_DB_BOUNDARY` | 5 |
| `AI_PROVIDER_BOUNDARY` | 11 |
| `INTEGRATION_PROVIDER_BOUNDARY` | 2 |
| Total | 111 |

### 9.2 Count by app or package

| App or package | ISOLATION | DB_BOUNDARY | AI | INTEGRATION | Total |
|---|---|---|---|---|---|
| `apps/accounts` | 38 | 5 | 0 | 0 | 43 |
| `packages/backend` | 35 | 0 | 0 | 0 | 35 |
| `packages/domain` | 11 | 0 | 0 | 0 | 11 |
| `apps/codecamp-advantage` | 1 | 0 | 8 | 0 | 9 |
| `packages/ai` | 0 | 0 | 3 | 0 | 3 |
| `apps/marketing` | 2 | 0 | 0 | 0 | 2 |
| `apps/sales-advantage` | 2 | 0 | 0 | 0 | 2 |
| `packages/integrations/github` | 0 | 0 | 0 | 2 | 2 |
| `apps/accounting` | 1 | 0 | 0 | 0 | 1 |
| `apps/workbooks` | 1 | 0 | 0 | 0 | 1 |
| `packages/auth` | 1 | 0 | 0 | 0 | 1 |
| `packages/db` | 1 | 0 | 0 | 0 | 1 |
| Total | 93 | 5 | 11 | 2 | 111 |

The short names are `ISOLATION` = `COMPANY_IDENTITY_PRODUCT_ISOLATION`, `DB_BOUNDARY` = `COMPANY_IDENTITY_DB_BOUNDARY`, `AI` = `AI_PROVIDER_BOUNDARY`, and `INTEGRATION` = `INTEGRATION_PROVIDER_BOUNDARY`.

### 9.3 Count by file

Each row gives the number of findings of one rule in one file. The sum of the column is 111.

**`apps/accounts` (43)**

| File | Rule | Findings |
|---|---|---|
| `app/.well-known/openid-configuration/route.ts` | ISOLATION | 1 |
| `app/api/admin/employees/[accountId]/company-roles/route.ts` | ISOLATION | 2 |
| `app/api/admin/employees/[accountId]/credential/route.ts` | ISOLATION | 2 |
| `app/api/admin/employees/[accountId]/roles/route.ts` | ISOLATION | 2 |
| `app/api/admin/employees/[accountId]/sessions/route.ts` | ISOLATION | 2 |
| `app/api/admin/employees/[accountId]/status/route.ts` | ISOLATION | 2 |
| `app/api/admin/employees/route.ts` | ISOLATION | 2 |
| `app/api/health/route.ts` | ISOLATION | 1 |
| `app/api/oidc/authorize/route.ts` | ISOLATION | 1 |
| `app/api/oidc/introspect/route.ts` | ISOLATION | 1 |
| `app/api/oidc/jwks/route.ts` | ISOLATION | 1 |
| `app/api/oidc/logout/route.ts` | ISOLATION | 1 |
| `app/api/oidc/token/route.ts` | ISOLATION | 2 |
| `app/api/ready/route.ts` | ISOLATION | 1 |
| `app/api/session/login/route.ts` | ISOLATION | 1 |
| `app/api/session/logout/route.ts` | ISOLATION | 1 |
| `app/page.tsx` | ISOLATION | 2 |
| `lib/server/__fixtures__/company-identity-route-denominator/paired-swap-route.ts` | ISOLATION | 2 |
| `lib/server/company-identity-route-bindings.test.ts` | ISOLATION | 3 |
| `lib/server/http.ts` | ISOLATION | 1 |
| `lib/server/identity.ts` | DB_BOUNDARY | 2 |
| `lib/server/identity.ts` | ISOLATION | 2 |
| `scripts/bootstrap-production.ts` | DB_BOUNDARY | 1 |
| `scripts/bootstrap-production.ts` | ISOLATION | 1 |
| `scripts/demo-accounts.ts` | DB_BOUNDARY | 1 |
| `scripts/demo-accounts.ts` | ISOLATION | 1 |
| `scripts/idempotency-postgres.integration.test.ts` | DB_BOUNDARY | 1 |
| `scripts/idempotency-postgres.integration.test.ts` | ISOLATION | 2 |
| `scripts/product-role-rejection.test.ts` | ISOLATION | 1 |

**`packages/backend` (35)**

| File | Rule | Findings |
|---|---|---|
| `src/index.ts` | ISOLATION | 1 |
| `src/modules/company-identity/__tests__/capabilities.test.ts` | ISOLATION | 2 |
| `src/modules/company-identity/__tests__/contracts.test.ts` | ISOLATION | 1 |
| `src/modules/company-identity/__tests__/finance-authorization-adapter.red.test.ts` | ISOLATION | 1 |
| `src/modules/company-identity/__tests__/finance-task3-adversarial.test.ts` | ISOLATION | 1 |
| `src/modules/company-identity/__tests__/finance-task3-review-b.red.test.ts` | ISOLATION | 1 |
| `src/modules/company-identity/__tests__/finance-task3-security-review-v2.red.test.ts` | ISOLATION | 1 |
| `src/modules/company-identity/__tests__/finance-thb-policy-approval-attestation.red.test.ts` | ISOLATION | 1 |
| `src/modules/company-identity/__tests__/postgres-exchange.integration.test.ts` | ISOLATION | 1 |
| `src/modules/company-identity/__tests__/postgres-finance-task3.integration.test.ts` | ISOLATION | 1 |
| `src/modules/company-identity/__tests__/protocol-safety.red.test.ts` | ISOLATION | 3 |
| `src/modules/company-identity/__tests__/protocol.test.ts` | ISOLATION | 1 |
| `src/modules/company-identity/__tests__/route-bindings.security.test.ts` | ISOLATION | 5 |
| `src/modules/company-identity/__tests__/service.test.ts` | ISOLATION | 1 |
| `src/modules/company-identity/capabilities.ts` | ISOLATION | 1 |
| `src/modules/company-identity/index.ts` | ISOLATION | 1 |
| `src/modules/company-identity/internal-route-adapter.ts` | ISOLATION | 4 |
| `src/modules/company-identity/postgres-rate-limit.ts` | ISOLATION | 1 |
| `src/modules/company-identity/postgres-repository.ts` | ISOLATION | 2 |
| `src/modules/company-identity/protocol.ts` | ISOLATION | 2 |
| `src/modules/company-identity/service.ts` | ISOLATION | 3 |

**`packages/domain` (11)**

| File | Rule | Findings |
|---|---|---|
| `src/__tests__/company-identity-principal.real-db.test.ts` | ISOLATION | 1 |
| `src/__tests__/company-identity-principal.test.ts` | ISOLATION | 1 |
| `src/__tests__/sales-mastery-projection.red.test.ts` | ISOLATION | 2 |
| `src/__tests__/sales-phase2-review-a.red.test.ts` | ISOLATION | 2 |
| `src/__tests__/sales-phase2-trusted-only.red.test.ts` | ISOLATION | 1 |
| `src/company-identity-principal.ts` | ISOLATION | 1 |
| `src/sales/mutations.ts` | ISOLATION | 1 |
| `src/sales/queries.ts` | ISOLATION | 1 |
| `src/tenant-registry.ts` | ISOLATION | 1 |

**`apps/codecamp-advantage` (9)**

| File | Rule | Findings |
|---|---|---|
| `app/api/chat/route.ts` | AI | 1 |
| `app/api/tutor/intervention/route.test.ts` | AI | 6 |
| `app/api/tutor/intervention/route.ts` | AI | 1 |
| `lib/company-oidc.ts` | ISOLATION | 1 |

**`packages/ai` (3)**

| File | Rule | Findings |
|---|---|---|
| `src/client.ts` | AI | 3 |

**`apps/marketing` (2)**

| File | Rule | Findings |
|---|---|---|
| `app/api/ready/route.ts` | ISOLATION | 1 |
| `app/lib/company-oidc.ts` | ISOLATION | 1 |

**`apps/sales-advantage` (2)**

| File | Rule | Findings |
|---|---|---|
| `app/api/ready/route.ts` | ISOLATION | 1 |
| `lib/company-oidc.ts` | ISOLATION | 1 |

**`packages/integrations/github` (2)**

| File | Rule | Findings |
|---|---|---|
| `src/__tests__/client.test.ts` | INTEGRATION | 2 |

**`apps/accounting` (1)**

| File | Rule | Findings |
|---|---|---|
| `app/lib/company-oidc.ts` | ISOLATION | 1 |

**`apps/workbooks` (1)**

| File | Rule | Findings |
|---|---|---|
| `app/lib/company-oidc.ts` | ISOLATION | 1 |

**`packages/auth` (1)**

| File | Rule | Findings |
|---|---|---|
| `src/company-identity/client.ts` | ISOLATION | 1 |

**`packages/db` (1)**

| File | Rule | Findings |
|---|---|---|
| `src/__tests__/company-product-principals-schema.test.ts` | ISOLATION | 1 |
