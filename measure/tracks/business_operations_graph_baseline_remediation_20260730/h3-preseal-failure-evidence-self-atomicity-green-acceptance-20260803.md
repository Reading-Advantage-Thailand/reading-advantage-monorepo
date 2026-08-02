# H3 Pre-Seal Failure Evidence Self-Atomicity Green Acceptance

## Scope

This receipt accepts only private validation and cleanup for the retained
pre-seal materialize failure. It does not accept another pre-seal stage, a
generic command variant, candidate publication, or broader H3 through R1 work.

## Accepted evidence

| Evidence | Value |
| --- | --- |
| Runner SHA-256 | `9c70fcd2da2bd73a846bfb0fd9aca6fb7da4264f6e125e6632b96e78f5a3f6dc` |
| Frozen test SHA-256 | `e74124c9c64074af78d8d7b627b78f5b5bdf81637e7a8d06c80d7199c20b6a9c` |
| Terra focused suite | Four tests passed in `1.397s` |
| Root focused suite | The same four tests passed in `1.437s` |
| Reconstructed old tail | `d6b21b7f5868d2d2af9fc7d13725732add6e0ce2fe90ea2922d60e1ad00721c3` |
| Source check | Scoped runner diff check passed |

Commit `d620bc1` preserves the Red test, active plan contract, and the
pre-Green reconstruction artifact. That artifact preserves the exact old
27-line _publish_failed_attempt publication tail and its hash.

## Accepted behavior

The materialize publisher derives a logical final identity without public
reservation, creates a canonical leaf with matching attempt ID beneath a hidden
private parent, writes complete raw and JSON evidence with eventual-final-path
references, and uses the unchanged real validator there. It collision-reserves
the public path and performs one rename only after validation. Nested cleanup
removes unpublished staging and reservation artifacts on the tested failure
path. The focused test proves that the public path remains absent during an
injected validator rejection, with no partial JSON or raw evidence left behind.

## Reconstruction caveat

The pre-Green artifact makes the old authorized 27-line
_publish_failed_attempt tail byte-reconstructible and hash-verifiable. It does
not reconstruct the complete prior runner: the full pre-Green runner is known
only by SHA-256 `1fc29d748045d0f9192ed0c631da03b61eafb939c7bd7012389d7013ed91a98d`,
without a byte-exact full-file snapshot or reachable Git object. Therefore this
receipt cannot claim a byte-for-byte full-file 1fc29 to 9c70 delta, prove
historical byte identity for every frozen line, or serve as cumulative runner or
runner-commit attribution. Acceptance relies only on the reconstructible
authorized tail, current helper/tail semantic inspection, frozen-surface
inspection, and two independent focused Green runs.

## Decision and exclusions

**ACCEPT** -- bounded only to private validation and cleanup for the retained
pre-seal materialize failure at runner SHA-256
`9c70fcd2da2bd73a846bfb0fd9aca6fb7da4264f6e125e6632b96e78f5a3f6dc` and
frozen test SHA-256
`e74124c9c64074af78d8d7b627b78f5b5bdf81637e7a8d06c80d7199c20b6a9c`.

Phase R1 v3 remains `[~]`, and the cumulative runner and test work remains
uncommitted. This does not accept other pre-seal stages, offline-install or
workspace-DAG publication, sealed generator or trace failures, arbitrary raw,
JSON, collision, rename, or cleanup fault injection, candidate paths,
successful candidate publication, H3/H4/H5 or R1-v3-wide acceptance, a runner
commit, or any Podman, candidate, Finance, marker, registry, successor, V2, or
historical-evidence action. A later cumulative runner acceptance must review a
full reachable diff from a committed or reconstructible baseline; this receipt
cannot substitute for it.
