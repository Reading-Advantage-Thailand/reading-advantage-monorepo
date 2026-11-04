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
- The demo bundle stays unchanged. It is already built and public (Daniel, 2026-11-03 11:53 ICT, through the PM).
- The void build on `master-next` and `storytime/own-app` is a reference to read. This track does not merge it.
- Graph probe: skipped at the opening, because `graph.db` is older than 24 hours (2026-10-23). The first implementation session runs `build-graph update` before Phase 2.

## Phase 1: App scaffold and service config [checkpoint: 598c876a5]

- [x] 1.1 Scaffold `apps/storytime`: Next.js App Router, `output: "standalone"`, `outputFileTracingRoot` at the monorepo root, next-intl with `th` (default) and `en` and the prefix "always", Tailwind with `@source` for each shared package, and Vitest. The at-home route answers 404 for every week until Phase 3. Test: AC-1.1. Done: `2c69dc328`. Automated: 3 files and 11 tests exit 0 at `87497180d`.
- [x] 1.2 `apps/storytime/Dockerfile` on the Primary pattern: monorepo root as the context, `pnpm turbo run build --filter=storytime`, the standalone runner on port 8080. Check that `.dockerignore` keeps the image small. Test: AC-1.4 (local image build under the heavy lock). Done: `87497180d`, cleanup fix r12 `f7558395e`, store fix r13 `ec76d7627`. Automated: the smoke exits 0 with PASS=3, and the build at `87497180d` takes 8m 14s.
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
- r13 (deepseek/deepseek-flash#high): Review B r2 blocker (`measure/runs/storytime_app_rebuild_20261025/review-b-e87978a8f.json`). In the shared default store, no property of a working container belongs to one build alone. The name, the base image, the start time, and the printed layer IDs can match a concurrent build. The smoke now owns a container store at `~/.local/share/storytime-smoke/storage`, with the runroot `/run/user/1000/storytime-smoke` (`ec76d7627`). The build, the run, and the cleanup carry `--root` and `--runroot` for that store. The cleanup removes every `*-working-container` in the smoke store, and it never reads the default store. The r12 base-stem, layer-ID, start-time, and snapshot rules are removed. The heavy lock is the first guard; the private store is the second.
- Probe facts on Podman 5.7.0: a build in a private root lists its buildah working containers in `podman --root <dir> ps -a --external`, and `--force-rm` removes them. The buildah cache mounts live in `/var/tmp/buildah-cache-1000/`, outside the store, so the pnpm store and metadata cache stay warm across stores.
- r13 deviation: Green rewrote the harness test `apps/storytime/__tests__/phase1-smoke-cleanup.test.sh` (9 checks). It adds the same-base concurrent-build case: a new `node-working-container` from node:22-alpine, with this build's layer IDs, in the default store survives. The stubs serve both stores; a call without this smoke's `--root` and `--runroot` is a violation. A mutant cleanup without the flags fails 7 of 9 checks and removes the concurrent container. The Red tests are unchanged.
- r13 build limit: the build limit is 45 minutes, because the first run against a new store pulls the base image. The pull retried 3 times on connection timeouts and then succeeded. The pnpm cache mounts were warm ("reused 529, downloaded 0"; lockfile verified 10h ago).
- r13 gates: the self-test exits 0 with 9 checks. `bash -n` passes on the three shell files. The Phase 1 vitest command exits 0 (3 files, 11 tests). The smoke exits 0 with PASS=3, FAIL=0. The default store shows only `reading-advantage-postgres`. The smoke store shows no container and no working container, and holds 978 MB. No structural TypeScript file changed, so `build-graph` needs no update.
- The local smoke proof of AC-1.4 runs under Podman 5.7.0 with buildah. It does not prove the Cloud Build path. A real Cloud Build run is Daniel's deploy gate (runbook step 3), and it is the first proof of the env line.
- Phase 1 tests at `58fae8445`: exit 0, 3 files, 11 tests (automated).
- Note for Phase 2: add one COPY line for `packages/read-along` to the pruner stage when the app depends on it. No structural TypeScript file changed in this round, so `build-graph` needs no update.
- Acceptance quality gates at `598c876a5`: `phase1-quality-gates.sh` exits 0 with PASS=2, FAIL=0, and 4 of 4 turbo tasks, none from cache. The Phase 1 vitest command exits 0 with 3 files and 11 tests. The smoke result of r13 at `ec76d7627` applies at `598c876a5` by tree identity, because `git diff --stat ec76d7627 598c876a5 -- apps/storytime` is empty.

## Phase 2: Shared data contracts [checkpoint: 01f2acfe8]

- [x] 2.1 Record the Workbooks commit that this track reads (the weeks `l2/w01` to `l2/w08`, the schema, and the phoneme bank), as handed off through the PM orchestrator. (commit `f80d3da9e`; Workbooks `ccf3d95c92bb5b3970722946dffbed1de57f9df6`)
- [x] 2.2 Week contract in `apps/storytime/lib/contracts/`. Write Zod from Workbooks `StorytimeWeekSchema` version 1 for the fields that the app reads, and allow extra keys. A published week needs one book of each kind and an image entry on every page; the owner decided on 2026-11-02 that a published week may hold a picture entry without a file, and the spec says so (`57021a9fb`; the shipped pictures come from a separate pipeline later). `programSchema` keeps `storytime` with its test. Tests: AC-3.1, AC-3.2. (commit `4acc565e8`; contract parses the eight shipped weeks, AC-3.1 green; AC-3.2 proves the image-entry rule, renamed in `27f9356a4`; round 6 `a20f58164` makes the media path an allowlist (F24), applies it to `opening.audio` (F23), requires `meta.key` to equal `st<level>/<week>` (F22), and rejects non-finite times, sentences out of order, words outside their sentence, and a page beyond the book (F25); round 7 `c32a5180e` also rejects words out of order, a sentence that starts before the sentence before it ends, and a paged book with a page that has no sentence (F30))
- [x] 2.3 New package `packages/read-along`: start from a copy of Primary's `lib/read-along/` (align, position, seek, profile), `hooks/use-read-along.ts`, and `components/read-along/`. Primary keeps its own copy (spec section 9, choice 4). Add a tech-debt row for the copy. Tests move with the code. (commits `c2690a4f8`, `5dbcd4c33`, `0754683c5`; 93 moved and adapted tests pass)
- [x] 2.4 Timing functions in `packages/read-along`: all sentences of a page (rule 10.3), the word at a time, and the bounds of a word cut. A cut starts 30 ms before the word and ends at its measured end (rule 10.2). Tests on a shipped two-sentence page: AC-6.1. (commit `c2690a4f8`; AC-6.1 green on shipped week 1)
- [x] 2.5 Blend function for the decodable: the taught graphemes, the tricky words, and the sound-book flag decide whether a word plays sound by sound or whole. Tests on shipped weeks: AC-7.1. (commit `4acc565e8`; AC-7.1 green on shipped weeks 1 and 2)
- [x] 2.6 Receiving step `apps/storytime/scripts/receive-weeks.ts`: validate, write `apps/storytime/content/l<level>/w<nn>.json`, list the media of each week with its rule, keep `meta.status` from the source. New runbook `docs/runbooks/storytime-app-week-sync.md`. The old runbook `storytime-week-sync.md` stays until task 7.1. Tests: AC-4.1, AC-4.2. (commit `d28597d87`; idempotent second run on `ccf3d95c` makes no diff; round 6 `a20f58164` validates every week before the first write, asserts the requested level and week, keeps one commit for the whole set, and rejects a junk `--weeks` token with exit 64; round 7 `c32a5180e` writes all files or none with `source.json` last and restores every original on a failed write (F29); the runbook `19d211f62` states the rules; round 8 `907211259` makes the rollback try every step and report a partial restore (F32, F41), `120eb73cb` fixes the runbook command so the operator sees the real exit code (F48); round 9 `2dec06fe0` removes only files and empty folders that the run owns (F56) and stops a run at a leftover `.tmp-` or `.orig-` file (F57), and `c923bab44` makes the recovery steps compare before any delete (F58))
- [x] 2.7 Phase check: `tsc`, lint, the changed tests, and a change-quality review. (commit `2dec06fe0`; targeted command 236/236 exit 0 at this tree; tsc exit 0; quality gates 4 of 4 turbo tasks executed with 0 cached; Phase 1 command 11/11; smoke self-test 25/25; review in the Green evidence)

### Phase 2 Red evidence

- Red started at `04a029f29d0cb21eca6b37fa1190bec15f4c9d99`. Both supplied bases resolve to this commit, and HEAD matched it.
- The Workbooks hand-off for task 2.1 has not arrived. Every test that needs a shipped week fails with the named message `Missing handed-off week: apps/storytime/content/l2/w01.json (task 2.1)`. No test skips.
- Red wrote seven test files and changed one Phase 1 test file. It created no contract, no package source, no script, no content file, and no manifest change.
- Model deviation: the role table names `openai/gpt-6.1-sol#high`. This role ran on `minimax-cn-coding-plan/MiniMax-M3#high`. The P2 Green role must not use the MiniMax family.
- Automated Red command: `bash ~/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && pnpm exec vitest run --maxWorkers=1 apps/storytime/__tests__/phase2-*.test.ts packages/read-along'`. Result: exit 1; 6 failed files, 1 passed file; 28 failed tests, 5 passed tests; 33 tests in all.
- Automated test type check: `pnpm exec tsc --noEmit --strict --skipLibCheck --esModuleInterop --module esnext --moduleResolution bundler --target es2022` over the seven new test files and `phase1-scaffold.test.ts`. Result: exit 0 under the heavy lock.
- Automated Phase 1 check: `pnpm exec vitest run --maxWorkers=1 apps/storytime/__tests__/phase1-*.test.ts`. Result: exit 0 with 3 files and 11 tests. The A4 guard of the Tailwind test passes with the shared package `@reading-advantage/config`.
- The five passing tests are guards that already hold at this commit. The `programSchema` guard reads the source of `packages/types/src/index.ts`; the package test of `packages/types/src/__tests__/program.test.ts` already proves the same guard at runtime.
- The intentionally red tests follow. Each line names the test, the cause, and the task that turns it green.

| Test | Cause | Task |
|---|---|---|
| `phase2-blend` plays every word of the sound book whole | The shipped week 1 is missing | 2.1, 2.5 |
| `phase2-blend` plays the CVC words of a later week in grapheme order | The shipped week 2 is missing | 2.1, 2.5 |
| `phase2-blend` plays every tricky word whole | The shipped week 2 is missing | 2.1, 2.5 |
| `phase2-content` records the repository, the commit, and the week files | `apps/storytime/content/source.json` is missing | 2.1 |
| `phase2-content` holds no hash in the source record | `apps/storytime/content/source.json` is missing | 2.1 |
| `phase2-content` lists the media of a shipped week by name | The shipped week 1 is missing | 2.1, 2.6 |
| `phase2-content` writes the eight shipped weeks with the status of the source | The shipped week 1 is missing | 2.1 |
| `phase2-content` keeps a draft week a draft and a published week published | `apps/storytime/scripts/receive-weeks.ts` is missing | 2.6 |
| `phase2-content` names the receiving step and the commit | `docs/runbooks/storytime-app-week-sync.md` is missing | 2.6 |
| `phase2-contract` parses every shipped week from l2/w01 to l2/w08 | The shipped week 1 is missing | 2.1, 2.2 |
| `phase2-contract` accepts a week with a key that the app does not read | The shipped week 1 is missing | 2.1, 2.2 |
| `phase2-contract` keeps the published week of the milestone | The shipped week 1 is missing | 2.1 |
| `phase2-contract` rejects a published week without a book of each kind | The shipped week 1 is missing | 2.1, 2.2 |
| `phase2-contract` rejects a published week with two read-along books | The shipped week 1 is missing | 2.1, 2.2 |
| `phase2-contract` rejects a published week with a page without a picture file | The shipped week 1 is missing | 2.1, 2.2 |
| `phase2-contract` rejects a week whose times are out of order | The shipped week 1 is missing | 2.1, 2.2 |
| `phase2-contract` rejects a week whose version is not 1 | The shipped week 1 is missing | 2.1, 2.2 |
| `phase2-shared-package` names the shared read-along package in the app manifest | The app manifest has no `@reading-advantage/read-along` | 2.3 |
| `phase2-shared-package` scans the shared read-along package in Tailwind | The app manifest has no `@reading-advantage/read-along` | 2.3 |
| `phase2-shared-package` copies the shared read-along package in the Docker pruner stage | The app manifest has no `@reading-advantage/read-along` | 2.3 |
| `phase2-shared-package` holds source files and imports nothing from an app | The shared package holds no source file | 2.3 |
| `phase2-package-copy` names the package @reading-advantage/read-along | `packages/read-along/package.json` is missing | 2.3 |
| `phase2-package-copy` holds the copied player modules | The shared package holds no copied module | 2.3 |
| `phase2-package-copy` exports the copied player functions | The shared package holds no source file | 2.3 |
| `phase2-package-copy` holds the moved Primary tests and their fixtures | The shared package holds no moved test | 2.3 |
| `phase2-timing` finds a shipped page with two sentences | The shipped week 1 is missing | 2.1 |
| `phase2-timing` seeks to each sentence of the page and lights it up | The shipped week 1 is missing | 2.1, 2.4 |
| `phase2-timing` starts 30 ms before the word and ends at its measured end | The shipped week 1 is missing | 2.1, 2.4 |

- The Green gate command is the same targeted Red command. It must exit 0 after the hand-off.
- The P2 tests read no `measure/tracks/` path (A9). They read no file outside this repository.
- The broken copies are deep clones of a shipped week made inside the test. No week fixture file exists under `__tests__/` (A7, rule 11.1).
- The media list test asserts a non-empty list and names the file, the kind, and the rule of each item (A4).
- The source record test asserts a full commit and no hash field (A15).

### Phase 2 Green evidence (partial)

- Package copy and timing implementation: `c2690a4f8666041b7acd0a9a09c87e5e42821388`. Automated: the package-copy test and the three copied core suites exit 0 with 4 files and 68 tests.
- Storytime dependency, Tailwind source, and Docker pruner wiring: `5dbcd4c33eb3c0d9370d987d86e734a4413a8082`. The targeted P2 command reports 6 passing files and 77 passing tests. Its 20 failures include 19 tests blocked by task 2.1 and the task 2.6 runbook test.
- Week-sync runbook: `c53625e0cddb5e9d02444589b2a2ab08cb3abbd7`. Automated: `phase2-content.test.ts` reports the runbook test passing; the other five tests still require the hand-off or receive script.
- The first `build-graph update` ran after the structural package edit. `graph.db` is included in the implementation commit.
- `pnpm install --prefer-offline --ignore-scripts` timed out with exit 124 after the 2700-second command limit. It updated `pnpm-lock.yaml`, which is included in the implementation commit.
- Week contract (task 2.2) and blend function (task 2.5): `4acc565e86fe77014b8fe749faa47b63b00c523d`. The contract follows Workbooks `StorytimeWeekSchema` version 1 for the fields that an app page reads: `meta`, `focus`, `opening`, `books`, `song`, `scripts`, `review`, `check`, `home`, and `tags`. Every object passes unknown keys through. A media path fails when it is absolute or holds a `..` segment. A published week needs one book of each kind and a picture on every page. A sentence or word whose end comes before its start fails with its field path. The parts that production owns (`block`, `benchmark`, `print`, `approval`, `db`) stay `unknown` until an app page reads them.
- Automated contract pre-check at `4acc565e8` (read-only, outside the repository): `apps/storytime/lib/contracts/week.ts` parses the eight Workbooks weeks `l2/w01` to `l2/w08` at Workbooks HEAD `7c34165d`. Seven broken copies of `w01` fail with a field path: no decodable, two read-along books, a page without a picture, a sentence out of order, version 2, an absolute media path, and a `..` media path. A week with an unknown key parses, and the key survives. Workbooks was not written.
- Automated targeted Red command at `4acc565e8`: exit 1; 4 failed files, 6 passed files; 19 failed tests, 78 passed tests; 97 tests total. Each of the 19 failures prints `Missing handed-off week: apps/storytime/content/l2/w01.json (task 2.1)` or the file of its own week. No other test moved. Automated type check: `pnpm --filter storytime exec tsc --noEmit` exits 0.
- Receiving step (task 2.6): `d28597d8701e39d9b97a5f830d17be2a323b9d0a`. `apps/storytime/scripts/receive-weeks.ts` reads `git show <commit>:content/storytime/l<level>/w<nn>.json`, validates each week with the contract, and writes the source text unchanged, so a second run of the same commit makes no difference. It never changes `meta.status`; the module rejects a written text whose status differs from the source. It lists every media file that the week names with its kind and the generation rule that checks it, and it refuses a path outside `apps/storytime/content`. It writes `source.json` with the repository, the full commit, and the file list, and no hash. The module starts no run on import.
- Automated receiving pre-check at `d28597d87` (read-only, no week file written): all eight Workbooks weeks at HEAD `7c34165d` pass `receiveWeek`. Each week keeps its byte-identical source text, its status, and its path. The media counts are 24, 23, 22, 18, 24, 21, 22, and 7; every item names a file, a kind, and a rule. Workbooks was not written.
- Automated targeted Red command at `d28597d87`: exit 1; 4 failed files, 6 passed files; 19 failed tests, 78 passed tests. Each failure keeps the task 2.1 message.
- Package chrome slot and restored component tests (task 2.3): `0754683c58734621c32cc42e1663e7eb3417fc46`. Round 1 deleted the two copied component tests (`5dbcd4c33`) because the copied components imported Primary app paths (`@/components/rpg/chrome`, `@/components/ui/context-menu`, `@/lib/utils`, `@/lib/audio-highlight`, `@/lib/paragraph-utils`); the tests could not load, and the deletion left the copied components with no test. Green chose a prop and slot design, so the package needs no app path and holds no Primary chrome: the player takes `labels` and `chrome` (a `Panel`, a `Sign`, and a `buttonClassName` function, with plain defaults), and the passage takes a `renderSentenceMenu` slot instead of the app context menu. The small pure helpers are package-local copies: `lib/cn.ts`, `lib/highlight.ts`, and `lib/paragraph.ts`. Primary keeps its own copy and its own tests, and no file under `apps/primary-advantage` changed.
- Automated component tests at `0754683c5`: `pnpm exec vitest run --maxWorkers=1 packages/read-along/components` exits 0 with 2 files and 25 tests. The player test proves the default labels, the supplied Thai labels, and the supplied chrome. The passage test proves the mark, the band, the taps, the keyboard stop, and the sentence menu slot.
- Automated targeted Red command at `98ff25fe4`: exit 1; 4 failed files, 8 passed files; 19 failed tests, 103 passed tests; 122 tests total. The four failed files are `phase2-blend`, `phase2-content`, `phase2-contract`, and `phase2-timing`. Each failure prints the task 2.1 message for its own week file. The week-free set stays green: the 4 package-copy tests, the 8 shared-package tests, the program test, the runbook test, the 68 moved core tests, and the 25 component tests.
- Automated Phase 1 command at `98ff25fe4`: exit 0; 3 files, 11 tests.
- Automated quality gate at `98ff25fe4`: `bash apps/storytime/__tests__/phase1-quality-gates.sh` reports PASS=1, FAIL=1. The build, the type check, and the lint tasks exit 0 (3 of 4 turbo tasks). The test task exits 1 with 3 failed files, 5 passed files, 16 failed tests, and 21 passed tests; every failure is a week test with the task 2.1 message. The gate cannot pass until the Workbooks hand-off arrives, and the phase checkpoint waits for it. The test task was not filtered to hide the failure (A7).
- `build-graph update ./graph.db` at `98ff25fe4` reads 11 files (35 to 134 nodes, 60 to 159 edges); `graph.db` is in `98ff25fe4`.

### Phase 2 Green evidence (round 4, the hand-off arrived)

- Role model deviation: the role table names `volcengine-agent-plan/glm-5.3-flash`, but that plan is on WAIT. This round ran on `coding-plan/glm-5.3-flash#high`. The Red family (MiniMax) was not used; no coder was delegated.
- Task 2.1 hand-off received: Workbooks commit `ccf3d95c92bb5b3970722946dffbed1de57f9df6` ("content(storytime): record Daniel's approval of the weeks 2 to 8 text", 2026-11-01). Read-only checks confirmed it is an ancestor of Workbooks master and that all ten handed-off paths exist at it. Workbooks was not written.
- Contract validation at the hand-off commit: the round 3 pre-check ran at Workbooks `7c34165d`, so this round re-validated all eight weeks at `ccf3d95c` with `apps/storytime/lib/contracts/week.ts`. All eight parse; `w01` is `published`, `w02` to `w08` are `draft`, matching the hand-off. No week file was changed and no contract was loosened.
- Receiving run: `pnpm --filter storytime exec tsx scripts/receive-weeks.ts --commit ccf3d95c` (task 2.6, commit `d28597d87`) wrote the eight weeks and `source.json`. All eight written files are byte-identical to `git show ccf3d95c:<path>` (verified with `diff`). `meta.status` is kept from the source. Media counts per week: 24, 23, 22, 18, 24, 21, 22, 7 (161 media entries), each with its file, kind, and generation rule. `source.json` holds the repository URL, the full commit, and the file list, and no hash (A15, test `phase2-content holds no hash in the source record`).
- Manifest decision: `content/storytime/phonemes/daniel/manifest.json` was not copied. The blend function of task 2.5 (`apps/storytime/lib/blend.ts`) reads only the week file: graphemes come from the week `tags` and `focus.element.graphemes`, tricky words from `focus.trickyWords`, the sounds page, and the tags. No Phase 2 source or test reads the phoneme index, so the copy had no consumer (strategy P2.1: copy the index only if the blend function needs it).
- No media file entered git: `apps/storytime/content/` holds only the eight week JSON files and `source.json` (strategy P2.1).
- A later Workbooks track (A-42, `storytime_teaching_loops_20261103`) will version w01 to w08 again; no field was added for it. The later pin goes through the receiving step (task 2.6).
- Content commit: `f80d3da9e` (week files and `source.json` only, staged by pathspec). `git status` before the round held only unrelated untracked files; none was staged.
- Closeout idempotence check: a second run of `receive-weeks.ts --commit ccf3d95c` on the committed tree exits 0 and `git diff --exit-code apps/storytime/content` passes. A third run would make no diff.
- P2.3 smoke-store follow-ups (owner Green) closed in commit `dbbedc1ec`, with the self-test `phase1-smoke-cleanup.test.sh` extended to 21 checks, all passing:
  - Prune step: `prune_old_image_tags` in `phase1-smoke-cleanup.sh` removes every storytime image tag of the smoke store except the current run's tag; the smoke calls it in the EXIT trap. The match strips a registry prefix (`localhost/...`) and compares by tag, so the current run's image survives under both names.
  - Store-path guard: `check_store_paths` runs at source time and refuses `SMOKE_STORE_ROOT` or `SMOKE_STORE_RUNROOT` that resolves to the default podman store path (`~/.local/share/containers/storage`, `/run/user/<uid>/containers`).
  - Lock bypass: `require_heavy_lock` refuses a direct `--locked` call that skipped `heavy-run.sh` (no `HEAVY_LOCK_HELD=1` hint); the smoke exits 64. The run mode is also recorded in `$SMOKE_STORE_ROOT/run-mode.log` and printed at run start.
- Automated targeted Red command (Green gate) after the hand-off and the smoke changes: `node_modules/.bin/vitest run --maxWorkers=1 apps/storytime/__tests__/phase2-*.test.ts packages/read-along` exits 0; 12 files, 122 tests, all passed; no skip.
- Automated Phase 1 command: exit 0; 3 files, 11 tests.
- Automated type check: `pnpm --filter storytime exec tsc --noEmit` exits 0.
- Automated quality gate: `bash apps/storytime/__tests__/phase1-quality-gates.sh` exits 0; PASS=2, FAIL=0; all 4 turbo tasks (build, check-types, lint, test) successful; the build produced the `/[locale]/st/[level]/[week]` route.
- Change-quality review (task 2.7) of the round's diff: `bash -n` clean on the three changed shell scripts; `shellcheck` is not installed on this box, so the review used the self-test plus read-through; no filter weakened (A7); no skip added; the guard and prune functions log refusals instead of failing silently; the prune stubs record every call and any call that leaves the smoke store is a test failure. Boundary note: `git diff 04a029f29..HEAD -- apps/primary-advantage` is no longer empty, but the two commits that touch that app (`724b63d66`, `7387c4876`) are parallel tracks (`primary_ux_rework_20261003`, `security_upgrade_20261026`) that landed on master; this round's changes touch no file under `apps/primary-advantage`.
- `graph.db` is untracked on master since `a24059d32` ("chore(repo): stop tracking graph.db"); `build-graph update` was skipped this round, as the orchestrator brief allows. The round's structural changes are the two shell scripts and the content files; no TypeScript source changed.
- Known open items outside Phase 2: the app tsconfig still does not extend `@reading-advantage/config/tsconfig` (owner Green in the round that touches the tsconfig; no Phase 2 round touched it), and the Cloud Build `timeout` item stays with Daniel (task 6.3). The P2.3 smoke-store follow-ups are closed above; the prune, the store-path guard, and the run-mode record now run on the next smoke execution, which needs a real podman build and stays a manual gate (the self-test covers the logic).
- Tasks 2.1 to 2.7 are `[x]` with the commit SHAs named in the task list. No task is `[b]`; nothing was deferred. Phase 2 does not move to archive here (closeout owner).

### Phase 2 Green evidence (round 5, the Review A findings)

- Owner decision F2 (Daniel, 2026-11-02 18:53 ICT, Google Tasks NlRDWElnWW84bTFKRTF4Rg): "Yes" (option A). The spec wording of FR-3 and AC-3.2 now says picture entry.
- Source: Review A FAIL at `245a09e5a` (`review-a-245a09e5a.json`). Role: `coding-plan/glm-5.3-flash#high` (no Claude and no MiniMax model used; no coder delegated).
- Test first: every fix landed behind a test that failed before the fix. Evidence of the failing runs: the three new vitest suites reported 9 failed tests (`sentencesOfPage` missing, `resolveCommit` missing, the missing-picture items absent) and the smoke self-test reported 4 failed checks (F1 real re-entry, F8 inside-default, F8 trap prune, F8 success guard) before the fixes.
- **F1 (lock guard), FIX.** The re-entry of the smoke now passes the hint: `heavy-run.sh -c "HEAVY_LOCK_HELD=1 bash '$0' --locked"` (`4ac2e814f`), so the normal run passes `require_heavy_lock` and only a direct `--locked` call stays refused. The self-test scenario F extracts the real re-entry string from the smoke script, replaces `$0` with a stub that sources the cleanup helpers and calls `require_heavy_lock`, and runs it through the real `heavy-run.sh`; it failed before the fix and passes after.
- **F2 (picture file rule), FIX** (the owner default, Option A). The contract keeps the image-entry rule; the shipped `w01` still parses. `mediaOf` now lists every page picture with an image entry and no `file` as a missing item with the book kind and page number (`missing: "page N of the <kind> book"`; the `file` field of a missing item holds the field path of the image inside the week). `WeekMedia` holds the optional `missing` field. The new `phase2-media-missing.test.ts` proves the shipped w01 missing list, a synthetic `image: {prompt}` page, and that a picture with a file stays a normal item. The AC-3.2 test is renamed to "rejects a published week with a page without an image entry" (name and message only; the assertion is unchanged). The plan no longer claims a picture-file rule or "AC-3.2 green": the spec wording waits for the owner, and `spec.md` is untouched. The receiver media count of a full run is now 273 entries (161 named files plus 112 missing page pictures of w01 to w07).
- **F3 (page timing), FIX.** `sentencesOfPage` (rule 10.3, all sentences of one page in order, a sentence without a page belongs to page 1) now lives in `packages/read-along/lib/position.ts` with JSDoc and re-exports through the package index; the timing test uses it instead of its local grouping.
- **F5 (commit id), FIX.** The receiving step resolves `--commit` with `git rev-parse --verify <commit>^{commit}` (`resolveCommit`, exported) before it reads any file, so a short commit and the full id write the same `source.json`. `phase2-receive-commit.test.ts` proves the short-to-full resolution, the unchanged full id, and the refusal of a dead reference, in its own temp git repository. Automated runs: `--commit ccf3d95c` wrote the full id into `source.json`, and a second run with the full commit left `git diff --exit-code apps/storytime/content` green.
- **F8 (prune and store guard), FIX.** The prune left the EXIT trap and runs only after a successful run (`[ "$FAILED" -eq 0 ]`), so a failed build keeps the last good tag. `check_store_paths` compares real paths (`realpath -m`) and refuses a store root or runroot that is the default podman store or lies inside it. The self-test proves both.
- Gates (all through `heavy-run.sh`): targeted command `CI=true timeout 1500 node_modules/.bin/vitest run --maxWorkers=1 apps/storytime/__tests__/phase2-*.test.ts packages/read-along` exits 0 with 14 files and 128 tests (the 6 new tests included), no skip. Phase 1 command exits 0 (3 files, 11 tests). `pnpm --filter storytime exec tsc --noEmit` exits 0. `bash apps/storytime/__tests__/phase1-quality-gates.sh` exits 0 with PASS=2, FAIL=0; all four turbo tasks executed with 0 cached (the review's cache-only concern does not reproduce on this run). `bash apps/storytime/__tests__/phase1-smoke-cleanup.test.sh` exits 0 with 25 checks, 25 pass. The real 45-minute smoke build was not run.
- Implementation commits: `4ac2e814f` (F1, F8), `27f9356a4` (F2, F5), `12c9335e2` (F3). Plan-evidence commit: this one.
- Follow-ups recorded: **F4** stays open for task 7.2 — no `exports` on `packages/read-along/package.json` while the boundary track `monorepo_boundaries_20261029` holds its baseline row. **F5b, F5c** (the receiver takes the target path from `meta.level`/`meta.week`; the AC-4.2 test does not pin the byte identity through `receiveWeek(week, {text})`) stay open for Review B. **F6** (the package boundary test should flag `@/` specifiers and app package names) and **F7** (closed enums, and the fixed `EXPECTED_STATUS` table that breaks when w02 publishes) stay open; owners are the phases that touch those files.
- No week file, no contract rule, and no Workbooks file changed. Every `[x]` task line keeps a commit SHA.


### Phase 2 Green evidence (round 6, the adversarial and Review A r2 and C findings)

- Owner decision (Daniel, 2026-11-02 18:53 ICT, "Yes"): a published week may hold a picture entry without a file; the receiving step lists it as missing. The spec says so since `57021a9fb`.
- Sources: adversarial FAIL at `57021a9fb` (F22 to F28, guard tests `aaeb55690`), Review A r2 at `f29bffcfc` (F9 to F11), Review C at `f29bffcfc` (F13 to F21). Role: `claude-code/claude-sonnet-5-5#high` (PM routing order of 2026-11-02; rounds 4 and 5 ran on GLM; Red was MiniMax; no coder delegated).
- Test first: the new tests were written before the fixes. The first run reported 17 failed tests in three files (contract hardening 7, receive guards 8, media missing 2). The F11 test passed at once, because the function was already correct; a mutation check (`filter(() => true)`) made 3 of its tests fail, and the function was restored.
- **F22 (receiver target path), FIX.** `receiveWeek` takes `expected: {level, week}` and throws when the week names another level or week; `receiveWeeks` validates every source file, refuses two files with one target path, and `receiveMain` writes the first file only after all weeks pass. The contract requires `meta.key` to equal `st<level>/<week>` (all eight shipped weeks already use this form: `st2/1` to `st2/8`). Tests: a w03 file with the meta of w01 leaves the published w01 and `source.json` byte for byte; a later week with `version: 2` leaves an empty content folder.
- **F23 (`opening.audio`), FIX.** Each item uses `mediaPath`. **F24 (`mediaPath`), FIX.** The path is an allowlist `^[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)*$`, at most 200 characters, with no `.` or `..` segment. All eight shipped weeks still parse; the test lists 19 hostile names (URL, `file:`, `data:`, NUL, newline, `./`, `.`, `a//b`, `a/`, drive, `~`, percent-encoded dots, fullwidth dots, space, long names).
- **F15 and F26 (receiver integrity), FIX.** The choice: a run at a new commit must cover every file of `source.json`; a run at the recorded commit adds its weeks to the list. A subset run at a new commit exits 64 and changes nothing. A `--weeks` token that is not a number or a rising range from 1 to 32 (`1-8,abc`, `1,,3`, `0`, `33`, `3-1`) exits 64 and writes nothing. The run output now prints the `missing:` text and reports the file count and the missing count apart.
- **F25 (contract sanity), FIX.** Times must be finite. For a published week the contract rejects a sentence that starts before the sentence before it, a word outside the time range of its sentence (slack 0.001 s), and a page beyond the page count of its book; the field paths are `startTime`, `words.<n>.start`, `words.<n>.end`, and `page`. The eight shipped weeks hold none of these (scan: maximum word deviation 0, order breaks 0, page breaks 0).
- **F27 (media map), FIX.** `mediaOf` keeps file names and missing field paths in two maps; a cover file named `books.0.pages.0.image` no longer hides the missing page picture.
- **F9 (missing list scope), FIX.** Covers, family-word pictures, and song-line pictures with an image entry and no file are missing items too (same form). The full run on `ccf3d95c` now lists 177 missing pictures: 112 page pictures, 14 covers, and 51 family-word pictures; these match the counts of Review A r2. The earlier test of the page pictures now counts the items of kind `book-page-picture`; the assertions are the same.
- **F11 (`sentencesOfPage`), FIX.** A direct unit test in `packages/read-along/lib/__tests__/position.test.ts` (page 2 only, page 1 with a sentence that has no page, an empty page).
- Gates (through `heavy-run.sh`, no OOM kill): targeted command exits 0 with 17 files and 189 tests, no skip; the 35 adversarial guard tests are unchanged and pass. Phase 1 command exits 0 (3 files, 11 tests). `pnpm --filter storytime exec tsc --noEmit` exits 0. Smoke self-test 25 of 25. `phase1-quality-gates.sh` PASS=2, FAIL=0; all four turbo tasks executed with 0 cached. The receiving step on `ccf3d95c92bb5b3970722946dffbed1de57f9df6` exits 0 and `git diff --exit-code apps/storytime/content` exits 0.
- Implementation commit: `a20f58164`. Two commit attempts failed the 100-character header rule; the third passed, and its index still held the files of the first two. So `a20f58164` holds all six files (contract, receiver, and the four test files) under the header `test(read-along): check the page sentence group directly`. No amend was allowed, so the header understates the content. Plan-evidence commit: this one.
- Follow-ups, state open and unchanged: **F4** (no `exports` on `packages/read-along` until task 7.2), **F6**, **F7 and F14** (closed enums, for the A-42 pin), **F10**, **F12** (now F22, fixed), **F13**, **F16**, **F17**, **F18**, **F19**, **F20**, **F21**, **F28**. F28 (a capitalized word plays whole; `Math.max(...)` spread on a huge tag list) goes with the Phase 3 Red brief, as the adversarial role proposed.
- No week file, no `source.json` content, and no Workbooks file changed. Every `[x]` task line keeps a commit SHA.


### Phase 2 Green evidence (round 7, the adversarial r2 and Review A r3 findings)

- Sources: adversarial r2 FAIL at `b5dec7e61` (F29 blocker, F30 Major; guard tests `23fb7352a`), Review A r3 PASS at `b5dec7e61` (its runbook note is renumbered F31; it also keeps the remaining F25 cases open). Role: `claude-code/claude-sonnet-5-5#high` (PM routing order of 2026-11-02; the reviews after this round run on a family other than Claude; no coder delegated).
- Test first: 7 new tests failed before the fixes (3 timing tests, 4 rollback tests). The end-to-end rollback test failed with an uncaught `EISDIR` from the old write loop, after weeks 1 to 4 were rewritten.
- **F29 (rollback), FIX.** `writeStaged` in `receive-weeks.ts` reads the original bytes of each target, writes each new text to a temporary name in the same folder, renames all of them with `source.json` last, and on any error puts the originals back, deletes the new files, the temporary files, and the folders it created, and throws again. `receiveMain` prints the failure and returns 1. Tests: a directory at the path of week 5 (the probe of the adversary) leaves every file and `source.json` as before; an injected rename failure on the fifth rename restores three old files and removes two new files with no temporary file left; a created folder is removed; the normal write works.
- **F30 and the remaining F25 cases, FIX.** For a published week the contract now rejects a word that starts before the word before it (book, slow reading, song; slack 0.001 s), a sentence that starts before the sentence before it ends, and a paged book with a page that has no sentence (`sentences` and `slowSentences`; the rule applies only when some sentence names a page). The eight shipped weeks still parse (scan: 0 order breaks, 0 sentence overlaps, 0 missing pages). **Not closed on purpose: word overlap.** One shipped week holds a word that overlaps the word before it by 0.04 s, so a word-overlap rule would reject shipped data. The player picks the last word whose start has passed, so start order is the rule it needs; this item stays a follow-up.
- **F31 (runbook), FIX.** `docs/runbooks/storytime-app-week-sync.md` states: validate before write, the rollback, the coverage rule at a new commit, the merge at the recorded commit, the `--weeks` syntax with defaults, the exit codes 0, 64, and 1, and the output check. The text follows ASD-STE100.
- **Noise, FIX.** `resolveCommit` runs git with a piped stderr, so `fatal: Needed a single revision` no longer reaches the test output (0 lines in a run of the receive-commit and both adversarial files). The error message of a dead reference still holds the git text; the assertion is unchanged.
- Gates (through `heavy-run.sh`, no OOM kill; the lock wait of about 600 s was a wait, not a failure): targeted command exits 0 with 18 files and 216 tests, no skip; the 35 and 19 adversarial guard tests are unchanged and pass. Phase 1 command exit 0 (3 files, 11 tests). `pnpm --filter storytime exec tsc --noEmit` exit 0. Smoke self-test 25 of 25. `phase1-quality-gates.sh` PASS=2, FAIL=0, all four turbo tasks executed with 0 cached. The receiver on `ccf3d95c92bb5b3970722946dffbed1de57f9df6` exits 0 and `git diff --exit-code apps/storytime/content` exits 0.
- Commits: `c32a5180e` (implementation) and `19d211f62` (runbook). The same defect as in round 6 happened again: the header of the first commit was 104 characters, the commit failed, and the staged files stayed in the index. So `c32a5180e` holds the contract, the receiver, and both test files under the header `fix(storytime): roll back a failed receiver write`. No amend was allowed. Plan-evidence commit: this one.
- Follow-ups, state open and unchanged: **F4**, **F6**, **F7 and F14**, **F10**, **F13**, **F16** to **F21**, **F28**, and word overlap (above).
- No week file, no `source.json` content, and no Workbooks file changed. Every `[x]` task line keeps a commit SHA.

### Phase 2 Green evidence (round 8, Review A F32, Review B F41, Review C F48)

- Sources: Review A FAIL (F32 blocker), Review B PASS (F40, F41 nits), Review C FAIL (F48 blocker; F50 to F52 nits; F49 and F53 for Phase 3), all at `599153907`. Role: `claude-code/claude-sonnet-5-5#high` (PM routing order until 2026-11-03 15:00 ICT; `ra-quota pick green` returned a bench route, so the orchestrator chose Sonnet by hand; Red was MiniMax; no coder delegated).
- Test first: 15 new or changed tests failed before the fixes (rollback faults, stage name, summary, help, runbook text). The runbook test and the rollback tests read the real files and the real function.
- **F32 and F41 (rollback), FIX.** `writeStaged` now tries every restore step and every cleanup step on its own and keeps the first error as `cause`. If an original cannot be put back, it saves a copy at `<path>.orig-<random>` (or says that no copy could be kept) and keeps the new text in place. When anything stays wrong, it throws `RollbackIncompleteError`; its message names the first error and each file, stage file, or folder that is not restored or not removed. `receiveMain` then prints `The write failed: ... not fully restored: ...` and exits 1; it says that the folder is restored only when the rollback finished. A new `StagedOps` argument (rename, write, remove) lets the tests make each step fail. Tests: a rename fault at each of 5 positions; a staging fault at each of 5 positions, with and without a half-written file; a fault during the restore (the other files are restored, the copy holds the original); a fault with no copy possible; a fault during the cleanup (the other stage files are removed, the leftover is named); a created folder is removed after an earlier cleanup fault. The two earlier rollback tests now pass the operation as `{ rename }`; their assertions are unchanged.
- **F48 (runbook command), FIX.** The runbook command is `node_modules/.bin/tsx apps/storytime/scripts/receive-weeks.ts --commit <sha>` from the repository root, and the text says not to use `pnpm --filter storytime exec`. Measured exit codes of the documented command (through `heavy-run.sh`): dead commit `0000000` gives **64**; `--level 3` at `ccf3d95c` (no source file) gives **1**; the full commit `ccf3d95c92bb5b3970722946dffbed1de57f9df6` gives **0** and `git diff --exit-code apps/storytime/content` gives 0; `--help` gives 0. The old form `pnpm --filter storytime exec tsx scripts/receive-weeks.ts --commit 0000000` gave **1**, which confirms the finding. New test `phase2-runbook.test.ts` checks the command text (the Red test `phase2-content.test.ts` is unchanged).
- Nits, each decided: **F40 FIX** (stage name `<path>.tmp-<12 hex digits>`, written with the `wx` flag; a file that appears at that name first is not written through and not deleted; tests for both). **F50 FIX** (the last line prints `record 8 weeks; this run 4 weeks, ...`). **F51 FIX** (the runbook says that only a missing page picture hides the week, spec FR-5). **F52 FIX** (`--help` prints the arguments and the exit codes and exits 0; the runbook lists it). Reason for all four: each is a few lines, each has a test, and none changes a contract rule.
- Gates (through `heavy-run.sh`, no OOM kill; lock waits of about 600 s were waits): targeted command exits 0 with 19 files and 229 tests, no skip; the 35 and 19 adversarial guard tests are unchanged and pass. Phase 1 command exit 0 (3 files, 11 tests). `pnpm --filter storytime exec tsc --noEmit` exit 0. Smoke self-test 25 of 25. `phase1-quality-gates.sh` PASS=2, FAIL=0, 4 of 4 turbo tasks executed with 0 cached. The receiver on `ccf3d95c92bb5b3970722946dffbed1de57f9df6` exits 0 and `git diff --exit-code apps/storytime/content` exits 0. No `.tmp-` or `.orig-` file stays in the content folder.
- Commits: `907211259` (receiver and its tests; two files) and `120eb73cb` (runbook and its test; two files). Each commit was a separate command and `git log -1 --stat` showed only its own files. Plan-evidence commit: this one.
- Follow-ups: **F49** goes to Phase 3 task 3.3 with the A-42 pin (a new book page fails the rule that every page has a sentence in the audio timings; decide a contract rule or a slow-reading sentence). **F53** goes to Phase 3 task 3.1 and AC-5.4 (put the readiness rule for a missing page picture in `apps/storytime/lib` and let the receiver use it). Open and unchanged: F4, F6, F7 and F14, F10, F13, F16 to F21, F28, and word overlap (a shipped week holds a 0.04 s overlap).
- No week file and no `source.json` content changed. Every `[x]` task line keeps a commit SHA.

### Phase 2 Green evidence (round 9, Review A r5 F56 to F58, F71, F72; Review B r4 and Review C r3 passed)

- Sources: Review A r5 FAIL at `dfbe8c0b3` (F56 and F58 blockers, F57 Major, F70 to F72 nits; it closed F32 and F41). Review B r4 PASS (closed F40 and F41). Review C r3 PASS (closed F48 and F50 to F52). Role: `claude-code/claude-sonnet-5-5#high` (PM routing order; Red was MiniMax; no coder delegated).
- Test first: 8 new or changed tests failed before the fixes (3 cleanup, 1 help, 2 leftover scan, 2 runbook).
- **F56 (foreign file), FIX.** `writeStaged` records each folder that its own `mkdirSync` created (the returned first folder and every folder below it). The cleanup removes the stage files and the written targets that the run owns, then removes each created folder with `rmdir`, deepest first. A folder that still holds another entry stays and is named in the `RollbackIncompleteError`. The foreign file survives. `StagedOps.remove` lost its `recursive` flag; the new `removeFolder` operation is `rmdirSync`. Tests: a foreign file at the stage name inside a new folder survives and its folder is named; a file that appears in a created folder during the run survives and the run's own files go; a created chain that holds only the run's files is removed. One earlier test (`removes a created folder even when an earlier cleanup step fails`) asserted the old recursive removal. It now asserts the safe behavior (a folder that holds a stage file that could not be removed stays and is named); the F32 assertions are unchanged.
- **F57 (leftover files), FIX.** `findLeftovers` lists each file whose name ends in `.tmp-<id>` or `.orig-<id>` in the content folder. `receiveMain` runs it right after the option check and before any read or write. A leftover stops the run with exit 1 and prints each exact path and the runbook section. The decision: stop, not warn. A `.orig-` copy can hold the only bytes of an original, and a warning in a long output is easy to miss. The reason is in runbook rule 6. Test: planted `.orig-` and `.tmp-` files give exit 1, the paths in the message, and no change; after the files are removed the run exits 0.
- **F58 and F72 (recovery recipe), FIX.** The runbook no longer runs `git restore` and then deletes the copies. The steps now are: delete nothing at first; compare each `.orig-` copy with its target and with Git (`git diff --no-index`, `git diff -- <target>`); decide for each target (copy the original back, or use the committed file); delete the copy and the `.tmp-` files only after that decision; a clean `git status` does not prove recovery. Tests check these words in the runbook.
- **F71 (help text), FIX.** `--help` now says that the receiver records the full commit, that code 1 leaves the folder restored unless the message says it is not fully restored, and that a leftover file stops a run.
- **F70 (`tsx` devDependency), DECLINE.** `tsx` is in neither `package.json` of the root nor of `apps/storytime`; the root binary `node_modules/.bin/tsx` exists through another workspace package. A fix edits `pnpm-lock.yaml` on shared master and needs `pnpm install` on a 7 GB box with other jobs. The runbook uses the root binary, and the measured exit codes show that it works. Phase 3 adds the first manifest change; add the devDependency there.
- Gates (through `heavy-run.sh`, no OOM kill): targeted command exits 0 with 19 files and 236 tests, no skip; the 35 and 19 adversarial guard tests are unchanged and pass. Phase 1 command exit 0 (3 files, 11 tests). `tsc --noEmit` exit 0. Smoke self-test 25 of 25. `phase1-quality-gates.sh` PASS=2, FAIL=0, 4 of 4 turbo tasks executed with 0 cached. Documented command exit codes: dead commit 64, `--level 3` 1, full commit `ccf3d95c92bb5b3970722946dffbed1de57f9df6` 0 (`git diff --exit-code apps/storytime/content` 0), `--help` 0. No `.tmp-` or `.orig-` file stays in the content folder.
- Commits: `2dec06fe0` (receiver and its tests; two files), `c923bab44` (runbook and its test; two files). Each commit was a separate command and `git log -1 --stat` showed only its own files. Plan-evidence commit: this one.
- Follow-ups: F49 (Phase 3 task 3.3 with the A-42 pin), F53 (Phase 3 task 3.1 and AC-5.4), F70 (Phase 3, first manifest change). Open and unchanged: F4, F6, F7 and F14, F10, F13, F16 to F21, F28, word overlap.
- No week file and no `source.json` content changed. Every `[x]` task line keeps a commit SHA.

## Phase 3: At-home app

Amendment A-42 (2026-11-03): tasks 3.8, 3.9, 3.10, and 4.6 come from FR-13. The 11-20 release proof is a print proof (PM decision, 2026-11-03, spec FR-13), so the app does not show the loops on 2026-11-20. Task 3.8 closes at the draft pin and stays in Phase 3 with the F99 rule. Task 3.10 follows task 3.8 and receives the approved weeks (PM decision, 2026-11-03). The latest date for both tasks is 2026-11-19.

Exception to the phase-order rule of line 11 for tasks 3.9, 3.10, and 4.6: these three tasks do not hold the Phase 3 and Phase 4 checkpoints. Task 3.10 has the dates 2026-11-17 to 2026-11-19. Tasks 3.9 and 4.6 are done before the Storytime release 1 delivery of 2026-12-01 (internal). Each of the three tasks runs after its phase checkpoint, with its own phase check. The Phase 3 test strategy must give each of them a date.

Amendment M-1 (2026-11-03, media approval gate): the PM decision of 2026-11-03 19:40 ICT adds the media approval rule and AC-5.5 to spec FR-5. Task 3.1a holds the work, in the task 3.1 chain.

Amendment R-1 (2026-11-03, at-home release): the at-home deploy moves out of task 6.3 and into task 3.11 at the end of Phase 3. Task 3.11 follows the Phase 3 acceptance, with target 2026-11-20. Task 6.3 keeps the teacher-app deploy. No task number changes.

The at-home app comes before the teacher app (spec section 9, choice 2). The teacher flow uses its players, and the printed URLs have a date.

- [x] 3.1 Entry route `apps/storytime/app/[locale]/st/[level]/[week]/page.tsx`: load, parse, published check, 404 status, `?part=`, the locale redirect, `noindex`, and no cookie. A published week with a book page picture without a file answers 404, like a week that is not published (Daniel 2026-11-02, spec FR-5). Tests: AC-2.1, AC-5.1, AC-5.4. Done: `0c42dde7a`. Automated: the targeted command exits 0 with 5 files and 17 tests; `tsc --noEmit` exits 0; `phase3-redirect-check.sh` exits 0 with PASS=6, FAIL=0.

### Phase 3 task 3.1 Red evidence

- Mid-Red started at `7db52a49d20e195388fd91670cc7c022312b50c5`; both supplied base SHAs resolve, and HEAD matched `phase_base_sha`.
- The test command exited 1 with 4 failed files, 9 failed tests, and 8 passed tests (17 total). All 9 failures are assertions. No import or runtime errors occurred.
- Failed assertions identify the absent Phase 3 route behavior, readiness module and receiver hookup, manifest tooling, and locale redirect.
- The readiness tests inspect shipped w01 and a deep in-memory clone. The mock does not decide readiness. No content file changed.
- Model: `openai/gpt-6-luna` (Red).
- The commit records the Red tests and plan evidence. Green must use a different model family.

### Phase 3 task 3.1 Green evidence

- Implementation `0c42dde7a`. Role `measure-jr-green` on `opencode-go/deepseek-v4.1-flash`; Red ran on `openai/gpt-6-luna`. No coder was delegated. The Red tests did not change.
- The rerun of the Red command at `3b182491c` exited 1 with 4 failed files and 9 failed assertions, as the Red log states.
- Automated at `0c42dde7a`: the targeted command exits 0 with 5 files and 17 tests. `tsc --noEmit` in `apps/storytime` exits 0. ESLint exits 0 on the six changed sources. `bash apps/storytime/__tests__/phase3-redirect-check.sh` exits 0 with PASS=6, FAIL=0.
- The live check on the dev server: shipped w01 answers 404 and the log holds `st2/1 blocked: missing_picture`; a ready clone answers 200 with `noindex` and no `Set-Cookie`; `?part=song` opens the song part; an unknown part opens the home view; `01` and level `9` answer 404.
- Redirect `Location` values: plain path `307 /th/st/2/1`; root `307 /th`; forged `Host` `307 /th/st/2/1`; forged `X-Forwarded-Host` `307 /th/st/2/1`; `//` path `308 /st/2/1`. Each value is relative, so no probe leaves the origin.
- Falsification: a stub that answers `Location: https://evil.example/th/st/2/1` makes `phase3-redirect-check.sh` exit 1 with FAIL=5. The check can fail.
- F53: `lib/readiness.ts` holds `isWeekReady`, and `scripts/receive-weeks.ts` imports it for its missing list and its readiness line. F70: the manifest declares `tsx`, `@playwright/test`, `jsdom`, and the three `@testing-library` packages at `catalog:`; `pnpm-lock.yaml` adds the six entries to the `apps/storytime` importer, and one `deprecated:` line on `@smithy/core@3.25.1` with no version change.
- `apps/storytime/AGENTS.md` holds the agent block that `next dev` writes; the other apps commit theirs.
- The full Storytime and `packages/read-along` suite ran once at this tree before the final manifest change: 26 files and 272 tests exit 0. The PM rule of 2026-11-03 then limits a small change to its own files. The phase-end run covers the full suite.
- No structural TypeScript file changed after `build-graph update`, which ran at the pre-commit tree (6 files, 24 to 89 nodes). `graph.db` is ignored and not committed.
- [x] 3.1a Media approval gate: the media approval rule of spec FR-5 and AC-5.5. A published week is ready only when `approval.images.status`, `approval.audio.status`, and `approval.song.status` are each `approved`. An absent key counts as draft, as `approval.loops` does. Otherwise the route answers 404, as it answers for a draft week. The log names each part that is not approved. The server-side switch `STORYTIME_SHOW_DRAFT_MEDIA` (value `1`) shows the draft parts on the review copy. Production never sets it, and it is never a `NEXT_PUBLIC_` variable. The switch never makes an unpublished week ready. It never makes a week with a missing picture ready. The receiver never changes `approval` (rule 12.1). Tests: AC-5.5. Done: `bbe7ff741`. Automated: the targeted command exits 0 with 5 files and 51 tests; `tsc --noEmit` exits 0; ESLint exits 0 on the three changed files. Target: 2026-11-06.

### Phase 3 media approval gate Red evidence

- Red scope base: `7db52a49d20e195388fd91670cc7c022312b50c5`. Role base: `6eff05606e14c649d68fda0f261603593824afa9`. HEAD matched the role base before edits. The supplied bases resolve.
- The tree held unrelated untracked work before edits. It remains unstaged and unchanged. No generated or track-related dirty path was present.
- Test commit: `c987947d806d1ab8adf410f0f5e4ef3e0c752b34` (`test(storytime): add red media approval gate tests`). The requested commit header exceeded the 100-character limit by one character, so the header was shortened.
- Automated targeted Red command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && HEAVY_PREFLIGHT_WAIT_S=3600 ./node_modules/.bin/vitest run --maxWorkers=1 apps/storytime/__tests__/phase3-media-gate.test.ts'`. Result: exit 1; 1 failed file; 6 failed tests and 3 passed tests (9 total). The failures are assertion failures, not import or syntax errors.
- The three part-specific draft cases, the absent-part case, switch draft visibility, and server-side switch-name assertion fail. The all-approved case, unpublished/missing-picture safeguards, and deploy-file assertion pass. The deploy-file assertion passes because the app Dockerfile and Cloud Build file do not set `STORYTIME_SHOW_DRAFT_MEDIA`.
- Red test and provisional report: `apps/storytime/__tests__/phase3-media-gate.test.ts`, `measure/runs/storytime_app_rebuild_20261025/red-6eff056.log`. The plan evidence and final report are committed separately.

### Phase 3 media approval gate Red retry evidence

- Retry started at HEAD `9c9667917cc3449270d0c4f1d25fc647ac94aeb1`. The immutable phase base remains `7db52a49d20e195388fd91670cc7c022312b50c5`; the supplied role base remains `6eff05606e14c649d68fda0f261603593824afa9`.
- Updated `phase3-readiness.test.ts` fixtures that expect readiness to approve images, audio, and song. The missing-picture case now starts from a complete picture clone, then removes one picture file. Added a published, fully pictured clone with draft audio; readiness rejects it.
- Inspected the Phase 3 entry-route tests and searched the Storytime test tree for readiness and status assertions. No other ready-week or HTTP 200 fixture needed an approval change. `phase3-media-gate.test.ts` already matches the spec and was not changed.
- Required targeted Red command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && HEAVY_PREFLIGHT_WAIT_S=3600 ./node_modules/.bin/vitest run --maxWorkers=1 apps/storytime/__tests__/phase3-readiness.test.ts apps/storytime/__tests__/phase3-entry-route.test.ts apps/storytime/__tests__/phase3-media-gate.test.ts'`. Result: exit 1; 2 failed files, 1 passed file; 7 failed tests and 10 passed tests (17 total). The readiness and entry-route files pass except the new draft-audio assertion. All six media-gate failures remain. Failures are assertion-only.
- Test commit: `c9b4230b3` (`test(storytime): approve media in ready-week fixtures`). The plan evidence and retry report follow in a separate commit.
- Retry report: `measure/runs/storytime_app_rebuild_20261025/red-9c96679.log`. No production source changed.
  - PM decision 2026-11-03: in the task 3.1 chain (spec line, Red test, Green); it must not move task 3.1 (2026-11-06) or the at-home release (2026-11-20).

### Phase 3 media approval gate Green evidence

- Implementation `bbe7ff741`. Role `measure-jr-green` on `opencode-go/deepseek-v4.1-flash`; Red ran on `openai/gpt-6-luna`. No coder was delegated. No committed test changed.
- The first Green run blocked, because `phase3-readiness.test.ts` expected a draft-audio clone to be ready. The Mid Red retry `c9b4230b3` approved the ready-week fixtures and added a draft-audio case. Green then implemented the shared rule in one pass.
- `lib/readiness.ts` adds `mediaPartsNotApproved` and the `media_not_approved` blocker. An absent part, or a part with no status text, counts as draft. The rule reads the three parts in the order images, audio, song, and changes no field.
- `lib/content.ts` logs `media_not_approved` with each part that is not approved. `showDraftMedia` reads `STORYTIME_SHOW_DRAFT_MEDIA` and shows a draft-media week only when the value is exactly `1`. The value is server-side and never `NEXT_PUBLIC_`. The switch does not open an unpublished week and does not open a week with a missing picture.
- The receiver keeps `isWeekReady` and changes no `approval` field. For shipped w01 it reports not ready, names the parts audio and song, and adds `content/l2/w01.json` to `Not ready for the at-home app`.
- Automated at `bbe7ff741`: the targeted command exits 0 with 5 files and 51 tests. `tsc --noEmit` in `apps/storytime` exits 0. ESLint exits 0 on `lib/readiness.ts`, `lib/content.ts`, and `scripts/receive-weeks.ts`. The deploy-file assertion passes, so no deploy file sets the switch.
- `build-graph update` ran at the pre-commit tree: 3 files, 65 to 73 nodes, 67 to 74 edges. `graph.db` is ignored and not committed.
- Report: `measure/runs/storytime_app_rebuild_20261025/green-f70b280.log`.
- [x] 3.2 Tiles and the home card: three tiles with pictures, recorded label audio, the Thai parent line, the three words with recorded audio, the frame, and the activity. No phone voice (rule 10.5). Messages in `th` and `en`. The Thai text uses the Sarabun font (Daniel, 2026-11-03 11:53 ICT, through the PM). Test: AC-5.2. Done: `d8cdd026c`. Automated: the Green command exits 0 with 5 files and 26 tests; `tsc --noEmit` in `apps/storytime` exits 0; ESLint exits 0 on the two changed TypeScript files. The measured browser part of AC-5.2 stays with the browser gate of task 3.7, because jsdom does not decide layout. Target: 2026-11-10.
  - Workbooks answers (Q13 to Q15, through the PM, 2026-11-03): the picture alt text is `image.caption`. The audio fields are `focus.element.audio`, `StripCard.audio`, and `words[].audio`. The word tiles have no audio.

### Phase 3 task 3.2 Red evidence

- Mid-Red started at `7db52a49d20e195388fd91670cc7c022312b50c5`; role base was `cc0407b932ce83714f5a7784e796464c7e33e478`. Both supplied commits resolve, and HEAD matched the role base before edits.
- The Red command exited 1: 2 failed files, 9 failed assertions, and 0 passed tests. All failures are assertions; no syntax, import, or runtime error occurred.
- The home-card checks fail because the route has no tile pictures or captions, audio controls, home data, conditional karaoke, 64 px target classes, Thai text language, or Sarabun styling. The message checks fail because both locale message files are empty.
- Red test commit: `704ff5957` (`test(storytime): add red tests for tiles and home card (track_id: storytime_app_rebuild_20261025)`). Tests read shipped `w01.json`; no week fixture was added. The route test names its implemented behavior contract, and the messages test checks locale key parity and non-empty Thai strings.
- Automated command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && HEAVY_PREFLIGHT_WAIT_S=3600 ./node_modules/.bin/vitest run --maxWorkers=1 apps/storytime/__tests__/phase3-home-card.test.tsx apps/storytime/__tests__/phase3-messages.test.ts'`.
- Report: `measure/runs/storytime_app_rebuild_20261025/red-cc0407b.log`.

### Phase 3 task 3.2 Green evidence

- Green started at `11f2462f4d4100ceecd532d7e2fb8b04da1406b8`; the immutable phase base is `7db52a49d20e195388fd91670cc7c022312b50c5`. The Red commits `704ff5957` and `11f2462f4` are inside the phase range, and HEAD matched the role base before edits. No coder was delegated.
- Red confirmation: the targeted command exits 1 with 2 failed files and 9 failed tests. All failures are assertions, and 0 tests passed.
- Implementation commit: `d8cdd026c` (`feat(storytime): add the tiles and the home card`). Files: `app/[locale]/st/[level]/[week]/page.tsx`, `app/[locale]/layout.tsx`, `app/globals.css`, `messages/en.json`, and `messages/th.json`.
- Home view: the three tiles are read-along, decodable, and song. Each tile has a picture whose `alt` is `image.caption`. The song tile uses the poster, the phone poster, or the first song-line picture. A fourth karaoke tile shows only when `song.karaoke` exists.
- Recorded audio only. A tile label plays from the app naming table `TILE_LABEL_AUDIO` (finding F17). A home word plays from `HOME_WORD_AUDIO`. The sound-of-the-week speaker plays `focus.element.audio`. Each table is empty until production delivers the files, so a missing recording hides the speaker control. The page never calls `speechSynthesis` and holds no `home.words` audio field.
- Home card: `home.line.th` shows as Thai text and is omitted when empty. `home.words` shows as text with `lang="en"`. `focus.frame` shows with `lang="en"`. `home.activity` shows in the page language. Thai text carries `lang="th"`.
- The shipped `home.words` are strings and the contract holds no word audio field. The words therefore show text only; a word speaker appears only when the F17 naming table gains a recording. This keeps the Red rule that forbids inventing `home.words[].audio`.
- The tiles hold `min-h-16`, and the speaker controls hold `min-h-16 min-w-16` (64 px). The measured proof of AC-5.2 in portrait and landscape stays with the browser gate of task 3.7 (test strategy P3.6).
- Sarabun loads through `next/font/google` in the locale layout. next/font self-hosts the font, so the browser makes no request to a font provider, and the app adds no dependency. `app/globals.css` sets `--font-sans` from `--font-sarabun`.
- Messages: ten flat keys in `en.json` and `th.json`, with non-empty Thai values. Flat keys keep the Red message test able to read string values, and next-intl resolves the same keys.
- Gates, all through `heavy-run.sh`:
  - Green command: exit 0; 5 files; 26 tests; no skip.
  - `tsc --noEmit` in `apps/storytime`: exit 0.
  - ESLint on `page.tsx` and `layout.tsx`: exit 0.
  - `build-graph update`: 2 files, 20 to 41 nodes, 27 to 51 edges. `graph.db` stays ignored and is not committed.
- No committed Red test changed. No week content, contract, readiness, receiver, deploy, or Docker file changed.
- Report: `measure/runs/storytime_app_rebuild_20261025/green-11f2462.log`.
- [x] 3.3 Read-along UI on `packages/read-along`: the page turner, "read it to me", "my turn", the slow mode from `slowFile`, and a message when a sound fails. Tests: AC-6.1. Done: `654e09add`. Automated: the Green command exits 0 with 10 files and 124 tests; `tsc --noEmit` in `apps/storytime` and in `packages/read-along` exits 0; ESLint exits 0 on the four changed TypeScript files.

### Phase 3 task 3.3 Red evidence

- Retry started at Green HEAD `c9e2b25a00b396e3d0c519b995640bbb91f469d2`. Immutable phase base `7db52a49d20e195388fd91670cc7c022312b50c5` and role base `a9132167a0d741b32798b033000ded91d3c5924b` resolve.
- Pre-edit status held unrelated untracked user paths. I preserved them and did not stage them.
- The retry follows the orchestrator decisions: sentence remains one tab stop; arrows move focus to words with `tabindex="-1"`; Enter and Space activate a word. The server page stays thin and the client reader path is `apps/storytime/app/[locale]/st/[level]/[week]/reader.tsx`.
- Tests cover AC-6.1, My turn, slow mode, localized load failure, page turns and end, page-end audio, the shipped overlap, package accessibility, and package specifiers.
- The first shipped page with two timed sentences is in w02. The test scans shipped weeks and uses that page. It does not add or change a content fixture.
- Final targeted command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && HEAVY_PREFLIGHT_WAIT_S=3600 ./node_modules/.bin/vitest run --maxWorkers=1 apps/storytime/__tests__/phase3-readalong-ui.test.tsx packages/read-along/components/read-along/__tests__/phase3-a11y.test.tsx packages/read-along/components/read-along/__tests__/read-along-passage.test.tsx'`.
- Final result: exit 1; 2 failed files; 11 failed tests; 17 passed tests. Failures are test assertions. The existing `read-along-passage.test.tsx` passes all 16 tests.
- The overlap assertion passes: it finds the shipped 0.04-second overlap and checks for exactly one marked word. The app reader tests fail because the client reader does not exist yet; the server-page assertion fails because the route does not render it. Package assertions identify missing sentence ARIA, keyboard word access, and unique control IDs.
- Test files: `apps/storytime/__tests__/phase3-readalong-ui.test.tsx`; `packages/read-along/components/read-along/__tests__/phase3-a11y.test.tsx`. The run report is `measure/runs/storytime_app_rebuild_20261025/red-a913216.log`.
- Retry test commit: `f65c56efa42ddd591aab2f22622cc77428a35a1f` (`test(storytime): retarget read-along red tests (track_id: storytime_app_rebuild_20261025)`).
- Plan and report evidence are committed with this retry report.

### Phase 3 task 3.3 Red follow-up

- Follow-up started at Green HEAD `b6e9bb312c85e024fe10899a0cdeabc51b335b68`. The phase base and Red role base remain `7db52a49d20e195388fd91670cc7c022312b50c5` and `a9132167a0d741b32798b033000ded91d3c5924b`.
- The My turn test now renders the shipped source returned by `shippedTwoSentencePage()` and taps its first sentence word. This keeps the rendered week and timing data aligned.
- I checked each other Red test for a source mismatch. The two-sentence test uses its returned source; slow mode, errors, page turns, and page-end tests use w01 data with w01; overlap and package tests render their own timing data.
- Required command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && HEAVY_PREFLIGHT_WAIT_S=3600 ./node_modules/.bin/vitest run --maxWorkers=1 apps/storytime/__tests__/phase3-readalong-ui.test.tsx packages/read-along/components/read-along/__tests__/phase3-a11y.test.tsx'`.
- Result: exit 1; 2 failed files; 11 failed tests; 1 passed test. Failures are assertions. The overlap check passes. The remaining failures concern the missing reader, route integration, passage accessibility, and duplicate player IDs.
- Test commit: `530b539eeabf9c788612c530ca23783541d06447` (`test(storytime): render the source of the my turn word (track_id: storytime_app_rebuild_20261025)`).
- Plan and Red report evidence are committed together for this follow-up.

### Phase 3 task 3.3 Green block

- Green started at role base `c27beea26`. The targeted Red command exits 1 with 2 failed files and 11 failed tests, as Red recorded.
- Block 1: the Red keyboard test needs `tabindex="0"` on a word span. The committed package test `read-along-passage.test.tsx` asserts exactly one `[tabindex='0']` element (the sentence) for the same props. Both tests cannot pass. Green may not edit a committed Red test, and the task requires every existing package test to pass.
- Block 2: the Red route test reads `app/[locale]/st/[level]/[week]/page.tsx` and requires client-only code there: `play()`, `onError`, `playbackRate = 1`, and `touchStart`. That file is the server gate with `generateMetadata`, `force-dynamic`, and `notFound()`. The committed tests `phase3-entry-route.test.ts` and `phase3-home-card.test.tsx` also read that file for the server markers. One App Router page file cannot hold both.
- Green requests a Mid Red retry. The report is `measure/runs/storytime_app_rebuild_20261025/green-c27beea.log`. Task 3.3 stays `[~]`. No production file changed. No implementation commit exists.
- Retry Red fixed both blocks at `f65c56efa` and `6a4e32277`.

### Phase 3 task 3.3 Green block 2

- Green restarted at role base `6a4e32277`. The targeted Red command exits 1 with 2 failed files, 11 failed tests, and 1 passed test (the overlap check).
- Block: the test "keeps My turn silent until a word tap and plays the measured word cut" renders the default w01 book and taps the first word of `shippedTwoSentencePage()`. That helper returns w02 page 1 ("How many suns?"), because every w01 page has one sentence. The word is "How". The w01 reader shows "Hello, I am Pat." and has no "How" element, so `getByText` throws.
- The other Red assertions are implementable. The reader must render the same source as the word lookup. Fix: `const { source, sentences } = shippedTwoSentencePage(); const { audio } = await renderReader(source);`.
- Green requests a small Mid Red fix. The report is `measure/runs/storytime_app_rebuild_20261025/green-6a4e322.log`. Task 3.3 stays `[~]`. No production file changed.
- Retry Red fixed the My turn source at `530b539ee` and `48a17c21b`.

### Phase 3 task 3.3 Green block 3

- Green ran at role base `48a17c21b`. The implementation is complete and uncommitted.
- The Red command exits 0 with 12 tests. The required Green command exits 0 with 10 files and 124 tests. `tsc --noEmit` in `packages/read-along` exits 0, and ESLint exits 0 on the four changed TypeScript files.
- Block: `tsc --noEmit` in `apps/storytime` exits 2 on the committed Red test. Line 38 of `phase3-readalong-ui.test.tsx` assigns `{ status: "approved" }` to `approval.images`, whose JSON type also needs `date`, `words`, and `source` (TS2739).
- Fix: `copy.approval.images = { ...copy.approval.images, status: "approved" };`.
- Report: `measure/runs/storytime_app_rebuild_20261025/green-48a17c2.log`. Task 3.3 stays `[~]`. No implementation commit exists yet.
- Red applied the three approval spreads and committed them as `8c80e72f51f3911de498b4f8cc8d887cb953be8f` (`test(storytime): preserve approval fields (track_id: storytime_app_rebuild_20261025)`). The requested longer subject exceeded the 100-character commit limit, so commitlint rejected it.
- Required app type check ran once through `heavy-run.sh`: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/storytime && HEAVY_PREFLIGHT_WAIT_S=3600 ../../node_modules/.bin/tsc --noEmit'`. Exit 0; no errors in either Red test file and no other errors were emitted. No Vitest command ran.
- The Red type-fix report and plan evidence are committed together in the follow-up evidence commit.

### Phase 3 task 3.3 Green evidence

- Implementation commit: `654e09add` (`feat(storytime): add the read-along ui`). Files: `packages/read-along/components/read-along/read-along-passage.tsx`, `packages/read-along/components/read-along/read-along-player.tsx`, `apps/storytime/app/[locale]/st/[level]/[week]/reader.tsx` (new), `apps/storytime/app/[locale]/st/[level]/[week]/page.tsx`, `apps/storytime/messages/en.json`, and `apps/storytime/messages/th.json`.
- Package accessibility: `aria-current` on the current sentence and the marked word; `data-word`; one sentence tab stop; words at `tabindex="-1"` with Left and Right arrow focus and Enter or Space tap. The duplicate `playPauseButton` id is removed.
- Reader: the page turner with buttons and a horizontal swipe, "read it to me", "my turn", the slow recording from `slowFile` at playback rate 1, the word cut from 30 ms before the start to its measured end, the page-end stop, the end view, the page picture, and the localized audio error in `th` and `en`.
- Route: `page.tsx` stays the server gate and renders `StorytimeReader` for `part === "book"`. The task 3.2 tiles, the home card, and the task 3.1a media gate are unchanged.
- Messages: seven flat player keys with equal, non-empty Thai and English values.
- Gates on this implementation:
  - Targeted Red command: exit 0; 2 files; 12 tests.
  - Green command: exit 0; 10 files; 124 tests. This includes the unchanged `read-along-passage.test.tsx` one-tab-stop test.
  - `tsc --noEmit` in `packages/read-along`: exit 0.
  - ESLint on the four changed TypeScript files: exit 0.
  - `tsc --noEmit` in `apps/storytime` at HEAD `ad8b13d84`: exit 0.
- No committed Red test changed. No week content, contract, readiness, receiver, deploy, or Docker file changed.
- Report: `measure/runs/storytime_app_rebuild_20261025/green-ad8b13d.log`.

### Phase 3 task 3.4 Red evidence

- Red started at role base `28014a3295654a312de31d88e71ad64a698115a6`. The phase base is `7db52a49d20e195388fd91670cc7c022312b50c5`.
- Red added the two strategy test files only. It changed no production source or week content.
- Targeted command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && HEAVY_PREFLIGHT_WAIT_S=3600 ./node_modules/.bin/vitest run --maxWorkers=1 apps/storytime/__tests__/phase3-decodable-ui.test.tsx apps/storytime/__tests__/phase3-phoneme-bank.test.ts && cd apps/storytime && ../../node_modules/.bin/tsc --noEmit'`.
- Vitest exited 1: 2 files, 7 tests; 7 failed and 0 passed. Failures are assertions: the decodable UI module is missing (4 checks), the phoneme-bank module is missing (2 checks), and the 200,000-entry grapheme case throws `RangeError` (1 check). The `tsc` segment did not run because Vitest failed.
- The failed checks cover the sounds page and tap, whole-word sound-book and tricky-word playback, CVC clip order, capital-word playback, the 45-clip G3 bank, taught-grapheme coverage, and F28.
- Type check: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/storytime && ../../node_modules/.bin/tsc --noEmit'` exited 0. It reported no errors in the two Red test files.
- No row passed at Red. Each failed check reports the missing module or the F28 overflow.
- Test commit: `9fba970a6` (`test(storytime): add red tests for the decodable ui (track_id: storytime_app_rebuild_20261025)`).
- Report: `measure/runs/storytime_app_rebuild_20261025/red-28014a3.log`.
- Task 3.4 stays `[~]`; Green owns the implementation.

### Phase 3 task 3.4 Green block

- Green started at role base `f538c156dbbbe5d7620a1cd9ba3c9182db08e0c9`. The phase base is `7db52a49d20e195388fd91670cc7c022312b50c5`.
- Targeted Red command: exit 1; 2 failed files; 7 failed tests; 0 passed. The failures match the Red report.
- Block: `apps/storytime/__tests__/phase3-decodable-ui.test.tsx` lines 90 to 93 assert that each played blend clip name, after the `NN-` prefix and `.mp3` suffix are removed, equals the plan grapheme. The plan graphemes are letters (`["p", "a", "n"]` for `pan`, because `phase2-blend.test.ts` asserts `graphemes.join("") === word.toLowerCase()`). The G3 bank clip for `a` is `phonemes/daniel/26-a-short.mp3`, so the stripped name is `a-short`. The shipped blend word holds `a`, so the test passes only when the UI plays a media path that has no file.
- Fix: in line 92, allow the G3 variant suffix: `.replace(/^\d{2}-/, "").replace(/(-[a-z]+)?\.mp3$/, "")`. Compare against the bank file as an alternative.
- No production file changed. No implementation commit exists. Task 3.4 stays `[~]`.
- Report: `measure/runs/storytime_app_rebuild_20261025/green-f538c15.log`.

### Phase 3 task 3.4 Red retry

- Red retry started from Green's blocked HEAD `eb2829b9963849c759aa1b8b99dba0ef7cedaf88`. The supplied phase base and original Red role base resolve and remain unchanged.
- The test now compares each clip path with the G3 bank filename for its grapheme. It uses `03-p.mp3`, `26-a-short.mp3`, and `04-n.mp3`. It does not import or read Green's bank module.
- The other assertions in both test files need no naming change. The sounds-page row compares the shipped `focus.element.audio` path. The bank test checks all 45 exact G3 paths. Capital playback checks the phoneme folder, and the other rows compare behavior or paths.
- Targeted Vitest command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && HEAVY_PREFLIGHT_WAIT_S=3600 ./node_modules/.bin/vitest run --maxWorkers=1 apps/storytime/__tests__/phase3-decodable-ui.test.tsx apps/storytime/__tests__/phase3-phoneme-bank.test.ts'`. Exit 1; 2 files; 7 tests; 7 failed, 0 passed. Failures are assertions only: four missing-UI checks, two missing-bank checks, and the expected F28 `RangeError`.
- Storytime type check: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/storytime && ../../node_modules/.bin/tsc --noEmit'`. Exit 0; no errors.
- Test-fix commit: `cf16eb0e3` (`test(storytime): match blend clips by bank name (track_id: storytime_app_rebuild_20261025)`). No production file changed.
- Report: `measure/runs/storytime_app_rebuild_20261025/red-28014a3.log`.

### Phase 3 task 3.4 Green block 2

- Green started at role base `a23c4355866736ae024336eda31c14cb88d97930`. The phase base is `7db52a49d20e195388fd91670cc7c022312b50c5`.
- Targeted Red command: exit 1; 2 failed files; 5 passed tests; 2 failed tests. The 5 passing checks cover the sounds page, the clip order, the whole words, the 45-clip bank, and F28.
- Block 1: `phase3-phoneme-bank.test.ts` line 46 reads `week.focus.element.graphemes`; shipped `w08.json` is a review week with no element. Fix: `week.focus.element?.graphemes ?? []`.
- Block 2: `phase3-decodable-ui.test.tsx` line 136 compares the capital word `Nan` against lower-case page text. Fix: `includes(word.toLowerCase())`. This fix lets the F28 case stay in the pure function.
- The implementation was complete and then reverted. No production file changed. No implementation commit exists. Task 3.4 stays `[~]`.
- Report: `measure/runs/storytime_app_rebuild_20261025/green-a23c435.log`.

### Phase 3 task 3.4 Red retry 2

- Retry started at Green's blocked HEAD `72e737452d3d29e9e1fd587fe342bc23da77c4af`. The phase base and original Red role base resolve and remain unchanged.
- Review of both Red files against shipped w01 to w08 found three data issues. Review week w08 has no `focus.element`; the bank test now collects graphemes only when present. The first blend word is `Nan`, so page-text matching now ignores case. The capital-word case uses shipped w03 `pan`, changes it to `Pan`, and matches its button without case sensitivity.
- The CVC order case now selects w03 explicitly. It compares the `pan` plan with the real G3 files `03-p.mp3`, `26-a-short.mp3`, and `04-n.mp3`. This avoids filesystem-order selection of another word.
- Targeted Vitest command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && HEAVY_PREFLIGHT_WAIT_S=3600 ./node_modules/.bin/vitest run --maxWorkers=1 apps/storytime/__tests__/phase3-decodable-ui.test.tsx apps/storytime/__tests__/phase3-phoneme-bank.test.ts'`. Exit 1; 2 files; 7 tests; 7 failed, 0 passed. All failures are assertions: four need the decodable UI, two need the bank, and F28 throws `RangeError`.
- Storytime type check: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/storytime && ../../node_modules/.bin/tsc --noEmit'`. Exit 0; no errors.
- Test commits: `923ae6362` and `479842d27`. The second commit adds the case-insensitive button query found during final data review. Neither commit changes production source.
- Report: `measure/runs/storytime_app_rebuild_20261025/red-28014a3.log`.

### Phase 3 task 3.4 Green evidence

- Implementation commit: `05fd90c46` (`feat(storytime): add the decodable ui (track_id: storytime_app_rebuild_20261025)`).
- Files: `apps/storytime/app/[locale]/st/[level]/[week]/decodable.tsx` (new), `apps/storytime/lib/phoneme-bank.ts` (new), `apps/storytime/lib/blend.ts`, `apps/storytime/app/[locale]/st/[level]/[week]/reader.tsx`, and `apps/storytime/app/[locale]/st/[level]/[week]/page.tsx`.
- The decodable part holds the sounds page with the element, its graphemes, and its sound; the bank clip on tap; the page word tap that follows the `blendPlanForWord` plan; the whole word from the book recording; the page turner; and the tricky-word list. No phone voice (rule 10.5).
- The bank holds the 45 G3 clips and the labeled count `phoneme_clips=45`. F28: the longest-grapheme maximum uses a loop, and a capital word takes the lower-case plan.
- The route renders the decodable part for `part === "decodable"`. The task 3.1a media gate, the task 3.2 tiles, and the task 3.3 read-along reader are unchanged.
- Gates:
  - Targeted Red command: exit 0; 2 files; 7 tests.
  - Green gate: exit 0; 7 files; 39 tests.
  - `tsc --noEmit` in `apps/storytime`: exit 0.
  - ESLint on the five changed TypeScript files: exit 0.
- No committed Red test changed. No week content, contract, readiness, receiver, deploy, or Docker file changed.
- Report: `measure/runs/storytime_app_rebuild_20261025/green-f7584ba.log`.

- [x] 3.4 Decodable UI: the sounds page with the phoneme bank, then the blend playback from task 2.5. Tests: AC-7.1. Done: `05fd90c46`.
- [x] 3.5 Song page: the poster, no sound before a tap, and the 9:16 phone box or the 16:9 box. The lyric lines light up with the gesture name and the line picture. Add the audio-only case. Show no karaoke tile without `song.karaoke`. Tests: AC-8.1, AC-8.2. Done: `13b8bdc9b`. AC-8.2 stays with the browser gate of task 3.7.

### Phase 3 task 3.5 Red evidence

- Red scope base: `7db52a49d20e195388fd91670cc7c022312b50c5`. Role base: `1ac319d4f7b58481903259c7ea3b4c1449674c64`. Both resolve; HEAD matched the role base before edits.
- Test commit: `cc3cfcfa58fa2e56d4571c2e5db9c54fde3755ae` (`test(storytime): add red tests for the song page (track_id: storytime_app_rebuild_20261025)`).
- Automated targeted command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && HEAVY_PREFLIGHT_WAIT_S=3600 ./node_modules/.bin/vitest run --maxWorkers=1 apps/storytime/__tests__/phase3-song-ui.test.tsx'`. Result: exit 1; 1 failed file; 6 failed tests and 1 passed test (7 total). All six failures are assertions for the missing song view at `app/[locale]/st/[level]/[week]/song.tsx`; the karaoke route guard passes.
- Automated app type check: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/storytime && HEAVY_PREFLIGHT_WAIT_S=3600 ../../node_modules/.bin/tsc --noEmit'`. Result: exit 0; no diagnostics.
- Tests cover no autoplay and poster-first playback; timing against all 15 shipped w01 `song.times` rows; portrait and other-screen media names; the audio-only path; line text, gestures, line pictures, and `imageOf`; and the no-karaoke-tile route guard. AC-8.2 remains a browser gate: `video_box_ratio_x1000_phone` is 562 ± 5, `video_box_height_pct_phone` is at most 75, and `video_box_ratio_x1000_laptop` is 1778 ± 5. jsdom does not measure layout.
- Files: `apps/storytime/__tests__/phase3-song-ui.test.tsx`, this plan section, and `measure/runs/storytime_app_rebuild_20261025/red-1ac319d.log`. No production source changed. Dirty paths outside this task remain untouched.
- Red report: `measure/runs/storytime_app_rebuild_20261025/red-1ac319d.log`.

### Phase 3 task 3.5 Green evidence

- Green started at role base `155a3058baa215935b6c1857a26b0a5e1e763c96`. The immutable phase base is `7db52a49d20e195388fd91670cc7c022312b50c5`.
- The first Green pass found a Red query that could not pass: `phase3-song-ui.test.tsx:109` called `getByText` for a gesture that shipped w01 repeats on three lines. Red scoped the query to its lyric line in `38bef548e` (evidence `95060acdc`, `155a3058b`). The retry ran the song test at this role base: exit 0; 7 tests passed.
- Implementation commit: `13b8bdc9bcfc7c3b67a48cc594447aace0ce6bc9` (`feat(storytime): add the song page (track_id: storytime_app_rebuild_20261025)`).
- Files: `app/[locale]/st/[level]/[week]/song.tsx`, the `?part=song` wiring in `page.tsx`, the `.song-stage` rules in `globals.css`, and the `songPlay` and `songPause` messages.
- Automated Green gate: exit 0; 6 test files passed and 41 tests passed. AC-8.1 is covered by the unit test: no `play()` before a tap, the poster first, and the lines light from the 15 shipped w01 `song.times` rows.
- Automated app type check: exit 0. ESLint on the two changed TypeScript files: exit 0.
- AC-8.2 stays with the browser gate of task 3.7: `video_box_ratio_x1000_phone` is 562 ± 5, `video_box_height_pct_phone` is at most 75, and `video_box_ratio_x1000_laptop` is 1778 ± 5. jsdom does not measure layout.
- No committed Red test changed by Green. Green report: `measure/runs/storytime_app_rebuild_20261025/green-155a305.log`.

### Phase 3 task 3.5 Red defect fix

- Red fix started at Green HEAD `1c5e422cb10e8db4a6d21d76d5d2a1152e5828be`. The phase base remains `7db52a49d20e195388fd91670cc7c022312b50c5`; the role base remains `1ac319d4f7b58481903259c7ea3b4c1449674c64`.
- `phase3-song-ui.test.tsx` now scopes its gesture query to the matching line. The full-file check found no other global single-match query for repeated shipped gesture data. Line text is unique in w01; the later gesture assertion is already scoped to its line.
- Red fix test commit: `38bef548e27645c7325f7df9e4389ab12d7aad24` (`test(storytime): query repeated song gestures safely (track_id: storytime_app_rebuild_20261025)`).
- Targeted Vitest command: exit 0; 1 file; 7 tests passed. App `tsc --noEmit`: exit 0; no diagnostics.
- Plan evidence and updated Red report commit separately. The report is `measure/runs/storytime_app_rebuild_20261025/red-1ac319d.log`.

### Phase 3 task 3.6 Red evidence

- Mid-Red used `phase_base_sha` `7db52a49d20e195388fd91670cc7c022312b50c5` and `role_base_sha` `d1ec787a9eb0e596bf5c1ab57720391c670d315b`. Both resolve; the phase base is an ancestor of the role base. Starting HEAD matched the role base.
- The starting tree held unrelated untracked user work. It remains unchanged and unstaged. No generated or task-related dirty path was present.
- Red added `phase3-printed-urls.test.ts` and `phase3-browser-gate.sh`. No production source or shipped content changed.
- Targeted command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && HEAVY_PREFLIGHT_WAIT_S=3600 ./node_modules/.bin/vitest run --maxWorkers=1 apps/storytime/__tests__/phase3-printed-urls.test.ts'`. Final result: exit 0; 1 file and 1 test passed. The test checks all eight shipped weeks and prints `urls_checked=16`. AC-2.2 already holds at this HEAD; Red did not create a false failure.
- A first test attempt failed before collection because Vitest could not resolve the app alias `@/i18n/routing`. The test added narrow mocks for the route dependencies. The final targeted run passed.
- App type check: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/storytime && HEAVY_PREFLIGHT_WAIT_S=3600 ../../node_modules/.bin/tsc --noEmit'`. Result: exit 0.
- Browser gate syntax: `bash -n apps/storytime/__tests__/phase3-browser-gate.sh`. Result: exit 0. The browser gate itself was not run; its single heavy browser run belongs to Green.
- Test commit: `a19040e66` (`test(storytime): add URL and browser gate red tests (track_id: storytime_app_rebuild_20261025)`). The requested full subject exceeded the 100-character header limit, so the header was shortened.
- The exact remaining acceptance work is the unrun browser gate: first-load transfer, media timing, 64 px tile and speaker targets at 360x800 and 800x360, and AC-8.2 video box ratios. Task 3.6 remains `[~]`.
- Report: `measure/runs/storytime_app_rebuild_20261025/red-d1ec787.log`.

### Phase 3 task 3.6 Green evidence

- Green started at `9ccd89c98a9b36c9f0f6f8b836a88d9b3feca130`. The immutable phase base is `7db52a49d20e195388fd91670cc7c022312b50c5`. The Red commits `a19040e66` and `9ccd89c98` are inside the phase range. No coder was delegated.
- Printed-URL test (AC-2.2): exit 0; 1 file; 1 test. The test reads 8 shipped weeks and 2 URLs each, so `urls_checked=16`.
- App type check: `tsc --noEmit` in `apps/storytime` exits 0 with no diagnostics.
- Browser gate run 1: exit 1; `PASS=3, FAIL=1`. The Playwright step failed before an app row: `Cannot find package '@playwright/test' imported from /tmp/storytime-browser-dfZ2iK/gate.mjs`. The gate writes its script under `mktemp -d -t`, so Node resolves from `/tmp`, which has no `node_modules`.
- Browser gate run 2 with `TMPDIR="$PWD/.tmp"`: no Red file changed. Result: browser `PASS=10, FAIL=4`; outer `PASS=3, FAIL=1`. The labeled lines:
  - `transferred_bytes_first_load=642173`
  - `media_requests_before_tap=3`
  - `requests_total=19`
  - `first_media_request_index=13`
  - `tap_target_min_px_tiles_360x800=106`
  - `tap_target_min_px_speakers_360x800=64`
  - `tap_target_min_px_tiles_800x360=106`
  - `tap_target_min_px_speakers_800x360=64`
  - `video_box_ratio_x1000_phone=520`
  - `video_box_height_pct_phone=75`
  - `video_box_ratio_x1000_laptop=1778`
- The three self-tests fail their bad pages as required: the 30 px button, the 400 KB script, and white text on `#3080ff`.
- AC-5.3 byte row: the gate sums `(await response.body()).byteLength`, which is the decoded size. The whole Storytime static build is 756 KB, so 642,173 is a decoded sum. AC-5.3 says "transferred", so the row cannot reach 300,000. Mid Red must measure the encoded size.
- AC-5.3 media rows: `media_requests_before_tap=3` and `first_media_request_index=13` are the three content tile pictures. Spec FR-5 and task 3.2 require a picture with `image.caption` alt text on each tile. Gate line 128 counts `resourceType === "image"` as media. The gate and FR-5/task 3.2 conflict.
- AC-8.2 phone row: `video_box_ratio_x1000_phone=520` is an app defect. `.song-stage[data-phone="true"] video` sets `width: auto; height: 75dvh`, so the 312 px content width against the 600 px height gives 520. The fix drives the width: `width: min(100%, calc(75dvh * 9 / 16)); height: auto;`. The change is uncommitted, because the gate cannot end with FAIL=0 until Mid Red fixes the gate.
- No production source changed, so there is no implementation commit and no ESLint target. Task 3.6 stays `[~]`, because the gate does not end with `FAIL=0`.
- Report: `measure/runs/storytime_app_rebuild_20261025/green-9ccd89c.log`.

### Phase 3 task 3.6 Red retry evidence

- The retry started at `role_base_sha` `a2c4fd75e3e2000e26ff1e14f099602553019865`. The immutable `phase_base_sha` remains `7db52a49d20e195388fd91670cc7c022312b50c5`; both resolve, and the phase base is an ancestor. The starting HEAD matched the role base.
- Daniel's option A clarifies AC-5.3. The first-load budget uses transferred bytes from every request before the first tap. Media requests mean audio and video only. The three entry-tile pictures remain part of the first load and do not count as part media.
- `phase3-browser-gate.sh` now writes its generated Playwright module under `apps/storytime/.next/`, where Node resolves the workspace package. The EXIT trap removes the module.
- The gate uses CDP `Network.loadingFinished.encodedDataLength` for `transferred_bytes_first_load` and CDP request events for `requests_total`. Its media predicate includes CDP media resource type and audio/video file extensions only. Image requests do not count as media.
- The 400 KB self-test page now runs from a local inline-page server and uses the same CDP encoded-byte measurement as the live check. The other two self-test pages and all other browser rows remain unchanged.
- Syntax command: `bash -n apps/storytime/__tests__/phase3-browser-gate.sh`. Result: exit 0. The browser gate was not run; Green owns the browser run.
- Test commit: `f30d055e0` (`test(storytime): measure transferred bytes (track_id: storytime_app_rebuild_20261025)`). The requested full subject was 105 characters, so it was shortened to meet the 100-character limit. This evidence commit also commits the plan and retry report.
- Task 3.6 remains `[~]` until Green reruns the browser gate and records all results. Report: `measure/runs/storytime_app_rebuild_20261025/red-d1ec787.log`.

### Phase 3 task 3.6 Green retry evidence

- Green retry started at `0b648fdfd16a86fabae25fbeadd08a44ee116e4f`. The immutable phase base stays `7db52a49d20e195388fd91670cc7c022312b50c5`. The Red retry commits `f30d055e0` and `0b648fdfd` are inside the phase range. No coder was delegated.
- The phone song box fix is in `apps/storytime/app/globals.css`: `width: min(100%, calc(75dvh * 9 / 16)); height: auto;`. A 360x800 phone gives a 312 px width, a 554.67 px height, a ratio of 562, and a height of 69 percent. The laptop 16:9 rule is unchanged. The fix stays uncommitted, because the gate cannot end with `FAIL=0`.
- Browser gate run 1 and run 2 in this round: both exit 1 with `PASS=3, FAIL=1`. Both crash before an app row. The three build and server rows pass, and `FAIL: Playwright gate exits 1` follows. No labeled app line prints, because the gate prints its result array at the end.
- The crash is `browserContext.newCDPSession: Protocol error (Target.attachToTarget): No target with given id found`, at generated script line 24 from the call at line 62.
- Root cause: `apps/storytime/__tests__/phase3-browser-gate.sh` line 107 calls `page.context().newCDPSession(page)` from a synchronous `watchNetwork` at line 102. The call returns a `Promise`, so `.on` (lines 109 and 114) and `.send` (line 118) cannot work. Under `heavy-run.sh`, the unhandled attach rejection crashes Node with the CDP error. Outside it, the crash is `cdp.on is not a function`.
- Verified fix for Mid Red: line 102 becomes `async function watchNetwork(page) {`, and line 107 becomes `const cdp = await page.context().newCDPSession(page);`. A local probe of the awaited call under `heavy-run.sh` with the default 3G scope and system Chrome attaches the session and enables the Network domain 3 of 3 times.
- No `transferred_bytes_first_load` value exists for this round, because no app row ran.
- `apps/storytime/app/globals.css` is not an ESLint target, and `tsc --noEmit` does not cover CSS. The prior round recorded a type check exit of 0.
- Task 3.6 stays `[~]`. Report: `measure/runs/storytime_app_rebuild_20261025/green-0b648fd.log`.

### Phase 3 task 3.6 Red harness retry

- Retry role base: `484ecc9a9bff6c1a0f5e9b086f7ddd13309f0140`. The immutable phase base remains `7db52a49d20e195388fd91670cc7c022312b50c5`. Both resolve, the phase base is an ancestor, and starting HEAD matched the role base.
- The starting tree held Green's uncommitted change in `apps/storytime/app/globals.css`. Red did not edit, stage, stash, or restore that file. Unrelated untracked user paths also remain untouched.
- `watchNetwork` is now async, awaits `newCDPSession`, and awaits `Network.enable`. The app page attaches CDP listeners before its first navigation.
- `record` prints each check as soon as it completes. `runCheck` catches a row exception, prints that row as `FAIL`, and continues through the remaining checks.
- The media-after-tap check opens the book part, then taps the read-aloud control. The browser records the first audio request after those taps.
- First validation run reached every row but reported `PASS=19, FAIL=2` in Playwright and `PASS=3, FAIL=1` in the outer script. All self-tests and app rows passed except the media-after-tap check (`first_media_request_index=-1`). Cleanup then reported a closed CDP target because it detached after closing the browser context.
- Red corrected the media action to tap the read-aloud control and closed CDP before the context. Final one-run validation: `bash -n apps/storytime/__tests__/phase3-browser-gate.sh` exits 0; `bash apps/storytime/__tests__/phase3-browser-gate.sh` exits 0 with Playwright `PASS=22, FAIL=0` and outer `PASS=4, FAIL=0`. All three self-tests pass.
- Final measured lines: `transferred_bytes_first_load=223741`, `media_requests_before_tap=0`, `requests_total=23`, `first_media_request_index=25`, `tap_target_min_px_tiles_360x800=106`, `tap_target_min_px_speakers_360x800=64`, `tap_target_min_px_tiles_800x360=106`, `tap_target_min_px_speakers_800x360=64`, `video_box_ratio_x1000_phone=563`, `video_box_height_pct_phone=69`, `video_box_ratio_x1000_laptop=1778`.
- Test commit: `b983f3c3c` (`test(storytime): await CDP session (track_id: storytime_app_rebuild_20261025)`). The requested subject exceeded the 100-character limit, so the header was shortened. This evidence commit commits the plan and report.
- Report: `measure/runs/storytime_app_rebuild_20261025/red-d1ec787.log`.

### Phase 3 task 3.6 Green final evidence

- Green started at `02816cfcbd5a2d38ab1d2c03a5abe995a5cdd85f`. The immutable phase base is `7db52a49d20e195388fd91670cc7c022312b50c5`. The Red harness commits `b983f3c3c` and `02816cfcb` are inside the phase range. No coder was delegated.
- The only uncommitted app change at the start was `apps/storytime/app/globals.css` (2 lines added, 2 lines removed): `width: min(100%, calc(75dvh * 9 / 16)); height: auto;`.
- The final browser gate ran on this exact tree. Red ran it, per the orchestrator decision at 05:24 ICT, to save one heavy run. No gate script line changed in the CSS commit. Result: Playwright `PASS=22, FAIL=0`; outer `PASS=4, FAIL=0`.
- Labeled lines: `transferred_bytes_first_load=223741`; `media_requests_before_tap=0`; `requests_total=23`; `first_media_request_index=25`; `tap_target_min_px_tiles_360x800=106`; `tap_target_min_px_speakers_360x800=64`; `tap_target_min_px_tiles_800x360=106`; `tap_target_min_px_speakers_800x360=64`; `video_box_ratio_x1000_phone=563`; `video_box_height_pct_phone=69`; `video_box_ratio_x1000_laptop=1778`.
- AC-8.2 ratios: phone 563 against 562 ± 5; phone height 69 percent against at most 75; laptop 1778 against 1778 ± 5.
- App type check: `tsc --noEmit` in `apps/storytime` exits 0 through `heavy-run.sh`.
- `apps/storytime/app/globals.css` is not an ESLint target. No TypeScript file changed, so `build-graph` needs no update.
- Implementation commit: `a5f856091` (`fix(storytime): size the phone song box (track_id: storytime_app_rebuild_20261025)`).
- Report: `measure/runs/storytime_app_rebuild_20261025/green-02816cf.log`.

- [x] 3.6 Printed-URL test (AC-2.2) and the first-load budget of 300 KB (AC-5.3). Done: `a5f856091`. Automated: the printed-URL test exits 0 (1 file, 1 test, 16 URLs); the browser gate exits 0 with Playwright `PASS=22, FAIL=0` and outer `PASS=4, FAIL=0`; `transferred_bytes_first_load=223741`; `media_requests_before_tap=0`; `tsc --noEmit` exits 0. The gate ran on this tree, per the orchestrator decision at 05:24 ICT.
- [x] 3.8 Loop contract: typed optional read schemas for the seven A-42 fields with passthrough kept, the question page and word check, the receiver media list for the loop audio, the F99 page coverage rule, and receipt at the Workbooks commit of the A-42 drafts (due 2026-11-09). Tests: w01 to w08 parse at the new pin; AC-13.1 to AC-13.5. Target: closes at the draft pin. Task 3.10 follows it. The latest date for both is 2026-11-19. Done: `9c0e9f0d7` (the contract and the receiver), `804944378` (the receipt at the draft pin), `f163d4692` and `aeffe6826` (fix round 1). Automated: the targeted command exits 0 with 22 files and 270 tests; `tsc --noEmit` exits 0; ESLint exits 0 on the 8 changed files. The take exits 0 with 8 weeks, 179 media files, and 159 missing pictures; the 26 hand-off hashes match; the 8 written weeks equal the hand-off files byte for byte; a second run makes no difference.
  - PM 2026-11-04: light lane for task 3.8 part 1 (one maker, one checker).

### Phase 3 task 3.8 Red evidence

- The light lane holds one maker and one checker. The maker wrote the tests first.
- The test files are `phase3-loop-contract.test.ts`, `phase3-f99-page-audio.test.ts`, `phase3-loop-receiver.test.ts`, `phase3-media-coverage.test.ts`, and `phase3-receiver-hardening.test.ts`.
- The command ran under `heavy-run.sh` with `--maxWorkers=1` and the five named files.
- The result: exit 1, 5 failed files, 61 failed tests, and 31 passed tests (92 total).
- Every failure is an assertion. No file failed to load, and no import error occurred.
- The failed assertions name the missing rules: the loop fields, the limits of the hand-off, the question page and word check, the recall count, the F99 page coverage, the clip pattern, the media coverage scan, the link stop, the leftover message, the recovery copy, and the runbook text.
- The test commit is `4913fe3f2` (`test(storytime): add the loop contract tests (track_id: storytime_app_rebuild_20261025)`).
- The report is `measure/runs/storytime_app_rebuild_20261025/red-3.8-part1.log`.

### Phase 3 task 3.8 Green evidence

- The implementation commit is `9c0e9f0d7`. The receipt commit is `804944378`. No coder was delegated.
- The contract holds the typed read schemas of the seven A-42 fields. Every one keeps the passthrough.
- The limits are the limits of the hand-off: 3 to 5 drill words, 2 to 4 sounds, 2 to 5 repeats, 1 to 3 sight words, 2 to 5 seconds, and 0 to 20 loop minutes.
- The loops approval part needs a date and the exact words when it is approved. An absent part means a draft. The part is not one of the six approval parts.
- The question page and word check and the recall count run only when the loops part is approved. The question word check finds the answer word as a lower case substring of the page text. It does not need a word boundary.
- The clip pattern `^phonemes/daniel/[0-9]{2}-[a-z]+(-[a-z]+)*\.mp3$` is one constant in `lib/contracts/week.ts`, next to `mediaPath`.
- The receiver lists every drill clip and every recall clip with the kind `phoneme` and the rule `MEDIA_RULES.phoneme`. The receiver never changes `meta.status` or `approval`.
- The F99 page coverage rule fails a published book whose sentences hold no page. An empty list passes.
- The receiver hardening rows landed: F77 (the message says "possible recovery file"), F78 and F84 (a link in the content folder stops the run with code 1 and names the link), F91 (the runbook says "ends with" and gives the pattern of the code), F92 (the recovery steps name the untracked case), and F98 (the recovery copy is written to a stage name and renamed after the full write).
- The F13 coverage test names three exact field paths with a reason: `print`, `benchmark.oneToOne.soundAudio.*`, and `benchmark.oneToOne.blend.*.audio.*`.
- The take: the 26 hashes of `MANIFEST.txt` match. The command `sha256sum -c MANIFEST.txt` exits 0 and warns about 4 metadata lines. Each of the 8 week files equals `git show cad0307c:content/storytime/l2/w0N.json`.
- The receiver command `node_modules/.bin/tsx apps/storytime/scripts/receive-weeks.ts --commit cad0307cad31a3131dc3a06e9e773537a1a6219b --weeks 1-8` exits 0. It writes 8 weeks, 179 media files, and 159 missing pictures. Each of the 8 weeks is not ready for the at-home app.
- Each written week is byte for byte equal to the file of the hand-off folder. The second run at the same commit exits 0 and makes no difference.
- The counts of the acceptance checks: `weeks_parsed=8`, and `phoneme_clips=45` from the bank of `lib/phoneme-bank.ts`.
- The targeted command exits 0 with 22 files and 270 tests. The files are the 5 new files, `phase2-adversarial.test.ts`, `phase2-adversarial-r2.test.ts`, `phase2-adversarial-r3.test.ts`, `phase2-blend.test.ts`, `phase2-content.test.ts`, `phase2-contract-hardening.test.ts`, `phase2-contract.test.ts`, `phase2-media-missing.test.ts`, `phase2-receive-guards.test.ts`, `phase2-runbook.test.ts`, `phase3-decodable-ui.test.tsx`, `phase3-media-gate.test.ts`, `phase3-phoneme-bank.test.ts`, `phase3-printed-urls.test.ts`, `phase3-readalong-ui.test.tsx`, `phase3-readiness.test.ts`, and `phase3-song-ui.test.tsx`.
- `tsc --noEmit` in `apps/storytime` exits 0. ESLint exits 0 on the 8 changed files.
- One changed expectation: `phase2-receive-guards.test.ts` names the original that no copy can keep. The old value was the fault path `/a\.json\.orig-/`. The new value is the fault path `/a\.json\.tmp-/`, because the copy is written to a stage name now. The rule stays: the error must say "original could not be kept". No other expectation changed.
- The media gate of task 3.1a and every Phase 3 screen stay as they are. The routines stay hidden; task 3.9 builds the question screen.

### Phase 3 task 3.8 Fix round 1 evidence

- The checker report is `measure/runs/storytime_app_rebuild_20261025/review-a-correctness-2dec176.json`. It holds one blocking finding and seven other findings.
- B1 (AC-13.4): the two media list rows passed without the walker of the loop audio, because the fixture clips were listed through other week fields. The fix uses the drill clip `phonemes/daniel/98-zz.mp3` and the recall clip `phonemes/daniel/99-yy.mp3`. No field of a week holds these names. Each row asserts that the clip is listed with the kind `phoneme` and the rule `MEDIA_RULES.phoneme`.
- The B1 proof: the walker lines of `receive-weeks.ts` were disabled for one run. The command `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && ./node_modules/.bin/vitest run --maxWorkers=1 apps/storytime/__tests__/phase3-loop-receiver.test.ts apps/storytime/__tests__/phase3-media-coverage.test.ts'` exits 1 with 2 failed files and 2 failed tests (15 passed).
- The two failures of the proof name the new rows: "The media list misses the clip phonemes/daniel/98-zz.mp3 (A4)" and "The coverage check misses the clips of a new drill: expected 4 to be +0".
- The code was restored after the proof. The command `git diff -- apps/storytime/scripts/receive-weeks.ts` showed no change, before the proof and after it.
- N1: the substring check of the question word stays. The plan now says that the check finds the answer word as a lower case substring of the page text.
- N2: `linkInPath` has four direct rows. They cover the first folder, the second folder, the file name, and a plain folder. The receiver stops with code 1 when the content folder is itself a link, and it names that folder.
- N3: the runbook names the full copy of an original in the steps 2, 3, 4, and 5. A new row covers the branch of a rename fault. The full copy stays in the stage file, and the stage file holds the original.
- N4: the row of the source record compares the record with the A-42 pin `cad0307cad31a3131dc3a06e9e773537a1a6219b`. It also compares the record with the pin before the take, `cf30bb2eee55806bf8830b3a3e69e4f6044847e6`.
- N5: the row of task 3.8 part 2 in the test strategy names the five test files of task 3.8. The name `phase3-loop-pin.test.ts` is gone.
- N6: the row of F92 needs the word "untracked" inside the match.
- N7: the message of the copy says "no partial copy stays" when the run created no copy.
- The Red command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && ./node_modules/.bin/vitest run --maxWorkers=1 apps/storytime/__tests__/phase3-loop-contract.test.ts apps/storytime/__tests__/phase3-f99-page-audio.test.ts apps/storytime/__tests__/phase3-loop-receiver.test.ts apps/storytime/__tests__/phase3-media-coverage.test.ts apps/storytime/__tests__/phase3-receiver-hardening.test.ts apps/storytime/__tests__/phase2-receive-guards.test.ts apps/storytime/__tests__/phase2-runbook.test.ts'` exits 1 with 1 failed file and 3 failed tests (130 passed of 133).
- The three failures of the Red run name the missing rules: the link of the content folder, the full copy of the runbook, and the partial copy that never stood.
- The Green command: the same command exits 0 with 7 files and 133 tests. The wider command over the phase 2 and phase 3 files of `apps/storytime/__tests__/` exits 0 with 29 files and 304 tests.
- `tsc --noEmit` in `apps/storytime` exits 0. ESLint exits 0 on the five changed TypeScript files.
- No week file and no `source.json` changed. The receiver did not run at a new commit.
- Commits: `f163d4692` (the test rows) and `aeffe6826` (the receiver and the runbook). The plan commit is the third one.
- [~] 3.9 Read-along questions: the question screen of spec FR-13 (Default A, Daniel's decision, 2026-11-03) in `apps/storytime`. The choices are the pictures of the distinct answer pages, each one time, in book order. One picture can be right for more than one question. A right tap marks the picture and goes to the next question. The right tap on the third question ends the screen, as the skip control does. A wrong tap shows a gentle mark and stays, with no sound. At the end, the screen shows the three tiles of the week page (task 3.2). It shows after the last page in every mode, the slow mode included, with the Thai prompt ask.th for the teacher next to the English prompt ask.en, both as text only, only when approval.loops.status is approved, at levels 2 to 4. Tests: AC-13.6, AC-13.8. Note: Daniel decided the base look and the F13 cases on 2026-11-03 (answer "Ok"). He sees the real screen in a later look check. Target: before the Storytime release 1 delivery of 2026-12-01 (internal). Done: `08ff84423`. Automated: the targeted command exits 0 with 3 files and 31 tests; the full phase 2 and phase 3 run exits 0 with 31 files and 327 tests; `tsc --noEmit` exits 0; ESLint exits 0 on the 6 changed TypeScript files. Fix round 1 is open: the findings F1 and F4 of `measure/runs/storytime_app_rebuild_20261025/review-a-2d840ae.json`.

### Phase 3 task 3.9 Red evidence

- The Red tests are `phase3-question-screen.test.tsx` and `phase3-loops-off.test.tsx`. They cover AC-13.6 and AC-13.8.
- The command: `HEAVY_MIN_AVAIL_MB=2500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd apps/storytime && ../../node_modules/.bin/vitest run --maxWorkers=1 __tests__/phase3-question-screen.test.tsx __tests__/phase3-loops-off.test.tsx'`. Exit: 1. Two failed files, 20 failed tests, and 2 passed tests of 22.
- Every failure is an assertion. No file failed to load, and no import error occurred.
- The failed assertions name the missing rule module, the missing question screen, the missing skip control, the missing choices, and the missing wiring in the week page.
- The two passed tests cover the valid approved copy of the shipped week and the read-along that plays as before with the loops off.
- The test data is an in-test copy of the shipped w01. The copy sets `approval.loops` to `approved` with the date `2026-11-04` and the words `"Loops approved" (2026-11-04)`. The shipped w01 keeps its draft loops part.
- The tests read the words and the pages of the questions from the loaded week. They hold when the week data changes in the fix batch A-48.
- Green builds to these modules: `apps/storytime/lib/questions.ts` with `readAlongQuestions`, `questionScreenShows`, and `questionChoices`, and `apps/storytime/app/[locale]/st/[level]/[week]/questions.tsx` with `StorytimeQuestions`.
- The reader takes the optional props `questions`, `tiles`, and `questionLabels`. The week page calls `questionScreenShows` and passes the three tiles of the home view.
- The type check `tsc --noEmit` in `apps/storytime` exits 0, and the two test files are in the program. The missing module raises no type error, because the test loads it with a dynamic import.
- ESLint exits 0 on the two changed test files.
- The test commit is `d9119a8b5`.
- The report is `measure/runs/storytime_app_rebuild_20261025/red-f045cfd.log`.

### Phase 3 task 3.9 Green evidence

- Implementation commit: `08ff84423`. No coder was delegated. The previous Green start on another model was stopped before it changed anything.
- Green models: `opencode-go/deepseek-v4.1-flash` for the code, `kimi-code-plan-cn/kimi-for-coding#high` for the evidence (PM fallback). Red model: `minimax-cn-coding-plan/MiniMax-M3.1-Flash`.
- Files: `apps/storytime/lib/questions.ts` (new; `readAlongQuestions`, `questionScreenShows`, `questionChoices`, and the types `BookQuestion`, `QuestionPage`, `QuestionChoice`), `apps/storytime/app/[locale]/st/[level]/[week]/questions.tsx` (new; `StorytimeQuestions` and the types `QuestionTile`, `QuestionLabels`), `reader.tsx` (the optional `questions`, `tiles`, and `questionLabels` props and the screen after the last page), `page.tsx` (the gate and the wiring), `lib/contracts/week.ts`, `lib/loops.ts` (new), and the two message files.
- `loopsApproved` and `STORYTIME_LOOPS_PART` moved to `lib/loops.ts` and are re-exported from `lib/contracts/week.ts`. The client screen imports the small rule and loads no schema.
- Targeted Green command: `cd apps/storytime && ../../node_modules/.bin/vitest run --maxWorkers=1 __tests__/phase3-question-screen.test.tsx __tests__/phase3-loops-off.test.tsx __tests__/phase3-readalong-ui.test.tsx`. Exit: 0. Three files and 31 tests.
- Full phase 2 and phase 3 run: `cd apps/storytime && ../../node_modules/.bin/vitest run --maxWorkers=1 __tests__/phase2-*.test.ts __tests__/phase3-*.test.ts __tests__/phase3-*.test.tsx`.
  - First run: exit 1. One failed suite, `phase3-printed-urls.test.ts`: Vitest cannot resolve the `@/lib/questions` alias. No test failed; the suite failed to load.
  - Fix: the page uses the relative import `../../../../../lib/questions`. The committed Red tests did not change.
  - Second run: exit 0. Thirty-one files and 327 tests.
- `tsc --noEmit` in `apps/storytime` exits 0 through the heavy lock.
- ESLint exits 0 on the 6 changed TypeScript files.
- `graph.db` is untracked, so no `build-graph update` ran.
- New message keys, drafts for Daniel's Thai check: `questionSkip` "ข้าม", `questionRight` "ใช่", `questionGentle` "ลองอีกครั้ง".
- The first-load bytes and the browser gate did not run in Green. They belong to the task 3.7 phase check.
- No committed Red test changed. No content file and no receiver file changed. Report: `measure/runs/storytime_app_rebuild_20261025/green-744e1fa.log`.

### Phase 3 task 3.9 fix round 1 Red evidence

- The checker result is `measure/runs/storytime_app_rebuild_20261025/review-a-2d840ae.json`. It holds one blocking finding (F1) and six other findings. F1 and F4 need Red tests. F2, F3, F5, F6, and F7 need no test change.
- The command: `HEAVY_MIN_AVAIL_MB=2500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd apps/storytime && ../../node_modules/.bin/vitest run --maxWorkers=1 __tests__/phase3-question-screen.test.tsx __tests__/phase3-loops-off.test.tsx'`. Exit: 1. One failed file, 8 failed tests, and 19 passed tests of 27.
- Every failure is an assertion. No file failed to load, and no import error occurred.
- The failed assertions name the missing rules: the advance time, the right mark of question 1 on question 2, the gentle mark of question 1 on question 2, the shared answer page on question 2, the end of the last question, and the accessible name of the choices.
- The wider run with `__tests__/phase3-readalong-ui.test.tsx` exits 1 with 8 failed tests and 28 passed tests of 36. The read-along file passes unchanged.
- The type check `tsc --noEmit` in `apps/storytime` exits 0 through the heavy lock. ESLint exits 0 on the two changed test files.
- The test commit is `7570a98ca`.
- The report is `measure/runs/storytime_app_rebuild_20261025/red-2d840ae.log`.

Changed expectations:

- `phase3-question-screen.test.tsx`: the test "marks the right picture and goes to the next question on a right tap" is now "marks the right picture at once and goes to the next question after the advance time". Old: the next question shows at once. New: the mark shows at once, the screen stays on the question, and the next question shows after `QUESTION_ADVANCE_MS`. Reason: Review A F1 and the orchestrator rule of 2026-11-04.
- `phase3-question-screen.test.tsx`: the test "ends the screen with the right tap on the third question" now uses the fake timers. Old: the screen ends at once. New: the screen stays on the last question and ends after `QUESTION_ADVANCE_MS`, and the end shows the three tiles. Reason: Review A F1 and the orchestrator rule of 2026-11-04.
- `phase3-question-screen.test.tsx`: the test "shows a shared answer page one time and takes it as right for each question" now uses the fake timers and holds the marks. Old: the right tap goes to the next question at once. New: the next question shows after the advance time, the shared picture has no mark on question 2, and a tap marks it right again. Reason: Review A F1 and the case (a) of AC-13.6.
- The new tests are "clears the right mark of question 1 when question 2 shows", "clears the gentle mark of question 1 when question 2 shows", "exports the advance time of the question screen", "gives every choice button a non-empty accessible name in English and Thai", and "holds the picture label in the English and Thai messages". Reason: Review A F1 and F4.

Green builds to these rules:

- The screen exports the constant `QUESTION_ADVANCE_MS` from `apps/storytime/app/[locale]/st/[level]/[week]/questions.tsx`. Its value is a positive number of milliseconds.
- A right tap shows the right mark at once. The next question shows after `QUESTION_ADVANCE_MS`. The screen ends after the same time on the last question.
- Each new question starts with no mark on any picture.
- A wrong tap shows the gentle mark and stays. The gentle mark stays until the question changes.
- The labels of the question screen gain a `picture` field with the template `{n}`. The week page passes the message `questionPicture` of the locale.
- The messages `questionPicture` in `messages/en.json` and `messages/th.json` hold the position field `{n}`.
- [ ] 3.10 Receive the approved A-42 pin: the week files with approval.loops approved after Daniel's content check (by 2026-11-16). Tests: AC-13.1 at the approved pin. Target 2026-11-17 to 2026-11-19.
  - Hand-off of the w01 app package (PM accepted these defaults, 2026-11-03): Workbooks sends the package by 2026-11-06 in `/home/daniebo/Desktop/handoff/w01-storytime-app-package/`. The folder holds `MANIFEST.txt` with the line `workbooks-commit: <full sha>`. The media paths are relative to `content/storytime/`. The receiver runs at that commit. The received `w01.json` must equal the hand-off `w01.json` byte for byte. The media come from the folder after the SHA-256 check against `MANIFEST.txt`.
  - Take recorded 2026-11-03 at Workbooks commit `cf30bb2eee55806bf8830b3a3e69e4f6044847e6`.
  - All 43 file hashes in `MANIFEST.txt` match. `sha256sum -c` warned about six metadata lines, not file entries.
  - Byte check A passed. Workbooks `l2/w01.json` equals the hand-off file.
  - Receiver command: `node_modules/.bin/tsx apps/storytime/scripts/receive-weeks.ts --commit cf30bb2eee55806bf8830b3a3e69e4f6044847e6 --weeks 1-8`. Exit: 0.
  - The receiver wrote 8 weeks, 179 named media files, and 159 missing pictures (338 items). `source.json` records 8 weeks and this 8-week run.
  - Readiness output: w01 ready; w02 to w08 not ready. Byte check B passed: received w01 equals the hand-off file.
  - Content diff: 2 files changed, 41 insertions(+), 20 deletions(-). Only w01 changed in bytes; w02 to w08 are unchanged.
  - Media remain in the hand-off folder. Defaults: images approved, audio and song draft, and `meta.status` published.
  - The first targeted test run exited 1: 2 files failed, 9 passed; 2 tests failed, 141 passed.
  - Changed expectation 1: `phase2-media-missing.test.ts` selects the missing cover by `books.0.cover`, not the first cover item. The first cover now has a file.
  - Changed expectation 2: `phase3-readiness.test.ts` removes a page image file from a clone before checking readiness. Old: shipped w01 page images lack files. New: a missing page image keeps a week not ready.
  - Rerun command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && HEAVY_PREFLIGHT_WAIT_S=3600 ./node_modules/.bin/vitest run --maxWorkers=1 apps/storytime/__tests__/phase2-contract.test.ts apps/storytime/__tests__/phase2-receive-guards.test.ts apps/storytime/__tests__/phase2-blend.test.ts apps/storytime/__tests__/phase2-contract-hardening.test.ts apps/storytime/__tests__/phase2-adversarial.test.ts apps/storytime/__tests__/phase2-adversarial-r2.test.ts apps/storytime/__tests__/phase2-adversarial-r3.test.ts apps/storytime/__tests__/phase2-content.test.ts apps/storytime/__tests__/phase2-media-missing.test.ts apps/storytime/__tests__/phase3-readiness.test.ts apps/storytime/__tests__/phase3-entry-route.test.ts'`. Exit: 0; 11 files and 143 tests passed.
  - `phase3-media-gate.test.ts` was not run. Task 3.1a remains open.
  - PM 2026-11-03: light lane.

### w01 approval take (PM 2026-11-04, light lane)

- The Workbooks check: `git -C /home/daniebo/Desktop/Workbooks diff --stat cad0307cad31a3131dc3a06e9e773537a1a6219b 67be5603e0410f21491a006b8e9d12f3f9dd1bfc -- content/storytime/l2` shows only `content/storytime/l2/w01.json`. That file holds 8 insertions and 2 deletions.
- The hash check: `git -C /home/daniebo/Desktop/Workbooks show 67be5603e0410f21491a006b8e9d12f3f9dd1bfc:content/storytime/l2/w01.json | sha256sum` gives `d8bd9230358d94a0dd2c5aa820db0a5e3952c3c983ba1720f6aaffc6b87af094`. The shipped file holds the same hash after the run. The PM value and the app value are equal.
- The receiver command: `node_modules/.bin/tsx apps/storytime/scripts/receive-weeks.ts --commit 67be5603e0410f21491a006b8e9d12f3f9dd1bfc --weeks 1-8`. Exit: 0.
- The receiver wrote 8 weeks, 179 media files, and 159 missing pictures. The record holds 8 weeks.
- The week states: w01 is ready. w02 to w08 are not ready.
- The unchanged check: `git diff --exit-code` over w02 to w08 exits 0. The seven hashes of w02 to w08 are the same before and after the run.
- The second run of the same command exits 0 and makes no difference.
- The source record: `apps/storytime/content/source.json` holds the commit `67be5603e0410f21491a006b8e9d12f3f9dd1bfc`.
- The content diff holds two files. Only the approval parts of w01 changed. The audio part and the song part hold the status `approved` and the date `2026-11-04`. The loops part stays `draft`. The media files of w01 did not change.
- The new row in `phase3-readiness.test.ts` reads the shipped w01. It finds no readiness blocker. The function `isWeekReady` is true. The loops part is draft, so the function `loopsApproved` is false and the routines stay hidden.
- Changed expectation 1: `phase3-loop-contract.test.ts` names the pin of the take. The old value was the A-42 draft pin `cad0307cad31a3131dc3a06e9e773537a1a6219b`. The new value is the take pin `67be5603e0410f21491a006b8e9d12f3f9dd1bfc`. The reason is that the receiver ran at the new commit. The row also holds the check that the record names no older pin.
- Changed expectation 2: `phase3-media-coverage.test.ts` allows the approval part in the coverage check. The old value of the allowed reasons was `["print", "benchmark"]`. The new value is `["print", "benchmark", "approval"]`. The reason is that the new approval text of w01 ends with a media file name. The text of an approval is not a file of the app.
- The test command runs the 29 files of phase 2 and phase 3 of `apps/storytime/__tests__/` through `HEAVY_MIN_AVAIL_MB=2500 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && ./node_modules/.bin/vitest run --maxWorkers=1 <the 29 files>'`.
- The first run after the take exits 1 with 2 failed files and 2 failed tests (303 passed of 305). The two failures name the new approval text of w01. The second run exits 0 with 29 files and 305 tests.
- `tsc --noEmit` in `apps/storytime` exits 0. ESLint exits 0 on the three changed test files.
- No build ran and no browser check ran.
- Task 3.10 stays open, because the loops approval comes later.
- Commit: `c672e6d23` (the content, the record, and the tests). The plan commit is the second one.
- [ ] 3.7 Phase check: `tsc`, lint, the changed tests, a change-quality review, and a browser check on the review copy (portrait phone, landscape phone, laptop). The browser check is evidence class "automated". It covers task 3.8 at the draft pin. Tasks 3.9 and 3.10 do not hold this checkpoint (see the exception in the amendment line).
- [b] 3.11 At-home deploy: the exact passed commit to `storytime-app` with no traffic. Upload the media to the production bucket and check it file by file. Check the tagged URL. Confirm that `STORYTIME_SHOW_DRAFT_MEDIA` is not set in the production service (`storytime-app`): read the service environment of the deployed revision and record the result. Target: 2026-11-20. deferred:daniel

## Phase 4: Teacher app

- [ ] 4.1 Teacher route group `apps/storytime/app/[locale]/teacher/` behind an environment flag that is off by default. With the flag off, every teacher route answers 404. Test: AC-9.3.
- [ ] 4.2 Week view `/<locale>/teacher/<level>/<week>`: the title, the element with its sound, the phonemic awareness skill, the tricky words, the frame, the family words with pictures, the five lessons by day, and the three materials. Test: AC-9.1.
- [ ] 4.3 Lesson flow `/<locale>/teacher/<level>/<week>/<day>`: the opening routine, then one step on each screen. A step shows the title, the minutes, the four headings, and the Easier, Harder, and Group lines. Add the review strip of the day, the Friday check on day 5, and the Thai toggle. Test: AC-9.2.
- [ ] 4.4 Media in the flow: a step with media opens the at-home player in class-screen mode (1920x1080), and the flow stays open. Test: the step keeps its place after the player closes.
- [ ] 4.6 Teacher loops in the lesson flow: the recall cards at the day opening (none on week 1 day 1), soundLoop on steps A1 to A3, blendDrill on step A4 (model, lead, and test, with bank clips), the sightWords timed card on steps A6 and D2, and the step time loopMinutes ?? minutes, under the same approval and level rule. The app shows the recall that an approved week 1 day 1 script holds. Tests: AC-13.7, AC-13.8. Target: before the Storytime release 1 delivery of 2026-12-01 (internal).
- [ ] 4.5 Phase check: `tsc`, lint, the changed tests, a change-quality review, and a browser check at 1920x1080 and on a laptop (automated). It does not cover task 4.6, which does not hold this checkpoint (see the exception in the Phase 3 amendment line).

## Phase 5: Milestone week integration

- [ ] 5.1 Media list of the milestone week from the receiving step: each file, its kind, its rule, and its check. This includes the tile labels and the home words. Send the list through the PM orchestrator to Workbooks and Forge. Name Daniel's offer to do the phoneme noise step.
  - The picture file arrives on `books[].cover` and `books[].pages[].image`. For w01 it arrives from 2026-11-06. For w02 to w07 it arrives by 2026-11-16. Source: Workbooks answers Q13 to Q15, through the PM, 2026-11-03. Daniel's picture approvals cover the app.
- [b] 5.2 Paid generation for the milestone song (new Lyria 3 Pro takes, S16), if the production side needs it. Daniel gives the go with the price. deferred:daniel
- [ ] 5.3 Stage 1 measurement scripts in `apps/storytime/scripts/checks/`. They measure loudness and true peak (rule 5.2), noise floor and clipping (rule 5.3), and the edges of each word cut (rule 10.2). They also check the size and type of each file. Each script fails a broken copy before it counts. Tests: AC-11.1, AC-6.2, AC-7.2, AC-10.1.
- [ ] 5.4 Stage 2 pre-check runner and one rubric for each kind (word cut, phoneme, song, video, picture, book audio). Calibrate on the known bad files (BA1 "Hello", `04-n.mp3`, C1W2 cut 1, the "One sun" thumbnail) and one file that Daniel passed. Name the model and its price, and log them in the cost ledger before each run. Test: AC-11.2.
- [ ] 5.5 Receive the milestone media at the handed-off commits. Run stages 1 and 2. Send each failure back through the PM orchestrator with the reason and the time in the file. Tests: AC-6.3, AC-7.3, AC-10.2.
- [ ] 5.6 Review copy on a local server on the office network with the milestone week and local media files. The agent side opens, plays, and checks every part before the page goes to Daniel (rule 6.5). Record the URL and the commit. The review copy sets `STORYTIME_SHOW_DRAFT_MEDIA=1`, so the draft parts show (spec FR-5).
- [ ] 5.7 Live review page with the five items of FR-12: the teacher app (week view and one lesson day), the at-home entry page, the read-along, the decodable, and the song.

## Phase 6: Daniel's milestone judgment

- [b] 6.1 Daniel judges the five items on the review page, with the sound and touch checks on a real iPhone and a low-cost Android phone. A section without an answer is open. AC-12.1. deferred:daniel
- [ ] 6.2 Fix each finding from Daniel. Repeat stages 1 and 2 for each changed file. Put the changed items in a new page section.
- [b] 6.3 Deploy the teacher app: the exact passed commit to `storytime-app` with no traffic. Upload the media to the production bucket and check it file by file. Check the tagged URL. The at-home deploy is task 3.11. deferred:daniel
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

Estimated tasks: 53 (Phase 1: 6, Phase 2: 7, Phase 3: 12, Phase 4: 6, Phase 5: 7, Phase 6: 5, Phase 7: 4, Phase 8: 6).
