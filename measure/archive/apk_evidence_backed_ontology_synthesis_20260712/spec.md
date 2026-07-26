# Specification: APK Evidence-Backed Ontology Synthesis

## Overview

Derive cross-game mechanic, capability, responsive, and semantic asset requirements only from accepted, hash-pinned denominator, pilot, cohort, and candidate-forensics manifests. Synthesis cannot add factual claims. It also emits a forward-only canonical-adoption matrix under the program's fixed ElvGames pack policy; that policy is a delivery constraint, not evidence about a legacy asset.

Generators may render approved decisions but may not decide mechanics, scenes, capabilities, responsive strategies, asset roles, confidence, conflicts, or reuse dispositions.

## Required inputs

- Accepted T2 denominator manifest.
- Accepted T3 pilot manifest.
- Accepted T4–T7 cohort manifests.
- Accepted T8 per-candidate asset manifest.
- Immutable T1 gate version.
- The program's canonical ElvGames pack policy: source root
  `packages/advantage-play-kit/assets/standard` and the standard-pack semantic-key
  grammar. This policy cannot add, replace, or upgrade any T2-T8 factual claim.
- The accepted versioned standard-pack release, generated catalog digest, and
  source-receipt digest. These constrain candidate-key selection but do not add
  historical claims about legacy games or assets.

Failed `apk_cross_game_asset_ontology_20260712` outputs are forbidden inputs except labeled counterexamples.

## Functional requirements

### FR1: Mechanic blueprints and effort

Derive per-game blueprints and developer-effort baseline. Every derived field lists its complete upstream claim set.

### FR2: Capability ontology

Classify repeated capabilities with exact game/scene consumers, behavioral equivalence, meaningful differences, owner, extension boundary, minimum evidence, and disposition. Standardization requires at least two independently evidenced consumers. Bespoke requires incompatibility evidence.

### FR3: Responsive composition

Derive game-specific compact/wide requirements from accepted current/browser/historical evidence, including geometry, camera, visibility, regions, controls, content fixtures, transitions, and explicit unknowns.

### FR4: Asset normalization

Normalize concrete scene usages into semantic families after usage evidence exists. Link every semantic role/state to concrete usages, capabilities, profiles, candidate dispositions, and a standard-pack candidate key or an explicit blocked state. The matrix uses standard-pack-relative semantic keys only; direct legacy paths, vendor filenames, and inferred near matches are forbidden. Separate gameplay variants from source-pack treatments.

### FR5: Gaps and delivery

Rank missing capabilities, responsive primitives, physical assets, and cartridge cohorts without resolving unknown Must-have decisions.

## Truth tests

- Removing a cited upstream claim invalidates every dependent record.
- Synthetic scenes, generic responsive templates, unsupported roles, directory citations, and stale candidate counts fail.
- Candidate rows exactly equal T8 accepted denominator.
- A direct legacy path, vendor filename, absent standard-pack candidate key, or
  non-blocked unknown adoption mapping fails.
- Standardization without two exact consumers fails.
- Output generation is deterministic and decision-free.

## Acceptance criteria

- Every derived fact resolves to accepted evidence.
- Every game/scene/state has accepted mechanic, effort, responsive, capability, and asset mappings.
- Independent domain reviewers separately audit mechanics/capabilities, responsive behavior, and assets.
- Unknown Must-have decisions remain blockers.
- Zero unresolved Critical, High, or Medium findings.
- This track publishes no consumable successor hashes.

## Out of scope

- Final acceptance and handoff.
- Shared-kit, art, or cartridge implementation.
- Per-file visual inspection of the complete ElvGames pack; only selected adopted
  mappings advance to T10 contract, catalog, receipt, release, and visual validation.
