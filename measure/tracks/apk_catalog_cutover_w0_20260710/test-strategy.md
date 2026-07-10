# Test Strategy: APK Catalog Cutover W0

## Contract risks

- Public identity drift between catalog keys, dynamic loaders, cartridge manifests, QC URLs, and completion payloads.
- Accidental compatibility aliases for the foundation-only IDs.
- Educational ABI drift while renaming product surfaces.
- One host proving only a single game or importing gameplay code directly.
- Client-owned rewards or identity crossing the production completion boundary.
- A deletion claim made without caller, route, API, asset, and host evidence.

## Test layers

1. **Contract tests:** exact public ID union; exact catalog/loader key parity; manifest-key parity; old-ID rejection; unchanged vocabulary, sentence, and result schemas.
2. **Cartridge tests:** load all three public IDs, validate both editions, and retain deterministic mechanic tests under their internal modules.
3. **QC component tests:** exact public catalog labels, initial selection, edition switching, reset/relaunch, and result JSON.
4. **Host smoke tests:** table-driven Reading and Primary coverage of all three IDs, correct edition, stable arrays, and completion mapping that excludes display XP and client identity.
5. **Browser acceptance:** desktop plus 390x844 runs, one-canvas lifecycle, public ID result, keyboard path, touch affordance, no overflow.
6. **Architecture/deletion guards:** package boundary scan, graph update, old public-ID scan limited to explicit migration evidence, and exact legacy manifest validation.

## Counterexamples required before implementation

- A catalog key whose loaded manifest has a different ID.
- Any old ID accepted by `getCartridgeCatalogEntry`.
- Reading or Primary registry missing one of the three public IDs.
- Completion mapping that accepts cartridge-supplied `userId`, `schoolId`, or awarded XP.
- A deletion manifest entry with no disposition or evidence owner.

## Acceptance commands

- Package lint, check-types, tests with coverage, and builds for game-contracts, advantage-play-kit, and game-cartridges.
- Focused Reading and Primary APK host tests.
- Focused Advantage Games Jest and Playwright APK QC suites.
- `pnpm --filter vocabulary-games build`.
- `build-graph update ./graph.db <changed TypeScript files>` plus targeted search/caller checks.
- `bash measure/doctor.sh`; unrelated concurrent-track failures are recorded, not silently reclassified.
