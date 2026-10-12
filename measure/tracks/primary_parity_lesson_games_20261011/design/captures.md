# Captures of Phase D (design mocks)

The PNG files are outside the repository. Folder: `/home/daniebo/Desktop/primary-parity-progress/captures/lesson_games/phaseD-design`.
Name pattern: `<view>-<width>-<day|night>.png`.

| View | Widths | What it shows |
| --- | --- | --- |
| `task10` | 375, 1280 | Task 10: four cartridges as objects of the arena place, the last result of each, "Simple game" |
| `task10-locked` | 375, 1280 | Task 10 with the workbook-first lock (locked chest, reason, locked cartridges) |
| `task12` | 375, 1280 | Task 12: two sentence cartridges first with the last result, then the four activities |
| `task12-short` | 375, 1280 | Task 12 with 2 sentences: cartridges locked with the reason, activities open |
| `projector` | 1280 | The projector game panel on a laptop projector |
| `projector-xl` | 1920 | The same panel on a 1920 px projector (larger type and targets) |
| `run-student` | 375, 1280 | The full-screen run for a student (hearts, XP, leave game) |
| `run-teacher` | 1280, 1920 | The full-screen run on the projector (demo sign, answer hint, nothing saves) |

Each file exists for day and night (28 files). Example: `/home/daniebo/Desktop/primary-parity-progress/captures/lesson_games/phaseD-design/task10-1280-day.png`.

Notes:
- The mocks use the real RPG components (`Scene`, `Panel`, `Sign`, `Meter`, `Gem`, `RpgButton`, `Sprite`), the real `styles/rpg.css`, and demo data only.
- Every picture is a Forge asset under `apps/primary-advantage/public/rpg`. No ElvGames asset.
- The game canvas in the full-screen run is a stand-in picture. The real 3D or 2D game fills this area.
- The cartridge pictures are stand-ins: bosses and NPC strips of the skin kit. Request for Forge: one object render for each of the six cartridges.
- The mock source is in `/tmp/claude-1000/-home-daniebo-Desktop-reading-advantage-monorepo/dd704fda-3c3a-4a4b-812c-8ee53fdda1f8/scratchpad/lesson_games-d` (outside the repository).
