You are continuing the same Measure automation session after supervisor gates failed.

Role: mid
Track: ai_adapter_package_20260603
Phase: Phase 1: `AIClient` Interface

Fix only the issues listed below. Preserve valid work from the previous attempt.
After fixing, rerun the relevant checks, update Measure docs, commit required changes,
and end with the required MEASURE_AGENT_RESULT block.

Supervisor feedback:
Mid role changed non-test/non-Measure files, which violates the Red-phase boundary:
- packages/ai/vitest.config.ts

Relevant logs:
- Agent log: /home/daniel-bo/Desktop/reading-advantage-monorepo/measure/runs/20260605T224114Z/ai_adapter_package_20260603/phase-1-Phase_1_AIClient_Interface/mid-attempt-2/output.log
- Gate log: /home/daniel-bo/Desktop/reading-advantage-monorepo/measure/runs/20260605T224114Z/ai_adapter_package_20260603/phase-1-Phase_1_AIClient_Interface/mid-attempt-2/gates.log
