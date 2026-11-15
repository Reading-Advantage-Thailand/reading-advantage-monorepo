# Spec: shadcn lint ratchet

Track: `shadcn_lint_ratchet_20261115` (light lane, chore).
Author model: opencode-go/deepseek-v4.1-flash

## Goal

Add a CI gate that counts two design-system signals and stops a count from going up:

1. The warning count of the `@shadcn/lint` ESLint rules on the shadcn component folders of the apps.
2. The count of local shadcn component copies. A copy is an app file that repeats a component that
   `packages/ui` already owns.

The gate is a ratchet. It compares each count with a committed baseline. A count that goes up fails
the job. A count that stays equal or goes down passes the job. A drop prints a note that asks for a
lower baseline.

This is step 1 of PM order A-32. The single-source move of every copy into `packages/ui` is out of
scope here.

## Package check

`npm view @shadcn/lint version` returns `0.2.5` on 2026-11-16. The package installs with
`pnpm install`. The package is an ESLint plugin, not a standalone command. It exports
`{ plugin as shadcn }` and six rules. The gate runs it through the ESLint programmatic API at warn
level.

## Ratchet rule

### Lint warnings

- Tool: the ESLint class, called as a library from `scripts/ci/shadcn-ratchet.mjs`.
- Parser: `@typescript-eslint/parser`, with JSX on.
- Plugins: `@shadcn/lint` only. The gate does not read the app ESLint files, because the gate counts
  one thing: the shadcn rules.
- Rules, each at `warn`:
  - `shadcn/no-restyle`
  - `shadcn/no-arbitrary-values`
  - `shadcn/no-inline-styles`
  - `shadcn/require-static-classes`
- Settings: `settings.shadcn.ui` is `@/components/ui`, and
  `componentImports` is `^@reading-advantage/ui(/|$)`. The rules then recognize the local
  components and the shared package.

### Known limit: the two theme rules

`shadcn/no-raw-colors` and `shadcn/no-unknown-classes` read the Tailwind theme. The plugin builds the
theme in a worker thread. In this repository the worker times out for `primary-advantage` and
`reading-advantage` at 8 s, 20 s, 60 s, and 120 s. It then checks the file with a bundled grammar,
and that grammar reports project classes as unknown. A count from the fallback depends on the
timeout, so it is not stable enough for a ratchet. The gate leaves both rules out. A later task
restores them when the theme build works. Science-advantage builds its theme in about 0.2 s, so the
limit is specific to those two apps.
- Scope: every `**/*.{ts,tsx}` file under these folders:
  - `apps/primary-advantage/components/ui`
  - `apps/reading-advantage/components/ui`
  - `apps/science-advantage/components/ui`
- The count is the number of warning messages that ESLint reports. An error message also counts,
  because the gate treats every message as a finding.
- `__tests__` folders inside the scope are included, because the script counts what the rules say.

### Local component copies

- Scope: the same three `components/ui` folders.
- Candidate: a file whose name is `<kebab>.tsx`, where `<kebab>` is not under a `__tests__` folder.
- Match rule: turn `<kebab>` into PascalCase, with a split on `-` and a capital first letter. The
  file is a copy when `packages/ui/src/components/<Pascal>.tsx` exists.
- Example: `apps/reading-advantage/components/ui/alert-dialog.tsx` matches
  `packages/ui/src/components/AlertDialog.tsx`, so it is a copy.
- Example: `apps/primary-advantage/components/ui/chart.tsx` has no `Chart.tsx` in `packages/ui`, so
  it is not a copy.
- The count is the number of copy files. The baseline also lists their paths, so a swap that keeps
  the count equal is visible in the diff.

### Baseline and exit codes

- Baseline file: `scripts/ci/shadcn-ratchet-baseline.json`. It holds `lintWarnings`, `copies`, and
  the `copyFiles` list.
- Exit 0: both counts are equal to or lower than the baseline. A lower count prints one note per
  count and asks the author to lower the baseline.
- Exit 1: at least one count is higher than the baseline. The message names the count, the baseline
  value, the current value, and the delta.
- Exit 2: the gate cannot measure. Cases: a missing or unreadable baseline, a missing ESLint or
  `@shadcn/lint` module, an ESLint crash, or a scope folder that does not exist. A silent zero is
  not allowed, because a broken gate must not pass.
- The gate prints one line per count and the note lines. It writes no file.

## CI wiring

- File: `.github/workflows/ci.yml`, job `packages`.
- Step: `Shadcn lint ratchet`, after `Install dependencies` and after the `CI selector tests` step.
- The step runs `node scripts/ci/shadcn-ratchet.mjs`.
- The step fails the job when a count goes up. The lint findings themselves do not fail the job,
  because the rules run at warn level and the gate reads only the counts.
- No other workflow change.

## Out of scope

- Fixing the current findings. The baseline pins them.
- The A-32 single-source plan: moving a copy into `packages/ui`, then importing from it. A later
  track does that work and lowers the baseline.
- The app ESLint files and their current warn rules.
- A gate on the design of new components. The gate counts only.

## Acceptance criteria

- AC-1: `scripts/ci/__tests__/shadcn-ratchet.test.mjs` covers the comparison logic: equal, lower,
  higher, a missing key, a bad baseline shape, and a copy-file difference at equal count. The test
  fails before the logic exists.
- AC-2: `node scripts/ci/shadcn-ratchet.mjs` exits 0 on the current tree with the committed
  baseline, and prints the two counts.
- AC-3: A temporary copy file `apps/primary-advantage/components/ui/separator.tsx` makes the gate
  exit 1. The file is removed after the check.
- AC-4: `.github/workflows/ci.yml` runs the gate in the `packages` job, and the YAML stays valid.
- AC-5: `node scripts/ci/affected-apps.mjs --base origin/master --head HEAD` output is recorded in
  the plan.
