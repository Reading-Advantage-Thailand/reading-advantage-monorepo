# H3 Pre-Seal Materialize Rename-Failure Green Acceptance

## Scope

This receipt accepts only one post-validation rename failure for retained
pre-seal materialize evidence. It does not accept other publisher failures,
other pre-seal stages, candidate paths, or broader H3 through R1 work.

## Accepted evidence

| Evidence | Value |
| --- | --- |
| Runner SHA-256 | `cecfe1fe4713454c1b856024d2ae9f79a9c4faca879086f9d97b6976ecd7c471` |
| Frozen test SHA-256 | `899d21a89a1dd5707db8f5a080277bbd1dc7bee5a91d3862bdc379967e63e089` |
| Terra focused suite | Five tests passed in `1.594s` |
| Root focused suite | The same five tests passed in `1.576s` |
| Reconstructed old block | `128f187a8ba8d86f0c8d414519a09ee3dfa89bfead41a8e35ee3381cfdcbf17f` |
| Source check | Scoped runner diff check passed |

Commit `5db4322` preserves the Red test, active plan contract, and the
pre-Green reconstruction artifact. That artifact preserves the exact old
rename/reservation/cleanup block and its hash.

## Accepted behavior

After real private validation and publisher-owned public empty-directory
reservation, the publisher catches the same rename OSError, completes the
existing nested reservation and private-stage cleanup, and rethrows that error
from the original materialize error. The tested causal chain is
CandidateExecutionBlocked to the same rename OSError to the original
materialize error. The candidate helper and publisher remain outside this
change and the H5 focused regression remains Green.

## Reconstruction caveat

The baseline artifact makes the captured pre-Green rename/reservation/cleanup
block byte-reconstructible and hash-verifiable. It does not reconstruct the
complete pre-Green runner: that full file is known only by SHA-256
`9c70fcd2da2bd73a846bfb0fd9aca6fb7da4264f6e125e6632b96e78f5a3f6dc`,
without a byte-exact full-file snapshot or reachable Git object. Therefore this
receipt cannot claim a byte-for-byte whole-file 9c70fc to cecfe1 delta, prove
historical byte identity for every frozen surface, or serve as cumulative runner
or runner-commit attribution. Acceptance relies only on the reconstructible
authorized block, current scoped semantic inspection, frozen-surface
inspection, and two independent focused Green runs.

## Decision and exclusions

**ACCEPT** -- bounded only to one post-validation rename failure for retained
pre-seal materialize evidence at runner SHA-256
`cecfe1fe4713454c1b856024d2ae9f79a9c4faca879086f9d97b6976ecd7c471` and
frozen test SHA-256
`899d21a89a1dd5707db8f5a080277bbd1dc7bee5a91d3862bdc379967e63e089`.

Phase R1 v3 remains `[~]`, and the cumulative runner and test work remains
uncommitted. This does not accept collision, raw-copy, JSON-write, validator,
or cleanup-failure injection; other pre-seal stages or generic variants;
candidate paths or successful candidate publication; H3/H4/H5 or R1-v3-wide
acceptance; a runner commit; or any Podman, candidate, Finance, marker,
registry, successor, V2, or historical-evidence action. A later cumulative
runner acceptance must review a full reachable diff from a committed or
reconstructible baseline; this receipt cannot substitute for it.
