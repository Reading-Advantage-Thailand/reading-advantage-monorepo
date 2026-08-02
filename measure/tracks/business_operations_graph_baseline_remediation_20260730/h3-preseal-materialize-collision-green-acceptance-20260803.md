# H3 Pre-Seal Materialize Collision Green Acceptance

## Scope

This receipt accepts only final-directory collision causality and
non-destructive cleanup after successful private validation for retained
pre-seal materialize evidence. It does not accept successful publication,
another publisher failure, another pre-seal stage, candidate paths, or broader
H3 through R1 work.

## Accepted evidence

| Evidence | Value |
| --- | --- |
| Runner SHA-256 | `90d550c3e4c2871de6b15349fa50cfda647af25a08532ad3842f1eb36a730490` |
| Frozen test SHA-256 | `8f403418cfb729b0228928cd51315ed3b94dcd45efb608bf063eab097b5f881a` |
| Terra focused suite | Six tests passed in `1.351s` |
| Root focused suite | The same six tests passed in `1.455s` |
| Reconstructed collision block | `3d05a8465e98620956829c709a92dc703f99b28ca4854d1330d4887b23820383` |
| Reconstructed prior runner | `cecfe1fe4713454c1b856024d2ae9f79a9c4faca879086f9d97b6976ecd7c471` |
| Source check | Scoped runner diff check passed |

Commit `d6767bab9` preserves the Red test, active plan contract, and exact
four-line collision artifact. Replacing only the current collision hunk with
that artifact reconstructs the complete prior runner at the recorded SHA-256.

## Accepted behavior

After private validation succeeds, a final-directory collision retains the same
collision ExecutionClosureValidationError message and chains it from the
original materialize error. The competing public directory and its sentinel
remain byte-identical, no publisher JSON or raw child is written into it, and
only the losing publisher private stage is removed. Rename, candidate, Podman,
and later-stage paths do not run.

## Reconstruction caveat

The current runner plus the committed exact four-line artifact reconstructs the
complete pre-Green runner at `cecfe1fe4713454c1b856024d2ae9f79a9c4faca879086f9d97b6976ecd7c471`.
Therefore this collision hunk is bytewise attributable, and all other runner
bytes are proven unchanged between those two states. This does not reconstruct
or accept cumulative runner history preceding that state, authorize a runner
commit, or provide cumulative R1-v3 attribution.

Separately, measure/business_operations_graph_baseline_execution_closure.py is
an untracked shared helper with no recorded pre-Green byte baseline. Its current
real behavior was exercised by both Green runs, but no historical byte identity,
unchanged-source proof, or change attribution is accepted for that helper.

## Decision and exclusions

**ACCEPT** -- bounded only to one final-directory FileExistsError after
successful private validation for retained pre-seal materialize evidence at
runner SHA-256
`90d550c3e4c2871de6b15349fa50cfda647af25a08532ad3842f1eb36a730490` and
frozen test SHA-256
`8f403418cfb729b0228928cd51315ed3b94dcd45efb608bf063eab097b5f881a`.

Phase R1 v3 remains `[~]`, and the cumulative runner and test work remains
uncommitted. This does not accept rename, raw-copy, JSON-write, validator, or
cleanup-failure injection; successful publication; other pre-seal stages or
generic variants; candidate paths; H3/H4/H5 or R1-v3-wide acceptance; a runner
commit; or any Podman, candidate, Finance, marker, registry, successor, V2, or
historical-evidence action. A later cumulative runner acceptance must review a
full reachable diff from a committed or reconstructible baseline; this receipt
cannot substitute for it.
