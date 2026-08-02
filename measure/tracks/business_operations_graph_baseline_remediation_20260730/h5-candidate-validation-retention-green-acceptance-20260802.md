# H5 Candidate-Validation Retention Green Acceptance

## Scope

This Terra and Sol acceptance is limited to durable retention of one
post-trace private-candidate validation failure. It does not accept atomic
replacement failure, any other publication operation, candidate contents, or
H3/H4/H5 as a whole.

## Frozen evidence

| Item | Value |
| --- | --- |
| Prior runner SHA-256 | `1e843616bb27cabb0677af2cd8098471f12408121dbcfed4935918b12f546cf2` |
| Accepted runner SHA-256 | `766dc8a991dab722d2c54f16091ad08e5acd926715682d7b9ce3cb0bd47b7e8a` |
| Prior test SHA-256 | `7bf0c72ae63f4b5a5bbec965d4010e1dbdd486d6b202947728859378e5938609` |
| Accepted test SHA-256 | `c649f47d9dfaabc4acc13faafb514c58c56696743333c319537fec89a7371a48` |
| Terra exact test | `test_production_candidate_validation_failure_is_durably_retained_without_fake_command_or_publish` |
| Terra result | `1` test passed in `2.742s` |

Sol attributed only the hash-pinned delta between those identities. Terra
verified that it is confined to the candidate-publication failure
builder/validator, operation-only failed-attempt branch, dedicated candidate
failure publisher, and production executor initialization,
`_publish_candidate_artifacts`, and `preserve_failure`. The accepted pre-seal
path and `_publish_failed_attempt` are unchanged.

## Decision

**ACCEPT — bounded only to durable retention of one post-trace
private-candidate validation failure.** A trace-complete private-candidate
validation failure produces one real-validator-accepted operation-only record.
The completed integration digest, trace stage, canonical destination, and
original error are cross-bound; `commands` is exactly empty, no raw stream is
invented, the final destination remains absent, and `os.replace` is not
called. Successful preservation rethrows the original validation error.

## Boundary preservation

- Phase R1 v3 remains `[~]`.
- Atomic-replace failure, other publication failures, preservation-failure
  injection, broader pre-seal stages, candidate contents, H3/H4/H5, R1-v3,
  and a runner commit remain unaccepted.
- The cumulative runner and test code remain deliberately uncommitted; a code
  commit requires truthful cumulative attribution and separate Terra/Sol
  acceptance.
- No Podman, candidate, Finance, marker, registry, successor, V2/history,
  branch, worktree, clean, stash, or reset action is accepted or authorized.
