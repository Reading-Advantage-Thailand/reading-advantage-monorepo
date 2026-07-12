# Specification: APK Cartridge Semantic Rewrite and Integration

## Overview

This track governs the rewrite of developed and in-development games against the
new semantic asset system. The old game's mechanics, learning loop, and product
identity are evidence; its renderer, filenames, and sprite-sheet assumptions are
not compatibility requirements.

Games are rewritten in bounded cohorts only after all of their Must-have semantic
assets exist in both Chibi Quest and Riven Lands. A cartridge may not invent a
private asset role or silently substitute a near match to keep moving.

## Required predecessor artifacts

- Accepted game corpus and scene-level usage matrix.
- Accepted semantic ontology, variants, environment kits, and change-control rules.
- Accepted semantic-to-physical contracts.
- Validated dual-theme production batches covering the selected cohort.

## Stories

### Story S1: Freeze cartridge readiness and cohorts

**As a** program maintainer
**I want** games grouped by shared mechanics and available semantic assets
**So that** rewrites are bounded, reusable, and not blocked mid-implementation.

Acceptance criteria:

- `cartridge-readiness-matrix.md` lists every in-scope game, educational ABI,
  mechanics, required semantic asset IDs/states, both-theme availability, shared
  runtime capabilities, and blockers.
- A game is Ready only when every Must-have semantic asset exists and validates
  in both themes.
- Rewrite cohorts contain no more than five games and share meaningful runtime
  or asset capabilities.
- Each Ready cohort is implemented through a dedicated child Measure track with
  exact game IDs, source evidence, asset dependencies, and verification matrix.

### Story S2: Consume semantic capabilities

**As a** cartridge developer
**I want** scenes to request semantic roles and states
**So that** physical files and theme paths remain edition-owned.

Acceptance criteria:

- Cartridge code requests semantic assets and states defined by the accepted ontology.
- Edition manifests map the same semantic requirements to each theme's validated files.
- Runtime loading deduplicates physical sources and registers the states required
  by each scene.
- No cartridge contains hard-coded theme paths, copied pack files, procedural
  production art, or frame-zero-only use where states are required.
- The new contract may use new type-specific formats; legacy physical layouts are
  not preserved unless independently selected by the asset-production track.

### Story S3: Preserve game and learning identity

**As a** learner
**I want** rewritten games to retain their recognizable mechanics and educational loop
**So that** the platform rewrite does not turn distinct games into reskins.

Acceptance criteria:

- Each game retains its accepted learning input, target/progression rules,
  controls, feedback, terminal loop, and five-field result contract.
- Gameplay-distinct actor/enemy strength or behavior variants resolve to the
  accepted semantic variants.
- Environment selection matches the game's accepted setting and uses the
  corresponding complete kit rather than a generic dungeon/forest fallback.
- Primary and Secondary use identical learning/gameplay logic; only validated
  theme assets and bounded audience tuning differ.

### Story S4: Route newly discovered requirements correctly

**As a** product and runtime maintainer
**I want** missing asset needs handled through change control
**So that** implementation pressure does not corrupt the ontology.

Acceptance criteria:

- If a rewrite exposes a missing requirement, that cartridge pauses.
- The requirement is added to the usage matrix with source evidence, reviewed as
  reuse versus a new variant, added to both themes, and validated before work resumes.
- Child tracks may not add private semantic IDs or use unreviewed substitutes.

### Story S5: Restore production exposure safely

**As a** product owner
**I want** only completely verified cartridges returned to the catalog
**So that** no withdrawn or incomplete game is represented as playable.

Acceptance criteria:

- Each game passes unit/integration coverage, lifecycle, educational/result ABI,
  semantic asset, no-fallback, and package-boundary gates.
- Kimi WebBridge verifies both themes at desktop and 390x844 through real input,
  feedback, completion, restart, and theme-switch flows.
- Catalog and production route restoration is per-game and occurs only after its
  child track is accepted.
- Final review leaves no Critical, High, or Medium finding open.

## Out of scope

- Generating assets inside cartridge implementation tracks.
- Preserving legacy renderer/file compatibility.
- Rewriting games whose corpus status or product requirements remain unresolved.
- Adding new educational ABI fields, client-authoritative XP, or per-game hosts.
- Restoring all games in one bulk catalog change.
