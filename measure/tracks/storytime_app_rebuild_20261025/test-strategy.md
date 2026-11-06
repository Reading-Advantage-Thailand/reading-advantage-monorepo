# Test strategy: Storytime app rebuild (an app in the monorepo)

> **Track:** `storytime_app_rebuild_20261025` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Scope:** Phases 1 to 8 (P1 to P8). Written 2026-10-26 at `21c764edc`. Section P3 refreshed 2026-11-03 at `89724ddb6`.
> **Phase 1 note:** Phase 1 Red ran before this file existed (`phase_base_sha` `3504b8d7a`). The P1 section records the gates that apply now. It does not move that SHA.
> **Revision 2026-10-28:** the Phase 1 checkpoint refresh. It records the acceptance at `598c876a5`, the 45-minute smoke limit, and the P2 follow-ups. The role table names claude-code/claude-opus-5-5[1m]#high. This revision ran on minimax-cn-coding-plan/MiniMax-M3#high, the route that ra-quota picked.

> **Revision 2026-11-03:** the Phase 3 refresh at role base `89724ddb6`. It adds the A-42 tasks (3.8, 3.9, 3.10, 4.6), dates, the placement of the Phase 2 open findings, the accessibility decisions, and the Phase 3 role models. The role table names Opus for the strategy role. This revision ran on claude-code/claude-sonnet-5-5 under Daniel's Claude-only order until 14:59 ICT.

> **Amendment 2026-11-05:** three PM decisions at role base `e9c1908fd`. (1) The Docker smoke: run 1 asserts 200 for shipped st2/1, and run 1b proves `missing_picture` with a broken clone. (2) The `date` and `words` rule for an approved part applies to the loops part only. (3) The six P3.6 machine-check rows stay in the Phase 3 browser gate.

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

**Risk:** high. The printed QR paths reach this route from about 2026-11-22. The path scheme is frozen, and the route is public with no login. The phase also holds the A-42 contract gate (task 3.8). That gate controls what children see.

**Revision 2026-11-03 (strategy at role base `89724ddb6`):** this section replaces the P3 text of 2026-10-26. It adds the A-42 tasks (3.8, 3.9, 3.10), a date and a risk for every task, the placement of the open findings, the accessibility decisions, and the role models. It keeps the rules of sections 1 and 2.

### P3.1 Facts that shape the tests

These facts were measured at `89724ddb6`. Red and Green must not assume the opposite.

- No shipped week has a page picture with a `file` (w01 to w07: 0 of 16 pages in each; w08 has no book). The only published week, w01, is therefore **not ready** under spec FR-5 and AC-5.4. The real route answers 404 for w01 with the shipped content. This is correct behavior and not a defect.
- **Note 2026-11-05 (PM):** the two lines above describe the pin at the time of writing. At the pin `67be5603` shipped w01 is ready and answers 200. Tests of the not-ready path use a broken clone (see the smoke run 1b).
- A live test of a ready page needs a **ready copy**. A ready copy is a deep clone of shipped w01 with one change class: a `file` on every page picture. The test makes the clone. No ready week file goes into `apps/storytime/content/`.
- A test may mock the week loader to supply the ready copy. A mock never decides the readiness result. The readiness function runs on the shipped files (expected result: not ready) and on the clone (expected result: ready).
- The standalone output holds no `content/` folder today (cloud report `storytime-standalone-content.md`, unverified claim; Green re-measures). Vitest cannot see this fault. Only the built server or the container shows it.
- The Phase 1 first load is 143,222 bytes on the wire for the 404 page (cloud report `storytime-first-load.md`, unverified claim; Green re-measures). The week page adds its own code to this base.
- jsdom has no layout. A jsdom test never decides a size, a contrast, a box ratio, or a position. Only the browser gate decides these (A4: a size check in jsdom reads zero and passes).

### P3.2 Role models

Daniel's Claude-only order holds until 14:59 ICT on 2026-11-03. The role table names Opus for the strategy role. This revision ran on Sonnet because of the order. The orchestrator logs the deviation. The assignment below applies to every Phase 3 role that starts before 14:59 ICT. After that time the normal role table applies, and the independence rules below still hold.

| Role | Family (Claude-only window) | Rule that this choice keeps |
|---|---|---|
| Strategy | Sonnet (deviation from Opus) | Recorded in the strategy log |
| Red (mid-red) | Opus | Red and Green use different families |
| Green (jr-green) | Sonnet | Green differs from Red |
| Review A | Opus | Review A differs from Review B; an auditor is not Green's family |
| Review B (security) | Haiku | Review B differs from Review A; an auditor is not Green's family |
| Review C (UX/API) | Opus | An auditor is not Green's family |
| Adversarial | Opus | An auditor is not Green's family |
| Phase acceptance | Haiku | Acceptance differs from Red; an auditor is not Green's family |

- Haiku carries Review B and the phase acceptance. The orchestrator gives Review B the written probe list of P3.12 so that the review stays concrete.
- Each role start checks the rules again. If Red and Green would share a family, the orchestrator picks another family for that role and logs it.

### P3.3 Tasks: dates, risk, and test files

Dates are the latest dates. The PM fixed the dates of tasks 3.8, 3.9, 3.10, and 4.6. The other dates fit before them. Task 3.8 has two parts: part 1 needs no new Workbooks pin, and part 2 receives the draft pin.

| Task | Latest date | Risk | Red test files (`apps/storytime/__tests__/` unless noted) | Acceptance |
|---|---|---|---|---|
| 3.1 Entry route | 2026-11-06 | high | `phase3-entry-route.test.ts`, `phase3-readiness.test.ts`, `phase3-manifest.test.ts`, changed `phase1-scaffold.test.ts` and `phase1-boundary.test.ts` | AC-2.1, AC-5.1, AC-5.4 |
| 3.8 part 1 Loop contract, receiver, F99 | 2026-11-09 | high | `phase3-loop-contract.test.ts`, `phase3-f99-page-audio.test.ts`, `phase3-loop-receiver.test.ts`, `phase3-media-coverage.test.ts`, `phase3-receiver-hardening.test.ts` | AC-13.2 to AC-13.5 |
| 3.2 Tiles and home card | 2026-11-10 | medium | `phase3-home-card.test.tsx`, `phase3-messages.test.ts` | AC-5.2 (browser) |
| 3.3 Read-along UI | 2026-11-12 | high | `phase3-readalong-ui.test.tsx`; `packages/read-along/components/read-along/__tests__/phase3-a11y.test.tsx` | AC-6.1 |
| 3.4 Decodable UI | 2026-11-13 | medium | `phase3-decodable-ui.test.tsx`, `phase3-phoneme-bank.test.ts` | AC-7.1 |
| 3.5 Song page | 2026-11-16 | medium | `phase3-song-ui.test.tsx` | AC-8.1, AC-8.2 (browser) |
| 3.8 part 2 Draft pin receipt | 2026-11-19 (target: 2 days after the pin arrives) | high | `phase3-loop-contract.test.ts`, `phase3-f99-page-audio.test.ts`, `phase3-loop-receiver.test.ts`, `phase3-media-coverage.test.ts`, `phase3-receiver-hardening.test.ts`; the updated P2 tests that name the pin | AC-13.1 |
| 3.6 Printed URLs and first load | 2026-11-17 | high | `phase3-printed-urls.test.ts`; `phase3-browser-gate.sh` (AC-5.3) | AC-2.2, AC-5.3 |
| 3.7 Phase check | 2026-11-19 (the Phase 3 checkpoint) | high | the Closeout gate below | all of the above |
| 3.10 Approved pin receipt | 2026-11-17 to 2026-11-19 (PM) | high | `phase3-approved-pin.test.ts` | AC-13.1 at the approved pin |
| 3.9 Question screen | 2026-11-26 (before 2026-12-01) | medium | `phase3-question-screen.test.tsx`, `phase3-loops-off.test.tsx` | AC-13.6, AC-13.8 |

Risk reasons:

- 3.1, 3.6, 3.7: the public route and the printed URL contract. One error breaks every printed card.
- 3.8, 3.10: external data decides what children see. An approved flag without Daniel's check is an A2 fault.
- 3.3: the player timing decides if a child hears the right word. The shared package API changes.
- 3.2, 3.4, 3.5, 3.9: screens with no new data surface. The player and the contract carry the risk.

**Order inside the phase:** 3.1, then 3.8 part 1, then 3.2 to 3.5, then 3.8 part 2 when the pin arrives, then 3.6, then 3.7. Task 3.8 part 1 comes early because it changes `lib/contracts` and the receiver, and the later tasks read those.

**Schedule risk (for the orchestrator and the PM):** the Phase 3 checkpoint lands on 2026-11-19 at the latest. The plan rule at line 11 then starts Phases 4 to 6 after the checkpoint. The printed cards ship about 2026-11-22. The strategy cannot move this. If the draft pin arrives on 2026-11-11 as the PM expects, the checkpoint can land on 2026-11-18. The question for the PM is in section 3.

**Tasks that do not hold the checkpoint:** 3.9 and 3.10 run after the Phase 3 checkpoint. Each has its own base SHA and its own phase check (Closeout gate for 3.9 and 3.10 below). The orchestrator captures the base SHA with `git rev-parse HEAD` before the Red role of each task starts.

### P3.4 Commands and gates

**Heavy jobs:** every command below enters `heavy-run.sh`. The rules of section 1.1 apply. The Red role uses `--maxWorkers=1` and the files of its task only.

**Targeted Red command for the first Red task (3.1):**

```bash
bash ~/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm exec vitest run --maxWorkers=1 apps/storytime/__tests__/phase3-entry-route.test.ts apps/storytime/__tests__/phase3-readiness.test.ts apps/storytime/__tests__/phase3-manifest.test.ts apps/storytime/__tests__/phase1-scaffold.test.ts apps/storytime/__tests__/phase1-boundary.test.ts'
```

**Targeted Red command pattern for each later task:** the same command with the Red test files of that task from the table in P3.3. Tasks with a React component add `// @vitest-environment jsdom` at the top of the file, as `packages/read-along` does.

**Phase Red command (the sum of all Phase 3 tests):**

```bash
bash ~/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm exec vitest run --maxWorkers=1 apps/storytime/__tests__/phase3-*.test.ts apps/storytime/__tests__/phase3-*.test.tsx packages/read-along'
```

**Browser gate (tasks 3.2, 3.3, 3.5, 3.6, 3.7):** `bash apps/storytime/__tests__/phase3-browser-gate.sh`. The script enters `heavy-run.sh` itself, as the Phase 1 scripts do. It builds the app, starts `next start` on a free local port with the **ready review fixture** (P3.7), runs Playwright, and prints labeled lines. It ends with `PASS=<n>, FAIL=<n>`.

**Green gate (task level):** the Red files of the task and of the earlier Phase 3 tasks exit 0 with at least one test that ran in each file. `tsc --noEmit` in `apps/storytime` exits 0. A task that changes `packages/read-along` also runs `packages/read-along` tests.

**Green gate (phase level):** the Phase Red command exits 0. The browser gate exits 0 with `FAIL=0`. Every intentionally red test is green (P3.8).

**Closeout gate (Phase 3 checkpoint, task 3.7):**

1. The Phase Red command, and the P1 and P2 targeted commands (P2 command: section P2).
2. `bash apps/storytime/__tests__/phase1-quality-gates.sh`. It runs `pnpm turbo run build check-types lint test --filter=storytime`. Add `--filter=@reading-advantage/read-along` for the package tasks.
3. The Docker smoke in its P3 form, in two runs of one container image:
   - **Replaced 2026-11-05 (PM, see the deviation below):** ~~Run 1 (production content): `/th/st/2/1` answers 404 and the container log holds the reason `missing_picture` for `st2/1`. A draft week answers 404 with the reason `draft`. `docker run --entrypoint sh <image> -c 'ls apps/storytime/content/l2'` lists w01 to w08.~~
   - Run 1 (production content, as built): `/th/st/2/1` answers 200. A draft week answers 404 with the reason `draft`. `docker run --entrypoint sh <image> -c 'ls apps/storytime/content/l2'` lists w01 to w08.
   - Run 1b (broken clone of w01): the run mounts a clone of w01 with the `file` field of every page picture deleted. `/th/st/2/1` answers 404 and the container log holds the line `st2/1 blocked: missing_picture`.
   - Run 2 (ready review fixture mounted): `/th/st/2/1` answers 200 with the week page, `noindex`, and no `Set-Cookie`.
   - The runs together are the final form of AC-1.4. Run 1 alone proves nothing, because a 404 can come from absent content (A4). Run 1b is the only proof of the `missing_picture` path, because the shipped w01 is ready.
   - **Deviation 2026-11-05 (decision owner: PM).** The text above said the shipped `/th/st/2/1` answers 404 with `missing_picture`. At the recorded pin `67be5603` the shipped w01 is ready, after the w01 approval take, so it answers 200. The PM accepted the smoke as built: run 1 asserts 200, and run 1b proves `missing_picture` with a broken copy. Review A at `e9c1908fd` confirmed that run 1b fails for the right reason (probe `review-a-e9c1908fd-probe-run1b.test.ts`, 4 of 4 cases).
4. `bash apps/storytime/__tests__/phase3-browser-gate.sh` (task 3.7 browser review).
5. `git diff --exit-code apps/storytime/content` after `node_modules/.bin/tsx apps/storytime/scripts/receive-weeks.ts --commit <recorded pin>` (the draft pin of task 3.8 part 2).
6. `build-graph update ./graph.db <changed files>` under `heavy-run.sh`. Then `build-graph search ./graph.db <new export>` finds the new exports (A10).
7. The change-quality review, Review B, Review C, and the adversarial record (P3.9).

**Closeout gate (task 3.10):** `phase3-approved-pin.test.ts` and `phase3-loop-contract.test.ts` exit 0. The receiver at the approved pin exits 0. `git diff --exit-code apps/storytime/content` exits 0 after a second receiver run. `phase1-quality-gates.sh` exits 0. Review A on the diff.

**Closeout gate (task 3.9):** `phase3-question-screen.test.tsx`, `phase3-loops-off.test.tsx`, and the P3 read-along tests exit 0. `phase3-browser-gate.sh` exits 0 with the question-screen checks. `phase1-quality-gates.sh` exits 0. Review A, Review C, and a small adversarial record.

### P3.5 Open findings: where each one goes

Sources: `phase-acceptance-01f2acfe8.json` and the Review A, B, and C files of Phase 2. "Stays open" has a reason and an owner.

| Finding | Place | Test or reason |
|---|---|---|
| F70 `tsx` not in the app manifest | Task 3.1 (the first manifest change) | `phase3-manifest.test.ts` reads `apps/storytime/package.json`. It requires `tsx` with the catalog entry. Green adds `tsx`, `@playwright/test`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, and `@testing-library/jest-dom` in **one** `pnpm install` under `heavy-run.sh`. |
| F77 `LEFTOVER_NAME` matches unrelated files | Task 3.8 part 1 (receiver round) | `phase3-receiver-hardening.test.ts`: the message for a match says "possible recovery file". The test file `operator.orig-notes` still stops the run with unchanged bytes. |
| F91 stop rule and runbook text differ | Task 3.8 part 1 | A runbook text test: the runbook says "ends with" and gives the same pattern as the code. |
| F92 recovery step for an untracked target | Task 3.8 part 1 | A runbook text test: the recovery step names the untracked case. |
| F78 scanner skips directory symlinks | Task 3.8 part 1 | A temp fixture links `content/l2` to another folder. The receiver exits non-zero before any write and names the link. |
| F84 stage path checked at the leaf only | Task 3.8 part 1 | Same fixture family: a symlink at a created-folder path. No file appears outside `content/`. |
| F98 truncated `.orig-` copy (Green) | Task 3.8 part 1 | A fault during the copy write leaves no partial copy, or the error names it. The test injects the fault with `StagedOps`. |
| F99 page coverage and empty audio | Task 3.8 part 1 | AC-13.5 (below). |
| F49 a new page needs normal and slow timing | Task 3.8 part 1 | Decision: the contract rule stays explicit. A clone with a ninth page and no sentence for it fails at both `audio.sentences` and `audio.slowSentences`, with the page number. F99 makes the page field mandatory, so this test closes F49. |
| F53 readiness rule in `lib` | Task 3.1 | `phase3-readiness.test.ts` (below). The receiver imports the same function. |
| F13 `mediaOf` misses new media fields | Task 3.8 part 1 | `phase3-media-coverage.test.ts`: every string in a shipped week that has a media file extension is in the `mediaOf` list or in an allow list of exact field paths with a reason (`print`, `benchmark`). Falsification: a new media path outside both lists fails. |
| F14 closed enums | Task 3.8 part 2 | The receipt run at the draft pin is the proof. If it fails on a closed enum, Green edits the contract first, adds the new value with its test, and records the order in the plan note. No test can name a value that Workbooks has not sent. |
| F7 expectations fixed to the current pin | Task 3.8 part 2 | Red lists the P2 tests that depend on the pin (counts of media, missing pictures, published weeks) in the Red evidence. Green updates them in the same commit as the new pin. |
| F17 tile audio, home-word audio, phoneme lookup | Tasks 3.2 and 3.4 | Default: an app naming table. Tile label audio and home-word audio have no entry until the production side delivers. A missing recording shows no speaker (rule 10.5). The phoneme table lists the 45 clips of the Workbooks bank (`phoneme-bank` test, below). The receiver lists the expected files as missing media for task 5.1. A new Workbooks field replaces the table later. |
| F18 tap targets and `--bottom-nav-h` | Task 3.3 | Browser gate: `tap_target_min_px_player` and `bottom_bar_gap_px` (P3.6). |
| F19 one-block page and page end | Task 3.3 | `phase3-readalong-ui.test.tsx`: one block per page, and the audio stops at the end of the last sentence of the page. |
| F20 first production import of the package | Task 3.3 | The app test imports through the specifiers that the page uses. The turbo build in `phase1-quality-gates.sh` proves the bundle. |
| F28 capitals and a very large grapheme list | Task 3.4 | `phase3-decodable-ui.test.tsx`: a capital word of a shipped CVC week plays like its lower-case form. A grapheme list of 200,000 entries returns without a `RangeError`. |
| Word overlap (a shipped week has a 0.04 s overlap) | Task 3.3 | Red finds the shipped pair by scanning the shipped weeks (a non-empty list, A4). In the overlap window the player marks exactly one word. A cut never ends at the next start (rule 10.2). |
| F6 scanner ignores alias and app-name imports | Task 3.1 | Scanner self-test: `from "primary-advantage"` and `from "primary-advantage/lib/x"` fail the boundary test. |
| F10 nested smoke inherits the lock hint | Task 3.7 (the smoke edit) | An independent assertion of the re-entry string in `phase1-smoke-cleanup.test.sh`. |
| F4 package exports | **Stays open**, task 7.2 | The package serves two apps only after task 7.2. Deep imports work until then. |
| F16 machine-readable media list | **Stays open**, task 5.1 | Task 5.1 owns the hand-off format. |
| F21 teacher materials source | **Stays open**, task 4.2 | No Phase 3 screen shows materials. |
| F101 rename an adversarial case | **Stays open**, owner: adversarial role | A name nit in a Phase 2 test. The next adversarial round fixes it. |

### P3.6 Accessibility checks (the cloud report `storytime-a11y.md`)

The report states 41 checks at `01f2acfe8`: 15 fail and 5 partial. Its claims are unverified input. Red and the browser gate verify each one that Phase 3 takes. The rule is: a check that touches a Phase 3 screen becomes a Phase 3 test. Other checks go to a later phase with an owner.

**Phase 3 tests:**

| Check | Test | Class | Falsification condition |
|---|---|---|---|
| Tap target floor: 44 px on every interactive element of the at-home screens (words, sentences, arrows, play, speed, skip). The entry tiles, the speakers, and the question pictures keep the 64 px of AC-5.2 | Browser gate: `tap_target_min_px_tiles_<w>x<h>` and `tap_target_min_px_speakers_<w>x<h>` (64 px); `tap_target_min_px_player_<screen>_<w>x<h>` and `tap_target_min_px_player_question_<w>x<h>` (44 px; both labeled integers, portrait and landscape) | live | One element is 30 px and the gate passes. The self-test page with a 30 px button must fail. |
| Contrast of the current word and of each highlight state: 4.5 to 1 or more (white on blue-500 is 3.71 to 1 today) | Browser gate: `contrast_min_ratio_x100` from computed colors, one value for each state of `HIGHLIGHT_CLASSES` | live | The current word keeps `#3080ff` and the gate passes. The self-test page with white on `#3080ff` must fail. |
| `lang="en"` on English text inside Thai pages, and `lang="th"` on Thai text | `phase3-home-card.test.tsx` and `phase3-readalong-ui.test.tsx`: every element that holds book text, lyrics, home words, or `ask.en` has `lang="en"` as its nearest `lang`; `home.line.th` and `ask.th` have `lang="th"` | live (jsdom, no layout needed) | The passage `<p>` has no `lang` and the test passes. |
| Alt text for pictures | `phase3-home-card.test.tsx`: no `<img>` on an at-home screen lacks an `alt` attribute (`img_without_alt_attr=0`). A picture with a non-empty `caption` uses it as `alt`. A picture with an empty `caption` has `alt=""` and sits next to its text | live | An `<img>` without `alt` passes. The count line has no label. |
| Messages in `th` and `en` have the same keys, and no `th` value is empty or Latin-only | `phase3-messages.test.ts` (A7: an exact allow list for Latin words such as the product name) | artifact | An empty `th.json` passes (it is `{}` today). |
| The 404 for a week path has a non-empty `lang` and a Thai and English message | **Moved 2026-11-05 (PM, see the deviation note below).** `phase3-entry-route.test.ts` (render of the not-found view) keeps the texts. The live `lang` check is a browser-gate row in `phase3-browser-gate.sh` that asserts three things: the status from the network response is 404; `document.documentElement.lang` after load equals the locale of the URL (`th` for `/th/...`); both texts show. The Docker smoke keeps the status, the texts, `noindex`, and no `Set-Cookie`, and does not check `<html lang=`. ~~`phase3-entry-route.test.ts` (render of the not-found view) and the Docker smoke (`<html lang=`)~~ | live | The hydrated `lang` is empty or differs from the URL locale, or the network status is not 404, and the gate passes. ~~The 404 body has `lang=""`.~~ |
| `aria-current` on the current sentence and the marked word | `phase3-a11y.test.tsx` in `packages/read-along` | live | The mark is a color class only. |
| A word is reachable with the keyboard, and Enter and Space tap it | `phase3-a11y.test.tsx` | live | A word has a click handler and no key handler. |
| No duplicate `id` on a rendered at-home page | Browser gate: `duplicate_ids=<n>` must be 0; unit test with two players | live | The fixed `id="playPauseButton"` repeats. |
| The player bar sits at the bottom edge on a tablet below 1024 px (`--bottom-nav-h` undefined) | Browser gate at 768x1024: `bottom_bar_gap_px` is at most 1 | live | The bar has `bottom: auto`. |
| Reduced motion: no transition on the marks | Browser gate with `reducedMotion: 'reduce'`: `reduced_motion_transition_ms=0` | live | `transition-all duration-200` stays active. |
| Visible focus on tiles and controls | Browser gate: `focus_visible_failures=0` over a non-empty list of focus targets | live | A focused tile shows no outline or ring. |
| Right and wrong marks of the question screen use more than color | `phase3-question-screen.test.tsx` (task 3.9): the state shows as a shape or text and as an ARIA state | live | The mark is a color class only. |

**P3.6 decision (PM, 2026-11-05):** the six rows `tap_target_min_px_player`, `duplicate_ids`, `bottom_bar_gap_px`, `reduced_motion_transition_ms`, `focus_visible_failures`, and `contrast_min_ratio_x100` need no human check, because each row is a machine check. The rows stay in the Phase 3 browser gate. Green adds them now. No row moves to another role.

**Deviation 2026-11-05 (decision owner: PM, option a): the week 404 `lang` check.**
- Cause: Next.js 16.4.1 answers a pre-stream `notFound()` on a matched week route under `app/[locale]/layout.tsx` with its fixed error shell `<html id="__next_error__">`. The shell has no `lang`. In Chromium the hydrated document is `<html lang="th">` with status 404 and both texts.
- Decision: the live `lang` check of the week 404 row moves to the browser gate (`phase3-browser-gate.sh`). The Docker smoke no longer checks `<html lang=`. It keeps the status, the texts, `noindex`, and no `Set-Cookie`. No other row and no other gate changes.
- Debt: Green writes a line in `measure/tech-debt.md`. The line names the cause and the recheck: at each Next upgrade, the smoke checks `lang` again. This file only points to that line.
- Evidence: `plan.md`, sub-blocks `#### Phase 3 closeout gate (remediation HEAD 4f004a916)` and `#### Turn 4d Green evidence (item 3 follow-up, blocked)`.

**Later phases (decided now):**

| Check | Phase and owner | Reason |
|---|---|---|
| A required `alt` field in the week contract (172 of 237 captions are empty) | Release 1, Workbooks (PM question in section 3) | The contract belongs to Workbooks. A required field would fail the shipped weeks and AC-3.1. |
| Thai reading font and body size (the `font-article` class builds no CSS) | Phase 5 integration with Daniel's look check | The font choice is a design decision. A web font counts against the 300 KB budget. |
| A tap on a word while the read-along is off (report item 9) | **Declined** | Spec FR-6 "My turn" needs a word tap with no audio running. The report assumes the Primary article rule. |
| Player default labels in English on a Thai page | Covered by `phase3-messages.test.ts` and the labels the page passes | No separate test. |

### P3.7 Fixtures and live proof

- The route tests load the shipped weeks from `apps/storytime/content/`. A broken copy or a ready copy is a deep clone with one change class, made in the test. No week file exists under `__tests__/`.
- The component tests take a shipped book as props. They do not need a ready week.
- **Ready review fixture (browser gate and Docker smoke run 2):** a script (default `apps/storytime/scripts/review-fixture.ts`, Green names it) writes a scratch folder outside the repository tree. The folder holds a ready clone of w01 and generated placeholder media files (short tone audio and small pictures). The built server reads it through a server-side environment value (defaults: `STORYTIME_CONTENT_DIR` and `STORYTIME_MEDIA_BASE`; Green may rename them and the tests follow). The values are never `NEXT_PUBLIC_`, and no request can set them.
- Guard tests: `cloudbuild.yaml` and the `Dockerfile` never name these values. The default content folder resolves from the process folder of the standalone server (`/app/apps/storytime`, because `server.js` changes folder).
- The standalone content fault: cloud option A (`outputFileTracingIncludes` for `./content/**/*.json`) is a proposal on branch `origin/pilot/cloud-storytime-content-trace` at `0b129f390`. Green may adopt it. Nobody merges the branch. The artifact test of that branch proves the config only. The Docker smoke run 1 listing proves the image. The route proof is run 2.
- Mocks: a mock of the audio element records `src`, `play()` calls, and `currentTime`. It never decides a cut bound, a sentence index, or a readiness result.
- Live proof: HTTP status and headers from the built server, the rendered page, the browser network log, and the container listing.

### P3.8 Tests and falsification conditions

**Task 3.1 (entry route, readiness, public headers):**

| Test | Proves | Falsification condition |
|---|---|---|
| AC-2.1 route shape | A ready published week at `/<locale>/st/<level>/<week>` renders (ready copy) | A ready published week answers 404 |
| AC-2.1 canonical numbers | Only `^[1-9][0-9]*$` segments match. `01`, `+1`, `1.0`, `1e0`, and a number beyond the safe integer answer 404, never 500 and never a redirect | A segment `01` renders the week |
| AC-2.1 `?part=` | `book`, `decodable`, and `song` open that part first. Other values, an empty value, and a repeated `part` open the default view, the same as no `part` | An unknown `part` throws or opens a random part |
| AC-2.1 locale redirect | `/st/2/1` redirects to `/th/st/2/1` on the same origin. The `Location` header is a relative path or the request origin. A forged `Host` or `X-Forwarded-Host` header does not change it. A path with `//` does not redirect off-site | The redirect uses the forged host (open redirect) |
| AC-2.1 404 | An unknown, draft, or not-ready week answers HTTP 404. An invalid locale answers 404 | A draft week renders (A2) |
| AC-5.4 and F53 readiness | `isWeekReady(week)` returns not ready for shipped w01 (16 pages without a file) and ready for the clone. The receiver imports the same function for its missing list. The log reason is one of `missing_picture`, `draft`, `absent`, `invalid` | The function returns ready for shipped w01 |
| AC-5.4 note, 2026-11-05 (PM) | The row above is replaced for the pin `67be5603`: shipped w01 is ready, so `isWeekReady` returns ready for it. The not-ready case uses a clone of w01 with the page picture `file` field deleted (see the smoke run 1b) | The not-ready test reads shipped w01 and expects not ready |
| AC-5.1 public | The route needs no login. The metadata has `noindex`. The Docker smoke run 2 checks no `Set-Cookie` on the 200 (`The week page sends no Set-Cookie header`), the redirect (`The locale redirect answers HTTP 307 with no Set-Cookie header`), and the 404 (`404_no_set_cookie=1`), under `week_no_cookie_ok` | The next-intl middleware sets `NEXT_LOCALE` |
| 404 view language | The not-found view under a valid locale has a non-empty `lang` and Thai and English text | `lang=""` |
| F70 manifest | `phase3-manifest.test.ts`: the app manifest declares `tsx` and the test libraries (P3.5) with `catalog:` | `tsx` is missing |
| F6 scanner | The boundary scanner flags the bare package names | `from "primary-advantage"` passes |
| P1 replacement | The old test "answers with notFound for every week before Phase 3" is replaced in the same commit | The old test still stands |

Label note (2026-11-06, Review C round 7, F200 and F201): the rows above name the labels that the gates print.

**Task 3.8 part 1 (loop contract, F99, receiver):**

| Test | Proves | Falsification condition |
|---|---|---|
| AC-13.2 shape copies | Draft copies with two questions, a repeated question kind, 2 words in a `blendDrill`, `repeats` 6, `loopMinutes` 21, and `audio` of a different length than `sounds` each fail with the field path in every status | One copy parses, or the error has no path |
| AC-13.2 approval copies | A recall of four cards (approved), an approval status other than `draft` or `approved`, and an approved loops part without `date` or without `words` each fail | An approved loops part with an empty `words` string parses (A2) |
| AC-13.2 media approval (PM decision 2026-11-05) | `approval.images`, `approval.audio`, and `approval.song` need only a `status` (spec.md:153). The contract requires `date` and `words` on an approved loops part only (spec.md:285). Workbooks keeps the record of Daniel's words for the media. The app does not enforce them. | A test fails an approved media part for a missing `date` or `words` (the test claims a rule the spec does not have) |
| AC-13.2 draft tolerance | A draft copy with a recall of four cards, or with a bad question page or word, parses. The receipt run on it exits 0 | A draft recall error stops the receipt |
| AC-13.3 question check | An approved question with `answer.page` beyond the book fails. An approved question whose `answer.word` is not in the text of that page fails | The check also fails a draft week |
| AC-13.4 clips | The clip pattern `^phonemes/daniel/[0-9]{2}-[a-z]+(-[a-z]+)*\.mp3$` is one constant next to `mediaPath`. `04-n.mp3` and `26-a-short.mp3` pass. `../x.mp3`, `phonemes/daniel/4-n.mp3`, and `phonemes/daniel/04-N.mp3` fail in every status. The media list holds each clip with kind `"phoneme"` and rule `MEDIA_RULES.phoneme`. The receiver run exits non-zero on a bad path | The list is empty for a week that has a `blendDrill` with audio (A4) |
| AC-13.5 and F99 | Published copies fail with the field path: only some sentences have `page`; a `slowSentences` sentence has no `page`; no sentence has `page`. A published book with an empty `sentences` list passes. The shipped w01 passes | The no-page book passes (the F99 fault) |
| F49 | A ninth page with no sentence fails in both lists with the page number | The page passes |
| Level and review rules | The typed read schemas keep passthrough. Hand-off limits are exact: `blendDrill` 3 to 5 words, 2 to 4 sounds, `repeats` 2 to 5; `sightWords` 1 to 3 words, `seconds` 2 to 5; `loopMinutes` 0 to 20 | A limit is off by one and no test fails (each limit has a test at the edge and one past it) |
| F13 coverage | See P3.5 | A new media path is not listed |
| Receiver hardening | F77, F78, F84, F91, F92, F98 as in P3.5 | A fault leaves a partial `.orig-` copy and no error names it |

**Task 3.8 part 2 and 3.10 (pins):**

| Test | Proves | Falsification condition |
|---|---|---|
| AC-13.1 pin holds loops (intentionally red until part 2) | The shipped weeks come from a commit other than `ccf3d95c92bb5b3970722946dffbed1de57f9df6`, and at least one shipped week holds one of the seven fields. The failure message is `Missing A-42 pin: no shipped week holds a loop field (task 3.8 part 2)` | The test passes on the current pin |
| AC-13.1 parse | The typed schemas parse w01 to w08 at the pin. The test counts `weeks_parsed=8` | It reads fewer than 8 weeks and passes (A4) |
| Receipt idempotence | The receiver at the pin exits 0. A second run makes no diff | A hand-edited week passes |
| A2 receipt | The receiver never changes `meta.status` or `approval.loops`. The written bytes equal the source bytes | The receiver writes `approved` into a draft |
| 3.10 approved pin | All 8 weeks hold `approval.loops.status` `approved`, a valid `date`, and non-empty `words`. The test counts `approved_weeks=8`. The words differ from the draft text. The pin commit equals the one the PM hands off | One week is approved without `words` |

**Task 3.2 (tiles and home card):**

| Test | Proves | Falsification condition |
|---|---|---|
| Three tiles | The entry view shows read-along, decodable, and song tiles with a picture each | A tile has no picture entry |
| Rule 10.5 | A label without a recording shows no speaker. A label with a recording (clone) shows a speaker that plays that file only. The page never calls `speechSynthesis` | The page speaks with the phone voice |
| Home card | The Thai parent line, the three home words, the frame, and the activity come from `home`, `focus`, and the week. An empty `home.line.th` shows no blank element | A Thai line is hard-coded |
| Karaoke | No tile without `song.karaoke` | The tile shows with no data |
| Messages | `phase3-messages.test.ts` (P3.6) | `th.json` stays `{}` |

**Task 3.3 (read-along UI):**

| Test | Proves | Falsification condition |
|---|---|---|
| AC-6.1 on a shipped two-sentence page | Each sentence seeks and lights up. A page of the first shipped week with two sentences is found by scan (non-empty) | Only the first sentence lights up (rule 10.3) |
| "My turn" | No `play()` call before a tap. A word tap plays the cut from 30 ms before the word to its measured end | Audio plays on mount |
| Slow mode | The slow mode sets `src` to `slowFile`. `playbackRate` stays 1. The lit sentences come from `slowSentences` | The slow mode changes `playbackRate` (rule 10.1) |
| Load failure | An audio `error` event shows a message in the page language (rule 10.4) | The failure shows nothing |
| Page turner | The arrows and a horizontal swipe move one page. A vertical swipe does not. The first page has no back move. The last page shows the end view | A vertical scroll turns the page |
| Page end (F19) | One block for each page. The audio stops at the end of the last sentence of the page | The audio runs into the next page |
| Overlap | In the 0.04 s overlap exactly one word is marked | Two words are marked |
| A11y package tests | `aria-current`, keyboard on words, no duplicate id (P3.6) | The mark is a color class only |
| F20 import | The app imports the package through the page specifiers | The page imports a path the package does not hold |

**Task 3.4 (decodable UI):**

| Test | Proves | Falsification condition |
|---|---|---|
| Sounds page | The page shows the element, its graphemes, and the sound. A tap plays the bank clip | The sound plays from the phone voice |
| AC-7.1 UI | The UI plays the P2 `blendPlanForWord` plan. A week clone with `soundBook` true plays every word whole. A week clone with a tricky word plays that word whole | The UI has its own blend rule |
| Order | The play log of a shipped CVC word shows the clips in grapheme order, then the whole word | The whole word plays first |
| Phoneme bank table | The table holds 45 clips (`phoneme_clips=45`, labeled). Each clip name matches the G3 pattern. Each grapheme taught in w01 to w08 has one clip | A taught grapheme has no clip, or the count line has no label |
| F28 | A capital word plays like its lower-case form. A grapheme list of 200,000 entries returns | The call throws `RangeError` |

**Task 3.5 (song page):**

| Test | Proves | Falsification condition |
|---|---|---|
| AC-8.1 no autoplay | No `play()` call before a tap. The poster shows first | The video plays on mount |
| AC-8.1 line timing | The line lights from `song.times` of shipped w01 (15 lines). An uneven time table gives an uneven lit time | A line lights from an even split |
| Phone and other video | A portrait phone uses `videoPhone` and `posterPhone`. Other screens use `video` and `poster`. Without a video the page plays `song.audio` | The phone plays `video` |
| Rule 9.1 | The lyric list shows no picture. The gesture shows as text under each line (amendment M-3) | A lyric line shows a picture, or a line loses its gesture text |
| Karaoke | No tile without `song.karaoke` | The tile shows with no data |
| AC-8.2 box | Browser gate: `video_box_ratio_x1000_phone` is 562 plus or minus 5, `video_box_height_pct_phone` is at most 75, and `video_box_ratio_x1000_laptop` is 1778 plus or minus 5 | The phone video fills the screen |

**Task 3.6 (printed URLs and first load):**

| Test | Proves | Falsification condition |
|---|---|---|
| AC-2.2 | The test reads `home.songUrl` and `home.readAlongUrl` of all 8 shipped weeks (`urls_checked=<n>`, n at least 15). Each is a relative path. Its level and week equal the file's own. Its `part` is `book`, `decodable`, or `song`, or absent. The route accepts the path | A URL names another week, another host, or `part=karaoke` and passes. The test reads zero weeks (A4). |
| AC-5.3 first load | Browser gate: `transferred_bytes_first_load` is at most 300,000 (stricter than 307,200). `media_requests_before_tap=0`. `requests_total` is at least 5 | The gate counts zero requests and passes (A3, A4). The self-test page with a 400 KB script must fail. |
| AC-5.3 media after tap | A tap on a part opens that part's media. The log then holds the first media request | A media request appears before the tap |

**Task 3.9 (question screen) and AC-13.8:**

| Test | Proves | Falsification condition |
|---|---|---|
| AC-13.6 choices | An approved week at level 2 shows the distinct answer pictures once each, in book order, with `ask.en` and `ask.th` as text only and no speaker | A picture shows twice for two questions with one page |
| AC-13.6 taps | A right tap marks the picture and goes to the next question. The right tap on the third question ends the screen. A wrong tap shows a gentle mark, stays, and plays no sound. The skip control ends the screen | A wrong tap plays audio or advances |
| AC-13.6 shared page | Two or three questions with the same `answer.page` show that picture once, and it is right for each | The picture is right for one question only |
| AC-13.6 end | The end shows the three tiles of the week page. The slow mode also leads to the screen | The end shows a blank screen |
| Fast taps | Five taps within 100 ms leave one valid state | A double tap skips a question |
| AC-13.8 loops off | A week with no loop field, `approval.loops` absent, a draft, or an approved week at level 1 shows no question screen after the last page and plays as before. The AC-6.1 test passes unchanged on each | The screen shows for a draft week (A2) |
| Browser check | The gate runs the screen at three viewports with the ready fixture set to approved, and with the fixture set to draft | The draft fixture shows the screen |

### P3.9 Anti-pattern coverage

| Task | Anti-patterns and defense |
|---|---|
| 3.1 | **A2:** only `meta.status: published` and ready renders; a draft clone with all files still answers 404. **A3:** `404_no_set_cookie=1`; `phase3-loop-contract.test.ts` asserts eight parsed weeks. **A4:** each loop asserts a non-empty week list and a non-empty path list. **A7:** the scanner excludes `node_modules`, `.next`, `__tests__` by exact name. **A9:** no test reads `measure/tracks/`. **A14:** detectors use `rg -n`. |
| 3.8 | **A2:** the receiver never writes `approved`; an approved loops part without `date` or `words` fails (media parts need only a `status`). **A3:** `weeks_parsed=8`, `phoneme_clips=45`. **A4:** non-empty week, clip, and media lists. **A5:** the plan note quotes the exit code and counts of the receipt run. **A7:** the F13 coverage test names exact field paths in its allow list, never words. **A15:** `source.json` holds a commit, not a hash. |
| 3.2 | **A4:** the tile list and the home-word list are not empty. **A7:** the `th` allow list names exact Latin strings. |
| 3.3 | **A3:** labeled tap-target and contrast integers. **A4:** a size check never runs in jsdom; the browser gate lists at least 20 targets. |
| 3.4 | **A3:** `phoneme_clips=45`. **A4:** the shipped CVC word list is not empty. |
| 3.5 | **A4:** 15 lines in w01 `song.times`. **A5:** the plan note quotes the box ratios. |
| 3.6 | **A3:** `transferred_bytes_first_load=<n>`, `urls_checked=<n>`. **A4:** the request log is not empty. **A6:** `measure/tracks.md` names no "live" state. |
| 3.7 | **A5:** each plan note quotes the exit code and counts of its command. **A10:** `build-graph update` and `search`. **A16:** no worktree. |
| 3.9, 3.10 | **A2:** a draft week never shows loops; 3.10 counts `approved_weeks=8`. **A4:** non-empty question list. **A5:** the plan note quotes the commands. |

**A1, A8:** the human gates stay structured markers. Task 3.10 waits for Daniel's content check, and its marker is `[ ]` or `[~]` with a date, never prose. **A11, A13:** track closeout only.

### P3.10 Architecture guardrails

- The page and the route stay thin. Week loading, the published check, the readiness check, and the part choice are functions in `apps/storytime/lib/`.
- The players come from `packages/read-along`. The app never imports from `apps/primary-advantage`. `packages/read-along` imports nothing from `apps/*`.
- The question screen lives in `apps/storytime`. `packages/read-along` and Primary do not change for it (spec FR-13).
- Primary keeps its own player. `git diff --stat <phase_base_sha>..HEAD -- apps/primary-advantage` stays empty at every Phase 3 closeout.
- Media loads only when a part opens. No phone voice stands in for content audio.
- No launch date appears in user-facing text. Messages exist in `th` and `en`.
- Server code logs through the structured logger (`lib/observability`-style, not `console.error`). A bucket write uses `@reading-advantage/storage`; Phase 3 has none.
- No new hash, checksum, or provenance field enters a test, a manifest, or a media list (AGENTS.md hashing policy).

### P3.11 Changed-contract risks

- The frozen path scheme. A change can add a path. A change never removes or renames a path.
- With the shipped content, **no printed URL answers 200 today**, because no page picture has a file. AC-2.3 (task 6.4) fails on the live domain until the pictures arrive in Phase 5. The registry says "live" only after AC-2.3 passes (A6).
- next-intl writes a locale cookie by default. The routing config turns it off, or AC-5.1 fails.
- The A-42 pin can change closed enums and counts. Task 3.8 part 2 owns the order: contract first, then the receipt.
- The package API grows (page end helper, size prop, `lang` prop). Task 7.2 later serves two apps from it.
- Adding the test libraries and Playwright changes `pnpm-lock.yaml` on shared master. One install in task 3.1 keeps this to one change.

### P3.12 Review applicability

Reviews run at the Phase 3 checkpoint on the diff `phase_base_sha..HEAD` (tasks 3.1 to 3.8). Tasks 3.9 and 3.10 get the delta reviews named in P3.4.

- **Review A (change quality):** yes. Scope: `lib/` functions, the route, `lib/contracts/week.ts`, `scripts/receive-weeks.ts`, `packages/read-along`, the tests. It checks A1 to A16, test falsification, the placement table in P3.5, and the thin route rule. Model: Opus.
- **Review B (security):** yes. Probe list: (1) path and query input: `..`, `//`, leading zeros, huge numbers, repeated `part`; (2) the redirect target with a forged `Host`; (3) cookies and `Set-Cookie` on 200, 404, and redirect; (4) `noindex` in the metadata and the header; (5) the server-side content and media values: no `NEXT_PUBLIC_`, no request control, no path traversal from a week file name to the media URL; (6) the approval gate: an approved loops part without `date` or `words` (media parts need only a `status`, PM decision 2026-11-05); (7) new dependencies (Playwright, jsdom, tsx) and the lockfile diff; (8) the receiver symlink and leftover fixes. Model: Haiku. Tasks 3.9 and 3.10: no Review B, because they add no input surface (3.10 is data only; 3.9 is tap handling).
- **Review C (UX/API):** yes. Scope: the printed URL contract, the `?part=` behavior, the three-tile entry view, the child screens (tap targets, contrast, `lang`, alt, messages in Thai and English), the page-end behavior of the audio, the package public API additions, and the question screen (task 3.9). Daniel judges the media later (Phase 6). Review C judges structure and accessibility. Model: Opus.
- **Adversarial:** yes. Attack surface: the URL (`..`, `//`, `%2e%2e`, leading zeros, huge numbers, unknown locales, unknown and repeated `part`), hostile week data in the loader (a published week with `..` in a file name, a very long path, duplicate books, an approved loops part without words, a page number of 0 or beyond the book), rapid taps and double taps, and a draft week reached through `?part=`. Anti-patterns A1 to A7 are attack surfaces. Model: Opus. Task 3.9: a small round on the draft-week bypass and rapid taps. Task 3.10: no round.
- **Browser review (UX):** yes. The browser gate at the Phase 3 checkpoint covers tasks 3.2, 3.3, 3.5, 3.6, and 3.8 at the draft pin.
  - `PROJECT_DEV_URL` source: a local `next start` of the Storytime production build with the **ready review fixture** (P3.7), under `heavy-run.sh`, on `http://127.0.0.1:<port>`. The orchestrator records the port and the commit.
  - Viewports: portrait phone 360x800, landscape phone 800x360, tablet 768x1024, and laptop 1366x768.
  - Tool: Playwright from the workspace catalog (`@playwright/test`), as Primary uses it. No other browser dependency.
  - The browser gate runs its self-test first: three inline pages (a 30 px button, a 400 KB script, white text on `#3080ff`) must each fail their limit. The gate exits non-zero if one passes.
  - Task 3.9 runs the same gate again with the question-screen checks.
  - Real phone checks (one iPhone, one low-cost Android) are Phase 6 person checks (rule 11.5). No Phase 3 task claims them.

### P3.13 phase_base_sha

- The orchestrator captures `phase_base_sha` with `git rev-parse HEAD` after the commit of this strategy and before the P3 Red role starts. The orchestrator records the full SHA in the P3 Red evidence of `plan.md`.
- The SHA `89724ddb6ae888fd5ef12c223741452964cb9d2f` is the role base of the strategy role. It is **not** the P3 `phase_base_sha`, because it predates the strategy commit (section 1.2).
- Tasks 3.9 and 3.10 get a task base SHA by the same command before their Red role. They use their own phase check.

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

**A-42 task 4.6 (teacher loops):** the task does not hold the Phase 4 checkpoint (plan amendment). Latest date: 2026-11-27, before the internal Storytime release 1 delivery of 2026-12-01. Risk: medium. Tests: AC-13.7 and AC-13.8 (teacher half) in `apps/storytime/__tests__/phase4-loops*.test.tsx`. Gate: those files, the P3 task 3.9 tests, and `phase1-quality-gates.sh` exit 0, and the browser check at 1920x1080 and on a laptop passes with the loops on and with the loops off. Reviews: Review A, Review C, and a small adversarial round (a draft week, a level 1 week, a w08 copy with an extra `soundLoop`). No Review B: the task adds no input surface. The P4 strategy refresh writes the remaining details before the 4.6 Red role.

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

Questions from the Phase 3 refresh. Each has a default, and no question blocks Phase 3:

1. **Schedule (PM).** The Phase 3 checkpoint lands on 2026-11-19 at the latest, and the printed cards ship about 2026-11-22. The plan order puts Phases 4 and 5 before the deploy of Phase 6. May the at-home page deploy (Daniel's gate) before Phases 4 and 5 close? Default: the plan order stays.
2. **Alt text (PM, Workbooks).** May the week contract get an `alt` field for pictures (172 of 237 captions are empty)? Default: Phase 3 renders `alt=""` for an empty caption, and the field waits for release 1.
3. **Pictures (PM, Workbooks, Forge).** **Answered 2026-11-05 (the record answers it, no PM wait).** Original text: No shipped week has a page picture file, so every printed URL answers 404 on the live domain until the pictures arrive. Which date do the first picture files have? Default: Phase 5 (task 5.5).
   - Evidence: at pin `67be5603` the shipped w01 is ready, so its pages have picture files.
   - Evidence: plan task 3.7, evidence item 5 (`plan.md`, near line 802). The receiver ran at pin `67be5603e0410f21491a006b8e9d12f3f9dd1bfc` for weeks 1-8. It reports 8 weeks, 179 media files, and 159 missing pictures, with w01 ready.
   - Evidence: the Docker smoke run 1 asserts that shipped st2/1 answers 200.
   - The date for the remaining missing pictures stays with Phase 5 (task 5.5).
4. **Tile and home-word audio (PM, Workbooks).** Which Workbooks field carries the tile label recordings and the home word recordings? Default: an app naming table with no entries; no speaker shows.
5. **Thai reading font (Daniel, Phase 5 look check).** Which font? Default: the system Thai font.
