# Plan review: primary_parity_lesson_games_20261011

## Phase D (design)

Phase review: the diff holds only track documents (no code, no locale key, no test). No Critical or High finding.

Medium and Low findings:
- Low: the `scroll` icon of the skin kit is wide, so it is small in the activity tiles of the mocks. Phase S3 can use a square icon.
- Low: the chips in the dark panel of the projector have low contrast at night. Phase S4 must use light chips there.
- Low: the cartridge pictures in the mocks are boss and NPC stand-ins. Request for Forge: one object render for each of the six cartridges (the arena objects).
- Low: the full-screen canvas in the mocks is a stand-in. Phase S5 checks the real 3D and 2D canvas in the browser run.

Deviations: the class book catalogue is empty on the rehearsal copy, so the lesson counts come from the Workbooks package files (read only).

Lessons: a `$VAR` in a heredoc without a value gives a wrong path with no error (the first capture run had no images). Check the first capture before the full run.

Shortcuts: none. No cartridge was loaded in a browser; the check is static (manifest minimums).
