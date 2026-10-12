# Acceptance: primary_parity_pwa_20261011

- Date: 2026-10-12 (prep only; kit run pending with the orchestrator batch)
- Legacy revision: bfea121
- New commit: 8327d4565 (prep; record the tested commit at the kit run)
- Copies: primary_legacy_<yyyymmdd>, primary_parity_<yyyymmdd> (pending; the kit clones a matched pair)

The kit blocks service workers, so the only capture pair is the student home with the install
notice (S3). AC-1 runs in this track's Playwright project; AC-2, AC-3, and AC-4 run outside the kit.

| Pair | Check | Result (pass, fail, difference on purpose) | Note |
| --- | --- | --- | --- |
| PWA-A1 | PWA-A1-a: install affordance on the student home (legacy header button vs new pinned guild-hall notice) | pending kit run | Steps fire a synthetic `beforeinstallprompt`; placement and copy differ on purpose. |
| PWA-A1 | PWA-A1-b: RPG skin notice with 48 px targets; no notice in a reading page or a lesson | pending kit run (pair) / proven (unit tests) | `components/pwa/__tests__/install-notice.test.tsx` covers the reading/lesson absence. |

Track criteria (`spec.md`):

| AC | Check | Status | Evidence |
| --- | --- | --- | --- |
| AC-1 | Takeover test passes with a copy of the real legacy worker | proven today | `apps/primary-advantage/tests/pwa/takeover.spec.ts` (`pwa-takeover` project, Phase S1). |
| AC-2 | `curl -I` on the rehearsal tag URL: `/serwist/sw.js` gives 200, a JavaScript MIME type, `Service-Worker-Allowed: /`, `Cache-Control: no-cache`; `/manifest.webmanifest` gives the manifest | pending rehearsal 3 | Commands in `runbook-checks.md`. |
| AC-3 | iPhone (Safari) and Android phone (Chrome): add to home screen, standalone mode, Forge icon | owner | Real phones; not runnable on this machine. |
| AC-4 | After the traffic switch: a phone with the installed legacy app opens the new app after at most one reload; remote debugging shows the new worker and no legacy cache | pending handoff | Hand to `primary_parity_rehearsal3_20261011` for the cutover command sheet; check text in `runbook-checks.md`. |
| AC-5 | Owner look check of the icons, the colours, and the install notice | pending (async) | Defaults in `design/decisions.md`. |

Owner look check: pending (async).
