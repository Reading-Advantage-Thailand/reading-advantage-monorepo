# Enchanted Library — T6 Evidence Collection Method

Role: `evidence-collector`
Track: `apk_corpus_audit_puzzle_crafting_20260712`
Phase base: `52e48970bc9c4b585c55b53072ebebe466a1c4f4`
Role base: `d77044c35571dabde108098e5c9f9dd62722327d`
Source baseline: `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286`

## Method

1. Bound the game to the committed Batch A discovery audit and retained its two admitted page candidates; no other Batch A identity was used.
2. Read source only from `git show 23bb5ad578c01fb29f9e8bb76a7d934d24a4b286:<path>`.
3. For every ledger claim, hashed the exact inclusive line range with a trailing newline and recorded the baseline blob SHA-256.
4. Recorded extracted source fact separately from interpretation. Catalog prose, tests, and source comments were not promoted to runtime behavior.
5. Recorded responsive and input declarations only. No browser, reachability, accepted-input, visual-fit, or gameplay-transition conclusion was made.

## Source envelope validation

All cited source envelopes were resolved at the frozen baseline and their blob hashes are recorded in the ledger. The discovery envelope was resolved at committed role-output revision `877285f5a759eef5db9c4603f83ecdc75328a776`, not from the working tree. The ledger contains no directory-only citation.

## Denominator coverage

The frozen Batch A has three identities: Enchanted Library, Rune Match, and Alchemist's Synthesis. This package owns exactly `vocabulary/enchanted-library`. The discovery audit admits two Enchanted Library page candidates (advantage-games and reading-advantage); both are consumed as denominator pointers. No claim is made for Rune Match or Alchemist's Synthesis, and no extra identity or candidate is admitted.

## Budget accounting

Frozen evidence-collector ceilings: 72 cited ranges for this game, 120 source-path reads for this game, 24 history queries for this game, and 12 negative fixtures per batch. This package uses 32 ledger claims, 8 source paths, 0 history queries, and 3 negative fixtures. All are within ceiling. No source or browser behavior was inferred.
