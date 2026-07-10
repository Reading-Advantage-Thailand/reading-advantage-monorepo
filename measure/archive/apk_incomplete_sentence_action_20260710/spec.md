# Specification: APK Incomplete Sentence Action W1

## Overview

Astral Mage and The Sorcerer's Ziggurat are the only current Advantage Games catalog entries marked `coming-soon`, and both have zero gameplay implementation. This track builds them directly as Phaser 4 APK cartridges. It preserves their recognizable catalog mechanics—not obsolete React-Konva architecture—and establishes two reusable sentence-action families for later waves.

Both cartridges consume the unchanged strict sentence pair array:

```ts
Array<{ term: string; translation: string }>
```

Both emit exactly one unchanged five-field result:

```ts
{ accuracy, xp, score, correctAnswers, totalAttempts }
```

The `term` is the ordered sentence to act on; `translation` is the visible meaning or prompt. Identity, tenant, authoritative XP, timing, idempotency, and persistence remain host-owned.

## Stories

### Story S1: Build Astral Mage target action
**As a** language learner
**I want** to move through an astral arena and shoot word crystals in sentence order
**So that** sentence reconstruction becomes a readable action game rather than a static selection exercise.

**Acceptance Criteria:**
- Given valid sentence pairs and a seed, When Astral Mage starts, Then every token receives a stable distinct target ID and the same seed produces the same rounds.
- Given the current required token, When its crystal is hit, Then progress advances exactly once; a wrong live crystal counts an attempt but does not advance.
- Given duplicate words or multiple sentences, When the player completes the sequence, Then every token and sentence is handled without ambiguity and exactly one valid result is emitted.
- Given keyboard/mouse or touch input, When the player moves and aims/fires, Then real Phaser projectiles and target collisions drive the same tested state transitions.
- Given empty input, blank terms, blank translations, unknown targets, or already-hit targets, When preflight or transitions run, Then they fail or no-op safely without corrupting progress.

**Estimate:** XL
**Priority:** Must

### Story S2: Build Ziggurat step traversal
**As a** language learner
**I want** to jump across adjacent rune cubes in sentence order
**So that** sentence sequencing becomes a spatial traversal puzzle with clear legal choices.

**Acceptance Criteria:**
- Given valid sentence pairs and a seed, When a ziggurat is generated, Then the correct token path is reachable, deterministic, and free of dead ends.
- Given a reachable correct cube, When selected, Then the sorcerer tween-jumps, advances one token, and lights the rune; a wrong legal cube counts an attempt but does not advance.
- Given a nonexistent or nonadjacent node, When selected, Then the transition is ignored safely.
- Given duplicate words and multiple sentences, When every ritual tier completes, Then exactly one valid result is emitted.
- Given keyboard directions or direct touch selection, When the player acts, Then the same pure adjacent-step rules and isometric projection are used.

**Estimate:** XL
**Priority:** Must

### Story S3: Prove editions and hosts
**As an** application developer and product owner
**I want** both games to run from one gameplay source under both theme packs and both consuming apps
**So that** Primary and Secondary do not fork game logic or assets.

**Acceptance Criteria:**
- Given either cartridge, When Primary Chibi or Secondary Epic resolves, Then all required semantic slots have valid provenance and the scene contains no edition-specific branch.
- Given Advantage Games `/qc`, When either public ID is selected, Then one canvas launches, public result identity is correct, and repeated game/edition switches do not leak canvases or input handlers.
- Given Reading or Primary host registries, When all public cartridges load, Then Astral Mage and Ziggurat use unchanged sentence arrays under the correct edition.
- Given desktop and 390x844 viewports, When representative keyboard and touch flows run, Then prompts, targets, controls, and diagnostics remain readable without overflow.

**Estimate:** L
**Priority:** Must

### Story S4: Cut over unfinished catalog entries
**As a** game-platform maintainer
**I want** the two coming-soon cards to launch their APK cartridges through the QC testbed
**So that** no public card points to a nonexistent legacy route.

**Acceptance Criteria:**
- Given the Advantage Games catalog, When either card is opened, Then it deep-links to `/qc?cartridge=<public-id>` and the requested cartridge becomes selected.
- Given automated and product-owner QC, When the cutover is accepted, Then both cards become playable without creating app-local game implementations or APIs.
- Given server completion enums, When only QC and typed host consumption are proven, Then the two IDs remain excluded from authoritative completion until a production student route owns persistence.
- Given cutover evidence, When source and graph scans run, Then the retained covers and obsolete audit records are explicit and no nonexistent legacy gameplay is claimed deleted.

**Estimate:** M
**Priority:** Must

## Non-Functional Requirements

- Use Phaser 4 systems for gameplay; no React-Konva, R3F, Next.js, auth, DB, or app-private imports in cartridge code.
- New pure family systems and cartridge rules exceed 80% statement and line coverage.
- Use deterministic RNG and stable token/node IDs, including duplicate word cases.
- Primary Chibi uses larger targets/hit areas, slower motion, clearer legal choices, and lower density; Secondary Epic may use tighter scale and denser effects within safe tuning bounds.
- Exported functions, interfaces, and type aliases follow repository JSDoc requirements.
- The Advantage Games production build, package architecture guard, affected host tests, and browser QC must pass.

## Out of Scope

- Authenticated standalone Advantage Games accounts, persistence, rewards, leaderboards, or arcade shell.
- Final commercial artwork; normalized procedural/local placeholders with provenance are acceptable.
- Adding these IDs to authoritative server completion before a production student-route adapter exists.
- Rebuilding any other catalog game.
- Preserving obsolete compliance-audit renderer requirements or inventing legacy app-local game files.
