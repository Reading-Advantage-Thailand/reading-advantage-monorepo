# W0 Verification — 2026-07-10

Implementation commit: `8b98aed0`.

## Green evidence

| Surface | Command/evidence | Result |
|---|---|---|
| Public cartridge contracts | game-cartridges Vitest | 26/26; exact public IDs, loader/manifest parity, and retired-ID rejection |
| Cartridge coverage | `pnpm --filter @reading-advantage/game-cartridges test:coverage` | 97.26% statements, 90.12% branches, 97.67% functions, 99.21% lines |
| Cartridge quality | lint, check-types, build | All green |
| Architecture | game-contracts architecture guard | Passed; no Next/auth/DB/app-private or legacy-renderer coupling introduced |
| Advantage Games QC | focused Jest | 1/1; public names, retired-label rejection, edition switch, result identity, and display-XP exclusion |
| Reading host | focused Jest | 4/4; all three public IDs under Secondary Epic plus completion trust boundary |
| Primary host | focused Vitest | 4/4; all three public IDs under Primary Chibi plus completion trust boundary |
| Browser QC | Chromium Playwright | 3/3; all three games × both editions, one-canvas lifecycle, 390×844 controls/no overflow, real Phaser completion with public ID |
| Advantage Games app | check-types and production build | Green; `/qc` emitted as a static route |
| Legacy disposition | track verifier | 55 exact paths: 22 retain, 3 deleted, 30 deferred |
| Graph | targeted `build-graph update` and stats | 23,881 nodes, 47,884 edges, 2,865 files; public cartridge definitions indexed |

## Intentional boundaries

- `gate-runner`, `sentence-collector`, and `typing-defense` remain internal mechanic/module names and pure test helpers; they are not public catalog, loader, manifest, URL, or completion identities.
- The only W0 deletions are three caller-free `public/vocab/*.json` fixtures. All live routes, APIs, renderers, covers, production assets, and Reading production surfaces remain retained or successor-owned in the manifest.
- Client `xp`, user identity, and school identity remain excluded from the completion input. Authenticated identity, tenancy, awarded XP, timing validation, and abuse controls remain server-owned.
- `measure/doctor.sh` is clean for this track but still reports deprecated markers in unrelated concurrent Codecamp and TypeScript 7 tracks. `measure/generate.sh` is absent from this repository.

## Remaining gate

The automated implementation is complete. The four story-level Measure manual-verification checkpoints remain deferred to the product owner, so W0 stays active rather than being archived automatically.
