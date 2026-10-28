# Captures of the built UI — system dashboard (Phase 3)

The harness bundles the real page (`app/[locale]/system/dashboard/page.tsx`), `PlatformTotalsPanel`, and `SchoolsTable` with the real CSS and the real `en` messages. Only the session, the database, and `getPlatformOverview` are stubs. Data: demo fixtures with invented school names. PNG files stay outside the repository.

Folder: `/home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase3-ui/`

Variants (each at `-375` and `-1280`; `-sN` is the Nth scroll step): `home-day` (s1, s2), `home-night` (s1), `sorted-seats-day` (s1; phone: select "Seats", desktop: tap on the Seats head), `search-day` (s1; search "school"), `search-none-day`, `no-unassigned-day`, `empty-day`.

Example paths:

- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase3-ui/home-day-375.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase3-ui/home-day-1280.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase3-ui/home-night-375.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase3-ui/home-night-1280.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase3-ui/sorted-seats-day-375.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase3-ui/search-day-1280.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase3-ui/empty-day-375.png

Checks: no horizontal overflow at 375 px or 1280 px in any variant; one 404 for a missing resource (not the page code) in `home-day-375`.
Harness: `<scratchpad>/system_dashboard-p3/` (`build.mjs`, run with `OUT=<folder>` under the heavy lock).
