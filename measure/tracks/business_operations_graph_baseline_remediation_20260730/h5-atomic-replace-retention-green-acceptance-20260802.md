# H5 Atomic-Replace Retention Green Acceptance

## Scope

This receipt records only the durable retention of one post-trace atomic
candidate-replace failure. It does not accept a successful candidate
publication, candidate contents, another candidate operation, broader runtime
stages, H3 through H5, or R1 v3.

## Frozen evidence

| Evidence | Prior accepted state | Accepted state |
| --- | --- | --- |
| Runner SHA-256 | `766dc8a991dab722d2c54f16091ad08e5acd926715682d7b9ce3cb0bd47b7e8a` | `6b71e745a9e8501ca608bc4255a69c2ab7088fd9224f474e4a146c37e2fee893` |
| Test-file SHA-256 | `c649f47d9dfaabc4acc13faafb514c58c56696743333c319537fec89a7371a48` | `50b2daaff8275aa90b568ab8b57e65216ba86aabbcef41b6472ef05e85bfe41d` |
| Private-validation regression | Not this receipt | One test passed in `2.252s` |
| Atomic-replace regression | Red gate | One test passed in `2.249s` |

## Bounded attribution

Terra accepted the paired candidate-operation gates. Sol independently
accepted the hash-pinned delta only. The delta additively extends the accepted
candidate-operation carrier, validator, publisher, preservation routing, and
the narrow boundary from validated private candidate to atomic replacement.
The pre-seal and generic command-failure paths remain frozen.

## Accepted behavior

After exactly one successful private validation, one injected `OSError` from
the atomic replacement retains one validator-accepted, unpublished
operation-only attempt. The retained record contains the completed trace and
canonical destination, has empty `commands`, retains no raw stream, keeps the
final destination absent and the private stage private, and rethrows the
original error.

## Decision and exclusions

**ACCEPT** only the failure-retention behavior above. Phase R1 v3 remains
`[~]`, and the cumulative runner and test changes remain uncommitted shared
work. This decision does not authorize successful publication, candidate
contents, other publication failures, preservation-failure injection, broader
pre-seal stages, H3/H4/H5 or R1-v3 acceptance, a runner commit, or any Podman,
candidate, Finance, marker, registry, successor, V2, or historical-evidence
action.
