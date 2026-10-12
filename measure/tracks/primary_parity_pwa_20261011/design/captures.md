# Captures: Phase 0 design

Folder: `/home/daniebo/Desktop/primary-parity-progress/captures/pwa/phase0-design/` (not in the repository).
File names: `<state>-<375|1280>-<day|night>.png`. States:

- `home-ios`: student home with the iOS install steps.
- `home-chrome`: student home with the Install button.
- `offline-page`: `/offline.html` (Story S4).
- `offline-sign`: the offline sign over a page (Story S4).
- `icons`: the brand icons, circle and squircle masks, and the colour stand-ins.

Example: `/home/daniebo/Desktop/primary-parity-progress/captures/pwa/phase0-design/home-ios-375-day.png`.
Method: esbuild harness (`harness-build.mjs.txt`, `harness-shoot.mjs.txt` of the staff student view
track), headless `/usr/bin/google-chrome`, `img.decode()` before each shot. All buttons are 48 px
or more (0 small buttons) and no page scrolls sideways.
