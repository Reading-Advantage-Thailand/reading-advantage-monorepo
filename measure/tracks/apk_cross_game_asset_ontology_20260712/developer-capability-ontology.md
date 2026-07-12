# APK Developer Capability Ontology

## Decision rule

Capabilities are standardized only with at least two concrete consumers. Shared foundations expose extension boundaries; single-consumer or provisional behavior remains bespoke.

| Capability                             | Domain       | Disposition     | Consumers | Owner                                   |
| -------------------------------------- | ------------ | --------------- | --------: | --------------------------------------- |
| `capability:lifecycle:session`         | lifecycle    | standardize     |        29 | `@reading-advantage/advantage-play-kit` |
| `capability:education:progression`     | education    | standardize     |        29 | `@reading-advantage/advantage-play-kit` |
| `capability:education:results`         | education    | standardize     |        29 | `@reading-advantage/game-contracts`     |
| `capability:input:input`               | input        | standardize     |        29 | `@reading-advantage/advantage-play-kit` |
| `capability:responsive:composition`    | responsive   | standardize     |        29 | `@reading-advantage/advantage-play-kit` |
| `capability:camera:camera`             | camera       | extend-existing |        21 | `@reading-advantage/advantage-play-kit` |
| `capability:education:sequencing`      | education    | standardize     |        19 | `@reading-advantage/advantage-play-kit` |
| `capability:education:targeting`       | education    | standardize     |        10 | `@reading-advantage/advantage-play-kit` |
| `capability:mechanic:runner`           | mechanic     | extend-existing |         6 | `@reading-advantage/advantage-play-kit` |
| `capability:mechanic:arena`            | mechanic     | standardize     |         9 | `@reading-advantage/advantage-play-kit` |
| `capability:mechanic:defense`          | mechanic     | extend-existing |         6 | `@reading-advantage/advantage-play-kit` |
| `capability:mechanic:collector`        | mechanic     | standardize     |         7 | `@reading-advantage/advantage-play-kit` |
| `capability:mechanic:puzzle`           | mechanic     | standardize     |         5 | `@reading-advantage/advantage-play-kit` |
| `capability:mechanic:turn-combat`      | mechanic     | bespoke         |         1 | `@reading-advantage/game-cartridges`    |
| `capability:mechanic:territory`        | mechanic     | bespoke         |         1 | `@reading-advantage/game-cartridges`    |
| `capability:mechanic:isometric-step`   | mechanic     | bespoke         |         1 | `@reading-advantage/game-cartridges`    |
| `capability:presentation:presentation` | presentation | standardize     |        29 | `@reading-advantage/advantage-play-kit` |
| `capability:audio:audio`               | audio        | standardize     |        29 | `@reading-advantage/advantage-play-kit` |
| `capability:testing:testing`           | testing      | standardize     |        29 | `@reading-advantage/advantage-play-kit` |

## Boundaries and acceptance

### Scene/session lifecycle

Cartridges supply scenes and rules; APK owns start, pause, restart, completion-once, resize, and teardown.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.

### Educational progression

APK validates content identity and attempts; cartridges decide the gameplay consequence of correct and incorrect actions.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.

### GameResults calculation boundary

Shared contracts compute structural result fields; authoritative XP, identity, tenancy, and persistence remain host-owned.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.

### Normalized active input mode

APK normalizes keyboard, pointer, touch, and hybrid state; cartridges bind semantic actions and handedness needs.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.

### Responsive composition orchestration

APK owns profile resolution and regions; each cartridge declares minimum geometry, strategy, visibility, and custom regions.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.

### Camera composition and indicators

Shared bounds, follow, dead-zone, transforms, and indicators remain configurable; world topology and dramatic framing stay cartridge-owned.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.

### Ordered sentence sequencing

Shared ordering, duplicate identity, attempts, and feedback are reusable; physical collection, targeting, escort, and construction remain bespoke.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.

### Vocabulary target validation

Shared term/translation validation and duplicate-safe identity do not prescribe typing, matching, gate, pickup, or combat presentation.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.

### Runner and traversal foundation

Share movement, pooling, collision, and scrolling; lane, flight, platform, and isometric step rules remain separate extensions.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.

### Arena and target-action foundation

Share bounded movement, target acquisition, projectiles, spawning, pools, and indicators; paired heroes, territory, growth, and breach rules stay bespoke.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.

### Defense and combat orchestration

Share waves, threats, objectives, health, and timing; tower placement, typed input, turn combat, escort, and stealth rules remain cartridge modules.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.

### Free-roam collection foundation

Share pickups, ordered validation, collision feedback, camera, and indicators; rescue, escort, maze, stealth, growth, and doors extend it.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.

### Puzzle/workstation foundation

Share deterministic boards, selections, drag/tap, shuffles, timers, and feedback; match, merge, conveyor, radial, and construction resolution stay distinct.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.

### Turn-based typed combat

RPG turn order, actions, combat log, enemy scaling, and animation sequencing remain RPG Battle-owned until another real consumer exists.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.

### Territory capture

Territory topology and capture semantics remain Realm Carver-owned; only generic movement, camera, sequencing, and feedback are shared.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.

### Isometric step graph

Projection, valid-step graph, depth ordering, and ritual recovery remain provisional cartridge concerns until corroborated.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.

### HUD, prompts, feedback, and results

Shared semantic regions, text classes, collapse priority, diagnostics, and accessibility do not standardize game-specific art direction.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.

### Semantic audio roles

APK owns mute, lifecycle, role lookup, and pooling; cartridges declare cues and themes provide treatments.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.

### Deterministic cartridge test kit

Shared seeded simulation, transition assertions, geometry fuzzing, completion-once, and browser harnesses accept cartridge-specific fixtures.

Minimum evidence: deterministic unit tests; compact/wide geometry tests; real-browser interaction QC.
