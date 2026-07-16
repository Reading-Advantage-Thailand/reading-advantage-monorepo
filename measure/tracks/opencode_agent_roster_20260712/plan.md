# Plan: OpenCode Agent Roster Refresh

## Phase 1: Configure and Validate

- [x] Task: Define the GPT-5.6 coder roster and remove unavailable Moonshot routing.
  - Add the six Luna, Terra, and Sol normal/Pro coder definitions.
  - Use medium reasoning for normal agents and high reasoning for Pro agents.
  - Remove the Kimi provider and coder definition while retaining the GLM 5.2 specialist.
- [x] Task: Update orchestrator and Measure routing.
  - Refresh roster tables, routing matrix, escalation guidance, and stale IDs.
  - Route Measure roles to subscription-backed OpenAI, Volcano Engine, and MiniMax models.
  - Assign GLM 5.2 to the Jr Green role.
- [x] Task: Validate agent configuration and model references.
  - Confirm each referenced provider/model is listed by OpenCode.
  - Check frontmatter reasoning options against the active OpenCode schema.
  - Search for retired Kimi references and stale orchestrator IDs.
  - Evidence: `jq empty ~/.config/opencode/opencode.json` and `git diff --check` passed. The OpenCode CLI is not on this shell's PATH after the edit, so restart-time model enumeration remains a manual acceptance step.
- [b] Task: Measure - User Manual Verification 'Phase 1: Configure and Validate' (Protocol in workflow.md) — deferred:product-owner
