# Plan: shadcn lint ratchet

Track: `shadcn_lint_ratchet_20261115` (light lane).
Author model: opencode-go/deepseek-v4.1-flash

## Phase 1: The ratchet gate, test first

- [x] 1.1 Red: write `scripts/ci/__tests__/shadcn-ratchet.test.mjs` for the comparison logic.
  Done: `27bbeb1fe`.

  Run: `CI=true pnpm exec vitest run scripts/ci/__tests__/shadcn-ratchet.test.mjs`. Exit 1.
  Failure: `Error: Cannot find module '../shadcn-ratchet.mjs'`, 0 tests ran. The file holds 13
  cases: equal counts, a lower count with a note, a higher lint count, a higher copy count, a changed
  copy file list at an equal count, a baseline without `copyFiles`, a missing count, a negative
  count, a fractional count, a baseline that is not an object, a kebab name, a copy count on a
  fixture tree, and a missing scope folder.

- [x] 1.2 Green: write `scripts/ci/shadcn-ratchet.mjs` and
  `scripts/ci/shadcn-ratchet-baseline.json`. Done: `d5436af53`.

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
  - `pnpm install --frozen-lockfile --lockfile-only` exits 0, so the lockfile matches
    `package.json`.

- [x] 1.3 Wire the gate into `.github/workflows/ci.yml`, job `packages`, as the step
  `Shadcn lint ratchet`. Done: `ff0faf7ab`.

  The step runs `node scripts/ci/shadcn-ratchet.mjs` after `CI selector tests`. The YAML parses with
  the `yaml` package. Job `packages` step order: `... Install dependencies | CI selector tests |
  Shadcn lint ratchet | Config drift check ...`. No other workflow change.

- [x] 1.4 Gates. Done.

  - Test file: exit 0, 13 of 13 pass.
  - Script on the tree: exit 0. `lint warnings 241 equals the baseline 241`, `local copies 36 equals
    the baseline 36`.
  - Temporary copy `apps/primary-advantage/components/ui/separator.tsx`:
    `local copies went up: baseline 36, current 37, delta +1`, exit 1. The file is removed.
  - After the remove: exit 0, 36 copies.
  - Selector: `node scripts/ci/affected-apps.mjs --base 3de3846cff9211bf7b0baab1e7907d6a4ff6a610
    --head 2128d192d57525d7a285d2b16d06399de4aad711`, exit 0.
    Output: `["accounting","accounts","codecamp-advantage","marketing","primary-advantage",
    "reading-advantage","sales-advantage","storytime","workbooks","www-reading-advantage"]`.
    The lockfile change reaches most rows, so the orchestrator does not push this branch under the
    PM rule. The commits after that head change measure files only, so the list does not move.
  - Full `CI=true pnpm exec vitest run scripts/ci`: 223 of 224 pass. The one failure is
    `W-23 every CD workflow action uses a pinned commit SHA` in `cd-workflows.test.mjs`. It reads
    `cd-www-reading-advantage.yml`, which holds `pnpm/action-setup@v4` at line 93. This track does
    not change that file. The failure is pre-existing.

## Notes

- The lockfile diff holds the new `@shadcn/lint`, `cn@0.4.0`, `@eslint/core@0.17.0`, and
  `oxc-parser@0.148.0` entries. pnpm also rewrites the peer suffix of `eslint-config-next` and
  resolves `minimatch` 10.2.6 in place of 10.2.5, because the new optional peer
  `@typescript-eslint/parser` joins the root peer graph. No runtime package changes version.
- The gate writes no file. A lowered baseline is a manual edit of
  `scripts/ci/shadcn-ratchet-baseline.json`.
