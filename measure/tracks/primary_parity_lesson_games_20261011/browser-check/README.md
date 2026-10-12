# Browser check for the lesson games (batch capture, orchestrator)

Run on the rehearsal copy with 2 or 3 demo students. Never write to the shared `primary_advantage`.
Use 375 px and 1280 px widths, day and night. Save PNG files outside the repository in
`~/Desktop/primary-parity-progress/captures/lesson_games/browser-check/`. Do not commit PNG files.

## Checks (spec table A1 to A5)

| Check | Page and role | Steps | Expected result |
|-------|---------------|-------|-----------------|
| A1 | STUDENT `/student/lesson/<article>`, task 10 | Open the lesson, go to task 10. Play one game, finish it, return. | Four cartridges with the last result and "Simple game". The game uses the lesson words. After the run: "You got x of y. +n XP" and a new row in the results. |
| A2 | STUDENT same lesson, task 12 | Go to task 12. | Sentence cartridges first, then the four activities. A lesson with 2 sentences: games locked with "Needs 3 sentences", activities open. |
| A3 | TEACHER `.../books/<classBook>/lessons/<n>/projector` | Press Play on one game of each list. | The panel runs the cartridge full screen with the lesson words and the answer hint. No XP, no new student row. A teacher of another class gets not found. |
| A4 | TEACHER `.../lessons/<n>/rehearsal`, task 10 and task 12 | Step to task 10, play a game to the end. Repeat on task 12. | The game ends and shows the result on screen. The network log has no request to `/api/v1/apk/complete`. The results table has no new row. |
| A5 | STUDENT task 10 with `?renderer=phaser` | Open task 10 with the query and play one game. | The 2D renderer runs the same game and the run saves like A1. Also run once on a browser with WebGL2 off if possible. |

Extra check (staff preview): sign in as a staff user, open `/student/lesson/<article>` in preview mode,
play a game on task 10. Expected: a "Preview: not saved" notice, no completion request, no new row.

## Data checks (read only, scratch copy)

Count rows before and after A4 and the staff preview. The counts must not change:

    SELECT count(*) FROM apk_game_results;           -- adjust to the real results table
    SELECT count(*) FROM user_lesson_progress;

## Final side-by-side check

Run the acceptance kit next to legacy task 10 (legacy paths use raw legacy ids; `{map:...}` in
`legacyPath` gives the NEW id). Send the captures to the owner. Both tasks stay open until the batch capture.
