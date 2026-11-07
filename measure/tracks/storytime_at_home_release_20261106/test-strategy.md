# Test strategy: Storytime at-home release (weeks 1 to 7 in the app)

> **Track:** `storytime_at_home_release_20261106` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Parent strategy:** [storytime_app_rebuild_20261025/test-strategy.md](../storytime_app_rebuild_20261025/test-strategy.md) (sections 1, P2, and P3 apply).
> **Scope:** Phase 1 in full. Phase 2b in full (section P2b, written 2026-11-07 at role base `1da5f7968`, text of `7cd1fc067`). Phases 2 and 3 as an outline (sections P2 and P3 below).
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
| P2b Login and protected media | critical | yes | **yes (required)** | **yes (required)** | **yes (required)** | **yes (required)** |
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

## P2b: Login and protected media

**Risk: critical.** The phase adds authentication, sessions, a CSRF check, a password store, signed media URLs, and a role gate to a service that
was public. A fault opens paid content to any person, or locks every family out on release day. Both faults are silent in a unit test that
mocks the store. The data are family accounts of children. The spec and the design were reviewed before this strategy (DeepSeek, `spec-review-p2b-fb0545c15.json`).
Source: spec FR-4 and AC-4.1 to AC-4.12, plan Phase 2b tasks 2b.2 to 2b.10, `login-design.md`, owner words of Daniel (2026-11-07 06:07 and 06:21 ICT).

| Task | Risk | Reason |
|---|---|---|
| 2b.2 Red | high | Wrong tests give false trust in the gate. The Red files hold the contract pins of P2b.2. |
| 2b.3 Schema, migration | high | A wrong constraint or a missing EXEMPT entry breaks sessions, or fails the tenant coverage test. |
| 2b.4 Auth adapter, routes, proxy, pages | critical | The sign-in, the return path, the cookie, the CSRF check, the role gate. |
| 2b.5 Account script | high | It handles passwords and writes secret files outside the repository. |
| 2b.6 Signed media | high | Scope of keys and expiry decide who can read the media. |
| 2b.7 Phase check | critical | It is the only place where the app, a real Postgres, and a browser run together. |
| 2b.8, 2b.9 Orchestrator | high | Cloud policy, secrets, and 9 production accounts. |

### P2b.0 Role base and capture of `phase_base_sha`

- Role base of this strategy: `1da5f79681c215c836f135fc83e18544bd9ff2a5`. HEAD moved to `7cd1fc067` during the work (plan, spec, and design only: task 2b.8 `[x]`,
  the private bucket `gs://storytime-app-media`, new AC-4.7 and AC-4.9 text). This strategy covers the text of `7cd1fc067`.
- The Phase 1 heading carries `[checkpoint: 811f05f36]`. The start gate of Phase 2b holds.
- `phase_base_sha`: the orchestrator captures it with `git rev-parse HEAD` AFTER the commit of this strategy, AFTER the answers to the questions of P2b.12, and BEFORE
  the Red role starts. The orchestrator records the full SHA in the Red evidence. A SHA from before the strategy commit is not valid. The Red commit sits inside `phase_base_sha..HEAD`.

### P2b.1 Measured facts (2026-11-07, role base `1da5f7968`, tree read-only)

| # | Fact | How measured |
|---|---|---|
| M1 | The targeted Storytime command (section P1.5, glob of the base) exits 0 with `files=59 tests_passed=452 tests_failed=0`. Duration 105 s. | One `heavy-run.sh` job (this strategy). |
| M2 | `apps/storytime/__tests__` holds 60 `*.test.ts(x)` files and 7 `*.sh` gates. 5 test files call the week page as a function (`phase3-adversarial-r2-missing-part`, `phase3-adversarial-r3-tiles`, `phase3-home-render`, `phase3-adversarial-route`, `phase3-printed-urls`). 29 files name `app/[locale]`. | `rg -l`. |
| M3 | `apps/storytime/node_modules/@reading-advantage/` links only `config` and `read-along`. `package.json` has no `db`, `auth`, `storage`, or `backend` dependency. Green must add them and run `pnpm install`. | `ls -la`. |
| M4 | The workspace packages resolve to `dist/` (their `exports`). A test in the app reads built code, so `db`, `auth`, `storage`, and `backend` must be built before the app tests (`pnpm turbo run build --filter=storytime...`). `dist` exists today. | `package.json` `exports`. |
| M5 | `@reading-advantage/auth` exports only `"."`. Import of `dist/index.js` with `NODE_ENV=production` and no `DATABASE_URL` THROWS `{ DATABASE_URL is required in production runtime }` (the index loads `@reading-advantage/db`, whose `client.ts` builds a `postgres` client at load). Import of `dist/password.js` alone, and of `dist/rate-limit.js` alone, succeeds. | `node --input-type=module` probe, no `DATABASE_URL`. |
| M6 | `hashPassword`/`verifyPassword` use Argon2id with `m=19456,t=2,p=1` (`ARGON2ID_OPTS`). `verifyPassword` returns `false` on a thrown error. `consumeRateLimit(store, key, {windowMs,maxAttempts})` counts EVERY call and allows while `failedCount <= maxAttempts`. Defaults in the package: 5 per username and 30 per IP in 15 minutes. | Read `password.ts`, `rate-limit.ts`. |
| M7 | The session token digest function of `packages/auth` (`sha256Hex` in `session.ts`) is private. Storytime writes its own. A SHA-256 digest of a random token is a credential store and not a provenance hash (hashing policy: allowed, required by the design). | Read `session.ts`. |
| M8 | `DATABASE_BOUNDARY` (`ownership-map.v2.json`, severity error) allows imports of `@reading-advantage/db`, `@reading-advantage/db/*`, `drizzle-orm`, and `postgres` only in `packages/db/src`, `packages/domain/src`, `packages/backend/src`, and the db migration folders. The baseline holds 467 existing findings in apps. A new import in `apps/storytime` is a NEW finding. `apps/accounting` shows the pattern: the app depends on `@reading-advantage/backend`. `STORAGE_PROVIDER_BOUNDARY` matches only `@aws-sdk/`, `@google-cloud/storage`, and `firebase-admin/storage`; the adapter `@reading-advantage/storage` is allowed in an app. | Read `ownership-map.v2.json`, `database.v2.json`. |
| M9 | `packages/domain/src/tenant-registry.ts` registers `accountingSubmissions` and `accountingSubmissionAuditEvents` as EXEMPT through the subpath `@reading-advantage/db/accounting/schema`, although the accounting module is not in the db barrel. `tenant-coverage.test.ts` enumerates the db barrel. Precedent for a separate-database module: `packages/db/accounting/drizzle.config.ts`, `src/accounting/`, subpath export, registry entry. | Read both files. |
| M10 | `packages/db/vitest.config.ts` includes `src/**/*.{test,spec}.{ts,tsx}`. A db test runs as `cd packages/db && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 <file>`. `*.real-db.test.ts` files use `describe.skip` unless `PG_TEST_URL` is set. Measured: `accounting-schema.test.ts` and `barrel-hygiene.test.ts` run as 2 files and `tests_passed=9` in 3.4 s. The domain `tenant-coverage.test.ts` runs as 1 file and `tests_passed=11` in 2.4 s (both exit 0, one `heavy-run.sh` job). | Read config; probe job. |
| M11 | PGlite (`@electric-sql/pglite` 0.5.3) is installed at the root and used by `apps/marketing` and `apps/primary-advantage` tests (`testDb.ts`, `migration-0041-live.test.ts`). It is a real Postgres engine in the test process: no server, no Docker. Neither `packages/db` nor `packages/backend` lists it. `@electric-sql/pglite-socket` is not installed. | `ls`, `git grep`. |
| M12 | No Postgres container runs. The image `docker.io/library/postgres:16-alpine` is present under podman (`docker` is the podman emulation). Port 5432 has no listener. | `podman ps`, `ss -ltn`. |
| M13 | `proxy.ts` only adds the Thai prefix. `FILE_PATH` (`/\.[^/]+$/`) and the `PASSTHROUGH` list return `NextResponse.next()` BEFORE any other rule. A cookie rule placed after them is bypassable by a dotted last segment (`/th/st/2/1.x`). | Read `proxy.ts`. |
| M14 | No `app/[locale]/st/page.tsx` exists. The return fallback `/<locale>/st` of the design would answer 404. | `find app`. |
| M15 | The teacher pages call `teacherRoutesEnabled()` (`STORYTIME_TEACHER_ROUTES` exact `1`) and answer 404 when it is off (`phase4-teacher-flag.test.ts`). Production has the flag off. | Read the pages. |
| M16 | The week page builds media URLs as `${mediaBase}/${file}` on the server and on 4 client components, and a client component receives `mediaBase` as a prop. The 42 w01 files include 14 mp3, 26 jpg, and 2 mp4. They sit in several fields: measured over the shipped w01 outside `approval`, the entries are `file` 30 (26 distinct), `audio` 8, `slowFile` 2, `video` 1, `videoPhone` 1, `poster` 1, `posterPhone` 1, and path arrays (the phoneme clips); 78 entries, 42 distinct. The walker over the whole week finds 43 distinct, because `approval.audio.source` is prose that ends in `.mp3`. The bucket holds the 42 w01 r2 objects (task 2b.8 note). | Read page and client sources; `find`. |
| M17 | The existing gates assume a public site: `phase3-docker-smoke.sh` asserts that the week page answers 200 with no `Set-Cookie`; `phase3-browser-gate.sh` opens `/th/st/2/*` with no session. Both break by design when the login lands. | Read the scripts. |
| M18 | `pnpm architecture:check` FAILS at the base: exit 1 with the one message `Architecture check failed: V2 reconciliation manifest is invalid: Analyzer input snapshot hash does not match current bytes`. The break exists before this phase (a stale reconciliation manifest). The check cannot serve as a pass gate. | Probe job (`arch_exit=1`). |

### P2b.2 Contract pins (names that Red and Green share)

Red tests import these names. Green must create exactly these. The orchestrator may change a pin before Red starts, and the change goes in this table.

| Item | Pin |
|---|---|
| Schema module | `packages/db/src/schema/storytime/index.ts`, subpath export `@reading-advantage/db/storytime/schema`. Tables `storytimeAccounts`, `storytimeSessions`, `storytimeLoginAttempts`, `storytimeAuditEvents`. Config `packages/db/drizzle.storytime.config.ts`. Migrations `packages/db/drizzle-storytime/`. Script `storytime:migrate` in `packages/db/package.json`. |
| Store | `packages/backend/src/modules/storytime-access/index.ts`, subpath export `@reading-advantage/backend/storytime-access`. It owns all SQL. Every time-dependent function takes an explicit `now: Date`. Functions: `findAccountByUsername`, `createAccount`, `setDisabled`, `setPasswordHash`, `createSessionWithCap` (one transaction), `findSessionByDigest`, `recordUse`, `renewSession`, `deleteSessionByDigest`, `rateLimitStore` (a `RateLimitStore`), `insertAuditEvent`. Created with `createStorytimeStore(db)`. |
| App adapter | `apps/storytime/lib/auth/`: `index.ts` (`login`, `logout`, `getCurrentUser`, `requireUser`, `requireRole`), `return-path.ts` (`safeReturnPath(value, fallback)`), `same-origin.ts` (`assertSameOrigin(headers, ownOrigin)`, throws `CrossOriginError`), `session-policy.ts` (constants below), `cookie.ts`, `password.ts` or the `@reading-advantage/auth` subpath (Q2), `client-ip.ts`, `store.ts` (`getStore()`, the only place that reads `STORYTIME_DATABASE_URL`). |
| Routes | `app/api/auth/sign-in/route.ts` (POST), `app/api/auth/sign-out/route.ts` (POST; GET answers 405), `app/[locale]/sign-in/page.tsx`, `app/[locale]/join/page.tsx`, `app/[locale]/st/page.tsx` (return fallback, Q4), `lib/join-copy.ts` (`JOIN_COPY.status`). Form fields: `username`, `password`, `next`, `locale`. |
| Responses | Sign-in success: 303 to the checked `next`. Failure: 303 to `/<locale>/sign-in?error=invalid&next=<checked>`. Locked: 303 with `error=locked`. Cross-origin: 403, no `Set-Cookie`. Sign-out: 303 to `/<locale>/sign-in`. |
| Cookie | Name `__Host-st_session`. `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`, no `Domain`. Value: 32 random bytes, base64url (43 characters). The database holds the lowercase 64-hex SHA-256 digest only. |
| Constants | `SESSION_MAX_AGE_S=31536000`, `RENEW_BELOW_DAYS=335`, `CAP_CLASS=30`, `CAP_FAMILY=5`, `CAP_TEACHER=5`, `MEDIA_URL_EXPIRES_S=21600`, rate limit 5 per account and 30 per IP in 15 minutes (package defaults). |
| Media | `apps/storytime/lib/media/sign.ts`: `signWeekMedia(week, deps)` returns a map `media path -> signed URL` for EVERY media path of that week and for no other key. The paths come from the receiver walker `mediaPathsOf` (`apps/storytime/scripts/receive-weeks.ts:191`; it walks every string of the week and keeps a string with a media extension). The signer drops each entry whose field path starts with `approval.` (a prose string there can end in `.mp3`) and removes duplicates. Expected for the shipped w01: `signed_map_size=42` (the 42 w01 media objects, M16). The media fields are `file`, `slowFile`, `audio`, `video`, `videoPhone`, `poster`, `posterPhone`, and the entries of arrays of paths; the `file` key alone covers only 26 of the 42. `STORYTIME_MEDIA_BASE=gs://<bucket>` names the bucket. The page passes the map to the client views. **Pin changed by the orchestrator on 2026-11-07, after Red** (the first text said "the `file` fields of that week only"). |
| Script | `apps/storytime/scripts/make-accounts.ts`. It reads the database URL from the environment only. |
| Fake store | `apps/storytime/__tests__/helpers/fake-store.ts` (not a test file). It implements the store interface for app tests. |

### P2b.3 Red command (task 2b.2) and expected failures

Red writes 12 files: 10 in `apps/storytime/__tests__/`, 1 in `packages/db/src/__tests__/`, and 1 in `packages/backend/src/modules/storytime-access/__tests__/`. One job, three Vitest runs:

**Red rounds (record, 2026-11-07).** Red r2 to r4 fixed defects in the Red tests, not in the contract: r2 `7f0090fba` (pin the store lookup by account id), r3 `9824a5081` (fix the login Red test defects), and r4 (the commit that runs now; the orchestrator adds its SHA to the Red evidence). The command and the expected failures below describe the first Red. Each later round must keep `files_failed` equal to the files that still await Green, and must not lower the count of cases per AC.


```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'ROOT=/home/daniebo/Desktop/reading-advantage-monorepo; cd $ROOT/apps/storytime && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 __tests__/login-*.test.ts __tests__/login-*.test.tsx; A=$?; cd $ROOT/packages/db && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/__tests__/storytime-schema.test.ts; B=$?; cd $ROOT/packages/backend && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/modules/storytime-access/__tests__/store.contract.test.ts; C=$?; echo "red_exit_app=$A red_exit_db=$B red_exit_backend=$C"; exit $(( (A!=0) || (B!=0) || (C!=0) ))'
```

Expected: exit 1; `red_exit_app`, `red_exit_db`, and `red_exit_backend` are all non-zero; `files_failed=12 of 12`; `tests_passed=3` in total (the three characterization cases C1 to C3 of `login-proxy.test.ts`).
A Red test that passes besides C1 to C3 is vacuous (A4). A Red failure is an assertion with a message, not a load error: each test first asserts `existsSync(<pinned path>)` with the message `Missing <path>`, then imports the module dynamically (pattern of `phase3-entry-route.test.ts`). The output holds no `Cannot find module` and no `ENOENT`.

| File | AC | Expected Red failure (at base) |
|---|---|---|
| `login-return-path.test.ts` | 4.2 | `Missing apps/storytime/lib/auth/return-path.ts`. After Green: `next_cases >= 24`, accepted >= 5, rejected >= 19. |
| `login-origin-check.test.ts` | 4.3 CSRF | `Missing .../same-origin.ts`. After Green: `cross_origin_cases >= 10`, `same_origin_cases >= 3`. |
| `login-signin-handler.test.ts` | 4.3 | `Missing app/api/auth/sign-in/route.ts`. Covers good, bad, unknown, disabled, locked, audit, and the response pins. |
| `login-session-cookie.test.ts` | 4.3 | `Missing .../cookie.ts`. Flags, 365-day `Max-Age`, no `Domain`, digest-only store, sign-out, replay, fixation. |
| `login-session-policy.test.ts` | 4.4 | `Missing .../session-policy.ts`. Renewal boundary, once-a-day write, expiry, disabled account, caps. |
| `login-proxy.test.ts` | 4.1 | C1 to C3 pass (locale redirect of `/st/2/1`; passthrough of `/_next/static/x.js`; passthrough of `/api/auth/sign-in`). The other cases fail: `expected 307 to /th/sign-in?next=...`, got `NextResponse.next()`. |
| `login-page-guard.test.tsx` | 4.1, 4.6 | `Missing .../auth/index.ts`; page with no session does not redirect; role matrix; the fallback page; the sign-in GET loop. |
| `login-join-page.test.tsx` | 4.5 | `Missing app/[locale]/join/page.tsx`; `Missing lib/join-copy.ts`. |
| `login-media-sign.test.ts` | 4.7 | `Missing apps/storytime/lib/media/sign.ts`. |
| `login-boundary.test.ts` | 4.12 | Import scan finds no violation at base (vacuous guard): the test asserts `files_scanned > 0` and that the three required files exist; fails on `Missing`. The no-connection harness fails on `Missing`. |
| `storytime-schema.test.ts` (db) | 4.12 | `Missing packages/db/src/schema/storytime/index.ts`; EXEMPT entries absent; no migration folder. |
| `store.contract.test.ts` (backend) | 4.3, 4.4 | `Missing .../storytime-access/index.ts`. |

Plan 2b.2 does not list the schema test and the store contract test. This strategy adds both to Red (Q6). The migration SQL test and the PGlite race-free checks of the schema are in the same files.

### P2b.4 Green gates and the phase check

`HEAVY` is the wrapper of section 1.1. `ROOT` is the repository root. Every job: `CI=true`, `--maxWorkers=1`, one job at a time. Install and build come first, once: `pnpm install` (lockfile change for the new workspace dependencies and `@electric-sql/pglite` as a devDependency of `packages/db` and `packages/backend`), then `pnpm turbo run build --filter=@reading-advantage/db --filter=@reading-advantage/auth --filter=@reading-advantage/storage --filter=@reading-advantage/backend` through `HEAVY`.

| Task | Green gate command (inside `HEAVY`) | Expected |
|---|---|---|
| 2b.3 Schema | `cd packages/db && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/__tests__/storytime-schema.test.ts`; `cd packages/domain && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 src/__tests__/tenant-coverage.test.ts`; `pnpm --filter @reading-advantage/db exec drizzle-kit generate --config drizzle.storytime.config.ts` then `git status --porcelain -- packages/db/drizzle-storytime` unchanged. | Both Vitest runs exit 0 with `tests_failed=0 tests_skipped=0`. The generate step makes no new file (`generated_files=0`): the committed migration equals the schema (drift check). The domain count equals the base count of M10 (`tests_passed` unchanged). |
| 2b.4 Adapter, routes, proxy, pages | The targeted Storytime command below this table. `cd packages/backend && ... vitest run --maxWorkers=1 src/modules/storytime-access`. `cd apps/storytime && ../../node_modules/.bin/tsc --noEmit`. ESLint on the changed files. `pnpm architecture:check` (comparison only, M18). | All exit 0 except `architecture:check`: it exits 1 with the SAME single message as the base (`arch_message_same=1`), because the check is already broken (M18). Green does not run `architecture:reconcile` or `architecture:baseline:update`: `git diff --stat -- packages/architecture-enforcement` is empty. The boundary is enforced by `login-boundary.test.ts` (AC-4.12). |
| 2b.5 Script | `login`/`make-accounts` files in the targeted command. | `make-accounts.test.ts` exits 0 (AC-4.8). |
| 2b.6 Signed media | The `login-media-sign` file, `tsc`, ESLint, and the live signed-URL proof of P2b.8 (run by the orchestrator). | The proof prints `signed_status=206` and the other labeled lines of P2b.8. |
| 2b.7 Phase check | The targeted command, `tsc`, ESLint, `architecture:check`, `phase1-quality-gates.sh`, the updated `phase3-docker-smoke.sh`, the updated `phase3-browser-gate.sh`, and the new `phase2b-browser-gate.sh`. | See below. |

**Targeted Storytime command (Green and phase check).** The glob of the base plus the new files:

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/storytime && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 __tests__/release-receipt-pin.test.ts __tests__/release-weeks-readiness.test.ts __tests__/phase1-*.test.ts __tests__/phase2-*.test.ts __tests__/phase3-*.test.ts __tests__/phase3-*.test.tsx __tests__/phase4-*.test.ts __tests__/phase4-*.test.tsx __tests__/login-*.test.ts __tests__/login-*.test.tsx __tests__/make-accounts.test.ts'
```

Expected: exit 0; `files=70` (59 at the base + 10 `login-*` + `make-accounts.test.ts`); `tests_failed=0 tests_skipped=0`.
Count rule (A4, A5): Green also runs the new 11 files alone and records `new_tests=<n>`. The full run must show `tests_passed = 452 + new_tests`. A lower count means a deleted or skipped old test. Green changes only the old tests that the page-session change breaks (P2b.11, row F7a), each with one line of reason in the evidence.

**Backend and db counts.** Backend: the `store.contract.test.ts` file runs against PGlite with `tests_skipped=0`. The file `store.real-db.test.ts` (concurrency race of the cap and of the rate limit) runs only in the gate job (`PG_TEST_URL` set) and shows `tests_skipped=0` there. In any other run it shows `real_db_skipped=1` and the note says "skipped, not passed" (A5). Db: `storytime-schema.test.ts` exits 0.

**Phase check (2b.7).** Closeout gate:

1. The targeted command, `tsc` (app, db, backend, auth if changed), and ESLint on the changed files exit 0 with the counts above. `pnpm architecture:check` shows the same failure as the base (M18), and the boundary test passes.
2. `phase1-quality-gates.sh` exits 0 (`PASS=2, FAIL=0`).
3. `phase3-docker-smoke.sh`, updated (P2b.11 F7b): exits 0; the stranger rows read `week_stranger_status=307`, `stranger_set_cookie=0`, `join_status=200`.
4. `phase3-browser-gate.sh`, updated to sign in first: exits 0 and shows the same number of PASS rows as the base. Green measures the base count once before the change (`phase3_browser_pass=<n>`) and quotes it (the base count was not measured in this strategy).
5. `phase2b-browser-gate.sh` (new, Green writes it): one `HEAVY` job; flows F1 to F9 of P2b.6; exit 0.
6. `rg -n "primary-app-storage" apps/storytime/app apps/storytime/lib apps/storytime/scripts apps/storytime/Dockerfile apps/storytime/cloudbuild.yaml` exits 1 (A14: exit 1 means no hit; exit 2 fails).
7. `rg -n "measure/tracks" apps/storytime/__tests__ packages/backend/src/modules/storytime-access packages/db/src/__tests__/storytime-schema.test.ts` exits 1 (A9).
8. `git diff --stat <phase_base_sha>..HEAD -- apps/primary-advantage apps/accounts packages/domain/src/tenant-registry.ts` shows only `tenant-registry.ts` (Q1 answer) and no Primary or Accounts file.
9. `git worktree list | wc -l` equals the count at the capture (A16).
10. `build-graph update ./graph.db <files>` runs once for the changed exports (A10): the phase changes exports and adds modules.
11. Review A, B, C, the adversarial record, the UX browser review, and the phase acceptance. The checkpoint follows them.

### P2b.5 Fixtures, mocks, and live proof

| Layer | Method | Where it runs | What it proves |
|---|---|---|---|
| App unit | `fake-store.ts` injected through `vi.mock("../lib/auth/store")`. Real `@node-rs/argon2` hashing (the real cost options; a hash takes about 50 ms). Fake timers for dates. | `heavy-run`, app Vitest. | Handler, policy, proxy, guard logic. |
| Contract suite | One suite of store behaviors (`store-contract.ts` in the backend test folder). It runs against the FAKE (in `login-*` helper test) and against PGlite (`store.contract.test.ts`). | Backend Vitest, in-process Postgres. | The fake does not drift from SQL. This is the defense against a mock that proves only the mock (A2). |
| Real storage signing | The real `S3StorageDriver` with the endpoint `https://storage.googleapis.com`, bucket `storytime-app-media`, and fake keys. A presigned URL is a local computation: no network. The test parses `X-Amz-Expires`, `X-Amz-Signature`, host, and path. | App Vitest. | Real adapter output. No mock of `getSignedUrl`. |
| Real Postgres server | A throwaway container `postgres:16-alpine` on a free port, inside the gate job only: migrate (twice), `store.real-db.test.ts` with `PG_TEST_URL`, `make-accounts` with a temp CSV, `next start`, and Playwright. A trap removes the container. | `phase2b-browser-gate.sh`, one heavy job. | Concurrent sign-ins at the cap, atomic rate-limit upsert, trigger of the audit table, real migration SQL, the whole flow. |
| Storage stand-in | A local HTTP server in the gate that serves a small mp4 with `Range` (206), and answers 403 when `X-Amz-Signature` is missing or `X-Amz-Expires` is over 21600. The app uses it as the S3 endpoint. | Gate job. | The browser seeks on a presigned URL; every media request is signed. It does not prove Google behavior. |
| Live Google proof | The orchestrator signs one URL with the real HMAC key for an existing object and calls it (P2b.8). | Orchestrator, no deploy. | Range requests, anonymous 403, tampering, and expiry on the real bucket. |

Notes:

- AGENTS says "no real Postgres for unit tests". The unit tests use the fake store. PGlite tests are database integration tests (testing order item 3) and follow the repository precedent (M11). The one real server runs only in the gate (Q6 records this).
- The Red author chooses the key layout of the fixtures. The object key equals the `file` value of the week JSON, with no prefix (the bucket holds the files of the hand-off folder, M16; the key is the media path as the week names it, whatever the field). The orchestrator confirms the key layout with `gcloud storage ls` before Green 2b.6 (Q7).
- Artifact tests (source scans: boundary, no secrets, no `primary-app-storage`) prove structure. Behavior tests (handler, proxy, guard, signing, browser) prove behavior. The plan note names each class (A5).
- Safari/iOS: the gate runs Chrome. The iOS Safari seek on a Google-signed URL is not tested here. The design rests on the Range support of Google. The residual risk goes to Review C and the person check of Daniel on a phone at the deploy.

### P2b.6 Browser flows for 2b.7 (phase2b-browser-gate.sh) and the UX review

The gate seeds 9 accounts through `make-accounts.ts` with a temp CSV, in a temp folder. It sets `STORYTIME_TEACHER_ROUTES=1` and the stand-in storage. Viewports: desktop 1280x800 and phone 390x844 (parents scan with phones).

| Flow | Steps | Pass line (labeled) |
|---|---|---|
| F1 scan and return | Open `/th/st/2/1?part=song` with no cookie. Expect the sign-in page. Sign in as `staff-01`. Expect the same URL with the query. Network log: every media request goes to the stand-in with `X-Amz-Signature`; none to `/media/`. | `returned_same_url=1 media_requests>0 unsigned_media=0` |
| F2 stays signed in | Save the cookie jar, open a new context with it, open the week. Expect 200 with no sign-in. The cookie `Max-Age` is 31536000. | `device_kept=1` |
| F3 sign out | Sign out, press back, press reload. Expect the sign-in page and no week text in the DOM. | `content_after_signout=0` |
| F4 stranger | Open the week with no cookie, follow "How to join". Expect the draft marker and no week text. Network: no media request. `Set-Cookie` count is 0. | `stranger_media_requests=0 stranger_set_cookie=0` |
| F5 wrong password | Wrong password gives one generic message in Thai and English. The username stays in the field, the password does not. 6 attempts: the locked message. | `generic_error=1 locked_after=6` |
| F6 teacher | `tutor-01` opens the teacher week and the family week. `staff-01` gets the 403 page with a link to the teacher sign-in. The link opens a form (no loop). `tutor-01` then returns to the teacher path. | `teacher_ok=1 family_403=1 loop=0` |
| F7 bad return path | Sign in with `next=//evil.example`. Expect `/th/st` (fallback). Zero requests to another origin. | `offsite_requests=0` |
| F8 phone form | At 390x844: labels, `autocomplete` `username` and `current-password`, `autocapitalize=none`, password type, touch target of at least 44 px, no horizontal scroll, Enter submits. | `phone_form_checks=6` |
| F9 mp4 seek | A `<video>` on the signed stand-in URL seeks to 50 percent: `seeked` fires and `currentTime` is within 0.5 s. The stand-in logs a `Range` request that answers 206. | `seek_ok=1 range_206>0` |

UX review (role): the reviewer opens the gate artifacts and the live page on the phone viewport. The reviewer checks Thai copy fit, error text, focus order, the 403 page, and the draft marker. Daniel checks the Thai text later (AC-4.10).

### P2b.7 Security test list (Red writes, Green satisfies)

Each row has a mutant: a wrong implementation that the test must reject. A test without a mutant does not count (A2).

**Return path (AC-4.2).** `login-return-path.test.ts`, table `next_cases` of at least 24 values. Accepted: `/th/st/2/1`, `/en/st/2/1?part=song`, `/th/teacher/2/1/3`, `/th/st/2/1?part=song&x=%C3%A9` (valid encoding), and a 200-character path. Rejected (fallback `/<locale>/st`): `//evil.example`, `/\evil.example`, `\\evil.example`, `https://evil.example/th/st/2/1`, `javascript:alert(1)`, `/th/st/2/1\r\nSet-Cookie:x=1`, a tab and a newline inside the path, `%00`, a leading space, `/th/st/%E0%A4%A` (bad percent), `/th/st/%2F%2Fevil.example` (a `//` after one decode), `/th/st/../../admin` (dot segments leave the allow list), `/th/other/x`, `/TH/st/2/1` (upper case), `/th/sign-in?next=/th/st/2/1` (outside the list), a 201-character path, an empty string, `undefined`, an array (`next=a&next=b`), a number. For every accepted value, `new URL(result, "https://app.example").origin` equals the app origin. The test prints `next_cases=<n>`, asserts `n >= 24`, `accepted >= 5`, `rejected >= 19`.
Mutant: a validator `value.startsWith("/")` must fail at least 10 rows. The test embeds this mutant and asserts it fails (`mutant_failures >= 10`).

**CSRF (AC-4.3).** `login-origin-check.test.ts`, pure `assertSameOrigin(headers, ownOrigin)` plus both handlers. Cross-origin cases, each 403, no `Set-Cookie`, no store write: `Origin: https://evil.example`; `Origin: null`; same host with another scheme; same host with another port; `Origin` absent and `Referer: https://evil.example/x`; both absent; `Referer: https://app.example.evil.example/` (prefix attack); `Referer: https://app.example@evil.example/`; `Origin: https://evil.example` plus `X-Forwarded-Host: app.example` (the forged header must not move the comparison); an `Origin` with a trailing dot. Same-origin cases pass: exact `Origin`; `Origin` absent with `Referer: https://app.example/th/sign-in`. Labeled `cross_origin_cases >= 10`, `same_origin_cases >= 3`.
The check runs as the first statement of the handler: a spy proves `store.*` and `verifyPassword` call counts are 0 on a cross-origin POST (`store_calls=0`). Sign-out GET answers 405.
Mutant: `referer.startsWith(ownOrigin)` without a trailing slash fails the prefix-attack row.

**Rate limit (AC-4.3).** `login-signin-handler.test.ts` with the real `consumeRateLimit` (or the copy chosen in Q2) and the fake store. Attempts 1 to 5 for one account pass the limiter and attempt 6 is `locked` even with the right password. An attacker on 40 different `X-Forwarded-For` first entries but one real last entry still hits the IP limit at attempt 31 (`ip_spoof_cases >= 3`; the key is the LAST entry that Cloud Run appends: `client-ip.ts`). Two IPs do not lock each other. A lock of account A does not block account B from the same IP below 30. The window expires: at 15 min + 1 s the 6th attempt passes (fake timers). Boundary: exactly `maxAttempts` passes. The store increment is one atomic upsert (`INSERT ... ON CONFLICT DO UPDATE ... RETURNING`): the contract suite proves it on PGlite, the real-db race (20 parallel attempts on one key give a final count of 20) proves it on a server. Mutant: a read-then-write store loses counts in the race.
Review B reads the account-lockout trade-off (an attacker can lock a known username for 15 minutes). The strategy accepts it for release 1 and records it.

**Sign-in handler (AC-4.3).** Good password: 303 to the checked `next`, `Set-Cookie` once, one `sign_in_success` audit row, one new session. Wrong password, unknown username, and disabled account give the SAME response (status, `Location`, `error=invalid`, body) (`enumeration_cases=3`), and each calls `verifyPassword` exactly once (the unknown username verifies against a fixed dummy Argon2id hash). The audit `reason` differs: `bad_password`, `unknown_user`, `disabled`, `rate_limited`, `csrf_rejected`. A 100,000-character password is rejected before hashing (`verify_calls=0`), and a username over 64 characters too. Username is trimmed and lower-cased. The audit rows and the logs hold no password, no token, and no digest (serialize all rows and all `console.*` calls and scan: `secret_hits=0`, with a positive control that proves the scan finds a planted string). A bad `next` falls back to `/<locale>/st`. The audit table has no update or delete function in the store (`Object.keys` check) and the migration holds a `BEFORE UPDATE OR DELETE` trigger that raises (db test: SQL text; real-db: an UPDATE fails).

**Sessions and cookie (AC-4.3, AC-4.4).** `login-session-cookie.test.ts` and `login-session-policy.test.ts`. The cookie has exactly these attributes and no others: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age=31536000`, name `__Host-st_session`, no `Domain` (`cookie_flag_cases=6`, parse the header). The value is 43 base64url characters, differs on every sign-in (1,000 draws, no repeat), and does not contain the username, the role, or the account id. The store row holds the 64-hex digest; the raw value appears in no row (`raw_token_rows=0`). A sign-in with an attacker-chosen cookie value never reuses it (fixation): the new session has a new value and the old row is untouched. Sign-out deletes the row by digest and sends the same cookie with `Max-Age=0`; the old value then fails `getCurrentUser` (replay). Sign-out with an unknown or empty cookie still answers 303 and clears the cookie.
Renewal: days left 335 exactly: no renewal; 334 days 23 h: renewal to 365 days and a new `Set-Cookie`; 50 requests in one day make at most 1 write (`last_use_writes <= 1` per day; fake timers across 3 days give at most 3). Expiry: a session with `expiresAt == now` is no session; one second before is a session. Disabled account: the next request redirects to sign-in, no renewal happens, and the session is ended. Caps: 5 sessions for `family` and for `teacher`, 30 for `class`; the 6th (31st) sign-in ends the OLDEST session by `createdAt` (the test sets last-use order opposite to creation order, so it detects the wrong key). `createSessionWithCap` is one transaction that locks the account row: the contract suite checks one call; the real-db test runs 10 parallel sign-ins for one `family` account and ends with exactly 5 rows (`sessions_after_race=5`). Mutant: count-then-insert in two statements ends with more than 5 rows in the race.

**Proxy and page guard (AC-4.1).** `login-proxy.test.ts`: no cookie on `/th/st/2/1?part=song` gives 307 to `/th/sign-in?next=%2Fth%2Fst%2F2%2F1%3Fpart%3Dsong`; the locale is kept for `/en/teacher/2/1`; `/th/join`, `/th/sign-in`, `/api/auth/*`, `/_next/*`, `/favicon.ico` pass with no cookie. The protected rule runs BEFORE `FILE_PATH` and `PASSTHROUGH` (M13). Bypass table `bypass_cases >= 9`, each redirects: `/th/st/2/1.x`, `/th/st/2/1/`, `/th//st/2/1`, `/TH/st/2/1`, `/th/ST/2/1`, `/th/%73t/2/1` (encoded `s`), `/th/st%2F2/1`, `/th/teacher/2/1.json`, `/th/st/2/1;x=1`. The proxy decodes the path once, safely (a bad encoding does not throw: it redirects). The proxy answers `Cache-Control: no-store` and sets no cookie. A forged cookie value passes the proxy by design (it checks only that a cookie exists) and `login-page-guard.test.tsx` proves the page redirects (`forged_cookie_pages=<n> content_leaks=0`; each of the 5 page callers of M2 plus the two teacher pages). Mutant: a proxy rule placed after `FILE_PATH` fails the dotted-path row.
Page guard order: no session → redirect; teacher flag off → 404 (all sessions); wrong role → 403; week load → 404 or 200 (Q5). Protected responses carry `Cache-Control` with `no-store`.

**Roles (AC-4.6).** `login-page-guard.test.tsx` matrix: roles `family`, `class`, `teacher`, `none` against family week, teacher week, teacher day (flag on). `family` and `class` on a teacher route: 403 page, a link `/<locale>/sign-in?next=<teacher path>`, and the page holds none of the strings of the teacher week (`teacher_text_leaks=0`; a positive control renders the teacher view and finds them). `teacher` gets 200 on all. The role comes from the store at request time (change the role in the fake store between two requests: the second request obeys). The cookie holds no role. `GET /<locale>/sign-in` with a valid session redirects to a safe `next` only when that session may open it; otherwise it shows the form (no redirect loop: `redirect_hops <= 2`). Mutant: a guard that trusts a `role` cookie fails the role-change row.

**Join page (AC-4.5).** `login-join-page.test.tsx`: status 200 with no session and no cookie written; both locales; the text holds no week text and no URL to media (`media_urls_found=0` on the HTML, with a positive control on the week page); `JOIN_COPY.status === "draft"` and the page shows a visible draft marker (`data-draft` element with text); the sign-in page links to it. Test of the deploy gate (AC-4.10): a test reads `JOIN_COPY.status` and is marked as the guard that blocks Phase 3 when the value is not `approved` — it is a separate file `gate-join-copy-approved.test.ts` (the name misses the `login-*` glob on purpose) is EXPECTED red until Daniel's check. It stays out of the targeted command, and the Phase 3 strategy lists it as a deploy gate (A2: consent-blind publish gate).

**Signed media (AC-4.7).** `login-media-sign.test.ts` with the real driver. For the shipped w01: render the page with a session; collect every URL from the HTML and from the props of the client views (`renderToStaticMarkup` of the page element plus a walk of the element props). `media_urls_found > 0` first (A4), and `signed_map_size=42` for the shipped w01 (every media path of the week, not the `file` fields only; a map of 26 fails). Then for every URL: host `storage.googleapis.com` (or the stand-in), first path segment `storytime-app-media`, query holds `X-Amz-Signature` and `X-Amz-Expires <= 21600` (`signed_urls_checked == media_urls_found`). No URL contains `primary-app-storage` or the string `/media/`. Key scope: the signed set equals the distinct media paths of that week outside `approval` (the song videos, the posters, the song audio, the slow audio, and the 9 phoneme clips are in it); a `file` with `..`, a leading `/`, or a scheme is not signed and the page fails closed; a request for a week the account may not see signs nothing. A page with no session or an invalid session renders no URL (`stranger_urls=0`). If the signing configuration is missing (no access key, base not `gs://`), the page fails closed with an error page and NEVER falls back to a public or relative URL (`unsigned_fallback=0`). A `STORYTIME_MEDIA_BASE` that names `primary-app-storage` makes the configuration check throw. Signing runs after the session check (a spy orders the calls). Mutant: a page that signs all keys of the bucket, or sets `expiresIn` to 604800, fails.

**No secrets (AC-4.9 part, AC-4.12).** `login-boundary.test.ts`: (a) import scan of `apps/storytime` source (not `__tests__`, not `node_modules`, not `.next`; exact folder names, A7): no import of `@reading-advantage/db`, `@reading-advantage/db/*`, `drizzle-orm`, `postgres`, or of any shared company table or `createSession`; imports from `@reading-advantage/auth` name only `hashPassword`, `verifyPassword`, `consumeRateLimit`, through a subpath that passes (b); (b) the no-connection harness: with `NODE_ENV=production`, no `DATABASE_URL`, and `vi.mock("postgres")` as a spy, `await import` of each module in `lib/auth/`, `lib/media/`, and of `@reading-advantage/backend/storytime-access` resolves and the spy has 0 calls (`postgres_calls_on_import=0`). Control: the same harness on `@reading-advantage/auth` (root) throws (M5), so the harness can detect a failure. A call of `getStore()` creates one client (`postgres_calls_after_getStore=1`). (c) secret-shape scan of the tracked files under `apps/storytime`, `packages/backend/src/modules/storytime-access`, `packages/db/src/schema/storytime`, `packages/db/drizzle-storytime`, `Dockerfile`, and `cloudbuild.yaml`: no `GOOG1E` key id, no `postgres(ql)?://user:password@`, no `BEGIN ... PRIVATE KEY`, no 40-character base64 string next to the word `secret` (`secret_shape_hits=0`; a planted string in a fixture proves the detector, A2). The `cloudbuild.yaml` secret references use `secretEnv` or `--set-secrets` names only.

**Account script (AC-4.8, Green 2b.5).** `make-accounts.test.ts`: the output folder must be outside the repository (a path inside it, or a symlink that resolves inside it, exits non-zero with `output_inside_repo=1`); the files get mode 0600 in a 0700 folder; `git status --porcelain` is IDENTICAL before and after (`dirty_lines_before == dirty_lines_after`; the shared tree is not clean, so the test compares and does not require empty). The database URL comes from an environment variable named by `--database-url-env`; `process.argv` and the log never hold a URL or a password (`argv_secret_hits=0`). Passwords: 10 characters from an alphabet without `0 O 1 l I` and without `= + - @` (formula injection in a sheet), alphabet size at least 31 (`bits >= 49`), drawn with `crypto.randomInt` (a spy on `Math.random` shows 0 calls); 1,000 draws have no repeat. Role validation: only `family|class|teacher`; a duplicate username in the CSV fails before any insert; an existing account is skipped (`accounts_skipped=<n>`) and its hash is unchanged; a second run exits 0 and changes nothing (idempotence). The stored hash starts with `$argon2id$v=19$m=19456,t=2,p=1$`. After the insert, the script reads each account back and verifies the card password against the stored hash and prints `accounts_created=<n> verified=<n> failed=0` (no password in the output). The names of the CSV are not logged. Mutant: a script that stores the plain password, or prints it, fails.

**Schema (2b.3, db test).** `storytime-schema.test.ts`: four tables with the pinned names; `role` check `family|class|teacher`; unique lower-case `username`; `storytime_sessions` has a unique digest column of 64 hex characters (check constraint), a foreign key to the account with `ON DELETE CASCADE`, and an index on `(account_id, created_at)`; `storytime_login_attempts` has a primary key `key`; the audit table has the trigger. Every exported table is in the EXEMPT list of the registry (`classifyTable(table)` returns `EXEMPT` for each, `exempt_tables=4`), or in the module's own list if Q1 keeps it out of the registry; the test asserts `exported == 4`. The migration folder holds one SQL file and a journal entry; `drizzle-kit generate` makes no diff. The shared `drizzle/` folder and the shared schema barrel are unchanged (`git diff --stat` empty for them).

### P2b.8 Orchestrator evidence: tasks 2b.8 and 2b.9, and the live signed-URL proof

All commands: no secret value in the output, the transcript, or a file in the repository. Each prints labeled values and its exit code.

**Task 2b.8 re-check (AC-4.9; read-only; task text is `[x]`, the note stays the record).** `P` is the project of record in the 2b.8 note; `S=storytime-media-signer@<project>.iam.gserviceaccount.com`.

| Check | Command (shape) | Expected line |
|---|---|---|
| Bucket settings | `gcloud storage buckets describe gs://storytime-app-media --format='value(location,uniform_bucket_level_access,public_access_prevention)'` | `asia-southeast1`, `True`, `enforced` |
| Bucket policy | `gcloud storage buckets get-iam-policy gs://storytime-app-media --format=json`, parsed by a script | `viewer_members=1 viewer_is_signer=1 public_members=0` |
| Signer scope | `gcloud storage buckets get-iam-policy gs://primary-app-storage --format=json` and `gcloud projects get-iam-policy P --format=json`, parsed | `signer_on_primary_bucket=0 signer_project_storage_roles=0` |
| Anonymous read | `curl -s -o /dev/null -w '%{http_code}' https://storage.googleapis.com/storytime-app-media/<a w01 key>` | `anon_status=403` |
| Secrets exist | `gcloud secrets versions list <name> --filter=state=ENABLED --format='value(name)' \| wc -l` for each of the 3 names | `versions_storytime-database-url>=1`, `versions_storytime-storage-hmac-access-key>=1`, `versions_storytime-storage-hmac-secret>=1` |
| Secret scan | The values come through a pipe into a scan script that reads stdin and runs `git grep -F -f` on the tracked files; it prints only counts. For the URL secret it scans the password part too. | `secrets_scanned=3 secret_value_hits=0` |
| Objects | `gcloud storage ls gs://storytime-app-media/** \| wc -l`; compare the key list with the media paths of w01 (walker `mediaPathsOf` outside `approval`, 42 distinct) | `objects=42 week_files_missing=0 keys_outside_week=0` (confirms the key layout, Q7) |
| Secret access | `gcloud secrets get-iam-policy <name>` for the 3 names | `accessors_runtime_sa=1` each; no `allUsers` |

**Live signed-URL proof (task 2b.6 evidence, no deploy).** A script outside the repository (`/tmp`, removed after) reads the HMAC pair from Secret Manager through a pipe, builds the real `S3StorageDriver` with bucket `storytime-app-media`, signs one jpg and one mp4 key with `expiresIn=21600`, and calls:

| Call | Expected |
|---|---|
| signed GET of the mp4 with `Range: bytes=0-99` | `signed_status=206 range_bytes=100` |
| the same URL with one character changed in the signature | `tampered_status=403` |
| the same URL with another key in the path | `other_key_status=403` |
| the URL signed with `expiresIn=1`, called after 3 s | `expired_status=403` (or 400; record the value) |
| the unsigned URL | `unsigned_status=403` |
| `HEAD` of the signed mp4 | `accept_ranges=bytes` |

Then one Playwright run (Chrome) loads a page with a `<video>` on the signed mp4 URL and seeks (`seek_ok=1`). If the seek fails, task 2b.6 stops and the proxy fallback of the design starts (Q7). The URL is never printed: the script prints only the labeled lines.

**Task 2b.9 (production accounts).** Order: the production `storytime:migrate` first (`migrations_applied=1` and exit 0; a second run exits 0 with `migrations_applied=0`), then `make-accounts.ts` with the first-batch CSV (names `staff-01` to `staff-05`, `tutor-01` to `tutor-03`, `demo-class-01`). The database URL goes through an environment variable that the orchestrator sets from a Cloud SQL Auth Proxy session (the secret `storytime-database-url` is a unix-socket URL for Cloud Run and does not work from the workstation). Evidence (counts only, one SQL session, read-only queries):

| Query result | Expected |
|---|---|
| `SELECT role, count(*) FROM storytime_accounts GROUP BY role` | `family=5 teacher=3 class=1 total=9` |
| usernames outside the pattern `^(staff-0[1-5]\|tutor-0[1-3]\|demo-class-01)$` | `unexpected_usernames=0` (no personal names) |
| `password_hash NOT LIKE '$argon2id$v=19$m=19456,t=2,p=1$%'` | `non_argon2id=0` |
| `disabled = true` | `disabled=0` |
| sessions, audit | `sessions=0 audit_rows=9` (one `account_created` row each) |
| the script line | `accounts_created=9 verified=9 failed=0` |
| `stat -c %a ~/Desktop/storytime-accounts` and its files; `git status --porcelain` before and after | `dir_mode=700 file_mode=600 repo_dirty_delta=0` |

The per-role account count is 5, 3, 1. A sign-in check with each role happens at the tagged URL in task 2b.10 (owner-passed deploy; the strategy for Phase 3 lists it).

### P2b.9 Adversarial cases (required)

The adversarial role works on scratch copies and on the test harness, and may add test files in a later commit. It never touches the production database or the real bucket (read-only live proof by the orchestrator excepted).

| # | Case | Method | Expected |
|---|---|---|---|
| 1 | Open redirect | Return-path table plus 30 extra values from the role (unicode line separators, overlong UTF-8, `%2e%2e`, `/th/st/2/1%0d%0a`, `///`, `/@evil`) | Every value falls back or stays same-origin. |
| 2 | CSRF | Cross-origin form post from a scratch page at another origin to sign-in and sign-out (browser, real `Origin`) | 403, no cookie change. Login-CSRF (forcing a victim into the attacker account) fails. |
| 3 | Session fixation and replay | Set a chosen cookie, sign in; use an old cookie after sign-out; use a cookie of a disabled account | New value each time; old values fail. |
| 4 | Proxy bypass | Path variants of P2b.7 plus encodings, `HEAD`, `OPTIONS`, a RSC request (`RSC: 1` header, `?_rsc=`), `_next/data` style paths, a trailing-dot host | No week text or media URL without a valid session. The role views the gate with `curl`. |
| 5 | Forged cookie | Random 43-character value, the digest of a real session as the cookie value, a very long cookie (8 KB), a cookie with a `;` | Redirect to sign-in. No 500. The digest is not a credential (`digest_as_cookie=0`). |
| 6 | Brute force and enumeration | 40 attempts across rotating IP headers; timing of known versus unknown usernames (call counts, not wall time) | Locks at 6 and 31. Same response for known and unknown. |
| 7 | Cap abuse | 10 parallel sign-ins on one account (real Postgres) | 5 sessions. |
| 8 | Signed-URL scope | Take a signed URL of week 1 and change the key to week 2 or to a file outside the week; change the bucket; extend `X-Amz-Expires` | Real bucket answers 403 for each. The page never signs a key outside the week. |
| 9 | Signed-URL leak window | Open the URL without a cookie from another browser profile | It works until expiry (accepted: a bearer link of at most 6 hours, Review B decision). The expiry is 21600 s or less. |
| 10 | Role escalation | A `family` session requests teacher routes, teacher days, and the 403 link; change the role in the DB between requests; send `X-Role: teacher`, `?role=teacher`, and a `role` cookie | Always 403. |
| 11 | Draft week to an unsigned account | Valid session requests w02 (draft) | 404 (the login does not open a draft week: `STORYTIME_SHOW_DRAFT_MEDIA` rules unchanged). |
| 12 | Disabled account, live | Disable `staff-01` in the gate DB while its browser is open | Next navigation goes to sign-in. |
| 13 | Account script | CSV with a formula cell (`=1+1`), a duplicate username, a role `admin`, a 10,000-line file, a path with `..`, and the output folder as a symlink into the repository | Fails closed, no partial insert, no file in the repository. |
| 14 | Secrets in output | Run the gate, the script, and the handler with debug logging; scan stdout, stderr, and the gate artifacts | `secret_hits=0`. |
| 15 | Argon2 cost abuse | 200 parallel sign-in posts with a valid username | The limiter locks first; the server stays up (no out-of-memory). The machine is a 7 GB box: the role runs 20 parallel at most. |

Falsification: case 4 with the proxy rule moved after `FILE_PATH` must show a leak; the role confirms the harness can see a leak before it reports zero (A2).

### P2b.10 Review applicability

| Role | Applies | Reason and scope |
|---|---|---|
| Review A (change quality) | yes | Diff of Red, schema, backend module, app, scripts, gates. Checks JSDoc on every export (AGENTS), file size, the hashing policy, reuse (Q2), no dead code, commit headers, the plan notes (A5). |
| Review B (security) | **required** | The phase adds authentication, sessions, a CSRF check, a credential store, signed URLs, and a role gate. Scope: P2b.7 and P2b.9 rows 1 to 10, cookie flags, `__Host-` prefix, Argon2 cost and the limiter, lockout trade-off, client-IP rule behind Cloud Run, CSRF design (Origin/Referer, no token), headers (`Cache-Control`, `Referrer-Policy`), secrets handling in `cloudbuild.yaml`, IAM scope of the signer, the one-year session. Model family differs from Green. |
| Review C (routes, API, UX contract) | **required** | New routes and a changed route contract for all `st/**` and `teacher/**` pages (redirect, 403, 404 order), the proxy, the form contract, locale handling, the fallback page, the redirect loop, the changed smoke and browser gates. |
| Adversarial testing | **required** | Sign-in, return path, sessions, media access: P2b.9. |
| Browser review (UX) | **required** | Flows F1 to F9 on desktop and phone (P2b.6). Chrome only; iOS Safari stays a residual risk (P2b.5). |
| Phase acceptance | yes | Closeout gate, plan notes, checkpoint text. |
| Model families | | Red: MiniMax or Claude Sonnet (the route at Red time). Green: another family than Red (DeepSeek or Claude Sonnet; Ark GLM plans are WAIT). Review A, B, C, and the adversarial role: not the family of Green. The orchestrator logs a deviation. This strategy ran on Claude Sonnet (PM rule: a substitute for Opus). |

### P2b.11 Changed-contract risks and anti-pattern coverage

**Existing tests and gates that the login changes (row F7 of the parent: Green edits them in the same commit as the cause, one line of reason each).**

| Row | Item | Change |
|---|---|---|
| F7a | The 5 page callers of M2, plus `phase4-week-view.test.tsx` and `phase4-teacher-flag.test.ts` if they render a page | Mock `../lib/auth` (a signed-in `family` or `teacher` session) so the page runs. The assertions on content stay unchanged. |
| F7b | `phase3-docker-smoke.sh` (week page 200 with no `Set-Cookie`) | Stranger rows: 307 to sign-in, no `Set-Cookie`. Signed-in rows need an account in a container database: the script starts the same throwaway Postgres as the 2b gate or moves the content rows to the 2b gate. |
| F7c | `phase3-browser-gate.sh` | Sign in first (a `signIn()` helper with a seeded account). The PASS count stays the same as the base count. |
| F7d | `phase3-entry-route.test.ts` ("public metadata with the no-cookie route configuration") | Keeps passing: `localeCookie: false` stays, `noindex` stays. The route is no longer public: no edit expected. |
| F7e | `cloudbuild.yaml` rule "no database and no secrets" and the `Dockerfile` COPY set | Change as the design section 5 says. A test reads `cloudbuild.yaml` for `--add-cloudsql-instances`, the three `STORYTIME_*` secret names, and no secret value; `phase3-docker-smoke.sh` builds with the new COPY set (`packages/db`, `packages/auth`, `packages/storage`, `packages/backend`). |
| F7f | `tenant-registry.ts` and `tenant-coverage.test.ts` | Four EXEMPT entries (M9). The domain test count stays the same. |
| F7g | The Media pin of P2b.2 (**changed by the orchestrator on 2026-11-07, after Red**) | `signWeekMedia` signs every media path of the week (`mediaPathsOf` outside `approval`, de-duplicated), not the `file` fields only. With the first pin, the song videos, the posters, the song audio, the slow audio, and the phoneme clips get no URL: a child sees a page with missing sound and pictures, and a test that checks only the URLs it finds passes. Changed contract: the map is keyed by media path; the page and the 4 client views read every media URL from the map and never build `${base}/${file}`. Tests: `signed_map_size=42` for w01; every media path found by an independent walk of the shipped w01 is a key of the map (`media_paths_unsigned=0`), with a positive control (a map of the 26 `file` fields makes the check report 16 unsigned); the rendered page and the client views hold no URL that is not in the map (`urls_outside_map=0`). Review C reads the page and the 4 client views for a path that bypasses the map. |

**Guardrails.**

- No change to `apps/primary-advantage`, `apps/accounts`, or the shared tables, schema barrel, and `drizzle/` folder. No call of `createSession`, `validateSession`, or the shared audit and rate-limit stores.
- `packages/auth` changes at most two `exports` lines and one test (Q2). Nothing else.
- Hashing policy: the SHA-256 session digest and the Argon2id password hash are required credential stores and are allowed. No provenance hash, no manifest, no baseline update (`architecture:baseline:update` is not run).
- Transport independence: the store and the policy functions take plain arguments and explicit `now`. The route handlers and pages only orchestrate (AGENTS).
- The migration runs only in the manual traffic step (design section 5). A push changes no production database.
- Heavy jobs: one at a time under the lock; the gate script holds one job with the container, the server, and the client (section 1.1). Stop the container with a trap.

**Anti-pattern coverage.**

| Anti-pattern | Where it applies in P2b | Defense | Falsification condition |
|---|---|---|---|
| A1 substring as signal | Detectors of imports, secrets, and `primary-app-storage` | Match parsed import specifiers and exact folder names, not words. Gate rows use labeled lines. | A comment that names `primary-app-storage` fails a scan of the app sources; a scan that reads `__tests__` fails itself. |
| A2 consent-blind gate; mock proves the mock | Every "stranger sees nothing" test; the store; signing | Both directions in each test (session sees content, stranger does not). One contract suite for the fake and PGlite. Real `S3StorageDriver` presign. Mutants in P2b.7. Positive controls for scans. A separate `gate-join-copy-approved.test.ts` guards Phase 3. | A page that renders content for a stranger passes; a signer mock hides a wrong expiry. |
| A3 digit-only count | `next_cases`, `cross_origin_cases`, `media_urls_found`, `signed_urls_checked`, `ip_spoof_cases`, `sessions_after_race`, account counts | Labeled integers; the check parses the integer after the label. | A bare number passes the check. |
| A4 vacuous pass | Loops over URLs, table rows, accounts, and bypass paths | Assert `n > 0` (and a floor) before each property check; `media_urls_found > 0` before "all are signed". | A page with zero URLs passes the signed-URL test. A Red run with more than 3 passes is vacuous. |
| A5 claim vs result | Plan notes for 2b.2 to 2b.9 | Quote exit codes and labeled counts. A skipped real-db test is "skipped", not "passed". | The note says "pass" and a cited command exits non-zero. |
| A6 registry overstatement | `measure/tracks.md` | State "login built and reviewed locally at `<sha>`, not deployed". "Live" only after Daniel's word and the traffic move. | The registry says "login live" before AC-4.11. |
| A7 over-broad filter | Import scan, secret scan, URL detection | Exact folder skip list (`node_modules`, `.next`, `__tests__`); URL detection by parsed URL and by the `file` key, not by a word. | The scan skips a real source folder, or flags prose. |
| A8 marker ambiguity | Plan task 2b.10 | Keep the structured marker `[b] ... deferred:daniel`. | A prose "waiting for Daniel" replaces the marker. |
| A9 archived track path | New tests | No read of `measure/tracks/`. `rg -n 'measure/tracks'` exits 1. | A new test names the path. |
| A10 generated facts | Graph | `build-graph update` after the export changes. | `graph.db` lacks the new modules. |
| A14 ripgrep option | All `rg` detectors | `rg -n`; exit code 2 is a failure. | A bad option reports zero hits. |
| A15 role-receipt hash | Review and acceptance records | No new hash or receipt chain. Git identity only. | A record adds a hash of a generated file. |
| A16 worktrees | Gate containers and scratch | Work only in the shared master tree; scratch under `/tmp`; the account script test compares `git status` before and after (not "clean"). | `git worktree list` has an extra entry. |

### P2b.12 Questions and plan changes for the orchestrator (defaults apply if no answer)

| # | Item | Default |
|---|---|---|
| Q1 | M8: `DATABASE_BOUNDARY` forbids a DB import in `apps/storytime`. The plan puts the adapter in the app. | The SQL store lives in `packages/backend/src/modules/storytime-access/` (the `apps/accounting` pattern). The app adapter wraps it. Register the 4 tables in `tenant-registry.ts` as EXEMPT (the accounting pattern). The boundary test `login-boundary.test.ts` replaces the broken `architecture:check` (M18) as the gate. |
| Q2 | M5: `@reading-advantage/auth` has no subpath for the helpers, and its root throws in production without `DATABASE_URL`. | Add two `exports` lines (`./password`, `./rate-limit`) to `packages/auth` and reuse the helpers (Ponytail rule 2). If the no-connection test fails on them, write Storytime helpers with `@node-rs/argon2` and the same `ARGON2ID_OPTS`, as the design says. |
| Q3 | The own origin for the CSRF check. | `request.nextUrl.origin`. Never `X-Forwarded-Host`. Review B confirms it for the Cloud Run domain mapping. |
| Q4 | M14: the return fallback `/<locale>/st` has no page. | Green adds a small signed-in page at `app/[locale]/st/page.tsx` (a line that says to scan the book code; no week content). |
| Q5 | Order of teacher checks (M15). | No session: redirect. Flag off: 404 for all. Wrong role: 403. Then the week. Tests set `STORYTIME_TEACHER_ROUTES=1`. |
| Q6 | Plan 2b.2 lacks the schema test and the store contract test; AGENTS says no real Postgres in unit tests. | Add both to Red. PGlite (precedent M11) for integration tests, one real container only in the gate. Add `@electric-sql/pglite` as a devDependency of `packages/db` and `packages/backend`. |
| Q7 | The bucket key layout is not in the plan. The mp4 seek on Google is unproven. | The orchestrator confirms the layout (key equals the media path as the week names it) with `gcloud storage ls` before Green 2b.6, and runs the live proof of P2b.8 as soon as `signWeekMedia` exists. A failed seek stops 2b.6 and opens the proxy fallback. |
| Q8 | The contract pins of P2b.2 (names, cookie, response codes). | Accept. The orchestrator may change a pin before Red starts. |
| Q9 | The migration must exist in the production database before task 2b.9, but the design runs the migrate step only at the manual traffic step. | The orchestrator runs `storytime:migrate` by hand in task 2b.9 (P2b.8). The deploy step stays as designed. |
| Q10 | Hardening note of the plan: split `storytime_migration` and `storytime_runtime`. | Out of scope for Phase 2b. The migrate script reads the URL from an environment variable, so the split needs no code change later. |
| Q11 | M18: `pnpm architecture:check` already fails at the base (stale reconciliation manifest). | Out of scope for this track. The orchestrator reports it to the PM. This phase compares the failure message before and after and does not repair it. |

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
