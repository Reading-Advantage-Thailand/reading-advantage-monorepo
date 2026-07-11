# R3F Game Candidates

Track: r3f_rendering_tier_20260708
Date: 2026-07-08

## Selection Criteria

R3F is a fit when the core fantasy depends on a camera, z-axis motion, tunnel/corridor depth, flight, vertical climbing, lighting, or readable 2.5D parallax. React-Konva remains the default for flat boards, top-down arenas, lane games, and sprite-heavy 2D action. Do not choose R3F only for novelty; the game mechanic must become clearer or more compelling because of real depth.

## New 3D / 2.5D Concepts

### 1. Crystal Cavern Rail Runner

A first-person mine-cart sentence game where words appear on crystals along branching rails. The player leans/steers between left, center, and right rails to collect the next word while avoiding cave hazards. R3F is a strong fit because speed, depth, and upcoming word readability depend on a perspective camera down the track. Sentence mechanic: build the sentence from a translation by choosing rails in order; wrong rail hits cost lives, missed words loop into later track branches. Rough size: L.

### 2. Sky Archive Spiral

A 2.5D flying-library game where pages and word tablets orbit a floating tower. The player circles the tower, changing altitude to intercept words in sentence order while wind currents reposition distractors. R3F is a fit because the spiral path, tower occlusion, and altitude changes need camera/depth semantics. Sentence mechanic: translation prompt plus unordered orbiting words; collect the next word without target highlighting. Rough size: M.

### 3. Dungeon Diorama Tactics

A fixed-camera 2.5D tactical room where vocabulary enemies advance across multiple depth rows toward a hero. The player aims spells by selecting meaning-matched enemies while cover props block sight lines. R3F is a fit when using KayKit dungeon props and orthographic/perspective depth to make rows and line-of-sight readable. Vocabulary mechanic: match term/translation under time pressure; wrong hits empower enemies. Rough size: M.

## Existing Rebuild Candidates

### 1. Griffin Rider's Escape — R3F Rebuild

Current game is framed as a Subway Surfers-style runner but is still effectively a flat lane scene. R3F would make the fantasy legible: a forward camera, approaching gates, aerial obstacles, and depth-scaled word gates. Sentence mechanic: choose the next word gate from the translation while dodging rocks and diving through rings; no target highlight. Rough size: L.

### 2. Storm the Castle Tower — R3F Rebuild

The Crazy Climber fantasy wants vertical scale, wall depth, ledges, and hazards moving in/out from the tower face. R3F would allow a fixed third-person camera looking up the tower, real ledge geometry, and readable parallax. Sentence mechanic: climb to word plaques in order using translation context; wrong plaques drop stamina, missed plaques reappear above. Rough size: M.

### 3. Gryphon Patrol — R3F Rebuild

The Defender-style patrol has a large-world fantasy and minimap, but the current 2D layout already shows scaling/fit problems at 390px. R3F could turn it into a side-on 2.5D canyon patrol with depth lanes, rescue targets, and flying enemies, while keeping the radar/minimap as DOM HUD. Sentence mechanic: intercept word carriers in order and escort rescued words back to base. Rough size: L.

## Seeded Follow-Up Track Recommendations

1. Griffin Rider's Escape R3F Rebuild — strongest existing concept-to-stack fit; fixes a runner fantasy that benefits directly from perspective depth.
2. Storm the Castle Tower R3F Rebuild — medium-sized proof that vertical 2.5D climbing works outside the tube-shooter pattern.
3. Crystal Cavern Rail Runner — new game concept that exercises forward-camera depth without requiring complex physics.
