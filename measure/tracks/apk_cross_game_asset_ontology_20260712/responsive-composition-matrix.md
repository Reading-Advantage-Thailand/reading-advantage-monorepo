# Responsive Composition Matrix

All 29 games declare compact and wide composition under the repository responsive specification. Uniform scaling alone is prohibited.

| Game                         | Compact              | Wide                  | Current risk                                                                                                                 |
| ---------------------------- | -------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `game:castle-defense`        | follow, stage, panel | reveal, follow, panel | Legacy fixed coordinates, canvas scaling, HUD overlays, and renderer-specific camera assumptions require rebuild validation. |
| `game:dragon-rider`          | follow, stage, panel | reveal, follow, panel | No current playable implementation; geometry is provisional and must be proven by Red tests.                                 |
| `game:magic-defense`         | reflow, panel        | reflow, panel         | Legacy fixed coordinates, canvas scaling, HUD overlays, and renderer-specific camera assumptions require rebuild validation. |
| `game:rpg-battle`            | follow, stage, panel | reveal, follow, panel | Legacy fixed coordinates, canvas scaling, HUD overlays, and renderer-specific camera assumptions require rebuild validation. |
| `game:dragon-flight`         | follow, stage, panel | reveal, follow, panel | Legacy fixed coordinates, canvas scaling, HUD overlays, and renderer-specific camera assumptions require rebuild validation. |
| `game:wizard-vs-zombie`      | follow, stage, panel | reveal, follow, panel | Legacy fixed coordinates, canvas scaling, HUD overlays, and renderer-specific camera assumptions require rebuild validation. |
| `game:enchanted-library`     | reflow, panel        | reflow, panel         | Legacy fixed coordinates, canvas scaling, HUD overlays, and renderer-specific camera assumptions require rebuild validation. |
| `game:rune-match`            | reflow, panel        | reflow, panel         | Legacy fixed coordinates, canvas scaling, HUD overlays, and renderer-specific camera assumptions require rebuild validation. |
| `game:alchemists-synthesis`  | reflow, panel        | reflow, panel         | Legacy fixed coordinates, canvas scaling, HUD overlays, and renderer-specific camera assumptions require rebuild validation. |
| `game:potion-rush`           | reflow, panel        | reflow, panel         | Legacy fixed coordinates, canvas scaling, HUD overlays, and renderer-specific camera assumptions require rebuild validation. |
| `game:dungeon-liberator`     | follow, stage, panel | reveal, follow, panel | Legacy fixed coordinates, canvas scaling, HUD overlays, and renderer-specific camera assumptions require rebuild validation. |
| `game:spellweavers-run`      | reflow, panel        | reflow, panel         | No current playable implementation; geometry is provisional and must be proven by Red tests.                                 |
| `game:shadow-gate-dungeon`   | follow, stage, panel | reveal, follow, panel | Legacy fixed coordinates, canvas scaling, HUD overlays, and renderer-specific camera assumptions require rebuild validation. |
| `game:rune-forge-chamber`    | reflow, panel        | reflow, panel         | Legacy fixed coordinates, canvas scaling, HUD overlays, and renderer-specific camera assumptions require rebuild validation. |
| `game:village-guardian`      | follow, stage, panel | reveal, follow, panel | Legacy fixed coordinates, canvas scaling, HUD overlays, and renderer-specific camera assumptions require rebuild validation. |
| `game:labyrinth-goblin-king` | follow, stage, panel | reveal, follow, panel | Legacy fixed coordinates, canvas scaling, HUD overlays, and renderer-specific camera assumptions require rebuild validation. |
| `game:archers-revenge`       | reflow, panel        | reflow, panel         | No current playable implementation; geometry is provisional and must be proven by Red tests.                                 |
| `game:storm-castle-tower`    | follow, stage, panel | reveal, follow, panel | No current playable implementation; geometry is provisional and must be proven by Red tests.                                 |
| `game:griffin-sky-joust`     | reflow, panel        | reflow, panel         | No current playable implementation; geometry is provisional and must be proven by Red tests.                                 |
| `game:realm-carver`          | follow, stage, panel | reveal, follow, panel | No current playable implementation; geometry is provisional and must be proven by Red tests.                                 |
| `game:paladins-twin-soul`    | reflow, panel        | reflow, panel         | No current playable implementation; geometry is provisional and must be proven by Red tests.                                 |
| `game:griffin-riders-escape` | follow, stage, panel | reveal, follow, panel | No current playable implementation; geometry is provisional and must be proven by Red tests.                                 |
| `game:astral-mage`           | follow, stage, panel | reveal, follow, panel | No current playable implementation; geometry is provisional and must be proven by Red tests.                                 |
| `game:devourer-slime`        | follow, stage, panel | reveal, follow, panel | Legacy fixed coordinates, canvas scaling, HUD overlays, and renderer-specific camera assumptions require rebuild validation. |
| `game:sorcerer-ziggurat`     | reflow, panel        | reflow, panel         | No current playable implementation; geometry is provisional and must be proven by Red tests.                                 |
| `game:haunted-library`       | reflow, panel        | reflow, panel         | Legacy fixed coordinates, canvas scaling, HUD overlays, and renderer-specific camera assumptions require rebuild validation. |
| `game:gryphon-patrol`        | follow, stage, panel | reveal, follow, panel | No current playable implementation; geometry is provisional and must be proven by Red tests.                                 |
| `game:abyssal-well`          | follow, stage, panel | reveal, follow, panel | No current playable implementation; geometry is provisional and must be proven by Red tests.                                 |
| `game:babel-architect`       | reflow, panel        | reflow, panel         | No current playable implementation; geometry is provisional and must be proven by Red tests.                                 |

## Shared primitives required

Profile resolver with hysteresis; safe-area/reserved-region planner; gameplay coordinate transforms; camera bounds/follow/dead-zone helpers; semantic HUD/prompt/feedback regions; touch-control reservation; locale-aware Thai/English text measurement; atomic profile transitions; overlap diagnostics; deterministic geometry fixtures and fuzzing.
