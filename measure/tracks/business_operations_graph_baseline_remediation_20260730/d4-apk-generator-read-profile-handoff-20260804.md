# D4 Handoff: APK-Side Generator Read Profile (2026-08-04)

## What this is

Split-by-surface handoff. The APK side owns what the standard-pack generator
actually reads; the business-operations side owns the runner, the read-set
discovery, and the cap formula. This document supplies the APK-side facts so the
D4 fix can be written against measurement rather than hypothesis.

It changes no code, no frozen evidence, and no marker. It is additive evidence
only.

## Headline

`maxEvents` is denominated in **declared file paths**. The tracer counts
**`node:fs/promises` operations**. Directory enumeration is an operation with no
file path, so every `readdir` consumes an event that the formula never budgeted.

The generator issues roughly **1,900 `readdir` calls** against a cap with **2
events of slack**. That is the entire overage.

## Measured inputs

All counts derived from baseline commit `e78fe22bb405de732de14c18590b19af0ce5f0de`.

| Quantity | Value | Source |
| --- | --- | --- |
| Files under `packages/advantage-play-kit/assets/standard` | `43,138` | `git ls-tree -r --name-only` |
| Of those, ignored by the generator (`.md`/`.txt`/`.tsv`/`.json`) | `63` | `ignoredExtensions` in the generator |
| Supported assets actually read | `43,075` | `43,074` PNG + `1` OGG |
| Directories (all ancestors, incl. `standardRoot`) | `1,911` | ancestor set over the baseline tree |
| Directory listings recorded by discovery | `1,895` | `discovery.directoryListingCount`, attempt 0002 |

## The generator's exact `node:fs/promises` profile

From the baseline blob of
`packages/advantage-play-kit/scripts/generate-standard-pack-release.mjs`
(`ea4e0724…a35edbb6`, 5,081 bytes):

1. `readFile(IMPORT-RECEIPT.tsv)`, `readFile(CURATED-RECEIPT.tsv)`,
   `readFile(LICENSE-RECEIPT.tsv)` — **3 events**.
2. `discoverAssets(standardRoot)` — recursive `readdir(directory, {withFileTypes: true})`,
   recursing into every entry where `entry.isDirectory()`, so **one `readdir` per
   directory**: **1,895–1,911 events**.
3. `physicalMetadata(paths)` — `readFile(join(standardRoot, path))` per supported
   asset: **43,075 events**.
4. `writeFile(outputPath)` — **1 event**.

**Total: ≈ 44,974 – 44,990 operations.**

## The cap, and why it is short

From attempt `r1-v3-podman-execution-attempt-20260804-0002`:

- `tracePolicy.maxEvents` = **43,081**
- `derivedBuildReadSet` = **1** entry (`packages/advantage-play-kit/dist/assets/index.js`)
- `outputPaths` = **1** (`.../assets/standard/standard-pack-release.json`)
- Therefore `baselineReadSet` = **43,079**, which matches
  `preflightQuota.maxEntries: 43079` exactly.

File-shaped events the formula budgets: `43,075` assets + `3` receipts + `1`
output = **43,079**, against a cap of `43,081` — **2 events of slack**.

Overage is therefore `1,895 – 2 = 1,893` (using discovery's own count) or
`1,911 – 2 = 1,909` (using the baseline tree). The failure is not marginal and
not a discovery under-count of files: **every file the generator reads is already
declared.**

`preflightQuota.observedBytes` equals `maxBytes` exactly at `163,334,591`, which
is a second signal that the model is dimensioned purely in files.

## Two findings for the runner side

**D4-a — the cap omits a quantity discovery already measures.** `maxEvents` is
`len(baselineReadSet) + len(derivedBuildReadSet) + len(outputPaths)`. Discovery
independently records `directoryListingCount: 1895` and the formula ignores the
field. The arithmetic fix is available from data the runner already has.

**D4-b — raising the cap alone will not make the attempt pass.** The wrapper's
`record()` (runner lines ~5674-5688) resolves each traced path against
`baselineByPath` then `derivedByPath`, and falls through to
`append("UNDECLARED", …)`. A directory is in neither map, so all ~1,900 `readdir`
events classify as `UNDECLARED`, and the trace policy rejects undeclared events.
The read-set model has **no representation for directory enumeration**. This
needs a design decision, not a constant change:

- model directory listings explicitly (a third declared set, counted in the cap
  and matched by `record()`), or
- exclude `readdir` from tracing entirely, accepting that directory structure is
  then unproven, or
- have discovery enumerate directories as first-class read-set entries.

The first preserves the bijection property the trace policy exists to enforce.
The second is cheapest and weakest. I have no standing to pick among them —
that contract is business-track surface.

## One discrepancy worth resolving

My ancestor-set count over the baseline tree is `1,911`; discovery recorded
`1,895`. A 16-directory gap. It does not change any conclusion — both numbers are
about 1,900 against 2 slots of slack — but whichever number the fix uses should
be the one that is right, and I did not chase it because the discovery walk is
runner code.

## Method, for re-derivation

    git ls-tree -r --name-only e78fe22bb405de732de14c18590b19af0ce5f0de \
      -- packages/advantage-play-kit/assets/standard | wc -l          # 43138

    # supported = total minus the generator's own ignoredExtensions set
    … | grep -Eiv '\.(md|txt|tsv|json)$' | wc -l                       # 43075

Cap and read-set decomposition were read directly out of attempt 0002's
`failed-attempt.json` with `grep -n` and `sed -n` on line ranges; the file is
366 MB and must not be `json.load`ed on a machine with 2 GB free — see D3.

## Scope

APK-side evidence only. This accepts nothing, unblocks nothing, and does not
change Phase R1 v3, which remains `[~]`. The wrapper, the cap formula, the
discovery walk, and the read-set contract are business-track surface and are
untouched here.
