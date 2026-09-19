> Superseded by the owner correction: show a Thai target and require an English answer.
> The previous English-prompt listening mode is unavailable in the hosts.
> This document records the previous implementation and does not define current acceptance.

# Wizard pilot verification

## Purpose

This review checks the shared arcade screens, selected assets, controls, obstacle map, and listening preview.
It does not approve deployment, game retirement, or the complete portfolio.
Authenticated listening still needs prepared recordings for the student's selected vocabulary.

## Start the preview

Use the existing development server when it runs on port 3100.
Otherwise, run this command from `apps/advantage-games`:

```bash
node ../../node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100
```

Open [the Wizard preview](http://127.0.0.1:3100/en/student/arcade/wizard-vs-zombie).
The page identifies its sample content and states that it does not save progress.

## Shared screens and controls

1. Select **Read English**.
2. Select **Practice** from the briefing.
3. Confirm that practice identifies its purpose and excludes saved rewards.
4. Select **Restart game** to return to the briefing.
5. Select **Play now**.
6. Move with the arrow keys or WASD.
7. Move through touch input on a phone.
8. Select **Pause game**.
9. Confirm that the game stops advancing.
10. Resize the paused game between narrow and wide layouts.
11. Confirm that the map and Thai choices remain visible.
12. Select **Resume game**.
13. Confirm that the same question and score remain.

## Map and language decisions

1. Identify the Thai translation of the English prompt.
2. Move toward its glowing pickup.
3. Route around a grave when it blocks movement.
4. Confirm that the answer changes after contact.
5. Remain at that position briefly.
6. Confirm that standing still does not answer the next question.
7. Use the earned shockwave with Space or the visible button.
8. Confirm that the charge decreases and nearby enemies move away.
9. Complete the run or allow the enemies to defeat the wizard.
10. Compare the displayed accuracy with the answers that you attempted.
11. Select **Play again**.
12. Confirm that the briefing returns with fresh progress.

## Listening preview

1. Select **Listen to English**.
2. Select **Play now**.
3. Listen to the spoken English prompt.
4. Confirm that the game hides the English word.
5. Select **Replay audio** when playback finishes.
6. Confirm that the same word plays again.
7. Select **Show transcript** when help is necessary.
8. Confirm that the game reveals the English word as assistance.
9. Pause during an audio prompt.
10. Resume the game.
11. Use **Retry audio** if the interruption prevented completion.
12. Confirm that the game requires an explicit action before reading fallback.

## Feedback to record

Record the device, viewport, input method, and selected learning mode.
Identify any unreadable label, missed control, blocked route, or unclear sound.
Describe whether obstacles helped survival and whether another run felt worthwhile.
Record pronunciation corrections separately from gameplay feedback.
Customer sessions must establish engagement and learning outcomes; automated tests cannot establish either result.

## Phase verification

The existing Measure workflow requires explicit owner feedback before a phase checkpoint.
See `measure/workflow.md`, steps 5 and 6.
The owner has not yet recorded phase verification for this track.
