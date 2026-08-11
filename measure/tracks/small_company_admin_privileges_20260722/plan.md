# Implementation Plan: Small-Company Admin Privilege Simplification

## Dependencies and Preconditions

- The former full-repository graph baseline is historical/incomplete evidence,
  not a delivery prerequisite. Do not run a repository-wide graph scan,
  duplicate materialization, or giant audit payload for this track.
- Before owner-role implementation, complete one bounded Accounts/backend
  safety gate limited to the exact `apps/accounts` route surface and affected
  backend identity/role/capability modules. The gate is not accepted yet and
  must include the exact route/method inventory; authentication,
  authorization/permission ownership, Zod validation, company-global scope,
  immutable audit, and destructive-effect coverage; remediation of every known
  High finding in this scope, including the OIDC logout non-empty Bearer-token
  boundary, immutable-audit evidence, route/dimension evidence binding, and
  hash-bound command receipts; and these four focused commands only:
  `CI=true pnpm --filter accounts test`,
  `CI=true pnpm --filter accounts check-types`,
  `CI=true pnpm --filter @reading-advantage/backend test`, and
  `CI=true pnpm --filter @reading-advantage/backend check-types`. No graph
  command is part of this gate. Point `TMPDIR`, package-store/cache paths, and
  `NODE_COMPILE_CACHE` at ignored workspace-local `.cache/` directories; never
  write repository artifacts into system `/tmp`.
- Coordinate production release and legacy-auth retirement with
  `company_identity_sso_20260715` rather than creating a parallel SSO rollout.
- Phase 0 test strategy: [./test-strategy.md](./test-strategy.md). The strategy
  defines Red/Green/acceptance for sub-gates B2, B3, B4, B5, B6, immutable
  audit, and strict logout. The orchestrator must capture the immutable
  `phase_base_sha` with `git rev-parse HEAD` immediately after it commits this
  strategy and plan to the shared master tree; the captured SHA is the baseline
  for the Red phase. Do not embed a SHA that predates the strategy commit.

## Phase 0: Bounded Accounts and backend safety gate

- [x] Historical attempt: Verify the canonical `repo-graph` binary and document the stale-schema failure from the existing `graph.db`; this does not accept a current gate. (evidence: `4dd75a5d117f5ed92fb523b51ae17a9b0f6c0d87`)
- [x] Historical attempt: Rebuild `graph.db` from the monorepo source; this does not accept a current gate and must not be repeated for delivery. (evidence: `4dd75a5d117f5ed92fb523b51ae17a9b0f6c0d87`)
- [x] Historical attempt: Query the former broad symbol set; this is retained only as historical evidence and is not a current route or security inventory. (evidence: `4dd75a5d117f5ed92fb523b51ae17a9b0f6c0d87`)
- [b] Task: Publish or consume the failed graph-baseline evidence only as historical/incomplete context; defer the full-repository remediation for resource safety. (deferred:resource-safety-20260810)
- [x] Task: Execute one bounded Accounts/backend safety gate (not yet accepted): inventory every current `apps/accounts` route and HTTP method with its owning identity/role/capability boundary; cover authentication, permission ownership, Zod validation, single-company global scope, immutable audit, and destructive effects across Accounts and affected backend identity/role/capability surfaces; resolve the known High findings in this scope, including the POST `/api/oidc/logout` strict non-empty Bearer-token Zod boundary, immutable-audit trigger/test evidence, route/dimension evidence binding, and hash-bound receipts/owner identity; run exactly `CI=true pnpm --filter accounts test`, `CI=true pnpm --filter accounts check-types`, `CI=true pnpm --filter @reading-advantage/backend test`, and `CI=true pnpm --filter @reading-advantage/backend check-types`; obtain an independent review and record acceptance or rejection. No graph command is required or permitted by this gate. (implementation: `9355abf62d850be0cc65b9fc377fa5e2015c223b`)
  - 2026-08-10 progress: strict Zod validation now limits POST `/api/oidc/logout` to the exact 43-character base64url access-token grammar. Independent security and test-design reviews found no runtime blocker; the focused route suite passes 10/10 at commit `5c5c559a2`.
  - The full gate remains open. The four aggregate commands currently expose pre-existing cross-package dependency/configuration and APK type-test failures, so this progress does not unblock Phase S1 or CRM. Compact evidence: [phase0-bounded-command-gate-attempt-20260810.md](./phase0-bounded-command-gate-attempt-20260810.md).
  - 2026-08-11 Mid Red dispatch uses `phase_base_sha=02dd4580a7c93ab89f29f7c25747b0bde92eb152` and `role_base_sha=6e858b9e1980eb514528cbd148714b1e97e8e8c7`. No graph command ran.
  - B2 Red test: `packages/backend/src/modules/company-identity/__tests__/route-bindings.security.test.ts`. The focused command exits 1 with one failed test and two skipped tests. The candidate persists `routeBindingId: accounts.oidc.logout`, `routeMethod: POST`, and the logout path from the public subpath. This is a candidate failure.
  - The diagnostic lease excludes `protocol-safety.red.test.ts`. Its existing generic root-export guard passes, but it does not test the public internal-route-adapter subpath. The new B2 test stays inside the leased route-binding test path.
  - B3 mismatch Red test: the focused command exits 1 because the executor resolves the mismatched create operation. The exact dimension test passes with 17 primary operations and 39 effective route/method rows. The table is already green evidence; the runtime mismatch remains open.
  - B4 PostgreSQL Red tests use the shared disposable database harness. With PostgreSQL 16 available, the focused file exits 1 with two failed tests: all three cross-organization operations are `ALLOWED`, and the second active organization insert succeeds. These are candidate failures.
  - B5 PostgreSQL tests pass 3/3 with concurrent role removal, concurrent suspension, credential reset, auth-version changes, and central/child session revocation. The exact package command exits 1 because other candidate tests fail, but the selected B5 file passes. B5 behavior is already satisfied at the candidate HEAD, so this role records evidence and does not claim a false Red failure.
  - B6 Red test: `apps/accounts/lib/server/company-identity-route-bindings.test.ts`. The focused command exits 1 because a framework binding has `exposure: authenticated` instead of `public`. This is a candidate failure.
  - Audit metadata contract tests pass 3/3, including an unreviewed-key counterexample. The existing backend protocol audit suite passes 19/19 at the dirty candidate and covers `authorize`, `exchangeCode`, `localLogout`, and `globalLogout` audit appends. The strategy title filter does not match a current service test, so the direct service-file command is the valid focused evidence. The immutable-trigger assertions pass, but the full PostgreSQL privilege file exits 1 on the candidate identity doctor because migration `0002_identity_audit_metadata_allowlist` has no reviewed sentinel. This is a candidate failure.
  - Strict logout passes 10/10 when the route file runs without a name filter. The strategy filter `-t "oidc logout"` selected zero tests because the current test title uses uppercase `OIDC`; the unfiltered route file is the valid focused evidence. Strict logout is already green.
  - The focused backend test type command reports unrelated APK root-directory errors and existing planned-game contract errors. It reports no type error from the new route, scope, or admin-safety test code after the shared harness load became dynamic.
  - 2026-08-11 Green evidence: B2 and B3 route security passed 3/3; B4 PostgreSQL scope passed 2/2; B5 PostgreSQL admin safety passed 3/3; B6 route registry passed 5/5; audit metadata, immutable trigger, and identity doctor passed 10/10; service protocol audit passed 19/19; and strict logout passed 10/10. `accounts test` passed 48 tests with one intentional database skip. `accounts check-types` exited 0. `backend test` had only 20 unrelated Finance controlled-import Red failures. `backend check-types` had only unrelated APK root-directory and planned-game contract failures. The candidate implementation is `9355abf62d850be0cc65b9fc377fa5e2015c223b`. Independent acceptance remains required.

## Phase S1: Grant owner application access
_Story ref: spec.md#story-s1_

- [b] Task: Define the exact owner-to-application role mapping contract and startup validation. (deferred:small_company_admin_privileges_20260722-bounded-accounts-safety-gate)
- [b] Task: Write Red token, introspection, missing-mapping, ordinary-employee, suspension, and counterexample tests. (deferred:small_company_admin_privileges_20260722-bounded-accounts-safety-gate)
- [b] Task: Implement derived owner roles at the Accounts audience/token boundary without persisting duplicate assignments. (deferred:small_company_admin_privileges_20260722-bounded-accounts-safety-gate)
- [b] Task: Run Accounts/backend/app authorization suites, bounded route/security review, generated facts, and doctor gates; do not run a graph scan. (deferred:small_company_admin_privileges_20260722-bounded-accounts-safety-gate)
- [b] Task: Measure - User Manual Verification 'Phase S1: Grant owner application access' (Protocol in workflow.md) (deferred:small_company_admin_privileges_20260722-bounded-accounts-safety-gate)

## Phase S2: Simplify owner administration
_Story ref: spec.md#story-s2_

- [b] Task: Define UI projection contracts distinguishing inherited owner access from explicit employee roles. (deferred:small_company_admin_privileges_20260722-s1-acceptance)
- [b] Task: Write Red UI, accessibility, last-admin, and audit tests. (deferred:small_company_admin_privileges_20260722-s1-acceptance)
- [b] Task: Update Accounts labels and controls so owner access is visible but not redundantly editable. (deferred:small_company_admin_privileges_20260722-s1-acceptance)
- [b] Task: Run Accounts component/security tests, responsive browser review, bounded route/security review, and doctor gates; do not run a graph scan. (deferred:small_company_admin_privileges_20260722-s1-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S2: Simplify owner administration' (Protocol in workflow.md) (deferred:small_company_admin_privileges_20260722-s1-acceptance)

## Phase S3: Verify and release access
_Story ref: spec.md#story-s3_

- [b] Task: Define immutable production smoke evidence and rollback thresholds for all current internal apps. (deferred:small_company_admin_privileges_20260722-s2-acceptance)
- [b] Task: Add opt-in smoke tests for owner allow, ordinary-employee deny, revocation, logout, and rollback behavior. (deferred:small_company_admin_privileges_20260722-s2-acceptance)
- [b] Task: Deploy through the existing Accounts/Marketing/Sales/Codecamp release paths and complete the inherited-access browser matrix. (deferred:small_company_admin_privileges_20260722-s2-acceptance)
- [b] Task: Reconcile the predecessor SSO observation/legacy-auth gates, run final acceptance, and archive only after owner approval. (deferred:small_company_admin_privileges_20260722-s2-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S3: Verify and release access' (Protocol in workflow.md) (deferred:small_company_admin_privileges_20260722-s2-acceptance)
