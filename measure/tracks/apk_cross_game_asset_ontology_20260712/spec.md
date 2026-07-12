# Specification: APK Cross-Game Asset Requirements and Ontology

## Overview

The APK program needs two coherent theme packs, but the asset requirements must
come from the games rather than from legacy file layouts or a generic fantasy
manifest. This track inventories every relevant developed and in-development
game, records where presentation assets are used, normalizes those usages into
reusable semantic asset types, and identifies missing variants and environment
kits.

This is a requirements and product-modeling track. It does not generate art,
choose final sprite-sheet layouts, rewrite cartridges, or reopen withdrawn
routes.

## Definitions

- **Game asset usage:** one concrete need in a game scene, such as a weak melee
  enemy, protected target, flying mount, dungeon wall, breakable prop,
  projectile, hit effect, minimap marker, or health display.
- **Semantic asset type:** a reusable contract role shared across games without
  referring to a physical filename.
- **Gameplay variant:** a distinct visual identity justified by gameplay role,
  behavior, strength, movement, attack, scale, collision/readability, or scene
  function.
- **Theme treatment:** the Chibi Quest or Riven Lands rendering of the same
  semantic asset type or accepted variant.
- **Environment kit:** a coherent reusable set of terrain, boundaries, props,
  hazards, and ambient elements for a proven setting.

## Source-of-truth order

When sources disagree, use this order and record the conflict:

1. Current playable implementation and its tests.
2. Current in-development implementation and active Measure specification.
3. Archived game baseline, APK blueprint, and cutover evidence.
4. Catalog title/description when no stronger source exists; such requirements
   remain provisional until product review.

The initial corpus includes all 27 entries in
`apps/advantage-games/src/lib/gameCards.ts`, all games covered by archived APK
W0-W4, and additional active/in-development game tracks found during the audit.

## Functional requirements

### FR1: Complete game corpus

- Record every relevant game ID, title, learning input, current status,
  implementation path, Measure source, primary mechanics, camera/view,
  gameplay scenes, and confidence level.
- Distinguish playable, withdrawn, in development, planned, missing, and stale
  catalog claims.
- Do not silently omit games because their implementations were deleted or
  their routes are currently withdrawn.

### FR2: Scene-level asset usage matrix

- For every game, enumerate player/mount roles, enemies and difficulty roles,
  targets, environment, obstacles, hazards, interactables, pickups, weapons,
  projectiles, VFX, UI, backgrounds, transitions, and result presentation.
- Record where each usage appears and the states it must communicate.
- Cite a source path, archived revision, specification section, screenshot, or
  explicit product decision for every non-provisional row.
- Record view, scale, directional needs, animation/state needs, interaction,
  strength/behavior tier, and potential reuse candidates.

### FR3: Existing-asset audit

- Enumerate existing 2D production candidates across the relevant apps,
  packages, public directories, and approved authoring repository.
- Manually inspect each candidate before proposing reuse.
- Record dimensions, format, license/provenance, visible content, current use,
  semantic suitability, and reuse/reject/replace disposition.
- Generated placeholders, cover art, baked checkerboards, and visually similar
  assets are not accepted without proving they satisfy the intended usage.

### FR4: Normalized ontology

- Normalize usages into reusable families for actors, creatures/mounts,
  environments, terrain, structures, props, hazards, targets, pickups,
  weapons, projectiles, VFX, UI/HUD, backgrounds, and navigation indicators.
- Define variants by gameplay meaning rather than arbitrary cosmetic diversity.
- For example, one skeleton may cover weak melee usages, while armored,
  ranged, caster, or boss skeletons are separate only when the game matrix
  proves those roles are required.
- Organize environment needs into reusable kits such as ruins, plains,
  dungeons, forests, castles, or other settings established by the corpus.
- Record allowed substitutions and prohibited conflations so a visually similar
  asset cannot conceal a gameplay distinction.

### FR5: Gap analysis and coverage plan

- Identify usages not satisfied by a reusable semantic type or acceptable
  existing asset.
- Separate Must-have gaps from later variety/polish opportunities.
- Calculate which accepted types and variants unlock the greatest number of
  games and scenes without erasing meaningful distinctions.
- Produce recommended production batches based on shared coverage and dependency
  order, not on an arbitrary character-first list.

### FR6: Reviewable contract input

- Produce a machine-validatable matrix and human-readable ontology.
- Every game must map to its full set of usages.
- Every ontology entry must point to at least one game/scene usage or an
  explicitly accepted gap.
- Unknowns and disagreements remain visible; they are not resolved by guessing.
- Track 2 remains blocked until the product owner explicitly accepts the corpus,
  ontology, variants, environment kits, and gap priorities.

## Acceptance criteria

- The current 27-card catalog and every discovered active game track are fully
  reconciled with implementations and archived evidence.
- No in-scope game, gameplay scene, or required presentation category lacks a
  traceable matrix row.
- Duplicate usages are normalized; distinct strength/behavior roles are not
  collapsed merely because they share a species or silhouette.
- Environment kits reflect proven game settings and identify their shared and
  game-specific components.
- Existing asset reuse decisions include manual visual evidence.
- Proposed physical formats and file counts are absent from the accepted output
  except where a game imposes a genuine capability constraint.
- Independent review finds no missing game cohort or unsupported ontology entry.

## Out of scope

- Generating, editing, or importing production art.
- Freezing universal sprite-sheet dimensions or filenames.
- Rewriting APK runtime, cartridges, hosts, or educational behavior.
- Reopening catalog routes or claiming any theme pack complete.
