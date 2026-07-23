# Storm the Castle Tower — Batch B evidence method

## Frozen pre-source budget

Before any Storm the Castle Tower game-source object was read, this collector adopted the committed `evidence-collector-batch-b` ceiling from `batch-b-budget-declaration.json` without modification.

| Unit | Ceiling |
|---|---:|
| source bytes read | 52428800 |
| source files/objects read | 120 |
| command invocations | 80 |
| elapsed minutes | 45 |
| claims or records authored | 300 |
| browser interactions | 0 |
| captured browser artifacts | 0 |
| asset candidates inspected | 3 |

Budget-declaration SHA-256 and actual labeled integer usage are finalized in the collector report and receipt. Browser work is outside this role.

## Exact-revision collection method

1. Verified the frozen baseline and read the committed Batch B strategy, budget, applicability, discovery audit, specification, program, cohort protocol, and accepted denominator inputs. Their SHA-256 values are enumerated in the final report and receipt.
2. Selected only the Storm the Castle Tower identity. No Village Guardian or Archer's Revenge source was read for behavior.
3. Re-derived the current identity from `gameCards.ts` at baseline `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286`. The raw card literal and exported withdrawal mapping were recorded separately so the raw `playable` literal could not become a current-playability claim.
4. Ran a bounded tree query over `apps/advantage-games/src`, `apps/advantage-games/public`, and `packages/game-cartridges/src`. The only slug-bearing baseline path was the gameplay PNG. The exact output, exit status, output hash, and domain are in `SCT-Q-BASELINE-TREE`.
5. Read the 13 accepted historical source candidates only at their reachable historical revisions. App source is bound to `4106ba39547c8cac7645ce0f257a6bdd133712e9`; cartridge source is bound to `1a21fb951e27bb4df8a5e8f7b1685cea9e6efb9f`. Exact scoped deletion queries bind them to later deletion commits. All four revisions are ancestors of the frozen baseline.
6. Used implementation files for behavior claims. Catalog copy, documentation, graph data, and tests were not used as runtime-behavior evidence. Test claims state only what historical test artifacts assert.
7. Computed every text blob and inclusive-range SHA-256 from `git show REV:path` bytes. Text ranges retain exact source LF bytes with no normalization. The PNG uses a whole-file byte envelope and direct IHDR parsing.
8. Reconciled one accepted identity record, eight source records, three asset records, thirteen historical records, and zero current scene/state/transition or route-candidate records exactly once. Documentation and metadata records remain explicit non-runtime dispositions rather than disappearing.
9. Ran exact-string asset-reference searches independently against the current baseline source domains, the historical app domains, and the historical cartridge directory. All three zero-match outputs and exit status 1 are retained as bounded absence evidence.
10. Authored four rejected fixtures. They cover hash-valid semantic overstatement, directory citation, plausible fabricated current route/asset behavior, and generic keyword-responsive/template promotion. Fixtures are excluded from factual-claim totals.

## Temporal boundary

- **Current:** a catalog identity exists, is in the withdrawn set, and is exported as `coming-soon` with no href. One gameplay PNG exists.
- **Historical:** deleted React/Konva app source and deleted Phaser cartridge source are available at two exact revisions. Their facts remain separate and historical.
- **Unknown:** current runnability, live route behavior, compact/wide usability, and physical gameplay-PNG usage were not established.
- **Absence:** only the exact bounded tree and exact-string search domains recorded in the ledger are covered; no repository-global absence is claimed.

## Denominator and category coverage

Identity, route, implementation, copy, test, asset, and history inputs are reconciled in the ledger. The accepted current scene/state/transition denominator and route-candidate count are zero. Historical source establishes deleted states and transitions without changing that current denominator. Mechanic, learning, responsive, asset, and developer-effort summaries in the final report resolve only to ledger claim IDs.

## Resource accounting

Actual usage is `source_bytes_read=104670`, `source_files_or_objects_read=14`, `command_invocations=32`, `elapsed_minutes=31`, `claims_or_records_authored=100`, `browser_interactions=0`, `captured_browser_artifacts=0`, and `asset_candidates_inspected=3`. Each integer is at or below the frozen ceiling. The command total includes the failed first verification and its diagnostic; neither is hidden. Source bytes are the sum of unique exact game-source blobs directly inspected; accepted manifests and protocol inputs are separately enumerated by hash.

## Verification

The collector verification parses all three JSON outputs, recomputes every positive text/binary envelope and bounded-query output hash, checks totals and denominator uniqueness, runs `git diff --check`, and confirms only the four authorized output paths are newly changed by this role. No product source, existing artifact, strategy, budget, applicability, discovery, plan, or registry file was altered.
