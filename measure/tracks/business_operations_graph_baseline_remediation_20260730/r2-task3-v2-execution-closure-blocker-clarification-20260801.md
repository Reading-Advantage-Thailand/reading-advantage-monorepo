# R2 Task 3 v2 Blocker Clarification (2026-08-01)

This clarification is part of the execution-closure evidence for
R2 Task 3 v2 and refines the diagnosis in
r2-task3-v2-execution-closure-blocker-20260801.md.

The unresolved @reading-advantage workspace package entries in the four raw
FR4 receipts are caused by derivable workspace dist outputs not being present
after the externally recorded offline install. They are not a finding that the
frozen Accounts or backend source is defective. A future authorized
execution-closure profile may build those outputs from the exact frozen source
and preserve its build receipt.

The following are instead non-derivable omissions from the v2 manifest and
cannot be repaired by a source build:

- apps/accounts/cloudbuild.yaml;
- packages/db/drizzle/0043_codecamp_company_principal_sync.sql;
- packages/db/company-identity/drizzle/0001_immutable_identity_audit.sql.

The first two block portions of the captured FR4 suite. The last prevents the
v2-only security matrix from citing the exact immutable-audit SQL control.
Neither a shared-worktree overlay nor an invented citation is permitted.
