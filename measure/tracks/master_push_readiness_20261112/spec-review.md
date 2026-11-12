# Spec Review — master_push_readiness_20261112

Author model: claude-code/claude-sonnet-5-5

Review kind: author self-check. No independent `measure-spec-review` subagent ran in this session. The orchestrator runs an independent spec review on another model family before Red starts.

## What this track proposes

The `cd-apps` job of codecamp-advantage fails at build step 4, because the push file creates a scheduler job and the Cloud Build service account lacks `cloudscheduler.jobs.create`. The track moves that step to the traffic file, where live-changing steps belong (decision D7 of `per_app_cicd_20261107`). Phase 2 lists and fixes the old Primary test failures. It does not block the push.

## Zero-decision check

- The fix is fixed: option B (spec D-1). Option A is recorded as the alternative, with the reason it is not the default.
- The tasks name the files, the step id, the secret, the tests, and the commit headers.
- The IAM grant is a PM setup item with the tag `deferred:pm`. The push check is a human gate with the tag `deferred:daniel-push`.
- Phase 2 task 2.0 lists the items first. Tasks after 2.1 depend on that list, so the plan names them as added after task 2.1. This is the one planned gap, and it follows PM decision 3.
- Three open questions hold defaults. No task waits on an answer.

## Facts used (from the orchestrator read, not re-run here)

- Step 4 sits at `apps/codecamp-advantage/cloudbuild.yaml` lines 53 to 62. Checked in this session.
- The traffic file holds `bind-release-source`, `migrate-db`, `doctor-check`, and `update-traffic`, with `CODECAMP_DATABASE_URL` as its only secret. Checked in this session.
- The contract test and F-11 and F-16 reference these files. Checked by grep in this session.
- The run ids, build ids, and the IAM error text come from the orchestrator. They were not re-checked.

## Findings

- None blocking.
- F1 [Note] Option A would leave the push changing live behavior. The spec records this.
- F2 [Note] The `heavy-run.sh` path is the one that the doctor track uses. Phase 2 task 2.0 depends on it.
- F3 [Note] Task 1.5 runs `bash measure/doctor.sh` only after the doctor track closes.

Verdict: pass for the author self-check. Retry recommendation: run an independent spec review on another model family before Red.
