# Escort game consolidation recommendation

## Decision for owner review

Use **Dungeon Liberator** as the public escort title.

This recommendation uses current implementation quality and portfolio overlap. It does not use customer preference evidence.

Keep the **Village Guardian** route as an unlisted compatibility route during migration. Do not retire either title in this step.

## Shared learning loop

Both games use sentence input. Each game shows the Thai translation and assigns English words to moving rescue targets.

The player moves in four directions. The player collects words into an ordered chain and escorts the complete chain to an exit.

Monsters can release chain members. Monster contact does not count as a language attempt.

These shared rules support one internal escort engine.

## Mechanical differences

| Rule | Dungeon Liberator | Village Guardian | Consolidation treatment |
|---|---|---|---|
| Public identity | `dungeon-liberator` | `village-guardian` | Advertise Dungeon Liberator. Keep both IDs for compatibility. |
| Sentence structure | Each sentence ends at a portal. | Each sentence is a numbered level. | Use one stage model with configurable labels. |
| Time limit | No sentence timer. | Each level starts with 25 seconds. | Disable the timer for new Dungeon sessions. Preserve it for Village compatibility sessions. |
| Wrong answer | The wrong prisoner flees and the chain resets. | The wrong villager hides, removes time, and resets the trail. | Configure hiding and time penalties per adapter. |
| Player hazard | A monster releases the chain before it removes a life. | A monster releases the chain before it removes a life. | Share the hazard rule. |
| Chain hazard | A collision can release a suffix of the chain. | A collision can release a suffix of the trail. | Share stable segment recovery. |
| Exit | A portal advances the sentence. | A sanctuary advances the level. | Use one exit contract with title-specific presentation. |
| Score protection | Stable sentence-word reward IDs prevent repeated score and XP. | Repeated rescues currently grant score and XP again. | Apply stable reward positions to both adapters. |
| Duplicate words | Any active prisoner with the expected English word is correct. | Correctness currently depends on a hidden order ID. | Use visible English word equality in the engine. |
| Target cue | Labels do not identify one correct duplicate. | An orange target cue reveals one answer. | Remove answer-revealing cues. |
| Failure | Lives can end the session. | Lives or the timer can end the session. | Keep both terminal causes in the compatibility configuration. |

## Identity and route preservation

Keep `dungeon-liberator` as the ID for all new public launches. Keep its title, manifest, route, result records, and earned rewards.

Keep `village-guardian` as the ID for its old route and historical records. Do not rewrite old results to `dungeon-liberator`.

Keep Village Guardian scores in their current competition scope. The timer makes these scores different from Dungeon Liberator scores.

Do not merge leaderboards or reward history. A shared engine does not make past results comparable.

Keep both existing required asset binding names in their adapters. The engine must consume semantic actor and world roles.

Preserve current entity IDs in each adapter. Dungeon uses `prisoner:` and `trail:` identities. Village uses `villager-` and `trail-` identities.

Restore must validate the adapter ID format. A snapshot from one title must not restore into the other title.

## Common engine migration

1. Define a private escort engine contract inside the cartridge package.
2. Include movement, visible-word matching, chain spacing, hazards, exits, completion, and stable reward positions.
3. Add configuration for a timer, a wrong-answer penalty, hiding, lives, and stage transitions.
4. Add identity functions for targets, chain segments, hazards, and reward positions.
5. Move Dungeon Liberator rules behind a Dungeon adapter without changing its public contract.
6. Run Dungeon controller, restore, scene, tutorial, and result tests against the adapter.
7. Move Village Guardian rules behind a Village compatibility adapter.
8. Preserve the Village timer, level count, hide duration, time penalty, and terminal causes.
9. Correct Village duplicate fairness and reward replay during its engine migration.
10. Keep both routes active while the owner reviews the public catalog change.
11. Remove Village Guardian from new catalog selection only after route and history checks pass.
12. Review unused implementation code and assets in a separate retirement task.

## Required tests

- A shared rule test must accept any reachable target with the expected visible English word.
- A shared rule test must reject a different visible English word.
- A chain test must preserve the selected target ID through capture and restore.
- A hazard test must release the correct chain suffix without adding a language attempt.
- A reward test must prevent score and XP growth after release and rescue.
- A Dungeon adapter test must preserve portal progression without a timer.
- A Village adapter test must preserve level timing, hiding, and the wrong-answer time penalty.
- A terminal test must deliver one five-field result for each outcome.
- A restore test must reject cross-title snapshots and malformed entity IDs.
- A route test must keep both old URLs valid while only Dungeon appears in new selection.
- A history test must keep each title ID and competition scope unchanged.
- A scene test must show a bare Thai target and complete English labels at compact size.

## Reversal

Keep the public catalog change separate from the engine migration. This separation permits a small reversal.

Restore Village Guardian to catalog selection if the owner rejects the public title choice. Keep both adapters on the shared engine.

If the engine migration fails, restore each cartridge adapter to its prior controller. Keep all public IDs, routes, and result data unchanged.

Do not delete a compatibility adapter until route usage and historical result access pass review.
