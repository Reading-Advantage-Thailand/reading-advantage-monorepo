# Orchestration models — primary parity program

Record owner: the primary orchestrator (kimi-for-coding, orchestrator use only per owner rule).
Started: 2026-10-12. Update after every delegated role and every gate.

## Why this file

The orchestrator has no durable memory across sessions. This file is the memory.
It holds the model staffing, the evidence, and the observation log.
Read it before delegating any role.

Rule: benchmark numbers are a starting signal, not the truth.
Behavior on this repository is the truth. Adapt when the evidence says so.

## Subscriptions

- kimi-code-plan-cn: kimi-for-coding. Orchestrator only (owner rule 2026-10-12).
- minimax-cn-coding-plan: MiniMax-M3.1-Flash-Preview. Free, virtually unlimited.
- opencode-go: muse-spark-1.3-contributor, qwen3.8-flash, deepseek-v4.1-flash, glm-5.3-flash, space-bunny, longcat-2.5-preview-free, gpt-6-luna. Cheap, virtually unlimited.
- coding-plan (Volcano Ark): glm-5.3-flash (cheap), glm-latest (escalation).
- Banned: MiniMax-M3 (owner verdict 2026-10-12), mimo-v2.6-flash (bench 7.9).
- Metered deepseek and xiaomi paths need owner approval before use.

## Current staffing (owner approved 2026-10-12)

| Role | Model | Notes |
|---|---|---|
| Orchestrator | kimi-code-plan-cn/kimi-for-coding | owner only |
| Lane implementation, regular phases | opencode-go/muse-spark-1.3-contributor#high | workhorse |
| Hard fixes, High defects | opencode-go/qwen3.8-flash#max | escalation: opencode-go/space-bunny#high |
| Track reviews, read-only | opencode-go/muse-spark-1.3-contributor#max | security lens: opencode-go/deepseek-v4.1-flash#max |
| Adversarial testing | minimax-cn-coding-plan/MiniMax-M3.1-Flash-Preview | free, unlimited |
| UX browser review | opencode-go/muse-spark-1.3-contributor#high | escalation: coding-plan/glm-latest#high |
| Overflow lane | opencode-go/longcat-2.5-preview-free | optional |

## Benchmark evidence

Source: lending-desk-bench (bodangren.github.io), No-Skills arm, export 2026-10-11.
Task: a real Next.js App Router feature, 78 scored checks. Close to this repo work.

| Model | Score | Adherence | Passes | Wall | Cost USD |
|---|---|---|---|---|---|
| qwen3.8-flash | 94.3 | 0.83 | 76/78 | 13m | 0.053 |
| muse-spark-1.3-contributor | 92.7 | 1.00 | 68/71 | 4.5m | 0.009 |
| deepseek-v4.1-flash | 90.9 | 0.58 | 76/78 | n/a | 0.029 |
| glm-5.3-flash | 90.4 | 0.83 | 71/78 | 27m | 0.104 |
| minimax-m3 | 89.0 | 1.00 | 66/71 | 5m | 0.103 |
| longcat-2.0 | 90.1 | 1.00 | 65/71 | 5m | 0.023 |
| gpt-5.6-luna | 89.1 | 0.58 | 74/78 | n/a | 0.049 |
| mimo-v2.6-flash | 7.9 | 1.00 | 8/71 | 17m | 0.009 |

Cautions:

- qwen3.8-flash: top score, but the Skills arm collapsed to 30.3. Risky under heavy briefs.
- deepseek-v4.1-flash and gpt-5.6-luna: adherence 0.58. Use only where adherence does not decide the outcome (red tests, security hunting).
- glm-5.3-flash: Skills delta -33. Avoid for heavy briefs.
- space-bunny: no bench row yet. Escalation only until it proves itself.
- mimo-v2.6-flash: 7.9. Banned.

## Observation log

One row per delegated role. Verdict values: keep, promote, demote, ban.

| Date | Task | Model | Gates and evidence | Verdict |
|---|---|---|---|---|
| 2026-10-12 | lane A, B, C recovery dispatch | MiniMax-M3 | cancelled by owner before any gate | ban (owner) |

## Adaptation rules

- Two consecutive failed role gates on the same model: move it down one tier (high to medium, max to high) and log it.
- Repeated commit-contract breaks (message, track_id, scope): adherence watch; one more break and the model drops to overflow.
- A clean hard fix or a review with zero findings bounce: promote one tier and log it.
- Escalation path for a stuck track: workhorse, then space-bunny, then coding-plan/glm-latest#high.
- Every change lands in the observation log with a reason. The owner can veto any change.
