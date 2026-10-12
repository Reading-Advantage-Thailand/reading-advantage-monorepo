# Plan: Installable app and a worker that replaces the legacy worker

Paths are relative to `apps/primary-advantage` unless they start with `packages/` or `measure/`.
Each task follows the TDD order of `measure/workflow.md`. Unit tests use Vitest (`vitest.config.ts`;
a test outside `lib/` must be in a `__tests__` folder; never put a test under `public/`, because
Next serves that folder). The takeover test is a Playwright project with its own small fixture
server: no Next build and no dev server on this machine.

## Phase 0: Design [checkpoint: 96506ee69]

- [x] Task: Design the icons, the colours, and the install notice
    - [x] Ask the Forge session for icon renders. Asked 2026-10-12 by the orchestrator; answered 2026-10-12: use the brand app icon from advantage-pr (`assets/logos/png/app-icon/primary-advantage-{180,192,512}.png`, owner approval 2026-10-08). Forge asked the owner about an RPG-art icon; the brand icon is the default.
    - [x] Pick the manifest `theme_color` and `background_color` from the skin tokens (day and night). Default: `theme_color` `#5c391a`, `background_color` `#0f1420`; option: brand cyan `#22d3ee` (`design/decisions.md`).
    - [x] Mock the install notice as a pinned notice in the guild hall (iOS steps and the Chrome Install button), and the offline page and sign (Story S4). Mock done.
    - [x] Captures at 375 px and 1280 px, day and night. PNG files are outside the repo; paths in `design/captures.md`.
- [x] Task: Fill the behavior contract before the build
    - [x] Copy `docs/runbooks/primary-behavior-contract-template.md` (kit FR-11) to `measure/tracks/primary_parity_pwa_20261011/behavior-contract.md` and fill its seven sections (STU-13, the legacy worker facts, and the runbook check)
    - [x] Write `measure/tracks/primary_parity_pwa_20261011/acceptance-pairs.json` with the pairs of the spec acceptance criteria (kit FR-7)
- [x] Task: Owner look check of the icons, the colours, the notice, the short name, and the choice to build Story S4; record the answers in `design/decisions.md` - look check pending (owner, async). Defaults used (spec): short name "Primary Advantage"; build Story S4: yes; brand app icon; `theme_color` `#5c391a`; `background_color` `#0f1420`; notice pinned in the guild hall.
- [x] Task: Measure - User Manual Verification 'Phase 0: Design' (Protocol in workflow.md) - look check pending (owner, async)
    - Steps: open each PNG of `design/captures.md`; check the icon, the two colours, the notice (iOS and Chrome), the offline page, and the offline sign at 375 px and 1280 px, day and night.

## Phase S1: Phones with the legacy app switch to the new app
_Story ref: spec.md#story-s1_

- [x] Task: Contract for the worker and its headers
    - [x] `lib/pwa/constants.ts`: `SERVICE_WORKER_URL = "/serwist/sw.js"`, `SERVICE_WORKER_SCOPE = "/"`, the cache prefix `primary-v2-`; JSDoc
    - [x] Save a read-only copy of the live legacy worker (`https://primary.reading-advantage.com/serwist/sw.js`) and its precache URL list in `tests/pwa/fixtures/legacy-sw.js`; record the date and the response headers in `tests/pwa/fixtures/README.md`
- [x] Task: Unit tests for the worker
    - [x] `lib/pwa/__tests__/service-worker.test.ts`: load `public/serwist/sw.js` in a `vm` context with fake `self`, `caches`, and `clients`; install calls `skipWaiting`; activate deletes every cache without the prefix, claims the clients, and reloads each window once only when it deleted a legacy cache; no `fetch` listener; no `importScripts`; the file parses as a module
    - [x] `lib/pwa/__tests__/next-config-headers.test.ts`: `headers()` of `next.config.ts` gives `Service-Worker-Allowed: /` and `Cache-Control: no-cache` for `/serwist/sw.js`
    - [x] `lib/__tests__/proxy-matcher.test.ts`: the matcher of `proxy.ts` skips `/serwist/sw.js`, `/manifest.webmanifest`, `/icons/<file>.png`, and `/offline.html`; a counterexample path without a dot still matches
    - [x] `components/pwa/__tests__/service-worker-register.test.tsx`: the component registers the URL with scope `/` and type `module` once; it does nothing when `navigator.serviceWorker` is missing
- [x] Task: Implement the worker, the headers, and the registration
    - [x] `public/serwist/sw.js` (plain script, `// @ts-check`, JSDoc)
    - [x] `next.config.ts`: `headers()` for `/serwist/sw.js`
    - [x] `components/pwa/service-worker-register.tsx`; mount it in `app/[locale]/layout.tsx`
- [x] Task: Takeover test in a real browser
    - [x] `tests/pwa/fixture-server.mjs`: serves a test page, the legacy worker copy at `/serwist/sw.js` (with `Service-Worker-Allowed: /`), and 200 for each legacy precache URL; a switch serves `public/serwist/sw.js` at the same URL
    - [x] `tests/pwa/takeover.spec.ts`: register the legacy worker (scope `/`, type `module`); check the legacy caches; switch; load the page; check that the new worker controls the page, that no legacy cache stays, that the window reloaded once, and that a second load does not reload
    - [x] `playwright.config.ts`: a `pwa-takeover` project (Chromium) with the fixture server as its `webServer`. Deviation: the project runs only with `PWA_TAKEOVER=1`, because the top-level `webServer` of the file starts the Next app. Command: `PWA_TAKEOVER=1 ../../node_modules/.bin/playwright test --config playwright.config.ts` (Chrome by `channel: "chrome"`).
- [x] Task: Runbook check for rehearsal 3
    - [x] Write the post-switch phone check (AC-4) and the `curl -I` check (AC-2) in `measure/tracks/primary_parity_pwa_20261011/runbook-checks.md` for `primary_parity_rehearsal3_20261011`
- [x] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [x] Task: Measure - User Manual Verification 'Phase S1: Phones with the legacy app switch to the new app' (Protocol in workflow.md) - look check pending (owner, async)
    - Steps: run the takeover command above (1 test passes); read `runbook-checks.md`; on a phone with the legacy app after the cutover, do AC-4.

## Phase S2: Add Primary Advantage to the home screen
_Story ref: spec.md#story-s2_

- [ ] Task: Contract for the manifest
    - [ ] `app/manifest.ts`: the `MetadataRoute.Manifest` fields of spec D5 (`id: "/"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, the colours of the design decision, the icons)
    - [ ] Check the current Chrome install criteria in the Chrome documentation; if they need a `fetch` handler, record it in `design/decisions.md` and add a network-only handler to Story S4 scope
- [ ] Task: Tests for the manifest and the icons
    - [ ] `app/__tests__/manifest.test.ts`: the fields; each icon file exists in `public/icons/` with the size in its PNG header; no icon path is under `assets/apk/standard-pack-qc/`
    - [ ] `app/[locale]/__tests__/layout-metadata.test.ts`: `manifest`, `appleWebApp`, the apple icon, and the viewport `themeColor`
- [ ] Task: Implement the manifest and the icons
    - [ ] `app/manifest.ts`; the Forge icons in `public/icons/`
    - [ ] `app/[locale]/layout.tsx`: replace the commented lines 79-80 with `manifest: "/manifest.webmanifest"`; add `appleWebApp`, the apple icon, and `themeColor`
- [ ] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [ ] Task: Measure - User Manual Verification 'Phase S2: Add Primary Advantage to the home screen' (Protocol in workflow.md)

## Phase S3: Install prompt on the student home
_Story ref: spec.md#story-s3_

- [ ] Task: Contract for the install notice
    - [ ] `hooks/use-install-prompt.ts`: the state (`ios-steps`, `install-button`, `hidden`), the standalone check, the iOS check, the dismissal key; JSDoc
- [ ] Task: Tests for the install notice
    - [ ] `hooks/__tests__/use-install-prompt.test.tsx`: iOS Safari gives `ios-steps`; a `beforeinstallprompt` event gives `install-button`; standalone mode or a stored dismissal gives `hidden`
    - [ ] `components/pwa/__tests__/install-notice.test.tsx`: the Install button calls `prompt()`; Dismiss stores the key; the notice is not in the reading and lesson pages
- [ ] Task: Implement the install notice
    - [ ] `hooks/use-install-prompt.ts`, `components/pwa/install-notice.tsx` (RPG `Panel` and buttons)
    - [ ] `app/[locale]/(student)/student/home/page.tsx`: the pinned notice
    - [ ] Copy keys in `messages/{en,th,cn,tw,vi}.json`
- [ ] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [ ] Task: Measure - User Manual Verification 'Phase S3: Install prompt on the student home' (Protocol in workflow.md)

## Phase S4: Offline page and offline sign
_Story ref: spec.md#story-s4_

Build this phase only if the owner chose it in Phase 0.

- [ ] Task: Contract for the offline fallback
    - [ ] `lib/pwa/constants.ts`: the offline cache name and the file list (`/offline.html` and its files, under 200 KB)
- [ ] Task: Tests for the offline fallback
    - [ ] `lib/pwa/__tests__/service-worker.test.ts`: install caches only the offline files; a navigation goes to the network; a network error gives `/offline.html`; a non-navigation request has no handler; activate keeps the offline cache
    - [ ] `tests/pwa/takeover.spec.ts`: offline navigation shows the offline page, never a legacy page
    - [ ] `components/pwa/__tests__/offline-sign.test.tsx`: the sign shows on `offline` and goes on `online`
- [ ] Task: Implement the offline fallback
    - [ ] `public/offline.html` (static, in the skin colours, en and th text); the navigation handler in `public/serwist/sw.js`
    - [ ] `components/pwa/offline-sign.tsx`; mount it in `components/shared/app-layout.tsx`
- [ ] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [ ] Task: Measure - User Manual Verification 'Phase S4: Offline page and offline sign' (Protocol in workflow.md)

## Phase A: Acceptance

- [ ] Task: Run the kit of `primary_parity_acceptance_20261011` (`scripts/primary-parity/capture.ts` for each app, then `report.ts`) with `acceptance-pairs.json`; the kit blocks service workers, so it covers only the student home pair with the install notice (S3)
- [ ] Task: Run AC-1 (the takeover test) and AC-2 (`curl -I` on the rehearsal tag URL)
- [ ] Task: Run AC-3 on an iPhone (Safari) and an Android phone (Chrome) against legacy and the rehearsal build
- [ ] Task: Hand the AC-4 check to `primary_parity_rehearsal3_20261011` for the cutover command sheet
- [ ] Task: Write `measure/tracks/primary_parity_pwa_20261011/acceptance.md` from the runbook template (kit FR-10), with the owner look check
- [ ] Task: Measure - User Manual Verification 'Phase A: Acceptance' (Protocol in workflow.md)
