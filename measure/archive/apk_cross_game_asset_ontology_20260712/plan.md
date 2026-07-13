# Implementation Plan: APK Cross-Game Requirements and Capability Ontology

> **Track ID:** `apk_cross_game_asset_ontology_20260712`
> **Execution type:** requirements and product-modeling; no production implementation

## Phase 0: Freeze scope, evidence, and schemas [checkpoint: cf13ca3]

- [x] Task: Snapshot repository and graph evidence [cf13ca3]
  - [x] Record HEAD, working-tree boundaries, graph freshness, catalog revision,
        relevant archived revisions, and concurrent work exclusions
  - [x] Inventory raw Advantage Games, Reading, and Primary game roots without
        treating copied implementations as separate product requirements
- [x] Task: Define machine-validatable audit schemas [cf13ca3]
  - [x] Define game, scene, mechanic, capability usage, responsive composition,
        asset usage, evidence, confidence, discrepancy, and disposition schemas
  - [x] Define stable IDs and cross-artifact referential-integrity rules
- [x] Task: Write validation tests that reject omitted games/scenes, unsupported [cf13ca3]
      standard capabilities, orphan assets, missing responsive profiles, and broken evidence
- [x] Task: Publish audit method and source-of-truth/conflict rules [cf13ca3]
- [x] Task: Measure - User Manual Verification 'Phase 0' (Protocol in workflow.md) [accepted 2026-07-12]

## Phase 1: Reconcile the complete game corpus [checkpoint: 7720d86]

- [x] Task: Enumerate every catalog, route, raw component, logic/config module, [7720d86]
      imported copy, test, asset root, and relevant Measure track
- [x] Task: Resolve playable, withdrawn, in-development, planned, missing, stale, [7720d86]
      duplicate, and deleted-source discrepancies
- [x] Task: Publish `game-corpus.md` and machine-readable corpus with exact evidence [7720d86]
- [x] Task: Run completeness and referential-integrity tests [7720d86]
- [x] Task: Obtain product-owner acceptance of the corpus boundary [accepted 2026-07-12]
- [x] Task: Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md) [accepted 2026-07-12]

## Phase 2: Recover mechanic and learning blueprints [checkpoint: 883d21c]

- [x] Task: Read each raw game component, deterministic logic/config, route, test, [883d21c]
      and strongest historical evidence
- [x] Task: Produce one blueprint per game covering learning loop, controls, world, [883d21c]
      camera, actors, progression, scoring, difficulty, terminal state, and identity
- [x] Task: Classify retained behavior, allowed Phaser-native redesign, and [883d21c]
      accidental renderer assumptions
- [x] Task: Extract deterministic transitions and counterexamples for future Red tests [883d21c]
- [x] Task: Cross-review every blueprint against current implementation evidence [883d21c]
- [x] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md) [accepted 2026-07-12]

## Phase 3: Baseline developer effort and repeated capabilities [checkpoint: 45d8c9d]

- [x] Task: Decompose every implementation into lifecycle, content, input,
      simulation, physics, camera, presentation, UI, audio, accessibility, host, and tests
- [x] Task: Quantify representative file/line/module complexity and document the
      current author-test-theme-QC-ship workflow
- [x] Task: Build `capability-usage-matrix.json` across all games and scenes
- [x] Task: Classify every repeated capability as retain, standardize,
      extend-existing, bespoke, or retire with source consumers and rationale
- [x] Task: Publish `developer-effort-baseline.md` and
      `developer-capability-ontology.md`
- [x] Task: Obtain product-owner acceptance of standardization boundaries [accepted 2026-07-12]
- [x] Task: Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md) [accepted 2026-07-12]

## Phase 4: Define responsive composition requirements [checkpoint: bcc38ed]

- [x] Task: Audit each game's current mobile/desktop canvas, camera, HUD, prompt,
      controls, text, safe regions, and scaling behavior
- [x] Task: Define compact and wide strategies, input modes, required visibility,
      camera policy, reserved regions, and transitions per game
- [x] Task: Add real short/worst-case Thai and English fixtures and enlarged-text cases
- [x] Task: Identify shared responsive primitives required by the developer kit
- [x] Task: Publish and validate `responsive-composition-matrix.md` against the
      repository-level responsive composition specification
- [x] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md) [accepted 2026-07-12]

## Phase 5: Build the asset usage matrix and reuse audit [checkpoint: 8054971]

- [x] Task: Inventory every scene's character, environment, gameplay object, VFX,
      audio, UI, control, background, transition, and result presentation usage
- [x] Task: Record states, directions, view, scale, collision, animation,
      compact/wide use, and developer-capability relationship
- [x] Task: Enumerate and manually inspect all existing production candidates
- [x] Task: Record provenance/license, dimensions, content, current use, responsive
      suitability, and reuse/reject/replace disposition
- [x] Task: Publish `game-asset-usage-matrix.json` and `existing-asset-audit.md`
- [x] Task: Measure - User Manual Verification 'Phase 5' (Protocol in workflow.md) [accepted 2026-07-12]

## Phase 6: Normalize semantic assets and delivery gaps [checkpoint: 0aaac92]

- [x] Task: Normalize usages into semantic families, gameplay variants,
      environment kits, audio/UI roles, allowed substitutions, and prohibited conflations
- [x] Task: Prove every ontology entry has source usage and every usage resolves or
      remains a visible gap
- [x] Task: Separate Must-have blockers from polish and variety opportunities
- [x] Task: Rank developer-kit slices and asset batches by cross-game coverage,
      dependency order, and product value
- [x] Task: Recommend bounded cartridge cohorts without opening implementation tracks
- [x] Task: Publish `asset-ontology.md` and `gap-and-coverage-plan.md`
- [x] Task: Measure - User Manual Verification 'Phase 6' (Protocol in workflow.md) [accepted 2026-07-12]

## Phase 7: Acceptance and dependent-track handoff [checkpoint: b551b9c]

- [x] Task: Run schema, completeness, evidence, referential-integrity, graph, and
      contradiction checks across all artifacts
- [x] Task: Run independent review for missing games, weak evidence, false reuse,
      over-generalization, under-generalization, and responsive/asset gaps
- [x] Task: Remediate every Critical, High, and Medium finding
- [x] Task: Publish `dependent-track-inputs.md` with accepted artifact versions and hashes
- [x] Task: Update developer-kit, asset-production, and cartridge dependencies
      without beginning their implementation
- [x] Task: Obtain explicit product-owner acceptance [accepted 2026-07-12]
- [x] Task: Measure - User Manual Verification 'Phase 7' (Protocol in workflow.md) [accepted 2026-07-12]

## Phase 8: Post-closeout review remediation [superseded]

- [b] Task: Replace synthetic scene modeling — deferred:apk_source_denominator_inventory_20260712
- [b] Task: Replace hardcoded blueprints with claim evidence — deferred:apk_three_game_truth_pilot_20260712-and-cohorts
- [b] Task: Replace heuristic responsive profiles — deferred:apk_three_game_truth_pilot_20260712-and-cohorts
- [b] Task: Replace templated asset roles — deferred:apk_three_game_truth_pilot_20260712-and-cohorts
- [b] Task: Publish per-candidate asset audit — deferred:apk_existing_asset_candidate_audit_20260712
- [b] Task: Regenerate synthesis from accepted inputs — deferred:apk_evidence_backed_ontology_synthesis_20260712
- [b] Task: Run final independent review — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Obtain product-owner re-acceptance — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Measure manual verification — deferred:apk_independent_acceptance_handoff_20260712
