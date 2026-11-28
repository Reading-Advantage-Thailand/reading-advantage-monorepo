# Phase 3 Oxc lessons contract

This note holds only the T1b `oxc-lessons` block.
The human note is `phase3/oxc-lessons.md`.

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
