# Behavior contract — primary_parity_cleanup_20261011, FR-10 (STU-09, old game URLs)

## 1. Rows and owner decisions

| Row (triage ID) | Short name | Owner decision | Date |
| --- | --- | --- | --- |
| STU-09 | Old game URLs | Send the five old game URLs to the new 3D game with the same id. | 2026-10-11 |
| old_game_host_M4 | Old 2D game host | Remove the old host. The Primary part only (spec Q1 default). | 2026-10-11 |

## 2. Legacy behavior

| Page or action | Roles | User does | App shows or does | Source (`file:line` at `bfea121`) |
| --- | --- | --- | --- | --- |
| `/student/games/vocabulary/dragon-rider` | STUDENT | Opens a bookmark | The 2D game start screen | `app/[locale]/(student)/student/games/vocabulary/dragon-rider/page.tsx` |
| `/student/games/vocabulary/enchanted-library` | STUDENT | Opens a bookmark | The 2D game start screen | `.../vocabulary/enchanted-library/page.tsx` |
| `/student/games/vocabulary/rpg-battle` | STUDENT | Opens a bookmark | The 2D game start screen | `.../vocabulary/rpg-battle/page.tsx` |
| `/student/games/vocabulary/rune-match` | STUDENT | Opens a bookmark | A back link, a heading, and the 2D `StartScreen` | `.../vocabulary/rune-match/page.tsx:8-30` |
| `/student/games/sentences/potion-rush` | STUDENT | Opens a bookmark | The 2D game start screen | `.../sentences/potion-rush/page.tsx` |

## 3. Data read and written

| Item | Kind | Columns or detail | Read or write | Permission check | Source |
| --- | --- | --- | --- | --- | --- |
| Redirect page | route | Reads the route parameters (group, id) and the locale only | none | The `/student` route policy (`proxy.ts:58-71`, `lib/route-policies.ts:17`) | new code |

No table, no side effect (no XP, log, email, file, or AI call).

## 4. New target

- Drizzle tables (and the migration, when the schema changes): none, no migration.
- Domain functions (Zod input and output): none. `oldGameTarget(group, id)` in `lib/games/catalog.ts` is a pure map.
- Permission action for `assertCan`: none. A signed-out visitor gets the sign-in page first.
- TenantDB class for each table (FLAT, EXEMPT, or REFERENTIAL): none (no table).
- AI adapter use: none.
- RPG skin components: none (the 3D game page keeps its skin).
- Routes (with the locale): `/[locale]/student/games/vocabulary/[gameId]` and `/[locale]/student/games/sentences/[gameId]` answer `permanentRedirect` (308) to `/[locale]/student/games/apk/<id>`. An unknown id or a wrong group gives `notFound()`.

## 5. Differences on purpose

| Difference | Reason | Owner decision and date |
| --- | --- | --- |
| The old URL opens the 3D game with the same id, not the 2D game | The owner removed the 2D host | 2026-10-11 |
| The redirect keeps no query string | An old URL has no query | Spec FR-10 (default) |

## 6. Acceptance rows

| Pair id | Legacy page | New page | Role | Observable behavior | Data check | Result |
| --- | --- | --- | --- | --- | --- | --- |
| AC-8 | `/en/student/games/vocabulary/rune-match` (and the other four) | same URLs | STUDENT | 308 to `/en/student/games/apk/<id>`; the 3D game loads; `/th/...` keeps `th`; an unknown id gives 404 | none | batch capture (orchestrator) |

## 7. ETL and runbook changes

none. For `primary_parity_rehearsal3_20261011`: an optional check that `curl -I` on an old URL with a session cookie gives 308.
