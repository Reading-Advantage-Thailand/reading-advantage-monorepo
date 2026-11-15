# AGENTS

## Measure Workflow

The root `AGENTS.md` section "Measure Workflow" applies to this app. Follow it.



## Skills

This project uses two primary skills for all development:

- **measure** — Spec-driven development framework. All work is organized into tracks with specifications and phased implementation plans.
- **apk-game-builder** — Build or rebuild language-learning cartridges on the Phaser 4 Advantage Play Kit with strict TDD and QC workflow.

The legacy `vocab-game-builder` skill documents the pre-APK React-Konva/R3F codebase and may be consulted only while extracting a mechanic blueprint from an unmigrated game. It must not scaffold new gameplay code.

## Game Development

All new and rebuilt vocabulary/sentence games follow the `apk-game-builder` skill patterns:
- Phaser 4 gameplay through `@reading-advantage/advantage-play-kit`
- Stable vocabulary-array, sentence-array, and `GameResults` contracts from `@reading-advantage/game-contracts`
- One cartridge source with Primary Chibi and Secondary Epic editions
- `apps/advantage-games` `/qc` surface for development and product-owner verification
- Mobile-first, portrait orientation (390×844 reference)
- Strict TDD workflow with >80% coverage
- Track-based development via measure

Existing games are mechanic references, not compatibility targets. Preserve the recognizable learning loop; rebuild implementation and presentation natively in Phaser.
