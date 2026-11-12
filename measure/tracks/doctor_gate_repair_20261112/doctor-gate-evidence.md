# Doctor gate evidence

Gate record for the doctor gate of 2026-11-12. The Phase 2 values come from saved run
logs at HEAD `bbe5e5860`: `measure/runs/doctor_gate_repair_20261112/doctor-run-bbe5e5860.log`
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

## Phase 3 final run (task 3.4)

Every value comes from the saved run log at HEAD `4d0b4e6b3`:
`measure/runs/doctor_gate_repair_20261112/doctor-run-4d0b4e6b3.log`. The doctor exited 0.

- HEAD: 4d0b4e6b323c9693fc6e28997b97855658f1e7e1
- DATE: 2026-11-12
- STEP 1: bash tests/orchestrator_catalog.sh, exit 0, 2026-11-12
- STEP 2: bash tests/orchestrator_marker_vocabulary.sh, exit 0, 2026-11-12
- STEP 3: bash tests/orchestrator_review_execution_truthfulness.sh, exit 0, 2026-11-12
- STEP 4: (cd packages/architecture-enforcement && ../../node_modules/.bin/tsx src/architecture-check-cli.ts --skip-input-snapshot-pin), exit 2, 2026-11-12
- VERDICT: ARCHITECTURE: step 4 exits 2; the known manifest drift is owned by architecture_ci_input_pin_20261110
- DURATION: the whole heavy-run command took 1530 s. This total holds a lock wait of more than 600 s. The run did not time step 4 alone.
- OWNER: architecture_ci_input_pin_20261110 owns tasks 1.4 (pin refresh) and 1.4d (debt baseline)
- DOCTOR: the three structural guard steps gate this exit code
- OUTPUT: the step 1 PASS line is present. The line `FAIL: unsupported task marker` is absent. The step 3 PASS line is present. The ARCHITECTURE line and the DOCTOR line are present.
