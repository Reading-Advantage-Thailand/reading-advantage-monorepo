# AGENTS

## Measure Workflow

All development runs through the **Measure** spec-driven development framework exclusively. At the start of every session:

1. Load the `measure` skill
2. Read `measure/index.md` to understand the project context
3. Follow the workflow defined in `measure/workflow.md`

Key reference files:
- `measure/tracks.md` — Active work registry
- `measure/tracks/<track_id>/plan.md` — Task checklist
- `measure/product.md` — Product vision
- `measure/tech-stack.md` — Technology choices
- `measure/lessons-learned.md` — Project memory
- `measure/tech-debt.md` — Known shortcuts

Never start significant work without an active track. Always update `measure/tracks.md` and the current track's `plan.md` before and after work.



## Skills

This project uses two primary skills for all development:

- **measure** — Spec-driven development framework. All work is organized into tracks with specifications and phased implementation plans.
- **vocab-game-builder** — Build vocabulary learning games using React-Konva canvas architecture with strict TDD workflow.

## Game Development

All vocabulary/sentence games follow the `vocab-game-builder` skill patterns:
- React-Konva canvas architecture
- Mobile-first, portrait orientation (390×844 reference)
- Strict TDD workflow with >80% coverage
- Track-based development via measure

Reference existing games for patterns: Dragon Flight, Wizard vs Zombie, Rune Match, Potion Rush, Dungeon Liberator.
