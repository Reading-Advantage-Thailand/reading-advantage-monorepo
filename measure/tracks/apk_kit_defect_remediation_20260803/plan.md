# Plan: APK Kit Defect Remediation

Contract-first TDD per finding. One atomic commit per phase. Implementer:
coder subagent per session routing; orchestrator verifies gates.

## Phase 1 — High defects (D1–D3)

- [ ] 1.1 D1 mount-failure listener leak (`runtime.ts`): red test asserting
  listeners/styles are cleaned up when composition resolution throws at mount;
  fix; green.
- [ ] 1.2 D2 permanent pause after transient unsupported viewport
  (`runtime.ts`): red test (fail → viewport recovers → game resumes); fix; green.
- [ ] 1.3 D3 vertical drag unreachable (`input-actions.ts`): red tests for pure
  vertical drag and dominant-axis selection under default threshold; fix; green.
- [ ] 1.4 Package gates green (`test`, lint, `tsc --noEmit`); commit phase 1.

## Phase 2 — Medium defects (D4–D9)

- [ ] 2.1 D4 single-completion unhandled rejection.
- [ ] 2.2 D5 dead native-cell-size guard (decide intended `NATIVE_VIEWS` subset;
  record decision in deviation notes if contract-visible).
- [ ] 2.3 D6 restart chain recovery.
- [ ] 2.4 D7 pointer capture / off-surface release.
- [ ] 2.5 D8 order-insensitive structural equality (reuse `stableJson`).
- [ ] 2.6 D9 host effect stability (refs for volatile callbacks).
- [ ] 2.7 Package gates green; commit phase 2.

## Phase 3 — Low defects (D10–D17)

- [ ] 3.1 D10 restart-after-failed-mount false ready.
- [ ] 3.2 D11 QC zero-sample pass.
- [ ] 3.3 D12 backslash traversal check.
- [ ] 3.4 D13 scaffold emission (JSX escape + digit-leading id).
- [ ] 3.5 D14 deep-freeze manifests/bindings.
- [ ] 3.6 D15 transition-coordinator resume guard.
- [ ] 3.7 D16 Web Crypto guard.
- [ ] 3.8 D17 return validated data.
- [ ] 3.9 Package gates green; commit phase 3.

## Phase 4 — Verification and closeout

- [ ] 4.1 Fresh independent re-review of all fixes (read-only); zero
  Critical/High unresolved.
- [ ] 4.2 `build-graph update` for changed files.
- [ ] 4.3 Retrospective note; flip metadata to complete; commit closeout.

## Notes

- Blast radius: package-internal; consumers are Reading/Primary host-proof
  clients and advantage-games QC. After each phase, run Reading host-proof jest
  suite as a consumer smoke gate.
- D5 and D9 may be contract-visible; record decisions in metadata
  `deviation_notes`.
