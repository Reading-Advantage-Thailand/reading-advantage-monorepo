# APK Semantic Asset Ontology

Gameplay meaning is stable; Chibi Quest and Riven Lands are parallel treatments. No legacy filename, sprite grid, or cover composition is part of the semantic contract.

| Semantic ID                                         | Family      | Consumers | Priority | Coverage |
| --------------------------------------------------- | ----------- | --------: | -------- | -------- |
| `asset:character:player-avatar`                     | character   |        29 | must     | gap      |
| `asset:environment:gameplay-environment`            | environment |        29 | should   | gap      |
| `asset:target:learning-target`                      | target      |        29 | must     | gap      |
| `asset:vfx:gameplay-feedback`                       | vfx         |        29 | must     | gap      |
| `asset:ui:hud-and-prompt`                           | ui          |        29 | must     | gap      |
| `asset:audio:semantic-audio-cues`                   | audio       |        29 | should   | gap      |
| `asset:control:active-input-controls`               | control     |        29 | should   | gap      |
| `asset:creature:mount-or-companion`                 | creature    |        29 | should   | gap      |
| `asset:terrain:traversable-terrain`                 | terrain     |        29 | should   | gap      |
| `asset:structure:objective-or-station`              | structure   |        29 | should   | gap      |
| `asset:prop:interactive-prop`                       | prop        |        29 | should   | gap      |
| `asset:hazard:gameplay-hazard`                      | hazard      |        29 | should   | gap      |
| `asset:pickup:collectible-content`                  | pickup      |        29 | must     | gap      |
| `asset:weapon:player-action-tool`                   | weapon      |        29 | should   | gap      |
| `asset:projectile:gameplay-projectile`              | projectile  |        29 | should   | gap      |
| `asset:background:composable-background`            | background  |        29 | should   | gap      |
| `asset:indicator:offscreen-and-objective-indicator` | indicator   |        29 | should   | gap      |

## Substitution rule

Substitution requires equivalent states, interaction meaning, collision/readability, profile behavior, and theme-independent geometry. Strength, movement, attack, scale, target, hazard, mount, station, and objective roles must not be conflated.
