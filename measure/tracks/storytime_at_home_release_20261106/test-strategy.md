# Test strategy: Storytime at-home release (weeks 1 to 7 in the app)

> **Track:** `storytime_at_home_release_20261106` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Parent strategy:** [storytime_app_rebuild_20261025/test-strategy.md](../storytime_app_rebuild_20261025/test-strategy.md) (sections 1, P2, and P3 apply).
> **Scope:** Phase 1 in full. Phases 2 and 3 as an outline (sections P2 and P3 below).
> **Written:** 2026-11-06 at role base `6716a1546`. Model: claude-code/claude-sonnet-5-5 (PM rule: no Opus).
> **Facts:** each "measured" fact below was read on 2026-11-06 at `6716a1546`. No heavy job ran. Red and Green must measure again.

## 1. Rules for every phase of this track

### 1.1 Heavy jobs

- Every heavy job (Vitest, `tsc`, ESLint, `turbo`, the receiver, a build) runs as one command:

  ```bash
  HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<cmd>'
  ```

- Storytime jobs set no `HEAVY_PRIORITY`. A caller never adds its own `flock`.
- Every Vitest command uses `CI=true` and `--maxWorkers=1`, and runs on targeted files.
- A server and its client run in ONE job. The job starts the server in the background, sets
  `trap 'kill $SERVER_PID' EXIT`, runs the client, and exits with the client code. `heavy-run.sh` v2.26
  refuses a server alone. Phase 1 starts no server. The Phase 3 outline uses this rule.
- The gate scripts `phase1-quality-gates.sh` and `phase3-docker-smoke.sh` enter `heavy-run.sh` themselves.
  Run them plain with `bash <script>`.
- Light work needs no lock: reads, `rg -n`, `git show|log|diff|rev-parse`, and `sha256sum -c` of a hand-off folder.
- The root suite `pnpm turbo run test` is red for reasons outside this track (parent section 1.4). No gate uses it.
  `phase1-quality-gates.sh` uses `--filter=storytime` and is not the root suite.

### 1.2 Hash and provenance rule

- The only hash step of this track is `sha256sum -c MANIFEST.txt`, as the PM hand-off names it (AGENTS.md hashing policy).
- No role adds a hash, a checksum field, a manifest, or a provenance file. Git commit identity is the provenance.
- The `# old-sha256` and `# new-sha256` comment lines inside the r2 `MANIFEST.txt` are hand-off data. No role copies them or computes from them.

### 1.3 Evidence classes

- **Artifact test:** reads a file and checks text or structure (`source.json`, the file list of a commit, a `MANIFEST.txt` line).
- **Function-level live test:** runs app code on the shipped files. The route calls `loadVisibleWeek(level, week)` from
  `apps/storytime/lib/content.ts` and answers 404 when it returns `null`. A test that calls this function on the shipped
  folder and reads its log line proves the route decision for that week. It is not a built-server test.
- A byte-equal check is an independent check of the receiver. It uses `git show` and `cmp`, not the receiver code.
- An automated count is never acceptance of media. Only Daniel passes media (parent rule 6.2, AC-12.1).
- A plan `[x]` note names the evidence class and quotes the exit code and the labeled counts (A5).

### 1.4 Capture of `phase_base_sha`

- Phase 1 has no `phase_base_sha` in this file. A SHA from before this strategy commit is not valid.
- The orchestrator captures it with `git rev-parse HEAD` at task 1.1, after three events: the commit of this strategy, the
  commit that adds `[checkpoint: <sha>]` to the heading of parent Phase 3, and the pass of the task 1.1 start gate.
  The capture happens before the Red role starts. The orchestrator records the full SHA in the Red evidence of Phase 1.
- Phase 2 and Phase 3 each get their own capture by the same command, after the checkpoint of the phase before.

### 1.5 Shared anti-pattern defenses

The catalog is `measure/anti-patterns.md`. The parent table (parent section 1.5) applies. These rows add the Phase 1 forms.

| ID | Defense in this track | Falsification condition |
|---|---|---|
| A3 | Every script result and every test count is a labeled integer: `folders_checked=7`, `entries_ok=294`, `weeks_equal=8`. The check parses the integer after the label. | A line with a date or a commit number and no label passes the check. |
| A4 | Each loop first asserts that its input set is not empty: entries greater than 0, weeks equal to 8, folders equal to 7. | A manifest with zero entries, or a run over zero weeks, exits 0. |
| A5 | A plan note quotes the exit code and the labeled counts of the command it cites. | The plan says "pass" and the cited command exits non-zero. |
| A9 | No Storytime test reads a `measure/tracks/` path. The checkpoint check of task 1.1 is a shell step of the orchestrator. | A new test file contains the text `measure/tracks`. Detector: `rg -n 'measure/tracks' apps/storytime/__tests__`. |
| A14 | Detectors use `rg -n '<regex>'`. An exit code 2 is a failure. | A detector with a bad option reports zero hits. |
| A16 | All work runs in the shared master tree. Scratch folders are plain directories under `/tmp`, not worktrees. | `git worktree list` shows an extra entry after the phase. |

## 2. Measured facts that shape the tests

- **Start gate fails today.** The heading `## Phase 3: At-home app` of the parent plan (`plan.md:259`) has no `[checkpoint: …]`.
  Red and Green of Phase 1 do not start until it has one.
- **Pins.** `apps/storytime/content/source.json` records `67be5603e0410f21491a006b8e9d12f3f9dd1bfc` and lists `w01` to `w08`.
  `git -C ~/Desktop/Workbooks rev-parse 82f88853` prints `82f88853615f2925d8f1c12b4571790305224178`.
- **The 7 folders.** Entries (file lines) of each `MANIFEST.txt`: w01-r2 44, w02 43, w03 42, w04 38, w05 44, w06 41, w07 42.
  The total is 294. Each folder holds exactly its entries plus `MANIFEST.txt` (45, 44, 43, 39, 45, 42, 43 files).
  Each `MANIFEST.txt` holds `workbooks-commit: 82f88853615f2925d8f1c12b4571790305224178`. The first folder `w01-storytime-app-package`
  holds `cf30bb2eee55806bf8830b3a3e69e4f6044847e6`. It is superseded and serves as the real negative for task 1.1.
- **`sha256sum -c` prints a warning and still exits 0.** The metadata and comment lines are "improperly formatted". For r2 the
  run prints `WARNING: 6 lines are improperly formatted` and exits 0. `--strict` exits 1. No role uses `--strict`.
- **Hand-off equals Git.** The hand-off `l2/w01.json` to `l2/w07.json` equal `git show 82f88853:content/storytime/l2/w<nn>.json`
  byte for byte (`cmp`, measured for all 7).
- **Media named by a week equal the media in its manifest.** An extension scan of the week JSON, with the `approval` subtree
  excluded by exact key, finds 42, 41, 40, 36, 42, 39, and 40 media paths (w01 to w07, total 280). Each set equals the media
  entries of its manifest. The 14 other entries are `pictures.sha256` and `w<nn>.json` of each folder.
  Without the exclusion, r2 shows one false hit: a prose string in `approval.images.source` that ends in `.mp3` (A7).
- **r2 changes.** The r2 manifest lists 7 changed paths in `#` comment lines: 5 reader pictures (`1-hello/p08.jpg`,
  `2-nan-can-nod/p01.jpg`, `p03`, `p05`, `p07`), `w01.json`, and the new entry `pictures.sha256`.
- **w01 r2 content (measured, `67be5603` to `82f88853`).** The text `Each child colors their own book.` is new in
  `scripts[2].steps[3].en.studentActions[2]` and `scripts[3].steps[2].en.studentActions[1]`. The Thai text
  `เด็ก ๆ ระบายสีหนังสือเล่มเล็กของตัวเอง` is new at the same two places in `th`. The old text `books (one for each pair)` is gone from
  `scripts`. `approval.print` (`status` `approved`) and `approval.thai.words` (names "color-own-book") are new.
- **Status and pictures at the new pin.** w01 is `published` and ready. w02 to w08 are `draft`. w02 to w07 now hold 16 page pictures
  with a `file` and 2 covers with a `file`. At the old pin they held 0. `approval.images` of w02 to w07 is now `approved`.
  `approval.audio`, `approval.song`, and `approval.scripts` stay `draft`. w08 has 0 books and is `draft`.
- **New fields (contract-fault candidates, parent row F14).** `approval.print`, `approval.thai.words`,
  `print.checkRows.blendWord`, `print.checkRows.trickyWord`, `print.practice[].extraPictureWords`, `books[].cover.file`, and
  `approval.images.date|source|words`. The contract keeps `.passthrough()` on objects. Its closed enums include `meta.status`,
  the question `kind`, the book `kind`, the song `part`, `position`, and `band`. A scan of the values of `kind`, `part`, `status`,
  `position`, and `band` in w01 to w08 found no value at `82f88853` that is absent at `67be5603` (measured). This lowers the
  chance of a closed-enum fault. The receipt run is the proof.
- **Readiness logic.** `loadVisibleWeek` returns `null` and logs `storytime week st2/<n> blocked: <reason>`. The reason is
  `absent`, `invalid`, `draft`, `missing_picture`, or `media_not_approved`. A week that fails the contract returns `null` too, with the
  reason `invalid`. So "answers 404" alone cannot tell a draft week from a broken week. The tests assert the reason.
  `STORYTIME_SHOW_DRAFT_MEDIA=1` never overrides an unpublished week.
- **Receiver output.** The last line has the form
  `Wrote apps/storytime/content/source.json (record 8 weeks; this run 8 weeks, <M> media files, <X> missing pictures)`.
  A blocked week adds the line `Not ready for the at-home app: <paths>`.
- **Existing tests.** 42 files in `apps/storytime/__tests__/*.test.ts(x)` (phase1 3, phase2 13, phase3 24, phase4 2).
  No existing test hard-codes a media count or a missing-picture count of a shipped week (`rg -n` result in section P1.4).
- **Plan text that is stale.** Plan task 1.7 says "the 29 files of phase 2 and phase 3". The count today is 37 files in
  `phase2-*` and `phase3-*`. This strategy replaces the list with a glob (section P1.5).

## 3. Phase summary

| Phase | Risk | Review A | Review B (security) | Review C (UX/API) | Adversarial | Browser review |
|---|---|---|---|---|---|---|
| P1 Receive the week packages | medium | yes | no (probe list folded into Review A) | no | yes (focused) | no |
| P2 Approved A-42 pin | high | yes | no | no | yes (small) | no |
| P3 At-home deploy | high | yes (on the record) | yes (environment check) | no | no | no (tagged-URL checks instead) |

The reason for each entry is in the phase section.

## P1: Receive the Workbooks 82f88853 week packages

**Risk: medium.** The phase changes no app code, no route, no contract, and no media file. The content decides what children see
after a deploy. A wrong `meta.status` or a missing approval could show a week early. Two independent locks stop that: the
`published` status and the three media approvals (parent AC-5.5). The risk is not low, because the receipt commit is the
commit that Daniel deploys.

**Order dependency (item 6 of the brief).** Red and Green of Phase 1 start only after the parent Phase 3 heading carries
`[checkpoint: <sha>]`. At `6716a1546` it does not. Task 1.1 is the gate. If it fails, the phase stops and the orchestrator
reports it. No role starts a later task on a failed gate.

### P1.1 Tasks, tests, commands, and broken copies

`ROOT=/home/daniebo/Desktop/reading-advantage-monorepo`. `HO=~/Desktop/handoff`. `WB=~/Desktop/Workbooks`.
`PIN=82f88853615f2925d8f1c12b4571790305224178`. `HEAVY` stands for the wrapper of section 1.1.

**Task 1.1 Start gate** (light, run by the orchestrator, evidence class: automated).

- Command A (from `$ROOT`): `rg -n '^## Phase 3: At-home app.*\[checkpoint: [0-9a-f]{7,40}\]' measure/tracks/storytime_app_rebuild_20261025/plan.md`.
  Expected: exit 0 and one line. Today: exit 1.
- Command B (from `$HO`): for each of the 7 folders, `grep -Fc 'workbooks-commit: 82f88853' <folder>/MANIFEST.txt` prints `1`.
  Then `grep -Fxc "workbooks-commit: $PIN" <folder>/MANIFEST.txt` prints `1`. Expected: `folders_with_commit=7`.
- Command C: `git -C $WB rev-parse 82f88853` prints `$PIN`. Expected: exit 0.
- Command D (from `$ROOT`): `git rev-parse HEAD`. The orchestrator records the full SHA as the phase base.
- Broken copy: run command B over the 6 new folders (w02 to w07) and the superseded `$HO/w01-storytime-app-package` (commit
  `cf30bb2e…`) instead of r2. The old folder must print `0`, and the summary must be `folders_with_commit=6`. A check that
  passes for the old folder does not test the commit line.
  Run command A with the checkpoint text removed from a scratch copy of the plan line. It must exit 1.

**Task 1.2 Hand-off check** (light, reads only, evidence class: automated; test: AC-1.1).

- Command (from each folder, `bash`): `sha256sum -c MANIFEST.txt`, once per folder, with the labeled summary of the script below.
  The script is a shell loop in the plan note, not a repository file. It prints per folder
  `entries=<n> ok=<n> failed=<n> files_on_disk=<n> entries_outside_l2=<n> improperly_formatted=<n> exit=<n>` and ends with
  `folders_checked=7 entries_ok=294`.
- Pass rule for one folder: `exit=0`, `failed=0`, `ok == entries`, `entries > 0` (A4), `files_on_disk == entries + 1`,
  `entries_outside_l2 == 0`. `improperly_formatted` is recorded and is not a failure (plan take of parent task 3.8).
  `--strict` is not used. The run copies nothing.
- Pass rule for the set: `folders_checked=7`, `entries_ok=294`, `failed_total=0`.
- Optional text check, no hash: `diff` of the sorted entry lines of the old and new w01 manifests lists exactly the 7 paths of the
  r2 comment lines (`r2_changed_paths=7`: 6 changed, 1 added).
- Broken copies (in a scratch folder `/tmp/storytime-release-neg-<random>` made with `mktemp -d`; never in `$HO`):
  1. Copy the smallest folder (w04, 39 files). Change one hex digit of one entry line. Expected: `exit=1`, `failed=1`.
  2. Delete one listed media file. Expected: `exit=1`, `failed=1`.
  3. Flip one byte of one `.mp3`. Expected: `exit=1`, `failed=1`.
  4. Add one unlisted file. Expected: `sha256sum -c` exits 0 and `files_on_disk != entries + 1`, so the rule rejects the folder.
  5. Replace `MANIFEST.txt` by a file with only metadata lines. Expected: `entries=0`, the rule rejects the folder (A4).
  6. Add the entry line `<64 hex>  ../x.mp3`. Expected: `entries_outside_l2=1`, the rule rejects the folder.
  Each case must reject. A script that accepts one of them does not do its job.

**Task 1.3 Red tests** (run at the old pin; evidence class: automated; tests: AC-1.2, AC-1.3, AC-1.4, AC-1.5).

All new tests load the shipped files from `apps/storytime/content/`. No week fixture file goes under `__tests__/`. A broken copy
is a `structuredClone` of a shipped week with one change, made in the test. Each case unsets `STORYTIME_CONTENT_DIR` and
`STORYTIME_SHOW_DRAFT_MEDIA` before it runs and restores them after (as `phase3-media-gate.test.ts` does).

*File `apps/storytime/__tests__/release-receipt-pin.test.ts`* (AC-1.2, AC-1.5):

| Case | Asserts | Red at the old pin | Broken copy (must fail) |
|---|---|---|---|
| R1 pin | `source.json` `commit` equals `82f88853615f2925d8f1c12b4571790305224178` (full 40 digits). | Fails: expected `67be5603…` to be `82f88853…`. | A record that holds the short id `82f88853` fails the 40-digit match. |
| R2 file list | `files` equals the 8 paths `apps/storytime/content/l2/w01.json` to `w08.json`. The test prints `weeks_listed=8`. | Passes (the old list is already 8). It guards a subset record. | A record with 7 files fails. A list that holds `w09.json` fails. |
| R3 weeks load | For n = 1 to 8, `loadWeek(2, n)` returns `kind: "ok"`. The test builds the line `weeks_parsed=${count}` and expects `weeks_parsed=8`. It asserts `count > 0` first. | Passes. At the new pin it is the contract-fault detector (row F14). | `weekSchema.safeParse` of a clone of w02 with `meta.status = "approved"` fails with `meta.status` in the issue path. |
| R4 no hash | `source.json` has no key that matches `/hash\|sha256\|checksum\|digest/i` (A15). | Passes (`phase2-content.test.ts:127-140` holds the same rule). | A record with a `sha256` key fails. |
| R5 keys | `meta.key` of week n equals `st2/<n>` and `meta.week` equals n, for n = 1 to 8. | Passes. | A clone with `meta.key = "st2/3"` in w02 fails. |

Red failure: only R1 fails at the old pin. R2 to R5 are characterization cases that must hold at both pins.
Task 1.3 records this in the Red evidence (parent section 1.4).

*File `apps/storytime/__tests__/release-weeks-readiness.test.ts`* (AC-1.3, AC-1.4):

| Case | Asserts | Red at the old pin | Broken copy (must fail) |
|---|---|---|---|
| W1 draft weeks | For n = 2 to 8: `meta.status` is `draft`, `isWeekReady` is false, `loadVisibleWeek(2, n)` returns `null`, and `console.warn` got exactly `storytime week st2/<n> blocked: draft`. The test builds `weeks_checked=${count}` and expects `weeks_checked=7`; it asserts `count > 0` first. | Passes at the old pin. | A clone of w02 with `meta.status = "published"` must not log `blocked: draft`. A loader that logs `draft` for it does not read the status. (The two lock cases for a published clone are in adversarial case 3.) |
| W2 w08 named case | w08: `books` has length 0, `meta.status` is `draft`, `loadVisibleWeek(2, 8)` is `null`, reason `draft`. A separate `it` named `w08 is received at the new pin and stays draft`. | Passes. | A clone of w08 with `meta.status = "published"` and no books returns reason `missing_picture`. |
| W3 pictures arrived | For n = 2 to 7: `missingPagePictures(week)` has length 0, each of the 2 books has 8 pages with a `file`, and each cover has a `file`. The test prints `pages_with_file=<n>` and expects 96 (6 weeks × 16) and asserts the week list is not empty. This case proves that the 404 reason is the draft flag and not a missing picture. | **Fails:** expected 96 pages with a file, got 0. | A clone of w03 with one `image.file` deleted makes `missingPagePictures` length 1. |
| W4 draft switch | With `STORYTIME_SHOW_DRAFT_MEDIA=1`, `loadVisibleWeek(2, n)` is still `null` for n = 2 to 8. | Passes. | A loader that lets the switch open an unpublished week fails this case. |
| W5 w01 ready | `meta.status` is `published`, `isWeekReady` is true, `loadVisibleWeek(2, 1)` is not `null`. | Passes (w01 is ready at the old pin). | A clone of w01 with one page `file` deleted returns reason `missing_picture`. |
| W6 w01 r2 lines | w01 has `Each child colors their own book.` in 2 English `studentActions` and the Thai text `เด็ก ๆ ระบายสีหนังสือเล่มเล็กของตัวเอง` in 2 Thai `studentActions`. The test prints `color_own_book_en=2` and `color_own_book_th=2`. The old text `books (one for each pair)` occurs 0 times in `scripts` (`old_pair_books=0`). `approval.print.status` is `approved` and `approval.thai.words` contains `color-own-book`. | **Fails:** expected `color_own_book_en=2`, got `color_own_book_en=0`. | The old w01 (a clone with the old strings put back) gives `old_pair_books` greater than 0. |

Red failures at the old pin: R1, W3, and W6. Each failure message is an assertion on the old content. No file fails to load.
Red records any failure that says `Cannot find` or `ENOENT` as a defect of the Red test.

*Existing file edited by Red:* `apps/storytime/__tests__/phase3-loop-contract.test.ts` (section P1.4, row 1). The edited
`records the release pin` case fails at the old pin with expected `67be5603…` to be `82f88853…`.

**Red command** (from `$ROOT`):

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/storytime && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 __tests__/release-receipt-pin.test.ts __tests__/release-weeks-readiness.test.ts __tests__/phase3-loop-contract.test.ts'
```

Expected at the old pin: exit 1; 3 files; the failed cases are R1, W3, W6, and the pin case of `phase3-loop-contract.test.ts`
(4 failed). Every other case passes. No `it.skip`, `it.todo`, or skip condition.

**Task 1.4 Run the receiver at the new pin** (evidence class: automated; tests: AC-1.2, AC-1.3).

- Pre-check (light, from `$ROOT`): `git status --porcelain -- apps/storytime/content` prints nothing, and
  `find apps/storytime/content \( -name '*.tmp-*' -o -name '*.orig-*' \)` prints nothing. Expected: `content_dirty_lines=0 leftovers=0`.
  A non-empty result stops the run (runbook rule 6).
- Command (from `$ROOT`):

  ```bash
  HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && node_modules/.bin/tsx apps/storytime/scripts/receive-weeks.ts --commit 82f88853615f2925d8f1c12b4571790305224178 --weeks 1-8'
  ```

- Expected: exit 0. Eight lines `Wrote apps/storytime/content/l2/w0<n>.json (<a> media files, <b> missing pictures; <ready|not ready>)`.
  The line for w01 ends with `ready`. The lines for w02 to w08 end with `not ready`. The line `Not ready for the at-home app:` lists 7 paths.
  The last line has `record 8 weeks; this run 8 weeks`. Green quotes `<M>` and `<X>` in the plan note.
- Cross-check of the media list (light, no hash): the receiver lines without `missing:` for week n are a subset of the media entries of
  `$HO/w<nn>…/MANIFEST.txt`. Expected: `receiver_media_not_in_manifest=0` for the 7 weeks. `manifest_media_not_listed=<n>` is
  recorded (the allow list of exact print and benchmark paths in `phase3-media-coverage.test.ts` explains any difference).
- Exit 64 or exit 1: the task stops. Exit 1 with a contract issue path (for example `books.0.questions.1.kind`) is a contract fault.
  Parent row F14 applies: the orchestrator decides the order, contract first and receipt second. This track makes no contract change.
  `git status --porcelain -- apps/storytime/content` must show no change after a failed run (rollback rule).
- Broken copy: the existing `phase2-receive-guards.test.ts` (subset run exits 64, nothing changes) and `phase2-adversarial-r2.test.ts`
  (version 2, bad key) run in task 1.7 and prove the stop paths. Task 1.4 itself does not run a hostile source on the real tree.

**Task 1.5 Receipt commit** (evidence class: automated; tests: AC-1.4, AC-1.7).

- Stage by pathspec. Command (from `$ROOT`): `git commit -m '<subject>' -- <the 13 paths below>`. Never `git add -A` or `git add .`.
- Subject: `feat(storytime): receive weeks 1 to 8 at 82f88853 (track_id: storytime_at_home_release_20261106)` (96 characters).
  Check: `printf '%s' "$subject" | wc -c` prints 96 or less. The body lines are 100 characters or less.
- The 13 expected paths:
  `apps/storytime/content/l2/w01.json` to `w08.json` (8), `apps/storytime/content/source.json`,
  `apps/storytime/__tests__/release-receipt-pin.test.ts`, `apps/storytime/__tests__/release-weeks-readiness.test.ts`,
  `apps/storytime/__tests__/phase3-loop-contract.test.ts`, and `apps/storytime/__tests__/phase3-docker-smoke.sh`.
- Check (light): `git show --name-only --format= <receipt> | sort` equals the 13 paths. Expected: `receipt_paths=13`.
  The check also finds no media file: `git show --name-only --format= <receipt> | rg -n '\.(mp3|jpg|png|webp|mp4)$'` exits 1.
  The check finds no `package.json`, no `pnpm-lock.yaml`, and no file under `lib`, `app`, `scripts`, or `packages`.
- Broken copy: a receipt that stages `apps/storytime/lib/contracts/week.ts`, a media file, or a 14th path makes `receipt_paths` differ from 13.
  A receipt without `source.json` or without `w08.json` also fails the equality.
- The orchestrator records the receipt SHA (`git rev-parse HEAD` right after the commit) in the plan note.

**Task 1.6 Byte-equal checks** (light, read only, evidence class: automated; test: AC-1.2).

- Command (from `$ROOT`, a shell loop in the plan note): for n = 01 to 08,
  `cmp apps/storytime/content/l2/w$n.json <(git -C $WB show $PIN:content/storytime/l2/w$n.json)`. Expected: 8 exits 0.
  The summary line is `weeks_equal=8`.
- For n = 01 to 07, `cmp apps/storytime/content/l2/w$n.json $HO/<folder-of-n>/l2/w$n.json`. Expected: `weeks_equal_handoff=7`.
  For w01 the folder is `w01-storytime-app-package-r2`.
- Media cross-check from section 2: for each folder, the media paths that the week names (extension scan, `approval` subtree
  excluded by exact key) equal the media entries of its manifest. Expected: `media_named=280 media_in_manifest=280 media_diff=0`.
- w08 report: `git -C $WB diff 67be5603 82f88853 -- content/storytime/l2/w08.json` has 8 changed lines
  (`alligator` to `axe`; `nnn`, `mmm`, `sss` to `/n/`, `/m/`, `/s/`). The plan note quotes the count `w08_changed_lines=8` and the PM gets it.
- No command writes in `$WB`. The checks use only `git show`, `git diff`, and `cmp`.
- Broken copy: run the loop against a scratch copy of w05 with one byte changed. Expected: `cmp` exits 1 and `weeks_equal=7`.
  Run the loop against `git show 67be5603:…` for w02. Expected: `cmp` exits 1. A loop that reports `weeks_equal=8` for both fails.

**Task 1.7 Green gate and receiver gate** (evidence class: automated; tests: AC-1.5, AC-1.6, AC-1.7). The commands are in section P1.5.

**Task 1.8 Phase check** (evidence class: automated for the gates, person-checked for the reviews). The commands are in section P1.5.

### P1.2 Fixtures, mocks, and live proof

- A clone goes through `loadVisibleWeek` by a temporary `STORYTIME_CONTENT_DIR` folder under `os.tmpdir()` that holds `l2/w<nn>.json`,
  as `phase3-media-gate.test.ts` does. The test removes the folder after the case. Pure checks call `isWeekReady` or `weekSchema.safeParse` on the clone.
- The new tests take no mock of the week loader. `loadVisibleWeek` and `isWeekReady` run on the shipped files. A mock of
  `console.warn` only records the log line. It never decides the result.
- The hand-off checks use the real folders. Broken copies live in `/tmp/storytime-release-neg-*` and are removed at the end of
  the check (the cleanup is the owner's delete of a build output, not a gate).
- Function-level live proof: `loadVisibleWeek(2, n)` on the shipped folder, for n = 1 to 8. No built-server proof runs in Phase 1.
  A route test on the built server needs the deploy commit and belongs to Phase 3.
- No ready week file goes into `apps/storytime/content/`. The only published week is the shipped w01.

### P1.3 Does the 404 of w02 to w08 need a live (browser) check in Phase 1?

No. The phase changes no route, no page, no layout, and no media file. `loadVisibleWeek` is the function the route calls, and case W1 runs it on all
seven draft weeks and reads its reason. The route test `phase3-entry-route.test.ts` and the Docker smoke of parent Phase 3
already proved the route turns `null` into HTTP 404. A browser run in Phase 1 would test the same unchanged route with
the same function. The live check of the 404 for w02 to w08 on the built image and on the tagged URL belongs to Phase 3 (AC-3.2),
where the deployed commit exists. Task 1.8 records "browser gate not run: no app code, no route, no media file".

### P1.4 Existing tests that name the pin, a media count, or a missing-picture count (parent row F7)

Detectors, from `$ROOT`, at `6716a1546` (all `rg -n`, A14):

```bash
rg -n '67be5603|82f88853|ccf3d95c|cad0307c|cf30bb2e' apps/storytime --glob '!node_modules' --glob '!.next'
rg -n 'toHaveLength\(8\)|toBe\(8\)|toBeGreaterThanOrEqual\(15\)|record 8 weeks|weeks_parsed|approved_weeks' apps/storytime/__tests__
rg -n 'media files|missing pictures|mediaCount|missingCount|missing\.length|Not ready for the at-home' apps/storytime/__tests__
```

| # | File:line | What it names | Expected change at the new pin | Reason (one line for the evidence block) |
|---|---|---|---|---|
| 1 | `phase3-loop-contract.test.ts:32` (`TAKE_PIN`) and `:262-268` | The pin `67be5603…`; the case "records the w01 approval take pin and not an older pin" | Rename `TAKE_PIN` to `RELEASE_PIN` with `82f88853615f2925d8f1c12b4571790305224178`. Rename the case to "records the release pin". Keep `A_42_PIN` and `PREVIOUS_PIN` in the `not.toBe` lines. Do not keep `67be5603` anywhere. | The pin moves to the release commit. |
| 2 | `phase3-docker-smoke.sh:8` and `:234` | The label `ready at the pin 67be5603` (comment and `pass` text) | Replace the pin text by `82f88853`. The assertions do not change. The script does not run in Phase 1. | The text would state a false pin (A5). |
| 3 | `receive-weeks.ts:295` | A doc comment example `ccf3d95c` | No change. The comment shows a sample id. This file is not in the receipt. | Not a pin claim. |
| 4 | `phase2-content.test.ts:13-19`, `:167` (`EXPECTED_STATUS`, 8 weeks) | Statuses: w01 `published`, w02 to w08 `draft`; 8 weeks | No change. The statuses are the same at the new pin. | Canary for a status change. |
| 5 | `phase3-printed-urls.test.ts:28-71` (8 weeks, at least 15 URLs) | The printed URLs of the 8 weeks | No change. `home.readAlongUrl` and `home.songUrl` are equal at both pins (measured). | Canary for a path change. |
| 6 | `phase3-media-coverage.test.ts:14-22`, `:123`, `:207` | The 8-week list and the media coverage of every shipped path | No change expected. If it fails on a new media path in `print`, Green may add an exact field path with a reason to the allow list. If it fails on any other path, `mediaOf` misses a path: stop (parent row F14). | Covers the new `cover.file` and `image.file` of w02 to w07. |
| 7 | `phase2-receive-guards.test.ts:197`, `:207`, `:588-589` | `files` length 8, `record 8 weeks`, `this run 4 weeks` | No change. These tests build their own temp roots from shipped bytes. | Not tied to the pin. |
| 8 | `phase2-media-missing.test.ts:91-92` | A count of missing page pictures of shipped w01, computed from the file | No change. w01 already has 16 page pictures with a `file` at `67be5603`, so the count is 0 on both sides. | Computed, not hard-coded. See the note below. |
| 9 | `phase3-loop-receiver.test.ts:337` | The text `media files` in the receiver output | No change. | Output format. |
| 10 | `phase2-adversarial-r2.test.ts:137`, `phase2-contract.test.ts:171`, `phase3-loop-contract.test.ts:239-249` | Shipped weeks parse with the contract (`weeks_parsed=8`) | No change. These are the contract-fault canaries. | If one fails, the contract rejects a new field: stop. |
| 11 | `phase3-media-src-write.test.tsx:11` (w03), `phase3-browser-gate.sh:34-54` (w01 and w03 fixtures) | Shipped w03 pages | No change in Phase 1. The browser-gate comment "w03 ships with page pictures that hold no file yet" becomes stale because the new w03 has files. The fixture code skips pages that already have a `file`. | Phase 3 re-runs the gate on the deploy commit. |

Result of the three detectors: pin names are rows 1 and 2 (and row 3 as a comment). No test hard-codes a media count or a
missing-picture count of a shipped week. The only count of missing pictures is row 8, and it is computed. Row 8 is vacuous today
(0 equals 0, A4). The case `lists a page with an image entry and no file as missing` in the same file keeps the function covered.
This track does not change row 8. The orchestrator may record it as a follow-up.

After Green: `rg -n '67be5603' apps/storytime` exits 1 (no hit). `rg -n '82f88853' apps/storytime` finds the new `source.json`,
the loop-contract constant, the smoke label, and the two new test files.

### P1.5 Gate commands

All commands run from `$ROOT` unless the text names the folder. `HEAVY` is the wrapper of section 1.1.

**Targeted Green command** (task 1.7; the new files and the whole app suite; `files=44` after Red, `files=42` before):

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/storytime && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 __tests__/release-receipt-pin.test.ts __tests__/release-weeks-readiness.test.ts __tests__/phase1-*.test.ts __tests__/phase2-*.test.ts __tests__/phase3-*.test.ts __tests__/phase3-*.test.tsx __tests__/phase4-*.test.ts __tests__/phase4-*.test.tsx'
```

Expected: exit 0; 44 files; the test count is quoted from the output; no failed and no skipped test. The plan's "29 files" is replaced by this glob.
It covers the phase 2 and phase 3 files that read shipped weeks, the files that name the pin, and the phase 1 and phase 4 files that read the content folder.

**Type and lint gates** (task 1.7):

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/storytime && ../../node_modules/.bin/tsc --noEmit'
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/storytime && ../../node_modules/.bin/eslint __tests__/release-receipt-pin.test.ts __tests__/release-weeks-readiness.test.ts __tests__/phase3-loop-contract.test.ts'
```

Expected: both exit 0. The `.sh` file has no ESLint run.

**Receiver gate bound to the receipt commit** (task 1.7; run after task 1.5):

1. `git log -1 --format=%H -- apps/storytime/content` equals the receipt SHA of task 1.5. Label: `content_last_commit=<sha>`.
   The check uses the path history and not `HEAD`, because other sessions commit on master. Expected: equal.
2. `git status --porcelain -- apps/storytime/content` prints nothing before the run (`content_dirty_lines=0`).
3. The second receiver run, with the command of task 1.4 (same pin, `--weeks 1-8`). Expected: exit 0.
4. `git diff --exit-code apps/storytime/content` exits 0, and `git diff --cached --exit-code apps/storytime/content` exits 0.
5. `git status --porcelain -- apps/storytime/content` prints nothing again (`content_dirty_lines=0`). The diff commands ignore an
   untracked file, so this check catches a new stray file.
6. Falsification: run steps 3 to 5 once before the receipt commit exists (right after task 1.4). Step 4 and step 5 must then show
   a difference against `HEAD` or the dirty list is not empty. A gate that passes before the commit is not bound to the commit.
   Run this once in the Green evidence. The run uses `git diff --exit-code HEAD -- apps/storytime/content`, which must exit 1 before the receipt commit.

**Phase check** (task 1.8):

```bash
bash apps/storytime/__tests__/phase1-quality-gates.sh
```

The script enters `heavy-run.sh` itself. Expected: exit 0 and the line `=== Total: 2 checks (PASS=2, FAIL=0) ===`.
The script runs `turbo run build check-types lint test --filter=storytime`. The `test` task runs the whole app suite.
Then the targeted Green command, `tsc`, ESLint, and the receiver gate repeat once at the final HEAD. The plan note quotes each exit code and count (A5).

**Green gate (task level):** the Red files exit 0 with at least one test that ran in each file; the receipt commit holds the 13 paths.
**Closeout gate (phase level):**

1. The Green gate, the targeted Green command, `tsc`, and ESLint, each exit 0.
2. The receiver gate (steps 1 to 5 exit as written).
3. Task 1.2 and task 1.6 records: `folders_checked=7`, `entries_ok=294`, `weeks_equal=8`, `weeks_equal_handoff=7`, `media_diff=0`.
4. `phase1-quality-gates.sh` exits 0 with `PASS=2, FAIL=0`.
5. `rg -n '67be5603' apps/storytime` exits 1.
6. `git diff --stat <phase_base_sha>..HEAD -- apps/primary-advantage apps/storytime/lib apps/storytime/app apps/storytime/scripts packages` is empty.
   Phase 1 touches none of these paths.
7. `git worktree list | wc -l` equals the count at the task 1.1 capture (8 at `6716a1546`). No new entry (A16).
8. `build-graph update ./graph.db` is not needed: the phase adds no export and changes no signature (A10). The note says so.
9. Review A, the adversarial record, and the phase acceptance. The checkpoint is written after them.

### P1.6 Adversarial testing (focused; applies)

The attack surface is mistaken or hostile data from outside the repository. The adversarial role works on scratch copies and on
in-memory clones. It does not change the real `apps/storytime/content` folder. It may add a test file in a later commit.

| # | Case | Method | Expected result |
|---|---|---|---|
| 1 | Broken `MANIFEST.txt` line | The six cases of task 1.2 on a scratch copy of w04 | Each case rejects the folder. Zero files copied. |
| 2 | `workbooks-commit` of another commit | The old w01 folder (`cf30bb2e…`) | The start gate counts `folders_with_commit=6`. |
| 3 | A week file with `meta.status` `published` | In-memory clone of shipped w02 (images approved, audio and song draft) | Reason `media_not_approved (audio, song)`, `null`. With the three parts `approved` the clone is visible: the lock is the approval parts. No file is written. |
| 4 | The draft switch | `STORYTIME_SHOW_DRAFT_MEDIA=1` with shipped w02 to w08 | All 7 stay `null` (the switch never opens an unpublished week). With a published clone and draft audio, the switch opens it. Production sets no switch (AC-3.3). |
| 5 | Closed enum value | Clone of w02 with `meta.status = "approved"`, and one with `books[0].questions[0].kind = "why"` | `loadWeek` returns `invalid`; the receiver in a temp root exits 1 and names the field path. The folder is unchanged. |
| 6 | A seventh approval part and new `print` fields | Shipped w01 (`approval.print`, `print.checkRows`) | Parses. `STORYTIME_APPROVAL_PARTS` stays six. `isWeekReady` ignores `print`. |
| 7 | Path in a week file | Clone of w05 with `..` or `/` in `books[0].audio.file` | Contract rejects it with the field path (`phase2-adversarial-r2.test.ts:80-100` covers it; the role runs it on the new w05). |
| 8 | Subset run at the new pin | `--weeks 1-7` in a temp root (existing `phase2-receive-guards.test.ts:178`) | Exit 64. Nothing changes. The role does not run it on the real tree. |
| 9 | Leftover `.orig-` file | Existing `phase3-receiver-hardening.test.ts` | Exit 1 before any read. The role does not run it on the real tree. |
| 10 | Receipt reaches users early | `git show <receipt>:apps/storytime/content/l2/w02.json` | `meta.status` is `draft` for w02 to w08. |

Falsification: case 3 with the shipped w02 and `published` only must not be visible. A loader that shows it fails the case (A2).

### P1.7 Review roles

- **Review A (change quality): applies.** Scope: the 13-path diff of the receipt commit, the new tests, the evidence of tasks 1.2 to 1.7,
  and the commit header. The byte-equal records stand for the 8 week files: Review A reads the `cmp` summary and the `git show --stat`, not 20,000 JSON lines.
  Review A runs the anti-pattern checks of section P1.9 and the security probes below.
  Probes folded into Review A (this replaces Review B): (1) the commit adds no file outside the 13 paths and no media file;
  (2) `source.json` holds no hash key (A15); (3) `meta.status` of w02 to w08 is `draft` in the committed bytes; (4) no deploy file names
  `STORYTIME_SHOW_DRAFT_MEDIA` (`phase3-media-gate.test.ts:100` passes); (5) `rg -n 'measure/tracks' apps/storytime/__tests__` exits 1 (A9).
- **Review B (security): does not apply as a separate role.** The phase imports content and adds no code, no route, no input surface, and no dependency.
  It copies no media. The receiver guards (path, link, leftover, rollback) run unchanged in task 1.7 through the phase 2 and phase 3 files.
  The probe list above covers the new risk. If the receipt run needs a code change (a contract fault), the phase stops, and the orchestrator opens Review B for that change.
- **Review C (UX/API): does not apply.** No component, no route, no contract, and no API changes. The visible effect is the content of w01 r2
  after the deploy. Daniel judges the content (parent AC-12.1). The contract fault case is a stop, not a Review C item.
- **Adversarial testing: applies** (section P1.6). One focused round after Green.
- **Browser review (UX): does not apply** (section P1.3). The note in task 1.8 says so.
- **Phase acceptance: applies.** It checks the closeout gate, the plan notes (A5), and the checkpoint text.
- Model families follow parent section P3.2: Red and Green differ, Review A differs from Green, and an auditor is not Green's family.
  The orchestrator logs a deviation. This strategy ran on Sonnet.

### P1.8 Anti-pattern coverage

| Task | Anti-patterns and defense | Falsification condition |
|---|---|---|
| 1.1 | **A3:** `folders_with_commit=7`. **A4:** the check lists 7 folders (a count of 0 fails). **A14:** `rg -n`. | The old w01 folder passes the commit check. |
| 1.2 | **A3:** `folders_checked=7`, `entries_ok=294`. **A4:** `entries > 0` per folder. **A7:** the entry regex is `^[0-9a-f]{64}  `, never a word; the extension scan excludes the `approval` subtree by exact key. **A15:** no hash is added; `--strict` is not used. | A manifest with 0 entries, or with `../x.mp3`, or an unlisted file, passes. |
| 1.3 | **A4:** each loop asserts a non-empty week list or page count before it checks a property (`weeks_parsed=8`, `weeks_checked=7`, `pages_with_file=96`). **A2:** W1 and adversarial case 3 prove that a draft week stays 404 and a published clone with draft audio stays blocked. **A9:** no test reads `measure/tracks`. **A3:** labeled lines. | A test passes with zero weeks. A draft week renders. |
| 1.4 | **A5:** the plan note quotes the exit code, `record 8 weeks`, and `<M>`, `<X>`. **A2:** the receiver never changes `meta.status` (W1 and `phase2-content.test.ts` AC-4.2 prove it). | The note says "received" with no exit code. |
| 1.5 | **A15:** `source.json` holds a commit and a file list, no hash. **A16:** no worktree; the commit uses a pathspec. | The commit holds a 14th path, a media file, or a hash key. |
| 1.6 | **A3:** `weeks_equal=8`, `weeks_equal_handoff=7`, `media_diff=0`. **A4:** the loop covers 8 and 7 files. **A15:** `cmp` and `git show` only; no new hash. | A loop that reports 8 for a changed byte. |
| 1.7 | **A5:** exit codes and counts (`files=44`) quoted. **A14:** `rg -n`. **A10:** noted as not needed. | The plan says "pass" and a cited command exits non-zero. |
| 1.8 | **A6:** `measure/tracks.md` names the state "received locally at `<receipt>`, not deployed". It never says "live" before Phase 3 and Daniel's word. **A5:** the report to the PM quotes the SHA and the test tail. **A1, A8:** the human gate is the marker `[b] … deferred:daniel` on Phase 3 task 3.1 only. | `tracks.md` says "live" after Phase 1. |

### P1.9 Architecture guardrails and changed-contract risks

- No file under `apps/storytime/lib`, `app`, `scripts`, `packages`, or `apps/primary-advantage` changes. Closeout item 6 proves it.
- The receiver writes only week files and `source.json`. Media stay in the hand-off folders. Nothing writes in `$WB`.
- The review copy reads media through `STORYTIME_MEDIA_BASE` (spec R3). No role copies a media file into the repository.
- **Contract risks.** The new fields of section 2 pass through the contract today (measured structure, not yet run). A closed enum or a new
  required field at the receipt makes the receiver exit 1 with a path. The phase stops. The orchestrator decides the order (contract first).
- **Pin-bound tests.** W3 and W6 describe the content at `82f88853`. The approved pin of Phase 2 may change them. Phase 2 Red edits them in the same
  commit as the approved pin (row F7, repeated).
- **Draft weeks have pictures now.** w02 to w07 would be ready except for the status and the audio and song approvals. A mistaken `published` in a later
  Workbooks pin plus approved audio and song would open the week. The approval parts are Daniel's record. The Phase 2 receipt test counts the statuses.

## P2: Approved A-42 pin (outline)

**Risk: high.** External data decides what children see. An approved flag without Daniel's check is an A2 fault. The strategy refresh for this phase
runs after the Phase 1 checkpoint and after the approved pin arrives (target 2026-11-17 to 2026-11-19).

- **Start:** the Phase 1 heading carries `[checkpoint: <sha>]`. The date and the PM hand-off of the approved pin exist. The orchestrator captures a new
  `phase_base_sha` by `git rev-parse HEAD` at that point.
- **Red command (shape):** `cd apps/storytime && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 __tests__/phase3-approved-pin.test.ts __tests__/phase3-loop-contract.test.ts __tests__/release-receipt-pin.test.ts __tests__/release-weeks-readiness.test.ts`, inside the `HEAVY` wrapper.
  The new file `phase3-approved-pin.test.ts` holds the parent rows: `approved_weeks=8`, a valid `date`, non-empty `words` that differ from the draft text,
  and the commit equal to the PM hand-off (parent P3.8, task 3.10).
- **Edits in the same commit as the new pin:** the pin constant of `phase3-loop-contract.test.ts`, the pin case R1 of `release-receipt-pin.test.ts`,
  and the cases W1, W3, and W6 of `release-weeks-readiness.test.ts` if the statuses or contents change (row F7). Each edit gets one line of reason.
- **Green and closeout gate:** the receiver at the approved pin exits 0 for weeks 1 to 8; the second run and `git diff --exit-code apps/storytime/content` exit 0,
  bound to the Phase 2 receipt commit by the path-history check of section P1.5; `phase3-approved-pin.test.ts` and `phase3-loop-contract.test.ts` exit 0;
  `phase1-quality-gates.sh` exits 0; the targeted Green command exits 0 with the new file count; `tsc` and ESLint exit 0.
- **Byte-equal and hand-off checks:** repeat tasks 1.2 and 1.6 for every changed folder. The approved weeks arrive as new hand-off folders. Use the manifest and
  `cmp` rules as in Phase 1. Media still stay out of the repository.
- **Special risks:** (1) the readiness result for w02 to w07 changes if the pin sets `published` and approves audio and song: the 404 rows of W1 become
  200 rows by Daniel's approval, and Phase 3 must deploy only the weeks that Daniel passed; (2) the loops part `approval.loops` needs `date` and `words`
  when approved (parent AC-13.2); (3) a closed enum in the loops fields (row F14) stops the task.
- **Anti-patterns:** A2 (the receiver never writes `approved`; a test counts `approved_weeks=8`), A3, A4, A5, A15, A16.
- **Reviews:** Review A on the diff: yes. Review B: no (no new input surface). Review C: no. Adversarial: a small round on an approved loops part without
  `words`, and on a draft clone at the approved pin. Browser review: no. The parent Task 3.10 closeout gate is the base of this phase check.

## P3: At-home deploy (outline)

**Risk: high.** The deploy is Daniel's gate (parent spec section 5). The task marker is `[b] … deferred:daniel`. No role pushes or deploys before his word (AC-3.1).

- **Before the word (allowed, automated):** the deploy commit is the exact passed commit. Run `bash apps/storytime/__tests__/phase3-docker-smoke.sh`
  once on that commit: run 1 answers 200 for shipped `st2/1`, a draft week (w02 to w08) answers 404 with the reason `draft`, and run 1b proves
  `missing_picture` with a broken clone. The script enters `heavy-run.sh` itself. Run `phase3-browser-gate.sh` once, because the new w03 pages
  have files (row 11). Both gates are a recommended addition to plan task 3.1 (see the questions in the result block).
- **After the word:** deploy by the runbook `docs/runbooks/storytime-deploy.md` to `storytime-app` with no traffic. Then:
  1. The tagged URL answers 200 for the ready weeks and 404 for w02 to w08 (AC-3.2). The check output is `ready_ok=<n>` and `draft_404=<n>`, with `n > 0`.
  2. The media files in the production bucket match the hand-off files, file by file (AC-3.2, parent rule 12.4). The check uses the existing `sha256sum -c MANIFEST.txt`
     of each folder against the bucket download, with the labeled count `bucket_files_ok=<n>`. It adds no new hash file.
  3. The environment of the deployed revision holds no `STORYTIME_SHOW_DRAFT_MEDIA` (AC-3.3). The record names the command (for example
     `gcloud run revisions describe … --format='value(spec.containers[0].env)'`) and the result `draft_switch_set=0`.
  4. After Daniel moves the traffic: each printed URL of the published weeks answers 200 on the live domain (AC-3.4, `urls_ok=<n>`).
- **Server and client in one job:** a local `next start` check runs as one `HEAVY` job with `trap 'kill $SERVER_PID' EXIT`.
- **Anti-patterns:** A1 and A8 (the gate is the structured marker, not prose), A3, A4 (a 404 check lists 7 weeks first), A5, A6 (the registry names a deploy
  state only after AC-3.1 and AC-3.4 pass, with the revision and Daniel's word), A16.
- **Reviews:** Review A on the record: yes. Review B (environment check and bucket access): yes, small. Review C: no. Adversarial: no (the Phase 1 and Phase 2 rounds hold the data attacks).
  Browser review: no. The tagged-URL checks replace it.
- **Do not:** upload media before the word, move traffic without a separate word, or set `STORYTIME_SHOW_DRAFT_MEDIA` on the production service.

## 4. Questions and plan changes for the orchestrator

Each item has a default. The orchestrator may answer or accept the default.

| # | Item | Default |
|---|---|---|
| Q1 | Task 1.7 says "the 29 files". The app has 37 files in `phase2-*` and `phase3-*` and 42 files in all. | Use the glob of section P1.5 and quote `files=<n>`. No edit to `plan.md` is required. |
| Q2 | The receipt commit should include `phase3-docker-smoke.sh` (the pin label, row 2). The plan names only "test files". | Include it. The path list has 13 paths. |
| Q3 | Task 1.3 in the plan describes W1 as "404". This strategy adds the reason `draft`, the "pictures arrived" case W3, and the lock cases. | Follow this strategy. The plan wording stays. |
| Q4 | Plan task 3.1 does not list the Docker smoke or the browser gate before the deploy. | Add both at the Phase 3 strategy refresh. Not a Phase 1 change. |
| Q5 | Review B and Review C do not apply to Phase 1 (section P1.7). | Run Review A with the folded probes. |
| Q6 | The plan statement "MANIFEST of r2 lists the 7 changed files" is true for the comment lines, not for entry lines. | No change. The check `r2_changed_paths=7` is optional. |
