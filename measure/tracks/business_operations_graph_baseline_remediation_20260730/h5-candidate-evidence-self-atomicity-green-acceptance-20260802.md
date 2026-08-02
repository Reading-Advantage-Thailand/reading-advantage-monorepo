# H5 Candidate Failure Evidence Self-Atomicity Green Acceptance

## Scope

This receipt accepts only self-atomic publication of the already accepted
candidate-operation failure evidence path. It does not accept generic or
pre-seal failed-attempt publication, a successful candidate, another failure
path, broader runtime stages, H3 through H5, or R1 v3.

## Accepted evidence

| Evidence | Value |
| --- | --- |
| Runner SHA-256 | 1fc29d748045d0f9192ed0c631da03b61eafb939c7bd7012389d7013ed91a98d |
| Frozen test SHA-256 | c5155f318fb735dba4d9bf07330570fc23bbb1bd237760e682a08c5848c72269 |
| Terra focused suite | Three tests passed in 8.055s |
| Root focused suite | The same three tests passed in 5.616s |
| Source check | Scoped runner diff check passed |

Terra live-state semantic inspection limits this slice to new
_next_candidate_publication_failure_attempt_identity_v1 and the changed
_publish_candidate_publication_failure_attempt. The validator, generic
reservation helper, preservation routing, carrier and operation mapping,
generic and pre-seal publishers, candidate artifact logic, candidate
os.replace behavior, and frozen test and plan remained inspected unchanged.

## Accepted behavior

The dedicated publisher selects a final logical attempt identity without first
creating a public path. It stages a canonical final-pattern leaf with matching
attempt ID below a hidden private parent and uses the unchanged real validator
there. Only after successful validation does it reserve the public destination
and atomically rename the staged leaf. A collision fails closed. On a build,
write, validation, or publish failure, unpublished staging and reservation
artifacts are removed. The injected-validation regression proves that no public
path, partial JSON/raw evidence, generic publisher, candidate replacement, or
Podman action occurs before failure cleanup.

## Non-reconstructible baseline caveat

The previously accepted runner SHA-256
6b71e745a9e8501ca608bc4255a69c2ab7088fd9224f474e4a146c37e2fee893 was
uncommitted content and no exact byte snapshot or reachable Git object is
available. Therefore this receipt does not claim a reconstructible byte-for-byte
6b71 to 1fc29 delta or prove byte identity for every non-allowlisted line.
Attribution is limited to the current Terra live-state semantic inspection of the
two-function allowlist, frozen-dependency inspection, the current full-file
hash, and two independent focused Green runs. This evidence cannot be reused as
runner-commit attribution or cumulative-diff acceptance.

## Decision and exclusions

**ACCEPT** -- bounded only to self-atomic publication of candidate-operation
failure evidence at runner SHA-256
1fc29d748045d0f9192ed0c631da03b61eafb939c7bd7012389d7013ed91a98d and
frozen test SHA-256
c5155f318fb735dba4d9bf07330570fc23bbb1bd237760e682a08c5848c72269.
The exact three focused tests passed independently in 8.055s and 5.616s.

Phase R1 v3 remains [~], and the cumulative runner and test work remains
uncommitted. This does not accept generic or pre-seal failed-attempt atomicity,
successful candidate publication, other failure paths, broader stage coverage,
H3/H4/H5, R1 v3, cumulative runner/test code, a runner commit, or any Podman,
candidate, Finance, marker, registry, successor, V2, or historical-evidence
action. A later cumulative runner acceptance must review the full reachable diff
from a committed or reconstructible baseline; this receipt cannot substitute
for that review.
