# Verification: Durable Job Worker Platform

## Task 1 — Worker package and OCI/health bootstrap

### Producer evidence

See Task 1 in `plan.md` for the producer's Red/Green, image, and runtime notes.

### Independent review — 2026-07-22

- Decision: **FAIL; Task 1 reopened.**
- Report: `task-1-independent-review-20260722.md`
- Blocking finding: the Dockerfile-specific ignore rules re-include all worker
  and shared-config package contents, including ignored build artifacts and any
  future package-local `.env*` files. A scratch build proved an ignored Turbo
  artifact is present in the context.
- Passing scoped evidence: 18/18 tests; isolated module coverage above 80%;
  lint, typecheck, build, dual-target OCI validation, frozen offline lockfile,
  live/readiness probes, invalid-env failure, and SIGTERM exit behavior pass.
- Aggregate architecture status: repository-wide exit 1 from 67 unrelated
  company-identity/database findings; zero finding lines name
  `services/worker`. This does not waive the worker's own build-context failure.

Task 1 may be accepted only after remediation and a fresh independent PASS.

### Fresh independent re-review — 2026-07-22

- Decision: **PASS; WKR-T1-H1 and WKR-T1-L1 closed.**
- Report: `task-1-independent-rereview-20260722.md`
- Build context: exact-ignore scratch export contained 45 paths and zero
  sentinel, `node_modules`, `dist`, `.turbo`, coverage, or `.env*` matches;
  every disposable fixture/artifact was removed.
- Canonical coverage: 31/31 tests; all three configured modules enumerated;
  98.94% statements, 90.90% branches, 100% functions, 100% lines.
- Quality/runtime: lint, no-emit, build, Cloud Run/ECS validation, frozen
  offline lock, liveness/readiness, SIGTERM, and invalid-env gates pass.
- Boundary: no Task 2+ leakage. Browser checks are not applicable and graph
  callers are skipped because `graph.db` is stale.
- Ownership: the reviewer did not mark Task 1 complete, unlock Task 2, commit,
  or modify production code. Parent-orchestrator acceptance remains required.
