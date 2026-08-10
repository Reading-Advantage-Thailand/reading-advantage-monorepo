# Phase 1 Sales graph acceptance — 2026-08-11

## Accepted scope

The Sales curriculum is accepted as a versioned, provider-neutral knowledge
graph and activity-binding package for later admission to the shared Mastery
runtime. The accepted release contains:

- the exact six approved modules, 27 lesson objectives, and their approved
  order;
- 34 nodes and 33 containment edges, with no inferred prerequisite or external
  standard claims;
- 49 exact curriculum bindings: 27 lesson exposures, 14 quiz assessments, and
  eight roleplays;
- immutable byte-bound copies of the release candidate, owner approval, and
  deterministic source seed;
- deterministic graph, binding, rubric, and source-evidence drift checks; and
- fail-closed runtime exports that verify the packaged evidence before exposing
  reviewed artifacts.

All eight roleplays remain pending. The release rejects assessed roleplay
evidence until a future owner-reviewed evaluator release and immutable-attempt
verifier exist.

This milestone does not admit Sales to the shared runtime, persist KST/SRS
evidence, change the Sales application, or claim production QA. Those remain
later phases in this track.

## Verification evidence

Verification used direct repository binaries and repository-local ignored
caches. No package install, system `/tmp` write, or deployment was performed.

- Sales knowledge Vitest: 3 files, 19 tests passed, including six adversarial
  release tests.
- TypeScript `--noEmit`: passed.
- Focused ESLint: passed.
- Compile and data-copy build: passed.
- Canonical graph digest:
  `5f2b35f7178f0fed9ca103959d59d5e75c0f4818eac355c14a1be270776a9808`.
- Canonical binding digest:
  `e8843314e2f381a44143acb08c6ff6596bdeac4e9da32fbdb9a5851c8ed32197`.
- Exact source evidence digests were reverified for the release candidate,
  owner approval, and static seed.
- Independent review initially rejected omitted runtime evidence, forged
  assessed-roleplay provenance, and order normalization. All three blockers
  were remediated and the final independent rereview accepted the package.
- The root lockfile change is limited to the new
  `packages/sales-knowledge` importer.

## Next gate

Phase 0 runtime admission must use a new Sales-specific release set. It must not
reuse the synthetic Codecamp proof graph or change the shared engine merely to
make Sales pass admission.
