# Planning Plan: APK Cartridge Migration Umbrella

## Phase 1: Pin and reconcile

- [x] Verify the archived T2, T10, T11, and standard-pack paths and hashes recorded in `ontology-input.md`. Evidence: accepted readiness receipt `d371fc5d…f1720`.
- [x] Create the foundation child track to reconcile 27 source identities against 29 accepted partition assignments before any completeness claim. Evidence: accepted crosswalk `eb395d3d…c5f57` plus owner acceptance `aa9b842f…39a12`.
- [x] Record T10/T11 disclosures as non-waivable cohort gates. Evidence: `accepted-readiness-receipt-v1.json` retains T10 zero-adoption, T11 no-cutover, and all five open gaps.

## Phase 2: Delegate bounded vertical cohorts

- [x] Create the two existing-cartridge revalidation/cutover cohorts, each with no more than five identities.
- [x] Create the three remaining legacy rebuild/cutover cohorts, each with no more than five identities.
- [x] Create the historical/cancelled disposition and planned/new-game intake tracks with explicit non-authorization rules.
- [x] Create the residual-only cross-host closeout track and verify every identity is mapped once or explicitly gated. Evidence: the accepted 29-assignment crosswalk maps 27 source identities plus two historical labels exactly once.

## Portfolio assignment ledger

| Child track | Identities (each exactly once) |
| --- | --- |
| `apk_existing_core_cutover_20260727` | Dragon Flight; Magic Defense; Dungeon Liberator; The Sorcerer's Ziggurat; Astral Mage |
| `apk_existing_action_cutover_20260727` | Archer's Revenge; Paladin's Twin-Soul; Griffin Sky-Joust; Gryphon Patrol; Realm Carver |
| `apk_legacy_defense_cutover_20260727` | Castle Defense; Wizard vs Zombie; Village Guardian; Storm the Castle Tower |
| `apk_legacy_traversal_cutover_20260727` | Dragon Rider; Spellweaver's Run; Shadow Gate Dungeon; Labyrinth of the Goblin King; Griffin Rider's Escape |
| `apk_legacy_puzzle_cutover_20260727` | Enchanted Library; Rune Match; Alchemist's Synthesis; Potion Rush; Rune Forge Chamber |
| `apk_historical_identity_disposition_20260727` | RPG Battle; The Abyssal Well; Devourer Slime; The Haunted Library; Babel Architect (explicitly gated — not authorized for rebuild) |

The ledger has 29 assignments and is accepted by receipt `d371fc5d…f1720`: 27 source identities plus two historical labels. It is not a 29-source-identity, migration-complete, or retirement-complete claim.
