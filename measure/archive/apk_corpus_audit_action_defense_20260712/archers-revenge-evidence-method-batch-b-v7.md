# Archer's Revenge — Batch B evidence method V7

Collector: `evidence-collector-archers-revenge-batch-b-v7`
Role base: `ffeb96b4a71b1635cbd6b3cf3557984e36261557`

## Boundary

This additive package supersedes the V6 collector ledger only. It replaces compound V6 factual records with atomic records, adds every mandatory factual field to each record, and corrects binary shape interoperability. No mapping, browser, review, truth-test, candidate, acceptance, manifest, or product work was performed.

## Source method

Text facts were read from historical Git revision `cd1936387d136ffb12e77a647f36cbce2d1fdd4e`. Each text record has one proposition and an inclusive UTF-8 LF-terminated line envelope, whole-blob SHA-256, cited-range SHA-256, source fact, interpretation, confidence, evidence class, discovery method, collector, conflict state/resolution, reviewer disposition, and temporal disposition. Binary facts were read from baseline revision `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286`; each uses an explicit zero-based inclusive byte envelope covering the whole file, with equal whole-file and cited-range hashes.

## Atomicity rule

No record joins independent outcomes with “and”, infers currentness, or promotes source wiring to live behavior. A source envelope may be reused where multiple atomic propositions are independently stated, but every proposition has its own complete envelope record. Negative fixtures are controls, not facts.

## Coverage and limits

The package records source-backed configuration, formation, state, targeting, projectile, combat, health, wave, result, presentation, input-wiring, integration, and three binary-presence atoms. Historical and baseline evidence does not establish current route existence, runnability, native input, live responsive behavior, persistence success, asset loading, or provider provenance. Escort, named defense-zone geometry, pause, and audio usage remain not-present rather than fabricated.

## Verification contract

Run `python3 -m json.tool` on the ledger, report, and receipt; re-derive every declared Git blob/range and binary byte envelope from its declared revision; assert unique IDs and all contract fields; ensure every binary range is `kind: bytes`; run `git diff --check` on the four additive outputs. Downstream selection, mapping, browser work, review, and acceptance remain outside this role.
