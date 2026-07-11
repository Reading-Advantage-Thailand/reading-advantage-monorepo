# Specification: APK Runner Traversal Wave W3

## Overview

Rebuild four legacy runner/traversal concepts as shared Phaser 4 Advantage Play Kit cartridges:

- `dragon-rider` — vocabulary aerial traversal and target/gate selection.
- `spellweavers-run` — sentence-order continuous runner.
- `griffin-riders-escape` — sentence lane/gate runner.
- `storm-castle-tower` — sentence vertical traversal through ordered targets.

The legacy implementations are mechanic and content evidence only. W3 preserves each recognizable learning loop while replacing renderer, route, state, controls, timing, physics, and presentation with Phaser-native cartridge implementations. Vocabulary/sentence arrays and the five-field `GameResults` output remain unchanged.

## Stories

### Story S1: Freeze the runner wave contracts
**As a** game-platform developer
**I want** live baselines and strict blueprints for all four games
**So that** the rebuild preserves educational identity without inheriting legacy architecture.

**Acceptance Criteria:**
- Given each legacy game, When its baseline is recorded, Then the essential mechanic, input mode, controls, win/loss loop, known defects, and reusable APK systems are explicit.
- Given the four public IDs, When contracts are validated, Then each has one input mode, deterministic content fixtures, semantic edition slots, and a strict result mapping.
- Given W2 production hosting, When the wave plan is reviewed, Then every cartridge targets the generic authenticated route and no per-game production host page is introduced.

**Estimate:** M
**Priority:** Must

### Story S2: Extend reusable traversal systems
**As a** cartridge developer
**I want** reusable lane, gate, scrolling, ordered-target, and vertical traversal systems
**So that** four games share proven infrastructure without becoming identical reskins.

**Acceptance Criteria:**
- Given seeded content and randomness, When traversal systems advance, Then target order, collision outcomes, scoring, and completion are deterministic in tests.
- Given keyboard, pointer, and touch input, When a cartridge declares controls, Then the APK input layer supports equivalent play without browser gesture conflicts.
- Given restart, edition switch, and navigation, When hosts remount cartridges, Then exactly one canvas and one active input/timer lifecycle remain.

**Estimate:** L
**Priority:** Must

### Story S3: Build four dual-edition cartridges
**As a** student
**I want** four distinct runner and traversal games
**So that** vocabulary and sentence practice offers varied movement and decision mechanics.

**Acceptance Criteria:**
- Given each public ID, When its cartridge loads, Then it accepts the declared stable input array, uses Phaser-native gameplay, emits one valid `GameResults`, and supports Primary Chibi and Secondary Epic editions.
- Given each game's legacy concept, When rebuilt, Then its recognizable fantasy and learning action remain distinct from the other three cartridges.
- Given 390x844 and desktop viewports, When keyboard and touch runs complete, Then prompts, targets, controls, and results remain readable without horizontal overflow.

**Estimate:** XL
**Priority:** Must

### Story S4: Cut over and verify the runner wave
**As a** product owner
**I want** exact host and deletion evidence for the four rebuilt games
**So that** production cutover is safe and legacy code is removed only when caller-free.

**Acceptance Criteria:**
- Given the shared catalog, When W3 is accepted, Then all four IDs load through the W2 generic route and persist server-owned completions.
- Given a candidate legacy path, When deletion is proposed, Then graph/text callers, route ownership, browser proof, and an exact disposition manifest justify it.
- Given final acceptance, When gates run, Then focused coverage exceeds 80%, affected lint/type/test/build pass, browser evidence covers both editions and input classes, and mandatory review has no Critical/High findings.

**Estimate:** XL
**Priority:** Must

## Out of Scope

- Arena, defense, collector-adventure, or puzzle-workstation cohorts.
- New educational ABI fields or client-authoritative XP.
- Per-game production host pages, copied cartridge source, multiplayer, leaderboards, or final bespoke art.
- Deleting any path that still has a route, import, test, bookmark risk, or consumer outside this wave.
