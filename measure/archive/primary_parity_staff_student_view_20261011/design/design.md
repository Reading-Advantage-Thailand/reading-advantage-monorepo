# Design: Preview mode (banner and preview states)

Track: `primary_parity_staff_student_view_20261011`. Phase 0. The mock source is `mock-source.tsx.txt`.
It uses the real RPG components and the real CSS. The `.txt` suffix keeps it out of tsc and eslint.
The app code does not change in this phase.

## Banner (every student page for staff)

- Place: under the sticky header, above the page scene, inside the page container. The banner box has `relative z-10` so it stays over the scene backdrop.
- Parts, left to right: the `Banner` (blue, `!text-base`, text "Student preview"), and the iron small `RpgLink` "Exit preview" (48 px high). Under them: one line of note text on the scene (`cq-on-scene`).
- No leather bar. A bar was tried first: it vanished on the dark scenes and the banner overlapped its text at 375 px.
- Role: `role="status"`, `data-preview-banner`. The link goes to the role home (`roleDefaultRedirects`).
- Not the Reedy label: the Reedy label is a small brown uppercase plank beside the page title. The banner is a blue cloth that hangs from the top edge, with full words. The `banner-*` captures show both.

## Preview states (staff on a page that needs a student record)

All use one parchment `Panel pinned` (`role="status"`) with an icon, a title, and one line. See the captures.

| Page | Scene | Content |
| --- | --- | --- |
| Home | guild hall | Heading "Hello, Student", no-hero portrait, plaques streak 0 days, XP 0, level 1, the "Pick a hero" notice, four notices, the hall of fame |
| Avatar picker | shrine | Six hero buttons, try-on works, "Save hero" off, the note |
| Shop | armory | Piece cards with prices, "Try on" works, "Buy" off, the note, coins 0 |
| History, reports, sentences, vocabulary | archive, observatory, library | Title, sub line, one empty notice with "A student sees ... here" |
| Class Quest | boss arena | "Not in a class" notice |
| Reedy | clearing | The page title with the real Reedy plank, then "Only students talk to Reedy" |
| Game end | arena | Score, sample words line, the note, "Play again" and "Back to games" |
| Quiz end | library | Score, the line "A student earns XP for this quiz.", the note |

## Checks from the harness

48 files (12 states, 375 and 1280 px, day and night). No button under 48 px high and no
horizontal scroll in any file. The harness uses the text stand-in header, not the real nav.
