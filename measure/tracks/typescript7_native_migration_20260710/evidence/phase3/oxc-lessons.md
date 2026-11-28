# Oxc lessons on vinext 1.2.0

- Track: `typescript7_native_migration_20260710`.
- Phase: `Phase 3: TypeScript 7 trial (PM step 1)`.
- Task: T1b, split from Task 1 under option A.
- `phase_base_sha`: `df256903d8f472f094ba4b51635afc0c11e674e6`.
- `role_base_sha`: `0111d200f8038164a2cffefa272f845e37e21178`.
- Worktree: `/home/daniebo/Desktop/rama-worktrees/ts7-phase3`.
- Branch: `ts7/phase3`.
- vinext: `1.2.0`.
- Current TypeScript: `5.9.3`.
- Node: `24.19.0`.
- Source: Math `oxc-evidence.md`, sections 6, 8, and 11.
- Result: 12 rows checked and 6 rows deferred.
- Machine-readable note: `phase3-vinext-1-4-6.md`. It holds only the `oxc-lessons` block.

The committed Red change is inside `phase_base_sha..HEAD`. Mid Red commit `0111d200f` fixed the ID order check. The Red rerun failed only because the P3 note was missing. The final Green command exits 0 with 21 skipped tests.

No dependency, manifest, lockfile, configuration, or app file changed. One-off tools ran through `heavy-run.sh` at priority `p2`. Temporary seeds were removed. The browser helper is evidence code only.

## Oxc table

| Id | Lesson | Disposition | Result or reason | Evidence or owner |
| --- | --- | --- | --- | --- |
| L1 | Root Oxlint config and rule gap | check | No tracked manifest names Oxlint. No root Oxlint config exists. ESLint remains in 44 configs. Math has no ESLint config left to diff. | `oxc/12-light-inventory.log` |
| L2 | Zero-warning lint scripts | check | ESLint exits 1 on `debugger`. The unused-variable seed exits 0 with 11 warnings. Oxlint warns on both seeds by default. `--max-warnings 0` exits 1. | `oxc/01-oxlint-seed.log`; `oxc/02-eslint-seed.log` |
| L3 | Adopt Oxlint and root config | defer | A tool migration and script changes are outside this record task. The warning seed proves the current zero-warning gap. | Phase 5 task `Move linting off the TypeScript 5 API` |
| L4 | Adopt oxfmt | defer | Oxfmt `0.78.0` finds 118 differences in 152 scoped files. A repository reformat needs a separate PM formatting decision. Prettier `3.8.4` remains. | `oxc/04-oxfmt-check.log`; owner: PM formatting decision |
| L5 | tsrs type-aware comparison | check | One-off tsrs and TypeScript `7.1.0-beta` each report one TS2322. Exit codes differ: 1 and 2. Keep `tsc --noEmit` as the named fallback. | `oxc/10-tsrs-tsc71-probe.log` |
| L6 | Named `tsc --noEmit` fallback | check | TypeScript `5.9.3` reports one TS2322 in the app seed and one in the isolated seed. Both temporary probes were removed. | `oxc/09-tsrs-tsc-retry.log` |
| L7 | 1800 s heavy-run cap | check | The largest cited job is 965 s. No cited job exits 124. No gate needed a cap split. | `oxc/20-heavy-cap.log`; H0 build logs |
| L8 | Vitest `include` gap | check | Tracked tests and Vitest list both hold 65 files. Unmatched tracked files: 0. Unlisted Vitest files: 0. | `oxc/11-vitest-list.log` |
| L9 | Missing browser tool | check | `agent-browser` is absent. Playwright `1.61.0` runs both pages. HTTP 200, zero hydration warnings, and zero page errors. Each page has one 404 console error. The fixture control shows a verified result. | `oxc/19-browser-final.log` |
| L10 | Tracked files changed by `vinext build` | check | Each H0 build changes one tracked `next-env.d.ts`. Both files were restored. `.next/` exists and is ignored. `.vinext/` is absent. | H0 build logs; `oxc/22-workaround-inventory.log` |
| L11 | Ignore and commit generated files | defer | Ignore rules and generated declaration commits need a repository policy decision. They are outside this record task. | owner: `tech-debt`; follow-up: `Phase 3 generated-file policy` |
| L12 | `eslint-config-next` config load | check | Executable configs have no `eslint-config-next` import. The shared README has two documentation hits. ESLint loads and runs the current config. | `oxc/12-light-inventory.log`; `oxc/02-eslint-seed.log` |
| L13 | Dead dependency reinstalls `next` | check | Math's dead `geist` dependency is absent here. The two app manifests declare no `next`. Marketing resolves `next` through `@unpic/react` and `packages/api`. | `oxc/22-workaround-inventory.log`; H0 `why-next` log |
| L14 | Remove `next` | defer | `packages/api` requires `next`, and other apps declare it. Removal changes dependencies outside T1b. | Phase 5 rollout; follow-up: `next dependency removal` |
| L15 | `vinext check` | check | Exit 0. Compatibility is 92 percent. One issue class is `__dirname / __filename` in `vite.config.ts`. The result is informational. | `oxc/14-vinext-check.log` |
| L16 | Vite configs and `next/*` aliases | check | Both Vite configs call `vinext()`. All six aliases in the Vitest config exist. The committed guard body passes across all three source files. | `oxc/12-light-inventory.log`; `oxc/13-alias-contract.log` |
| L17 | TypeScript 7 and tsrs rollout rows | defer | These rows need the later trial install and type checks. The tsrs rollout stays outside this track. The T1b probe is extra data only. | Later Phase 3 trial install and type-check tasks |
| L18 | Math-only scripts and order steps | defer | This repository has no Playwright `webServer` hit or Math `gates.sh` helper. Exact pnpm pins replace npm re-resolution. Later tasks own steps 2, 6, and 7. | Later Phase 3 tasks and Phase 5 |

## Findings and follow-ups

- The marketing lint script does not enforce zero warnings.
- Oxlint default rules treat `debugger` as a warning. A root config must set the intended severity.
- Oxfmt adoption needs a format-only change and a blame-ignore decision.
- The tsrs probe matches the TS2322 diagnostic but not the `tsc` exit code.
- The current fallback is `pnpm --filter marketing run check-types`, which runs `tsc --noEmit`.
- Both browser pages emit one 404 console error. T1b does not claim a clean browser console.
- The Phase 3 browser review owns the 404 follow-up.
- The two H0 builds rewrite tracked `next-env.d.ts` files. T1b stages none of them.
- Math's `geist` reinstall workaround does not apply because this repository has no `geist` declaration or import.

## Machine-readable rows

```oxc-lessons
{
  "rows": [
    {
      "id": "L1",
      "disposition": "check",
      "result": "No tracked manifest names Oxlint. No root Oxlint config exists. ESLint remains in 44 configs. Math has no ESLint config left to diff.",
      "gate": "oxc/12-light-inventory.log"
    },
    {
      "id": "L2",
      "disposition": "check",
      "result": "ESLint exits 1 on debugger. The unused-variable seed exits 0 with 11 warnings. Oxlint warns on both seeds by default. --max-warnings 0 exits 1.",
      "gate": "oxc/01-oxlint-seed.log; oxc/02-eslint-seed.log"
    },
    {
      "id": "L3",
      "disposition": "defer",
      "reason": "A tool migration and script changes are outside this record task. The warning seed proves the current zero-warning gap.",
      "owner": "Phase 5 task Move linting off the TypeScript 5 API"
    },
    {
      "id": "L4",
      "disposition": "defer",
      "reason": "Oxfmt 0.78.0 finds 118 differences in 152 scoped files. A repository reformat needs a separate PM formatting decision. Prettier 3.8.4 remains.",
      "owner": "PM formatting decision",
      "gate": "oxc/04-oxfmt-check.log"
    },
    {
      "id": "L5",
      "disposition": "check",
      "result": "One-off tsrs and TypeScript 7.1.0-beta each report one TS2322. Exit codes differ: 1 and 2. Keep tsc --noEmit as the named fallback.",
      "gate": "oxc/10-tsrs-tsc71-probe.log"
    },
    {
      "id": "L6",
      "disposition": "check",
      "result": "TypeScript 5.9.3 reports one TS2322 in the app seed and one in the isolated seed. Both temporary probes were removed.",
      "gate": "oxc/09-tsrs-tsc-retry.log"
    },
    {
      "id": "L7",
      "disposition": "check",
      "result": "The largest cited job is 965 s. No cited job exits 124. No gate needed a cap split.",
      "gate": "oxc/20-heavy-cap.log; H0 build logs"
    },
    {
      "id": "L8",
      "disposition": "check",
      "result": "Tracked tests and Vitest list both hold 65 files. Unmatched tracked files: 0. Unlisted Vitest files: 0.",
      "gate": "oxc/11-vitest-list.log"
    },
    {
      "id": "L9",
      "disposition": "check",
      "result": "agent-browser is absent. Playwright 1.61.0 runs both pages. HTTP 200, zero hydration warnings, and zero page errors. Each page has one 404 console error. The fixture control shows a verified result.",
      "gate": "oxc/19-browser-final.log"
    },
    {
      "id": "L10",
      "disposition": "check",
      "result": "Each H0 build changes one tracked next-env.d.ts. Both files were restored. .next/ exists and is ignored. .vinext/ is absent.",
      "gate": "H0 build logs; oxc/22-workaround-inventory.log"
    },
    {
      "id": "L11",
      "disposition": "defer",
      "reason": "Ignore rules and generated declaration commits need a repository policy decision. They are outside this record task.",
      "owner": "tech-debt",
      "follow_up": "Phase 3 generated-file policy"
    },
    {
      "id": "L12",
      "disposition": "check",
      "result": "Executable configs have no eslint-config-next import. The shared README has two documentation hits. ESLint loads and runs the current config.",
      "gate": "oxc/12-light-inventory.log; oxc/02-eslint-seed.log"
    },
    {
      "id": "L13",
      "disposition": "check",
      "result": "Math's dead geist dependency is absent here. The two app manifests declare no next. Marketing resolves next through @unpic/react and packages/api.",
      "gate": "oxc/22-workaround-inventory.log; H0-why-next.log"
    },
    {
      "id": "L14",
      "disposition": "defer",
      "reason": "packages/api requires next, and other apps declare it. Removal changes dependencies outside T1b.",
      "owner": "Phase 5 rollout",
      "follow_up": "next dependency removal"
    },
    {
      "id": "L15",
      "disposition": "check",
      "result": "Exit 0. Compatibility is 92 percent. One issue class is __dirname / __filename in vite.config.ts. The result is informational.",
      "gate": "oxc/14-vinext-check.log"
    },
    {
      "id": "L16",
      "disposition": "check",
      "result": "Both Vite configs call vinext(). All six aliases in the Vitest config exist. The committed guard body passes across all three source files.",
      "gate": "oxc/12-light-inventory.log; oxc/13-alias-contract.log"
    },
    {
      "id": "L17",
      "disposition": "defer",
      "reason": "These rows need the later trial install and type checks. The tsrs rollout stays outside this track. The T1b probe is extra data only.",
      "owner": "Later Phase 3 trial install and type-check tasks"
    },
    {
      "id": "L18",
      "disposition": "defer",
      "reason": "This repository has no Playwright webServer hit or Math gates.sh helper. Exact pnpm pins replace npm re-resolution. Later tasks own steps 2, 6, and 7.",
      "owner": "Later Phase 3 tasks and Phase 5"
    }
  ]
}
```

## Verification

- Red rerun: `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_typescript7_native_migration_phase3_vinext`.
- Red result: exit 1, `Ran 29 tests`, `FAILED (failures=1, skipped=21)`. Only the P3 note was missing.
- Red log: `oxc/24-red-rerun-0111d200f.log`.
- Green gate: the same command exits 0, `Ran 29 tests`, `OK (skipped=21)`.
- Green log: `oxc/25-green-test.log`.
- Note contract: exit 0. The P3 note holds one block and 18 rows.
- Note log: `oxc/28-note-contract.log`.
- Phase 2 stale-evidence check: exit 1, `Ran 36 tests`, `FAILED (failures=5)`.
- Phase 2 log: `oxc/21-phase2-stale-evidence.log`.
- Measure doctor: exit 1. The architecture reconciliation manifest hash does not match the current bytes.
- Doctor log: `oxc/27-doctor-retry.log`. No architecture source changed in T1b.
