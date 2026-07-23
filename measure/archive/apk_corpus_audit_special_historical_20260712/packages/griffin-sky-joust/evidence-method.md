# Griffin Sky-Joust — Batch A evidence collection method

Collector: `evidence-collector-griffin-sky-joust-batch-a`
Phase base: `52e48970bc9c4b585c55b53072ebebe466a1c4f4`
Role base: `cd2d0faec2d15f1a5d50bee0da102bde58ce1daa`

## Scope and inputs

This isolated collector reconciled only the committed Griffin current-source and
historical-source observations, the Phase-0 freeze/discovery artifacts, and the
strategy budget. No source discovery, mapping, browser work, truth-test authoring,
acceptance, or manifest work was performed. The seven historical locators remain
historical implementation evidence; the current specialist's empty observation is
preserved as an explicit unknown.

## Exact evidence method

Each positive claim is one atomic proposition copied from one observation and retains
its exact Git revision, path, inclusive line range, whole-blob SHA-256, and cited-range
SHA-256. Historical revisions are restricted to commits reachable from
`a49ebcc4dc3b3792a96b5b114d729b0b542af0fe`; the T2 comparison revision and the
reachable root were verified as ancestors. The two deletion events and all seven
historical source envelopes were independently re-derived before writing the ledger.
Historical evidence never establishes currentness, runnability, live input, or
physical ergonomics. The absent current envelope remains `unknown`, not a negative
implementation claim.

## Chronology and conflict rule

The cartridge source was deleted at `05bb6d2909268ea670b106240167f86c9814d67d`,
and the page/API/component sources were deleted at
`a30e8777952139460092c7d4649b8a72b5e8beda`. These chronological records preserve
both historical source classes while recording the current upper-revision absence;
neither class silently supersedes the other.

## Negative-fixture rule

Six required class-promotion and semantic-overstatement fixtures are separate from
the seven factual claims and count toward no factual coverage. Every fixture has an
exact rejection disposition. Catalog, cancelled-design, specification, analogy, and
compound historical claims cannot be promoted into current implementation facts.

## Budget and validation

The evidence-collector ceiling is 33,554,432 source bytes, 240 source objects, 160
command invocations, 300 elapsed minutes, 500 claims, and 10 negative fixtures.
Actual collector usage was 0 direct source bytes, 0 direct source objects, 2 command
invocations, 5 elapsed minutes, 7 factual claims, and 6 negative fixtures; committed
observation inputs were reconciled rather than re-read as game source. JSON parsing,
exact blob/range validation, chronology ancestor validation, deletion-diff validation,
and `git diff --check` are required. Acceptance is not claimed.
