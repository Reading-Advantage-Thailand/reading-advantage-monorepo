# W3 Browser Verification

## Acceptance environment

- Date: 2026-07-11, Asia/Bangkok.
- App: isolated Advantage Games Next.js server on `http://localhost:3100`.
- Database: the already-seeded `codecamp_advantage` database (95 public tables and the existing Codecamp seed rows).
- Authentication: one temporary school/student credential fixture was added only for the acceptance run because the seeded Codecamp accounts are `ADMIN` and `INTERN`, while the arcade correctly requires `STUDENT`. The user, account, sessions, completions, and temporary school were deleted after verification; post-cleanup counts for both temporary IDs were zero.
- Real-browser bridge: Kimi WebBridge daemon `v1.11.1`, extension connected (`1.11.0`). The named session was closed after the run.

## Kimi real-browser checks

Kimi navigated the authenticated production routes for all four public IDs:

- `/en/student/arcade/dragon-rider`
- `/en/student/arcade/spellweavers-run`
- `/en/student/arcade/griffin-riders-escape`
- `/en/student/arcade/storm-castle-tower`

The accessibility snapshots and DOM probes confirmed the expected heading, readable DOM control instructions, the shared host controls, one mounted canvas after load, and no horizontal overflow. Dragon Rider also switched from Primary Chibi to Secondary Epic with exactly one canvas and the selected edition marked `aria-pressed="true"`.

The Kimi screenshot helper returned malformed/empty output with this daemon-extension pairing, so committed PNG evidence was captured with Playwright. Kimi remained the real-browser acceptance and accessibility check rather than being silently replaced.

## Fixed viewport and edition matrix

Playwright exercised all 16 mount states: four games, both editions, and both `1440x900` and `390x844` viewports. Every accepted state had:

- the expected production heading and readable control paragraph;
- exactly one `960x540` Phaser canvas, responsively displayed at `1118x628.875` desktop or `348x195.75` mobile;
- the requested edition marked active;
- no horizontal overflow; and
- no page error after the startup-race remediation.

The first Dragon Rider Primary desktop pass exposed a zero-sized initial canvas race. Commit `217ec5e9` makes all four traversal scenes wait for positive finite surface bounds before input normalization. The affected browser state was rerun after rebuilding the package and passed with one canvas, no overflow, and zero page errors.

## Full completion and persistence matrix

Each game completed twice through the authenticated generic host:

| Input run | Edition | Viewport | Dragon Rider | Spellweavers Run | Griffin Riders Escape | Storm Castle Tower |
|---|---|---|---|---|---|---|
| Keyboard | Primary Chibi | `1440x900` | complete, saved, HTTP 200 | complete, saved, HTTP 200 | complete, saved, HTTP 200 | complete, saved, HTTP 200 |
| Touch pointer | Secondary Epic | `390x844` | complete, saved, HTTP 200 | complete, saved, HTTP 200 | complete, saved, HTTP 200 | complete, saved, HTTP 200 |

Every run reached the production `Session complete` surface, displayed server-owned saved XP, exposed Replay/Catalog/Next Game, and produced zero page errors. The mobile run used held `pointerType="touch"` down/up events against the declared canvas regions; it did not substitute mouse clicks for touch acceptance.

## Evidence

- `browser-evidence/completion-contact-sheet.png` — eight completed and persisted production-host sessions.
- `browser-evidence/completion-<id>-desktop-keyboard.png` — Primary Chibi keyboard result per game.
- `browser-evidence/completion-<id>-mobile-touch.png` — Secondary Epic touch result per game.
- `browser-evidence/playwright-<id>-<edition>-<viewport>.png` — all 16 pre-completion edition/viewport mount states.
- The S1 legacy baseline images remain in the same directory for before/after comparison.
