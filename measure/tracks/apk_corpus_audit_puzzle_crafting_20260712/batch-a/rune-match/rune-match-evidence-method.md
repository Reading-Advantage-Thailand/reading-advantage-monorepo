# Rune Match — Batch A Evidence Collection Method

Collector role: `evidence-collector`
Track: `apk_corpus_audit_puzzle_crafting_20260712`
Canonical identity: `vocabulary/rune-match`
Phase base: `52e48970bc9c4b585c55b53072ebebe466a1c4f4`
Role base: `d77044c35571dabde108098e5c9f9dd62722327d`
Source baseline: `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286`

## Method

1. Bound the game to the accepted Batch A discovery audit and verified that Rune Match is one of exactly three Batch A identities.
2. Recomputed the accepted T2 denominator and partition hashes before reading source: `d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729` and `6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0`.
3. Read only frozen-baseline blobs with `git show <revision>:<path>`; each claim cites a closed line range, range SHA-256, blob SHA-256, and revision.
4. Recomputed each cited range as SHA-256 over the cited lines terminated by `\n`.
5. Restricted claims to source declarations, literal configuration, and source control flow. No browser, route-reachability, input, responsive, asset-usage, historical, or user-behavior conclusion is asserted.
6. Kept denominator gaps explicit: the discovery audit admits two Rune Match page path candidates, while per-identity source/asset/history denominator records were not supplied by that audit.

## Scope and stop-loss

- Claims authored: 13.
- Path admissions consumed: 2 admitted Rune Match page candidates; no new path admission.
- Git-history queries: 0 beyond frozen-blob reads; no history claim authored.
- Denominator reports: 1 discovery-audit reconciliation consumed.
- Unsupported factual claims observed: 0.
- Denominator mismatches observed: 0.
- Browser evidence: none.
- Behavioral inference: none.

## Negative fixture policy

Fixtures are source-bound test inputs only. They do not assert that a browser renders them or that a user can complete a move. Unsupported claims and directory-only citations must be rejected.
