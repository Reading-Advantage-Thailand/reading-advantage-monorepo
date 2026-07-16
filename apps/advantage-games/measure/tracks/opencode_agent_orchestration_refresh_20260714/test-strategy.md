# Test Strategy: OpenCode Agent Orchestration Refresh

## Static Agent Validation

- Confirm every retained frontmatter `model` appears in the current `opencode models` output.
- Confirm no retained agent references `gpt-5.6-*-pro` or a deleted Pro agent name.
- Parse agent frontmatter and verify all Measure agents remain `mode: subagent`.
- Verify the Measure assignment count is four agents per subscription and two recurring phase roles per subscription.

## Checker Unit Tests

- Structured `[b]` markers with `deferred:<owner>` are blocked; free-text “deferred” on `[~]` is incomplete.
- Passing audits reject non-empty blocking and violation arrays.
- Audit provenance must match role, track, phase, baseline, and audited HEAD.
- Agent result blocks must parse and match the requested role with `status: complete`.
- Strategy gates require a committed fresh strategy change.
- `measure-orchestrator-audit` is a recognized, gated role.

## Integration Validation

- Run the checker unit tests.
- Run Python syntax compilation for the checker.
- Run `git diff --check` for repository artifacts.
- Run independent change-quality and Measure orchestrator anti-pattern reviews.

## Falsification Conditions

- Any stale JSON result, malformed result block, free-text deferred bypass, or pass-with-blockers result satisfying a role gate fails this track.
- Any unavailable model or remaining Pro alias fails this track.
