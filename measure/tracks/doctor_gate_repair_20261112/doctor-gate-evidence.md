# Doctor gate evidence

Gate record for the doctor gate of 2026-11-12. Every value comes from the saved
output of the full run at HEAD `49f96a7d8`, in
`measure/runs/doctor_gate_repair_20261112/doctor-run-49f96a7d8.log`.

- HEAD: 49f96a7d8
- DATE: 2026-11-12
- STEP 1: bash tests/orchestrator_catalog.sh, exit 0, 2026-11-12
- STEP 2: bash tests/orchestrator_marker_vocabulary.sh, exit 0, 2026-11-12
- STEP 3: bash tests/orchestrator_review_execution_truthfulness.sh, exit 0, 2026-11-12
- STEP 4: pnpm architecture:check --skip-input-snapshot-pin, exit 1, 2026-11-12
- VERDICT: ARCHITECTURE: step 4 exits 1; the owner of the remaining drift is architecture_ci_input_pin_20261110
- DURATION: step 4 took 165.684 s
- OWNER: architecture_ci_input_pin_20261110 owns tasks 1.4 (pin refresh) and 1.4d (debt baseline)
- DOCTOR: the three structural guard steps gate this exit code
