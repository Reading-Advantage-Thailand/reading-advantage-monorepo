# Decisions: Phase 0 design

Status of every row: look check pending (owner, async). The owner decided on 2026-10-12 that the
set does not stop for owner input. Each row uses the default of the spec. The owner can change a
row later. A change comes back to this file, `spec.md`, and `plan.md`.

| ID | Topic | Default used |
| --- | --- | --- |
| P0-1 | Icons | The brand app icon from advantage-pr (owner approval 2026-10-08, track `logo_vector_masters_20261007`; Forge advice 2026-10-12). It is a cyan field `#22d3ee` with the PA circle and the open book. Source: `/home/daniebo/Desktop/advantage-pr/assets/logos/png/app-icon/primary-advantage-{180,192,512}.png`. The 512 file is also the maskable icon (art inside radius 0.36, safe zone 0.40). Story S2 copies the files into `apps/primary-advantage/public/icons/`. Forge asked the owner whether an RPG-art icon replaces it. Until an answer, the brand icon stays. No ElvGames asset. |
| P0-2 | Manifest colours | `theme_color` `#5c391a` (`--cq-wood-dark`, the border of the student header). `background_color` `#0f1420` (`--cq-night`, the ground of `.cq-world`, so the splash screen matches the first page). Option for the owner: `theme_color` `#22d3ee` (brand cyan). |
| P0-3 | Day and night | The manifest holds one colour pair. The layout viewport `themeColor` gives day `#5c391a` and night `#0f1420` with `media` queries. The student header uses the same wood look in both modes. |
| P0-4 | Short name | `name` and `short_name` both "Primary Advantage" (the legacy value). |
| P0-5 | Install notice | A pinned parchment `Panel` in the guild hall, above the hero. It shows the 192 icon, one title, the iOS steps (Share, Add to Home Screen, Add) or a gold Install button, and a "Not now" button. All targets are 48 px. It uses `Panel`, `RpgButton` from `components/rpg/chrome.tsx`. |
| P0-6 | Offline page and sign (Story S4) | The choice to build Story S4: yes (spec default; the priority is Could). `/offline.html` is static, in the skin colours, with en and th text. The offline sign is a gold strip of 48 px with one line under the header. |
| P0-7 | Chrome install criteria | Checked 2026-10-12 in `web.dev/articles/install-criteria` (updated 2024-09-19): install needs HTTPS, the manifest fields (`name`/`short_name`, 192 and 512 icons, `start_url`, `display`, no `prefer_related_applications`), and the engagement heuristics. No service worker `fetch` handler is needed: Chrome removed that requirement in 108 (mobile) and 112 (desktop) (`developer.chrome.com/blog/update-install-criteria`). The S1 worker stays without a `fetch` handler; the S4 navigation handler only serves the offline fallback, not installability. |

Copy keys (English; five locale files in Story S3). Namespace `PwaInstall`: `title` ("Add Primary
Advantage to your home screen"), `iosShare` ("Tap the Share button in Safari."), `iosAdd`
("Tap Add to Home Screen."), `iosConfirm` ("Tap Add."), `install` ("Install"), `dismiss` ("Not now"),
`offlineTitle`, `offlineLine`, `offlineSign` ("You are offline. The app needs the internet.").

## Legacy worker facts (read at `bfea121`)

- Scope and URL: `/serwist/sw.js`, scope `/`, type `module`, `Service-Worker-Allowed: /` (`app/serwist/[path]/route.ts`, `components/providers/serwist-provider.tsx`). No `Cache-Control` header.
- Caches: precache `serwist-precache-v2-https://primary.reading-advantage.com/` and the runtime caches of `defaultCache` (`pages`, `pages-rsc`, `pages-rsc-prefetch`, `apis`, `others`, fonts, images, JS, CSS, audio, video, JSON).
- Update rule: `skipWaiting: true`, `clientsClaim: true`, `navigationPreload: false` (`app/sw.ts:26-42`). Serwist removes old precache entries on activate and never removes runtime caches.
- Today a phone with the legacy worker asks the same origin for `/serwist/sw.js`. The new app returns 404, so the old worker stays and can serve cached legacy pages.
- After S1 the same URL gives the new worker. The browser installs it on the next update check or page load, then it removes every cache without the `primary-v2-` prefix.
