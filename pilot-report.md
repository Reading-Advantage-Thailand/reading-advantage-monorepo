# Pilot report: workbooks app tests

Branch: `pilot/cloud-workbooks-app-tests`, based on `01f2acfe8`.
Command: `./node_modules/.bin/turbo run build check-types test --filter=workbooks`

## Error: ENOENT on `/@fs/.../packages/sales-knowledge/dist/data/evidence/release-candidate.json`

Failing files: `app/projects/teacher-manual-section.test.tsx`,
`app/drafts/[draftId]/draft-editor-view.test.tsx`,
`app/drafts/[draftId]/use-draft-lesson-editor.test.ts`.

### Cause

These three files are the only workbooks tests that run under `// @vitest-environment jsdom`.
They import values from `@reading-advantage/domain`. That import loads the whole domain index,
which loads `@reading-advantage/sales-knowledge`. At module load, `sales-knowledge/dist/data.js` calls
`loadPackagedSalesEvidenceBytes()`, which reads files through
`readFileSync(... new URL("./data/evidence/…", import.meta.url))`.

Under jsdom, Vitest transforms modules for the web. Vite's `import.meta.url` asset plugin rewrites
`new URL("./x", import.meta.url)` to a dev-server URL (`http://localhost:3000/@fs/<abs path>`).
That URL is not a `file:` URL, so `resolvePackagedEvidencePath` falls through to
`resolve(__dirname, "/@fs/<abs path>")`, which returns `/@fs/<abs path>`. The file does not exist
at that path, even after the build creates the real file in `dist/data/evidence/`.
Tests under the `node` environment are not affected because Vite does not apply that rewrite there.

Commits that caused it:
- `86a6503ac` feat(sales): add reviewed mastery graph (track_id: sales_mastery_consumer_20260810).
  This commit added the eager load-time read through `new URL(..., import.meta.url)`.
- `62bbb86a7` feat(sales): add durable Mastery tenant projection (track_id: sales_mastery_consumer_20260810).
  This commit added `export * from "./sales-mastery.js"` to `packages/domain/src/index.ts`.
  After that, every value import of `@reading-advantage/domain` loads sales-knowledge.
- `b86b137ff` fix(sales): make release evidence build-safe (track_id: sales_advantage_golive_20260701).
  This commit added the non-`file:` fallback that changes the URL into the `/@fs/...` path in the
  error. Before this commit the read failed on the `http:` URL.
- The three jsdom test files reached the current tree through `3dd0d39d6`
  chore(sync): recover unique origin trees onto local master.

### Fix

`apps/workbooks/vitest.config.ts`: add `test.server.deps.external: [/packages\/sales-knowledge\/dist\//]`.
Vitest now loads the sales-knowledge dist in Node directly, without the Vite transform. So
`import.meta.url` is the real `file:` URL and the packaged evidence resolves. There is no change to
production code, assertions, or lockfile.

## Commands and results

| Run | Command | Exit | Result |
|---|---|---|---|
| Before fix | `turbo run build check-types test --filter=workbooks` | 2 | Stopped at `@reading-advantage/db#check-types` (see below) |
| Before fix | same + `--continue` | 2 | workbooks test: 3 files failed, 27 passed (30); 210 tests passed. db#check-types failed. 35/37 tasks |
| After fix | `vitest run app/projects/teacher-manual-section.test.tsx app/drafts` (in apps/workbooks) | 0 | 9 files, 131 tests passed |
| After fix | `turbo run build check-types test --filter=workbooks` | 0 | workbooks test: 30 files passed, 266 tests passed; 37/37 tasks |
| After fix | same + `--continue` | 0 | same as above |

(All `turbo` calls are `./node_modules/.bin/turbo`.)
Setup: `git fetch --unshallow` and `pnpm install --frozen-lockfile` both exit 0.

## Failures left (outside apps/workbooks, not fixed)

- `@reading-advantage/db#check-types` failed on the first run of a fresh clone with TS2307 and TS7006 errors in
  `packages/db/src/__tests__/sales-phase2-review-a-durable.red.test.ts` (added in `63f1ec7e8`) and
  `sales-phase2-transaction-atomicity.red.test.ts` (added in `628468dae`). Both files import
  `../../../domain/dist/...` and `../../../sales-knowledge/dist/...`. These files exist only after
  the domain and sales-knowledge builds, and turbo does not make `db#check-types` wait for those builds.
  (domain depends on db, so it cannot be an ordinary dependency.) When the dist files exist, the
  check passes, as it did in both runs after the fix (cache miss, so the task ran). The result
  depends on task order. It is not a workbooks error and is not fixed here.
- The build rewrites `apps/workbooks/next-env.d.ts`. I restored the file and did not commit it.
