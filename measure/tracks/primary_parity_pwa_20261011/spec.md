# Spec: Installable app and a worker that replaces the legacy worker

Track ID: `primary_parity_pwa_20261011`. Type: feature. App: `apps/primary-advantage`.
Triage row: STU-13.

## Overview

Legacy `bfea121` is a PWA: a manifest, icons, a Serwist service worker, an install prompt, and an
offline page. Phones that installed it keep the legacy worker after the cutover, because the new
app runs on the same origin and serves nothing at the worker URL. That worker caches pages, RSC
data, API answers, and about 41 MB of public files, and it can show cached legacy pages.

This track ships a new worker at the legacy worker URL. The new worker takes over, removes every
legacy cache, and never serves a cached page. Then it adds the manifest, the icons from the Forge
assets, and the install prompt. The offline page is a Could.

**Sprint goal:** A phone with the legacy app installed shows the new app after one reload and
keeps no legacy cache, and a new phone can install Primary Advantage with the new icons.

**Runbook:** This track adds a check to the cutover command sheet (a phone with the installed
legacy app, after the traffic switch). `primary_parity_rehearsal3_20261011` collects it.

## Track Set

This track is member 8 of the track set [Primary Parity Before the Cutover](../../sets/primary_parity_20261011.md). Depends on: primary_parity_acceptance_20261011. The shared decisions and the start gate in the set overview apply to this track.

## Context (verified 2026-10-11 at integration `ca8869cea`)

Paths are relative to `apps/primary-advantage` unless the path starts with `packages/` or `measure/`.
"Legacy" is `/home/daniebo/Desktop/primary-advantage` at `bfea121`. Serwist facts come from the
published 9.5.7 packages, the version that the legacy lockfile gives (the legacy repo has no
`node_modules`).

### Legacy worker

- `app/serwist/[path]/route.ts:9-13`: `createSerwistRoute({ additionalPrecacheEntries: [{ url: "/~offline", revision }], swSrc: "app/sw.ts", useNativeEsbuild: true })`.
  The route serves `/serwist/sw.js` with `Content-Type: application/javascript` and
  `Service-Worker-Allowed: /`, and no `Cache-Control`. The precache takes `.next/static/**` and
  `public/**` files of 2 MiB or less.
- `components/providers/serwist-provider.tsx:6`: `<SerwistProvider swUrl="/serwist/sw.js">` with the
  defaults: scope `/`, type `module`, register on load. It wraps the app in `app/[locale]/layout.tsx:101-116`.
- `app/sw.ts:26-42`: `skipWaiting: true`, `clientsClaim: true`, `navigationPreload: false`,
  `runtimeCaching: [...noCacheRules, ...defaultCache]`, and a `/~offline` fallback for documents.
- `defaultCache` (production) caches these requests:
  - fonts, images, `/_next/static` JS, audio, video, JS, CSS, `/_next/data`, and JSON;
  - same-origin API GETs (NetworkFirst with a 10 s timeout, cache `apis`);
  - RSC payloads (`pages-rsc`, `pages-rsc-prefetch`), HTML (`pages`), and other same-origin requests (`others`);
  - cross-origin requests.
- The precache cache is
  `serwist-precache-v2-https://primary.reading-advantage.com/`. Serwist removes old precache entries
  on activate but never removes the runtime caches.
- The triage claim that `next.config.*` holds Serwist options is wrong: legacy `next.config.ts:21`
  is only `withSerwist(withNextIntl(nextConfig))`; the options are in the route and the provider.
- The legacy offline page `app/(offline)/~offline/page.tsx` was probably never served: `/~offline`
  has no dot, so the proxy (`proxy.ts:221-222`, `:272-273`) redirects it to a locale path or to the
  sign-in page (reading of the code, not tested).
- `components/pwa/install-prompt.tsx`: iOS steps (Share, then "Add to Home Screen", lines 28-58) and
  an Android button from `beforeinstallprompt` (lines 61-83); the dismissal is stored in
  `localStorage` (`pwa-install-dismissed`, line 8). `components/pwa/offline-indicator.tsx` listens to
  `online` and `offline`. Both mount on every page (`components/shared/app-layout.tsx:63-64`).
- `app/manifest.ts`: name and short name "Primary Advantage", the description "Extensive reading app
  incorporating AI.", `start_url: "/"`, no `id` (so the id is `/`), `display: "standalone"`,
  `theme_color: "#0891b2"`, three icons in `public/icons/` (192, 512, 512 maskable).
- Commits `ff7c336` (the PWA, 2026-04-20) and `3d1e4c9` (iOS fixes: the apple icon,
  `navigationPreload: false`).

### Monorepo today

- `app/[locale]/layout.tsx:79-80`: both `manifest` lines are comments. No `themeColor` and no
  `appleWebApp` (lines 84-86). No `app/manifest.ts`, no worker, no `public/icons/`, no
  `navigator.serviceWorker` code, and no code that removes a worker or a cache.
- `proxy.ts:96-97`: the matcher skips paths with a dot, so `/serwist/sw.js` and
  `/manifest.webmanifest` reach Next with no locale redirect and no sign-in check. Today
  `/serwist/sw.js` returns 404.
- `next.config.ts` has no `headers()`; `output: "standalone"`; the Dockerfile copies all of `public/`
  (line 34).
- Same origin: the monorepo deploys the same Cloud Run service `primary-advantage-app`
  (`cloudbuild.yaml:62`) on `primary.reading-advantage.com`
  (`measure/tracks/primary_legacy_data_migration_20261004/cutover-commands-20261011.md:13-14`, C11).
  The legacy scope `/` covers every path of the new app.
- Under the Service Worker rules, a failed update (404) keeps the old worker. A replacement needs a
  200 answer at the same URL, a JavaScript MIME type, and `Service-Worker-Allowed: /`. The
  registration type is `module`, so the new script must run as a module (no `importScripts`).
- Large public folders: `public/packs` 35 MB (720 files), `public/assets` 22 MB (456 files),
  `public/rpg` 7.4 MB (246 files), 241 `.glb` files. They load by `<img>`, CSS, `fetch`, and the
  three.js loaders.
- ElvGames art that the icons must not use: `public/assets/apk/standard-pack-qc/` and
  `packages/advantage-play-kit/assets/standard/`. Forge candidates: `public/rpg/kit/icons/*.webp`
  (192 px) and `public/rpg/kit/heroes/*.webp` (512 px), with the sources in `public/rpg/skin.json`.
- Tests: Vitest (`vitest.config.ts`) and Playwright (`playwright.config.ts`, which starts a dev
  server). No test covers a worker. The rehearsal tag URLs are other origins with no legacy worker,
  so they cannot show what the phones will do.

## Design

- **D1 Same URL, new script.** The new worker is a plain script at `public/serwist/sw.js` (no
  Serwist, no new dependency, no `importScripts`). `next.config.ts` `headers()` gives it
  `Service-Worker-Allowed: /` and `Cache-Control: no-cache`.
- **D2 Takeover.** On install the worker calls `skipWaiting()`. On activate it deletes every cache
  whose name does not start with its own prefix (`primary-v2-`), and calls `clients.claim()`. If it
  deleted a legacy cache, it reloads each open window once (`client.navigate(client.url)`).
- **D3 No cache for pages.** The worker has no `fetch` handler in Story S1, so the browser sends
  every request to the network. Story S4 adds a navigation handler that only falls back to the
  offline page when the network fails. The worker never caches the RPG packs, the 3D assets,
  the audio, or the API; the browser HTTP cache keeps them.
- **D4 The app registers the same worker.** A small client component in the locale layout calls
  `navigator.serviceWorker.register("/serwist/sw.js", { scope: "/", type: "module" })` once for each
  page load. This starts the update check at the first page load of the new app, so a phone does not
  wait for the browser's own check.
- **D5 Same app identity.** The manifest keeps `id: "/"` and `start_url: "/"`, so the installed
  legacy app updates in place. The proxy sends `/` to the locale and the role home. The legacy
  description ("Extensive reading app incorporating AI.") does not move; the manifest uses the
  approved tagline of `primary_public_pages_20261007` (`PublicSite.tagline`, English) when it exists,
  and no description until then.
- **D6 Icons from Forge.** The Forge session renders the icons (192, 512, a 512 maskable, and a
  180 apple touch icon, PNG) from the RPG skin art; the app never hand-makes them. New file names in
  `public/icons/`. No ElvGames asset.
- **D7 Install prompt in one place.** The prompt is a pinned notice in the guild hall of the student
  home. It does not show on other pages, and never during a lesson or a reading. iOS Safari gets the
  Share steps; Chrome gets an Install button from `beforeinstallprompt`. A dismissal is stored on the
  device.
- **D8 Rejected:** a `Clear-Site-Data: "storage"` header. It also removes `localStorage` and IndexedDB
  (for example the 2D mode setting of the play kit), and Safari support is partial.

## Stories

### Story S1: Phones with the legacy app switch to the new app
**As a** student with the legacy app on my phone
**I want** the app to show the new Primary Advantage after the cutover
**So that** I never see an old page or old data

**Acceptance Criteria:**
- Given a browser with the legacy worker at `/serwist/sw.js` (scope `/`, type `module`) and its caches, When the new app answers at the same URL and a page loads, Then the new worker installs, activates, and controls the page.
- Given the new worker activates, When it finishes, Then `caches.keys()` has no legacy cache (no `serwist-precache-v2-*`, `pages`, `pages-rsc`, `apis`, `others`, or other legacy name), and each open window reloaded once.
- Given the new worker controls the page, When the student opens any page, Then the answer comes from the network and never from a cache of the worker.
- Given `/serwist/sw.js`, When the browser fetches it, Then the answer is 200 with a JavaScript MIME type, `Service-Worker-Allowed: /`, and `Cache-Control: no-cache`, and the proxy does not redirect it.
- Given a later page load with the new worker active, When the worker checks for an update, Then no window reloads.

**Estimate:** M
**Priority:** Must

### Story S2: Add Primary Advantage to the home screen
**As a** teacher or a parent
**I want** to add Primary Advantage to the home screen of a phone or a tablet with the new icon
**So that** the students open it like an app

**Acceptance Criteria:**
- Given the new app, When a browser reads `/manifest.webmanifest`, Then it has the name, `id: "/"`, `start_url: "/"`, `display: "standalone"`, the RPG skin colours, and the 192, 512, and 512 maskable icons, and each icon file exists with its size.
- Given iOS Safari, When a user adds the app to the home screen, Then the home screen shows the 180 px Forge icon and the app opens in standalone mode.
- Given Chrome on Android, When the install criteria are met, Then Chrome offers the install, and the installed app opens `/`.
- Given a phone with the legacy app installed, When the manifest updates, Then the same installed app shows the new name and icon (same `id`).

**Estimate:** S
**Priority:** Must

### Story S3: Install prompt on the student home
**As a** student or a parent on a phone
**I want** a short notice that tells me how to install the app
**So that** I can open it from the home screen next time

**Acceptance Criteria:**
- Given iOS Safari not in standalone mode, When the student home renders, Then a pinned notice shows the Share and "Add to Home Screen" steps.
- Given Chrome with a `beforeinstallprompt` event, When the student home renders, Then the notice shows an Install button that opens the browser's install dialog.
- Given the app runs in standalone mode, or the user dismissed the notice on this device, When the student home renders, Then no notice shows.
- Given a reading page or a lesson, When it renders, Then no install notice shows.

**Estimate:** S
**Priority:** Should

### Story S4: Offline page and offline sign
**As a** student on a weak school network
**I want** a clear page when the network is gone
**So that** I know that the app needs the network and I do not see an old page

**Acceptance Criteria:**
- Given the new worker is active and the network fails, When the student opens a page, Then the worker shows `/offline.html` from its own cache.
- Given the network works, When the student opens a page, Then the worker answers from the network and caches nothing.
- Given the browser goes offline, When a page is open, Then a small sign says that the app is offline; it goes away when the network comes back.
- Given the worker installs, When it caches the offline page, Then its cache holds only the offline page and its files (under 200 KB).

**Estimate:** S
**Priority:** Could

## Non-Functional Requirements

- NFR-1: No new dependency (no Serwist). The worker is plain JavaScript with `// @ts-check` and JSDoc.
- NFR-2: The worker never stores a page, an API answer, or a pack asset (D3). The total worker cache is
  0 bytes without Story S4 and under 200 KB with it.
- NFR-3: No schema change and no ETL change.
- NFR-4: Copy in en, th, cn, tw, and vi message files.
- NFR-5: The tests run without a Next build and without the dev server (the machine has 7 GB).

## Acceptance Criteria (track level, for the side-by-side kit)

The kit of `primary_parity_acceptance_20261011` blocks service workers in each browser context,
because legacy registers one. So the kit checks only the install notice pair (legacy student page and
new `/student/home`, STUDENT). AC-1 runs in the Playwright project of this track, and AC-3 and AC-4
run on real phones.

- AC-1: The takeover test (Playwright, Chromium) passes with a copy of the real legacy worker script
  from `https://primary.reading-advantage.com/serwist/sw.js`: the legacy caches exist first; after the
  switch the new worker controls the page and no legacy cache stays.
- AC-2: `curl -I` on the rehearsal tag URL: `/serwist/sw.js` gives 200, a JavaScript MIME type,
  `Service-Worker-Allowed: /`, and `Cache-Control: no-cache`; `/manifest.webmanifest` gives the manifest.
- AC-3: Legacy `bfea121` and the new build on an iPhone (Safari) and an Android phone (Chrome): add to
  the home screen; both open in standalone mode; the new build shows the Forge icon.
- AC-4: After the traffic switch, on `https://primary.reading-advantage.com`: a phone with the
  installed legacy app opens the new app after at most one reload, and Chrome remote debugging shows the
  new worker and no legacy cache (the new runbook check).
- AC-5: Owner look check of the icons, the colours, and the install notice.

## Out of Scope

- Offline reading or offline games (any cache of pages, packs, or audio).
- Push notifications and background sync.
- A worker for the other apps of the monorepo.
- The ElvGames art that still ships (`primary_parity_cleanup_20261011`).
