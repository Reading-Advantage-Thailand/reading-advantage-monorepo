# Persistent reward UI handoff

## Scope

Show confirmed cosmetic progress in the catalog, common briefing, and common results.
Keep progression panels outside the live gameplay board.
Preserve the five-field GameResults contract and server-calculated XP.
The first reward set uses Wizard completion facts. It makes no language mastery claim.

## Selected image candidates

The primary agent inspected each original 32-pixel image.
The images have distinct silhouettes and use the existing Item Icons pack.

| Cosmetic | Image under `packages/advantage-play-kit/assets/standard/ui/32x32/item-icons-32x32/staff-icons-32x32-pixelart/` |
| --- | --- |
| Apprentice Wand | `staff-normal/staff-normal-1-source-6e425f4bec7c.png` |
| Graveyard Staff | `staff-blue/staff-blue-54-source-43e1b6167c5d.png` |
| Echo Staff | `staff-purple/staff-purple-78-source-61b1db6b6b43.png` |

Use a consistent dark frame and pixel rendering. Inspect each image at 32 and 64 pixels in the actual panel.
The license permits commercial game use and requires ElvGames credit.
Keep that credit with the common asset credits.
Use the existing asset delivery and binding system. Add only the three required images.
These selections replace provisional map props. They do not establish owner acceptance of the finished panel.

## Data and behavior

The authenticated RPG GET route supplies unlock and equipped state.
The PATCH route accepts only the selected cosmetic identifier.
The domain command checks ownership before it equips the cosmetic.

Show each locked reward with its exact quest requirement.
Show the equipped reward with a visible selected state.
Use native buttons with a minimum 48-pixel target.
Show request failures with a retry action. Preserve the last confirmed state during a failed request.

After a successful completion save, refresh RPG state before announcing a new reward.
Compare the refreshed unlocks with the state from before the session.
Display only newly confirmed unlocks in the result notice.
A failed or timed-out completion response must not create a client reward grant.
Replay must not repeat an old reward notice.
Public previews must identify rewards as previews and must not claim persistent ownership.

## Verification

1. Play Wizard with an authenticated local student who has no rewards.
2. Make one deliberate answer attempt.
3. Finish the session through normal gameplay.
4. Verify the saved completion and one eligible reward in the database.
5. Verify the result notice matches that saved reward.
6. Equip the reward through the catalog.
7. Reload the page.
8. Verify that the same reward remains equipped.
9. Retry a completion with the same activity identifier.
10. Verify that the reward count and XP do not increase.
11. Verify that another student cannot read or equip the first student's reward.
12. Inspect the panel at 390 by 844 and 1280 by 900 pixels.

Inspect actual text contrast, icon clarity, selected states, focus, and touch targets.
Unit tests alone do not establish an accepted reward experience.
