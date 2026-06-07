You are continuing the same Measure automation session after supervisor gates failed.

Role: mid
Track: codecamp_qa_prod_20260517
Phase: Phase 6: Performance & Latency (P1)

Fix only the issues listed below. Preserve valid work from the previous attempt.
After fixing, rerun the relevant checks, update Measure docs, commit required changes,
and end with the required MEASURE_AGENT_RESULT block.

Supervisor feedback:
Mid role changed non-test/non-Measure files, which violates the Red-phase boundary:
- apps/codecamp-advantage/lib/rate-limit.ts

Relevant logs:
- Agent log: /home/daniel-bo/Desktop/reading-advantage-monorepo/measure/runs/20260607T085122Z/codecamp_qa_prod_20260517/phase-1-Phase_6_Performance_Latency_P1/mid-attempt-1/output.log
- Gate log: /home/daniel-bo/Desktop/reading-advantage-monorepo/measure/runs/20260607T085122Z/codecamp_qa_prod_20260517/phase-1-Phase_6_Performance_Latency_P1/mid-attempt-1/gates.log
