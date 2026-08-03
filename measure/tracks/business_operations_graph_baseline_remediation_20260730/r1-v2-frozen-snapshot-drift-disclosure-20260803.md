# Frozen-Evidence Drift Disclosure and Restoration (2026-08-03)

## Event

At 16:09:05-16:09:08 (+0700) on 2026-08-03, the eight frozen R1 v2 snapshot
files under `r1-task2-source-and-graph-v2-20260801/` (`snapshot.archive.json`,
`snapshot.manifest.json`, `snapshot.pre-state.json`, `snapshot.post-state.json`,
and the four `snapshot.r0.*` projections) were modified in the working tree by
a process outside the business-operations track. The delta was a pure path
rename: references to `measure/tracks/apk_legacy_defense_cutover_20260727/...`
were rewritten to `measure/archive/apk_legacy_defense_cutover_20260727/...`
after that APK track was moved from `tracks/` to `archive/` during the same
session. The business-operations orchestrator and its delegates did not make
or authorize this edit; every business-ops slice diff this session was
git-verified against committed pre-Green states.

## Why this is a violation

The R1 v2 snapshot is hash-bound frozen evidence bound by the Terra/Sol v2
review receipts and commit `772839f`. Post-acceptance mutation of the frozen
snapshot — including well-intentioned path synchronization — is forbidden by
this track's fail-closed scanner-input contract. The accepted bytes were never
at risk: they remain immutable in Git at `772839f`; only working-tree copies
drifted.

## Restoration

`git checkout 772839f -- measure/tracks/business_operations_graph_baseline_remediation_20260730/r1-task2-source-and-graph-v2-20260801/`
restored all eight files byte-for-byte; `git status --porcelain` for the
directory is empty, proving byte-identity with the accepted commit. No
re-binding, re-scan, or re-acceptance is required because restoration is to
the accepted bytes, not to newly produced content.

## Standing instruction

The `r1-task2-source-and-graph-v2-20260801/` directory is frozen evidence.
Track archival, path-sync, or cleanup automation must never write to it (nor
to any other committed evidence directory of this track). APK-side agents and
the Measure daily automation must treat committed evidence under
`measure/tracks/business_operations_graph_baseline_remediation_20260730/` as
read-only; a needed path correction requires a new bounded slice in this
track, not an in-place edit.

## Scope

This disclosure records the drift and restoration only. It does not change any
task marker, does not accept R1 v3, and does not unblock R2 Tasks 3-5, R3,
Admin S1, or CRM.
