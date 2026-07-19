# Specification: OpenCode Agent Roster Refresh

## Goal

Update global OpenCode coding and Measure subagents to expose all six available GPT-5.6 Luna, Terra, and Sol variants, remove unavailable Moonshot routing, and preferentially use the active OpenAI, Volcano Engine, and MiniMax subscriptions.

## Requirements

1. Define one `coder-*` subagent for each available GPT-5.6 Luna, Terra, and Sol normal and Pro model ID.
2. Configure normal GPT-5.6 agents at medium reasoning and Pro agents at high reasoning.
3. Preserve `coder-vocengine-glm-5-2` as an active specialist and use GLM 5.2 for `measure-jr-green`.
4. Remove Kimi provider configuration, the unavailable Kimi coder definition, and every remaining Kimi routing reference.
5. Update `coder-orchestrator` roster, routing matrix, escalation ladder, and stale agent IDs for the resulting roster.
6. Route Measure defaults through subscription-backed OpenAI, Volcano Engine, and MiniMax models; Xiaomi and DeepSeek remain opt-in coding specialists only.
7. Validate all configured model IDs and agent-file frontmatter against the current OpenCode schema.

## Acceptance Criteria

- All six GPT-5.6 model IDs appear in dedicated coder definitions with the specified reasoning level in `options`.
- No `kimi-for-coding` or `k2p7` reference remains in the global OpenCode configuration or agent directory.
- `measure-jr-green` uses `vocengine-coding/glm-5.2`.
- `coder-orchestrator` accurately names every active coder and contains no stale Kimi or malformed GLM agent ID.
- Configuration validation and model-list checks pass.
