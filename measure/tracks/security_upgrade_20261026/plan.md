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

- [~] 1.1 Write the failing version-guard test. It reads `pnpm-lock.yaml` as data and checks the locked version of each package in the guard list. The guard list holds the advisory ID, the package name and the fixed version. The failure message names the advisory, the locked version and the fixed version. The test does not run `pnpm audit`. Test: AC-1.
- [~] 1.2 Run the version-guard test against the current lockfile. Record the failure list: `next` 16.2.9, `react` 19.2.7, `react-dom` 19.2.7, `sharp` 0.34.5, `handlebars` 4.7.9, `@sentry/nextjs` 10.59.0, `vite` 8.1.0, `axios` 1.18.0, `nanoid` 5.1.15, `postcss` 8.5.15 and 8.4.31, `undici` 7.28.0, `zod` 4.4.3. The test must fail with a non-zero exit. Test: AC-1.

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
- [ ] 1.3 Create the branch `chore/security-upgrade-2026-10` from `master`. Test: the branch exists and starts from the current `master` commit.
- [ ] 1.4 Change the `overrides` block of `pnpm-workspace.yaml`: `next` 16.2.9 to 16.4.1, `react` 19.2.7 to 19.2.9, `react-dom` 19.2.7 to 19.2.9, `vite` 8.1.0 to 8.1.6. Test: AC-2.
- [ ] 1.5 Change the `catalog` block of `pnpm-workspace.yaml`: `sharp` `^0.34.5` to `^0.35.5`. Test: AC-2.
- [ ] 1.6 Change the `next`, `react` and `react-dom` entries in each `package.json` that declares them directly. The list of files follows. Test: AC-2.

  `apps/accounting`, `apps/accounts`, `apps/activity-vinext-fixture`, `apps/advantage-games`, `apps/codecamp-advantage`, `apps/marketing`, `apps/primary-advantage`, `apps/reading-advantage`, `apps/sales-advantage`, `apps/science-advantage`, `apps/storytime`, `apps/workbooks`, `apps/www-reading-advantage`, `packages/activity-react`, `packages/activity-runtime`, `packages/activity-tutorial`, `packages/advantage-play-kit`, `packages/advantage-play-kit-3d`, `packages/api`, `packages/auth-client`, `packages/ui`, `packages/utils`.
- [ ] 1.7 Refresh the lockfile so every transitive package in section 10.2 of the audit reaches its fixed version. The `overrides` block, the `catalog` block, `nodeLinker: hoisted` and `minimumReleaseAgeExclude` stay unchanged. Test: AC-2, AC-3.
- [ ] 1.8 Run the version-guard test again. It must pass. Test: AC-1, AC-2, AC-3.
- [ ] 1.9 Run `pnpm audit --json` again. The report must hold zero critical advisories and zero high advisories for the packages in scope. The report names the MAJOR bumps of spec section 6. Record the report in the plan. Test: AC-4.
- [ ] 1.10 Check that the refreshed lockfile holds no package version that a public list of malicious releases names. The list set is the one in audit section 5.1. Test: spec section 7.
- [ ] 1.11 Phase check. Run the version-guard test, the changed tests, the type check and the lint of the changed packages. Then run a change-quality review of the branch diff. Record the findings. Test: AC-1, AC-2, AC-3, AC-4.

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
