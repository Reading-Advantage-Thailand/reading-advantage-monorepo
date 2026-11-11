# Spec Review — architecture_identity_provider_debt_20261111

Author model: claude-code/claude-sonnet-5-5

Review kind: author self-check. No independent `measure-spec-review` subagent ran in this session. The orchestrator can run one before Phase 0.

## What this track proposes

The track fixes 111 architecture findings in code and removes them from the v1 baseline. The findings belong to four rules: `COMPANY_IDENTITY_PRODUCT_ISOLATION` (93), `COMPANY_IDENTITY_DB_BOUNDARY` (5), `AI_PROVIDER_BOUNDARY` (11), and `INTEGRATION_PROVIDER_BOUNDARY` (2). The PM accepted them as debt on 2026-11-11 until this track closes. The track starts not before 2026-11-21 and is due 2026-12-15.

## How the scope was derived

The scope is the entries of `/report/comparison/additions` in `measure/runs/architecture_ci_input_pin_20261110/r9-debt-preview.json` (commit `ed10bc39d`) with the four rule ids. The count is 111, and the sum of the per-file table in spec section 9.3 is 111. The per-phase counts are 35, 13, 43, 7, and 13, and they sum to 111.

## Findings

- None blocking.
- F1 [Note] Open question OQ-1: 45 findings are in test or fixture files. The ownership map already holds reviewed exact exceptions for such files in two rules. The default fixes the files in code. A new exception needs a PM decision.
- F2 [Note] Open question OQ-2: the track `company_identity_sso_20260715` has a task in progress in the same files. Task 0.1 checks the overlap before Phase 1.
- F3 [Note] Open question OQ-4: the Red test analyzes the files of one phase. The plan does not name the analyzer entry point, because this spec reads no source file. The Red role reads it. The fallback is a whole-repository analysis behind heavy-run.
- F4 [Note] The phase order differs from the first idea in the PM brief (the app first). The spec records the reason in D-4: the apps import the packages.
- F5 [Note] The plan removes findings from the baseline in each phase (D-5). The plan needs a pin refresh in each phase (OQ-5), at about 130 s each (round 8 of the pin track).

Verdict: pass for the author self-check. Retry recommendation: run an independent spec review before Phase 0.

Dispositions: F1 KEEP (open question), F2 KEEP (task 0.1), F3 KEEP (OQ-4), F4 KEEP, F5 KEEP.
