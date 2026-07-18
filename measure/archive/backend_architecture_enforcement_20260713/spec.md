# Specification: Backend Architecture Enforcement

## Overview

Create the fail-closed architecture checks required by the [canonical backend
platform specification](../../backend-platform-spec.md). The track freezes the
current direct-database and direct-provider debt as reviewed, machine-readable
baselines and prevents any increase while later tracks migrate debt downward.

## Dependencies

- No Backend Platform Program implementation dependency.
- This track must be accepted before
  `backend_capability_kernel_20260713` or
  `durable_job_worker_platform_20260713` implementation begins.
- Existing tenant coverage and AI/provider boundary checks are evidence to
  preserve, not checks to delete or silently replace.

## Functional Requirements

### FR-1: Rule contracts and ownership map

Define versioned rule schemas for database and provider boundaries, approved
ownership roots, exact test/fixture exceptions, baseline entries, and findings.
Each baseline entry identifies rule, resolved source path/import, owner, and
rationale. Wildcard debt exemptions are invalid. For durable job tables, the
only approved query root outside DB schema/migrations is exactly
`packages/backend/src/jobs/adapters/postgres/`; `services/worker`, webhooks, and
handlers may use only the job port. Existing direct job-table access is baseline
debt rather than an approved root.

### FR-2: AST database boundary analyzer

Analyze TypeScript/JavaScript imports, aliases, re-exports, static dynamic
imports, and relevant client/query call sites. Flag app/transport access to DB
clients, schema, Drizzle, or raw SQL outside approved roots. Resolve workspace
aliases and barrels rather than relying on text grep.

### FR-3: AST provider boundary analyzer

Flag provider SDK imports, re-exports, dynamic imports, and client construction
outside approved adapter roots. Internal interfaces such as
`@reading-advantage/ai` and `@reading-advantage/storage` remain allowed.

### FR-4: Counterexample fixtures

Add isolated positive fixtures for direct, aliased, barrel-re-exported, and
static dynamic imports; raw DB/provider client construction; and a transport
calling SQL. Add negative fixtures for approved adapters, internal interfaces,
and exact tests. Add a positive fixture where `services/worker` imports a job
table/client and a negative fixture where it calls the job port backed by the
exact PostgreSQL adapter root. Fixtures cannot be exempted by a broad source
glob.

### FR-5: Ratcheting baselines

Inventory existing violations, review false positives, and commit deterministic
baselines. The comparison fails on new/increased/broadened debt and permits
deletions. A renamed path cannot evade a finding when its resolved violation is
unchanged. Baseline update is a separate explicit command that prints additions
and exits non-zero unless an acknowledgement flag is supplied.

The Phase 1 freeze of 464 database and 27 provider entries is the accepted
historical direct-fact snapshot. Because Phase 1 explicitly deferred alias,
barrel, resolved-target, client-construction, and binding-aware query propagation,
this track authorizes exactly one analyzer-complete reconciliation after the
Phase 3 analyzer is stable. Every proposed addition must be reproduced under
the dual-anchor contract below, reviewed individually for rule correctness,
owner, rationale, and false positives, and accepted without changing a rule or
ownership root. Analyzer-discovered
production findings remain baseline candidates. Analyzer-discovered findings in
tests or fixtures may instead produce an exact test exception only during this
reconciliation, after independent review of every covered instance and its
matching dual-anchor provenance. Each exception must be one exact rule and one exact
test/fixture file; wildcards, directories, and production paths remain invalid.
The reconciliation is not permission to accept a finding introduced after that
source revision. Normal checks remain read-only before and after the one-time
transaction, and every post-base unreviewed finding fails as new debt.

The immutable pre-analyzer provenance anchor is exactly
`3a109c879438fd50b369eb2905ddccfb56722d2b`. The final analyzer at
`19af018669873e59bb8b721017d3d91fc1096f83` must reproduce 614 finding
identities there plus exactly one named self-hosting
`MODULE_RESOLUTION_ERROR` at
`packages/architecture-enforcement/src/__tests__/ratchet.red.test.ts:49:10`.
Because fail-closed analysis omits comparison, those findings are compared
manually with the historical baselines to derive the 3a addition set.

The separate zero-error execution denominator is
`d7238d09551e3961cd7234cc25a412a821c68611`. The complete 3a..d723 diff
must be independently audited as enforcement, documentation, CI, and
tenant-guard work only, with no product architecture debt. Two analyzer runs
against d723 must be byte-identical with zero errors and exactly 123 additions,
zero removals, and zero renames. The d723 addition set, manually derived 3a set,
and current-HEAD addition set must be equal. This correction strengthens
hard-validation provenance; it does not weaken fail-closed behavior.

Adding the independently accepted exact test exceptions necessarily changes the
final domain ruleset hashes. The Phase 1 hashes remain historical evidence; the
reconciled hashes must be independently reviewed and recorded with the final
baseline counts and bytes.

### FR-6: CI, doctor, and evidence

Expose a non-interactive root command, wire it into CI and `measure/doctor.sh`,
and emit stable JSON plus concise human diagnostics. Document owner workflow for
fixing a finding and ratcheting a removed entry down.

## Non-functional Requirements

- Deterministic output independent of machine path and file traversal order.
- No secrets, source bodies, or generated build artifacts in findings.
- Targeted analyzer tests complete quickly enough for every PR.
- Existing violations do not become an excuse for new violations.
- AST parser/config failures fail the check rather than returning green.

## Acceptance Criteria

1. Every positive counterexample is detected by its intended rule and every
   negative fixture remains allowed.
2. The analyzer resolves aliases, barrels, and static dynamic imports.
3. Adding one synthetic violation above baseline fails; deleting one baseline
   violation passes and requires baseline reduction before merge.
4. Baselines have no wildcard exemptions and every entry has owner/rationale.
5. Root architecture check, CI, and Measure doctor run the same enforcement.
6. Existing tenant/provider tests still pass.
7. Generated diagnostics are deterministic across two consecutive runs.
8. Direct job-table access is accepted only in DB schema/migrations and the
   exact backend PostgreSQL job-adapter root; worker/webhook direct access fails.
9. The one-time analyzer-complete reconciliation proves every added instance in
   both the manually derived 3a provenance set and the zero-error d723 execution
   set; independently audits the complete 3a..d723 diff as non-product
   enforcement/docs/CI/tenant-guard work; proves current-HEAD additions equal
   both anchor sets; receives independent per-addition review; preserves exact
   metadata and no-wildcard invariants; permits only independently reviewed
   exact rule/test-file exceptions for test-only evidence; records the final
   accepted counts and changed ruleset hashes; and leaves the normal checker
   clean. A synthetic finding introduced after either anchor still exits
   non-zero.

## Out of Scope

- Migrating existing violations, except for the explicitly authorized one-time
  direct-fact-to-analyzer-complete baseline reconciliation in FR-5.
- Implementing capability descriptors, executor, route generation, or jobs.
- General-purpose lint replacement or formatting enforcement.
- Editing application behavior to make the baseline smaller in this track.
- Routine baseline growth, accepting post-base findings, weakening rules, adding
  wildcard/directory/production exceptions, adding any exact exception outside
  the one-time reviewed test-only set, or repeating the reconciliation after its
  accepted write.
