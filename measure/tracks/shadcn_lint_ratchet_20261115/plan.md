# Plan: shadcn lint ratchet

Track: `shadcn_lint_ratchet_20261115` (light lane).
Author model: opencode-go/deepseek-v4.1-flash

## Phase 2: Isolated plugin install, no workspace lockfile change

PM order A-32 (orchestrator default): the root `@shadcn/lint` devDependency and the
`pnpm-lock.yaml` change reach 10 app rows in the selector. The gate must measure with no workspace
lockfile change. The plugin resolves from a folder named by `SHADCN_LINT_DIR`, which CI creates with
an isolated `npm install` in `RUNNER_TEMP`.

- [x] 2.1 Rebase onto `origin/master` and remove the root devDependency and every
  `pnpm-lock.yaml` change. `git diff origin/master...HEAD -- pnpm-lock.yaml package.json` is empty.

  Rebase onto `ad461d1057d30ee39b553616cf6183a689ba3621`. One conflict, in `measure/tracks.md`:
  `origin/master` archived the www products photos track, so its active row is dropped and the
  shadcn row stays. The devDependency and the lockfile hunks are removed from the Phase 1 commit,
  and its message stays. Rebased SHAs: `27bbeb1fe` to `896662ca6`, `d5436af53` to `b27cbe1f7`,
  `ff0faf7ab` to `fd1d7684d`, `2128d192d` to `b434776db`, `17bdc5bff` to `dde07523f`.

  Proof: `git diff origin/master...HEAD -- pnpm-lock.yaml package.json` prints 0 lines.

- [x] 2.2 Red: add the rows "the gate exits 2 when `SHADCN_LINT_DIR` is not set" and "the gate exits
  2 when the folder holds no plugin". Done: `8faf07d4f`.

  Run: `CI=true pnpm exec vitest run scripts/ci/__tests__/shadcn-ratchet.test.mjs`. Exit 1.
  Result: 2 failed, 13 passed. Both new rows read `expected +0 to be 2`, because the script still
  loaded the plugin from the workspace store.

- [x] 2.3 Green: `scripts/ci/shadcn-ratchet.mjs` resolves `@shadcn/lint` from `SHADCN_LINT_DIR` and
  exits 2 with a clear message when the plugin is missing. Done: `56b5f391c`.

  - New exports `resolvePluginEntry(env)` and `loadShadcnPlugin(env)`. A missing variable, a missing
    folder, or a missing plugin throws `RatchetError`, and `main()` turns it into exit 2. The message
    names `SHADCN_LINT_DIR`, `@shadcn/lint@0.2.5`, and the install command.
  - `countLintWarnings` takes an optional `env` and no longer resolves the plugin from the workspace.
  - Test file: exit 0, 15 of 15 pass.
  - With `node_modules/@shadcn/lint` moved away and `SHADCN_LINT_DIR=/tmp/opencode/shadcn-lint`, the
    gate exits 0 with 241 warnings and 36 copies. The temp folder alone feeds the plugin.
  - `SHADCN_LINT_DIR` unset: exit 2, `SHADCN_LINT_DIR is not set, so the gate cannot load
    @shadcn/lint ...`. `SHADCN_LINT_DIR=/tmp/opencode/nothing-here`: exit 2, `SHADCN_LINT_DIR is not
    a folder ...`.

- [x] 2.4 Wire the isolated install into `.github/workflows/ci.yml` as the step
  `Install shadcn lint plugin`, and give the gate step `SHADCN_LINT_DIR`. Done: `56b5f391c`.

  The install step runs `npm install --prefix "$RUNNER_TEMP/shadcn-lint" @shadcn/lint@0.2.5
  --no-save --ignore-scripts`. The gate step sets `SHADCN_LINT_DIR: ${{ runner.temp }}/shadcn-lint`.
  The YAML parses with the `yaml` package. Job `packages` step order: `... Install dependencies | CI
  selector tests | Install shadcn lint plugin | Shadcn lint ratchet | Config drift check ...`. No
  other workflow change.

- [x] 2.5 Update `spec.md` for the resolution path and run the gates. Record the selector output.

  - Test file: exit 0, 15 of 15 pass.
  - Script on the tree with the temp install: exit 0. `lint warnings 241 equals the baseline 241`,
    `local copies 36 equals the baseline 36`.
  - Temporary copy `apps/primary-advantage/components/ui/separator.tsx`: exit 1. `lint warnings went
    up: baseline 241, current 243, delta +2` and `local copies went up: baseline 36, current 37,
    delta +1`. The file is removed. After the remove: exit 0, 241 warnings and 36 copies.
  - `CI=true pnpm exec vitest run scripts/ci/__tests__/`: exit 0, 14 files and 226 tests pass.
  - Selector: `node scripts/ci/affected-apps.mjs --base
    ad461d1057d30ee39b553616cf6183a689ba3621 --head 56b5f391cd253cedb9df1c9344c9720aae388c74`,
    exit 0. Output: `[]`. The PM rule allows a push on this output. This session does not push.
  - Selector at the final commit of this phase, exit 0. Output: `[]`. The measure files after
    `56b5f391c` change no app row.
  - `git diff origin/master...HEAD -- pnpm-lock.yaml package.json` prints 0 lines.

## Phase 1: The ratchet gate, test first

- [x] 1.1 Red: write `scripts/ci/__tests__/shadcn-ratchet.test.mjs` for the comparison logic.
  Done: `27bbeb1fe`, rebased as `896662ca6`.

  Run: `CI=true pnpm exec vitest run scripts/ci/__tests__/shadcn-ratchet.test.mjs`. Exit 1.
  Failure: `Error: Cannot find module '../shadcn-ratchet.mjs'`, 0 tests ran. The file holds 13
  cases: equal counts, a lower count with a note, a higher lint count, a higher copy count, a changed
  copy file list at an equal count, a baseline without `copyFiles`, a missing count, a negative
  count, a fractional count, a baseline that is not an object, a kebab name, a copy count on a
  fixture tree, and a missing scope folder.

- [x] 1.2 Green: write `scripts/ci/shadcn-ratchet.mjs` and
  `scripts/ci/shadcn-ratchet-baseline.json`. Done: `d5436af53`, rebased as `b27cbe1f7` with the
  devDependency and the lockfile hunks removed.

  - Test file: `CI=true pnpm exec vitest run scripts/ci/__tests__/shadcn-ratchet.test.mjs`,
    exit 0, 13 of 13 pass.
  - Script: `node scripts/ci/shadcn-ratchet.mjs`, exit 0.
    Output: `measured 241 lint messages in 54 files and 36 local copies`; both counts equal the
    baseline.
  - Baseline: `lintWarnings` 241, `copies` 36, and 36 `copyFiles` paths.
  - Rules at warn: `no-restyle`, `no-arbitrary-values`, `no-inline-styles`,
    `require-static-classes`. `no-raw-colors` and `no-unknown-classes` are out with the reason in the
    spec (the Tailwind worker times out; the fallback count is not stable).
  - The Tailwind worker budget is 5000 ms through `SHADCN_LINT_TAILWIND_TIMEOUT`. The run takes about
    11 s. The count is 241 at an 8 s, 20 s, 60 s, and 120 s budget, so the budget does not move it.

- [x] 1.3 Wire the gate into `.github/workflows/ci.yml`, job `packages`, as the step
  `Shadcn lint ratchet`. Done: `ff0faf7ab`, rebased as `fd1d7684d`.

  The step runs `node scripts/ci/shadcn-ratchet.mjs` after `CI selector tests`. The YAML parses with
  the `yaml` package. No other workflow change. Phase 2 adds the install step and the env var.

- [x] 1.4 Gates. Done.

  - Test file: exit 0, 13 of 13 pass.
  - Script on the tree: exit 0. `lint warnings 241 equals the baseline 241`, `local copies 36 equals
    the baseline 36`.
  - Temporary copy `apps/primary-advantage/components/ui/separator.tsx`:
    `local copies went up: baseline 36, current 37, delta +1`, exit 1. The file is removed.
  - After the remove: exit 0, 36 copies.
  - Selector at that head printed 10 app rows, because of the lockfile change. Phase 2 removes that
    change, and the selector now prints `[]`.
  - Full `CI=true pnpm exec vitest run scripts/ci`: 223 of 224 pass. The one failure was
    `W-23 every CD workflow action uses a pinned commit SHA` in `cd-workflows.test.mjs`. It read
    `cd-www-reading-advantage.yml`, which held `pnpm/action-setup@v4` at line 93. The Phase 2 run
    passes 226 of 226, so `origin/master` fixed W-23.

## Notes

- The plugin version is pinned by exact number in two places: the CI install command and
  `PLUGIN_VERSION` in `scripts/ci/shadcn-ratchet.mjs`. Change both together.
- A local developer run needs `SHADCN_LINT_DIR`. Without it the gate exits 2 on purpose.
- The gate writes no file. A lowered baseline is a manual edit of
  `scripts/ci/shadcn-ratchet-baseline.json`.
