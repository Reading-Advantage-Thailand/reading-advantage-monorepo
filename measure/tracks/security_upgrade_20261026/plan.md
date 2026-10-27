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

  Evidence — GREEN_CMD: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && timeout 900 pnpm exec vitest run --config vitest.config.ts --maxWorkers=1 tests/security-upgrade-version-guard.test.ts'`; exit_code=0. Result: 30 passed, 0 failed. implementation_sha=7387c4876076c2d5338a611ffd62ef1184f7a001.

  Model deviation: the first Green model stopped on a quota error before a commit. Green continued on `kimi-code-plan-cn/k3.1-pro`. Red r3 and r4 used `xai/grok-4.7`. The orchestrator kept this Kimi session for context. `ra-quota pick green` listed `coding-plan/glm-5.3-flash` first, but Kimi was a valid route.
- [x] 1.9 Run `pnpm audit --json` again. The report must hold zero critical advisories and zero high advisories for the packages in scope. The report names the MAJOR bumps of spec section 6. Record the report in the plan. Test: AC-4. (7387c4876)

  Evidence — command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && timeout 600 pnpm audit --json > /tmp/opencode/audit-after.json; echo AUDIT_EXIT=$?'`; AUDIT_EXIT=1. The exit code records the remaining advisories. Totals: critical=0, high=15, moderate=45, low=5, info=0. in_scope_critical=0, in_scope_high=0. implementation_sha=7387c4876076c2d5338a611ffd62ef1184f7a001.

  Open majors in the report: `@faker-js/faker` GHSA-qxc2-j82w-r537; `@opentelemetry/exporter-prometheus` and `@opentelemetry/sdk-node` GHSA-q7rr-3cgh-j5r3; `@opentelemetry/propagator-jaeger` GHSA-45rx-2jwx-cxfr; `basic-ftp` GHSA-c475-qrg2-pj4r; `next-mdx-remote` GHSA-g4xw-jxrg-5f6m; `zod` 3.x GHSA-mrhx-c7xc-m3w5.

  Open majors in the report: `nodemailer` GHSA-2x7j-588g-ccc2, GHSA-p6gq-j5cr-w38f, GHSA-r7g4-qg5f-qqm2, GHSA-rcmh-qjqh-p98v, and GHSA-v53p-9fqp-m79j.

  No fix available: `extract-zip` GHSA-7pqw-9j4j-h8q3 and GHSA-jmr9-qjv8-65gv; `url-regex` GHSA-v4rh-8p82-6h5w. Their first patched versions are null. Release-age blocked findings: none in this report. Unclassified critical or high findings: none.

  Registry evidence for the no-fix class: `pnpm audit --json` still prints patched_versions ">=2.0.2" for `extract-zip` and ">=5.0.1" for `url-regex`. No such release exists. The GitHub advisory API (read 2026-10-27) gives first_patched_version null for GHSA-7pqw-9j4j-h8q3 and GHSA-jmr9-qjv8-65gv (`<= 2.0.1`) and for GHSA-v4rh-8p82-6h5w (`<= 5.0.0`). The npm registry latest is extract-zip 2.0.1 (2020-06-10) and url-regex 5.0.0 (2019-04-21).

  Open-major register: Zod 3.x, `nodemailer`, `next-mdx-remote`, `vinext`, `@opentelemetry/propagator-jaeger`, `@faker-js/faker`, `basic-ftp`, `@opentelemetry/sdk-node`, and `@opentelemetry/exporter-prometheus`. The `js-yaml` lines moved to 3.15.2 and 4.3.2.
- [x] 1.10 Check that the refreshed lockfile holds no package version that a public list of malicious releases names. The list set is the one in audit section 5.1. Test: spec section 7. (7387c4876)

  Evidence — compared `24471e25a:pnpm-lock.yaml` with `7387c4876:pnpm-lock.yaml`. changed_name_version_pairs=185. Command: `python3 /tmp/opencode/security-supply-chain-20261027/check.py`; exit_code=0. supply_chain_hits=0. All eight sources were reachable. Results: `/tmp/opencode/security-supply-chain-20261027/results.txt`.

  GitHub Advisory Database npm malware: NO_HIT. Cursor pagination fetched 868 advisories for 2026-10-01 through 2026-10-31. Socket TensorLake: NO_HIT. Socket npm author Qix: NO_HIT. eSentire Axios compromise: NO_HIT.

  Socket OpenAPI React Query Codegen: NO_HIT. Socket keyv and cacheable: NO_HIT. Unit 42 npm threat landscape: NO_HIT. Socket Mastra packages and `easy-day-js`: NO_HIT. The check compared exact names and versions. The Mastra check also covered the scope.
- [x] 1.11 Phase check. Run the version-guard test, the changed tests, the type check and the lint of the changed packages. Then run a change-quality review of the branch diff. Record the findings. Test: AC-1, AC-2, AC-3, AC-4. (0ffadb991)

  Evidence — GREEN_CMD in task 1.8 ran at `0ffadb991`; exit_code=0. Result: 30 passed, 0 failed. The phase-check scope covers the four changed packages outside Phase 2. This is the orchestrator-default scope deviation.

  Phase check — `PUPPETEER_SKIP_DOWNLOAD=true timeout 1800 pnpm turbo run check-types lint --concurrency=1` with the four package filters; PHASE_CHECK_EXIT=2. A second run added `--continue`; PHASE_CHECK_CONTINUE_EXIT=2. `activity-react` and `auth-client` passed check-types and lint. Both play-kit packages passed lint with warnings. Their check-types commands exited 2. Dependency `activity-runtime` also exited 2. Base comparison: not compared.

  Environment deviation — the first setup attempt exited 1 on Puppeteer `ECONNRESET`. The retry exited 124 after downloading Chrome. A later attempt waited on the shared lock. `PUPPETEER_SKIP_DOWNLOAD=true` completed dependency setup. The unrelated browser download was not a type-check input.

  Review — `git diff --check 24471e25a..HEAD` exited 0. The manifests, three added overrides, and lockfile match the approved scope. No Dockerfile, Cloud Build, or `.github` file changed.
  Review finding — the two play-kit type failures are not compared with the base. This review does not classify them as pre-existing. Reviews A and B remain independent. Task 2.14 holds the whole-branch change-quality review.

  Play-kit type failure — cause (orchestrator evidence, 2026-10-27, about 08:30 CST). Command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && timeout 1200 pnpm turbo run build --concurrency=1 --filter="@reading-advantage/advantage-play-kit^..." --filter="@reading-advantage/advantage-play-kit-3d^..." ...; tsc --noEmit -p tsconfig.json in packages/advantage-play-kit and packages/advantage-play-kit-3d'`. Result: DEPS_BUILD_EXIT=0. game-contracts and advantage-play-kit built; turbo reported "2 successful". advantage-play-kit TSC_EXIT=0 with 0 errors. advantage-play-kit-3d TSC_EXIT=0 with 0 errors. Before the build, the errors were TS2307 "Cannot find module '@reading-advantage/game-contracts'": packages/game-contracts/package.json points `types` at ./dist/index.d.ts and the fresh worktree had no dist. Base check (master checkout, old dependency versions, dist built): advantage-play-kit tsc shows 0 errors. Cause: an unbuilt workspace dependency in the fresh worktree, not the upgrade. `activity-runtime` failed only as a dependency of that task.

## Phase 2: Verification of the deployed apps

> Each command below runs through `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`. The commands run one at a time.

- [ ] 2.1 `apps/accounting`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. Test: AC-5.
- [ ] 2.2 `apps/accounts`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. Test: AC-5.
- [ ] 2.3 `apps/codecamp-advantage`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. Test: AC-5.
- [ ] 2.4 `apps/marketing`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. The build runs `vinext build`. Test: AC-5.
- [ ] 2.5 `apps/primary-advantage`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. Test: AC-5.
- [ ] 2.6 `apps/reading-advantage`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. The app runs Jest for its unit tests. Test: AC-5.
- [ ] 2.7 `apps/sales-advantage`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. Test: AC-5.
- [ ] 2.8 `apps/storytime`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. Test: AC-5.
- [ ] 2.9 `apps/workbooks`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. Test: AC-5.
- [ ] 2.10 `apps/www-reading-advantage`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. Test: AC-5.
- [ ] 2.11 `packages/api`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. The package holds `next` as a dev dependency. Test: AC-5.
- [ ] 2.12 `packages/domain`, `packages/db`, `packages/auth`, `packages/backend`, `packages/ui`, `packages/utils`: `check-types`, `lint`, `test --maxWorkers=1`, `build`. Test: AC-5.
- [ ] 2.13 Record every failure with its cause. A failure from this upgrade is a defect to fix. A failure that predates the track is recorded with the evidence and stays open. Test: AC-5.
- [ ] 2.14 Phase check: the change-quality review of the branch diff, the adversarial test pass on the changed packages, and the final `pnpm audit --json` report. Test: AC-4, AC-5.

## Phase 3: Redeploy list and merge

- [ ] 3.1 Write `docs/deployment/security-upgrade-2026-10.md`. It names each of the ten Cloud Run services. Each entry gives the app folder, the commit, the order of the deploy and one check after the deploy. The order puts the lowest-traffic services first. `reading-advantage-web` and `primary-advantage-app` go last, because they carry the most traffic. Test: AC-6.
- [ ] 3.2 The file records the runtime note: `node:22-alpine` needs no change, a rebuild pulls Node 22.23.4. It records the open item of `apps/reading-advantage/Dockerfile` on `node:20.18`. Test: AC-6.
- [ ] 3.3 Review the redeploy list with the Monorepo orchestrator. Record the review. Test: AC-6.
- [ ] 3.4 Merge the branch `chore/security-upgrade-2026-10` into the local `master`. The merge needs no push. Test: AC-7.
- [ ] 3.5 Report to the PM orchestrator. Give the commit SHA of the merge, the advisory table, the supply chain result, the MAJOR list and the deployed app list. Test: AC-7.

### Phase 3 merge rule

The merge into the local `master` happens after the Phase 1 and Phase 2 checks pass. The reviews must find no open critical or high defect. The merge stops and reports to Daniel when a check fails.

## Out of scope

- Push, deploy, Cloud Build job, `gcloud` command.
- Any change to a Dockerfile, a Cloud Build file or a Cloud Run service.
- The MAJOR bumps of spec section 6.
- The base image change of `apps/reading-advantage/Dockerfile`. It waits for Daniel's decision.
