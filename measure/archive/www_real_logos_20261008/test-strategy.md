# Test Strategy — Real Advantage logos on the www site

Track: `www_real_logos_20261008`. Chore. Two phases. Daniel's team deploys
(decision C7). This track changes only `apps/www-reading-advantage` and no other package.

## Source of truth recorded

- Logo source (read-only, other repo): `/home/daniebo/Desktop/advantage-pr/assets/logos/`.
- `color` ← `vector/horizontal/<id>-advantage.svg` (10 files).
- `reversed` ← `vector/horizontal-dark-inverse/<id>-advantage.svg` (10 files).
- FR-2 square ← `vector/square/<id>-advantage.svg` (10 files).
- `thaiLockup` ← `vector/lockup-thai/<id>-advantage.svg`; also copy
  `vector/lockup-thai-dark/` and `vector/lockup-thai-dark-inverse/` (10 files each).
- FR-3 favicon ← `png/favicon/reading-advantage.ico` (6507 bytes).
- Product IDs (10): codecamp, mastery, math, primary, reading, science, stem,
  storytime, tutor, zhongwen.
- Current manifest: `apps/www-reading-advantage/src/lib/site-assets.ts`
  (`siteLogos` maps to `/media/brand/logos/{svg,reversed,lockups}/` placeholders).
- Manifest generator: `apps/www-reading-advantage/scripts/build-site-assets.py`
  (`LOGO_SETS` still points at old `svg/reversed/lockups` source kinds, which no
  longer exist under advantage-pr `assets/logos/`).

## Scope boundaries (record, do not block)

- The header company logo `/images/logo.jpg` is NOT in FR-1..FR-5. Do not change it.
  If the Phase 2 captures show it should change, that is a new owner decision.
- `public/reading-advantage.jpg` (53724 bytes) is a 700 px product raster used by the
  b2b-solutions card. It is in FR-2 scope even though it is a `.jpg`, not a `.png`.
  `/images/logo.jpg` (294912 bytes) is a different file and stays.
- The Primary app logo and favicon are out of scope (spec).

## Phase 1: Files and mapping — risk `medium`

Non-live static swap. Brand-visible but fully test-covered; not deployed by this track.
No data, auth, or security surface changes.

### Red tests the batch writes

1. `src/lib/__tests__/real-logos-mapping.red.test.ts` (new)
   - Asserts `siteLogos` keys equal the exact 10-`id` set (no more, no fewer). Enumerate
     the names as a literal array; do not assert only a bare `.length === 10`.
   - For each `id`: `color` begins with `/media/brand/logos/vector/horizontal/` and the
     file exists under `public/`; `reversed` begins with
     `/media/brand/logos/vector/horizontal-dark-inverse/` and exists; `thaiLockup`
     begins with `/media/brand/logos/vector/lockup-thai/` and exists.
   - Asserts no `siteLogos` value contains a removed placeholder kind (`/svg/`,
     `/reversed/`, `/lockups/`).
2. `src/lib/__tests__/real-logos-references.red.test.ts` (new)
   - Reads every `.ts` and `.tsx` under `src/` and asserts ZERO hits for each of the
     exact removed literals: `/media/brand/logos/svg/`, `/media/brand/logos/reversed/`,
     `/media/brand/logos/lockups/`, `/math-advantage.png`, `/science-advantage.png`,
     `/stem-advantage.png`, `/storytime-advantage.png`, `/tutor-advantage.png`,
     `/zhongwen-advantage.png`, `/primary-advantage logo.png`, `/reading-advantage.jpg`.
     Assert each literal separately (no word-based exclusion filter).
   - Asserts the placeholder dirs `public/media/brand/logos/{svg,reversed,lockups}` no
     longer exist, and the replaced rasters `public/{math,science,stem,storytime,tutor,
     zhongwen}-advantage.png`, `public/primary-advantage logo.png`,
     `public/reading-advantage.jpg` no longer exist.
   - Asserts `public/media/brand/logos/vector/square/` holds all 10 square SVGs.
3. `src/lib/__tests__/real-logos-favicon.red.test.ts` (new), FR-3
   - Asserts `src/app/[locale]/favicon.ico` and `public/favicon.ico` are byte-identical
     to each other.
   - Asserts the byte length equals the source `reading-advantage.ico` length (6507) and
     the first 4 bytes are the ICO magic `00 00 01 00`. No SHA/hash (repo policy).

### Red command

`bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/www-real-logos/apps/www-reading-advantage && pnpm vitest run --maxWorkers=1 src/lib/__tests__/real-logos-mapping.red.test.ts src/lib/__tests__/real-logos-references.red.test.ts src/lib/__tests__/real-logos-favicon.red.test.ts'`

### Green gate

The three files above pass, and the pre-existing
`src/lib/__tests__/site-assets.test.ts` passes (it iterates every `siteLogos` value and
asserts the file exists under `public/`).

### Closeout gate (all through heavy-run, package-local, `--maxWorkers=1`)

- `pnpm vitest run --maxWorkers=1` (whole package).
- `pnpm check-types` (`tsc --noEmit`).
- `pnpm lint`.
- `pnpm build` (`next build`).

### Fixtures, mocks, live-behavior proof

- No mocks needed. The mapping and favicon tests read the real `public/` tree with
  `node:fs`. That IS the live-behavior proof: a mapped path that is not a real file
  fails the test.
- No DB, no network, no browser in Phase 1.

### Architecture guardrails and changed-contract risks

- `site-assets.ts` says "Generated ... Do not edit by hand". Changing only the mapping by
  hand breaks that contract. Either update `scripts/build-site-assets.py` `LOGO_SETS` to
  the new source kinds and regenerate, or commit a script change so the manifest
  reproduces. Red does not force the choice, but the closeout reviewer must see one of the
  two states, not a silent hand-edit.
- `build-site-assets.py` does NOT copy `vector/square` or the favicon yet. FR-2 and FR-3
  need an explicit copy step (`scripts/` or tracked shell) plus the component edits.
- FR-2 touches the product card components and product pages listed below. Do not touch
  `/images/*` hero screenshots; only the 700 px product rasters named above.

## Phase 2: Checks — risk `low`

Read-only browser captures against the built app. No source change.

### Red command (capture still missing, so Red is "captures absent")

`bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/www-real-logos/apps/www-reading-advantage && pnpm test:e2e'`

The Phase 2 Red is the absence of the capture files under the PR path (named below). Green
is the capture files existing, non-empty, and showing the header, footer, and product
pages in light and dark.

### Captures and live-behavior proof

- Header, footer, and product pages (light and dark) to PR and Daniel.
- Save each capture as a non-empty PNG at a committed path under
  `measure/tracks/www_real_logos_20261008/captures/`. A capture file that is 0 bytes or
  missing fails the phase.
- Assert in the capture step that the served `/favicon.ico` and `/{locale}/favicon.ico`
  return the new ICO bytes (not the old placeholder), and no `<img>` returns 404.

### Closeout gate

- All named captures exist and are non-empty.
- The PR handoff names the capture paths.

## Intentionally-red aggregate-suite handling

- Before Green, the three Phase 1 Red files MUST fail. Do not `skip` them or use
  `passWithNoTests` to mask an empty run. The fail reason must be "file missing" or
  "literal still referenced", not a config error.
- The whole-package `vitest run` is expected red until Phase 1 Green lands. The orchestrator
  reports Red as the expected pre-state and does not treat it as a broken environment.

## Artifact/documentation tests vs live-behavior tests

- Artifact tests: the mapping shape and the no-removed-literal sweep. These assert
  code/files, not rendering. They can pass with a broken visual result.
- Live-behavior tests: the `node:fs` existence checks (a mapped path must be a real file)
  and the Phase 2 browser captures. Only these prove a page renders the real logo. The
  strategy requires BOTH; a green mapping test alone is not evidence (anti-pattern A5).

## Review gates

| Gate | Phase 1 | Phase 2 | Reason |
|---|---|---|---|
| Review A (correctness) | apply | skip | Code-level diff review; Phase 2 changes no source. |
| Review B (security) | apply (light) | skip | Static swap; confirm no path traversal from source copy and no dead-path 404 in prod. No data/auth surface. |
| Review C (UX/API contract) | apply | apply | `site-assets.ts` and product components are a changed public contract in P1; visual contract in P2. |
| Adversarial testing | apply | apply | P1: attack FR-5 (a stub path that passes the sweep but 404s); P2: attack captures (dark-mode, missing file). |
| UX browser review | skip | apply | P1 has no rendered output; captures are P2's whole point. |

Reason for each skip is stated. No gate is skipped silently.

## Anti-pattern coverage

- A3 (digit-only count): Red enumerates the 10 IDs and the literal path set; no bare
  `.length` or digit regex. A3 defense = explicit labeled enumeration.
- A4 (vacuous pass on nothing-done): Red must fail on missing files before Green; the
  file-existence assertions must count a non-empty file set (≥1 per product).
- A5 (false-claim vs reality): Phase 2 must save non-empty capture files at committed
  paths; the PR handoff must cite those paths, not a prose "logos render".
- A7 (over-broad filter): the no-removed-literal sweep asserts each literal has zero hits
  individually; no `rg -v` word exclusion.
- A9 (archived track path): not applicable; this track moves nothing to archive.
- A10 (generated-facts drift): the "generated, do not edit by hand" manifest contract must
  be kept by regenerating via the script or committing the script change that reproduces it.
- A1, A2, A6, A8, A11, A12, A13, A14, A15, A16: orchestrator-infra anti-patterns; not
  applicable to a static-asset chore. A12 noted: this strategy cites no guard test file;
  it names only tests Mid will write.

## `phase_base_sha` capture point

After this strategy commit lands on `www/real-logos`, the orchestrator records
`git rev-parse HEAD` as the immutable `phase_base_sha` for Phase 1 Red. Do NOT reuse
`649ddca75` (it predates the committed strategy). `role_base_sha` equals the same commit.