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
instrumentation, resolver behavior, dual-anchor reproduction, and
addition-by-addition review are incomplete.

## Immutable anchors

- Historical direct baseline: 464 database entries and 27 provider entries.
- Historical database ruleset hash:
  `6945a684543588722a283872b14b69aa8efbfb1c91c322a1a156916dfef93ea7`.
- Historical provider ruleset hash:
  `9c540cfa4e07aa51ac190ac58b9e3df7a3042f07990d1f888789108b0c73ccd3`.
- Final database ruleset hash:
  `44425a89f8db3b6394e4a3c4117ede1154656abea8d0ccaf0f9eb5807e6acbdc`.
- Final provider ruleset hash:
  `1f26b6b7bd73ab2ce7ca38f182206dd8d41995f566733bd2ef4059d950ad9e67`.
- Pre-analyzer provenance anchor:
  `3a109c879438fd50b369eb2905ddccfb56722d2b`, the immutable source
  revision containing only the two fail-closed source-resolution prerequisites
  in its commit delta and no analyzer or ratchet implementation change.
- Zero-error execution denominator:
  `d7238d09551e3961cd7234cc25a412a821c68611`. The complete
  `3a109c879438fd50b369eb2905ddccfb56722d2b..d7238d09551e3961cd7234cc25a412a821c68611`
  diff must receive an independent audit proving it contains only enforcement,
  documentation, CI, and tenant-guard changes and introduces no product
  architecture debt.
- Final analyzer SHA:
  `19af018669873e59bb8b721017d3d91fc1096f83`.

The earlier `dc4cb75c8e7a4a41d9e4eb451566dba40dcdbd81` remains the
historical pre-Green marker for Red/Green ancestry. It is not the reconciliation
source base because the two broken source references still exist there; a
finalized fail-closed analyzer cannot produce the required zero parse/resolution
errors against that tree. Commit `3a109c879438fd50b369eb2905ddccfb56722d2b`
repairs exactly those references, changes only
`apps/reading-advantage/scripts/seed/demo-seed.ts` and
`apps/science-advantage/lib/auth/rate-limit.test.ts`, and introduces no analyzer
code. It remains the immutable pre-analyzer provenance anchor, but it is not a
zero-error execution denominator: the final analyzer must reproduce 614 finding
identities plus exactly one self-hosting `MODULE_RESOLUTION_ERROR` at
`packages/architecture-enforcement/src/__tests__/ratchet.red.test.ts:49:10`
because that historical Red test imports the intentionally absent
`../ratchet.js`. Since fail-closed analysis omits comparison when any resolver
error exists, the 3a finding set must be compared manually with the historical
baselines to derive its addition set.

Commit `d7238d09551e3961cd7234cc25a412a821c68611` is the separate
zero-error execution denominator. This dual-anchor requirement is a
hard-validation correction, not a weakening: 3a preserves honest pre-analyzer
provenance, while d723 permits deterministic ratchet comparison only after its
complete delta from 3a is independently proven to contain no product
architecture debt.

Changing either anchor SHA requires a new strategy review before any baseline
write. The final analyzer SHA must be a committed immutable revision and must
be the exact implementation used for every reproduction and review result.

## Authorization constraints

The reconciliation is permitted only when all of these remain true:

1. No architecture rule, module/resource matcher, resolved-target root,
   ownership root, or wildcard/path validation is weakened or expanded to make
   the result pass. The sole policy change allowed is the independently reviewed
   exact test-exception set defined below.
2. Every newly baselined production instance and every test-only instance
   covered by a proposed exact exception is present in both the manually
   derived 3a addition set and the zero-error d723 addition set.
3. A finding absent from either anchor set is post-anchor debt or an unexplained
   denominator difference and is never a reconciliation candidate.
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

### 2. Reproduce against both immutable anchors

Materialize detached, read-only worktrees at both the 3a pre-analyzer
provenance anchor and the d723 zero-error execution denominator. Run the exact
final analyzer executable at
`19af018669873e59bb8b721017d3d91fc1096f83` with each detached worktree
supplied as `--repo-root`.

Against 3a, require 614 finding identities and exactly one
`MODULE_RESOLUTION_ERROR` at
`packages/architecture-enforcement/src/__tests__/ratchet.red.test.ts:49:10`.
The comparison must be absent by fail-closed contract. Compare the 614 findings
manually to the historical baselines and record the derived addition instance
set and its SHA-256.

Independently audit the full 3a..d723 diff as enforcement, documentation, CI,
and tenant-guard work only, with no product architecture debt. Then run JSON
output against d723 twice.

Required results:

- both d723 runs use the same final analyzer SHA, execution-denominator SHA,
  policy files, and source selector;
- both d723 JSON outputs are byte-identical and secret-safe;
- d723 parse/resolver error count is zero and its delta is exactly 123 additions,
  zero removals, and zero renames;
- the d723 addition instance-key set exactly equals the manually derived 3a
  addition set, and both set digests are recorded; and
- no output or baseline file in either worktree is mutated by the normal check.

The expected pre-reconciliation status is `debt-change` / `new-debt` with exit
code 1. That non-zero result is evidence of the model gap, not a command failure
to suppress with `|| true`.

### 3. Exclude post-base debt

Run the same finalized analyzer at the proposed reconciliation HEAD. Every
proposed new baseline instance must appear in both the manually derived 3a set
and the zero-error d723 addition set. The current-HEAD addition set must equal
both anchor sets; any current-only, 3a-only, or d723-only instance blocks
reconciliation until the discrepancy is independently resolved.

Partition the remaining dual-anchor-proven additions by disposition:

- production findings remain production baseline candidates;
- a test-only finding may be covered only by an exact exception whose key is the
  finding's rule ID plus its exact test/fixture source path; and
- every finding covered by one exception pair remains listed in the manifest so
  a single pair cannot hide unreviewed evidence.

The current 9 pairs / 54 test-only findings / 69 production additions are
diagnostic values only. Recompute the partition from the matching dual-anchor
sets.

### 4. Produce the review manifest

Create a deterministic reconciliation manifest containing:

- schema version, both anchor SHAs, final analyzer SHA, policy hashes, original
  baseline counts/hashes, the 3a finding/diagnostic proof, the independent
  3a..d723 diff audit, and the hashes of both d723 analyzer runs;
- every proposed addition with its complete secret-safe finding identity,
  matching 3a-derived and d723 instance proof and disposition;
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
same analyzer SHA, both anchor SHAs, manifest hash, and proposed baseline bytes.
Review is addition-by-addition, not count-only sampling. Reviewers must verify:

- the rule really selects the resolved module/resource;
- alias/barrel propagation reflects an exposed selected symbol rather than an
  encapsulated implementation detail;
- client-construction/query evidence is concrete and not a helper-call false
  positive;
- the source path is outside approved roots and exact exceptions;
- the exact instance exists in both anchor-derived addition sets;
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

These fields were populated from the accepted live transaction and post-write
verification on 2026-07-18:

- Final analyzer SHA:
  `19af018669873e59bb8b721017d3d91fc1096f83`
- Reconciliation manifest SHA-256:
  `4c95113cfff50d9e92f0770e1f18ef7d195dd50b5201f108e90990771ca46ec0`
- Accepted database entry count: **467**
- Accepted provider entry count: **93**
- Accepted exact rule/test-file exception count: **111 total; 9 added by this reconciliation**
- Accepted covered test-only finding count: **54**
- Accepted production addition count: **69**
- Accepted final database ruleset SHA-256:
  `44425a89f8db3b6394e4a3c4117ede1154656abea8d0ccaf0f9eb5807e6acbdc`
- Accepted final provider ruleset SHA-256:
  `1f26b6b7bd73ab2ce7ca38f182206dd8d41995f566733bd2ef4059d950ad9e67`
- Accepted canonical database baseline SHA-256:
  `6b0446b90c1c8e92c9dcbd5b1b1df37a476642d6c16c960e7b0aee2221312160`
- Accepted canonical provider baseline SHA-256:
  `2dac620f09f61b97c4460e5d872b7d2f5c4589bcd321bae83a285cd4a3532a11`
- Accepted raw database baseline file SHA-256:
  `8de5a20f36bd81fc492cd4e99676a439d4e2545dea927ed8389f186d08f4fe73`
- Accepted raw provider baseline file SHA-256:
  `7137e81c662f25073e233144a585178fdd19ec324630f58cc5a807de42b4ace5`
- Independent review result set: **ACCEPTED by all four required reconciliation reviewers; mandatory Phase 3–4 change-quality review found no Critical or High findings.**
- Two-run normal-check JSON SHA-256:
  `ab141ad10de20f76f45698b853ad394551093ac226f0fd54be880cfe29d162d0`
- Gate 1 result: **ACCEPTED. Automated evidence passed and the user explicitly confirmed the manual verification on 2026-07-18. Checkpoint recording is in progress.**

The analyzer-complete 467/93 baseline is now the active reviewed state. The
historical 464/27 freeze remains immutable provenance evidence.
