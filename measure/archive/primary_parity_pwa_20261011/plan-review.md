# Plan review: primary_parity_pwa_20261011

## Phase S1

Findings for the orchestrator (the orchestrator moves them into the shared files).

Medium and Low:

- Low: the live legacy worker answers with `cache-control: s-maxage=31536000`, not "no header" as
  Phase 0 said (`tests/pwa/fixtures/README.md`). The browser ignores `s-maxage`, so the update check is not affected.
- Low: `playwright.config.ts` has a second mode (`PWA_TAKEOVER=1`) because its top-level `webServer`
  starts the Next app. A separate config file is the alternative.
- Low: the takeover test runs Chrome through `channel: "chrome"` (`/usr/bin/google-chrome`); it
  fails on a machine without Chrome. The test is not in a CI gate.
- Low: `lib/pwa/__tests__/service-worker.test.ts` imports `acorn` (hoisted at the repo root, not a
  dependency of the app) to check the module parse.
- Low: the worker repeats `CACHE_PREFIX` as a literal; a unit test compares it with `lib/pwa/constants.ts`.
- Low: the fixture server answers 200 for every unknown path; it does not check the precache fetches by `Cache-Control`.

Lesson: in `activate`, never await `WindowClient.navigate()`. A navigation waits for the activation
to end, so the await blocks both. The takeover test in a real browser found this; the unit tests could not.

Shortcut: none. Open item P0-7 (Chrome install criteria) stays for Story S2; S1 has no `fetch` listener.
