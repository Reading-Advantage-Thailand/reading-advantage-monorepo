# Phase 3 Test Strategy: Analyzer and Ratchet Implementation

**Track:** `backend_architecture_enforcement_20260713`
**Phase:** Phase 3: Analyzer and Ratchet Implementation
**Scope:** Tasks 9–12 only
**Strategy owner:** `measure-strategy`
**Role-base SHA:** `12adea393315a55f7c13b29b2161ce83b852ef82`
**Immutable pre-Green baseline candidate:** `dc4cb75c8e7a4a41d9e4eb451566dba40dcdbd81`

## 1. Baseline and current revision

The supplied baseline candidate is a real commit, is an ancestor of the role-base
HEAD, and is the child of the accepted Phase 2 Red evidence commit:

```bash
git rev-parse --verify dc4cb75c8e7a4a41d9e4eb451566dba40dcdbd81^{commit}
git show -s --format='%P %H %s' dc4cb75c8e7a4a41d9e4eb451566dba40dcdbd81
git merge-base --is-ancestor dc4cb75c8e7a4a41d9e4eb451566dba40dcdbd81 HEAD
```

Expected result: the candidate resolves, its parent is `ef7eea7d`, and the
ancestry check exits zero. At the candidate tree neither
`packages/architecture-enforcement/src/analyzer.ts` nor `src/ratchet.ts`/`src/ratchet.js`
exists. It is therefore a valid pre-Green marker, not a claim that Phase 3 is
already Green.

The current role-base HEAD contains the partial implementation from
`304e2029f13fe655913bfaad4c4b95b1ab16828a`. That commit adds
`loadArchitectureSources` and loader-resolution tests, but does not add
`analyzeArchitectureSources` or the ratchet. The loader tests are useful partial
progress and must remain Green; they do not replace the Phase 2 analyzer and
ratchet Red assertions. At role entry the focused suite is intentionally Red:
25 failures (21 analyzer counterexample cases and four ratchet behavior cases),
with the resolution and prior contract/fixture tests executing as Green.

The Phase 2 Red artifact remains the historical Red oracle. The current partial
revision must be revalidated with this exact, non-vacuous command before Green:

```bash
CI=true pnpm exec vitest run packages/architecture-enforcement/src/__tests__
```

The command must report two failing files and named failures from
`analyzer-counterexamples.red.test.ts` and `ratchet.red.test.ts`. A missing test
file, a skipped suite, a module-transform failure, or a changed test filter is
not valid Red evidence.

## 2. Proof standard and intentional Red handling

This phase proves executable AST behavior, not source-text claims. Green means:

- the same explicit focused test paths used for Red execute and report at least
  one passing test and zero failed or skipped tests;
- all 21 named analyzer cases and all five ratchet assertions execute;
- parser, resolver, and policy failures fail closed with a non-zero command exit;
- JSON and human diagnostics contain only stable, secret-safe facts; and
- the reviewed 464 database plus 27 provider baseline findings are not silently
  removed, reclassified, or broadened.

No `--passWithNoTests`, broad `-t` filter, `|| true`, ignored pipeline exit, or
renamed `.red.test.ts` file is allowed. A broader aggregate suite may have
unrelated repository failures, but it cannot be used to hide a focused Phase 3
failure. Record aggregate failures separately as pre-existing or out of scope;
the focused gate remains authoritative.

The Red/Green command must be run with a log whose exit status is preserved:

```bash
set -o pipefail
CI=true pnpm exec vitest run packages/architecture-enforcement/src/__tests__ \\
  --reporter=verbose | tee /tmp/backend-architecture-phase3-focused.log
```

The implementation role must additionally inspect the labeled `Test Files` and
`Tests` lines in that log. Green requires a labeled positive test count and
explicit zero failed/skipped counts; a command that prints no executed-test
summary is a gate failure rather than a pass.

## 3. Task-level test matrix

### Task 9 — workspace-aware AST loading (risk: high)

**Red oracle:** the accepted Phase 2 focused command above, where the analyzer
entry point is absent. The partial `304e2029` loader tests are not to be deleted
or weakened.

**Green behavior and fixtures:**

- `analyzer-resolution.test.ts` must continue to prove exact workspace export
  resolution, tsconfig alias resolution, local barrel/re-export resolution,
  namespace imports, CommonJS `require`, and static-string dynamic imports.
- malformed TypeScript, unreadable sources, malformed resolver configuration,
  and unresolved internal modules must produce structured parse errors and a
  non-zero checker result; they must never become an empty finding set that is
  reported as Green.
- evidence is sorted independently of input/source traversal order. Reversed
  source paths must produce byte-identical JSON.
- computed dynamic imports are not treated as resolved static imports. If the
  analyzer cannot prove a relevant module target or parse the source, it fails
  closed rather than accepting the file through an unresolved fallback.
- no source body, absolute machine path, credential value, or generated build
  artifact may appear in evidence or diagnostics.

**Targeted Green command:**

```bash
CI=true pnpm exec vitest run \
  packages/architecture-enforcement/src/__tests__/analyzer-resolution.test.ts
```

This is a loader sub-gate only. Phase 3 is not Green while the analyzer matrix
or ratchet matrix remains Red.

### Task 10 — database ownership and direct-query detection (risk: critical)

**Fixtures and required counterexamples:**

- `database-direct-import`, `database-alias-import`,
  `database-barrel-import`, and `database-dynamic-import` detect direct,
  aliased, local-barrel/re-exported, and static dynamic database access.
- `database-raw-client-route` detects both `postgres()` construction and the
  raw SQL call from a transport route. Detection must be AST evidence, not a
  regex over the source body.
- `database-webhook-job-table` and `database-worker-job-table` detect direct
  `review_jobs` access from prohibited roots.
- `database-approved-postgres-job-adapter` is allowed only at the exact
  `packages/backend/src/jobs/adapters/postgres/` root.
- `database-worker-job-port` is allowed because it calls the port and does not
  import the job table/client.

Each positive must report the intended rule, source path, resolved target or
resource, evidence kind, and stable identities. Each negative must have an
empty finding collection for all rules, not merely no finding for its selected
rule; a different-rule violation is not a false Green.

**Targeted Green command:**

```bash
CI=true pnpm exec vitest run \
  packages/architecture-enforcement/src/__tests__/analyzer-counterexamples.red.test.ts \
  packages/architecture-enforcement/src/__tests__/database-counterexamples.test.ts
```

### Task 11 — provider ownership and client/credential detection (risk: critical)

**Fixtures and required counterexamples:**

- Provider positives are `provider-ai-direct-import`,
  `provider-ai-alias-import`, `provider-ai-client-construction`,
  `provider-ai-credential-read`, `provider-storage-barrel-import`, and
  `provider-integration-dynamic-import`.
- Provider negatives are the exact AI, storage, and GitHub adapter roots; the
  provider-neutral AI/storage interfaces; and the exact reviewed storage test
  exception. Their findings must be empty across every rule.
- SDK construction and credential reads must be emitted from AST nodes with
  `client-construction` and `environment-read` evidence. A provider import
  hidden behind an alias, barrel, `require`, or static dynamic import remains a
  violation when its resolved module/resource is selected by policy.

**Targeted Green command:**

```bash
CI=true pnpm exec vitest run \
  packages/architecture-enforcement/src/__tests__/analyzer-counterexamples.red.test.ts \
  packages/architecture-enforcement/src/__tests__/provider-counterexamples.test.ts
```

### Task 12 — ratchet, acknowledged update flow, and diagnostics (risk: high)

The ratchet must compare current findings by semantic identity and instance
identity. It must:

1. fail with `new-debt` when a new instance is added;
2. require baseline reduction when an existing finding disappears;
3. classify a path move with the same unresolved semantic violation as a rename,
   rather than allowing the moved violation to evade the baseline;
4. reject malformed policy and wildcard exceptions before comparison; and
5. serialize the same comparison byte-identically when current findings arrive
   in different orders.

Baseline update is a separate, explicit operation. A normal check may not write
baseline files. The update operation must print labeled additions, removals,
and renames, exit non-zero unless an explicit acknowledgement flag is supplied,
and preserve owner/rationale requirements. No wildcard or directory-wide debt
exemption may be generated.

**Targeted Green command:**

```bash
CI=true pnpm exec vitest run \
  packages/architecture-enforcement/src/__tests__/ratchet.red.test.ts \
  packages/architecture-enforcement/src/__tests__/baseline.test.ts \
  packages/architecture-enforcement/src/__tests__/baseline-validation.test.ts
```

The implementation must also expose the plan's non-interactive check command:

```bash
pnpm architecture:check
```

At this strategy revision the root script is absent, so this command is a
known current failure and cannot be reported as Green. If it remains absent
after Task 12, Phase 3 remains incomplete; the missing root command is not
papered over with a package-local alias or `|| true`. Phase 4 owns CI/doctor
wiring, but it must invoke this same checker rather than a second implementation.

## 4. Phase 3 aggregate Green and closeout gate

After the four task slices pass, run the complete package-focused gate with no
file filter that could omit a named case:

```bash
set -o pipefail
CI=true pnpm exec vitest run packages/architecture-enforcement/src/__tests__ \\
  --reporter=verbose | tee /tmp/backend-architecture-phase3-green.log
pnpm --filter @reading-advantage/architecture-enforcement check-types
pnpm --filter @reading-advantage/architecture-enforcement lint
pnpm --filter @reading-advantage/architecture-enforcement build
pnpm architecture:baseline:validate --format json
pnpm architecture:check
```

The focused log must show all test files executed, all tests passed, and no
skips. `architecture:baseline:validate` must still report 464 database entries,
27 provider entries, and the accepted ruleset hashes. `architecture:check` must
fail closed for parser/config errors and must not mutate either baseline.

The package coverage command is mandatory for newly introduced analyzer and
ratchet code:

```bash
CI=true pnpm exec vitest run packages/architecture-enforcement/src/__tests__ \
  --coverage --coverage.reporter=json-summary
```

The Green evidence must identify `src/analyzer.ts`, `src/ratchet.ts` (or the
chosen implementation path), and every new production module in
`coverage/coverage-summary.json`. Lines, statements, functions, and branches
for new Phase 3 production code must each be at least 80%. An absent coverage
provider, absent file denominator, or zero-file summary is a failure, not an
excuse to lower the threshold. Existing package coverage debt does not lower
this new-code floor.

The temporary-above-baseline proof must run the same checker against an exact,
isolated fixture copy containing one additional selected violation. The command
must exit non-zero, print a labeled `new-debt` result, and leave the committed
baselines unchanged. The corresponding deletion fixture must report a labeled
`baseline-reduction-required` result. These are live checker tests, not a claim
based on reading the ratchet source.

## 5. Generated output and live-versus-artifact evidence

Phase 3's generated output is the analyzer/ratchet result, not a new catalog or
route manifest. The output contract is:

- versioned JSON with canonical ordering of source paths, evidence, errors,
  findings, additions, removals, and renames;
- stable across two consecutive runs and across reversed input order;
- machine paths projected to repository-relative paths;
- no source bodies, secrets, timestamps, PIDs, or generated build files; and
- concise human diagnostics that include rule, path, location, evidence, and
  remediation/update status without embedding unbounded source text.

The following are live behavior tests: TypeScript AST parsing, path/workspace
resolution, alias/barrel/dynamic evidence, client/query/environment node
recognition, ownership decisions, parser failure, and ratchet exit status.

The following are artifact/serialization tests only and cannot substitute for
live behavior: JSON key ordering, SHA-256/byte comparisons of emitted output,
committed baseline schema validation, and the human diagnostic snapshot. Their
inputs must come from the live analyzer/ratchet result, and the temporary
above-baseline checker must prove the CLI exit code independently.

Phase 3 must not claim that `measure/generated/` is current: generated catalog
and route output, CI integration, and Measure doctor wiring are Phase 4 work.
If a structural implementation change causes a repository graph or generated
fact update, the owner must regenerate and verify it before Phase 4; this
strategy role does not edit generated artifacts.

## 6. Architecture guardrails and changed-contract risks

- Keep `loadArchitectureSources` as the loader seam introduced in `304e2029`;
  add rule detection over structured AST evidence rather than replacing it with
  grep or a source-text scanner.
- Keep all public result/config/finding types versioned and strict. Preserve the
  existing Zod contracts, JSDoc requirements, stable ordering, exact path
  validation, and secret-safe diagnostics.
- Resolve workspace aliases and local barrels to exact source targets. A renamed
  source with the same semantic violation must retain its semantic key.
- Treat only static-string dynamic imports as resolvable. Computed imports and
  internal resolver failures must be explicit fail-closed diagnostics.
- Approved ownership roots and exact test/fixture exceptions are the only
  allowances. Fixture roots are not broad exemptions, and a test exception may
  not exempt production code in the same directory.
- Durable job tables are queryable outside DB schema/migrations only in the exact
  PostgreSQL adapter root. Worker, webhook, transport, and handler direct access
  remains a finding even when the current baseline contains debt.
- Preserve existing tenant coverage and provider-boundary tests. No current
  production baseline entry may be deleted merely to make analyzer output Green.
- A normal check is read-only. Baseline updates require explicit acknowledgement
  and show additions/removals/renames before writing. Owner and rationale are
  required for every accepted entry.
- No live PostgreSQL, provider credential, network call, or browser session is
  required for this phase. The fixtures are isolated filesystem/AST behavior;
  using a live provider or database would add no acceptance evidence.

## 7. Anti-pattern coverage and falsification

The Phase 3 tests must defend against these catalog entries:

| Workstream | Anti-patterns | Required defense and falsification condition |
|---|---|---|
| Task 9 loader | A4, A5, A7, A14 | Explicit loader test paths assert non-empty evidence, named parse errors, and reversed-input byte identity. A missing fixture, malformed parser, or invalid detector command makes the command fail; no broad exclusion can turn a real import into an empty pass. |
| Tasks 10–11 analyzer rules | A3, A4, A5, A6, A7, A12, A14 | Every 21 named fixtures has an individual assertion for rule/source/evidence or an empty-all-rules result. Counts in logs are labeled (`Test Files`, `Tests`, `database entries`, `provider entries`), never digit-only. Catalog guard references must resolve, invalid `rg -nE`-style detectors are not accepted, and no broad `apps/**`/`packages/**` filter may be added. A synthetic direct import, provider credential read, or worker job-table query must fail the checker. |
| Task 12 ratchet | A3, A4, A5, A6, A7, A10, A12, A14, A15 | The five named ratchet assertions falsify growth, deletion, rename evasion, malformed/wildcard policy, and reordered diagnostics. The temporary counterexample must produce non-zero `new-debt`; a removed finding must produce `baseline-reduction-required`; generated output and any role receipt are refreshed after structural changes. |
| Phase closeout | A5, A6, A10, A15 | Do not write “all checks pass” while `architecture:check` is missing or focused tests are Red. Do not update `tracks.md`, baselines, or generated facts in this strategy role. The post-strategy result receipt must bind the exact committed strategy HEAD and current output hash. |

A1 (substring signal), A2 (consent-blind publish), A8 (marker vocabulary),
A9 (archived track path), A11 (executed review left blocked), and A13 (stale
archived directory) are not Phase 3 analyzer behaviors. They remain orchestrator
or closeout-audit checks and must not be claimed covered by this package suite.
A15 applies to the role receipt/strategy handoff, not to the analyzer's runtime
contract; its defense is the exact post-strategy HEAD rule below.

## 8. Dependency and applicability decisions

Phase 3 may proceed only from the accepted Phase 1 contracts/baselines and the
accepted Phase 2 Red fixtures. It has no dependency on the capability kernel,
durable worker implementation, PostgreSQL, provider credentials, or browser
runtime. Dependent tracks remain blocked until Phase 3 and Phase 4 establish
Gate 1; no temporary analyzer is authorized in another track.

The canonical review applicability for this phase is:

| Canonical role | Applicability | Required focus |
|---|---|---|
| `review-a-correctness` | **YES — required** | AST resolution completeness, finding identity/rename semantics, rule/ownership decisions, baseline comparison, deterministic output, and preservation of accepted baseline counts. |
| `review-b-security` | **YES — required** | Fail-closed parser/config behavior, provider/database boundary bypasses, credential/source-body redaction, exact-exception scope, and worker/webhook job-table isolation. |
| `review-c-ux-api` | **YES — required** | The CLI/JSON/human diagnostic contract, stable exit codes, explicit acknowledged update flow, safe remediation messages, and transport-independent package exports. There is no browser UI, but this is still a public developer/API surface. |
| `adversarial-testing` | **YES — required** | Synthetic direct/aliased/barrel/dynamic imports, client/query/environment construction, malformed config, wildcard attempts, path rename, baseline growth/deletion, and reordered output. |
| `ux-browser-review` | **NO — not applicable at this revision** | Phase 3 changes only a package AST analyzer, ratchet, and CLI diagnostics. No route, screen, browser interaction, or responsive behavior changes. Reassess only if Phase 4 adds a browser-facing surface. |

Review A/B/C and adversarial results must target the same post-Green HEAD.
Browser review must not be fabricated or marked passed when it is not applicable.

## 9. Exact post-strategy handoff and phase base capture

The strategy commit is the only commit this role may create:

```bash
git add measure/tracks/backend_architecture_enforcement_20260713/test-strategy.md
git commit -m "chore(measure): refresh Phase 3 analyzer ratchet test strategy (track_id: backend_architecture_enforcement_20260713)"
git rev-parse HEAD
```

Immediately after that commit succeeds, the orchestrator must capture the
immutable Phase 3 `phase_base_sha` from the printed HEAD, before any new Red or
Green implementation commit. That post-strategy HEAD, not `dc4cb75c` and not
`12adea39`, is the truthful base for the next role handoff. The strategy must
not embed a future SHA. The result receipt is written after the strategy commit
and remains uncommitted so its `audited_head_sha` can equal the current HEAD;
it is not part of the strategy commit.

The next role must preserve the unrelated dirty path
`measure/tracks/company_identity_sso_20260715/phase-s1-strategy-result.txt`
byte-for-byte and must commit only its explicitly owned Phase 3 files.

## 10. Phase 3 closeout criteria

Phase 3 is accepted only when the focused analyzer/resolution/fixture/ratchet
suite, coverage, type-check, lint, build, baseline validation, and
`pnpm architecture:check` all pass; the temporary-above-baseline command fails
as designed; generated JSON is deterministic and secret-safe; all required
review roles have fresh results; and no baseline growth or broad exception was
introduced. Phase 4 remains responsible for wiring the same command into CI and
`measure/doctor.sh`, documenting the remediation workflow, and checking
`measure/generated/` drift.
