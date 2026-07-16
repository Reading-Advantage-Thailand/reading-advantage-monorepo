# Specification: OpenCode Agent Orchestration Refresh

## Problem

The global OpenCode agent roster references retired OpenAI Pro aliases, overuses one subscription in some workflows, and relies on orchestration gates that do not reliably bind audit evidence to the current role, phase, or Git revision.

## Functional Requirements

- FR-1: Assign all twelve Measure agents to currently available models with an even recurring-phase balance across OpenAI, Volcengine Coding Plan, and MiniMax Coding Plan.
- FR-2: Preserve independent Red, Green, review, acceptance, and closeout ownership while preventing concurrent reviewers from mutating the implementation they audit.
- FR-3: Remove obsolete Pro coder agents and document subscription-first task routing for the retained coder roster.
- FR-4: Bind audit results and agent handoffs to role, track, phase baseline, and audited HEAD revision.
- FR-5: Make the mechanical checker enforce structured `[x]`, `[~]`, and `[b]` task markers, reject blocking pass results, validate orchestrator-audit output, and prevent stale audit reuse.

## Acceptance Criteria

- AC-1: `opencode models` contains every model assigned to a retained agent.
- AC-2: The recurring phase cycle assigns two roles to each subscription.
- AC-3: No retained file references an OpenAI `*-pro` model alias or deleted Pro coder agent.
- AC-4: Audit-only agents may write their result artifact but are explicitly forbidden from fixing production code.
- AC-5: Checker tests cover structured blocked markers, blocking findings, result provenance, result-block parsing, strategy freshness, and orchestrator-audit registration.
- AC-6: The revised role order runs adversarial and applicable browser review before phase acceptance.

## Constraints

- Global agent and skill changes take effect only after OpenCode restarts.
- Direct API coders remain explicit overflow options rather than subscription defaults.
- Changes to Measure orchestration infrastructure require independent quality and anti-pattern review.
