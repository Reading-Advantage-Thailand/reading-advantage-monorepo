# Learning package fixes

Implemented findings L1 through L6 with focused regression tests.

## Changes

| Finding | Change | Regression test |
| --- | --- | --- |
| L1 | Old timing events no longer lower the event watermark. | The sequence `0, 1000, 500, 1500` records 1500 milliseconds. |
| L2 | The diversity helper returns no candidates when `topN` is zero. | Sparse and dense planner branches return empty lists. |
| L3 | The player cleanup now removes only its subscription. | Strict Mode and activity replacement preserve the supplied controller. |
| L4 | Progress forwards `value` and uses the effective Radix maximum. | Accessibility, custom maximum, and invalid maximum cases pass. |
| L5 | A ref supplies the latest value to consecutive functional updates. | Two increments in one action store and render two. |
| L6 | Local storage removal and clear events restore the initial value. | Session storage clear events preserve local storage state. |

YouTubeMediaHost creates and destroys its provider controller in its effect.
TutorialActivityPanel creates no controller.
The Codecamp wrapper keeps no provider resource after YouTubeMediaHost cleanup.
No app caller change was required.

## Files

- `packages/practice-core/src/practice/timing.ts`
- `packages/practice-core/src/__tests__/timing.test.ts`
- `packages/knowledge-space-practice/src/planner/recommended-next.ts`
- `packages/knowledge-space-practice/src/__tests__/v32-planner-integration.test.ts`
- `packages/activity-react/src/interactive-activity-player.tsx`
- `packages/activity-react/src/__tests__/interactive-player.test.tsx`
- `packages/ui/src/components/Progress.tsx`
- `packages/ui/src/__tests__/Progress.test.tsx`
- `packages/utils/src/hooks/useLocalStorage.ts`
- `packages/utils/src/__tests__/useLocalStorage.test.ts`

## Red phase

Each focused test failed before its source fix.

| Package | Expected failure |
| --- | --- |
| practice-core | Expected 1500 milliseconds and received 2000. |
| knowledge-space-practice | Expected an empty sparse result and received `skill-a`. |
| activity-react | Controller destruction occurred during cleanup and Strict Mode setup. |
| ui | The root lacked `aria-valuenow`; the custom maximum produced negative 95 percent. |
| utils | Sequential updates produced one; removal and clear events kept the stored value. |

The L6 follow-up test showed that a session storage clear also reset the hook.

## Green phase

Focused command form:

```bash
CI=true pnpm_config_verify_deps_before_run=warn PATH=/home/daniebo/.npm/_npx/9ddd603d7b7c182f/node_modules/.bin:$PATH pnpm exec vitest run <test-file> --maxWorkers=1
```

| Package | Focused result |
| --- | --- |
| practice-core | 11 passed |
| knowledge-space-practice | 13 passed |
| activity-react | 10 passed |
| ui | 3 passed |
| utils | 9 passed |

## Package suites

Suite command form:

```bash
CI=true pnpm_config_verify_deps_before_run=warn PATH=/home/daniebo/.npm/_npx/9ddd603d7b7c182f/node_modules/.bin:$PATH pnpm exec vitest run --maxWorkers=1
```

| Package | Result |
| --- | --- |
| practice-core | 199 passed; 3 existing CI wiring tests failed |
| knowledge-space-practice | 422 passed |
| activity-react | 21 passed |
| ui | 12 passed before the invalid-maximum test; the final focused 3 passed |
| utils | 25 passed |

The Practice Core failures expect a removed `packages` CI job and `test:generators` step.
The review already recorded these failures.

## Static checks

Direct command form:

```bash
../../node_modules/.bin/eslint src/
../../node_modules/.bin/tsc --noEmit
```

- Practice Core lint and types passed.
- Knowledge Space Practice lint and types passed.
- Activity React lint, source types, and test types passed.
- Utils lint and types passed.
- UI lint passed.
- UI `tsup` JavaScript and declaration builds passed.
- UI direct types found existing missing matcher types in every component test.

The combined Turbo check stopped during dependency verification.
Pnpm could not open its SQLite store and attempted an automatic install.
Direct installed tools completed the affected checks.

`git diff --check` passed for all changed package paths.
The graph was stale, so the parent owns its update.

## L6 follow-up

The listener now ignores events with a non-local storage area.
Synthetic events with a null storage area remain supported.

```bash
CI=true ../../node_modules/.bin/vitest run src/__tests__/useLocalStorage.test.ts --maxWorkers=1 --no-file-parallelism
```

Result: 9 passed.

The direct Utils type check passed.
Focused lint reported no errors and one existing test-file ignore warning.
