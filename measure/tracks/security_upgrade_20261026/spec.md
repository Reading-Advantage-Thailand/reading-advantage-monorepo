# Specification: Security upgrade — Next.js, React, sharp and the critical and high npm fixes

**Track ID:** `security_upgrade_20261026`
**Type:** chore (classic FR list with acceptance checks)
**Status:** active. Opened 2026-10-26.
**Owner chain:** Daniel (owner; deploy gate; runtime-line decisions) → Monorepo orchestrator (track owner: build, review, verification) → PM orchestrator (assignment A-21).
**Audit:** [audit-2026-10-26.md](./audit-2026-10-26.md) — the source for every version in this specification.
**Due:** 2026-10-27.

## 1. Request

Daniel, 2026-10-26: "Somebad CVEs came out on NePM this week. We need an audit and update with redeploy ASAP."

The PM orchestrator dispatched this track as assignment A-21 with the order: audit, upgrade, redeploy list, merge to local master.

The audit is done. It is [audit-2026-10-26.md](./audit-2026-10-26.md). This specification covers the upgrade, the verification and the redeploy list.

## 2. Facts checked at the opening

The PM facts were checked against the repository on 2026-10-26. Two facts hold. One fact needs a correction.

| PM fact | Check | Result |
| --- | --- | --- |
| Every Next.js app pins `next` 16.2.9 and `react` 19.2.7 | `pnpm-lock.yaml` | True. `next@16.2.9`, `react@19.2.7`, `react-dom@19.2.7` are the only locked versions. `pnpm-workspace.yaml` holds them in `overrides`. |
| The lockfile has `sharp` 0.34.5 | `pnpm-lock.yaml` | True. The catalog entry is `sharp: ^0.34.5`. |
| The Dockerfiles use `node:22-alpine` | `apps/*/Dockerfile` | Ten of eleven Dockerfiles use `node:22-alpine`. `apps/reading-advantage/Dockerfile` uses `node:20.18`. See FR-9. |

## 3. Scope

### 3.1 In scope

1. Upgrade `next` to 16.4.1 in every workspace unit that resolves it.
2. Upgrade `react` and `react-dom` to 19.2.9.
3. Upgrade `sharp` to 0.35.5 or later.
4. Apply every other critical or high fix from the audit that is a patch or a minor bump.
5. Add a version-guard test that reads `pnpm-lock.yaml` and fails while a locked version sits below the fixed version of a critical or high advisory.
6. Run the type check, the lint, the unit tests and the build of each deployed app.
7. Write `docs/deployment/security-upgrade-2026-10.md`, the redeploy list for Daniel's developer.
8. Merge the branch into the local `master` after the tests and the reviews pass.

### 3.2 Out of scope

1. Push to the remote.
2. Deploy to Cloud Run.
3. Cloud Build runs.
4. Any change to a Cloud Run service, a Dockerfile or a Cloud Build file.
5. The MAJOR bumps. Section 6 lists them.
6. The base image change of `apps/reading-advantage/Dockerfile`. It needs Daniel's decision because it moves the app to another runtime line.

## 4. Functional requirements

### FR-1: The version guard test

A test reads `pnpm-lock.yaml` and checks the locked version of each package in the guard list. The test fails while any locked version sits below the fixed version of a critical or high advisory.

- The guard list lives in one file, so one edit covers the next advisory.
- The test names the advisory, the locked version and the fixed version in its failure message.
- The test reads the lockfile as data. It does not run `pnpm audit`.
- The test runs in the repository root package.

### FR-2: The `next` upgrade

`next` resolves to 16.4.1 in every workspace unit. The `overrides` block in `pnpm-workspace.yaml` holds the version, because every unit resolves `next` through it.

The direct dependency entries in each `package.json` change to the same version, so the manifest states the version that the lockfile holds.

### FR-3: The React upgrade

`react` and `react-dom` resolve to 19.2.9. The `overrides` block holds both versions.

### FR-4: The sharp upgrade

`sharp` resolves to 0.35.5 or later. The catalog entry changes from `^0.34.5` to `^0.35.5`. The catalog entry is the only place that states a sharp range.

### FR-5: The other patch and minor fixes

Each package below reaches its fixed version. A direct dependency changes its manifest entry. A transitive dependency needs only a lockfile refresh.

| Package | Locked | Fixed | Bump | Manifest change |
| --- | --- | --- | --- | --- |
| `handlebars` | 4.7.9 | 4.7.10 | patch | none. The ranges `^4.7.8` and `^4.7.9` allow it. |
| `@sentry/nextjs` | 10.59.0 | 10.75.2 | minor | none. The range `^10.0.0` allows it. |
| `vite` | 8.1.0 | 8.1.6 | patch | the `overrides` entry `vite: 8.1.0` changes. |
| `axios` | 1.18.0 | 1.20.0 | minor | none. The catalog entry `axios: ^1.7.7` allows it. |
| `nanoid` | 5.1.15 | 5.1.16 | patch | none. The catalog entry `nanoid: ^5.1.11` allows it. |
| `postcss` | 8.5.15 | 8.5.18 | patch | none. The catalog entry `postcss: ^8.5.15` allows it. |
| `undici` | 7.28.0 | 7.30.1 | minor | none. The package runs in dev only. |
| `zod` (the 4.x copy) | 4.4.3 | 4.6.6 | minor | none. The package is transitive. |

### FR-6: The lockfile

The lockfile holds the fixed version of every package in FR-2, FR-3, FR-4 and FR-5. The lockfile also holds the fixed version of each transitive package in section 10.2 of the audit.

The lockfile keeps its current format. The workspace `pnpm-workspace.yaml` keeps `nodeLinker: hoisted`, the `overrides` block, the `catalog` block and the `minimumReleaseAgeExclude` list.

### FR-7: The verification of each deployed app

Each app in section 9 of the audit passes four commands:

1. `check-types`
2. `lint`
3. `test` with `vitest --maxWorkers=1`
4. `build`

Each command runs through `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`. The heavy script takes the shared lock, so one heavy job runs at a time.

A command that fails on a change in this track fails the task. A command that fails on a fault that predates this track is recorded in the plan with the evidence. The task does not claim a pass.

### FR-8: The redeploy list

`docs/deployment/security-upgrade-2026-10.md` names, for each Cloud Run service:

1. The service name.
2. The app folder.
3. The commit that holds the upgrade.
4. The order of the deploy.
5. One check to run after the deploy.

The file gives the order of the deploys. The lowest-traffic services go first. `reading-advantage-web` and `primary-advantage-app` go last, because they carry the most traffic.

### FR-9: The runtime line of `apps/reading-advantage`

The Dockerfile of `apps/reading-advantage` keeps `node:20.18` in this track. The audit records the gap. The change to a supported runtime line waits for Daniel's decision. The app moves to another runtime line, and it has no other test.

### FR-10: The merge into the local master

The branch merges into the local `master` after the tests and the reviews pass. The merge needs no push and no deploy.

## 5. Acceptance criteria

| ID | Criterion |
| --- | --- |
| AC-1 | The version-guard test fails on the pre-upgrade lockfile and passes on the post-upgrade lockfile. The failure message names the advisory, the locked version and the fixed version. |
| AC-2 | `pnpm-lock.yaml` holds `next` 16.4.1, `react` 19.2.9, `react-dom` 19.2.9 and `sharp` 0.35.5 or later. |
| AC-3 | Every package in FR-5 and every transitive package in section 10.2 of the audit sits at its fixed version in the lockfile. |
| AC-4 | `pnpm audit --json` reports zero critical advisories and zero high advisories for the packages in scope. The MAJOR bumps of section 6 stay open and the report names them. |
| AC-5 | Each of the ten deployed apps passes `check-types`, `lint`, `test` and `build`. |
| AC-6 | `docs/deployment/security-upgrade-2026-10.md` names all ten Cloud Run services with the app, the commit, the order and one check each. |
| AC-7 | The branch merges into the local `master`. The push and the deploy stay with Daniel's team. |

## 6. The MAJOR bumps that stay open

The audit lists eight. They stay out of scope.

| Package | Locked | Fixed | Reason |
| --- | --- | --- | --- |
| `zod` (the 3.x copies) | 3.25.76 | 4.6.6 | The Zod 4 major migration is its own track, `zod4_major_migration`. |
| `nodemailer` | 6.10.1 | 10.0.6 | The jump spans four majors. |
| `next-mdx-remote` | 5.0.0 | 6.0.0 | The major release changes the MDX render path of the www site. |
| `vinext` | 0.2.0 | 1.3.1 | The jump crosses from 0.x to 1.x. It changes the runtime of marketing. |
| `@opentelemetry/propagator-jaeger` | 1.30.1 | 2.9.0 | The Sentry chain of `apps/science-advantage` changes. |
| `@faker-js/faker` | 9.9.0 | 10.4.1 | The test seed data changes. |
| `basic-ftp` | 5.3.1 | 6.2.1 | The www video pipeline changes. |
| `js-yaml` (the 4.x line) | 4.2.0 | 4.3.2 | The 4.x copy moves as a minor bump. The 3.x copy needs the major bump to 4.x. |

## 7. The supply chain result

The audit checked the lockfile against eight public lists of malicious releases. The lists include the 300 npm malware advisories of the GitHub Advisory Database for October 2026. No hit. The result is in section 5 of the audit. The upgrade must not bring in a version that a list names.

## 8. The people and the gates

- Daniel owns the deploy gate, the runtime-line decision and the final acceptance.
- The Monorepo orchestrator owns the build, the review and the merge into the local master.
- The PM orchestrator owns the report to the company.

No task in this track pushes, deploys or runs a Cloud Build job.
