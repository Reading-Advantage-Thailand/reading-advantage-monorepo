# Pin refresh cost analysis

> Track `architecture_ci_input_pin_20261110`, phase P1, task 1.4. Written 2026-11-11 at role base `0a5b2bc425d908502069e18a00c1098b775c8828`.
> Method: read of the code only. No heavy run, no test run, no analyzer run.
> Labels: `[read]` is a fact read from the code or a file. `[guess]` is an estimate.
> Facts from the orchestrator, used as given: 6,848 tracked `.ts`, `.tsx`, `.mts`, and `.cts` files; one Node process gives no CPU parallelism; the machine's disk is 97% full.

## 1. The passes and the projections of one refresh

The refresh CLI is `packages/architecture-enforcement/src/architecture-pin-refresh-cli.ts`.

| Step | Call site | Analyzer passes | Projections | Input snapshot hash runs |
|---|---|---|---|---|
| Probe | `checkArchitectureRepository` at `architecture-pin-refresh-cli.ts:152`, analyzer at `architecture-check.ts:210` | 1 | 0 | 0 |
| Report hash | `computeAnalyzerReportSha256` at `architecture-pin-refresh-cli.ts:163`; projection at `v2-manifest-validation.ts:900`; reports at `:904` and `:905` | 2 | 1 | 0 |
| Input snapshot | `computeAnalyzerInputSnapshotSha256` at `architecture-pin-refresh-cli.ts:166`; projection at `v2-manifest-validation.ts:818` | 0 | 1 | 1 |
| Validation, sync snapshot | `validateAnalyzerReconciliationManifestV2` at `architecture-pin-refresh-cli.ts:200`; sync validator `v2-manifest-validation.ts:926`; sync projection `:843` | 0 | 1 | 1 |
| Validation, async | projection `v2-manifest-validation.ts:996`; snapshot `:1009` creates its own projection at `:818`; reports `:1010` and `:1011` | 2 | 2 | 1 |
| Tree hashes | `architecture-pin-refresh-cli.ts:170` and `:172`; fixed small path lists at `reconciliation-manifest.ts:579-591` and `:594-606` | 0 | 0 | 0 |

Totals for one refresh `[read]`:

- `analyzer_passes=5`.
- `projections=5`.
- `input_snapshot_hash_runs=3`.
- `tree_hash_checks=2`, each over a small fixed list.

The probe skips its own manifest validation, because the refresh supplies `config` and `policyVersion` at `architecture-pin-refresh-cli.ts:152-156` and `architecture-check.ts:169` gates that block on `options.config === undefined` `[read]`.

The async validation computes the input snapshot at `v2-manifest-validation.ts:1009` even when `validateInputSnapshotPin` is `false`. The guard at `:1026` covers only the comparison, not the computation `[read]`. CI mode pays that snapshot cost too.

Each projection runs `git ls-tree -r --name-only HEAD` over the whole tracked tree, then `git archive HEAD -- <analyzer input paths>`, then `tar -xf` into a new temporary directory (`v2-manifest-validation.ts:262-278` and `:307-324`) `[read]`. Five projections per refresh therefore copy the analyzer input set five times.

## 2. The likely super-linear step

**Primary candidate: a full-file AST walk inside a per-node loop `[read]`.**

- `moduleSpecifierForBinding` (`analyzer.ts:1913-1944`) walks the complete source file with `ts.forEachChild` (`:1918-1943`), and it returns only one binding's specifier.
- `configuredTableResourceForExpression` calls it at `analyzer.ts:1999`.
- `configuredResourcesForExpression` (`analyzer.ts:2150-2174`) calls `configuredTableResourceForExpression` at `:2158`.
- The v2 branch calls `configuredResourcesForExpression` for every argument of every call or new expression: `analyzer.ts:2775` and `analyzer.ts:2856`.
- Cost: O(executable argument nodes × AST nodes in one file). A new-expression or call loop over all nodes contains a full-file loop over all nodes. This is the "loop over all nodes inside a loop over all nodes" pattern the orchestrator named `[read]`.

Magnitude `[guess]`: 6,848 files, about 1,000 to 2,000 AST nodes per file, and about 30 to 100 property-access arguments per file. That is roughly 0.3 to 1 billion node visits per pass. At an effective 5 to 20 million visits per second, that is 15 to 200 seconds, and more in files with many query calls.

**Secondary candidate: a full evidence scan per module `[read]`.**

- `parseArchitectureModule` builds `evidence` with `[...evidenceByKey.values()].filter(...)` at `analyzer.ts:1408-1410`.
- `analyzeArchitectureSources` calls it once per module at `analyzer.ts:2511`.
- Cost: O(modules × evidence entries), about 6,848 × the evidence count. Each call also allocates a full copy of the evidence array `[read]`.
- Magnitude `[guess]`: 20,000 to 60,000 evidence entries, so 1.4×10^8 to 4×10^8 copies and comparisons per pass.

**Minor candidate `[read]`.** `module.evidence.find` at `analyzer.ts:2013` scans the module evidence per table-resource inference. The module evidence is small after the per-module index exists.

**Steps that are not the main cause `[read]`.**

- `evaluateOwnership` calls are memoized by `decisionKey` at `analyzer.ts:2553-2567`, and each evaluation walks a small rule and matcher list (`ownership-map.ts:183-250`).
- `computeBindingOrigins` uses a worklist over origin maps (`analyzer.ts:1653-1666`) and a bounded export-name fixed point (`:1573-1596`).
- `collectDrizzleTableExports` (`analyzer.ts:1839-1910`) iterates links over small Drizzle export name sets.
- `sourceLocation` (`analyzer.ts:834-842`) uses TypeScript's line map, which is a binary search over cached line starts.
- Parsing with `ts.createSourceFile` (`analyzer.ts:959`) is linear in the file count.

**Conclusion `[guess]`.** The measured 90 minutes over 5 passes is about 18 minutes per pass. Parse alone is minutes. The repeated full-file AST walk is the only read pattern that grows faster than the file count and the evidence count, so it is the likely cause of the rest.

## 3. Two proposals

### (a) One projection and one pair of report passes, shared by the refresh and its validation

Change: add one exported evidence function in `v2-manifest-validation.ts`. It creates one projection, runs the two reports for the byte-identity check, computes the input snapshot over the same projection, computes the two tree hashes, and returns `{sourcePaths, reportSha256, inputSnapshotSha256, analyzerTree, implementationTree, parseErrors}`. Add an option to `validateAnalyzerReconciliationManifestV2` that accepts this evidence and skips its own projection, its sync snapshot, and its two reports. The validator keeps the structural checks, the report comparison, the canonical source check, and the debt comparison.

- Passes: 5 to 2 (`analyzer_passes=2`).
- Projections: 5 to 1 (`projections=1`).
- Input snapshot runs: 3 to 1.
- Expected cost per piece `[guess]`: 2 × pass cost + 1 projection + 1 snapshot. At the current 18 minutes per pass that is about 36 minutes, which is still over the 30-minute limit. At a pass cost near 5 minutes it is about 10 minutes and fits.
- Cost to build `[guess]`: one new exported function and one validator option. The refresh CLI changes by about 20 lines. The named test file must stay unchanged; the existing 20 cases already cover the skip and the refresh contract.
- Risk: the probe's independent analysis-error path disappears. The shared evidence must expose `parseErrors` and the refresh must still exit 2 on them.

### (b) A split per app with its import closure, or a per-file cache

Split: analyze each app with the packages it imports, pin each piece, and combine the pieces.

- Expected cost per piece `[guess]`: an app is about 5 to 15% of the analyzed files. One piece with one pass fits in 30 minutes on the current cost curve.
- Manifest change `[read]`: the shape is fixed by `V2_MANIFEST_KEYS` (`v2-manifest-validation.ts:90-106`) and the strict key check at `:569-576`. One pin per piece needs either one new manifest per piece, which is a new hash artifact and conflicts with `AGENTS.md:80-94` and spec D-6, or arrays for `analyzerInputSnapshotSha256` and `reportSha256s`, which is a contract change and a broader hash.
- CI change `[read]`: the check must recompute every piece and combine the results. The report hash binds the exact source path list (`analyzer.ts:116-125`), so each piece needs a disjoint path list and one deterministic combine rule.
- AC-2 risk `[read]`: a new analyzed file that no piece lists would change no piece report, so CI would pass. To keep AC-2, every tracked analyzed path must fall into exactly one piece by an explicit rule, and a new file under any app root must join that app's piece. A test must pin this rule.
- A cache: a per-file parse cache keyed by the exact path and the exact bytes keeps AC-2. A new or changed file gets a new key, so the piece report changes and CI still fails. A cache keyed by app or by directory does not keep AC-2, because a new file in a cached directory would not be parsed.

## 4. Recommendation and the plan change

**Recommendation.** Do (a) and fix the per-file full-AST walk first: index the binding specifiers per module and index evidence by source path. The combined change takes the refresh from 5 passes and 5 projections to 2 passes and 1 projection, and it keeps the manifest fields and AC-2 unchanged. Then re-run the refresh inside the 30-minute limit.

**Plan change.** Add a new task `1.4a`, Red first, before task 1.4:

> `1.4a Red then Green: pin refresh cost. Write a Red test that fails at HEAD: a module-facts index replaces the full-file walk in `moduleSpecifierForBinding`, and one shared evidence run replaces the duplicate report and snapshot passes. Green must make `pnpm architecture:pin:refresh` finish under 1800 s at this HEAD, keep the 20 cases of `architecture-ci-input-pin.test.ts` green, and add no manifest key and no hash field.`

The acceptance gate for `1.4a` is the refresh under 1800 s through heavy-run, plus the unchanged named test file. Task 1.4 reruns after `1.4a`.
