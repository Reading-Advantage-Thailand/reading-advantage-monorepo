# Wizard vs. Zombie Pilot Browser Acceptance

## Result

The public pilot produced a verified victory through visible browser controls.

The successful run used a separate Chrome tab with ID `1042537289`. The root browser tab stayed untouched.

The victory screen showed these results:

- Score: 375
- Accuracy: 44%
- Correct: 4/9
- XP preview: 84
- Result: Victory

The run accepted bridge, forest, lantern, and river in that order. The wizard had 100 health before the final river contact.

The valid victory occurred on the second deliberate attempt. The browser used the four-answer sample deck in Read English mode.

## Verification method

The test opened `http://127.0.0.1:3100/en/student/arcade/wizard-vs-zombie` after an HTTP 200 server check.

The test used Play now, Pause game, Resume game, Restart game, and canvas taps. It did not inject controller state.

The test paused the game before each screenshot and inspection. It inspected all labels again after each accepted or wrong answer.

The prior victory remains verified evidence. The separate test tab was no longer present when this report was written after an interrupted turn.

## Wide keyboard check — 2026-09-09

The final public build accepted both WASD and Arrow key movement in a wide viewport.
The host focused the labeled game section before play.
The canvas top stayed at `y=19` during keyboard movement, so the keys did not scroll the page.

The test held `d` and then used `ArrowRight`.
Both inputs moved the wizard to the right.
The test then held right movement and selected Pause game.
It released the key while the game was paused.
After Resume game, the wizard stayed at the same position until a new movement key press.
New `d` and `w` inputs moved the wizard again.

The test earned one charge through normal keyboard play.
It collected the bridge crystal for `สะพาน`, and the target advanced to `ป่า`.
The charge count changed from zero to one.
One `Space` press changed the charge count from one to zero.
This proves that the earned shockwave action consumed its charge.
The captured frames do not prove the visual pulse animation.

The keyboard session ended in defeat with a score of 100, 33% accuracy, one correct answer from three attempts, and an XP preview of 23.
It did not repeat the earlier complete victory path.

The new pixel frame and sliced buttons were visible in the wide briefing and results screens.
Their text and focus state remained legible in the recorded frames.

## Tap behavior and routes

Each canvas tap moved the wizard one bounded step toward the selected point. The game does not provide automatic pathfinding for touch input.

Short waypoint taps gave reliable movement control. Usable routes reached all four required crystals.

The grave sprites showed their solid areas clearly enough for route planning. The test routed around graves and completed the deck.

## Wrong-contact finding

Crystal contact areas were less clear than the grave solids. A direct route across a crystal row caused unintended wrong answers.

Each wrong contact recorded an attempt and reshuffled all translations. The player must inspect every label again after that contact.

The successful run recorded four correct answers across nine attempts. Five wrong contacts reduced accuracy to 44% but did not prevent victory.

This finding concerns collision readability during tap-to-step movement. It does not show a missing pathfinding feature.

## Test scope and limits

The earlier browser run verified one wide public sample victory in Read English mode.
The final build check verified wide keyboard movement, pause input clearing, earned Space use, and the current Read Thai direction.

The run did not validate these areas:

- A physical phone or tablet
- A compact or portrait victory run
- A complete Listen to English victory run
- Reading fallback and audio failure actions
- Session restore during the victory path
- Production student data and saved progress
- Repeated performance under a large zombie horde
- The visible shockwave pulse timing

These limits do not invalidate the observed pilot victory. They limit the result to the tested public sample configuration.

## Remaining customer validation

Customer testing must measure unintended crystal contacts on common phone sizes. The test should include students who have not seen the map.

Customer testing must check whether players understand that each tap makes one step. It must also check whether players notice label reshuffles.

Customer testing must include portrait layouts and touch hardware. It should compare wide and compact collision readability.

Customer testing must include Listen to English mode. It must cover replay, transcript assistance, audio failure, and Reading mode.

This evidence verifies the Wizard pilot run only. It does not complete the full arcade portfolio acceptance goal.
