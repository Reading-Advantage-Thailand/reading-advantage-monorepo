# Magic Defense — Evidence Collection Method v2 (cycle 2 remediation)

Collector: `evidence-collector-magic-defense-v2:t4-batch-a:2026-07-20`
Phase base (immutable, orchestrator-supplied): `9228c5c5`
Role base (HEAD at role start): `141ded71a7b4849b5773afa80587218c91bff61d`
Artifact: `magic-defense-claim-ledger-v2.json` — 110 claims (108 preserved from v1, 2 corrected).

## What was corrected and why

The cycle-1 truth-test-author detected two fabricated citation envelopes in the v1
ledger; the detection is recorded in the truth-test receipt bound at commit
`5464dc6b` (`role-receipts/truth-test-author-batch-a.json`:
"2 fabricated citation envelopes: MD-HIST-001, MD-HIST-002") and in
`_orchestrator/LAST-BATCH-STATUS.md` (cycle-1 stop-loss table).

| claim | v1 (fabricated) | v2 (corrected) |
|---|---|---|
| MD-HIST-001 | blob `e3b0c442…b855` (SHA-256 of the empty byte string), range `01ba4719…546b` (SHA-256 of a single `\n`), lines 1..1 | blob `a05dc35f…556d`, whole-file range 1..14, `cited_range_sha256 = a05dc35f…556d` |
| MD-HIST-002 | same fabricated blob/range hashes over a claimed 1..14 range | blob `a05dc35f…556d`, lines 2..13 (exactly the 12 entry lines), `cited_range_sha256 = fc872cf1…e9a6` |

Both v1 claims' *text* was true (the file was deleted in `8b98aed0`; it contained
12 Thai→English entries) — only the citation envelopes were fabricated. The v2
entries preserve `claim_id`, `category`, `game`, `scene_or_state_id`, `file_path`,
`revision`, `confidence`, and `evidence_class`, and add `supersedes`,
`supersedes_claim_id`, `supersedes_commit: "6998570b"`, `corrected_by`, and the
v2 `collector_agent` identity.

## Mode selection: A (additive supersession)

Before choosing, every non-fixture v1 citation (105 claims) was independently
re-verified in this fresh context using the truth-test-author's own
`resolve_claim_citation` from `batch-a-truth-tests.py` (imported, not re-implemented).
Result: exactly 2 failures — MD-HIST-001 and MD-HIST-002 (both
"blob_sha256 mismatch at 097545f1"). All other 103 non-fixture claims and the
5 negative fixtures resolve cleanly. Because no additional fabrication exists,
Mode A applies: the v2 ledger preserves the 108 good v1 entries verbatim and
replaces only the 2 fabricated envelopes. The `supersession_log` in the v2
ledger envelope documents both replacements.

## Procedure and computed hashes

1. `git rev-parse HEAD` → `141ded71a7b4849b5773afa80587218c91bff61d` (role base).
   `git cat-file -t 9228c5c5` → `commit` (phase base resolves).
2. `git show 097545f14a8029d0c3451e3514841f9c5bf3e1c2:apps/advantage-games/public/vocab/magic-defense.json | sha256sum`
   → `a05dc35f80130771bf0340794717f830793c9a9fa712f846514b08f45f4d556d`
   (matches the orchestrator-pinned real blob hash). The blob is 14 content
   lines + trailing newline (`split("\n")` yields 15 elements, last empty) —
   this is the "15 lines total" referenced by the dispatch.
3. MD-HIST-001: whole-file citation. `cited_range_sha256` = SHA-256 of
   `'\n'.join(lines[0:14]) + '\n'` = `a05dc35f…556d` (equals blob hash;
   resolver class `whole-file`).
4. MD-HIST-002: entry-lines citation. `cited_range_sha256` = SHA-256 of
   `'\n'.join(lines[1:13]) + '\n'` =
   `fc872cf1fa3cc60af64ede85b53ff4a7407a11d0cc4ef20ed60ca9806ee7e9a6`
   (resolver class `range`). The cited text is exactly the 12 entry objects
   (picture, puppy, cat, happy, fun, quiet, boy, girl, mom, building, library,
   friend).
5. `git log --diff-filter=D --oneline -- apps/advantage-games/public/vocab/magic-defense.json`
   → sole deletion commit `8b98aed0` ("feat(games): publish first APK catalog
   wave (track_id: apk_catalog_cutover_w0_20260710)"), re-confirming
   MD-HIST-001's claim text.
6. Dry-run verification of the finished v2 ledger with the truth-test-author's
   `resolve_claim_citation`: 105/105 non-fixture claims resolve
   (MD-HIST-001 → `whole-file`, MD-HIST-002 → `range`); 5 fixtures retain
   dispositions (1 FAIL, 4 REJECT). Exit 0.

## Independent re-verification statement (Mode A)

The 108 non-corrected v1 entries were not re-derived from scratch (that is Mode B);
they were instead *independently re-verified* in this fresh context by executing
the truth-test-author's citation resolver against the live git object store. All
108 resolve. No v1 prose, interpretation, or hash outside MD-HIST-001/002 was
trusted without that mechanical re-verification.

## v1 artifacts untouched

`magic-defense-claim-ledger.json`, `magic-defense-evidence-method.md`,
`magic-defense-evidence-final-report.json`, and
`role-receipts/evidence-collector-magic-defense.json` were read but not modified
(immutability per the claim-evidence contract; supersession is additive).
