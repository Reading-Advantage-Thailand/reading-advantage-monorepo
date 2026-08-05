# R1-v3 Podman Execution Attempt 20260804-0005 — Evidence Summary

**Date:** 2026-08-04 (launched ~22:40 +0700, exited ~23:16, log `/tmp/opencode/r1v3-attempt-20260804-f.log`)
**Outcome:** BLOCKED — `accounts-test` stage, `COMMAND_EXIT_NONZERO`
**Significance:** The direct-runtime-trace stage PASSED end-to-end for the first time (H6/H7/H9a/H9b closed). The transaction advanced past offline-install, materialize, builds, catalog generation, and trace capture/parse/validation to the FR4 test gates.

## Blocking error

```
V3_PODMAN_CANDIDATE_BLOCKED: direct-runtime-transaction: V3_PODMAN_GATE_FAILED: accounts-test
```

- `failure.stage`: `accounts-test` (`pnpm --filter accounts test`)
- `failure.classification`: `COMMAND_EXIT_NONZERO`
- Root cause (from raw receipts): vitest suite `apps/accounts/scripts/product-role-rejection.test.ts` fails with `Failed to resolve entry for package "@reading-advantage/domain"` — the package's frozen exports point at `./dist/*`, and the container build plan (`build-db`, `build-auth`, `build-backend`, `build-advantage-play-kit-for-runtime`) never builds `@reading-advantage/domain`. 32/33 tests pass; this is the only failing suite.

## Consequence

H11 static audit (`h11-command-plan-static-completeness-audit-pre-green-baseline-20260804.md`) generalized the finding: the FR4 gates require a build closure (`build-domain` + 7 more), and two closure builds reference `.mjs` pre-steps absent from the frozen R1 v2 archive (`activity-runtime/scripts/clean-dist.mjs`, `codecamp-knowledge/scripts/copy-data.mjs`) — a track-level decision fork.

## Evidence retention

Attempt dir totals **376 MB** (`failed-attempt.json` 393,792,672 bytes embedding the successful trace envelope) — above sane git object size. Full artifacts retained on local disk; this summary + SHA-256 manifest (`r1-v3-podman-execution-attempt-20260804-0005-manifest-sha256.txt`) committed instead.

- `failed-attempt.json` sha256: `fb47e4ddc957d57a1cebcae84dfd6a48c1e8027e6f1afb3bb8b711bc547b7b0d` (valid JSON, `status: "BLOCKED"`, `kind: "execution-closure-failed-attempt"`)
- Raw receipts: `receipt-accounts-test.stdout.txt` / `.stderr.txt` (sha256 in manifest)
