# Business Operations Graph Baseline Remediation

## Overview

Repair the shared repository-graph safety gate required by
`small_company_admin_privileges_20260722` and
`customer_licensing_crm_20260722`. The prior producer completed a canonical
scan, but independent Review B returned `FAIL`: the graph was not bound to
reproducible dirty-worktree source bytes, `repo-graph audit` exited `1` with
3,965 unaudited fields/routes, and 26 current TypeScript files were outside
graph coverage.

This track creates evidence and verification infrastructure only. It does not
grant `COMPANY_ADMIN` privileges, implement CRM behavior, change either
successor plan's blocked markers, or claim that Phase 0 is resolved.

## Failure Baseline

- **RB-01 — source provenance:** the scan used shared dirty `master`, while
  graph metadata recorded `commitSha: null`; the graph hash alone cannot
  reproduce the source bytes.
- **RB-02 — audit coverage:** audit exit `1` reported 3,300 unaudited fields
  and 665 unaudited routes, including 17 Accounts authorization routes.
- **RB-03 — source/test coverage:** 26 verified current TypeScript files were
  absent from graph file rows because package tsconfig exclusions hide tests,
  test support, configuration, and the backend PostgreSQL harness.

The accepted baseline must fail closed for each condition. Empty freshness
arrays for already-indexed rows are not sufficient evidence.

## Functional Requirements

### FR1 — Versioned acceptance contract and counterexamples

1. Define a versioned machine-readable acceptance envelope for snapshot,
   graph, audit, exclusion, security-route, test-command, optional upstream
   issue, and independent-review evidence.
2. Validate all external JSON and command-result inputs at runtime. Reject
   missing fields, unknown success states, duplicate paths, digest mismatch,
   zero-item compensation, mutable evidence paths, and producer self-approval.
3. Preserve counterexamples for each Review B finding, concurrent source drift,
   omitted unaudited nodes, omitted excluded tests, a false clean-audit claim,
   and a required-but-missing upstream issue.
4. The executable contract must classify the current failed evidence as
   blocked before any producer implementation is accepted.

### FR2 — Reproducible source snapshot in the shared dirty worktree

1. Operate only in the one physical worktree on `master`; do not create a Git
   worktree, clean/stash/reset the tree, change the real index, or stage,
   revert, overwrite, or commit unrelated APK work.
2. Freeze a scanner-input denominator covering current TypeScript candidates
   (`.ts`, `.tsx`, `.mts`, `.cts`), every applicable `tsconfig*.json` and its
   `extends` chain, package manifests, workspace/lock configuration, and any
   discovered `build-graph.config.json`.
3. Publish a deterministic archive containing the exact denominator bytes and
   a manifest containing relative path, SHA-256, size, mode or symlink target,
   Git tracked/untracked state, pre/post HEAD interval, branch, tool version,
   scan command/config, and hashes of scanner-input-scoped porcelain status
   and staged diff. The R0 projection retains the pre-scan HEAD and pre-scan
   scanner-state aliases required by its unchanged v1 contract.
4. Hash the complete denominator immediately before and after each accepted
   scan. Any scanner-input path, metadata, content, scanner-scoped status, or
   scanner-scoped staged-diff drift invalidates the run. A branch change,
   non-ancestor history rewrite, or any intervening committed scanner-input
   path also invalidates the run, including a changed-and-reverted path.
   Non-scanner documentation changes are recorded in the pre/post HEAD
   interval but do not invalidate an otherwise identical source binding.
5. Prove that the archive reproduces its manifest and that every graph file row
   resolves to the same path and content hash in the frozen snapshot. A null
   graph `commitSha` is acceptable only when this independent dirty-tree source
   binding is complete and accepted.

### FR3 — Honest graph audit disposition

1. First attempt the clean path using only documented `repo-graph 0.1.0`
   commands and configuration (`scan --config`, `--include`, and the published
   config schema). Record raw commands, stdout/stderr, exits, and artifact
   hashes; do not alter application source merely to silence the audit.
2. **Clean path:** acceptance may rely on the audit only if exit is `0` and all
   missing, stale, orphan, duplicate, and unaudited collections are empty.
3. **Compensation path:** if a clean audit is unsupported, freeze the exact
   non-empty unaudited denominator and reconcile every route/field node to the
   frozen source path, line span, declaration fingerprint, and source-range
   digest. Two full scans over unchanged denominator bytes must produce the
   same normalized route/field and file inventories.
4. Compensation is not a clean-audit claim. Its evidence must preserve the
   original non-zero audit exit and exact limitations.

### FR4 — Security-sensitive route coverage

1. Enumerate all Accounts routes in the unaudited denominator, with the known
   17-route set as a minimum rather than a hard-coded total.
2. For every route, record source anchors and explicit dispositions for
   authentication, authorization/permission ownership, request validation,
   tenant or global-boundary scope, immutable audit behavior, and destructive
   session/credential/employee-state effects.
3. Map each disposition to executable Accounts/backend tests or a separately
   reviewed source assertion. Missing evidence, an ad hoc role check, an
   unvalidated boundary, or an unexplained tenant disposition blocks
   acceptance.
4. Required focused gates include `CI=true pnpm --filter accounts test`,
   `CI=true pnpm --filter accounts check-types`,
   `CI=true pnpm --filter @reading-advantage/backend test`, and
   `CI=true pnpm --filter @reading-advantage/backend check-types`.

### FR5 — tsconfig-excluded current TypeScript coverage

1. Compute the candidate-TypeScript minus graph-files set from the frozen
   snapshot; do not use a hand-maintained count of 26 as the denominator.
2. For every excluded file, record path, digest, owning package, exact tsconfig
   exclusion, production/test/test-support/config class, Admin/CRM relevance,
   and one accepted disposition.
3. Each exclusion must either be included by a dedicated graph-safe config or
   receive compensating source-anchor, type-check, and executable-test
   coverage. Zero exclusions is valid; an empty compensation ledger while
   exclusions exist is not.
4. The backend PostgreSQL harness requires the backend gates in FR4. Current
   Advantage Play Kit and Advantage Games exclusions require, against the same
   snapshot, `CI=true pnpm --filter @reading-advantage/advantage-play-kit test`,
   `CI=true pnpm --filter @reading-advantage/advantage-play-kit check-types`,
   `CI=true pnpm --filter vocabulary-games test -- --runInBand`, and
   `CI=true pnpm --filter vocabulary-games check-types`. A failure remains
   visible and blocks an unqualified baseline acceptance; this track must not
   fix unrelated APK code.

### FR6 — Conditional upstream repo-graph issue

1. Do not open an upstream issue for a project-owned tsconfig/configuration
   mistake that can be corrected safely with documented behavior.
2. An upstream issue is required only if the clean path remains impossible
   because `repo-graph` cannot audit scanner-emitted route/field nodes or cannot
   represent required source coverage through its documented interface, and
   acceptance therefore depends on compensation.
3. When required, create one minimal, non-sensitive reproduction in
   `bodangren/repo-graph` containing version, commands, expected/observed exits,
   a tiny fixture, and the relevant normalized audit excerpt. Record the issue
   URL/number and immutable local receipt. Do not include unrelated repository
   source or dirty-worktree data.

### FR7 — Independent acceptance and unblock authority

1. The producer may publish only a candidate. A separate independent reviewer
   must verify the frozen snapshot, graph digest, clean-or-compensation branch,
   security-route matrix, excluded-file denominator, test exits, conditional
   issue decision, and anti-pattern controls.
2. Review must explicitly reassess RB-01, RB-02, RB-03 and A5, A6, A8, A10,
   A12, A15, and A16. Any Critical/High finding or evidence mismatch denies
   acceptance.
3. Until a machine-readable independent decision says `ACCEPT`, keep Admin
   Phase S1 and CRM contract/schema/Red work blocked. Track creation, a scan,
   passing focused tests, or producer completion alone cannot lift either gate.
4. Only a post-acceptance handoff may update the parent Phase 0 task and the CRM
   dependency markers. That handoff must cite the accepted evidence hashes and
   must not broaden authorization beyond the two named successor tracks.

## Non-Functional Requirements

- Use contract-first TDD: record a failing Red command before implementing the
  producer or validator, then implement only enough to satisfy the frozen
  contracts.
- Evidence generation must be deterministic, non-interactive, secret-safe, and
  idempotent; unexpected files or schema versions fail closed.
- Use `repo-graph`, not provider SDKs or a parallel graph implementation.
- Never edit `measure/automation-supervisor.py` in this track.
- New helper functions require documentation and focused tests under local
  conventions.
- Task markers in this track use only `[~]`, `[x]`, and `[b]`.

## Acceptance Criteria

- A replayable archive and manifest bind the exact dirty-worktree scanner input
  while pre/post drift checks prove the accepted scan saw those bytes.
- The graph artifact and required Accounts/backend/license/www probes are bound
  to that source snapshot.
- Audit exit is either clean with no unaudited nodes or truthfully compensated
  for every unaudited route/field; no non-zero exit is described as clean.
- Every current TypeScript exclusion has exact inclusion or compensating
  coverage, and all required commands used for acceptance exit successfully.
- Security-sensitive Accounts routes have explicit auth, authorization,
  validation, scope, and audit dispositions with executable evidence.
- Any required upstream issue is recorded; no unnecessary issue is created.
- Independent review accepts the exact candidate with no Critical/High finding
  before either successor is unblocked.

## Out of Scope

- Implementing owner-role mapping, CRM schema/capabilities/UI, lead intake,
  licensing, provisioning, or product authorization.
- Cleaning or repairing unrelated APK work, changing its source, or claiming
  its product acceptance.
- Rewriting `repo-graph`, replacing it with another scanner, or changing Measure
  orchestration infrastructure.
- Committing, deploying, or archiving successor tracks.
