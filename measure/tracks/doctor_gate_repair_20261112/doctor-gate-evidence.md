# Doctor gate evidence

Gate record for the doctor gate of 2026-11-12. Every value comes from a saved run
log at HEAD `bbe5e5860`: `measure/runs/doctor_gate_repair_20261112/doctor-run-bbe5e5860.log`
and `measure/runs/doctor_gate_repair_20261112/timing-run-bbe5e5860.log`.

- HEAD: bbe5e5860
- DATE: 2026-11-12
- STEP 1: bash tests/orchestrator_catalog.sh, exit 0, 2026-11-12
- STEP 2: bash tests/orchestrator_marker_vocabulary.sh, exit 0, 2026-11-12
- STEP 3: bash tests/orchestrator_review_execution_truthfulness.sh, exit 0, 2026-11-12
- STEP 4: (cd packages/architecture-enforcement && ../../node_modules/.bin/tsx src/architecture-check-cli.ts --skip-input-snapshot-pin), exit 2, 2026-11-12
- VERDICT: ARCHITECTURE: step 4 exits 2; the known manifest drift is owned by architecture_ci_input_pin_20261110
- DURATION: step 4 took 175.150 s, from the timing run at bbe5e5860
- OWNER: architecture_ci_input_pin_20261110 owns tasks 1.4 (pin refresh) and 1.4d (debt baseline)
- DOCTOR: the three structural guard steps gate this exit code
