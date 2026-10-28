# Implementation Plan: Security upgrade — Next.js, React, sharp and the critical and high npm fixes

> **Track ID:** `security_upgrade_20261026` · **Spec:** [spec.md](./spec.md) · **Audit:** [audit-2026-10-26.md](./audit-2026-10-26.md)
> **Request:** Daniel, 2026-10-26: "Somebad CVEs came out on NePM this week. We need an audit and update with redeploy ASAP." Assignment A-21 of the PM orchestrator.
> **Due:** 2026-10-27.

## Rules for this plan

- Markers: `[ ]` pending, `[~]` in progress, `[x]` done, and `[b] … deferred:<owner>` at a human gate.
- Each task line names its acceptance criterion in the form `Test: AC-n`.
- Each task follows `measure/workflow.md`: the test comes first, then the code, then one commit with `(track_id: security_upgrade_20261026)`. The commit header is 100 characters or less.
- Every heavy command runs through `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`. The script takes the shared lock, so one heavy job runs at a time. Vitest runs with `--maxWorkers=1`.
- The branch name is `chore/security-upgrade-2026-10`. The branch starts from `master`.
- Pathspec commits only. The command never uses `git add -A`, `git commit -a`, `git stash` or `git reset`. Other sessions commit in this tree.
- No push, no deploy, no Cloud Build job, no `gcloud` command.
- The track changes no Dockerfile and no Cloud Build file.

## Phase 0: The audit (done on 2026-10-26)

- [x] 0.1 Run `pnpm audit --json` from the repository root. Record the totals: 8 critical, 93 high, 91 moderate, 13 low, 0 info. Test: the totals in [audit-2026-10-26.md](./audit-2026-10-26.md) §1.1.
- [x] 0.2 Fetch the Next.js blog post of 2026-10-14. Quote the fixed versions 16.4.1 (Active LTS) and 15.5.28 (Maintenance LTS). Record that the page loads. Test: audit §2.1.
- [x] 0.3 Read the two upstream React advisories. Record the patched versions 19.0.9, 19.1.10, 19.2.9 and 19.3.1 for the `react-server-dom-*` family. Test: audit §3.
- [x] 0.4 Record the locked version of `sharp`, the three sharp advisories and the fixed version 0.35.5. Test: audit §4.
- [x] 0.5 Check the lockfile against eight public lists of malicious releases. One list holds the 300 npm malware advisories of the GitHub Advisory Database for October 2026. Record no hit. Test: audit §5.
- [x] 0.6 Record where `vinext` 0.2.0 is used, its advisories and the latest version 1.3.1. Test: audit §6.
- [x] 0.7 Record the Node 22 security releases of October 2026 and the base image of each Dockerfile. Test: audit §7.
- [x] 0.8 List the MAJOR bumps with the reason they stay out of scope. Test: audit §8.
- [x] 0.9 List every Cloud Run service. Give its app folder, its Dockerfile, its Cloud Build file and its use of `next`, `sharp` and `vinext`. Test: audit §9.

## Phase 1: Version guard and upgrade

- [x] 1.1 Write the failing version-guard test. It reads `pnpm-lock.yaml` as data and checks the locked version of each package in the guard list. The guard list holds the advisory ID, the package name and the fixed version. The failure message names the advisory, the locked version and the fixed version. The test does not run `pnpm audit`. Test: AC-1. (fbe6c9e1d, 944dbca07, 44da1f87a, b5245779c)
- [x] 1.2 Run the version-guard test against the current lockfile. Record the failure list: `next` 16.2.9, `react` 19.2.7, `react-dom` 19.2.7, `sharp` 0.34.5, `handlebars` 4.7.9, `@sentry/nextjs` 10.59.0, `vite` 8.1.0, `axios` 1.18.0, `nanoid` 5.1.15, `postcss` 8.5.15 and 8.4.31, `undici` 7.28.0, `zod` 4.4.3. The test must fail with a non-zero exit. Test: AC-1. (fbe6c9e1d, 944dbca07, 44da1f87a, b5245779c)

  Evidence — Red run, exit_code=1. Command: `pnpm exec vitest run --config vitest.config.ts --maxWorkers=1 tests/security-upgrade-version-guard.test.ts` through `heavy-run.sh`. phase_base_sha=24471e25a. The version-guard test failed on 35 advisory floors. The minimum set that the test strategy names is present. The overrides and catalog assertions failed as they must. The parser refutation fixtures and the guard-list checks passed (16 passed, 3 failed, total 19). This is not a pass. Full list, locked → fixed:
    - next 16.2.9 → 16.4.1
    - react 19.2.7 → 19.2.9
    - react-dom 19.2.7 → 19.2.9
    - sharp 0.34.5 → 0.35.5
    - handlebars 4.7.9 → 4.7.10
    - @sentry/nextjs 10.59.0 → 10.75.2
    - vite 8.1.0 → 8.1.6
    - axios 1.18.0 → 1.20.0
    - nanoid 5.1.15 → 5.1.16
    - nanoid 3.3.14 → 3.3.18
    - postcss 8.4.31 → 8.5.18
    - postcss 8.5.15 → 8.5.18
    - undici 7.28.0 → 7.30.1
    - zod 4.4.3 → 4.6.6
    - @fastify/busboy 3.2.0 → 3.2.1
    - @grpc/grpc-js 1.14.4 → 1.14.5
    - @opentelemetry/exporter-prometheus 0.57.2 → 0.217.0
    - @opentelemetry/sdk-node 0.57.2 → 0.217.0
    - @xmldom/xmldom 0.9.10 → 0.9.12
    - brace-expansion 1.1.15 → 1.1.20
    - brace-expansion 2.1.1 → 2.1.6
    - brace-expansion 5.0.6 → 5.0.11
    - browserslist 4.28.2 → 4.28.7
    - compression 1.8.1 → 1.8.2
    - extract-zip 2.0.1 → 2.0.2
    - fast-uri 3.1.2 → 3.1.7
    - fast-xml-parser 5.7.3 → 5.10.1
    - fast-xml-parser 5.9.3 → 5.10.1
    - follow-redirects 1.16.0 → 1.16.1
    - image-size 2.0.2 → 2.0.3
    - ip-address 10.2.0 → 10.3.1
    - js-yaml 3.14.2 → 3.15.2
    - js-yaml 4.2.0 → 4.3.2
    - source-map-js 1.2.1 → 1.2.2
    - url-regex 5.0.0 → 5.0.1
  Overrides assertion failed: next 16.2.9 → 16.4.1, react 19.2.7 → 19.2.9, react-dom 19.2.7 → 19.2.9, vite 8.1.0 → 8.1.6. Catalog assertion failed: sharp ^0.34.5 → ^0.35.5.

  Amendment r2: two OpenTelemetry entries moved out of the floor list. `@opentelemetry/sdk-node` and `@opentelemetry/exporter-prometheus` were floored at 0.217.0 as a MINOR, but 0.57.2 → 0.217.0 is a MAJOR (the OpenTelemetry 2 migration). `apps/science-advantage/package.json:50` declares `@opentelemetry/sdk-node` `^0.57.0`; 0.217.0 sits outside that 0.x caret range. This is the same migration as `@opentelemetry/propagator-jaeger` 1.30.1 → 2.9.0, which spec §6 already keeps open. Both entries now live in `OPEN_MAJORS` (advisory GHSA-q7rr-3cgh-j5r3, locked 0.57.2, fixed 0.217.0, reason "OpenTelemetry 2 migration, spec §6"). No other floor has this defect: `sharp` 0.34.5 → 0.35.5 uses the catalog range change of plan 1.5, not a parent major, and every other floor is a patch or a same-major minor. New floor count: 33 (was 35). The RED run still exits non-zero.

  Amendment r3/r4: r3 (44da1f87a) allowed same-line exact override pins. r4 (b5245779c) moved `extract-zip` and `url-regex` to NO_FIX_AVAILABLE. The floor count is now 31 (35 at r1, 33 after r2). The "35" figure above is the r1 run.
- [x] 1.3 Create the branch `chore/security-upgrade-2026-10` from `master`. Test: the branch exists and starts from the current `master` commit. (7387c4876)

  Evidence — command: `git branch --show-current && git merge-base master HEAD`; exit_code=0. Branch: `chore/security-upgrade-2026-10`. Branch base: `a64616a4d0a71497cfcdedfee1d55d21146833b4`. implementation_sha=7387c4876076c2d5338a611ffd62ef1184f7a001.
- [x] 1.4 Change the `overrides` block of `pnpm-workspace.yaml`: `next` 16.2.9 to 16.4.1, `react` 19.2.7 to 19.2.9, `react-dom` 19.2.7 to 19.2.9, `vite` 8.1.0 to 8.1.6. Test: AC-2. (7387c4876)

  Evidence — command: GREEN_CMD in task 1.8; exit_code=0. The four override values match the contract. implementation_sha=7387c4876076c2d5338a611ffd62ef1184f7a001.
- [x] 1.5 Change the `catalog` block of `pnpm-workspace.yaml`: `sharp` `^0.34.5` to `^0.35.5`. Test: AC-2. (7387c4876)

  Evidence — command: GREEN_CMD in task 1.8; exit_code=0. The catalog holds `sharp: ^0.35.5`. No other catalog range changed. implementation_sha=7387c4876076c2d5338a611ffd62ef1184f7a001.
- [x] 1.6 Change the `next`, `react` and `react-dom` entries in each `package.json` that declares them directly. The list of files follows. Test: AC-2. (7387c4876)

  `apps/accounting`, `apps/accounts`, `apps/activity-vinext-fixture`, `apps/advantage-games`, `apps/codecamp-advantage`, `apps/marketing`, `apps/primary-advantage`, `apps/reading-advantage`, `apps/sales-advantage`, `apps/science-advantage`, `apps/storytime`, `apps/workbooks`, `apps/www-reading-advantage`, `packages/activity-react`, `packages/activity-runtime`, `packages/activity-tutorial`, `packages/advantage-play-kit`, `packages/advantage-play-kit-3d`, `packages/api`, `packages/auth-client`, `packages/ui`, `packages/utils`.

  Evidence — command: GREEN_CMD in task 1.8; exit_code=0. Every discovered direct declaration matches its override. `activity-runtime` and `activity-tutorial` declare none of these packages. implementation_sha=7387c4876076c2d5338a611ffd62ef1184f7a001.
- [x] 1.7 Refresh the lockfile so every transitive package in section 10.2 of the audit reaches its fixed version. The `overrides` block, the `catalog` block, `nodeLinker: hoisted` and `minimumReleaseAgeExclude` stay unchanged. Test: AC-2, AC-3. (7387c4876)

  Evidence — command: GREEN_CMD in task 1.8; exit_code=0. Every published floor passes. Red r4 moved the two unpublished floors to `NO_FIX_AVAILABLE`. implementation_sha=7387c4876076c2d5338a611ffd62ef1184f7a001.

  Added override: `compression: 1.8.2`. `serve@14.2.6` pins 1.8.1. Added override: `image-size: 2.0.3`. `vinext@0.2.0` pins 2.0.2. Added override: `@xmldom/xmldom: 0.9.12`. `speech-rule-engine@4.1.4` pins 0.9.10.

  Release-age deviation: `speech-rule-engine` 4.1.5 was published 2026-10-26. The supply-chain policy blocked that parent update. The `@xmldom/xmldom` override applies the patch instead.

  Install deviation: the first run completed `pnpm install --no-frozen-lockfile` in 4m 33.9s. The pnpm process then hung, and the orchestrator killed it. The first run restored `@next/swc-linux-x64-gnu` 16.4.1 after its retry.

  Update deviation: `pnpm update extract-zip url-regex` exited 1 after a Puppeteer `ECONNRESET`. It kept both versions. The later install attempt rejected the unpublished `extract-zip` 2.0.2. Red r4 corrected both no-fix contracts. The invalid override lines were removed.

  Transitive major crossings of the lockfile refresh: `@nodable/entities` 2.2.0 → 3.1.0, `ajv-formats` 2.1.1 → 3.0.1, `dotenv` 16.6.1 → 17.4.2, `is-unsafe` 1.0.1 → 2.0.2, plus 19 0.x-minor crossings (sharp family and transitive). No manifest edit caused them. Phase 2 builds and tests cover them. Source: `git diff 24471e25a..ab48652f5 -- pnpm-lock.yaml`, read only, verified 2026-10-27. All four versions match that diff.
- [x] 1.8 Run the version-guard test again. It must pass. Test: AC-1, AC-2, AC-3. (7387c4876)

  Evidence — GREEN_CMD: `bash heavy-run.sh -c 'timeout 900 pnpm exec vitest run --config vitest.config.ts --maxWorkers=1 tests/security-upgrade-version-guard.test.ts'` (the wrapper takes the shared lock); exit_code=0. Result: 30 passed, 0 failed. implementation_sha=7387c4876076c2d5338a611ffd62ef1184f7a001.

  Model deviation: the first Green model stopped on a quota error before a commit. Green continued on `kimi-code-plan-cn/k3.1-pro`. Red r3 and r4 used `xai/grok-4.7`. The orchestrator kept this Kimi session for context. `ra-quota pick green` listed `coding-plan/glm-5.3-flash` first, but Kimi was a valid route.
- [x] 1.9 Run `pnpm audit --json` again. The report must hold zero critical advisories and zero high advisories for the packages in scope. The report names the MAJOR bumps of spec section 6. Record the report in the plan. Test: AC-4. (7387c4876)

  Evidence — command: `bash heavy-run.sh -c 'timeout 600 pnpm audit --json > audit-after.json; echo AUDIT_EXIT=$?'` (run in this worktree; output saved as `audit-after.json`); AUDIT_EXIT=1. The exit code records the remaining advisories. Totals: critical=0, high=15, moderate=45, low=5, info=0. in_scope_critical=0, in_scope_high=0. implementation_sha=7387c4876076c2d5338a611ffd62ef1184f7a001.

  Open majors in the report: `@faker-js/faker` GHSA-qxc2-j82w-r537; `@opentelemetry/exporter-prometheus` and `@opentelemetry/sdk-node` GHSA-q7rr-3cgh-j5r3; `@opentelemetry/propagator-jaeger` GHSA-45rx-2jwx-cxfr; `basic-ftp` GHSA-c475-qrg2-pj4r; `next-mdx-remote` GHSA-g4xw-jxrg-5f6m; `zod` 3.x GHSA-mrhx-c7xc-m3w5.

  Open majors in the report: `nodemailer` GHSA-2x7j-588g-ccc2, GHSA-p6gq-j5cr-w38f, GHSA-r7g4-qg5f-qqm2, GHSA-rcmh-qjqh-p98v, and GHSA-v53p-9fqp-m79j.

  No fix available: `extract-zip` GHSA-7pqw-9j4j-h8q3 and GHSA-jmr9-qjv8-65gv; `url-regex` GHSA-v4rh-8p82-6h5w. Their first patched versions are null. Release-age blocked findings: none in this report. Unclassified critical or high findings: none.

  Registry evidence for the no-fix class: `pnpm audit --json` still prints patched_versions ">=2.0.2" for `extract-zip` and ">=5.0.1" for `url-regex`. No such release exists. The GitHub advisory API (read 2026-10-27) gives first_patched_version null for GHSA-7pqw-9j4j-h8q3 and GHSA-jmr9-qjv8-65gv (`<= 2.0.1`) and for GHSA-v4rh-8p82-6h5w (`<= 5.0.0`). The npm registry latest is extract-zip 2.0.1 (2020-06-10) and url-regex 5.0.0 (2019-04-21).

  Open-major register: Zod 3.x, `nodemailer`, `next-mdx-remote`, `vinext`, `@opentelemetry/propagator-jaeger`, `@faker-js/faker`, `basic-ftp`, `@opentelemetry/sdk-node`, and `@opentelemetry/exporter-prometheus`. The `js-yaml` lines moved to 3.15.2 and 4.3.2.

  Coverage boundary (Review B BSEC-01): the live Cloud Run service `reading-advantage-web` builds from the legacy repository Reading-Advantage-Thailand/reading-advantage, not from this monorepo. The Cloud Build trigger `Main` in the GCP project `reading-advantage` deploys that repository, branch `main` (orchestrator record of 2026-10-09; not re-checked today; no `gcloud` command allowed). `apps/reading-advantage/Dockerfile:68-81` runs `npm ci --legacy-peer-deps` and consumes no pnpm lockfile. `apps/reading-advantage/cloudbuild.yaml` selects the absent `./web` context. This track claims NO coverage for the live Reading service. The monorepo upgrade covers `apps/reading-advantage` for the future Reading cutover only. The live service needs a separate patch in the legacy repository. Route it to the PM as a separate assignment.

  Legacy clone evidence (read-only, 2026-10-27; local clone HEAD `a2b38df9`; it may lag origin; no fetch): the app lives under `web/` with `web/package-lock.json` (npm, lockfileVersion 3). Locked versions: `next` 15.5.7, `react` 19.2.1, `react-dom` 19.2.1, `sharp` 0.33.5. Below this track's guard floor: `next` 15.5.7 (floor 16.4.1); `react` 19.2.1 (floor 19.2.9); `react-dom` 19.2.1 (floor 19.2.9); `handlebars` 4.7.8 (floor 4.7.10); `axios` 1.13.2 (1.20.0); `nanoid` 3.3.11 (3.x floor 3.3.18); `postcss` 8.5.6, with a `next`-nested copy 8.4.31 (floor 8.5.18); `sharp` 0.33.5, with a `next`-nested copy 0.34.5 (floor 0.35.5); `@fastify/busboy` 3.2.0 (3.2.1); `@grpc/grpc-js` 1.9.15, with a `google-gax`-nested copy 1.14.2 (1.x floor 1.14.5); `brace-expansion` 1.1.12, with a `@typescript-eslint/typescript-estree`-nested copy 2.0.2 (1.x floor 1.1.20; 2.x floor 2.1.6); `browserslist` 4.28.1 (4.28.7); `fast-xml-parser` 5.2.5, with an `@google-cloud/storage`-nested copy 4.5.3 (5.x floor 5.10.1; the guard list has no 4.x row); `follow-redirects` 1.15.11 (1.16.1); `js-yaml` 4.1.1, with an `@istanbuljs/load-nyc-config`-nested copy 3.14.2 (4.x floor 4.3.2; 3.x floor 3.15.2); `source-map-js` 1.2.1 (1.2.2). `undici` 6.19.7 sits on the 6.x line. The guard list holds one `undici` row with line prefix `7.` (floor 7.30.1) and no 6.x row, so this track gives no 6.x floor for `undici` (Review B BSEC-07). `zod` 3.25.76 keeps GHSA-mrhx-c7xc-m3w5 open (the same exposure as BSEC-03). `nodemailer` 6.10.1 keeps its five GHSAs open (the same register as this track). `@sentry/nextjs`, `vite`, `compression`, `fast-uri`, `@xmldom/xmldom`, `image-size` and `ip-address` do not appear in that lockfile. In short, the live service sits below nearly every guard floor of this track.

  Review B round 2 fixes (BSEC-06, BSEC-07): spec FR-8 and AC-6 now define the "NOT COVERED by this commit" entry, and tasks 3.1, 3.2 and 3.5 carry the Reading coverage boundary. The Legacy clone evidence paragraph above is the verified below-floor list, and the `undici` 6.x note follows BSEC-07. fix_commit=9b2bf1aa9.

  Review B round 3 fixes (BSEC-08, BSEC-09): the P3 strategy now requires nine covered entries at orders 1 through 9 and a not-covered `reading-advantage-web` entry with its reason, legacy image source and patch owner. The next/image check applies only to `primary-advantage-app`. The legacy below-floor list now includes `next` 15.5.7 (floor 16.4.1), `react` 19.2.1 (floor 19.2.9) and `react-dom` 19.2.1 (floor 19.2.9). Versions were read from the legacy lockfile; floors were read from `tests/security-upgrade-guard-list.ts`. The targeted version-guard command exited 0: 30 passed, 0 failed. `git diff --check` exited 0. fix_commit=21197eb2a8541e15ec4b6b43c1b1a2517f4b5955.

  Routing deviation: Strategy owns BSEC-08. The orchestrator routed its text fix through Green. The GLM quota is empty until 00:47 ICT, so Green used Luna.
- [x] 1.10 Check that the refreshed lockfile holds no package version that a public list of malicious releases names. The list set is the one in audit section 5.1. Test: spec section 7. (7387c4876)

  Evidence — compared `24471e25a:pnpm-lock.yaml` with `7387c4876:pnpm-lock.yaml`. changed_name_version_pairs=185. Command: `python3 check.py` (the supply-chain checker script of this run); exit_code=0. supply_chain_hits=0. All eight sources were reachable. Results: `results.txt`.

  GitHub Advisory Database npm malware: NO_HIT. Cursor pagination fetched 868 advisories for 2026-10-01 through 2026-10-31. Socket TensorLake: NO_HIT. Socket npm author Qix: NO_HIT. eSentire Axios compromise: NO_HIT.

  Socket OpenAPI React Query Codegen: NO_HIT. Socket keyv and cacheable: NO_HIT. Unit 42 npm threat landscape: NO_HIT. Socket Mastra packages and `easy-day-js`: NO_HIT. The check compared exact names and versions. The Mastra check also covered the scope.
- [x] 1.11 Phase check. Run the version-guard test, the changed tests, the type check and the lint of the changed packages. Then run a change-quality review of the branch diff. Record the findings. Test: AC-1, AC-2, AC-3, AC-4. (0ffadb991)

  Evidence — GREEN_CMD in task 1.8 ran at `0ffadb991`; exit_code=0. Result: 30 passed, 0 failed. The phase-check scope covers the four changed packages outside Phase 2. This is the orchestrator-default scope deviation.

  Phase check — `PUPPETEER_SKIP_DOWNLOAD=true timeout 1800 pnpm turbo run check-types lint --concurrency=1` with the four package filters; PHASE_CHECK_EXIT=2. A second run added `--continue`; PHASE_CHECK_CONTINUE_EXIT=2. `activity-react` and `auth-client` passed check-types and lint. Both play-kit packages passed lint with warnings. Their check-types commands exited 2. Dependency `activity-runtime` also exited 2. Base comparison: not compared.

  Environment deviation — the first setup attempt exited 1 on Puppeteer `ECONNRESET`. The retry exited 124 after downloading Chrome. A later attempt waited on the shared lock. `PUPPETEER_SKIP_DOWNLOAD=true` completed dependency setup. The unrelated browser download was not a type-check input.

  Review — `git diff --check 24471e25a..HEAD` exited 0. The manifests, three added overrides, and lockfile match the approved scope. No Dockerfile, Cloud Build, or `.github` file changed.
  Review finding — the two play-kit type failures are not compared with the base. This review does not classify them as pre-existing. Reviews A and B remain independent. Task 2.14 holds the whole-branch change-quality review.

  Play-kit type failure — cause (orchestrator evidence, 2026-10-27, about 08:30 CST). Command: `bash heavy-run.sh -c 'timeout 1200 pnpm turbo run build --concurrency=1 --filter="@reading-advantage/advantage-play-kit^..." --filter="@reading-advantage/advantage-play-kit-3d^..." ...; tsc --noEmit -p tsconfig.json in packages/advantage-play-kit and packages/advantage-play-kit-3d'`. Result: DEPS_BUILD_EXIT=0. game-contracts and advantage-play-kit built; turbo reported "2 successful". advantage-play-kit TSC_EXIT=0 with 0 errors. advantage-play-kit-3d TSC_EXIT=0 with 0 errors. Before the build, the errors were TS2307 "Cannot find module '@reading-advantage/game-contracts'": packages/game-contracts/package.json points `types` at ./dist/index.d.ts and the fresh worktree had no dist. Base check (master checkout, old dependency versions, dist built): advantage-play-kit tsc shows 0 errors. Cause: an unbuilt workspace dependency in the fresh worktree, not the upgrade. `activity-runtime` failed only as a dependency of that task.

## Phase 2: Verification of the deployed apps

> Each command below runs through `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`. The commands run one at a time.

- [x] 2.1 `apps/accounting`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. Test: AC-5. (2f4cc036b)

  Phase 2 Red evidence — the ledger contract. The Red role wrote `tests/security-upgrade-verification-ledger.test.ts`. The Red role wrote no other file. The ledger file `measure/tracks/security_upgrade_20261026/verification-ledger.json` is absent. The Red run exits with code 1. Command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && timeout 900 pnpm exec vitest run --config vitest.config.ts --maxWorkers=1 tests/security-upgrade-verification-ledger.test.ts'`. phase_base_sha=9ee8505883cec92e87daa31f00ff71ced052dead. role_base_sha=70de5bea8f4931dcda9180c4908f20a5d5fd6987. Result: `Test Files 1 failed (1)`, `Tests 1 failed | 26 passed (27)`, exit_code=1. The one failure is the live ledger test. Its message reads `reason=ledger_file_absent searched=measure/archive/security_upgrade_20261026/verification-ledger.json measure/tracks/security_upgrade_20261026/verification-ledger.json`. The 26 fixture self-tests pass. The run holds no import error and no config error. The full output is in `measure/runs/security_upgrade_20261026/mid-red-70de5bea8.vitest.log`. This is not a pass.

  The test contract for Green. Each row holds `package`, `command`, `exit_code`, `class` and `log`. A row holds `check` when its `command` names the run and not the matrix check. A row holds `evidence` with a `source=` label when the class is not `pass`. A row holds `script_heap` and `run_heap` when the package script sets a heap. The classes are `pass`, `predates-track`, `upgrade-defect`, `not-run` and `script-absent`. The ledger must hold one row for each of the 73 matrix pairs. The count holds 40 app pairs, 28 shared package pairs and 5 check-types pairs for the packages outside the app matrix. The `script-absent` class is allowed only for the `check-types` pair of `@reading-advantage/ui` and of `@reading-advantage/utils`. Every `pass` row holds `exit_code=0` and a log under `measure/runs/security_upgrade_20261026/`. The log holds the label `exit_code=0`. A `not-run` row holds `source=timeout` with `exit_code=124`, or `source=machine_heap` with `exit_code=137`, or `source=not-run`. The heap pairs are `primary-advantage` `check-types` with `script_heap=6144`, `primary-advantage` `build` with `script_heap=4096` and `reading-advantage` `build` with `script_heap=8192`. A green ledger test does not close AC-5. The live logs close AC-5.
- [x] 2.2 `apps/accounts`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. Test: AC-5. (2f4cc036b)
- [x] 2.3 `apps/codecamp-advantage`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. Test: AC-5. Ledger: 362b64056; pass 3, predates-track 1. Worktree-root smoke test fix: 7ca3e7b7e.
- [x] 2.4 `apps/marketing`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. The build runs `vinext build`. Test: AC-5. (2f4cc036b)

  Evidence — all four commands for `accounting`, `accounts` and `marketing` have `exit_code=0` in `measure/runs/security_upgrade_20261026/p2/`. The ledger commit `2f4cc036b` records these rows.
- [x] 2.5 `apps/primary-advantage`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. Test: AC-5. Ledger: 362b64056; pass 2, predates-track 2.
- [x] 2.6 `apps/reading-advantage`: `check-types`, `lint`, `test --runInBand`, `build`. The app runs Jest for its unit tests. Test: AC-5. Ledger: 362b64056; pass 1, predates-track 3.
- [x] 2.7 `apps/sales-advantage`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. Test: AC-5. Ledger: 362b64056; pass 3, predates-track 1.
- [x] 2.8 `apps/storytime`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. Test: AC-5. Ledger: 362b64056; pass 4.
- [x] 2.9 `apps/workbooks`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. Test: AC-5. Ledger: 362b64056; pass 3, predates-track 1.
- [x] 2.10 `apps/www-reading-advantage`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. Test: AC-5. Ledger: 362b64056; pass 3, predates-track 1.
- [x] 2.11 `packages/api`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. The package holds `next` as a dev dependency. Test: AC-5. Ledger: 362b64056; pass 3, predates-track 1.
- [x] 2.12 `packages/domain`, `packages/db`, `packages/auth`, `packages/backend`, `packages/ui`, `packages/utils`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. Test: AC-5. Ledger: 362b64056; pass 19, predates-track 3, script-absent 2.
- [x] 2.13 Record every failure with its cause. A failure from this upgrade is a defect to fix. A failure that predates the track is recorded with the evidence and stays open. Test: AC-5. Ledger: 362b64056.

  Green evidence — ledger `362b64056` contains 73 matrix rows: 58 pass, 13 predates-track, 0 upgrade-defect, 0 not-run, and 2 script-absent. The 13 pre-existing rows name the failing tests or errors and the master comparison logs. Task 2.13 is complete. AC-5 stays open because some app checks fail.

  `packages/domain` build and test now exit 0. The first test run started before the domain build and could not compile its TypeScript setup; the successful build preceded the passing test run. Both rows use the labeled logs `domain-build-r4.log` and `domain-test-r4.log`. Ledger evidence: 25e0ba300.

  Codecamp test exits 1 after the worktree-root smoke assertion fix. The two remaining Phase 10 source-contract failures also occur in the master comparison. The targeted test log is `codecamp-advantage-test-green-r4.log`; the fix commit is `7ca3e7b7e`. DB tests fail on the recorded migration and schema-map contracts. Its master comparison has the same failures. Backend check-types exits 2 on TS2820 in `submissions.test.ts`; the backend master comparison has the same error. Backend tests fail on the package scaffold contract and missing PostgreSQL test credentials. The same tests fail in the master comparison. API tests fail on one router SQL assertion; the signup scan timeout passed on a targeted rerun. The same SQL assertion fails in the master comparison. These rows remain pre-existing failures.

  Sales tests fail on curriculum approval metadata, cardinality, and graph-digest assertions. The same tests fail in the master comparison. The row remains open.

  Workbooks tests fail because `packages/sales-knowledge/dist/data/evidence/release-candidate.json` is absent. Building that dependency exits 0 but does not create the expected file. The same test suites fail in the master comparison. The row remains open.

  Primary check-types and build exit 0 with the required script and run heap labels. Primary lint exits 1 with 13 errors and 864 warnings; the master run has the same error count. Primary tests exit 1 in six files. The master run has a superset of failures, including those six files. Generated `next-env.d.ts` files were restored.

  `www-reading-advantage` lint exits 1 with 146 errors and 19,212 warnings. The master run has the same error count. Reading check-types exits 134 on a JavaScript heap limit; the master run has the same failure. Reading lint exits 1 with one missing ESLint rule; the master run has the same error. Reading Jest exits 1 with two failing suites and three tests; the master run has the same failing suites. Reading build exits 0 with `script_heap=8192` and `run_heap=8192`. These app tasks satisfy amended AC-5 because the master comparisons show no new failures.

  Phase 2 inputs (Review B, nonblocking findings):
  - BSEC-05: `apps/www-reading-advantage/Dockerfile:9` prepares pnpm 8.15.8. The root manifest requests pnpm 11.8.0, and the lockfile uses format 9. Corepack can select the manifest version. Phase 2 must establish the effective installer before a redeploy claim for `www-reading-advantage`.
  - BSEC-03: the `zod` 3.25.76 runtime exposure stays with the zod 4 migration track. Phase 2 does not close GHSA-mrhx-c7xc-m3w5.
  - BSEC-04: `apps/www-reading-advantage` has no `next-mdx-remote` import in tracked source. An installed dependency is not an execution path. The redeploy doc of task 3.1 must separate the installed dependency from a demonstrated execution path.
- [x] 2.14 Phase check: the change-quality review and final `pnpm audit --json` report are complete. The adversarial test pass is complete. Test: AC-4, AC-5. (db4ced28c)

  Final audit — `pnpm audit --json` exited 1. The report is `measure/runs/security_upgrade_20261026/p2/audit-final.json`. Counts are critical 0, high 15, moderate 50, and low 6. Phase 1 counts were critical 0, high 15, moderate 45, and low 5. The high count is unchanged. The 15 open high findings are GHSA-v4rh-8p82-6h5w, GHSA-g4xw-jxrg-5f6m, GHSA-rcmh-qjqh-p98v, GHSA-45rx-2jwx-cxfr, GHSA-jmr9-qjv8-65gv, GHSA-qxc2-j82w-r537, GHSA-p6gq-j5cr-w38f, GHSA-7pqw-9j4j-h8q3, GHSA-2x7j-588g-ccc2, GHSA-v53p-9fqp-m79j, GHSA-c475-qrg2-pj4r, GHSA-r7g4-qg5f-qqm2, GHSA-q7rr-3cgh-j5r3 (two packages), and GHSA-mrhx-c7xc-m3w5. These findings remain in the open-major or no-fix classes from task 1.9. No unclassified high finding remains.

  Change-quality review — I reviewed `git diff 9ee8505883cec92e87daa31f00ff71ced052dead..3cddc9fff`. The amendment commit changes only `spec.md`, `test-strategy.md`, and `measure/tech-debt.md`. Phase 2 adds the ledger test and its data, changes Measure records, and makes one Codecamp test path assertion work in an assigned worktree. No production behavior changes in this phase diff. I found no blocking change-quality issue. Review A and Review B remain independent gates.

  Adversarial pass — the file `tests/security-upgrade-p2-adversarial.test.ts` holds 40 tests. It holds 26 attack cases. Ten cases attack the predates-track verdict of the amendment. Six cases attack the guard. Five cases attack the exit masking. Three cases attack the ledger coverage. Two cases attack the plan text. Each case runs on an in-memory fixture. Each checker also runs on the real ledger, the real logs, the real tech-debt file and git. The test commit is `db4ced28c`. The run of the four security test files passed with 148 tests and exit code 0.

  Adversarial verdict — no attack exposes a defect in the ledger or the guard. The 13 predates-track rows each hold a non-zero exit code, a master log under the run path with a `master_sha=` label, the same failing tests or the same labeled error count on both sides, and an owner in `measure/tech-debt.md`. The master commits `280388e2` and `98ff25fe` each hold the pre-upgrade versions `next` 16.2.9 and `sharp` 0.34.5. The ledger holds one row for each of the 73 matrix pairs, no duplicate row and no row outside the matrix. Each of the 58 pass rows holds one `exit_code=0` label and no failure summary. The plan names the class counts and holds no claim that every check passes. The guard fails two copies of one package where one copy sits below the floor, a peer suffixed key, an alias key, and a workspace file that lost a required pin.

  Adversarial limitation — the guard reads the package key before the last at sign. The key `next@npm:next@16.2.9` names the package `next@npm:next`, so an aliased copy stays outside the floor of next when a good copy is also present. The workspace override pins next to the exact version 16.4.1, so pnpm cannot write this key form. The limitation is nonblocking.

## Phase 3: Redeploy list and merge

- [x] 3.1 Write `docs/deployment/security-upgrade-2026-10.md`. It names each of the ten Cloud Run services. Each covered entry gives the app folder, the commit, the order of the deploy and one check after the deploy. The order puts the lowest-traffic covered services first. `primary-advantage-app` goes last among the covered services, because it carries the most traffic. `reading-advantage-web` is "NOT COVERED by this commit; do not deploy apps/reading-advantage to this service". Its entry gives the reason, the source of its live image, and the owner of its patch. Its entry gives no commit, no order, and no check. Test: AC-6. (0cd9d88b5)

  Phase 3 Red evidence — the redeploy list contract. The Red role wrote `tests/security-upgrade-redeploy-list.test.ts`. The Red role wrote no other file. The list file `docs/deployment/security-upgrade-2026-10.md` is absent. The Red run exits with code 1. Command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && timeout 900 pnpm exec vitest run --config vitest.config.ts --maxWorkers=1 tests/security-upgrade-redeploy-list.test.ts'`. phase_base_sha=f44e9bc568cb099546381c9f7ff141f411d6aba7. role_base_sha=f44e9bc568cb099546381c9f7ff141f411d6aba7. test_sha=e0333d70662598aaad6e2917f07eec4b69897c62. Result: `Test Files 1 failed (1)`, `Tests 1 failed | 35 passed (36)`, exit_code=1. The one failure is the live list test. Its message reads `reason=doc_file_absent path=docs/deployment/security-upgrade-2026-10.md`. The 35 fixture tests and the three live Git tests pass. The run holds no import error and no config error. The full output is in `measure/runs/security_upgrade_20261026/mid-red-f44e9bc56.vitest.log`. This is not a pass.

  The test contract for Green. The file path is `docs/deployment/security-upgrade-2026-10.md`. The file holds one markdown table row per service. The row starts with the service name. The nine covered rows carry the labels `app=`, `commit=`, `order=` and `check=`. The covered order values are the integers 1 through 9, each one time. The service `primary-advantage-app` holds the highest order. The covered `commit=` holds at least 7 hex digits. The value `HEAD` and the value `latest` fail. The commit must be an ancestor of `HEAD` and must change `pnpm-lock.yaml`. The covered `check=` names one path. The value must hold a slash. The tenth row names `reading-advantage-web`. That row holds the label `reason=` and the label `owner=`. It holds the mark `NOT COVERED by this commit`. It holds the legacy path `web/Dockerfile` and the live base image `node:20.18`. That row holds no `app=apps/reading-advantage`, no `commit=`, no `order=` and no `check=`. The file holds the string `node:22-alpine` and the string `node:20.18`. The file holds no `git push` and no `gcloud builds submit`. The check uses the exact strings. A sentence that forbids a command still fails the test. A row may carry extra labels such as `live=` or `precondition=`. The test accepts every extra label. The commit check runs as a local Git command. The test reads no network.

  Red model deviation — the role table names `openai/gpt-6.1-sol#high` for the Red role. This run uses `minimax-cn-coding-plan/MiniMax-M3.1-Flash`. The pick follows the ra-quota rule at 00:42 ICT on 2026-10-29. Green for this phase uses a family other than MiniMax.
- [x] 3.2 The file records the runtime note: `node:22-alpine` needs no change, a rebuild pulls Node 22.23.4. It records the open item of `apps/reading-advantage/Dockerfile` on `node:20.18`. For `reading-advantage-web`, the file records that the live `node:20.18` image comes from the legacy repository file `web/Dockerfile` line 2. Legacy clone verification (read-only, 2026-10-27, HEAD `a2b38df9`): line 2 of `web/Dockerfile` is `FROM node:20.18`. Test: AC-6. (0cd9d88b5)

  Green evidence — document commit `0cd9d88b559ec13ba118d304b5ad211892e2ec24`; sync merge commit `3a10dd68ca6cb36301f1a9246b22c7e9685a7040`. The targeted redeploy-list command exited 0 with 36 passed, 0 failed. Check 4a exited 0 with 148 passed, 0 failed after the document commit. The document lists all ten services and records the specified order, live labels, traffic behavior, checks, runtime note, and workflow trigger paths. No service change is reported.

  AC-5 comparison — Storytime tests: worktree exit_code=1, 16 failed and 21 passed; master exit_code=1, 16 failed and 21 passed. Read-along tests: worktree exit_code=1, 3 failed and 93 passed; master exit_code=1, 3 failed and 93 passed. All 19 failures are Storytime Phase 2 Red tests (`phase2-blend`, `phase2-content`, `phase2-contract`, and `phase2-timing`) with matching test names on both sides. Class: `predates-track`. Reason: Storytime P2 Red tests wait for the Workbooks week files (Storytime task 2.1). Owner: track `storytime_app_rebuild_20261025`. The master comparison logs are `measure/runs/security_upgrade_20261026/p3/storytime-test-master.log` and `measure/runs/security_upgrade_20261026/p3/read-along-test-master.log`; both record `master_sha=713c4cfdf0cdddc277e68585e0850fc612300bba`.

  Task 3.3 review inputs applied: (1) every covered row uses sync merge commit `3a10dd68ca6cb36301f1a9246b22c7e9685a7040`, which is an ancestor and changes `pnpm-lock.yaml`; use master at that commit or later, after Daniel's go. (2) The order is www-reading-advantage, accounting, accounts, workbooks, sales-advantage, storytime-app, marketing, codecamp-advantage, then primary-advantage-app. The www workflow trigger paths are cited because the lockfile change starts it. (3) Primary and Storytime live revision labels and preconditions are recorded without inventing other live revisions. (4) Each covered row names one GET path and its source file; the Primary image path names an existing public file. (5) The legacy Reading service is not covered; its legacy image source and patch owner are recorded without covered-row labels. (6) The Node runtime note is recorded. (7) The document avoids the forbidden command strings and does not claim that a service changed.

  Follow-up ownership — the plan leaves the version-guard CI gap from `test-strategy.md` line 708 with the Monorepo session, a follow-up chore track after A-21. This is the default pending a PM answer. After Reviews A and B pass, master moves by a fast-forward to the reviewed branch HEAD.
- [x] 3.3 Review the redeploy list with the Monorepo orchestrator. Record the review. Test: AC-6. (863912dc1)

  Review record — the Monorepo orchestrator reviewed the redeploy list on 2026-10-29. Fix commit: `863912dc12b25d55e1a111eaedd11d21e57845a5`. The targeted test passed with 36 tests. The four security test files passed with 148 tests. No service is deployed.

  Seven review inputs from round 1 applied: (1) all covered rows name merge commit `3a10dd68ca6cb36301f1a9246b22c7e9685a7040`; use that commit or a later master commit that contains it, only after Daniel's go. (2) www-reading-advantage is first because the master push starts its CD workflow; other services follow by lowest traffic; Primary stays last. (3) Rows include traffic and live labels, plus the Primary and Storytime preconditions. (4) Each covered check names one GET path, expected status, and source; the Primary check uses its existing public image. (5) Reading is not covered, and the legacy image source and patch owner are named. (6) The Node runtime note records both base-image lines. (7) The document avoids forbidden command strings and makes no service-deployment claim.

  Six round-1 review findings fixed: (1) The table header had two cells while covered rows had four; the header now has four columns. (2) Covered checks lacked expected HTTP statuses; all nine now give statuses and source files. (3) The Storytime check used a path that did not show the Phase 1 404; it now uses `/th/st/2/1`, states status 404, and records the live-build traffic precondition. (4) The Primary precondition omitted the Next version difference; it now cites `next: 16.2.9` at `9b05216d7:pnpm-workspace.yaml:114` and `next: 16.4.1` at `3a10dd68c:pnpm-workspace.yaml:118`, and asks Daniel to choose the source. (5) The first review bullet gave a wrong order reason; it now names the immediate www workflow, then lower traffic, then Primary last. (6) The Primary image URL did not cite Next defaults; it now cites Next 16.4.1 defaults for width 640 and quality 75. The app config sets only `images.remotePatterns`.

  Doctor note — `measure/doctor.sh` exits 1 because `measure/automation-supervisor.py` is absent. Commit `49d6aeaa4` removed it before `phase_base_sha=f44e9bc56`, and master also lacks it. This is pre-existing and does not block this track.
- [ ] 3.4 Merge the branch `chore/security-upgrade-2026-10` into the local `master`. The merge needs no push. Test: AC-7. (deferred:fast-forward-after-reviews)
- [ ] 3.5 Report to the PM orchestrator. Give the commit SHA of the merge, the advisory table, the supply chain result, the MAJOR list and the deployed app list. The deployed app list covers the nine covered services only. Add the legacy Reading patch as a separate assignment. That assignment carries the verified list of legacy versions below the guard floors (the Legacy clone evidence paragraph of task 1.9). Test: AC-7. (deferred:pm-report-after-merge)

### Phase 3 merge rule

The merge into the local `master` happens after the Phase 1 and Phase 2 checks pass. The reviews must find no open critical or high defect. The merge stops and reports to Daniel when a check fails.

## Out of scope

- Push, deploy, Cloud Build job, `gcloud` command.
- Any change to a Dockerfile, a Cloud Build file or a Cloud Run service.
- The MAJOR bumps of spec section 6.
- The base image change of `apps/reading-advantage/Dockerfile`. It waits for Daniel's decision.
