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
| Hard fixes, High defects | opencode-go/qwen3.8-flash#xhigh | escalation: opencode-go/space-bunny#xhigh |
| Track reviews, read-only | opencode-go/muse-spark-1.3-contributor#xhigh | security lens: opencode-go/deepseek-v4.1-flash#xhigh |
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
| 2026-10-12 | lesson_repeat S4 finish, plan truth, 2 commits | muse-spark-1.3-contributor#high | domain 2066 pass, tsc clean, plan ticks with SHA evidence, headers compliant | keep |
| 2026-10-12 | stories S4 reconciliation + S5 domain, 2 commits | muse-spark-1.3-contributor#high | domain 2056 pass re-run by orchestrator, honest partial ticks, no over-claim | keep |
| 2026-10-12 | print_lesson S4 recovery (found pre-committed code, fixed tsc, print check) | muse-spark-1.3-contributor#high | app tsc clean, print-check PDFs on disk, plan ticks with SHA evidence | keep |
| 2026-10-12 | pwa S2 manifest, icons, layout tags, 3 commits | muse-spark-1.3-contributor#high | new tests 9/9, app tsc clean re-run by orchestrator, docs+doctor run | keep |
| 2026-10-12 | two High fixes: read-along teardown + teacher game input, 2 commits | opencode-go/qwen3.8-flash#xhigh | red-first confirmed, key suites 32/32 re-run by orchestrator, tsc clean, honest residual edges | keep (on watch: skills-arm caution) |
| 2026-10-12 | pwa S3 install notice, 3 commits | muse-spark-1.3-contributor#high | new tests 11/11 re-run by orchestrator, tsc clean, docs+doctor run | keep |
| 2026-10-12 | read-only review: staff_student_view, artifact + 4 explicit verifications | muse-spark-1.3-contributor#xhigh | 419 tests pass read-only, evidence-backed findings, correct severity discipline | keep (reviewer role confirmed) |
| 2026-10-12 | pwa S4 offline page + sign + worker handler, 3 commits | muse-spark-1.3-contributor#high | new suites green, browser spec (takeover + offline) 2/2, tsc clean re-run by orchestrator | keep |
| 2026-10-12 | pwa Phase A prep (pairs, steps, acceptance.md), 2 commits | muse-spark-1.3-contributor#high | pairs parse verified, draft defects fixed and reported, plan ticks honest | keep |
| 2026-10-12 | ssv review fixes: 7 no-write tests, results branch, INTERN matrices, 5 commits | muse-spark-1.3-contributor#high | red-first for fixes, guard suites 154/154 re-run by orchestrator, tsc clean | keep |
| 2026-10-12 | stories S6 chapter flashcards, 3 commits | muse-spark-1.3-contributor#high | red-first, 16/16 re-run by orchestrator, tsc clean, D6 NULL article_id kept | keep |
| 2026-10-12 | read-only review: school_management, artifact finalized | muse-spark-1.3-contributor#xhigh | 130 tests pass read-only, prior-review M-items re-verified honestly (2 still present, not over-claimed) | keep (reviewer role confirmed) |
| 2026-10-12 | stories Phase A prep (pairs, steps, cutover block), 4 commits | muse-spark-1.3-contributor#high | kit suite 100/100 re-run by orchestrator, pairs parse, honest AC status | keep |
| 2026-10-12 | merge lane B into integration (5 messages conflicts union-resolved) | muse-spark-1.3-contributor#high | gates green (domain 2085, app 247, tsc clean), models file preserved, no-push | keep |
| 2026-10-12 | rehearsal3 Phase 1 docs (change list, gate, command sheet), 2 commits | muse-spark-1.3-contributor#high | every cited item verified by reading the repo files, live read-only cloud check, honest could-not-verify list | keep |
| 2026-10-12 | school_management review fixes F1-F4, 4 commits | muse-spark-1.3-contributor#high | F3 red-first, app 186 pass with 2 pre-existing failures correctly triaged, domain 21/21, tsc clean | keep |
| 2026-10-12 | merge lane C into integration (8 conflicts union-resolved) | muse-spark-1.3-contributor#high | gates green (domain 2132, app 562, kit 106, tsc clean), nothing dropped, stale dist handled | keep |

## Adaptation rules

- Two consecutive failed role gates on the same model: move it down one tier (xhigh to high, high to medium) and log it.
- Repeated commit-contract breaks (message, track_id, scope): adherence watch; one more break and the model drops to overflow.
- A clean hard fix or a review with zero findings bounce: promote one tier and log it. Ceiling is xhigh for reasoning effort: the owner rule (2026-10-12) bans the max variant everywhere.
- Escalation path for a stuck track: workhorse, then space-bunny, then coding-plan/glm-latest#high.
- Every change lands in the observation log with a reason. The owner can veto any change.
