# Behavior contract — primary_parity_pwa_20261011

## 1. Rows and owner decisions

| Row (triage ID) | Short name | Owner decision | Date |
| --- | --- | --- | --- |
| STU-13 | Installable app and worker | Owner triage 2026-10-11: build the manifest, the icons, and a worker that replaces the legacy worker. Set rule 2026-10-12: use the spec defaults. | 2026-10-12 |

## 2. Legacy behavior

| Page or action | Roles | User does | App shows or does | Source (`file:line` at `bfea121`) |
| --- | --- | --- | --- | --- |
| Worker registration | All | Opens any page | Registers `/serwist/sw.js`, scope `/`, type `module` | `components/providers/serwist-provider.tsx:6` |
| Worker update rule | All | Opens a page | `skipWaiting`, `clientsClaim`, no navigation preload; caches pages, RSC, API GETs, public files | `app/sw.ts:26-42` |
| Worker route | All | Browser fetches the worker | 200, JavaScript, `Service-Worker-Allowed: /`, no `Cache-Control` | `app/serwist/[path]/route.ts:9-13` |
| Manifest | All | Adds app to home screen | Name "Primary Advantage", `start_url` `/`, standalone, `theme_color` `#0891b2`, 3 icons | `app/manifest.ts` |
| Install prompt | All | Sees the header button | iOS: Share steps. Chrome: Install button. Dismissal in `localStorage` `pwa-install-dismissed` | `components/pwa/install-prompt.tsx:8-83` |
| Offline sign | All | Goes offline | Small sign from `online` and `offline` events | `components/pwa/offline-indicator.tsx` |
| Offline page | All | Opens a page offline | `/~offline` fallback; the proxy probably redirects it, so it was likely never shown | `app/sw.ts:34-41`, `proxy.ts:221-222` |

## 3. Data read and written

| Item | Kind | Detail | Read or write | Permission check | Source |
| --- | --- | --- | --- | --- | --- |
| Service worker caches | Browser side effect | Legacy caches on each phone | Write (legacy), delete (new) | none (browser) | `app/sw.ts` |
| `localStorage` dismissal key | Browser side effect | `pwa-install-dismissed` | Read and write | none | `install-prompt.tsx:8` |

No database table, no XP, no email, no AI call.

## 4. New target

- Drizzle tables: none. No migration.
- Domain functions: none.
- Permission action for `assertCan`: none (public static files and a client notice).
- TenantDB class: not applicable.
- AI adapter use: none.
- RPG skin components: `Panel`, `RpgButton` (`components/rpg/chrome.tsx`); `offline.html` uses the skin colours.
- Routes: `/serwist/sw.js`, `/manifest.webmanifest`, `/icons/*.png`, `/offline.html` (all outside the locale and the proxy); the notice on `/[locale]/student/home`.

## 5. Differences on purpose

| Difference | Reason | Owner decision and date |
| --- | --- | --- |
| The new worker has no `fetch` handler (S1) and caches no page | Legacy served stale pages; D3 | Spec default, 2026-10-12 |
| The notice is on the student home only, not in the header of each page | D7: never during a lesson or a reading | Spec default, 2026-10-12 |
| Icons: brand app icon | Owner approval 2026-10-08 | Forge advice, 2026-10-12 |
| `theme_color` `#5c391a`, `background_color` `#0f1420` | Skin tokens | Spec default, 2026-10-12 |
| The new worker deletes every legacy cache and reloads each window once | Phones with the legacy app switch to the new app | Spec D2 |

## 6. Acceptance rows

| Pair id | Legacy page | New page | Role | Observable behavior | Data check | Result |
| --- | --- | --- | --- | --- | --- | --- |
| PWA-A1 | `/en/student/read` | `/en/student/home` | STUDENT | Install notice in the guild hall; 48 px targets; no notice in a lesson or a reading | none | batch capture (orchestrator) |
| AC-1 | none | none | none | Takeover test (Playwright project `pwa-takeover`) | none | not a capture pair |
| AC-2 | none | none | none | `curl -I` on the rehearsal tag URL | none | not a capture pair |
| AC-3 | none | none | none | iPhone and Android phone: add to home screen, standalone | none | not a capture pair |
| AC-4 | none | none | none | Phone with the legacy app after the traffic switch | none | runbook check |

The kit blocks service workers, so only PWA-A1 is a capture pair.

## 7. ETL and runbook changes

No ETL change. One runbook check for `primary_parity_rehearsal3_20261011`: after the traffic switch, a
phone with the installed legacy app opens the new app after at most one reload. Chrome remote
debugging shows the new worker and no legacy cache. The check text goes in `runbook-checks.md` in Phase S1.
