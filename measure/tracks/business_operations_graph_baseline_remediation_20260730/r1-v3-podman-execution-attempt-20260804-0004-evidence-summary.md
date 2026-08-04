# R1-v3 Podman Execution Attempt 20260804-0004 — Evidence Summary

**Date:** 2026-08-04 (launched ~20:33 +0700, exited ~21:11, ~40 min runtime)
**Outcome:** BLOCKED — `direct-runtime-trace` stage, `PHASE_LEVEL_FAILURE`
**Significance:** First attempt where the full fail-closed evidence chain worked end-to-end (H7 parse/validate, H8+H10 phase-level preservation, H9a divergence detail).

## Blocking error (verbatim `phaseLevelFailure.errorDetail`)

```
V3_DIRECT_RUNTIME_READ_SET_EXECUTION_TRACE_BIJECTION_FAILED: {"baselineReads":{"extra":[],"extraTotal":0,"missing":["packages/advantage-play-kit/scripts/generate-standard-pack-release.mjs"],"missingTotal":1},"derivedBuildReads":{"extra":[],"extraTotal":0,"missing":["packages/advantage-play-kit/dist/assets/index.js"],"missingTotal":1},"divergenceSha256":"2db70dfa7afb7ff9a4dfa6300eb04ed7b47e79e410380ce413416d2b5b819c60"}
```

## Diagnosis (H9b)

Exactly two declared files were never traced:

| Bucket | Missing path | Why untraced |
|---|---|---|
| `baselineReads` | `packages/advantage-play-kit/scripts/generate-standard-pack-release.mjs` | Generator entrypoint — read by Node's **sync** CJS module loader, not `fs.promises` |
| `derivedBuildReads` | `packages/advantage-play-kit/dist/assets/index.js` | Built asset read via sync fs path |

Root-cause hypothesis: the in-container tracer (`direct-runtime-fs-promises-wrapper.mjs`) wraps only `fs.promises`; synchronous reads (`readFileSync`, CJS module load) bypass it. Zero `extra` events in any bucket — the generator touches nothing undeclared. The 1,895-vs-1,911 directory discrepancy hypothesized in H7 did NOT materialize.

## Evidence retention

The preserved attempt dir `r1-v3-podman-execution-attempt-20260804-0004/` totals **414 MB** (failed-attempt.json 367 MB embedding the full trace envelope + `raw/` command streams) — above sane git object size. Full artifacts are retained on local disk; this summary + the SHA-256 manifest (`r1-v3-podman-execution-attempt-20260804-0004-manifest-sha256.txt`) are committed in their place.

- `failed-attempt.json` sha256: `6fbddb9d9f0b7558c72f192f4f15d9bd1f85a1ad0bd6c1465896a2b40d89ac11` (valid JSON, `status: "BLOCKED"`, `kind: "execution-closure-failed-attempt"`, 60 raw stream refs)
- Launch log: `/tmp/opencode/r1v3-attempt-20260804-e.log`

## Slices validated by this attempt

- H6 (trace-event cap incl. `directoryListingCount`): generator no longer hits the cap
- H7 (`DIRECTORY_ENUMERATION` declare+validate): 1,895 readdir events parsed and validated
- H8+H10 (phase-level preservation): evidence published on a trace-capture-phase failure
- H9a (bijection detail): exact divergent paths named in preserved evidence
