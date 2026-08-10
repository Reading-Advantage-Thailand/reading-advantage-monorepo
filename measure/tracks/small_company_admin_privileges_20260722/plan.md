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

## Phase 0: Bounded Accounts and backend safety gate

- [x] Historical attempt: Verify the canonical `repo-graph` binary and document the stale-schema failure from the existing `graph.db`; this does not accept a current gate.
- [x] Historical attempt: Rebuild `graph.db` from the monorepo source; this does not accept a current gate and must not be repeated for delivery.
- [x] Historical attempt: Query the former broad symbol set; this is retained only as historical evidence and is not a current route or security inventory.
- [b] Task: Publish or consume the failed graph-baseline evidence only as historical/incomplete context; defer the full-repository remediation for resource safety. (deferred:resource-safety-20260810)
- [~] Task: Execute one bounded Accounts/backend safety gate (not yet accepted): inventory every current `apps/accounts` route and HTTP method with its owning identity/role/capability boundary; cover authentication, permission ownership, Zod validation, single-company global scope, immutable audit, and destructive effects across Accounts and affected backend identity/role/capability surfaces; resolve the known High findings in this scope, including the POST `/api/oidc/logout` strict non-empty Bearer-token Zod boundary, immutable-audit trigger/test evidence, route/dimension evidence binding, and hash-bound receipts/owner identity; run exactly `CI=true pnpm --filter accounts test`, `CI=true pnpm --filter accounts check-types`, `CI=true pnpm --filter @reading-advantage/backend test`, and `CI=true pnpm --filter @reading-advantage/backend check-types`; obtain an independent review and record acceptance or rejection. No graph command is required or permitted by this gate.
  - 2026-08-10 progress: strict Zod validation now limits POST `/api/oidc/logout` to the exact 43-character base64url access-token grammar. Independent security and test-design reviews found no runtime blocker; the focused route suite passes 10/10 at commit `5c5c559a2`.
  - The full gate remains open. The four aggregate commands currently expose pre-existing cross-package dependency/configuration and APK type-test failures, so this progress does not unblock Phase S1 or CRM. Compact evidence: [phase0-bounded-command-gate-attempt-20260810.md](./phase0-bounded-command-gate-attempt-20260810.md).

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
