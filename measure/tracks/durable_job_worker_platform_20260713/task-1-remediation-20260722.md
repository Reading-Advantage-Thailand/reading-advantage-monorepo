# Task 1 Remediation Evidence — 2026-07-22

## Scope and decision

This producer pass addresses independent-review findings `WKR-T1-H1` and
`WKR-T1-L1` only. Task 1 remains **in progress** and Task 2 remains locked until
a fresh independent reviewer returns PASS.

## WKR-T1-H1 — build-context and secret boundary

- `Dockerfile.dockerignore` now re-excludes `node_modules`, `dist`, `.turbo`,
  `coverage`, `.env`, and `.env.*` in both admitted package trees after their
  broad re-includes.
- `validateWorkerBuildContextDefinition` requires every directory rule and its
  recursive form, requires both environment-file forms, rejects exclusions
  placed before the applicable broad re-include, and continues to reject any
  unapproved rule.
- Red: the focused OCI suite produced 13 expected failures before the fix: 12
  missing-exclusion counterexamples plus one unsafe-order counterexample.
- Green: the same focused suite passed 18/18 tests after the fix.
- Engine-level proof: two empty, non-secret `.env.worker-context-sentinel`
  files were placed temporarily in `services/worker` and `packages/config`.
  Existing `.turbo` logs and `services/worker/coverage/coverage-summary.json`
  served as ignored-artifact counterexamples. A fresh exact `build` target
  (`sha256:fd6af80d964de1e6243553e5cd391cd4e036d431f85b2b929566f9ef8cb5e0b9`)
  built with the checked-in ignore file. Inspection returned
  `worker.context.exclusions_verified`: neither environment sentinel nor any
  checked ignored artifact existed under `/workspace`. Both sentinels were
  deleted immediately and are absent from `git status`.

## WKR-T1-L1 — canonical combined coverage

`services/worker/vitest.config.ts` now pins the Task 1 production coverage
scope and disables the text reporter's `skipFull` behavior. The canonical
command is:

```bash
CI=true pnpm --dir services/worker run test:coverage
```

It passed 3 files and 31 tests. The single report enumerated all three intended
Task 1 production modules:

| File | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| `health.ts` | 97.43% | 82.14% | 100% | 100% |
| `oci-contract.ts` | 100% | 100% | 100% | 100% |
| `startup-config.ts` | 100% | 100% | 100% | 100% |
| **Combined** | **98.94%** | **90.90%** | **100%** | **100%** |

The config also enforces an 80% threshold for statements, branches, functions,
and lines.

## Exact image and runtime gates

- Rebuilt image:
  `sha256:4f6ab4084cbe33ecbb7dae72a980910d7d193fdf7753836d364116c664f211b7`
  (169,375,064 bytes, user `node`, command `node dist/main.js`, port 8080).
- `/livez` and `/readyz` returned HTTP 200 from a disposable container.
- SIGTERM emitted ordered `worker.health.ready`, `worker.health.draining`, and
  `worker.health.stopped` events and exited 0.
- `PORT=0` failed closed with exit 1 and a structured startup error containing
  no environment value or secret.
- Podman 4.9 again warned that Dockerfile `HEALTHCHECK` metadata is ignored in
  its default OCI image format; the provider contract and external probes both
  passed.

## Focused quality gates

- Direct ESLint: PASS.
- Direct TypeScript no-emit: PASS.
- Direct TypeScript build: PASS.
- `validate:oci --target cloud-run --target ecs-fargate`: PASS.
- `git diff --check`: PASS.
- Scoped DB/queue leakage scan: the only match is the OCI validator's required
  forbidden-token check; no Task 2+ implementation entered the worker.

## Re-review requirement

This producer evidence does not close the prior independent FAIL. A fresh
independent reviewer must verify the checked-in context behavior, the canonical
coverage report, the exact image, and the absence of Task 2+ leakage before the
orchestrator may restore Task 1 to complete or unlock Task 2.
