# Spec: www test audit pilot

Track: `www_test_audit_pilot_20261122` (pilot, four phases).
Author model: opencode-go/muse-spark-1.3-contributor (Muse family).
Source: PM plan A-66, `/home/daniebo/Desktop/handoff/a66-monorepo-test-audit/plan.md`, approved by Daniel 2026-11-17.
Scope app: `apps/www-reading-advantage`.
Due: none set. This track opens the pilot only.

## 1. Goal

Cut the www Vitest case count by 20 % or more.
Keep fault detection at the same level.
Source plan §1 states the same target for each app.

## 2. Scope

Only test files under `apps/www-reading-advantage` change.
Only the Vitest suite counts toward the 20 % target.
The run lists every `e2e/*.spec.ts` Playwright file.
It classifies each Playwright file with the same classes.
Playwright cases do not count toward the target.
They count only when this spec names a reason.

## 3. Out of scope

No production code changes.
No other app changes.
No lint guard of source plan §5 step 6.
No Stryker run in this track.
The www app imports only `@reading-advantage/ui`, `utils`, and `config`.
It touches none of the 5 core modules of source plan §5 step 2.
This record replaces the mutation gate here.

## 4. The fidelity rule

Source plan §3 binds every keep, delete, and rewrite decision.
A test stays only when it meets all three points.
It names one rule that a user, a contract, or a spec needs.
It fails when that rule breaks.
It checks behavior through a public surface.
It never checks source text, class names, or call order.

## 5. Classes

Source plan §4 defines the classes.
The table below quotes each class id once.

| Class | Meaning | Action |
|---|---|---|
| D1 | Source-text test | Delete, or replace with a behavior test when the rule matters |
| D2 | Duplicate of the same rule | Keep the clearest test, delete the rest |
| D3 | Dead target | Delete |
| D4 | Weak check | Delete, or merge into a test that checks the result |
| D5 | Copy pin on a marketing line | Replace with a locale-key check |
| R1 | Over-mocked test | Rewrite against a boundary fake |
| R2 | Brittle test | Rewrite with fixed clocks and role-based selectors |
| R3 | Unclear test | Split or rename |
| K | Keep: money, payout, auth, student data, data migration | Keep; add a mutation check when it has none |

The K-list never-delete rule of source plan §4 applies.
No K test goes unless a named duplicate keeps the same rule.
The kept duplicate names the rule in its row.

## 6. Acceptance criteria

- **(a)** The www case count falls by 20 % or more from the baseline.
- **(b)** The www line coverage falls by 1 point or less from the baseline after every commit.
- **(c)** The www tests pass after every commit.
- **(d)** Each class ships in its own commit.
- **(e)** No K test goes unless a named duplicate keeps the same rule.
- **(f)** A pilot report lists what went, what changed, and why.

## 7. Gates

Every gate command runs through the shared runner.
The runner path is `/home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh`.
The wait is `HEAVY_PREFLIGHT_WAIT_S=3600`.
The green test command is `CI=true pnpm --filter www-reading-advantage exec vitest run --maxWorkers=1 --reporter=dot`.
The coverage command is `pnpm --filter www-reading-advantage test:coverage`.
Criterion (b) compares each commit log against the baseline log.
The baseline lives at `measure/runs/www_test_audit_pilot_20261122/`.
This spec holds no baseline number.

## 8. Constraints

No push of this track before its phase acceptance.
The track ships with a later www push.
The daily www publish at 06:00 Bangkok wins.
The track pauses at 05:45 when a role runs.
Pathspec commits only.
