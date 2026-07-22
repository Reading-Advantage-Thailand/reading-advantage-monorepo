# Implementation Plan: Small-Company Admin Privilege Simplification

## Dependencies and Preconditions

- Successfully rebuild `graph.db` with the canonical `repo-graph` schema before
  implementation; record why prior full scans timed out and do not consume the
  stale graph as current Accounts evidence.
- Coordinate production release and legacy-auth retirement with
  `company_identity_sso_20260715` rather than creating a parallel SSO rollout.

## Phase 0: Restore the program graph baseline

- [~] Task: Verify the canonical `repo-graph` binary and document the stale-schema failure from the existing `graph.db`.
- [~] Task: Rebuild `graph.db` from the current monorepo source without consuming partial or timed-out output.
- [~] Task: Prove current Accounts, backend-kernel, company-identity, license, and www symbols are queryable with `repo-graph stats`, `search`, `inspect`, and `callers`.
- [~] Task: Publish the accepted graph baseline SHA, tool version, commands, counts, and known parser exclusions for both Track 1 and Track 2.

## Phase S1: Grant owner application access
_Story ref: spec.md#story-s1_

- [b] Task: Define the exact owner-to-application role mapping contract and startup validation. (deferred:small_company_admin_privileges_20260722-phase0-acceptance)
- [b] Task: Write Red token, introspection, missing-mapping, ordinary-employee, suspension, and counterexample tests. (deferred:small_company_admin_privileges_20260722-phase0-acceptance)
- [b] Task: Implement derived owner roles at the Accounts audience/token boundary without persisting duplicate assignments. (deferred:small_company_admin_privileges_20260722-phase0-acceptance)
- [b] Task: Run Accounts/backend/app authorization suites, update the graph and generated facts, and pass doctor gates. (deferred:small_company_admin_privileges_20260722-phase0-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S1: Grant owner application access' (Protocol in workflow.md) (deferred:small_company_admin_privileges_20260722-phase0-acceptance)

## Phase S2: Simplify owner administration
_Story ref: spec.md#story-s2_

- [b] Task: Define UI projection contracts distinguishing inherited owner access from explicit employee roles. (deferred:small_company_admin_privileges_20260722-s1-acceptance)
- [b] Task: Write Red UI, accessibility, last-admin, and audit tests. (deferred:small_company_admin_privileges_20260722-s1-acceptance)
- [b] Task: Update Accounts labels and controls so owner access is visible but not redundantly editable. (deferred:small_company_admin_privileges_20260722-s1-acceptance)
- [b] Task: Run Accounts component/security tests, responsive browser review, graph update, and doctor gates. (deferred:small_company_admin_privileges_20260722-s1-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S2: Simplify owner administration' (Protocol in workflow.md) (deferred:small_company_admin_privileges_20260722-s1-acceptance)

## Phase S3: Verify and release access
_Story ref: spec.md#story-s3_

- [b] Task: Define immutable production smoke evidence and rollback thresholds for all current internal apps. (deferred:small_company_admin_privileges_20260722-s2-acceptance)
- [b] Task: Add opt-in smoke tests for owner allow, ordinary-employee deny, revocation, logout, and rollback behavior. (deferred:small_company_admin_privileges_20260722-s2-acceptance)
- [b] Task: Deploy through the existing Accounts/Marketing/Sales/Codecamp release paths and complete the inherited-access browser matrix. (deferred:small_company_admin_privileges_20260722-s2-acceptance)
- [b] Task: Reconcile the predecessor SSO observation/legacy-auth gates, run final acceptance, and archive only after owner approval. (deferred:small_company_admin_privileges_20260722-s2-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S3: Verify and release access' (Protocol in workflow.md) (deferred:small_company_admin_privileges_20260722-s2-acceptance)
