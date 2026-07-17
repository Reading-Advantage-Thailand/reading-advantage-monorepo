# Analyzer-Complete Baseline Reconciliation Strategy

## Decision

Phase 1 accepted 464 database and 27 provider findings from a deliberately
direct-only inventory. That freeze remains valid historical evidence, including
its direct-review manifest and policy hashes. Phase 3 now detects additional
alias, barrel, resolved-target, concrete client-construction, and binding-aware
query evidence required by the specification and Red fixtures.

Exactly one reconciliation from the historical direct evidence model to the
final analyzer evidence model is authorized. It is not permission to accept new
architecture debt. Normal checker and baseline-update behavior remain
fail-closed and read-only unless the explicit acknowledged transaction below is
reached.

The current diagnostic result of 614 total findings and 123 additions is a
candidate only. It is not an accepted count while analyzer instrumentation,
resolver behavior, immutable-base reproduction, and addition-by-addition review
are incomplete.

## Immutable anchors

- Historical direct baseline: 464 database entries and 27 provider entries.
- Historical database ruleset hash:
  `6945a684543588722a283872b14b69aa8efbfb1c91c322a1a156916dfef93ea7`.
- Historical provider ruleset hash:
  `9c540cfa4e07aa51ac190ac58b9e3df7a3042f07990d1f888789108b0c73ccd3`.
- Reconciliation source base:
  `3a109c879438fd50b369eb2905ddccfb56722d2b`, the immutable source
  revision containing only the two fail-closed source-resolution prerequisites
  in its commit delta and no analyzer or ratchet implementation change.
- Final analyzer SHA: **PENDING — record only after instrumentation is removed,
  focused/full tests pass, and analyzer behavior is frozen.**

The earlier `dc4cb75c8e7a4a41d9e4eb451566dba40dcdbd81` remains the
historical pre-Green marker for Red/Green ancestry. It is not the reconciliation
source base because the two broken source references still exist there; a
finalized fail-closed analyzer cannot produce the required zero parse/resolution
errors against that tree. Commit `3a109c879438fd50b369eb2905ddccfb56722d2b`
repairs exactly those references, changes only
`apps/reading-advantage/scripts/seed/demo-seed.ts` and
`apps/science-advantage/lib/auth/rate-limit.test.ts`, and introduces no analyzer
code. It is therefore the earliest immutable source tree that can satisfy both
pre-analyzer provenance and zero-error reproduction.

Changing the source-base SHA requires a new strategy review before any baseline
write. The final analyzer SHA must be a committed immutable revision and must be
the exact implementation used for every reproduction and review result.

## Authorization constraints

The reconciliation is permitted only when all of these remain true:

1. No architecture rule, module/resource matcher, resolved-target root,
   ownership root, exact exception, or wildcard/path validation is weakened or
   expanded to make the result pass.
2. Every newly accepted instance is present in the final analyzer output when
   that analyzer runs against the immutable source base.
3. A finding present only after the source base is post-base debt and is never a
   reconciliation candidate.
4. Every addition receives an explicit independent disposition, accountable
   owner, and concrete rationale. Existing entry metadata is preserved exactly.
5. The successful baseline replacement is one preview-first, explicitly
   acknowledged transaction. A failed transaction that proves complete rollback
   may be retried; an accepted successful reconciliation may not be repeated.
6. The final normal checker is clean, deterministic, and read-only. A synthetic
   post-base violation still returns `new-debt` and a non-zero exit.

## Required evidence workflow

### 1. Freeze the analyzer

Remove timing/progress instrumentation and run the focused suite, coverage,
lint, type-check, build, parser/resolver failure tests, and counterexamples.
Commit that exact implementation and record its full SHA above. Any subsequent
analyzer, resolver, identity, rule-selection, or finding-cardinality change
invalidates all reconciliation evidence and restarts this workflow.

### 2. Reproduce against the immutable source base

Materialize a detached, read-only worktree at the reconciliation source base.
Run the finalized analyzer executable from the final analyzer revision with the
detached worktree supplied as `--repo-root`. Run JSON output twice.

Required results:

- both runs use the same analyzer SHA, source-base SHA, policy files, and source
  selector;
- both JSON outputs are byte-identical and secret-safe;
- parse/resolver error count is zero;
- historical baseline removals and renames are zero unless each is separately
  explained and independently accepted as a genuine reduction or move;
- the exact addition instance-key set is recorded with a SHA-256 digest; and
- no output or baseline file in either worktree is mutated by the normal check.

The expected pre-reconciliation status is `debt-change` / `new-debt` with exit
code 1. That non-zero result is evidence of the model gap, not a command failure
to suppress with `|| true`.

### 3. Exclude post-base debt

Run the same finalized analyzer at the proposed reconciliation HEAD. Every
proposed new baseline instance must appear in the immutable-base addition set.
Any current-only instance is post-base debt and blocks reconciliation until it
is removed or handled in a separately authorized track. A base-only addition
that has since disappeared is not added; it is recorded as an analyzer-complete
debt reduction.

### 4. Produce the review manifest

Create a deterministic reconciliation manifest containing:

- schema version, source-base SHA, final analyzer SHA, policy hashes, original
  baseline counts/hashes, and the hashes of both immutable-base analyzer runs;
- every proposed addition with its complete secret-safe finding identity,
  immutable-base instance proof, accountable owner, rationale, and disposition;
- every removal or rename, if any, with its original metadata and review reason;
- final proposed database/provider counts and canonical baseline hashes; and
- explicit assertions that there are no wildcard exceptions, broad roots,
  source bodies, secrets, or unreviewed entries.

The manifest is not generated until analyzer behavior is final. The candidate
614/123 numbers must not be used as manifest expectations.

### 5. Perform independent review

Correctness, security, developer/API, and adversarial reviewers must examine the
same analyzer SHA, source-base SHA, manifest hash, and proposed baseline bytes.
Review is addition-by-addition, not count-only sampling. Reviewers must verify:

- the rule really selects the resolved module/resource;
- alias/barrel propagation reflects an exposed selected symbol rather than an
  encapsulated implementation detail;
- client-construction/query evidence is concrete and not a helper-call false
  positive;
- the source path is outside approved roots and exact exceptions;
- the exact instance exists at the immutable source base;
- owner and rationale are truthful and actionable; and
- the addition is not duplicated under another origin.

Any Critical/High finding, false positive, analyzer change, policy change, or
manifest mismatch rejects the candidate and restarts at Step 1. A blanket
`--owner`/`--rationale` value may be used only if reviewers explicitly attest
that it is accurate for every addition; otherwise the update mechanism must
consume the reviewed per-entry metadata before a write is allowed.

### 6. Preview, then perform one acknowledged transaction

Run the explicit baseline-update command without acknowledgement first. It must
exit non-zero, write nothing, and print additions/removals/renames matching the
accepted manifest exactly. Hash both baseline files before and after preview to
prove byte identity.

Only after all reviews pass may the exact accepted candidate be written with
the explicit acknowledgement flag. The transaction must preserve existing
metadata, apply reviewed metadata to every addition, retain canonical ordering,
and update both domain files atomically. Record the final database/provider
counts and file hashes in this artifact only after that write and validation.

### 7. Validate the analyzer-complete baseline

The baseline validator must no longer require the live baseline to equal the
historical direct-only projection. It must retain or strengthen all substantive
checks: strict schema, exact identity recomputation, domain separation, stable
ordering, ruleset hashes, exact owner/rationale, no wildcard/broad exception,
and provenance binding to the accepted reconciliation manifest. Historical
direct counts and hashes remain reproducible from the Phase 1 commit and review
artifact.

After the write:

1. run baseline validation;
2. run the normal checker twice and require `clean`, exit 0, identical JSON, and
   unchanged baseline hashes;
3. run the focused/full tests, coverage, lint, type-check, build, CI wiring test,
   tenant/provider guards, and Measure doctor;
4. introduce one exact isolated post-base counterexample and require
   `new-debt`, exit 1, and unchanged baseline bytes; and
5. remove one reviewed instance in an isolated copy and require
   `baseline-reduction-required` without an automatic write.

## Final acceptance record

These fields remain deliberately unset until the complete workflow passes:

- Final analyzer SHA: **PENDING**
- Reconciliation manifest SHA-256: **PENDING**
- Accepted database entry count: **PENDING**
- Accepted provider entry count: **PENDING**
- Accepted database baseline SHA-256: **PENDING**
- Accepted provider baseline SHA-256: **PENDING**
- Independent review result set: **PENDING**
- Two-run normal-check JSON SHA-256: **PENDING**
- Gate 1 result: **PENDING**

Until every field is populated from reviewed live evidence, the historical
464/27 freeze remains the active baseline and Gate 1 remains incomplete.
