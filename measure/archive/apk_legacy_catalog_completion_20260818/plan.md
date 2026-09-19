# Implementation Plan: APK Legacy Catalog Completion

## Phase 0: Inventory And Contract Freeze

- [x] Create the exact 20-title execution track from the owner's instruction.
- [x] Inventory legacy source, input mode, learning loop, controls, terminal rules, and cleanup risks for every title. Five report-only Luna assignments covered four titles each.
- [x] Reconcile the inventory into one implementation matrix. See `inventory-matrix.md` for the finite-session and controller contract freeze.

## Phase 1: Per-Title Red Contracts

- [x] Write isolated failing cartridge tests for the four defense titles.
- [x] Write isolated failing cartridge tests for the five puzzle titles.
- [x] Write isolated failing cartridge tests for the five action titles.
- [x] Write isolated failing cartridge tests for the two existing-core titles.
- [x] Write isolated failing cartridge tests for RPG Battle, Devourer Slime, The Haunted Library, and The Abyssal Well.
- [x] Run the combined Red gate and confirm only missing cartridge behavior fails. The 21 suites failed only on their missing implementation imports.

## Phase 2: Isolated Green Implementations

- [x] Implement Castle Defense, Magic Defense, RPG Battle, and Wizard vs Zombie.
- [x] Implement Enchanted Library, Rune Match, Alchemist's Synthesis, and Potion Rush.
- [x] Implement Dungeon Liberator, Rune Forge Chamber, Village Guardian, and The Abyssal Well.
- [x] Implement Archer's Revenge, Storm the Castle Tower, Griffin Sky-Joust, and Realm Carver.
- [x] Implement Paladin's Twin-Soul, Devourer Slime, The Haunted Library, and Gryphon Patrol.
- [x] Run all focused Green gates and the aggregate cartridge suite. All 46 files and 587 tests pass; package type check and lint pass.

## Phase 3: Catalog And Host Integration

- [x] Register 20 immutable catalog entries and lazy loaders. The catalog has 28 unique entries with matching loaders.
- [x] Export and build all new cartridge modules. The package build emits the core and all 20 modules.
- [x] Point all 28 game cards to the generic authenticated APK route.
- [x] Extend public fixtures for every input mode without weakening authenticated content. Existing deterministic vocabulary and sentence fixtures serve every catalog mode.
- [x] Extend lifecycle browser coverage to all 28 cartridges. Playwright lists 30 focused cases.

## Phase 4: Independent Review And Remediation

- [x] Review defense and existing-core ports for mechanic and learning parity. The review found that generic wrappers removed defining mechanics.
- [x] Review puzzle ports for mechanic and learning parity. The review found seven High and two Medium issues.
- [x] Review action ports for mechanic and learning parity. The review found defining mechanics absent from all five ports.
- [x] Review historical-title ports for mechanic and learning parity. The review found five unresolved High issue groups.
- [x] Review catalog, host, completion, cleanup, and test meaning across all 20 ports. The review found four High and five Medium issues.
- [x] Resolve every Critical and High finding through bounded Green assignments. Final remediation added explicit outcomes and exact catalog-manifest parity.

## Phase 5: Aggregate Verification

- [x] Run cartridge tests, focused coverage, lint, type check, and build. All 587 tests pass with 81.54% branch coverage.
- [x] Run Advantage Games tests, lint, type check, and production build. All 199 suites and 1,783 tests pass; lint has warnings only.
- [x] Complete every new cartridge through real compact and wide browser input. The 30-case serial lifecycle matrix passed.
- [x] Verify authenticated content and authoritative completion for each input mode. Magic Defense and Castle Defense persisted database-backed completions.
- [x] Verify replay cleanup, one canvas, attribution, and tutorial suppression. Browser and host lifecycle checks passed.

## Phase 6: Evidence And Closeout

- [x] Refresh `graph.db` for all changed TypeScript files. The final update refreshed 227 files.
- [x] Reconcile README, registry, metadata, and evidence with verified results.
- [x] Obtain final independent review of the complete diff. No unresolved Critical or High issues remain.
- [x] Submit criterion-level completion evidence and record remaining legacy retirement work. See `final-review.md`.
