# Test strategy: Remove the void Storytime code from Primary

> **Track:** `primary_storytime_removal_20261107` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Parent strategy:** [storytime_app_rebuild_20261025/test-strategy.md](../storytime_app_rebuild_20261025/test-strategy.md) (section P7 applies to the code part of task 7.1).
> **Scope:** Phase 1 in full (AC-1.1 to AC-1.8). Phases 2 and 3 as an outline.
> **Written:** 2026-11-07 at role base `7e3ab50ac2dc5386978d0d98fadf5212200c8871`. Model: claude-code/claude-sonnet-5-5 (PM rule: a substitution for Opus).
> **Facts:** each "measured" fact below was read or run on 2026-11-07 at the role base. Red and Green measure again where this file says so.

## 1. Rules for every phase of this track

### 1.1 Heavy jobs

- Every Vitest, `tsc`, ESLint, or build job runs as one command, one job at a time:

  ```bash
  HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<cmd>'
  ```

- No caller adds its own `flock`. No job sets `HEAVY_PRIORITY`.
- Every Vitest command uses `CI=true` and `--maxWorkers=1`, and runs on targeted files. The binary is `../../node_modules/.bin/vitest`, started in the app folder.
- A Vitest file filter is a literal text match. A path with `[locale]` needs no escape. A `\[` escape matches nothing (measured).
- To run a long file list, write the list to a file and use `xargs -a <list> env CI=true <vitest command>`.
- Light work needs no lock: reads, `rg -n`, `git show|log|diff|status|rev-parse`, and `test -e`.
- The root suite `pnpm turbo run test` is not a gate of this track. It is red for reasons outside this track (parent section 1.4).

### 1.2 Hash and provenance rule

- No role adds a hash, a checksum field, a manifest, or a provenance file (AGENTS.md hashing policy).
- Git commit identity is the provenance. The checks below use `git show` and `git diff` over named paths.

### 1.3 Evidence classes

- **Artifact test:** reads files and checks existence or text. AC-1.1 to AC-1.4 are artifact tests. They prove that the files are gone and that no text names them. They do not prove that the route answers 404.
- **Function-level live test:** runs app code. The three cases of AC-1.8 run the real `proxy.ts`, the real catch-all page, and the real `ServiceWorkerRegister` component. They are not a built-server test.
- **Built-server proof:** only AC-2.2 (Phase 2, after the deploy, by the team). No role of Phase 1 starts a server.
- Every gate of Phase 1 is `automated`. No media, no browser, and no owner pass is part of Phase 1.
- A plan `[x]` note names the evidence class and quotes the exit code and the labeled counts (A5).

### 1.4 Git rules

- Stage named paths only. Other sessions commit on master. Never run `git add -A` or `git add .`.
- Three other-session files are untracked in the app folder today: `cloudbuild-backfill.yaml`, `qa-check-user.tmp.ts`, and `scripts/seed-qa-users.ts`. No role stages them or edits them.
- The track makes three commits in Phase 1, each with its exact path set:

  | Commit | Header (length) | Paths |
  |---|---|---|
  | Red | `test(primary): add the storytime removal red test (track_id: primary_storytime_removal_20261107)` (96) | exactly 1: `apps/primary-advantage/__tests__/storytime-removed.test.ts` |
  | Green (deletion) | `refactor(primary): remove the void storytime code (track_id: primary_storytime_removal_20261107)` (96) | exactly 34: 25 deleted and 9 modified |
  | Adversarial | `test(primary): add the removal adversarial test (track_id: primary_storytime_removal_20261107)` (94) | exactly 1: `apps/primary-advantage/__tests__/storytime-removal-adversarial.test.ts` |

- The Green role stages the 25 deletions with `git rm` before it runs any test. The Storytime boundary test lists Primary files from the Git index and reads each one from disk. An unstaged deletion makes it fail with `ENOENT` (measured from the test source, `phase1-boundary.test.ts:131-139`).
- A defect that a later role finds goes back to Green as a separate fix commit. No role amends a commit.
- No push and no deploy.

### 1.5 Capture of `phase_base_sha`

- This file holds no `phase_base_sha`. A SHA from before this strategy commit is not valid.
- The orchestrator captures it with `git rev-parse HEAD` at plan task 1.2. It does this after three events: the commit of this strategy, the commit of the plan author that fixes the AC list of task 1.10, and the pass of the start check.
- The capture happens before the Red role starts. The orchestrator records the full SHA in the Red evidence.
- Other sessions commit on master, so `HEAD` may hold unrelated commits. Every diff check below uses named paths and the SHAs of the three track commits, not `phase_base_sha..HEAD` alone.

### 1.6 Shared anti-pattern defenses

The catalog is `measure/anti-patterns.md`. A1, A2, A8, A10, A11, A12, A13, and A15 do not apply to this track (no supervisor code, no publish gate, no generated facts, no receipts). These rows apply:

| ID | Defense in this track | Falsification condition |
|---|---|---|
| A3 | Every count is a labeled integer and the check parses the integer after the label: `storytime_removed_paths=25`, `locales_checked=5`, `offending_files=0`, `deleted=25 modified=9 other=0`, `keep_paths_changed=0`. | A line with a date or a SHA and no label passes the check. |
| A4 | Each property test first asserts that its input set is not empty: 25 paths, scan files at least 900 with three anchor files, 5 locales, a real `proxy.ts`. | The path list, the scan, or the locale list is empty and the test exits 0. |
| A5 | A plan note quotes the exit code and the count line of the command it cites. | The plan says "pass" and the cited command exits non-zero. |
| A7 | The scans exclude one exact path (`__tests__/storytime-removed.test.ts`) and never a bare word. The key check compares exact key names. | A line that names a removed module and holds a word such as "never" escapes the scan. |
| A9 | No test reads a `measure/tracks/` path. Detector: `rg -n 'measure/tracks' apps/primary-advantage/__tests__` exits 1. | A new test file contains the text `measure/tracks`. |
| A14 | Detectors use `rg -n '<regex>'`, never `rg -nE`. An exit code 2 is a failure. | A detector with a bad option reports zero hits. |
| A16 | All work runs in the shared master tree. `git worktree list` shows 8 entries at the role base (the repository has 8 today). The count stays 8. | A role adds a worktree. |

## 2. Measured facts at `7e3ab50ac`

- **Paths.** All 25 DELETE paths exist (`delete_exist=25`). All 9 EDIT paths exist. `find` over the five Storytime folders of Primary lists exactly 23 files. The other 2 DELETE paths are `lib/__tests__/proxy-storytime-host.test.ts` and the root doc `docs/runbooks/storytime-week-sync.md`.
- **Start scan.** `rg -il storytime apps/primary-advantage --glob '!node_modules' --glob '!.next'` lists 34 files: 22 DELETE, 9 EDIT, 3 KEEP. `scan_files_outside_lists=0`. The 3 DELETE paths that the scan does not list are `media-list.txt`, `lib/storytime/__tests__/blend.test.ts`, and the root doc.
- **Existing tests that name a deleted module (outside the DELETE list).** One file: `components/pwa/__tests__/service-worker-register.test.tsx` mocks `@/lib/storytime/host` (line 8). `proxy.ts` imports `./lib/storytime/host` (line 9). The 4 proxy test files load `proxy.ts`, so a missed import edit makes them fail to load: `default-locale`, `proxy-callback`, `proxy-matcher`, and `proxy-root-home`.
- **AC-1.2 detector at base.** The import-source regex (a module specifier with a `/storytime` segment) and the names `storytimeHostRedirect` and `isStorytimeHost` match 13 files: 10 DELETE and 3 EDIT (`proxy.ts`, `service-worker-register.tsx`, and its test). `offending_files=13`. The source scan reads 1076 files (`ts`, `tsx`, `js`, `jsx`, `mjs`, `cjs`, `mts`, outside `node_modules` and `.next`).
- **AC-1.3 at base.** `proxy.ts` has 3 lines that match `/storytime/i`: lines 9, 18, and 19. Line 20 (`if (primary) ...`) holds no Storytime word and goes with them.
- **AC-1.4 at base.** All 5 locale files hold a top-level `Storytime` key with 24 children (`en`, `th`, `cn`, `tw` with 76 top-level keys, `vi` with 71). `useTranslations("Storytime")` has 4 callers in 3 files: `storytime-song.tsx` (1), `storytime-week.tsx` (2), `storytime-book.tsx` (1). All 3 files are in DELETE.
- **Catch-all.** `app/[locale]/[...not-found]/page.tsx` calls `notFound()`. After the removal, `/th/st/2/1` matches no other page, so Primary answers its own 404. Its folder holds a layout test only.
- **Test counts at base** (one Vitest job, 10 files, 63 passed, 0 failed):

  | File | Tests | After Green |
  |---|---|---|
  | `lib/__tests__/default-locale.test.ts` | 8 | 8 |
  | `lib/__tests__/proxy-callback.test.ts` | 6 | 6 |
  | `lib/__tests__/proxy-matcher.test.ts` | 9 | 9 |
  | `lib/__tests__/proxy-root-home.test.ts` | 7 | 7 |
  | `lib/__tests__/route-policies.test.ts` | 6 | 6 |
  | `components/pwa/__tests__/service-worker-register.test.tsx` | 4 | 3 (the Storytime-host case goes) |
  | `lib/__tests__/proxy-storytime-host.test.ts` | 3 | deleted |
  | `components/storytime/__tests__/storytime-week.test.tsx` | 9 | deleted |
  | `lib/storytime/__tests__/blend.test.ts` | 3 | deleted |
  | `lib/storytime/__tests__/week.test.ts` | 8 | deleted |
  | `app/[locale]/st/[level]/[week]/__tests__/page.test.tsx` | 3 (by `rg`) | deleted |

  The deleted files hold 26 tests. The Primary suite loses 26 tests by design and 1 more in the service worker test.
- **Tests that read locale files.** 29 Primary test files read `messages/<locale>.json`. At base they give `Test Files 3 failed | 26 passed (29)` and `Tests 25 failed | 182 passed (207)`. The 25 failures are in `app/[locale]/__tests__/error-boundaries.test.tsx` (9), `components/dashboard/__tests__/report-copy.test.tsx` (3), and `components/teacher/__tests__/my-classes.test.tsx` (13). The error is `Element type is invalid ... got: undefined`. No failure names Storytime.
- **`tsc` is red at base.** `tsc --noEmit` in `apps/primary-advantage` exits 2 with 102 errors: 98 `TS2305`, 2 `TS2307`, 2 `TS7006`. The errors name missing exports of `@reading-advantage/ui` and `@reading-advantage/api` (stale `dist` builds of the packages) and the untracked `qa-check-user.tmp.ts`. No line names Storytime, `proxy.ts`, `pwa`, or `route-policies`. The run took 1 minute 50 seconds. The spec text "tsc exits 0" cannot hold on this machine today. Section 4 gives the question and the default.
- **ESLint at base.** `eslint . -f json` in the app folder: 1075 files, `errors=13`, `warnings=864`. The 13 errors are in 4 files: `app/[locale]/teacher/class-roster/[classroomId]/books/[classBookId]/lessons/[number]/rehearsal/__tests__/page.test.tsx` (1), `lib/safe-callback-path.ts` (1), `tests/pwa/fixture-server.mjs` (3), and `tests/pwa/fixtures/legacy-sw.js` (8). The spec and plan say 49. The measured count is 13. The 4 remaining touched code files (`proxy.ts`, `service-worker-register.tsx`, its test, `route-policies.test.ts`) have 0 errors and 0 warnings. The 15 deleted `ts` and `tsx` files have 0 errors and 0 warnings.
- **Storytime boundary test at base.** `apps/storytime/__tests__/phase1-boundary.test.ts`: `Test Files 1 passed (1)`, `Tests 3 passed (3)`, 26 seconds with the lock wait.
- **Other readers of the removed code.** `rg -n 'storytime-week-sync'` finds the old runbook name only in the spec, the parent plan, and the comment of the deleted `receive-weeks.ts` (the `storytime-app-week-sync.md` runbook does not name it). No `apps/storytime` test reads a Primary path. `lib/route-policies.ts` has no `"/st/"` entry (`"/student"` is the only `"/st"` prefix).
- **Graph.** `build-graph callers ./graph.db isStorytimeHost` prints `(no matches)` at base. The graph does not index these symbols. Review A uses `rg -n` as the main evidence. `graph.db` is ignored by Git.
- **Worktrees.** `git worktree list` shows 8 entries.

## 3. Phase summary

| Phase | Risk | Review A | Review B (security) | Review C (route and message contract) | Adversarial | Browser review |
|---|---|---|---|---|---|---|
| P1 Removal | high | yes | yes | yes | yes (3 cases) | no |
| P2 Production leaves the route | medium | no (record check) | no | no | no | no |
| P3 Closeout | low | no | no | no | no | no |

Risk reasons are in each phase section. Review applicability reasons are in section P1.7.

## P1: Removal

**Risk: high.** The phase deletes 25 files and edits `proxy.ts`. The proxy runs on every request of a live service. A wrong edit breaks sign-in, role routing, or the callback path for all Primary users. A missed edit leaves a dangling import that fails the build. The blast radius is one app. No data, no bucket object, and no database row changes. A `git revert` of the deletion commit restores the state.

**Human gates (not automated gates):** none in Phase 1. The bucket prefix, the deploy, and the printed-QR decision stay with Daniel.

### P1.1 The Red test (task 1.3)

The Red role writes ONE file: `apps/primary-advantage/__tests__/storytime-removed.test.ts`. It imports `node:fs`, `node:path`, and `vitest` only. It imports no Primary module, so no import can fail to load. It scans with `readdirSync` over the app folder. It excludes `node_modules`, `.next`, and the one path `__tests__/storytime-removed.test.ts`. The `.ts` extension needs no `// @vitest-environment` line (the Primary config default is `node`).

The minimum structure is 9 tests: 4 guards and 5 properties.

| # | Test | AC | Kind | Result at base | Falsification condition |
|---|---|---|---|---|---|
| 1 | The path list holds 25 entries. The 24 app paths are relative to the app folder. The root doc is relative to the repository root. | 1.1 | guard (A4) | pass | A list with 24 entries, or an empty list, passes. |
| 2 | None of the 25 paths exists. The test counts `removed = paths.filter(not exists).length` and asserts `removed === 25`. The message holds `storytime_removed_paths=<removed>`. | 1.1 | property (A3) | fail: `storytime_removed_paths=0` | A path that still exists does not lower the count. |
| 3 | The scan reads at least 900 files and finds the anchors `proxy.ts`, `components/pwa/service-worker-register.tsx`, and `lib/route-policies.ts`. The message holds `scan_files=<n>`. | 1.2 | guard (A4) | pass | A scan over a wrong folder passes. |
| 4 | No scanned file holds an import source with a `/storytime` segment (`from`, `import(`, `require(`, or `vi.mock(` with a quoted specifier), or the name `storytimeHostRedirect`, or the name `isStorytimeHost`. The message lists the files and holds `offending_files=<n>`. | 1.2 | property (A3, A7) | fail: `offending_files=13` | The sw test still mocks `@/lib/storytime/host` and the test passes. |
| 5 | `proxy.ts` exists, is not empty, and holds `intlMiddleware`, `safeCallbackPath`, `protectedRoutes`, and `roleDefaultRedirects`. | 1.3 | guard (A4) | pass | An empty or wrong file passes. |
| 6 | `proxy.ts` holds no match for `/storytime/i` (the import, the comment, and the host call). The message holds `proxy_storytime_lines=<n>`. | 1.3 | property | fail: `proxy_storytime_lines=3` | The comment line 18 stays and the test passes. |
| 7 | The `messages` folder holds exactly the 5 locale files `cn`, `en`, `th`, `tw`, and `vi`. Each file has at least 50 top-level keys. The message holds `locales_checked=<n>`. | 1.4 | guard (A4) | pass | A missing locale file passes. |
| 8 | No locale file has a top-level key that equals `storytime` after `toLowerCase()`. The message lists the locales. | 1.4 | property | fail: 5 locales | One locale keeps the key and the test passes. |
| 9 | No scanned file holds `useTranslations(` or `getTranslations(` with the literal `Storytime`, nor `namespace:` with `Storytime`, nor a quoted full key that matches `["'`]Storytime\.[a-z][A-Za-z]*["'`]`. The message holds `namespace_callers=<n>`. | 1.4 | property (A7) | fail: `namespace_callers=4` | A mixed-case host string such as `"Storytime.Reading-Advantage.com:443"` (an attack value of the adversarial role) trips the test: the key pattern needs a lowercase first letter and a closing quote after letters only. |

The Red role may add tests. It keeps the rule: every guard passes and every property fails at base.

### P1.2 Red command and expected failures (task 1.3)

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/primary-advantage && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 __tests__/storytime-removed.test.ts'
```

Expected for the minimum structure: exit 1; `Test Files  1 failed (1)`; `Tests  5 failed | 4 passed (9)`.

- Each of the 5 failures is an assertion on the present files. The labels are `storytime_removed_paths=0`, `offending_files=13`, `proxy_storytime_lines=3`, the 5 locales, and `namespace_callers=4`.
- The output holds no `Failed to load`, no `Cannot find module`, and no `ENOENT` as the failure cause. If a file fails to load, the `Tests` line shows 0 tests, and the Red evidence is rejected.
- The Red role records the exit code and the `Tests` line. The Red commit holds the one test file.
- The Red to Green pair is the falsification of the test: a property that always passed would pass at base, and a property that could never pass would fail after Green.

### P1.3 Green task (task 1.4) and the Green gate

The Green role works in this order.

1. Check that the Red commit is in `HEAD`. Check that `git status --porcelain -- apps/primary-advantage` lists only the 3 untracked files of section 1.4.
2. Run the two before-baselines, one heavy job each, before the first deletion:
   - `tsc` into `/tmp/rm-tsc-before.log` (command in G4).
   - The 29 locale-reading tests (command in G3). Record the `Tests` line.
3. `git rm` the 25 files. Make the 9 edits. `git add` the 9 edited paths by name.
   - `proxy.ts`: remove line 9 and lines 18 to 20 (the comment, `const primary`, and the `if`). Keep everything else byte for byte.
   - `service-worker-register.tsx`: remove the import, the comment, and the `isStorytimeHost(...)` clause. Keep the `serviceWorker` check, the `register` call, and the catch.
   - `service-worker-register.test.tsx`: remove the `host` hoist, the `vi.mock`, the `host.storytime` reset, and the Storytime case. Keep the other 3 cases.
   - Five `messages/*.json`: remove the top-level `Storytime` block only (26 lines). The block is the last key of each file, so the line before it changes from `  },` to `  }`. The JSON stays valid. No other key moves.
   - `route-policies.test.ts`: remove the `"/st/2/1"` entry. Rename the test so that its title no longer names Storytime. Keep the `it` (6 tests stay).
4. Run G1 and G2. Then commit once with the header of section 1.4.

**G1: the Red test (Green gate, first command):**

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/primary-advantage && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 __tests__/storytime-removed.test.ts'
```

Expected: exit 0; `Test Files  1 passed (1)`; `Tests  9 passed (9)` (the count the Red role recorded, with no failed and no skipped test).

**G2: the touched tests (Green gate, second command):**

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/primary-advantage && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 __tests__/storytime-removed.test.ts components/pwa/__tests__/service-worker-register.test.tsx lib/__tests__/route-policies.test.ts lib/__tests__/proxy-matcher.test.ts lib/__tests__/default-locale.test.ts lib/__tests__/proxy-callback.test.ts lib/__tests__/proxy-root-home.test.ts'
```

Expected: exit 0; `Test Files  7 passed (7)`; `Tests  48 passed (48)` (9 + 3 + 6 + 9 + 8 + 6 + 7). After task 1.9 the adversarial file joins: 8 files and 51 tests (its three cases). A lower count is a failure (A4).

**The deletion commit check (light, task 1.4):**

```bash
git show --no-renames --name-status --format= <green_sha> | awk '{c[$1]++} END{printf "deleted=%d modified=%d other=%d\n", c["D"], c["M"], NR-c["D"]-c["M"]}'
```

Expected: `deleted=25 modified=9 other=0`. The 34 paths equal the lists of spec section 2 (the Review C role compares them by name).

### P1.4 Gates on one HEAD (task 1.5)

All commands run at the Green commit or at a later `HEAD` that holds it. Each one is a separate heavy job.

**G3: tests that read locale files (changed-contract guard for the key removal):**

```bash
cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/primary-advantage && LC_ALL=C rg -l -e 'messages/(en|th|cn|tw|vi|\$\{)' -g '*.test.ts' -g '*.test.tsx' -g '!node_modules' . | sort > /tmp/rm-msg-readers.txt && wc -l < /tmp/rm-msg-readers.txt
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/primary-advantage && xargs -a /tmp/rm-msg-readers.txt env CI=true ../../node_modules/.bin/vitest run --maxWorkers=1'
```

Expected: the list holds 29 files (`msg_reader_files=29`). The run exits 1 with the same result as the before-baseline: `Test Files  3 failed | 26 passed (29)` and `Tests  25 failed | 182 passed (207)`. The 3 failing files are the 3 named in section 2. The failure text is `Element type is invalid`. A 26th failure, a 4th failing file, or a failure that names `Storytime` is a defect of the removal. This is the handling of an intentionally-red aggregate: the gate compares counts and file names with the before-run, not with exit 0.

**G4: `tsc` for primary-advantage:**

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/primary-advantage && NODE_OPTIONS=--max-old-space-size=6144 ../../node_modules/.bin/tsc --noEmit > /tmp/rm-tsc-<before|after>.log 2>&1; echo tsc_exit=$?'
```

Run it once before the deletion (`before`) and once at the Green commit (`after`). Expected:

- If both exit 0, the gate passes with `tsc_errors=0`.
- If the package builds stay stale, both exit 2. The gate passes when `sort /tmp/rm-tsc-before.log` equals `sort /tmp/rm-tsc-after.log` (`tsc_errors_before=102`, `tsc_errors_after=102` at the role base) and `rg -ci 'storytime|proxy\.ts|pwa|route-policies|messages' /tmp/rm-tsc-after.log` prints `0`. A line that differs may name only an untracked file of another session (`git status --porcelain` shows `??`). The orchestrator logs it.
- A new `TS2307` for a `storytime` path is the defect that this gate exists to catch.

**G5: ESLint of the touched files:**

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/primary-advantage && ../../node_modules/.bin/eslint --max-warnings 0 proxy.ts components/pwa/service-worker-register.tsx components/pwa/__tests__/service-worker-register.test.tsx lib/__tests__/route-policies.test.ts __tests__/storytime-removed.test.ts'
```

Expected: exit 0 and no output (`errors=0`, `warnings=0`). The base value of the 4 old files is 0 and 0, so this is stricter than "no new error against the known count". After task 1.9 the command adds `__tests__/storytime-removal-adversarial.test.ts`. The JSON and message files have no ESLint run.

**G6: Storytime boundary test (AC-1.6):**

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/storytime && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 __tests__/phase1-boundary.test.ts'
```

Expected: exit 0; `Test Files  1 passed (1)`; `Tests  3 passed (3)`. The Green role stages the deletions first (section 1.4).

**G7: the KEEP check and the commit shapes (AC-1.7, light):**

```bash
KEEP=(packages/read-along packages/types apps/primary-advantage/components/read-along apps/primary-advantage/app/api/upload apps/primary-advantage/next.config.ts apps/primary-advantage/package.json apps/primary-advantage/Dockerfile ':(glob)apps/primary-advantage/cloudbuild*.yaml' docs/runbooks/storytime-app-week-sync.md docs/runbooks/storytime-deploy.md apps/storytime)
for sha in <red_sha> <green_sha> <adversarial_sha>; do echo "keep_paths_changed=$(git show --no-renames --stat --format= $sha -- "${KEEP[@]}" | wc -l) $sha"; done
git show --no-renames --stat --format= <green_sha> -- apps/primary-advantage/proxy.ts | wc -l
git show --no-renames --name-status --format= <red_sha>
git show --no-renames --name-status --format= <adversarial_sha>
```

Expected: `keep_paths_changed=0` for each of the 3 SHAs. The positive control (the `proxy.ts` pathspec) prints a number greater than 0, so the pathspec form works. The Red and adversarial commits each list one `A` line with the path of section 1.4. The `deleted=25 modified=9 other=0` line of section P1.3 repeats here.

**G8: the final text scan (light):**

```bash
cd /home/daniebo/Desktop/reading-advantage-monorepo && rg -il storytime apps/primary-advantage --glob '!node_modules' --glob '!.next' | sort
```

Expected: exit 0 and exactly the 3 KEEP files (`app/api/upload/csv/__tests__/route.test.ts`, `components/read-along/read-along-player.tsx`, `components/read-along/__tests__/read-along-player.test.tsx`) plus the new test files that exist. That is `scan_files_after=4` after the Green commit (the Red test is the fourth) and `scan_files_after=5` after task 1.9. Any other file is a defect. The 5 locale files must not appear. Also run `test ! -e docs/runbooks/storytime-week-sync.md && test -e docs/runbooks/storytime-app-week-sync.md && test -e docs/runbooks/storytime-deploy.md`.

**G9: whole-app ESLint (once, at phase acceptance, task 1.10):**

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/primary-advantage && NODE_OPTIONS=--max-old-space-size=4096 ../../node_modules/.bin/eslint . -f json -o /tmp/rm-after-eslint.json; echo eslint_exit=$?'
```

Expected: `errors` is at most 13 and the files with errors are the same 4 of section 2. `warnings` is at most 864. The linted file count is 1062 (1075, minus 15 deleted `ts` and `tsx` files, plus the 2 new tests). The spec limit of 49 holds under either count. The acceptance role parses the JSON with a script and quotes the three labeled integers.

**Phase check:** G1 to G9 pass on one `HEAD` that holds the three track commits, and the orchestrator logs each exit code and each count line (A5).

### P1.5 Adversarial testing (task 1.9; applies)

The adversarial role is another family than Green. It writes ONE file: `apps/primary-advantage/__tests__/storytime-removal-adversarial.test.ts`. It has three tests, one for each case. It uses mocks like `proxy-root-home.test.ts` does: `vi.mock("../lib/session")` and `vi.mock("next-intl/middleware")`, and the real `proxy.ts`.

Constraints of the file:

- It must not name `isStorytimeHost`, `storytimeHostRedirect`, an import source with a `/storytime` segment, or `useTranslations("Storytime")`. The scans of AC-1.2 and AC-1.4 read this file (only the Red test is excluded, per spec). The host string `storytime.reading-advantage.com` is allowed. The mixed-case form `Storytime.Reading-Advantage.com:443` is allowed (test 9 of the Red file does not match it).
- It needs one test environment. The service worker case needs `jsdom` (`// @vitest-environment jsdom`) and `React.createElement` (the file is `.ts`). The proxy cases build a `NextRequest`. The role checks that `NextRequest` works under `jsdom`. If it does not, the role stops and sends the question to the orchestrator. The spec fixes one file.

| # | Case | Method | Expected result | Falsification (the role applies one temporary change, runs the case red, and reverts it) |
|---|---|---|---|---|
| 1 | A path under `/st/` answers the Primary 404 and not a 500. | (a) A small route matcher walks the `page.tsx` files under `app/[locale]` (ignore `(group)` folders, match `[x]` as one segment and `[...x]` as the rest) and matches the segments `th`, `st`, `2`, `1`. Expect exactly one match: the `[...not-found]` page. (b) Call its default export. Expect a thrown error with `digest` that holds `404`. (c) Run the real proxy for `/th/st/2/1` and `/st/2/1` on host `primary.reading-advantage.com`. Expect no throw and no `location` header. | `match_count=1`; the error is the Next not-found error; the proxy passes the request through. | Create a stub `app/[locale]/st/[level]/[week]/page.tsx`. The matcher finds 2 pages and the case fails. Delete the stub. |
| 2 | A Storytime host header is not rewritten. | The real proxy with the header `host: storytime.reading-advantage.com` (also `Storytime.Reading-Advantage.com:443`) on `/th/about`, `/th/auth/signin`, `/` and `/th/st/2/1`. Expect `location` equal to `null` for each (the intl mock returns a plain response), and the status is not a redirect status. | `redirects=0` over the 8 requests. | Re-add one line to `proxy.ts` that redirects when the host starts with `storytime.`. The case fails. `git checkout -- apps/primary-advantage/proxy.ts` restores it, and `git status --porcelain -- apps/primary-advantage/proxy.ts` prints nothing. |
| 3 | The service worker registers on a normal host. | Render `ServiceWorkerRegister` with a stub `navigator.serviceWorker.register` and the host `primary.reading-advantage.com` (also `localhost:3000`). Expect one `register` call with `SERVICE_WORKER_URL`, scope `SERVICE_WORKER_SCOPE`, and type `module`, and no exemption for any host. | `register_calls=1` for each host. | In the component, return early when `window.location.host` holds `reading-advantage.com`. The case fails. Revert with the same `git checkout` and `git status` check. |

Rules:

- The role runs the three falsifications on the working tree, one at a time, and reports each red and green exit code. It reverts each change by named path before it commits. The commit holds the new test file only (`git show --name-status` of section G7).
- A defect that a case finds goes back to Green as a separate fix commit. The role does not fix product code.
- The role runs `rg -n 'measure/tracks' apps/primary-advantage/__tests__` (A9) and expects exit 1.
- The role runs G2 and G5 with the new file and records `Tests  51 passed (51)` at 8 files.

### P1.6 Fixtures, mocks, and live-behavior proof

- No fixture file is added. The Red test reads the real tree. The adversarial file mocks `@/lib/session` and `next-intl/middleware` as the 4 proxy tests do. It mocks nothing of `proxy.ts`.
- The old `proxy-storytime-host.test.ts` is deleted with its 3 tests. Its "leaves the Primary host alone" case moves into adversarial case 2 in a stronger form.
- The proof that a request to `https://primary.reading-advantage.com/th/st/2/1` no longer answers the void page is AC-2.2 after the deploy. Phase 1 proves the cause: the route file is gone, no other page matches the path, and the catch-all calls `notFound()`.

### P1.7 Review roles

- **Review A (change quality and callers): applies.** Scope: the deletion commit, the Red commit, and the adversarial commit. Checks:
  1. `rg -n 'isStorytimeHost|storytimeHostRedirect|STORYTIME_HOST|@/lib/storytime|@/components/storytime|@/content/storytime' apps docs packages --glob '!node_modules' --glob '!.next' --glob '!apps/storytime/**' --glob '!apps/primary-advantage/__tests__/storytime-removed.test.ts'` exits 1 (no hit). The two excluded paths are exact: `apps/storytime` has its own code, and the Red test names the removed symbols on purpose. The graph returns no match for these symbols at base, so it is a second source only.
  2. The `deleted=25 modified=9 other=0` line and the 9 edited paths by name.
  3. No orphan asset: the 22 files of the five folders, `media-list.txt`, and the root doc are gone, and `docs/runbooks/storytime-app-week-sync.md` and `storytime-deploy.md` still exist and name no deleted file.
  4. The three SHAs meet section 1.4 (paths and header length at most 100).
  5. The test count of the service worker test is 3 and no case was weakened (A5).
- **Review B (security: routing): applies.** The host rule leaves a file that runs on every request. Probes:
  1. `git diff --numstat <red_sha> <green_sha> -- apps/primary-advantage/proxy.ts` prints `0` added lines and `4` or `5` removed lines. The `config.matcher`, the callback logic, the role redirect, the `protectedRoutes` check, and the `/unauthorized` redirect are byte-equal.
  2. `lib/route-policies.ts`, `lib/safe-callback-path.ts`, and `lib/session` have no diff in any of the 3 commits.
  3. The 4 proxy test files and the new adversarial case 2 pass (G2). The callback tests (`proxy-callback.test.ts`, 6 tests) pass unchanged.
  4. No closed path opens. `/th/st/2/1` was public and becomes a 404 page. It does not enter `protectedRoutes`. The catch-all page only calls `notFound()`.
  5. Primary had one other reader of the `Host` header: `app/api/v1/help/events/route.ts:25`. The commit does not touch it (`keep_paths_changed` style check: no diff for that path).
  6. The Storytime host moved to `storytime-app` on 2026-10-24 (spec R1). Review B records that a request with that host no longer needs a Primary rule. It does not check the live domain mapping, which is production state outside the tree.
- **Review C (route and message contract): applies.** A public route goes away, and 5 message files change. Checks:
  1. No route, message key, import, or link still names a removed path (G8 and the Review A scan).
  2. The 5 locale files stay valid JSON and differ from the Red commit by the one `Storytime` block each. `git diff --numstat <red_sha> <green_sha> -- apps/primary-advantage/messages` shows `1` added and `27` removed lines for each file (26 block lines, and the trailing comma of the previous key). The key order of the other keys is unchanged.
  3. G3 gives the same counts as the before-run: the key removal changed no other test.
  4. The printed-QR question (spec R1): a printed code that names `https://primary.reading-advantage.com/th/st/<level>/<week>` gets the Primary 404 after the deploy. Review C records this as the known effect of FR-1 and points at parent task 7.4. It makes no change.
- **Adversarial testing: applies** (section P1.5).
- **Browser review (UX): does not apply.** No page, component, style, or message that a user sees stays in the change. The only visible effect is that a deleted URL shows the existing Primary 404 page, which the removal does not change. AC-2.2 checks that effect with a request after the deploy. A browser run would also need the stale `ui` build of the packages to render pages, so it would add noise and no proof.
- **Security review as a separate pass: no.** Review B covers it.
- **Phase acceptance: applies** (section P1.9).
- Model families: Red (MiniMax) differs from Green (GLM). Review A is Anthropic. Review B and Review C are other families. The adversarial role is not the family of Green. The orchestrator logs any deviation.

### P1.8 Anti-pattern coverage

| Task | Anti-patterns and defense | Falsification condition |
|---|---|---|
| 1.2 start check | **A3:** `delete_paths=25`, `edit_paths=9`, `scan_files_outside_lists=0` as labeled integers. **A4:** the check lists 25 and 9 paths (0 fails). **A14:** `rg -il`, exit code 2 is a failure. | A missing path, or a scan file outside the three lists, exits 0. |
| 1.3 Red | **A3:** labels in section P1.1. **A4:** four guards. **A7:** one exact-path exclusion, exact key names, a key pattern that a mixed-case host does not trip. | A property passes at base. A guard passes with an empty input. |
| 1.4 Green | **A5:** the note quotes G1, G2, and `deleted=25 modified=9 other=0`. **A16:** no worktree. | The note says "pass" and a cited command exits non-zero. |
| 1.5 gates | **A3:** `msg_reader_files=29`, `tsc_errors_*`, `scan_files_after=5`, `keep_paths_changed=0`. **A4:** G2 counts at least 48 tests. **A5:** exit codes quoted. **A14:** `rg -n`. | G3 shows 26 failures. G2 shows fewer than 48 tests. |
| 1.6 to 1.8 reviews | **A9:** no test reads `measure/tracks`. **A5:** a review claim cites a command and its output. | A review says "no caller" and `rg -n` finds one. |
| 1.9 adversarial | **A4:** `match_count=1`, `redirects=0` over 8 requests, `register_calls=1` per host. **A5:** each case ran red once with a temporary change. **A9:** no `measure/tracks` text. | A case passes with the temporary change in place. |
| 1.10 acceptance | **A5:** a table of AC to command to exit code to count (section P1.9). **A6:** `measure/tracks.md` names the state "removed locally at `<green_sha>`, not deployed". It never says "live" or "gone from production" before AC-2.2. | `tracks.md` says the route is gone from production after Phase 1. |

### P1.9 Architecture guardrails, changed-contract risks, and phase acceptance

**Architecture guardrails.**

- After Phase 1, `apps/primary-advantage` has no Storytime route, component, content, library, script, host rule, or message key.
- `apps/storytime` and `packages/` do not change in any track commit (G7).
- The proxy keeps its locale, sign-in, role, and callback routing.
- No bucket command and no deploy command runs. The bucket prefix `gs://primary-app-storage/storytime/` stays as it is.

**Changed-contract risks.**

- The `Storytime` message namespace leaves 5 files. A caller that reads it by a dotted key through a root `useTranslations()` call would show a missing-message error. Test 9 and the Review C scan cover the quoted forms. The only callers at base were in DELETE.
- `proxy.ts` loses an import of a deleted module. A missed edit fails to load 4 proxy test files. G2 covers it.
- The package `read-along` stays. `apps/storytime` imports it. G7 proves that no commit touches it.
- A Storytime-host request that reaches Primary no longer redirects. This is intended after the domain move. Adversarial case 2 locks the new behavior.

**Closeout gate for the phase (task 1.10).** The acceptance role runs at an immutable `HEAD` that holds the three track commits and checks each AC:

| AC | Check | Expected |
|---|---|---|
| 1.1 | G1 (test 2) and `test -e` on the 25 paths | `storytime_removed_paths=25`; each `test -e` fails |
| 1.2 | G1 (test 4) | `offending_files=0` |
| 1.3 | G1 (test 6), G2 (the 4 proxy files and `route-policies`), Review B probe 1 | `proxy_storytime_lines=0`; exit 0; the numstat line of probe 1 |
| 1.4 | G1 (tests 8 and 9), G3 | `locales_checked=5`, `namespace_callers=0`; G3 equals the before-run |
| 1.5 | G2, G4, G5, G9 | 48 or 51 tests passed; `tsc` equals the before-run or exits 0; ESLint 0 and 0 on touched files; whole-app `errors<=13` |
| 1.6 | G6 | `Tests  3 passed (3)` |
| 1.7 | G7, G8 | `keep_paths_changed=0` for 3 SHAs; `deleted=25 modified=9 other=0`; `scan_files_after=5`; no bucket or deploy command in the three commits (`git show --stat` lists no path outside the 34 plus the 2 tests) |
| 1.8 | G2 and G5 with the adversarial file, and the three falsification runs | `Tests  51 passed (51)` at 8 files; 3 red runs and 3 green runs recorded |

Also: `git worktree list | wc -l` prints 8 (A16); `rg -n 'measure/tracks' apps/primary-advantage/__tests__` exits 1 (A9); the plan notes quote exit codes (A5); `build-graph update` is not needed (the graph does not index these symbols, and no live export changes). The orchestrator writes `[checkpoint: <sha>]` after the acceptance report and never before it.

## P2: Production leaves the route (outline)

**Risk: medium.** The team deploys Primary. Daniel's gate. This track deploys nothing.

- AC-2.1 (owner-passed): the record names the Primary revision that holds the green commit.
- AC-2.2 (automated, after the deploy): `curl -s -o /dev/null -w '%{http_code}\n' https://primary.reading-advantage.com/th/st/2/1` prints `404`, or the record shows a redirect to a Primary page. The record names the command, the status, and the revision. A `200` with the Storytime page fails the check.
- The marker stays `[b] deferred:daniel`. No review role, no adversarial role, and no browser review applies. The status line is the proof.

## P3: Closeout (outline)

**Risk: low.** Final acceptance repeats section P1.9 at an immutable `HEAD`. It also checks that Phase 2 holds `[b]` lines with the deploy record, or Daniel's word to close without it. The closeout archives the track, updates `measure/tracks.md` (A6 wording: no "live" claim without AC-2.2), and marks the code part of parent task 7.1 done. The A13 detector runs after the archive move: no stale `measure/tracks/primary_storytime_removal_20261107` folder stays.

## 4. Questions and plan changes for the orchestrator

| # | Question | Default (applied in this file) |
|---|---|---|
| Q1 | The spec and plan say the known Primary ESLint count is 49. The measured count at the role base is 13 errors in 4 files (864 warnings). | The gates use the stricter values: 0 errors and 0 warnings on the touched files (G5), and a whole-app `errors<=13` (G9). Both satisfy "no new error against the known count" for 13 or for 49. The spec text can stay. |
| Q2 | AC-1.5 says `tsc --noEmit` exits 0. It exits 2 at the role base (102 errors from stale `dist` builds of `@reading-advantage/ui` and `@reading-advantage/api`). None of them names a touched path. | The `tsc` evidence is the before and after comparison of G4, or exit 0 if the builds are fresh. The orchestrator can ask a separate session to rebuild the packages. This track does not. |
| Q3 | The plan task 1.10 text lists AC-1.1 to AC-1.7. The spec has AC-1.8. | This file checks AC-1.1 to AC-1.8, as the orchestrator instructed. The plan author fixes the word in a parallel commit. |
| Q4 | The adversarial file needs `jsdom` for the service worker case and a `NextRequest` for the proxy cases. The spec fixes one file name. | The role tests `NextRequest` under `jsdom`. If it fails, the role stops and sends the question to the orchestrator. The default then is two files by an explicit spec change. |
| Q5 | The strategy ran on Sonnet because of the PM rule. | The orchestrator logs the substitution. |
