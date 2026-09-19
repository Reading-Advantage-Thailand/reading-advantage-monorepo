# Specification: APK Legacy Catalog Completion

## Objective

Refactor the 20 remaining Advantage Games catalog titles into Phaser 4 APK
cartridges without changing their recognizable learning loops.

## Scope

The exact titles are Castle Defense, Magic Defense, RPG Battle, Wizard vs
Zombie, Enchanted Library, Rune Match, Alchemist's Synthesis, Potion Rush,
Dungeon Liberator, Rune Forge Chamber, Village Guardian, The Abyssal Well,
Archer's Revenge, Storm the Castle Tower, Griffin Sky-Joust, Realm Carver,
Paladin's Twin-Soul, Devourer Slime, The Haunted Library, and Gryphon Patrol.

The owner's 2026-08-18 instruction authorizes implementation for all 20 titles.
It supersedes prior product deferrals for titles that remain public and playable
in the current Advantage Games catalog.

## Requirements

- Use `@reading-advantage/game-cartridges` and the accepted APK runtime.
- Preserve each title's input mode, learning order, success rule, and failure rule.
- Use the standard briefing, tutorial, gameplay, debrief, attribution, and replay lifecycle.
- Support keyboard and pointer or touch input through semantic APK actions.
- Emit one validated `GameResults` value during normal play.
- Emit no production result during tutorial or demonstration sessions.
- Clean timers, listeners, and Phaser objects during replay and unmount.
- Keep public fixtures separate from authenticated student-owned content.
- Keep completion and XP server-authoritative in authenticated hosts.
- Preserve old route implementations until replacement verification passes.

## Orchestration Rules

- Use `coder-openai-gpt-5.6-luna` subagents for bounded research, Red, Green, and review assignments.
- Give each implementation agent ownership of one cartridge source and its test file.
- Keep shared catalog, package, app-route, and browser integration changes centralized.
- Run review agents without production edit permission.
- Route review findings to a new bounded Green assignment.
- Do not create worktrees or modify unrelated dirty files.

## Acceptance Criteria

- The cartridge catalog exposes 28 unique cartridges and matching lazy loaders.
- Every current game card links to `/student/games/apk/<cartridgeId>`.
- Each new cartridge passes focused mechanic, learning, result, cleanup, and lifecycle tests.
- Every new cartridge completes through real browser input at compact and wide sizes.
- Replay retains one canvas and produces no duplicate completion.
- Package tests, coverage, lint, type check, and build pass.
- Advantage Games tests, lint, type check, and production build pass.
- Independent reviews have no unresolved Critical or High findings.
- The code graph and Measure evidence match the final catalog.

## Out Of Scope

- New game mechanics, art production, or catalog titles.
- Reading or Primary production cutover.
- Deleting legacy source files before complete replacement verification.
- Repository-wide remediation outside the affected APK packages and app integration.
