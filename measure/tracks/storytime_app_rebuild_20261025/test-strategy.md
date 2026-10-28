# Test strategy: Storytime app rebuild (an app in the monorepo)

> **Track:** `storytime_app_rebuild_20261025` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Scope:** Phases 1 to 8 (P1 to P8). Written 2026-10-26 at `21c764edc`.
> **Phase 1 note:** Phase 1 Red ran before this file existed (`phase_base_sha` `3504b8d7a`). The P1 section records the gates that apply now. It does not move that SHA.
> **Revision 2026-10-28:** the Phase 1 checkpoint refresh. It records the acceptance at `598c876a5`, the 45-minute smoke limit, and the P2 follow-ups. The role table names claude-code/claude-opus-5-5[1m]#high. This revision ran on minimax-cn-coding-plan/MiniMax-M3#high, the route that ra-quota picked.

## 1. Rules for every phase

### 1.1 Heavy jobs

- Every heavy job runs as one command: `bash ~/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`.
- Heavy jobs are Vitest, `tsc`, `turbo`, `eslint`, `next build`, `next start`, Docker or Podman, `pnpm install`, Playwright, and the audio scripts.
- A caller never adds its own `flock`. `heavy-run.sh` takes the lock and runs the headroom pre-flight.
- The gate scripts `apps/storytime/__tests__/phase1-docker-smoke.sh` and `phase1-quality-gates.sh` enter `heavy-run.sh` themselves. Run them plain: `bash <script>`.
- Vitest runs with `--maxWorkers=1`, and only on changed or targeted files. Never run the root aggregate `pnpm turbo run test` as a phase gate.
- On 2026-10-26 no heavy job runs before 16:00 ICT (PM order). The P1 phase check waits for the lock window after 16:00.
- Reads, `grep`, `git log/show/diff`, and `build-graph` queries on `./graph.db` are light. They need no lock.

### 1.2 Capture of `phase_base_sha`

- P1 keeps `phase_base_sha` `3504b8d7a`. That SHA was captured before P1 Red.
- For P2 to P8, the orchestrator captures `phase_base_sha` with `git rev-parse HEAD` at one point. That point is after the commit of this strategy, and after the checkpoint of the previous phase, and before the Red role of the phase starts.
- The orchestrator records the full SHA in the Red evidence section of the phase in `plan.md`. No role changes it after capture.
- This file contains no `phase_base_sha` for P2 to P8. A SHA from before the strategy commit is not valid for P2 to P8.
- If this strategy changes during a phase, the captured SHA stays. The orchestrator records the strategy commit in the phase log.

### 1.3 Evidence classes

- **Artifact test:** reads a file and checks its text or structure. Examples: the Cloud Build parse, the Dockerfile text, the runbook text, the import scan, and the media list.
- **Live behavior test:** runs the code and observes the result. Examples: a page render that returns 404, a container that answers HTTP, a browser network log, and an energy measurement on a real audio file.
- An artifact test never closes an acceptance check that names behavior. AC-1.4, AC-2.1, AC-5.x, AC-6.x, AC-7.x, AC-8.x, and AC-9.x need live behavior tests.
- A plan `[x]` note names the evidence class: automated, model pre-check, person-checked, or owner-passed (spec FR-11, rule 7.1).
- An automated count is never acceptance of media (rule 6.2). Only Daniel passes media (AC-12.1).

### 1.4 Aggregate suites that stay red

- The root suite `pnpm turbo run test` is red for reasons outside this track (CI red since 2026-09-24, Primary lint errors). This track never uses it as a gate, and never claims that it passes.
- Every Storytime gate uses `--filter=storytime` (and, from P2, the filter of the read-along package) or targeted test files.
- Before the Workbooks hand-off arrives, the P2 tests that load shipped weeks stay red (section P2). They fail with a named missing-file message. They never skip.
- An intentionally red test has one line in the phase Red evidence. The line names the test, the cause, and the task that turns it green.
- The P1 tests that expect 404 for every week change in P3. P3 Red replaces them. They are not intentionally red at any time.

### 1.5 Shared anti-pattern defenses

The catalog is `measure/anti-patterns.md`. These defenses apply in every phase. Each phase section adds its own.

| ID | Defense in this track | Falsification condition |
|---|---|---|
| A1, A8 | A human gate is the structured marker `[b] … deferred:daniel`. No check reads the word "deferred" in prose. | A `[~]` task with "deferred" in its text counts as blocked. |
| A3 | A script result is a labeled integer: `PASS=<n>, FAIL=<n>`, `transferred_bytes=<n>`, `noise_floor_dbfs=<n>`. The check parses the integer after the label. | The check passes on a line with a date or a revision number and no label. |
| A4 | Each test asserts that its input set is not empty before it asserts a property of each item. | The test passes with zero weeks, zero files, zero routes, or zero requests. |
| A5 | A plan note quotes the exit code and the labeled counts of the command that it cites. | The plan says "pass" and the cited command exits non-zero. |
| A6 | `measure/tracks.md` names a state only after its gate passes. A deploy state names the revision and Daniel's go. | The registry says "live" or "QR paths answer" before AC-2.3 passes. |
| A7 | A scan excludes paths by exact directory names (`node_modules`, `.next`, `__tests__`). It never excludes by an English word. | An excluded path pattern removes a real source file from the scan. |
| A9 | Storytime tests never read `measure/tracks/…` paths. | A test fails after the track moves to `measure/archive/`. |
| A10 | After a structural edit, the phase runs `build-graph update ./graph.db <files>` under `heavy-run.sh`. | A phase closes with new exports that `build-graph search` does not find. |
| A14 | A detector uses `rg -n '<regex>'`, never `rg -nE`. A detector exit code 2 is a failure. | A detector with a bad option reports zero hits. |
| A15 | No role adds a hash to a receipt, a manifest, or a media list (AGENTS.md hashing policy). Provenance is a Git commit. | A new SHA-256 field appears in a track file. |
| A16 | All work runs in the shared master tree. No role adds a worktree. | A role creates or adopts a worktree for this track. |

A2 (consent-blind publish gate) applies to P2, P3, and P6. A11 and A13 apply at the track closeout only.

## 2. Phase summary

| Phase | Risk | Review B (security) | Review C (UX/API) | Adversarial | Browser review |
|---|---|---|---|---|---|
| P1 Scaffold and service config | medium | yes | no | no | no |
| P2 Shared data contracts | medium | yes | yes | yes | no |
| P3 At-home app | high | yes | yes | yes | yes |
| P4 Teacher app | high | yes | yes | yes | yes |
| P5 Milestone week integration | high | yes | yes | yes | yes |
| P6 Daniel's milestone judgment | critical | yes | yes | no | yes |
| P7 Primary boundary and URL continuity | critical | yes | yes | yes | yes |
| P8 Release 1 (deferred, S17) | high | yes | yes | no | no |

The reason for each entry is in the phase section.

## P1: App scaffold and service config

**Risk:** medium. The phase adds a new service config and a deploy file, but no deploy and no traffic step. A wrong service name in `cloudbuild.yaml` can replace the Primary service, so AC-1.2 guards it.

**Red (done at `a01d2998d`; recorded, not repeated):**

```bash
bash ~/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm exec vitest run --maxWorkers=1 apps/storytime'
```

**Green gate:**

1. The targeted Vitest command above exits 0 with 3 files and 11 tests.
2. `bash apps/storytime/__tests__/phase1-docker-smoke.sh` exits 0 with `PASS=3, FAIL=0`. The script builds with `--network=host` and a 45-minute limit, because the first run against a new private store pulls the base image (plan.md, the r13 build limit). PM question open 2026-10-28; this text is the default and a PM answer can replace it. Cloud Build does not use the script.
3. `bash apps/storytime/__tests__/phase1-quality-gates.sh` exits 0 with `PASS=2, FAIL=0`. It runs AC-1.1: `pnpm turbo run build check-types lint test --filter=storytime`.

**Closeout gate:** the Green gate, then `build-graph update` for the new app files, then the change-quality review (task 1.6), then the Review B record. The orchestrator appends `[checkpoint: <sha>]` only after all three scripts exit 0 at one commit.

**Current state:** the smoke builds in the private store `~/.local/share/storytime-smoke/storage` (Green r13, `ec76d7627`) and passed with PASS=3, FAIL=0. Review A passed at `598c876a5`. Review B passed at `598c876a5`. Phase 1 passed acceptance at `598c876a5`.

**Fixtures and live proof:**

- No fixtures. The tests read the real `cloudbuild.yaml`, `Dockerfile`, `.dockerignore`, the runbook, and the real app sources.
- Live proof: the page module rejects with `NEXT_HTTP_ERROR_FALLBACK;404` for every week, and the container answers `/th/st/2/1` with HTTP 404.
- AC-1.4 in its final form (the week page) moves to P3. The P1 smoke checks 404.

**Tests and falsification conditions:**

| Test | Proves | Falsification condition |
|---|---|---|
| AC-1.2 Cloud Build parse | One deploy of `storytime-app`, `--no-traffic`, a tag, `asia-southeast1`, no secret, no database, no `update-traffic` | The deploy names `primary-advantage-app`, loses `--no-traffic`, or adds `--set-secrets` |
| AC-1.4 Dockerfile text | The turbo build of `storytime`, the standalone runner, port 8080 | The `CMD` starts a different `server.js`, or `.dockerignore` loses `**/.env` |
| AC-1.4 Docker smoke | The image builds and the container answers HTTP 404 | The build fails, or the route answers 200 or 500 |
| AC-1.3 boundary scan | No import across `apps/storytime` and `apps/primary-advantage`, in both directions | One static, dynamic, re-export, or `require` import crosses the line. The scanner self-test proves each form. |
| AC-1.3 non-empty input | The scan reads real sources | The scan finds zero Storytime source files and still passes (A4) |
| Task 1.1 locale and route | `th` default, prefix "always", `notFound` for every week | One week renders before P3 |
| Task 1.5 runbook text | The archive, the tagged check, the traffic step, the rollback, and Daniel's go | The runbook loses the rollback step or the line with Daniel's go |

**Anti-pattern coverage:** A3 (the scripts print `PASS=<n>, FAIL=<n>`, and the gate reads both labels), A4 (the boundary test asserts real sources exist), A5 (the P1 plan notes quote exit codes), A7 (the boundary scan excludes only `node_modules`, `.next`, `__tests__`, and test file suffixes).

**Architecture guardrails:** one program, one app, one container. `apps/storytime` imports shared code only through `workspace:*`. The Cloud Build file never names the Primary service. Milestone 1 needs no database and no secret.

**Changed-contract risks:** the P1 tests that expect 404 for every week change in P3. The Tailwind `@source` test scans each direct shared package, so P2 must add `packages/read-along` to the CSS when the app depends on it.

**Review applicability:**

- Review B: yes. The phase adds a deploy file, a Docker context, and a runbook with production commands. The review checks secrets, the Docker context, and the traffic step.
- Review C: no. The phase has no user interface and no public API. The only route answers 404.
- Adversarial: no. The files are config artifacts. The scanner self-test already attacks each import form.
- Browser review: no. Every week answers 404, so no page exists to look at.

## P2: Shared data contracts

**Risk:** medium. The phase adds a new shared package and a contract on external data. Primary keeps its own player, so no live page changes.

### P2.1 How the tests get the shipped files

- The Workbooks hand-off names one commit for the weeks `l2/w01` to `l2/w08`, the schema, and the phoneme bank. Task 2.1 records that commit.
- Task 2.1 writes each week file byte for byte from that commit to `apps/storytime/content/l2/w<nn>.json`. The source is `git -C ~/Desktop/Workbooks show <commit>:content/storytime/l2/w<nn>.json`. This reads Workbooks. It never writes there.
- Task 2.1 writes `apps/storytime/content/source.json` with the repository name, the full commit, and the list of files. No hash goes in this file (AGENTS.md hashing policy).
- Task 2.6 (`receive-weeks.ts`) later makes the same files from the same commit. The P2 closeout runs the script again and requires `git diff --exit-code apps/storytime/content`. A difference proves that a file was hand-made or changed.
- No audio or picture file enters git in P2. If the blend function needs the phoneme index, task 2.1 copies only that index file.
- The tests load weeks only from `apps/storytime/content/`. A broken copy for AC-3.2 is a deep clone of a shipped week with one change, made in the test. No week fixture file exists under `__tests__/`.

### P2.2 Red before the hand-off arrives

- Red writes all P2 tests now. A test that needs a shipped week fails with the message `Missing handed-off week: apps/storytime/content/l2/w01.json (task 2.1)`.
- These tests never use `it.skip`, `it.todo`, or a condition that skips when the file is missing.
- Task 2.3 (the package copy) needs no shipped week. Its Green can proceed before the hand-off. The phase checkpoint waits for the hand-off.
- Red records each intentionally red test in the P2 Red evidence (section 1.4).

### P2.3 Follow-ups from the Phase 1 acceptance and the reviews

The Phase 1 acceptance at `598c876a5`, Review A r3, and Review B r3 left follow-ups. P2 Red and P2 Green act on them.

**P2 Red must act:**

- The Tailwind `@source` test must assert that its set of shared packages is not empty, before it checks each `@source` line (A4). Today the test loops over the `@reading-advantage` dependencies and never counts them. The falsification condition: the test passes when the app has no shared package dependency.
- A test must fail when the app depends on `packages/read-along` and `apps/storytime/app/globals.css` has no `@source` line for it. The falsification condition: the dependency exists, the CSS line is missing, and the test passes.
- The P2 Red test set reads the app manifest for its shared packages. It never reads a `measure/tracks/` path (A9).

**P2 Green must act:**

- P2 Green adds one `@source` line for `packages/read-along` to `apps/storytime/app/globals.css`, next to the line for `packages/config`.
- P2 Green adds one `COPY packages/read-along ./packages/read-along` line to the pruner stage of `apps/storytime/Dockerfile`. The Dockerfile comment at line 26 asks for this line.
- P2 Green runs `build-graph update ./graph.db <changed files>` after the first structural edit of the phase (A10). `graph.db` already indexes the P1 TypeScript files, and the acceptance at `598c876a5` found no drift.

**Smoke store follow-ups (owner: Green, in P2 or later):**

- The smoke store grows with every run, and no step removes an older `storytime-phase1-local:<sha>` tag. The store held 978 MB after the r13 run, and the machine had a full disk on 2026-10-21. Green adds a prune step that removes the older storytime tags at the end of a run.
- `SMOKE_STORE_ROOT` and `SMOKE_STORE_RUNROOT` come from the environment with no check. A value equal to the default store path gives the cleanup the Review B r2 risk. The cleanup must reject that value, or only the self-test may set it.
- The smoke script skips the heavy lock when the caller passes `--locked`, and `heavy-run.sh` also runs without the lock when the lock folder is missing. Two such runs share the smoke store. The effect stays inside the smoke store. The script must record the run mode, or it must refuse the lock bypass.

**Fixtures and live proof in P2:**

- The P2 tests are artifact and function tests. They read the shipped week files, the app manifest, the CSS, and the Dockerfile. They make no container and no request.
- The live proof of AC-6.1 and AC-7.1 arrives in P3, where the player and the decodable page render in a browser.

**Items from the Phase 1 reviews with a later owner:**

- The app tsconfig must extend `@reading-advantage/config/tsconfig` (owner: Green, in the round that touches the tsconfig).
- The Cloud Build file needs a `timeout` of 3600s if the first Cloud Build build stops (owner: Daniel, deploy gate task 6.3).
- The deploy runbook must upload the commit archive as a tgz file and must print the tagged URL (owner: Green, in the next runbook edit).
- The `phase1-service.test.ts` parse must read the env key of the build-image step (owner: P2 Red, or the phase that edits the Cloud Build test).

**Targeted Red command:**

```bash
bash ~/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm exec vitest run --maxWorkers=1 apps/storytime/__tests__/phase2-*.test.ts packages/read-along'
```

If the root Vitest config does not reach the package, use `pnpm --filter <read-along package> exec vitest run --maxWorkers=1` in a second `heavy-run.sh` call. The default package name is `@reading-advantage/read-along`.

**Green gate:** the targeted Red command exits 0 after the hand-off. Each P2 test file has at least one test that ran.

**Closeout gate:**

1. The Green gate.
2. `heavy-run.sh -c 'pnpm --filter storytime exec tsx scripts/receive-weeks.ts --commit <recorded commit>'`, then `git diff --exit-code apps/storytime/content`. Task 2.6 adds `tsx` from the workspace catalog to the Storytime dev dependencies if the app needs it.
3. `bash apps/storytime/__tests__/phase1-quality-gates.sh`. If the read-along package has its own tasks, the script or a second `heavy-run.sh` call adds `--filter=<read-along package>`.
4. The P1 targeted Vitest command stays green.
5. `build-graph update` for the new package and the contract files.
6. The change-quality review (task 2.7), Review B, Review C, and the adversarial record.

**Tests and falsification conditions:**

| Test | Proves | Falsification condition |
|---|---|---|
| AC-3.1 contract on shipped weeks | The Zod contract parses `l2/w01` to `l2/w08` at the recorded commit | The contract rejects a shipped week, or the test reads fewer than 8 files and passes (A4) |
| AC-3.1 extra keys | The contract keeps unknown keys | The contract uses `.strict()` and a shipped week has a field the app does not read |
| AC-3.2 broken copies | A missing book, a page with no picture file, times out of order, and `version` other than 1 each fail with the field path | One broken copy parses, or the error has no path |
| AC-3.2 published rule | A published week has one book of each kind | A published week with two `readalong` books parses |
| `programSchema` | `storytime` stays in the enum | The value is removed from `packages/types` |
| Task 2.3 copied tests | The Primary player tests pass in the new package | A copied function changes its behavior, and a moved test fails |
| AC-6.1 timing on a shipped page | Each sentence of a shipped two-sentence page seeks and lights up | Only the first sentence lights up (rule 10.3) |
| Rule 10.2 cut bounds | A cut starts 30 ms before the word and ends at its measured end | The end equals the start of the next word |
| AC-7.1 blend function | Each word of week 1 plays whole. The CVC words of a later shipped week play in grapheme order. | Week 1 plays a word sound by sound, or a tricky word plays sound by sound |
| AC-4.1 receiving | A run on the recorded commit writes the weeks and lists the missing media by name | The run passes with an empty media list for a week that has books (A4) |
| AC-4.2 status kept | The written file keeps `meta.status` of the source | A draft week becomes `published` (A2) |

**Anti-pattern coverage:** A2 (the receiving step never changes `meta.status`, and AC-4.2 tests a draft and a published week), A4 (every loop asserts a count of 8 weeks or a non-empty list first), A7 (the media list filter names exact media kinds, never words), A15 (`source.json` holds a commit, not a hash).

**Architecture guardrails:**

- `packages/read-along` imports nothing from `apps/*`. The P1 boundary scan or a new P2 scan proves it in both directions.
- Primary keeps its own player in P2 (spec section 9, choice 4). No file under `apps/primary-advantage` changes in P2. The closeout checks `git diff --stat <phase_base_sha>..HEAD -- apps/primary-advantage` is empty.
- The week contract stays in `apps/storytime/lib/contracts/`. It moves to `packages/types` only when a second app reads weeks.
- The receiving step validates every external input with Zod before a write (AGENTS.md).
- Task 2.3 adds one tech-debt row for the player copy.

**Changed-contract risks:**

- Workbooks owns `StorytimeWeekSchema` version 1. A new Workbooks version must fail the version check, not parse with wrong fields.
- The package copy adds a new public surface. Its exports become a contract for P3, P4, and P7.
- The media file names in a week become paths in P5. A name with `..` or `/` must fail validation.

**Review applicability:**

- Review B: yes. The receiving step reads an external repository and turns data into file paths. The review checks path traversal and status tampering.
- Review C: yes. The package public API and the contract shape are new APIs for later phases.
- Adversarial: yes. Hostile week data is an attack surface: wrong versions, `..` in file names, duplicate books, and a status change.
- Browser review: no. No route renders the player or the contract in P2.

## P3: At-home app

**Risk:** high. The printed QR paths reach this route from about 2026-11-22. The path scheme is frozen, and the route is public with no login.

**Targeted Red command:**

```bash
bash ~/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm exec vitest run --maxWorkers=1 apps/storytime/__tests__/phase3-*.test.ts'
```

The browser checks run as a second command on the built app (see the browser review below). P3 Red also replaces the P1 test "answers with notFound for every week before Phase 3" and the 404 check in the Docker smoke. The new form expects the week page for a published week and 404 for others.

**Green gate:** the targeted Red command exits 0. The browser check script exits 0 with labeled results for AC-5.2, AC-5.3, and AC-8.2.

**Closeout gate:**

1. The Green gate, and the P1 and P2 targeted Vitest commands.
2. `bash apps/storytime/__tests__/phase1-quality-gates.sh`.
3. The Docker smoke in its P3 form. The container answers `/th/st/2/1` with the week page and an unpublished week with 404. This is the final form of AC-1.4.
4. The browser review on the review copy (task 3.7).
5. `build-graph update`, the change-quality review, Review B, Review C, and the adversarial record.

**Fixtures and live proof:**

- The route tests load the received weeks from `apps/storytime/content/`. They use no hand-made week.
- The tests can mock the audio element and the media URLs. A mock never decides the result of a timing or a 404 check.
- Live proof: HTTP status and headers from the built server, the rendered page, and the browser network log.

**Tests and falsification conditions:**

| Test | Proves | Falsification condition |
|---|---|---|
| AC-2.1 route shape | `/<locale>/st/<level>/<week>` renders a published week | A published week answers 404 |
| AC-2.1 `?part=` | `book`, `decodable`, and `song` open that part first. Other values open the default. | An unknown `part` value throws or opens a random part |
| AC-2.1 locale redirect | `/st/2/1` redirects to `/th/st/2/1` on the same host | The redirect goes to another host, or keeps a path like `//host` |
| AC-2.1 404 | An unknown or unpublished week answers HTTP 404 | A draft week renders (A2) |
| AC-5.1 public and private | The route needs no login, has `noindex`, and sends no `Set-Cookie` | The next-intl middleware sets a locale cookie on the page or the redirect |
| Rule 10.5 recorded labels | A label without a recording shows no speaker | The page calls `speechSynthesis` |
| AC-6.1 UI | Each sentence lights up in "read it to me". "My turn" plays nothing before a tap. | Audio plays on page load |
| Rule 10.1 slow mode | The slow mode plays `slowFile` | The slow mode changes `playbackRate` |
| Rule 10.4 load failure | A failed sound shows a message | A failed sound fails with no message |
| AC-7.1 UI | The decodable plays words with the P2 blend function | The UI has its own blend rule |
| AC-8.1 song | No sound before a tap. Each line lights up from `song.times`. | A line lights up from an even split of the duration |
| Song picture rule 9.1 | A line picture is the line object | A line uses a gesture thumbnail |
| Karaoke tile | No tile without `song.karaoke` | The tile shows with no karaoke data |
| AC-2.2 printed URLs | Each `home.songUrl` and `home.readAlongUrl` of each received week resolves to a route | A URL points to a path that answers 404, or the test reads zero weeks (A4) |
| AC-5.2 tap targets | Each tap target is 64 px or more in portrait and in landscape | One target is smaller and the check passes |
| AC-5.3 first load | At most 300 KB before the first tap, and no media request before a part opens | The check parses an unlabeled number, or counts zero requests and passes (A3, A4) |
| AC-8.2 video box | 9:16 on a portrait phone at 75 percent of the height or less, 16:9 on a laptop | The phone video fills the screen |

**Anti-pattern coverage:** A2 (only `meta.status: published` renders), A3 (`transferred_bytes=<n>` and `tap_target_min_px=<n>`), A4 (non-empty week list, route list, and request log), A7 (the network filter names media types by MIME type and file extension, never by words).

**Architecture guardrails:**

- The page and the route stay thin. Week loading, parsing, and the published check are functions in `apps/storytime/lib/`.
- The players come from `packages/read-along`. The app never imports from `apps/primary-advantage`.
- Media loads only when a part opens. No phone voice is a fallback for content audio.
- No launch date appears in user-facing text. Messages exist in `th` and `en`.

**Changed-contract risks:**

- The frozen path scheme. A change can add a path. A change never removes or renames a path.
- next-intl writes a locale cookie by default. The routing config must turn the cookie off, or AC-5.1 fails.
- The P1 tests that expect 404 change here. P3 Red changes them in the same commit as the new tests.

**Review applicability:**

- Review B: yes. The route is public, reads URL input, sets headers, and redirects. The review checks cookies, `noindex`, the redirect target, and path input.
- Review C: yes. The at-home pages are the parent and child interface, and the URL scheme is a printed public contract.
- Adversarial: yes. The URL is the attack surface: `..`, very large numbers, leading zeros, `//` paths, unknown locales, and unknown `part` values.
- Browser review: yes. AC-5.2, AC-5.3, and AC-8.2 need a real browser.
  - `PROJECT_DEV_URL` source: a local `next start` of the Storytime production build, under `heavy-run.sh`, on `http://127.0.0.1:<port>`. The orchestrator records the port and the commit.
  - Viewports from task 3.7: portrait phone, landscape phone, and laptop. Defaults: 360x800, 800x360, and 1366x768.
  - The browser tool is Playwright from the workspace catalog (`@playwright/test`), as Primary uses it. No new browser dependency.

## P4: Teacher app

**Risk:** high. Teacher content must stay off the public service until Daniel decides Q1. A flag error exposes every teacher route.

**Targeted Red command:**

```bash
bash ~/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm exec vitest run --maxWorkers=1 apps/storytime/__tests__/phase4-*.test.ts'
```

**Green gate:** the targeted Red command exits 0. The browser check at 1920x1080 and on a laptop exits 0 with the flag on.

**Closeout gate:**

1. The Green gate, and the P1 to P3 targeted Vitest commands.
2. `bash apps/storytime/__tests__/phase1-quality-gates.sh`.
3. The Docker smoke with the flag not set. Each teacher route answers 404 from the container.
4. The browser review (task 4.5).
5. `build-graph update`, the change-quality review, Review B, Review C, and the adversarial record.

**Fixtures and live proof:**

- The week view and lesson tests read the received milestone week from `apps/storytime/content/l2/w01.json`.
- Live proof: the built server with the flag not set answers 404. The built server with the flag on renders each day.

**Tests and falsification conditions:**

| Test | Proves | Falsification condition |
|---|---|---|
| AC-9.3 flag off | Every teacher route answers 404 when the flag is not set, empty, or `false` | One route renders, or the flag reads as on for the value `false` |
| AC-9.3 build-time leak | A production build with the flag not set has no teacher page | The build makes a static teacher page that the runtime check cannot stop |
| AC-9.1 week view | Each item of the week view comes from the shipped file | One item is a hard-coded string |
| AC-9.2 lesson steps | For each of the five days, the steps on screen equal the steps in the file, with four headings and three variant lines each | A day with one missing step passes, or the test checks zero days (A4) |
| Review strip and Friday check | `review[]` shows each day. `check` shows on day 5 only. | The check shows on day 3 |
| Thai toggle | Each `{ en, th }` field shows its Thai text | One field has no Thai text when the toggle is on |
| Task 4.4 media | The step keeps its place after the player closes | The flow goes back to step 1 |

**Anti-pattern coverage:** A3 (the step count is a labeled integer per day: `day=<n> steps=<n>`), A4 (five days and at least one step per day), A5 (the plan names the flag default that the test proves).

**Architecture guardrails:** the teacher routes are a route group of `apps/storytime`, not a new app. The class-screen player reuses the P3 player. The flag is a server-side environment value. A `NEXT_PUBLIC_` flag is not allowed, because the build inlines it.

**Changed-contract risks:** the flag name and its default become an ops contract in the deploy runbook. The runbook must state that the default is off.

**Review applicability:**

- Review B: yes. The flag is the only access control on a public service until Q1.
- Review C: yes. The teacher flow is a new interface for teachers on a class screen.
- Adversarial: yes. Flag values, direct RSC requests, prefetch links, and route variants with and without a locale are attack surfaces.
- Browser review: yes. The layout must fit a class screen and a laptop.
  - `PROJECT_DEV_URL` source: a local `next start` of the Storytime production build with the teacher flag on, under `heavy-run.sh`. A second run with the flag not set proves 404.
  - Viewports from task 4.5: 1920x1080 and a laptop (default 1366x768).

## P5: Milestone week integration

**Risk:** high. The phase runs model pre-checks with a cost, receives media from two production sides, and makes the review copy for Daniel. Task 5.2 (paid generation) is a human gate.

**Human gate:** task 5.2 is `[b] … deferred:daniel`. No automated gate covers it. The orchestrator never runs it.

**Targeted Red command:**

```bash
bash ~/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm exec vitest run --maxWorkers=1 apps/storytime/__tests__/phase5-*.test.ts apps/storytime/scripts/checks'
```

Each measurement script also runs once on its broken copy under `heavy-run.sh` and must exit non-zero.

**Green gate:** the targeted Red command exits 0. Each measurement script fails its broken copy and passes a good file. Each rubric fails its known bad files and passes one file that Daniel passed.

**Closeout gate:**

1. The Green gate, and the P1 to P4 targeted Vitest commands.
2. `bash apps/storytime/__tests__/phase1-quality-gates.sh`.
3. Stages 1 and 2 on every received milestone file, with the run log and the cost ledger lines.
4. The agent playthrough of every part on the review copy (task 5.6, rule 6.5).
5. `build-graph update`, the change-quality review, Review B, Review C, and the adversarial record.

**Fixtures and live proof:**

- Broken copies are made from real files by one change each: a cut-off edge, added noise, clipping, a wrong size, or a wrong type. The known bad files are BA1 "Hello", `04-n.mp3`, C1W2 cut 1, and the "One sun" thumbnail.
- The model pre-check never runs in Vitest. A unit test can mock the model client to test the runner logic only. A mock result never counts as a pre-check.
- Live proof: the measurement output on the real milestone files, and the model output log with the model name and the price.

**Tests and falsification conditions:**

| Test | Proves | Falsification condition |
|---|---|---|
| AC-11.1 each script | Each measurement script fails its broken copy before it counts | A script passes a broken copy |
| AC-6.2 word edges | Each word cut has no sound at either edge. The script fails BA1 "Hello". | The script passes BA1 |
| AC-7.2 phoneme gate | Noise floor below -60 dBFS, no clipping, and the rule 5.2 loudness target | The script passes `04-n.mp3` with its hiss |
| AC-10.1 media list | Every listed file exists with its size and type | A missing file passes, or the list is empty (A4) |
| AC-11.2 calibration | Each rubric fails its known bad files and passes one passed file | A rubric passes a known bad file |
| Cost ledger | The model and its price are logged before each run. Release files get a second provider. | A run starts with no ledger line |
| AC-6.3, AC-7.3, AC-10.2 | Every milestone file passes its rubric, and the log goes with the delivery | A file reaches the review page with no stage 2 log line |
| FR-12 review page | Five items, each with Pass, Fail, a comment, and Send | An item has no Send, or an item has no answer and shows as passed |

**Anti-pattern coverage:** A2 (a file reaches Daniel only after stages 1 and 2 pass; the review page never marks an item passed without his answer), A3 (`noise_floor_dbfs=<n>`, `true_peak_dbtp=<n>`, `edge_rms_dbfs=<n>`), A4 (non-empty media list and file set), A5 (an automated count never closes a media acceptance check, rule 6.2), A7 (the media list filter names exact kinds).

**Architecture guardrails:**

- The scripts live in `apps/storytime/scripts/checks/`.
- A model call goes through the internal AI adapter (`packages/ai`). A bucket write goes through `@reading-advantage/storage`.
- The review copy serves media from local files. The production bucket receives files only with a deploy.
- No song audio goes to a hosted separation service (S28 default).

**Changed-contract risks:** the media list format becomes the hand-off contract with Workbooks and Forge. A rubric change after calibration makes its calibration void, so the rubric runs its calibration again.

**Review applicability:**

- Review B: yes. The runner sends media to a model provider with an API key, and the stage logs can hold keys. The review checks key handling and the cost ledger.
- Review C: yes. The FR-12 review page is the interface for Daniel's judgment.
- Adversarial: yes. Broken copies and known bad files attack each gate (rule 11.1).
- Browser review: yes. The agent side opens, plays, and checks every part on the review copy before Daniel (rule 6.5).
  - `PROJECT_DEV_URL` source: the review copy on a local server on the office network with local media (task 5.6). The orchestrator records the URL and the commit.
  - Viewports: the P3 and P4 sets.

## P6: Daniel's milestone judgment

**Risk:** critical. The phase holds the deploy and the traffic move to the domain that the printed QR codes use.

**Human gates (not automated gates):**

- 6.1 Daniel judges the five items and runs the phone checks. Evidence class: owner-passed and person-checked.
- 6.3 The deploy with no traffic, the bucket upload, and the tagged URL check. Daniel's go starts it.
- 6.4 The traffic move, then AC-2.3. Daniel's go starts it.

**Targeted Red command (task 6.2 only):** for each finding, a test that reproduces it in the targeted file of its phase, under `heavy-run.sh` with `vitest run --maxWorkers=1 <file>`. A media finding goes back through stages 1 and 2.

**Green gate:** each finding test exits 0. Each changed file passes stages 1 and 2 again.

**Closeout gate:**

1. The P1 to P5 targeted Vitest commands and `phase1-quality-gates.sh`.
2. The Docker smoke in its P3 form at the passed commit.
3. A diff of the deploy commit against the commit that Daniel passed on the page. The diff must be empty (owner rule, 2026-10-23).
4. After Daniel's go and the traffic move: AC-2.3 on the live domain.
5. The retro entry (task 6.5).

**AC-2.3 live check:** a script requests every printed URL of the published weeks on `https://storytime.reading-advantage.com`. Each URL answers 200. The script records the URL, the revision, and the time. It runs only after Daniel's go. It writes nothing to the service.

**Anti-pattern coverage:** A2 (the deploy runs only with Daniel's recorded go; the commit equals the passed commit), A3 (`status=<n>` per URL and a labeled URL count), A4 (the URL list is not empty), A6 (the registry says "live" only after AC-2.3 passes).

**Architecture guardrails:** a deploy never moves Primary traffic. The rollback names a revision.

**Changed-contract risks:** the live revision becomes the target of the printed codes. A later deploy must keep every printed path.

**Review applicability:**

- Review B: yes. The deploy, the bucket upload, and the live check touch production.
- Review C: yes. Each fix changes an interface that Daniel judges.
- Adversarial: no. Task 6.2 reuses the P3 to P5 gates, and the other tasks are human gates.
- Browser review: yes, for the fixed items before they go back to Daniel. `PROJECT_DEV_URL` is the P5 review copy. The check on the tagged URL is part of Daniel's gate.

## P7: Primary boundary and printed-URL continuity

**Risk:** critical. Task 7.1 deletes code on master. Task 7.2 changes the player of live Primary reading pages.

**Human gates (not automated gates):** 7.1 (the deletion) and 7.3 (the branches and worktrees) are `[b] … deferred:daniel`. The Primary deploy of 7.2 is Daniel's gate.

**Targeted Red command (task 7.2):**

```bash
bash ~/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/primary-advantage && pnpm exec vitest run --maxWorkers=1 lib/read-along components/read-along hooks/__tests__/use-read-along.test.tsx'
```

Red adds an import test: the Primary read-along callers import from the package, and the Primary copy no longer exists.

**Green gate:** the targeted command exits 0 with the same test count as before the switch, or a larger count. The Primary fixtures (`contraction`, `curly-quote`, `audio-dropped`, `digit`, `hyphen`) pass.

**Closeout gate:**

1. The Green gate.
2. `heavy-run.sh -c 'pnpm turbo run build check-types --filter=primary-advantage'`. Lint compares against the known Primary error count and adds no new error.
3. The browser review of Primary articles, lesson reading, and story chapters.
4. The Storytime P1 to P5 targeted commands.
5. The tech-debt row of task 2.3 is removed.
6. Task 7.4 (2026-11-15): the AC-2.3 script on the live domain. A failure gives Daniel the options. The deploy stays his gate.

**Anti-pattern coverage:** A4 (the moved test count is a labeled integer and never drops), A5 (the plan claims "no change of behavior" only with the test count and the browser result), A7 (the import scan names exact paths).

**Architecture guardrails:** after 7.1, `apps/primary-advantage` has no Storytime route, component, content, script, or host rule. The P1 boundary scan stays green.

**Changed-contract risks:** the package API from P2 now serves two apps. A change to it needs the tests of both apps.

**Review applicability:**

- Review B: yes. The removal of the host rule in `proxy.ts` changes request routing on a live service.
- Review C: yes. The live Primary reading pages must keep their behavior.
- Adversarial: yes. The Primary fixtures attack the swapped player with known hard text.
- Browser review: yes. `PROJECT_DEV_URL` source: a local `next start` of the Primary build, or the port 3005 manual test server at the recorded commit. Viewports: portrait phone and laptop. The check never writes to the shared `primary_advantage` database.

## P8: Release 1 (deferred until Daniel decides S17)

**Risk:** high. The phase holds the release scope, teacher sign-in, and evidence code. Each task is a human gate today.

**Human gates (not automated gates):** tasks 8.1 to 8.6 are `[b] … deferred:daniel`. No Red, Green, or closeout gate exists until Daniel decides S17.

**Rule for later:** when Daniel opens a task, the strategy role writes its gates before its Red role. The orchestrator captures `phase_base_sha` after that strategy commit. Weeks 2 to 8 reuse the P3 and P5 gates per week.

**Anti-pattern coverage:** A1 and A8 (the `[b] … deferred:daniel` markers stay structured until Daniel opens a task), A6 (no registry note claims release 1 before Daniel's go).

**Review applicability:**

- Review B: yes. Task 8.4 adds teacher sign-in, and that is an auth surface.
- Review C: yes. Weeks 2 to 8 and the karaoke tile change the parent interface.
- Adversarial: no. No task has code until Daniel decides S17. The decision reopens this entry.
- Browser review: no. No task has a page until Daniel decides S17. The decision reopens this entry.

## 3. Open questions

None block this strategy. These items wait for other owners:

- The Workbooks hand-off commit (task 2.1) comes through the PM orchestrator.
- Daniel's answers to S17, S26, S28, Q1, Q2, Q3, and Q4 (spec section 8). The defaults in the spec apply until then.
