# Gryphon Patrol Evidence Method - Batch C

Role: `evidence-collector-gryphon-patrol-batch-c` only. This record performs no mapping, browser observation, asset suitability decision, truth test, review, candidate, acceptance, plan, registry, ontology, or implementation work.

## Binding And Stop-Loss

- Requested role base: `419cbad0fb775a766201c23e56a77373a24bfbd1`.
- Phase base: `709b0c69608312aa5d784fcc9c1b74870ce697e0` (available as a commit).
- Frozen source baseline: `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286` (available as a commit).
- `git cat-file -e 419cbad0fb775a766201c23e56a77373a24bfbd1^{commit}` exited `128`; it did not resolve the requested role base. The exact command output is recorded in the receipt. This blocks consumption. The phase binding's strategy role base is independently stated as `1448eb4f168d7c6420e3e25347080283f3b840b5`, and the discovery receipt identifies `e5ed3818dd8e7c4811ade484ea5033b50a2b1823`; neither is substituted.

## Source Procedure

1. Read the Batch C protocol, strategy, budget, applicability, phase binding, discovery audit, and accepted denominator/partition manifests.
2. Use only the accepted Gryphon locators and direct historical imports from the accepted page/component. Capture Git blob bytes at the named historical revision.
3. Record each factual proposition as a ledger claim with revision, relative path, inclusive whole-file range (or whole binary), SHA-256 of the blob/range, source fact, and separate interpretation.
4. Treat historical archive and audit prose as history/copy context only. Do not elevate it to implementation or browser proof.
5. Reconcile the accepted denominator locators once each. The directly imported `gryphonPatrol.ts` and `gryphonPatrolConfig.ts` are disclosed as denominator alias gaps rather than silently added to an accepted count.
6. Keep the four required rejection fixtures outside the claim count.

## Bounded Current Absence

Command argv: `git grep -n -E 'gryphon-patrol|gryphonPatrol|gryphonPatrolConfig' 23bb5ad578c01fb29f9e8bb76a7d934d24a4b286 -- apps/advantage-games/src packages/game-cartridges/src`.

Exit status: `0`. Its stdout is hashed and retained in the final report/receipt. This command is only a bounded baseline search across the two listed path domains. It does not establish global absence or runtime behavior.

MEASURE_AGENT_RESULT
