# Archer's Revenge — Batch B evidence method v6

Collector: `evidence-collector-archers-revenge-batch-b-v6`
Role base: `9de8a51d236e1fd9b8a4413ecc9d65da1500b129`

## Remediation boundary

This is an additive collector package addressing `T4B7-HIGH-003`. The V3 ledger,
V4/V5 reports, mapper artifacts, browser artifacts, reviews, and tests are not
rewritten. The V6 ledger adds exact source envelopes for every reachable
source-backed mechanic and rendered/integration surface identified in the
focus requirements. No mapper, browser, review, truth-test, candidate,
acceptance, or manifest work was performed.

## Source method

Facts are read from reachable historical revision
`cd1936387d136ffb12e77a647f36cbce2d1fdd4e`. Text atoms record path, inclusive
LF-terminated line range, whole-blob SHA-256, and cited-range SHA-256. Each
record is one proposition. Historical source remains historical-only: it does
not establish current route, runnability, live input, persistence success, or
responsive observation. The four inherited V3 fixtures remain separate; V6
adds four fixtures for currentness promotion, compound claims, responsive
observation, and completion success.

## Coverage boundary

The added atoms cover configuration/difficulty, formation spawn, target and
shield state, firing and projectile lifecycles, enemy motion, wave transitions,
health and defeat, XP, start/instruction, active HUD and actors, camera,
responsive composition, results, vocabulary loading, and completion request
construction. Escort, named defense-zone geometry, pause, and audio usage have
no reachable source-backed atom in the bounded files and are recorded as
not-present rather than fabricated.

## Verification

Validate both JSON documents with `python3 -m json.tool`, re-derive every
whole-blob and cited-range hash from the source revision, assert unique claim
and fixture IDs, and run `git diff --check` on the four additive outputs.
Acceptance is not claimed and the downstream mapper/review must bind this
ledger by exact hash.
