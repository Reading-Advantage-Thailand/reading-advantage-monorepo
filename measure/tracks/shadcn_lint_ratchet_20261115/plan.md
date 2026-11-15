# Plan: shadcn lint ratchet

Track: `shadcn_lint_ratchet_20261115` (light lane).
Author model: opencode-go/deepseek-v4.1-flash

## Phase 1: The ratchet gate, test first

- [x] 1.1 Red: write `scripts/ci/__tests__/shadcn-ratchet.test.mjs` for the comparison logic.

  Run: `CI=true pnpm exec vitest run scripts/ci/__tests__/shadcn-ratchet.test.mjs`. Exit 1.
  Failure: `Error: Cannot find module '../shadcn-ratchet.mjs'`, 0 tests ran. 13 cases:
  equal, lower with a note, higher lint count, higher copy count, a changed copy file list at an
  equal count, a baseline without `copyFiles`, a missing count, a negative count, a fractional
  count, a baseline that is not an object, a kebab name, a copy count on a fixture tree, and a
  missing scope folder.

- [x] 1.2 Green: write `scripts/ci/shadcn-ratchet.mjs` and
  `scripts/ci/shadcn-ratchet-baseline.json`.

  - Test file: `CI=true pnpm exec vitest run scripts/ci/__tests__/shadcn-ratchet.test.mjs`,
    exit 0, 13 of 13 pass.
  - Script: `node scripts/ci/shadcn-ratchet.mjs`, exit 0.
    Output: `measured 241 lint messages in 54 files and 36 local copies`; both counts equal the
    baseline.
  - Baseline: `lintWarnings` 241, `copies` 36, and 36 `copyFiles` paths.
  - Rules at warn: `no-restyle`, `no-arbitrary-values`, `no-inline-styles`,
    `require-static-classes`. `no-raw-colors` and `no-unknown-classes` are out with the reason in
    the spec (the Tailwind worker times out).
  - The Tailwind worker timeout is `5000` ms through `SHADCN_LINT_TAILWIND_TIMEOUT`. The run takes
    about 11 s. The measured count is 241 at an 8 s, 20 s, 60 s, and 120 s budget, so the budget
    does not move the count.

- [x] 1.3 Wire the gate into `.github/workflows/ci.yml`, job `packages`, as the step
  `Shadcn lint ratchet`.

  The step runs `node scripts/ci/shadcn-ratchet.mjs` after `CI selector tests`. The YAML parses
  with the `yaml` package. The step order of the job: `... Install dependencies | CI selector tests
  | Shadcn lint ratchet | Config drift check ...`. No other workflow change.

- [ ] 1.4 Gates: run the test file, the script on the current tree, the script with a temporary
  copy file, and the affected-app selector. Record each output here.
