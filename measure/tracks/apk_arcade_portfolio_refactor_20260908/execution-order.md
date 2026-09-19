# Reconciled execution order

## Handoff status

The owner requested a detailed plan and a Sol medium subagent handoff.
Three bounded agents prepared source-backed execution packets.
Their work establishes readiness; it does not implement the refactor.
The primary agent integrates their corrections into the specification and plan.

## First implementation batches

| Order | Batch | Scope | Dependencies and ownership |
|---|---|---|---|
| 1 | Contract protection | Preserve educational ABI; define host receipts, session configuration, and strict learning evidence. | Own game-contract files and coordinated domain schema changes. |
| 1 | Asset comparison | Compare actual new pack candidates for the Wizard map and shared shell. | Can proceed beside contract work; avoid runtime changes until selections stabilize. |
| 2 | APK lifecycle | Implement Play, Practice, persistence states, bounded save timeout, retry, replay, and explicit outcomes. | Follow `handoff-apk.md` APK-1. Own shared presentation and React host files. |
| 3 | Shared controls | Add semantic ability, interaction, audio replay, focus safety, and continuous movement. | Follow APK-2 after lifecycle interfaces stabilize. Own runtime input and action files. |
| 3 | Content and speech preparation | Report actual locales and prepare consistent prompt audio through a minimal internal port. | Follow listening L2 and L4. Can run beside controls without editing runtime files. |
| 4 | APK audio | Implement speech readiness, replay, cancellation, bounded preload, and channel ducking. | Follow listening L3 after controls. Own runtime and React host changes for this batch. |
| 5 | Host integration | Return validated receipts and persist validated listening evidence across the three hosts. | Combine APK-3 and listening L5 under one owner. |
| 5 | Wizard map | Implement navigation, valid spawns, reachable pickups, and obstacle-safe shockwaves. | Use the portfolio packet and accepted assets. One owner controls Wizard source and tests. |
| 6 | Wizard listening and arcade art | Integrate actual speech, selected assets, shared controls, common screens, and replay. | Follow listening L6/L7 and APK-4. Serialize overlapping presentation and Wizard changes. |
| 7 | Complete pilot review | Verify devices, learning behavior, map decisions, arcade presentation, and customer response. | Start broader portfolio batches after this foundation passes review. |

## Concurrency rules

One agent owns a production file during each implementation batch.
The lifecycle and audio batches both modify `apk-game-host.tsx`; run them sequentially.
The controls and audio batches both modify runtime types and runtime lifecycle; run them sequentially.
Host receipt and listening integration share three app adapters; assign them to one agent.
Wizard map and listening integration share the cartridge module; serialize them.
Assign public export changes to the current owning batch instead of parallel agents.
Keep asset inspection parallel until materialization or binding changes overlap production ownership.

## Required first tests

Preserve old input and result callers without optional audio configuration.
Reject extra fields in strict educational arrays and `GameResults`.
Reject invalid listening evidence and unreported locale fallback.
Keep one reward identity across save retries.
Reject stale save receipts after a replacement session starts.
Release held controls after focus loss and ignore text-entry targets.
Cancel obsolete speech when a target changes or a session ends.
Navigate every actual zombie spawn approach around obstacles.
Keep shockwave knockback outside solids and within valid world bounds.
Keep required pickups reachable on the selected map.

## Scope controls

Implementation starts with bounded batches, not one unrestricted rewrite assignment.
Every retained game remains part of the full program after pilot validation.
Customer feedback resolves portfolio identities and tuning decisions.
Do not require the owner to select internal file names, every timer value, or routine implementation details.
Production cutover and irreversible retirements follow the concrete review steps in the main plan.
