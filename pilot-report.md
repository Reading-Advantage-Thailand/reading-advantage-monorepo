# Pilot report: Storytime content in the standalone output

Base commit: `09c7d9e8fe587e9bcd27459e4501930822c4c717`. Branch: `pilot/cloud-storytime-content-trace`.
The change touches only `apps/storytime`. It replaces the old report.

## Result

- The standalone output now holds `apps/storytime/content`.
- The build, type check, lint and test tasks all exit 0.

## The change

Commit `fix(storytime): trace content into standalone output` adds one line to `apps/storytime/next.config.ts`:

```ts
  outputFileTracingIncludes: { "/**": ["./content/**/*.json"] },
```

This is option A from the old report. The key `/**` matches every route. The glob is relative to `apps/storytime`.
No route reads `content` yet, so the tracer skipped it before this line.

## The test

Commit `test(storytime): fail when standalone trace lacks content` adds `apps/storytime/__tests__/standalone-content-trace.test.ts`. It came before the fix.

- Test 1 asserts that `content/source.json` and `content/l2/w01.json` to `w08.json` exist on disk.
- Test 2 imports `next.config.ts` and reads `outputFileTracingIncludes["/**"]`. It asserts that a glob matches each content JSON file.
- Before the fix, test 2 failed: 1 failed, 1 passed.
- After the fix, both tests pass.

The test checks the config, not the build output. Reasons:

- Turbo runs `test` without a dependency on the storytime `build` task. A test that reads `.next/standalone` would read a stale folder or no folder.
- A config test runs in milliseconds, with no build.
- The build step below confirms that the config gives the real files.

The test converts each glob to a regular expression. The installed `@types/node` 20 lacks `fs.globSync`, so the test reads files with `readdirSync`.

## Standalone file list

`find` in `apps/storytime/.next/standalone`, without `node_modules`, after the build:

```
./apps/storytime/content
./apps/storytime/content/l2
./apps/storytime/content/l2/w01.json
./apps/storytime/content/l2/w02.json
./apps/storytime/content/l2/w03.json
./apps/storytime/content/l2/w04.json
./apps/storytime/content/l2/w05.json
./apps/storytime/content/l2/w06.json
./apps/storytime/content/l2/w07.json
./apps/storytime/content/l2/w08.json
./apps/storytime/content/source.json
```

`server.js` runs `process.chdir(__dirname)`, so `./content` resolves to this folder at run time.

## Commands and exit codes

| Step | Command | Exit | Note |
|------|---------|------|------|
| 1 | `git fetch --unshallow` | 0 | The clone is now full. |
| 2 | `pnpm install --frozen-lockfile` | 0 | |
| 3 | `npx vitest run __tests__/standalone-content-trace.test.ts` (test only, in `apps/storytime`) | 1 | 1 failed, 1 passed. |
| 4 | `./node_modules/.bin/turbo run build check-types lint test --filter=storytime` (first try) | 2 | `check-types` failed: `node:fs` lacks `globSync`. |
| 5 | Test rewrite with `readdirSync`, then `npx tsc --noEmit` | 0 | |
| 6 | Same vitest command, test only | 1 | 1 failed, 1 passed. This state became the test commit. |
| 7 | `rm -rf apps/storytime/.next`, then `./node_modules/.bin/turbo run build check-types lint test --filter=storytime` | 0 | 4 of 4 tasks pass, 0 cached. |
| 8 | `find . -path ./node_modules -prune -o -path '*content*' -print` (in `.next/standalone`) | 0 | The 11 entries above. |

Test counts in step 7: 17 test files pass, 166 tests pass, 0 fail.

Step 4 ran on an older test commit. That commit stayed local. The final history has the passing type check.
