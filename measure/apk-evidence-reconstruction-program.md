# APK Evidence Reconstruction Program

## Why this program exists

Five APK requirements attempts failed because authored outputs were treated as evidence, structural tests were treated as factual verification, and required independent subagents were skipped. The failed `apk_cross_game_asset_ontology_20260712` artifacts are quarantined negative evidence. They are not valid inputs to this program.

Passing structural tests does not establish factual correctness. Completion is measured against an independently discovered denominator and exact source evidence.

The primary agent may coordinate, commit, and report, but may not act as discovery auditor, evidence collector, requirements mapper, truth-test author, and final reviewer for the same deliverable.

## Dependency graph

```text
T1 Evidence integrity gates
          |
          v
T2 Independent source denominator
          |
          v
T3 Three-game truth pilot
          |
          +----------------+----------------+----------------+
          v                v                v                v
T4 Action/defense   T5 Traversal     T6 Puzzle/craft  T7 Special/history
          +----------------+----------------+----------------+
                                           |
                                           v
                                  T8 Asset forensics
                                           |
                                           v
                              T9 Evidence-backed synthesis
                                           |
                                           v
                              T10 Independent acceptance
                                           |
                         +-----------------+-----------------+
                         v                 v                 v
                    Shared kit       Asset production   Cartridge rebuilds
```

Tracks T4–T7 may run in parallel only after T3 is accepted. T8 begins only after T4–T7 are accepted because suitability requires their concrete scene usages. T9 requires accepted hashes from T2–T8. T10 alone may publish consumable successor hashes.

## Mandatory role contract

Every execution phase publishes a machine-readable task-ownership manifest and tool-attested role receipts. Each task records `owner_role`, `forbidden_roles`, allowed-input manifest hash, expected output paths/hashes, and reviewer role.

Each receipt records the collaboration-tool spawn ID, parent/ancestry IDs, `fork_turns` mode, exact prompt hash, allowed-input manifest hash, actual context-manifest hash, prior-role history, start/end event IDs and timestamps, final-response hash, enumerated output-file hashes, findings, budget-declaration hash, and commit SHA. Independent reviewers must use `fork_turns="none"`. Missing runtime attestation, inherited narrative, copied agent IDs, output ownership not corroborated by the final response, or a mismatch between task and output hashes fails closed.

Required distinct roles:

1. Discovery auditor.
2. Evidence collector.
3. Requirements mapper.
4. Truth-test author.
5. Adversarial reviewer.

The root agent must spawn the required subagents. It cannot substitute its own work for a missing receipt. Root may coordinate, apply independently authored and reviewed patches, commit, and report; it may not author discovery, evidence, mapping, truth-test, browser-audit, asset-inspection, or review outputs. Reviewers receive fresh context containing only the specification, raw-source pointers, accepted manifests, and revision range—not the mapper's reasoning or completion narrative.

Before each phase, a machine-readable role-applicability matrix assigns every task to the required roles. The discovery auditor is mandatory for denominator-changing work; evidence collector and requirements mapper are mandatory for every game package; truth-test author and adversarial reviewer are mandatory for every accepted artifact. Specialized browser, history, asset, or domain reviewers supplement rather than replace these roles. One agent may not hold incompatible roles for the same artifact.

## Claim-evidence contract

Every factual claim records:

- Stable claim ID and category.
- Game and exact scene/state IDs when applicable.
- Repository revision and exact file path.
- Exact line start/end and cited-range hash.
- Extracted source fact, separate interpretation, and confidence.
- Evidence class and discovery method.
- Collector agent ID.
- Conflict state and resolution.
- Reviewer agent ID and disposition.

Directory citations, generated prose as primary evidence, stale hashes, unreachable historical revisions, same-agent collection/review, and inference presented as fact are validation failures.

## Generator boundary

Generators may deterministically render approved records. They may not infer or decide scenes, mechanics, responsive strategies, capabilities, asset usages, confidence, conflict resolution, or disposition.

## Stop-loss rules

- Maximum three games per evidence batch.
- One unsupported or fabricated factual claim stops the batch.
- One denominator mismatch stops interpretation and synthesis.
- Two failed fix/review cycles block the track pending product-owner direction.
- No later phase begins while Critical, High, or Medium findings remain.
- Resource use is recorded per role and batch in frozen units and numeric ceilings before source work begins. `unmeasured` blocks checkpoint and completion. The budget declaration is hashed into every receipt; changing a ceiling requires prior product-owner approval and invalidates affected candidate outputs.
- No corpus-scale work begins before the three-game pilot is independently accepted.

## Known shortcuts that must fail

- One synthetic `main` scene per game.
- Hardcoded mechanic summary tables.
- Regex- or keyword-selected responsive templates.
- Slug allowlists that assign asset roles.
- Directory-level citations.
- Coverage denominators derived from authored outputs.
- Contact-sheet review substituted for candidate-level inspection.
- Catalog prose treated as implementation behavior.
- Missing evidence filled through analogy.
- Same-context self-review.
- Product approval requested without complete independent review artifacts.
- Completion while graph, browser, evidence, or global gates are unverified.
- Hashes regenerated after input changes without rerunning acceptance.

## Exact game partition

### Pilot

- Dragon Flight — large current action implementation.
- RPG Battle — multi-state turn-based implementation.
- The Abyssal Well — stale/historical evidence recovery.

### Action and defense

- Castle Defense
- Magic Defense
- Wizard vs Zombie
- Village Guardian
- Archer's Revenge
- Storm the Castle Tower
- Paladin's Twin-Soul
- Gryphon Patrol

### Traversal and exploration

- Dragon Rider
- Dungeon Liberator
- Spellweaver's Run
- Shadow Gate Dungeon
- Labyrinth of the Goblin King
- Griffin Rider's Escape
- The Sorcerer's Ziggurat

### Puzzle and crafting

- Enchanted Library
- Rune Match
- Alchemist's Synthesis
- Potion Rush
- Rune Forge Chamber
- Astral Mage

### Special and historical

- Griffin Sky-Joust
- Realm Carver
- Devourer Slime
- The Haunted Library
- Babel Architect

The partition covers 29 canonical identities exactly once. T2 must independently confirm or correct that denominator before T3 begins.

T2 publishes a candidate partition-freeze artifact assigning every accepted canonical identity exactly once. Product-owner acceptance creates the accepted partition manifest; all cohort scopes must be generated from or amended to that exact hash before work begins. Added, removed, renamed, split, or merged identities revoke downstream candidate manifests until repartitioned and revalidated.

## Runnable disposition

Runnable means an independently discovered current implementation and route can be started in the documented environment. A non-runnable disposition requires the attempted command, environment, route, exact failure, logs, revision, and independent reviewer acceptance. Setup or test failure never silently waives browser evidence.

## Candidate and acceptance ordering

Pre-approval output is always a non-consumable `candidate-manifest`. After independent review reports zero unresolved Critical, High, or Medium findings, the product owner may accept the exact candidate and review hashes using versioned `product-owner-acceptance.json`. Required fields are schema version, owner identity, timestamp, scope, candidate-manifest hash, review-report hash, gate-version hash, decision, revocation state, superseded acceptance ID, tool-generated user-message/event ID, conversation/thread ID, exact approval-message hash, and approval-event timestamp. The validator resolves that event and rejects agent-authored, missing, mismatched, earlier-than-review, or replayed approval evidence. Only then may a separate `accepted-manifest` be generated. Any input change automatically revokes the acceptance and accepted hashes.

All track metadata uses the single canonical `depends_on` field. The gate schema rejects the legacy `dependencies` alias in this program and its successors so dependency enforcement cannot diverge between readers.

Required order: review complete -> zero blocking findings -> product-owner acceptance bound to exact candidate hashes -> accepted manifest and successor hashes.

## Successor blockade

The shared-kit, dual-theme production, and cartridge-rebuild tracks must reject missing, revoked, stale, or mismatched T10 hashes. No file from the failed monolithic track may appear in the accepted dependency graph except as labeled negative/failure evidence.
