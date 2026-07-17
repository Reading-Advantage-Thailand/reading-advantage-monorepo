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
candidate only. Its present disposition is 9 exact rule/test-file exception
candidates covering 54 test-only findings and 69 production baseline additions.
Neither the split nor any individual disposition is accepted while analyzer
instrumentation, resolver behavior, immutable-base reproduction, and
addition-by-addition review are incomplete.

## Immutable anchors

- Historical direct baseline: 464 database entries and 27 provider entries.
- Historical database ruleset hash:
  `6945a684543588722a283872b14b69aa8efbfb1c91c322a1a156916dfef93ea7`.
- Historical provider ruleset hash:
  `9c540cfa4e07aa51ac190ac58b9e3df7a3042f07990d1f888789108b0c73ccd3`.
- Final database ruleset hash: **PENDING — expected to change only because of
  independently accepted exact test exceptions.**
- Final provider ruleset hash: **PENDING — expected to change only because of
  independently accepted exact test exceptions.**
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
   ownership root, or wildcard/path validation is weakened or expanded to make
   the result pass. The sole policy change allowed is the independently reviewed
   exact test-exception set defined below.
2. Every newly baselined production instance and every test-only instance
   covered by a proposed exact exception is present in the final analyzer output
   when that analyzer runs against the immutable source base.
3. A finding present only after the source base is post-base debt and is never a
   reconciliation candidate.
4. Every addition receives an explicit independent disposition. Production
   additions require accountable baseline owner/rationale. Each test-only
   disposition requires an exception owner/rationale and one exact rule plus one
   exact test/fixture file. Wildcards, directories, production paths, and
   finding-wide blanket exemptions are invalid.
5. Existing baseline and exception metadata is preserved exactly. The successful
   reconciliation is one preview-first, explicitly acknowledged coordinated
   policy/baseline transaction. A failed transaction that proves complete
   rollback may be retried; an accepted successful reconciliation may not be
   repeated.
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

Partition the remaining base-proven additions by disposition:

- production findings remain production baseline candidates;
- a test-only finding may be covered only by an exact exception whose key is the
  finding's rule ID plus its exact test/fixture source path; and
- every finding covered by one exception pair remains listed in the manifest so
  a single pair cannot hide unreviewed evidence.

The current 9 pairs / 54 test-only findings / 69 production additions are
diagnostic values only. Recompute the partition from the immutable-base result.

### 4. Produce the review manifest

Create a deterministic reconciliation manifest containing:

- schema version, source-base SHA, final analyzer SHA, policy hashes, original
  baseline counts/hashes, and the hashes of both immutable-base analyzer runs;
- every proposed addition with its complete secret-safe finding identity,
  immutable-base instance proof and disposition;
- every proposed exact test exception with its exact rule/path key, owner,
  rationale, complete covered-instance list, and proof that the path satisfies
  the strict test/fixture contract;
- every production baseline addition with accountable owner and rationale;
- every removal or rename, if any, with its original metadata and review reason;
- final proposed database/provider counts, canonical baseline hashes, final
  domain ruleset hashes, and exact exception count; and
- explicit assertions that there are no wildcard exceptions, broad roots,
  source bodies, secrets, or unreviewed entries.

The manifest is not generated until analyzer behavior is final. The candidate
614/123, 9-pair, 54-test-only, and 69-production numbers must not be used as
manifest expectations.

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
- production baseline owner/rationale or exact-exception owner/rationale is
  truthful and actionable;
- every exception path is an exact test/fixture file and is not a wildcard,
  directory, or production path;
- every finding suppressed by an exception is listed and independently accepted;
- the changed ruleset hashes result only from the accepted exact test exceptions;
  and
- the addition is not duplicated under another origin.

Any Critical/High finding, false positive, analyzer change, policy change, or
manifest mismatch rejects the candidate and restarts at Step 1. A blanket
`--owner`/`--rationale` value may be used only if reviewers explicitly attest
that it is accurate for every addition; otherwise the update mechanism must
consume the reviewed per-entry metadata before a write is allowed.

### 6. Preview, then perform one coordinated acknowledged transaction

Construct the exact exception and baseline candidates together in an isolated
preview. The preview must validate the new policy hashes and proposed baselines
as one candidate state, exit non-zero without acknowledgement, write nothing,
and print exception pairs, covered test findings, production additions,
removals, and renames matching the accepted manifest exactly. Hash the policy
and both baseline files before and after preview to prove byte identity.

Only after all reviews pass may the exact accepted candidate be written with
the explicit acknowledgement flag. The transaction must apply the reviewed
exact exception set and both domain baselines as one coordinated change,
preserve existing metadata, apply reviewed metadata to every new baseline or
exception entry, and retain canonical ordering. Applying exceptions first would
invalidate the historical baseline ruleset hashes, while applying baselines
first would record unreviewed test debt; therefore a partial or manually
sequenced write is forbidden. Record final exception pairs, production counts,
ruleset hashes, and file hashes only after the coordinated write validates.

### 7. Validate the analyzer-complete baseline

The baseline validator must no longer require the live baseline to equal the
historical direct-only projection. It must retain or strengthen all substantive
checks: strict schema, exact identity recomputation, domain separation, stable
ordering, independently accepted final ruleset hashes, exact baseline and
exception owner/rationale, exact rule/test-file exception scope, no
wildcard/directory/production exception, and provenance binding to the accepted
reconciliation manifest. Historical direct counts and ruleset hashes remain
reproducible from the Phase 1 commit and review artifact.

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
- Accepted exact rule/test-file exception count: **PENDING**
- Accepted covered test-only finding count: **PENDING**
- Accepted production addition count: **PENDING**
- Accepted final database ruleset SHA-256: **PENDING**
- Accepted final provider ruleset SHA-256: **PENDING**
- Accepted database baseline SHA-256: **PENDING**
- Accepted provider baseline SHA-256: **PENDING**
- Independent review result set: **PENDING**
- Two-run normal-check JSON SHA-256: **PENDING**
- Gate 1 result: **PENDING**

Until every field is populated from reviewed live evidence, the historical
464/27 freeze remains the active baseline and Gate 1 remains incomplete.
