# Implementation Plan: Storytime app rebuild (an app in the monorepo)

> **Track ID:** `storytime_app_rebuild_20261025` · **Spec:** [spec.md](./spec.md) · **Survival report:** [docs/s1-s28-survival.md](./docs/s1-s28-survival.md) · **Record of decisions:** [old track decisions.md](../storytime_advantage_program_20261021/decisions.md)
> **Architecture (Daniel, 2026-10-25):** "Storytime is an APP in the MONOREPO." `apps/storytime` in reading-advantage-monorepo, its own Cloud Run service and container (`storytime-app`, S30), and shared packages through the pnpm workspace.
> **Milestone 1:** one week end to end (teacher app, at-home app, one read-along, one decodable, one song) at Daniel's quality bar. Default week: Level 2 week 1.
> **Release goal:** internal release 1 on 2026-12-01. S17 scope stays open until after milestone 1.
> **Fixed date:** printed QR codes ship about 2026-11-22. `https://storytime.reading-advantage.com/th/st/<level>/<week>` must answer before the cards reach homes.

## Rules for this plan

- Markers: `[ ]` pending, `[~]` in progress, `[x]` done, and `[b] … deferred:<owner>` at a human gate. A task in phase N+1 starts only after the heading of phase N has its checkpoint (measure-guard).
- An `[x]` note names the commit and the evidence class: automated, model pre-check, person-checked, or owner-passed (spec FR-11, rule 7.1).
- Hard gates stay with Daniel: paid generation, deploys, deletions, and public dates. A task at a gate gets `[b] deferred:daniel`, and the work continues with the next task. No other step stops to ask (Daniel, 2026-10-25).
- Daniel judges the media at milestone 1 (Phase 6), not in each phase.
- Each task follows `measure/workflow.md`: tests first, then code, then one commit with `(track_id: storytime_app_rebuild_20261025)`. The commit header is 100 characters or less.
- At the end of each phase, run the phase check and append `[checkpoint: <sha>]` to the phase heading.
- Paths start at the monorepo root. Heavy jobs run one at a time under `~/Desktop/primary-parity-progress/heavy.lock`. Vitest runs on changed files with `--maxWorkers=1`.
- Files from Workbooks and Forge move by hand-off through the PM orchestrator. This track never writes in another repository.
- The void build on `master-next` and `storytime/own-app` is a reference to read. This track does not merge it.
- Graph probe: skipped at the opening, because `graph.db` is older than 24 hours (2026-10-23). The first implementation session runs `build-graph update` before Phase 2.

## Phase 1: App scaffold and service config

- [x] 1.1 Scaffold `apps/storytime`: Next.js App Router, `output: "standalone"`, `outputFileTracingRoot` at the monorepo root, next-intl with `th` (default) and `en` and the prefix "always", Tailwind with `@source` for each shared package, and Vitest. The at-home route answers 404 for every week until Phase 3. Test: AC-1.1. Done: `2c69dc328`. Automated: 3 files and 11 tests exit 0 at `87497180d`.
- [x] 1.2 `apps/storytime/Dockerfile` on the Primary pattern: monorepo root as the context, `pnpm turbo run build --filter=storytime`, the standalone runner on port 8080. Check that `.dockerignore` keeps the image small. Test: AC-1.4 (local image build under the heavy lock). Done: `87497180d`, cleanup fix r12 `f7558395e`. Automated: the smoke exits 0 with PASS=3, and the build takes 8m 14s.
- [x] 1.3 `apps/storytime/cloudbuild.yaml`: image `primary-advantage-repo/storytime-app`, service `storytime-app`, `asia-southeast1`, project `primary-advantage`, `--no-traffic` with a revision tag, no database, no secrets. Test: AC-1.2. Done: `a21470244`; BuildKit env `58fae8445`. Automated: `phase1-service.test.ts`.
- [x] 1.4 Boundary test: no import from `apps/primary-advantage` in `apps/storytime`, and the reverse. Test: AC-1.3. Done: `2c69dc328` with the scanner test of `a01d2998d`. Automated: `phase1-boundary.test.ts`.
- [x] 1.5 Runbook `docs/runbooks/storytime-deploy.md`: the archive of the commit, `gcloud builds submit --region asia-southeast1 --config apps/storytime/cloudbuild.yaml`, the check on the tagged URL, the traffic step, and the rollback to a named revision. Each step names Daniel's go. Done: `c605b8fb3`. Automated: the runbook test of `phase1-service.test.ts`.
- [x] 1.6 Phase check: `tsc`, lint, the changed tests, and a change-quality review. Done: `87497180d`. Automated: `phase1-quality-gates.sh` exits 0 with PASS=2 (4 of 4 turbo tasks). The change-quality review goes to the review role.

### Phase 1 Red evidence

- Mid-Red started at `3504b8d7a948bfd488fad53ad4c8f0a2c84816ba`. Both supplied bases resolve to this commit.
- The track has no `test-strategy.md`. The supplied Red command and the Phase 1 criteria define the tests.
- Red writes tests only. Tasks stay open until Green and the phase checks pass. The phase heading has no completion checkpoint.
- Automated Red command: `cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm exec vitest run --maxWorkers=1 apps/storytime`. The heavy lock wrapped this command.
- Result: exit 1; 3 failed files; 10 failed tests; 1 passed test. Each acceptance test fails on a missing artifact.
- Task 1.1 fails on the missing package, Next.js config, locale config, CSS, layout, and week route. The route test expects `notFound` before Phase 3.
- Tasks 1.2 and 1.3 fail on the missing Dockerfile and Cloud Build file. Task 1.5 fails on the missing deploy runbook.
- Task 1.4 fails on the missing app manifest. The scanner self-test passes for static imports, exports, dynamic imports, and CommonJS imports.
- Automated Docker command: `bash apps/storytime/__tests__/phase1-docker-smoke.sh`. It takes the heavy lock itself. Result: exit 1; PASS=0, FAIL=3. The missing Dockerfile prevents the build and HTTP check.
- Automated test type check: `pnpm exec tsc --noEmit --strict --skipLibCheck --esModuleInterop --module esnext --moduleResolution bundler --target es2022 apps/storytime/__tests__/phase1-{scaffold,service,boundary}.test.ts`. Result: exit 0 under the heavy lock.
- Automated syntax check: `bash -n apps/storytime/__tests__/phase1-docker-smoke.sh`. Result: exit 0. `git diff --check` also exits 0.
- The full AC-1.1 command stays with Green: `pnpm turbo run build check-types lint test --filter=storytime`. Vitest must not invoke this command recursively.
- Automated quality command: `bash apps/storytime/__tests__/phase1-quality-gates.sh`. It takes the heavy lock itself. Result: exit 1; PASS=0, FAIL=2. The missing package prevents the full command. Its shell syntax check exits 0.
- AC-1.4 expects a week page after Phase 3. This Phase 1 Docker test expects HTTP 404, as task 1.1 requires.
- The boundary test scans tracked Primary files and all non-ignored Storytime source files. It excludes the unrelated untracked Primary work.
- Reports: `measure/runs/storytime_app_rebuild_20261025/mid-red-3504b8d7a.log` and `.json`. These local reports use the existing ignore rule.
- Red checkpoint: `a01d2998d` commits the tests and the command evidence. This checkpoint does not complete Phase 1.

### Phase 1 Green evidence

- Smoke attempt 5 (2026-10-25 20:22-20:42 ICT, HEAD 26f02bbd0): `DOCKER SMOKE FAIL: the build hit the 20m time limit`, PASS=1, FAIL=2. The install reached 2071 of 2075 packages under registry faults; every try started from zero.
- r7: the pnpm store moves into a build cache mount (`1990bb1a7`); attempt 6 follows.
- Smoke attempts 6 (2026-10-26 21:19-21:41 ICT, HEAD 649ddca75) and 7 (2026-10-26 22:32-22:52 ICT, HEAD 13f0f137a): both hit the 20m time limit. Attempt 7 shows the store cache works (`reused 784`), but the install still makes one metadata (packument) request per package, for example `Request took 23805ms: https://registry.npmjs.org/react`: pnpm 11 fetches that metadata again every attempt for its supply-chain release-age check ("Verifying lockfile against supply-chain policies (2289 entries)"), and the metadata cache is not in the store.
- r8: the pnpm metadata cache moves into a second cache mount (`b154b10e2`); attempt 8 follows.
- Smoke attempts 8 (2026-10-27 07:25-08:13 CST, HEAD 14947f7ab) and 9 (2026-10-27 08:14-09:09 CST, HEAD 14947f7ab): both hit the 20m time limit (DOCKER SMOKE FAIL; PASS=1, FAIL=2). Attempt 8 had a cold metadata cache: "Lockfile passes supply-chain policies (2289 entries in 6m 37.2s)"; reused 884, downloaded 1097, added 1975 of 2075 under registry faults (ECONNRESET, ETIMEDOUT, EAI_AGAIN, error 23). Attempt 9 had warm caches: "Lockfile passes supply-chain policies (verified 42m ago)"; reused 1981, downloaded 2, added 2075. The last line before the limit was "node_modules/puppeteer postinstall: **INFO** Skipping Firefox download as instructed." The puppeteer postinstall downloads Chrome and held the build to the limit.
- r9 (xai/grok-4.7; GLM quota empty; Red was openai/gpt-6.1-sol): the base stage sets `PUPPETEER_SKIP_DOWNLOAD=true` (`7de638664`); attempt 10 follows.
- Attempt 10 (2026-10-27): the build did not run, because the disk was full.
- Smoke attempt 11 (2026-10-27 15:33-15:53 ICT, HEAD `fb3db2a9a`): the build hit the 20m time limit. COPY apps took about 8 minutes, and COPY packages took about 6 minutes. The base stage changed in `7de638664`, so every later layer rebuilt. The install reached 1610 of 2075 added (reused 1983) at the limit. The supply-chain check was fast ("verified 8h ago").
- Smoke attempt 12 (2026-10-27 15:57-16:17 ICT, HEAD `fb3db2a9a`): every COPY layer came from cache. The install added 612 of 2075 packages in 20 minutes ("Scope: all 46 workspace projects"). The machine load average was about 8.
- Attempts 11 and 12 left 15 buildah working containers each. The orchestrator removed them by hand. PM rule (2026-10-27 15:32): the smoke build uses `--force-rm`, and it removes the build containers when a build stops.
- r10 (deepseek/deepseek-flash#high; the GLM quota is empty until 00:47 ICT; openai is the Red family): the PM fix. Host pre-check: `turbo prune storytime --docker` writes a 663-entry pruned lockfile (the full lockfile has 2289 entries). `pnpm install --frozen-lockfile` accepts the pruned lockfile and writes 532 packages. The Dockerfile adds a pruner stage that copies only the Storytime closure: `apps/storytime` and `packages/config`. Commit `87497180d`.
- Smoke attempt 13 (2026-10-27 23:33-23:41 CST, 22:33-22:41 ICT; HEAD `d482d0281`; commit `87497180d`): exit 0, PASS=3, FAIL=0. The build took 8m 14s. The install took 1m 37s: 532 packages, reused 529, downloaded 0. The supply-chain check read 663 entries in 1m 33.3s. The Next.js build took 39.8s. The container answers `/th/st/2/1` with HTTP 404.
- No build container remains after attempt 13. `podman ps -a --external` lists only `reading-advantage-postgres`.
- Green gates at `87497180d`: the targeted Vitest command exits 0 with 3 files and 11 tests. The smoke exits 0 with PASS=3, FAIL=0. `phase1-quality-gates.sh` exits 0 with PASS=2, FAIL=0 (4 of 4 turbo tasks).
- r11 (deepseek/deepseek-flash#high): Review A blocker (`measure/runs/storytime_app_rebuild_20261025/review-a-9ab635f8f.json`). The Dockerfile uses the cache mount syntax of BuildKit, and the Cloud Build build step did not turn BuildKit on. The `build-image` step now sets `env: ["DOCKER_BUILDKIT=1"]` (`58fae8445`); no other line of that file changed and the Dockerfile did not change.
- r12 (coding-plan/glm-5.3-flash#high): Review B blocker (`measure/runs/storytime_app_rebuild_20261025/review-b-ba82b160a.json`). The failed-build cleanup compared only against the pre-build container list. It could remove a working container that a concurrent build made. The cleanup now proves ownership with four guards: the name ends in `-working-container`; the container is absent from the pre-build snapshot; the creation time is after the build start; and the name stem is a printed 12-hex layer ID, or a FROM base stem whose `FromImage` is a base image of this Dockerfile (`f7558395e`). The build output is teed to a temp file for the layer IDs.
- Verified on Podman 5.7.0: buildah names a working container `<base>-working-container` from the FROM ref (`node:22-alpine` gives `node-working-container`, a taken name gets `-1`). `podman ps -a --external` prints a parseable `CreatedAt`. `podman inspect` cannot see buildah working containers. The `FromImage` check is what keeps a concurrent build on `node:20` safe, because buildah normalizes both bases to the name `node-working-container`.
- r12 deviation: Green added the harness test `apps/storytime/__tests__/phase1-smoke-cleanup.test.sh` at the request of Review B. It runs the cleanup function from the new `apps/storytime/__tests__/phase1-smoke-cleanup.sh` with stub podman and buildah commands. It makes no real container. The Red tests are unchanged.
- r12 gates: the self-test exits 0 with 10 checks. `bash -n` passes on the three shell files. The Phase 1 vitest command exits 0 (3 files, 11 tests). The smoke exits 0 with PASS=3, FAIL=0, and `podman ps -a --external` shows no working container from the build. No structural TypeScript file changed, so `build-graph` needs no update.
- The local smoke proof of AC-1.4 runs under Podman 5.7.0 with buildah. It does not prove the Cloud Build path. A real Cloud Build run is Daniel's deploy gate (runbook step 3), and it is the first proof of the env line.
- Phase 1 tests at `58fae8445`: exit 0, 3 files, 11 tests (automated).
- Note for Phase 2: add one COPY line for `packages/read-along` to the pruner stage when the app depends on it. No structural TypeScript file changed in this round, so `build-graph` needs no update.

## Phase 2: Shared data contracts

- [ ] 2.1 Record the Workbooks commit that this track reads (the weeks `l2/w01` to `l2/w08`, the schema, and the phoneme bank), as handed off through the PM orchestrator.
- [ ] 2.2 Week contract in `apps/storytime/lib/contracts/`. Write Zod from Workbooks `StorytimeWeekSchema` version 1 for the fields that the app reads, and allow extra keys. A published week needs one book of each kind and a picture file on every page. `programSchema` keeps `storytime` with its test. Tests: AC-3.1, AC-3.2.
- [ ] 2.3 New package `packages/read-along`: start from a copy of Primary's `lib/read-along/` (align, position, seek, profile), `hooks/use-read-along.ts`, and `components/read-along/`. Primary keeps its own copy (spec section 9, choice 4). Add a tech-debt row for the copy. Tests move with the code.
- [ ] 2.4 Timing functions in `packages/read-along`: all sentences of a page (rule 10.3), the word at a time, and the bounds of a word cut. A cut starts 30 ms before the word and ends at its measured end (rule 10.2). Tests on a shipped two-sentence page: AC-6.1.
- [ ] 2.5 Blend function for the decodable: the taught graphemes, the tricky words, and the sound-book flag decide whether a word plays sound by sound or whole. Tests on shipped weeks: AC-7.1.
- [ ] 2.6 Receiving step `apps/storytime/scripts/receive-weeks.ts`: validate, write `apps/storytime/content/l<level>/w<nn>.json`, list the media of each week with its rule, keep `meta.status` from the source. New runbook `docs/runbooks/storytime-app-week-sync.md`. The old runbook `storytime-week-sync.md` stays until task 7.1. Tests: AC-4.1, AC-4.2.
- [ ] 2.7 Phase check: `tsc`, lint, the changed tests, and a change-quality review.

## Phase 3: At-home app

The at-home app comes before the teacher app (spec section 9, choice 2). The teacher flow uses its players, and the printed URLs have a date.

- [ ] 3.1 Entry route `apps/storytime/app/[locale]/st/[level]/[week]/page.tsx`: load, parse, published check, 404 status, `?part=`, the locale redirect, `noindex`, and no cookie. Tests: AC-2.1, AC-5.1.
- [ ] 3.2 Tiles and the home card: three tiles with pictures, recorded label audio, the Thai parent line, the three words with recorded audio, the frame, and the activity. No phone voice (rule 10.5). Messages in `th` and `en`. Test: AC-5.2.
- [ ] 3.3 Read-along UI on `packages/read-along`: the page turner, "read it to me", "my turn", the slow mode from `slowFile`, and a message when a sound fails. Tests: AC-6.1.
- [ ] 3.4 Decodable UI: the sounds page with the phoneme bank, then the blend playback from task 2.5. Tests: AC-7.1.
- [ ] 3.5 Song page: the poster, no sound before a tap, and the 9:16 phone box or the 16:9 box. The lyric lines light up with the gesture name and the line picture. Add the audio-only case. Show no karaoke tile without `song.karaoke`. Tests: AC-8.1, AC-8.2.
- [ ] 3.6 Printed-URL test (AC-2.2) and the first-load budget of 300 KB (AC-5.3).
- [ ] 3.7 Phase check: `tsc`, lint, the changed tests, a change-quality review, and a browser check on the review copy (portrait phone, landscape phone, laptop). The browser check is evidence class "automated".

## Phase 4: Teacher app

- [ ] 4.1 Teacher route group `apps/storytime/app/[locale]/teacher/` behind an environment flag that is off by default. With the flag off, every teacher route answers 404. Test: AC-9.3.
- [ ] 4.2 Week view `/<locale>/teacher/<level>/<week>`: the title, the element with its sound, the phonemic awareness skill, the tricky words, the frame, the family words with pictures, the five lessons by day, and the three materials. Test: AC-9.1.
- [ ] 4.3 Lesson flow `/<locale>/teacher/<level>/<week>/<day>`: the opening routine, then one step on each screen. A step shows the title, the minutes, the four headings, and the Easier, Harder, and Group lines. Add the review strip of the day, the Friday check on day 5, and the Thai toggle. Test: AC-9.2.
- [ ] 4.4 Media in the flow: a step with media opens the at-home player in class-screen mode (1920x1080), and the flow stays open. Test: the step keeps its place after the player closes.
- [ ] 4.5 Phase check: `tsc`, lint, the changed tests, a change-quality review, and a browser check at 1920x1080 and on a laptop (automated).

## Phase 5: Milestone week integration

- [ ] 5.1 Media list of the milestone week from the receiving step: each file, its kind, its rule, and its check. This includes the tile labels and the home words. Send the list through the PM orchestrator to Workbooks and Forge. Name Daniel's offer to do the phoneme noise step.
- [b] 5.2 Paid generation for the milestone song (new Lyria 3 Pro takes, S16), if the production side needs it. Daniel gives the go with the price. deferred:daniel
- [ ] 5.3 Stage 1 measurement scripts in `apps/storytime/scripts/checks/`. They measure loudness and true peak (rule 5.2), noise floor and clipping (rule 5.3), and the edges of each word cut (rule 10.2). They also check the size and type of each file. Each script fails a broken copy before it counts. Tests: AC-11.1, AC-6.2, AC-7.2, AC-10.1.
- [ ] 5.4 Stage 2 pre-check runner and one rubric for each kind (word cut, phoneme, song, video, picture, book audio). Calibrate on the known bad files (BA1 "Hello", `04-n.mp3`, C1W2 cut 1, the "One sun" thumbnail) and one file that Daniel passed. Name the model and its price, and log them in the cost ledger before each run. Test: AC-11.2.
- [ ] 5.5 Receive the milestone media at the handed-off commits. Run stages 1 and 2. Send each failure back through the PM orchestrator with the reason and the time in the file. Tests: AC-6.3, AC-7.3, AC-10.2.
- [ ] 5.6 Review copy on a local server on the office network with the milestone week and local media files. The agent side opens, plays, and checks every part before the page goes to Daniel (rule 6.5). Record the URL and the commit.
- [ ] 5.7 Live review page with the five items of FR-12: the teacher app (week view and one lesson day), the at-home entry page, the read-along, the decodable, and the song.

## Phase 6: Daniel's milestone judgment

- [b] 6.1 Daniel judges the five items on the review page, with the sound and touch checks on a real iPhone and a low-cost Android phone. A section without an answer is open. AC-12.1. deferred:daniel
- [ ] 6.2 Fix each finding from Daniel. Repeat stages 1 and 2 for each changed file. Put the changed items in a new page section.
- [b] 6.3 Deploy the exact passed commit to `storytime-app` with no traffic. Upload the media to the production bucket and check it file by file. Check the tagged URL. deferred:daniel
- [b] 6.4 Move the traffic to the new revision. Then run the live check of every printed URL (AC-2.3). deferred:daniel
- [ ] 6.5 Retro entry in `measure/lessons-learned.md`. Update the spec and the plan to the state at the milestone.

## Phase 7: Primary boundary and printed-URL continuity

- [b] 7.1 Remove the void Storytime code from `apps/primary-advantage` on master: `app/[locale]/st/`, `components/storytime/`, `content/storytime/`, `lib/storytime/`, `scripts/storytime/`, the host rule in `proxy.ts`, and the old runbook `docs/runbooks/storytime-week-sync.md`. This is a deletion (code fate RU2). deferred:daniel
- [ ] 7.2 After 7.1: Primary imports the player from `packages/read-along`, with no change of behavior. Run Primary's read-along tests and a browser check of articles, lesson reading, and story chapters. Remove the tech-debt row of task 2.3. The Primary deploy of this change is Daniel's gate.
- [b] 7.3 Fate of the void build branches and worktrees: `master-next`, `storytime/own-app`, `storytime/primary-cleanup`, `~/Desktop/rama-worktrees/storytime`, and `~/Desktop/rama-worktrees/storytime-qr`. First, the Monorepo orchestrator lists the commits on each branch that are not Storytime work. deferred:daniel
  - Note (2026-10-27): the records that exist only on storytime/own-app are copied to docs/generation-rules-draft2.md and docs/void-build-carryover.md (rules draft 2 with rule 6.7, decisions S31 to S34, and the uncommitted speak.ts timer fix). Removal of the worktrees and the master-next delete wait for Daniel.
- [ ] 7.4 Continuity watch: on 2026-11-15, request each printed path on the live domain. If a path does not answer with its week page, give Daniel the options. One option is the week page with only the passed parts. The deploy stays his gate.

## Phase 8: Release 1 (deferred until Daniel decides S17)

- [b] 8.1 Daniel confirms or cuts the release-1 scope (S17) after milestone 1. deferred:daniel
- [b] 8.2 Weeks 2 to 8 at the standard of the passed milestone week: media through the production side, stages 1 and 2, and Daniel's pass for each batch. Weeks 2 to 7 also wait for S26. deferred:daniel
- [b] 8.3 Karaoke cuts and the karaoke tile, if Daniel decides S28 for release 1. deferred:daniel
- [b] 8.4 Teacher access (Q1): the sign-in for the teacher app and the teacher routes on the public service. deferred:daniel
- [b] 8.5 The Phonics, Speaking, and Writing skill values (S8) with the first evidence code, if the release-1 scope has evidence. deferred:daniel
- [b] 8.6 Internal release 1 on 2026-12-01: no public date, and the deploy on Daniel's go. deferred:daniel

## Task count

Estimated tasks: 47 (Phase 1: 6, Phase 2: 7, Phase 3: 7, Phase 4: 5, Phase 5: 7, Phase 6: 5, Phase 7: 4, Phase 8: 6).
