# Test strategy: Security upgrade — Next.js, React, sharp and the critical and high npm fixes

> **Track:** `security_upgrade_20261026` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md) · **Audit:** [audit-2026-10-26.md](./audit-2026-10-26.md)
> **Branch:** `chore/security-upgrade-2026-10` in `/home/daniebo/Desktop/rama-worktrees/security-upgrade`
> **role_base_sha:** `a64616a4d` (branch start). This SHA is not `phase_base_sha`.
> **Model deviation:** The role table pins `claude-code/claude-opus-5-5[1m]#high`. Claude is at 83% of its weekly window. Daniel's model table (2026-10-26 21:29) sets `xai/grok-4.7#high` for Strategy and Review A tonight.

The audit is the source for every version. Spec section 6 names `js-yaml` in the major list. The audit table does not. Both `js-yaml` lines move as a minor bump (`3.14.2` to `3.15.2`, `4.2.0` to `4.3.2`). The guard includes both lines. The guard does not require `3.x` to become `4.x`.

`graph.db` is present. This track changes versions and adds tests. It changes no exported product symbol. A caller check is not a phase gate.

## 1. Rules for every phase

### 1.1 Machine, install, and heavy jobs

The worktree has no `node_modules`. Install before the first Vitest run.

- Heavy jobs run only through `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`.
- Heavy jobs are `pnpm install`, Vitest, Jest, `tsc`, `eslint`, `turbo`, `next build`, and `vinext build`.
- Vitest uses `--maxWorkers=1`. Jest uses `--runInBand`.
- Do not run `pnpm turbo run test`, `pnpm turbo run build`, or `pnpm turbo run lint` on the whole monorepo.
- A turbo call that this file allows uses `--concurrency=1`. The default concurrency can exhaust 7 GB.
- Do not push, deploy, run Cloud Build, or run `gcloud`.
- Do not change a Dockerfile or a Cloud Build file.

Install before the lockfile changes (Phase 1 Red):

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && pnpm install --frozen-lockfile --offline'
```

If the store lacks a package, run the online command once:

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && pnpm install --frozen-lockfile'
```

Install after the lockfile changes. Do not use `--offline`. The new tarballs are not in the store.

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && pnpm install --frozen-lockfile'
```

Retry the online command one time on `ECONNRESET`, `ETIMEDOUT`, or `ENOTFOUND`. A second failure is class `not-run`. Do not drop `--frozen-lockfile`.

### 1.2 Capture of `phase_base_sha`

The orchestrator captures `phase_base_sha` after the commit of this file, and before Phase 1 Red starts.

1. Run `git rev-parse HEAD` in this worktree.
2. Record that SHA in the Phase 1 Red evidence in `plan.md`.
3. Do not change the SHA after capture.

This file does not contain `phase_base_sha`. A SHA from before this commit is not valid.

Phase 2 and Phase 3 each get a new capture. Capture it after the previous phase checkpoint, and before that phase's Red. Do not reuse the Phase 1 SHA.

### 1.3 Evidence classes

- **Artifact test:** reads a file and checks its text. The redeploy-list test is an artifact test. The ledger test is an artifact test.
- **Live behavior test:** runs a command and reads its exit code. The version-guard test is live. It reads the real `pnpm-lock.yaml`. Each app `build` is live.
- An artifact test does not close AC-5. AC-5 needs the live command logs.
- A plan note that says "pass" must quote the exit code of the command it cites.

### 1.4 Aggregate suites that stay red

`pnpm turbo run test` at the root is not a gate. It is red for faults that predate this track. Do not claim that it passes.

Known baselines, from `AGENTS.md` and `measure/tech-debt.md`:

| Baseline | Record |
| --- | --- |
| `primary-advantage` lint | 49 pre-existing ESLint errors (`AGENTS.md` Known Issues) |
| `reading-advantage` full Jest | The full suite hangs for more than 10 minutes. 26 suites already fail (tech-debt 2026-05-23). |
| `packages/db` tests | About 40 failures already exist (tech-debt 2026-10-04). The word "about" is not evidence. |
| `reading-advantage` build | `ignoreBuildErrors: true`. A green build is not a type pass. |

These baselines are not a pass. Section P2 states how Green records them.

The new Vitest files have no `## skip-aggregate:` header. Do not add them to `measure/test-all.sh`.

### 1.5 Worktree deviation (A16)

The orchestrator assigned this worktree. Roles write only here. Do not add another worktree. Do not write in the main checkout. Do not use the A16 one-worktree check as a fail for this assigned worktree.

## 2. Phase summary

| Phase | Risk | Review A | Review B | Review C | Adversarial | Browser |
| --- | --- | --- | --- | --- | --- | --- |
| P1 Version guard and upgrade | critical | yes | yes | no | yes | no |
| P2 Verification of the deployed apps | high | yes | yes | no | yes | no |
| P3 Redeploy list and merge | medium | yes | yes | no | no | no |

## 3. Shared anti-pattern defenses

| ID | Defense | Falsification condition |
| --- | --- | --- |
| A1 | The guard reads package keys only. A comment that contains `16.2.9` is not a locked version. | A comment-only fixture fails the `next` floor, or a key `next@16.2.9:` passes. |
| A2 | No publish gate exists in this track. | A test treats a doc as published. |
| A3 | Counts and versions use labels: `locked=`, `fixed=`, `exit_code=`, `order=`. The check parses the value after the label. | The check passes on any digit, a date, or a year. |
| A4 | Each test asserts that its input set is not empty. A missing guarded line fails. | An empty `packages:` section passes, or a guard list of length 0 passes. |
| A5 | A `pass` row requires `exit_code=0` and a log that contains that code. The plan quotes the code. | The plan says "all checks pass" while a cited command exits non-zero. |
| A6 | `measure/tracks.md` may say the upgrade is done only after AC-4 and AC-5 are recorded. This track does not edit the registry. | The registry says the CVEs are resolved while a guard entry is still red. |
| A7 | Scans exclude nothing by the words "never" or "do not". Major packages are an explicit name list. | A filter drops `@sentry/nextjs` or a real `brace-expansion` line. |
| A8 | New plan notes use `[ ]`, `[~]`, `[x]`, or `[b]`. This role does not edit `plan.md`. | A new task uses a space inside the marker. |
| A9 | The version-guard test reads repo files only. It does not read `measure/tracks/`. The ledger test tries `measure/archive/<id>/` first when that directory exists. | The version-guard test fails after the track moves to `measure/archive/`. |
| A10 | No structural product export changes. Do not run `measure/generate.sh` for this track. | A phase adds an exported function and skips the graph update. |
| A14 | Detectors use `rg -n '<regex>'`. Exit code 2 is a failure. | `rg -nE` reports zero hits. |
| A15 | Do not add a hash field to a receipt, a ledger, or the redeploy list. Provenance is a Git commit. | A new SHA-256 field appears in a track file. |
| A16 | See section 1.5. | A role creates a second worktree for this track. |

A11 and A13 apply at closeout only. This track is not a review-execution track.

## P1: Version guard and upgrade

**Risk:** critical. A false pass leaves a vulnerable lockfile. The phase does not deploy. The guard is the security control.

### What Red writes

Red writes two files. Red adds no dependency.

| File | Role |
| --- | --- |
| `tests/security-upgrade-guard-list.ts` | The guard list. One edit covers the next advisory. |
| `tests/security-upgrade-version-guard.test.ts` | The test. It imports the list and reads `pnpm-lock.yaml`. |

The test runs in the repository root package. The root file `vitest.config.ts` already exists. Root `package.json` does not list `vitest`. After a hoisted install, `pnpm exec vitest` resolves the workspace copy. Do not add `vitest`, `yaml`, or `js-yaml` to root `package.json`.

Red does not write the Phase 2 ledger test. Red does not write the Phase 3 redeploy test.

The test scans lines. It does not load the lockfile through a YAML parser. The file is large. A full parse can exhaust 7 GB.

Parse contract:

- A locked version is a `packages:` key. The form is two spaces, the package name, `@`, a numeric version, then `:`.
- Split a scoped name on the last `@`. `@sentry/nextjs@10.59.0:` is package `@sentry/nextjs` and version `10.59.0`.
- A snapshot key may add `(peer@ver)` after the version. Strip that suffix. Do not treat the peer as a second package.
- Compare versions as numeric segments. Do not use string order. `10.75.2` is above `10.59.0`.
- Do not run `pnpm audit` inside this test.

Each guard entry has `advisoryIds`, `packageName`, `linePrefix`, and `fixedVersion`. `linePrefix` selects one line. `4.` selects Zod 4 only. An empty prefix selects every locked version of that package.

For each entry:

1. Collect locked versions that start with `linePrefix`.
2. Fail with `missing_line=<package> <prefix>` when the set is empty.
3. Fail when any selected version is below `fixedVersion`.

A higher line must not hide a lower line. `brace-expansion@5.0.11` does not satisfy the `1.` floor. `zod@3.25.76` does not satisfy the `4.` floor, and it does not fail that floor.

Failure message labels, all required:

`advisory=<GHSA-id> package=<name> locked=<version> fixed=<version>`

Each advisory id on the entry appears in the message. A non-empty message is not enough.

### Guard list

`requirePresent` is true for every row. Absence fails closed.

| Package | Line prefix | Floor | Advisory ids (audit table) |
| --- | --- | --- | --- |
| `next` |  | `16.4.1` | `GHSA-673q-mjm6-r5xr` `GHSA-2464-fhr4-w9xw` `GHSA-p3m5-59mp-jv5r` and the other Next.js ids in audit §2 |
| `react` | `19.2.` | `19.2.9` | `GHSA-h3gv-c5rc-p453` (the locked 19.2.7 sits in range; the package bump is the spec control) |
| `react-dom` | `19.2.` | `19.2.9` | same React range note as `react` |
| `sharp` |  | `0.35.5` | `GHSA-f88m-g3jw-g9cj` `GHSA-rgj7-g3m4-5g8c` `GHSA-wq5f-xc86-pv6w` |
| `handlebars` |  | `4.7.10` | `GHSA-8r5x-fm3f-whwj` `GHSA-p8wg-vrv2-v86f` |
| `@sentry/nextjs` |  | `10.75.2` | `GHSA-mchm-gjx6-7h55` |
| `vite` | `8.1.` | `8.1.6` | `GHSA-587h-7wmj-h5pm` |
| `axios` | `1.` | `1.20.0` | the axios ids in audit §2 |
| `nanoid` | `5.` | `5.1.16` | `GHSA-28wg-ghj8-5hjv` `GHSA-2v37-7h3g-55p8` |
| `nanoid` | `3.` | `3.3.18` | same nanoid ids |
| `postcss` |  | `8.5.18` | `GHSA-6g55-p6wh-862q` `GHSA-r28c-9q8g-f849` |
| `undici` | `7.` | `7.30.1` | the undici ids in audit §2 |
| `zod` | `4.` | `4.6.6` | `GHSA-mrhx-c7xc-m3w5` |
| `@fastify/busboy` | `3.` | `3.2.1` | the busboy ids in audit §2 |
| `@grpc/grpc-js` | `1.` | `1.14.5` | `GHSA-m9gg-hp2v-232j` |
| `@opentelemetry/exporter-prometheus` | `0.` | `0.217.0` | `GHSA-q7rr-3cgh-j5r3` |
| `@opentelemetry/sdk-node` | `0.` | `0.217.0` | `GHSA-q7rr-3cgh-j5r3` |
| `@xmldom/xmldom` | `0.9.` | `0.9.12` | the xmldom ids in audit §2 |
| `brace-expansion` | `1.` | `1.1.20` | the brace-expansion ids in audit §2 |
| `brace-expansion` | `2.` | `2.1.6` | same brace-expansion ids |
| `brace-expansion` | `5.` | `5.0.11` | same brace-expansion ids |
| `browserslist` | `4.` | `4.28.7` | `GHSA-73wf-gq98-2v4g` `GHSA-c83g-rgw3-j3cx` |
| `compression` | `1.` | `1.8.2` | `GHSA-vc2v-76pw-4v95` |
| `extract-zip` | `2.` | `2.0.2` | the extract-zip ids in audit §2 |
| `fast-uri` | `3.` | `3.1.7` | the fast-uri ids in audit §2 |
| `fast-xml-parser` | `5.` | `5.10.1` | `GHSA-8r6m-32jq-jx6q` |
| `follow-redirects` | `1.` | `1.16.1` | `GHSA-8r9p-f939-6h3c` `GHSA-q3jh-wrc6-jgq8` |
| `image-size` | `2.` | `2.0.3` | `GHSA-5p2g-fcmc-qvqq` `GHSA-w3rx-r6r6-pgpr` |
| `ip-address` | `10.` | `10.3.1` | `GHSA-mwp4-54f8-5fhr` |
| `js-yaml` | `3.` | `3.15.2` | the js-yaml ids in audit §2 |
| `js-yaml` | `4.` | `4.3.2` | same js-yaml ids |
| `source-map-js` | `1.` | `1.2.2` | `GHSA-68fv-2mgg-jv7q` |
| `url-regex` | `5.` | `5.0.1` | `GHSA-v4rh-8p82-6h5w` |

Do not add `react-server-dom-*` unless a `packages:` key exists. The `next` floor is the control for those advisories.

### Packages the guard must not require

A dedicated test reads the guard list. These names must not appear as entries:

`nodemailer`, `next-mdx-remote`, `vinext`, `@opentelemetry/propagator-jaeger`, `@faker-js/faker`, `basic-ftp`.

`zod` may appear only with prefix `4.`. `js-yaml` may appear only with floors `3.15.2` and `4.3.2`.

### Other assertions in the same file

These assertions fail on the current tree. They keep the file red for the right reason.

- Every direct `next`, `react`, and `react-dom` entry in a workspace `package.json` equals the override version. The scan must find at least one file. The file list is discovered. It is not a hardcoded list.
- `pnpm-workspace.yaml` keeps `nodeLinker: hoisted`.
- `minimumReleaseAgeExclude` still lists `vinext@0.2.0` and `phaser@4.2.1`. No other exclude line is added.
- The `overrides` keys stay. After Green, `next` is `16.4.1`, `react` is `19.2.9`, `react-dom` is `19.2.9`, and `vite` is `8.1.6`. No other override value changes.
- The catalog `sharp` range is `^0.35.5`. No other catalog range changes.

### Refutation fixtures

Refutation tests call the parser with a string. They do not mock `fs`. They do not replace `pnpm-lock.yaml`. The live test reads the real file.

| Fixture | Required result | Falsification condition |
| --- | --- | --- |
| Key `next@16.2.9:` | Fail. Message has `advisory=`, `locked=16.2.9`, and `fixed=16.4.1`. | The test passes, or one label is missing. |
| Key `next@16.4.1:` and a comment `16.2.9` | Pass the `next` floor. | The comment fails the floor (A1). |
| Key `sharp@0.35.6` | Pass the `sharp` floor `0.35.5`. | A later patch fails the floor. |
| Only `zod@3.25.76:` while the entry prefix is `4.` | Fail `missing_line`. Do not call `3.25.76` the fix. | The 3.x key satisfies the 4.x floor, or the missing 4.x line passes. |
| `brace-expansion@5.0.11` and `brace-expansion@1.1.15` | Fail the `1.` floor. | The test passes because one line is new enough. |
| Empty `packages:` section | Fail. | The test passes (A4). |
| Guard list length 0 | Fail. | The test passes (A4). |
| `@sentry/nextjs@10.59.0:` | Fail with that package name. | A scoped name is skipped (A7). |

### Expected Red result (task 1.2)

The live test must exit non-zero. The failure list must include at least these locked versions:

- `next` `16.2.9`, `react` `19.2.7`, `react-dom` `19.2.7`, `sharp` `0.34.5`
- `handlebars` `4.7.9`, `@sentry/nextjs` `10.59.0`, `vite` `8.1.0`, `axios` `1.18.0`
- `nanoid` `5.1.15`, `nanoid` `3.3.14`, `postcss` `8.5.15`, `postcss` `8.4.31`
- `undici` `7.28.0`, `zod` `4.4.3`

Extra in-scope lines must also fail. A missing name from this minimum set means the guard is too narrow. Red records the full list in the plan. Red does not claim a pass.

**RED_TEST_COMMAND:**

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && pnpm exec vitest run --config vitest.config.ts --maxWorkers=1 tests/security-upgrade-version-guard.test.ts'
```

**GREEN_TEST_COMMAND:** the same command. It must exit 0.

### Commands that are not the Vitest gate

Task 1.9 saves `pnpm audit --json`. Run it through `heavy-run.sh`. Retry once on the network errors in section 1.1. Do not put this command inside the version-guard test.

The pass rule is not the top-level count. Read each vulnerability name and severity. A remaining critical or high advisory is allowed only for the major set below. The set is `nodemailer`, `next-mdx-remote`, `vinext`, `@opentelemetry/propagator-jaeger`, `@faker-js/faker`, and `basic-ftp`. Zod findings on the `3.` line are also allowed. `js-yaml` is not in that set. A missing `vulnerabilities` key fails closed. Record `in_scope_critical=<n>` and `in_scope_high=<n>`. Both must be 0. The report names the eight open majors from spec section 6. Apply the `js-yaml` correction above.

Task 1.10 repeats the name-and-version match from audit §5.1. A failed fetch is `not-run`. It is not "no hit". Record `supply_chain_hits=<n>` only after a completed match.

### Green gate

1. `GREEN_TEST_COMMAND` exits 0.
2. The minimum Red list is gone from the failure output. The plan quotes both runs.
3. The audit summary has `in_scope_critical=0` and `in_scope_high=0`, and it names the open majors.
4. `git diff --name-only a64616a4d -- '**/Dockerfile' '**/cloudbuild*.yaml'` is empty. `a64616a4d` is `role_base_sha`, not `phase_base_sha`.

### Closeout gate

The Green gate, then Review A, then Review B. Adversarial runs after those reviews, on the reviewed HEAD. The orchestrator writes the checkpoint only after those gates pass. A `not-run` audit or supply-chain check blocks the checkpoint.

### Architecture guardrails

- The `overrides` block is the resolution contract for `next`, `react`, `react-dom`, and `vite`.
- The catalog is the only `sharp` range.
- `next@16.4.1` declares `sharp` `^0.35.5`. A lockfile that keeps `sharp@0.34.5` stays vulnerable. The guard must fail that case.
- `apps/marketing` keeps `vinext` `0.2.0`. The override still moves its `next`. Do not bump `vinext`.
- `apps/reading-advantage/Dockerfile` stays on `node:20.18`. Do not "fix" that line in this track.

### Changed-contract risks

- A manifest range can disagree with the lockfile. The package.json assertion closes that gap.
- A Zod 4 floor with an empty prefix forces the Zod 4 major. The prefix test closes that gap.
- `minimumReleaseAgeExclude` must stay. A dropped `vinext@0.2.0` line can block install.

### Anti-pattern coverage

- A1: the parser reads keys, not a substring.
- A3: versions use labels.
- A4: an empty section fails, and an empty list fails.
- A5: the plan quotes exit codes.
- A7: the major exclusion is an explicit name list. Scoped names stay.
- A9: this test does not read the track directory.

### Review applicability

- Review A: yes. The parser, the floors, the override edits, and the lockfile are the correctness surface.
- Review B: yes. A false pass is the security defect. The review checks the major exclusion and the `sharp` floor.
- Review C: no. The phase changes no UI and no API shape. Version pins are not an API.
- Adversarial: yes. Attack the parser with the refutation table. Do not reproduce an advisory. Do not write an exploit, a payload, or a request that triggers a CVE.
- Browser review: no. No app is running. A local page would not prove the Alpine image. See the runtime note in P2.

### Phase acceptance checks

- The Red command exited non-zero, and the plan quotes the minimum failure set.
- The Green command exits 0 on the acceptance HEAD.
- AC-2 and AC-3 hold in the lockfile keys, not only in `package.json`.
- AC-4 holds by the vulnerability-name rule, not by a lone metadata count.
- No Dockerfile diff and no Cloud Build diff against `role_base_sha`.
- Review A and Review B record no open critical or high defect.

## P2: Verification of the deployed apps

**Risk:** high. `next` `16.2.9` to `16.4.1` and `sharp` `0.34.5` to `0.35.5` can break image optimization and the `vinext` build. The phase does not deploy. A local pass does not prove `node:20.18` or the Alpine binary.

### Runtime note (image optimization)

`next@16.4.1` fixes flaws in the image optimizer. It requires `sharp` `^0.35.5`. The `sharp` bump changes libvips, libheif, and librsvg. A bad native binary fails at request time. It may still pass `next build`.

`apps/marketing` builds with `vinext` `0.2.0`. That package depends on `next@16.2.9` in the lockfile today. The override moves it to `16.4.1`. The marketing build is the live proof of that pair. A marketing build failure is an `upgrade-defect`, unless the same command fails on `role_base_sha`.

A browser check of one or two apps is not worth its cost here.

- The machine has 7 GB. The builds already fill it.
- A local server uses the workstation binary, not the Alpine image.
- `reading-advantage` still ships `node:20.18`. A local pass does not prove that image.
- The redeploy list carries one HTTP check per service. Daniel's team runs it after deploy.

### What Red writes

Red writes `tests/security-upgrade-verification-ledger.test.ts`. The ledger file is absent, so the test fails. That fail is the Red result.

Ledger path: `measure/tracks/security_upgrade_20261026/verification-ledger.json`.

The test resolves `measure/archive/security_upgrade_20261026/` first when that directory exists (A9).

Each row has `package`, `command`, `exit_code`, `class`, and `log`. Allowed classes: `pass`, `predates-track`, `upgrade-defect`, `not-run`, `script-absent`.

The test fails when:

- The ledger is missing, or `rows` is empty (A4).
- A required pair from the matrix below has no row.
- `class` is `pass` and `exit_code` is not 0 (A5).
- `class` is `pass` and the log file is missing, or the log lacks `exit_code=<n>` for that row.
- `class` is `upgrade-defect` or `not-run`.
- `class` is `predates-track` and `evidence` has no `source=` label (A3).
- `class` is `script-absent` for any pair except `check-types` of `@reading-advantage/ui` and `@reading-advantage/utils`.

The ledger test does not run the app builds. It is an artifact test. AC-5 stays open until the live logs exist.

**RED_TEST_COMMAND:**

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && pnpm exec vitest run --config vitest.config.ts --maxWorkers=1 tests/security-upgrade-verification-ledger.test.ts'
```

**GREEN_TEST_COMMAND:** the same command, after the matrix below has logs. It must exit 0. An `upgrade-defect` row or a `not-run` row keeps it red.

### Build matrix order

Install with the online frozen command before the first check. Retry once, as in section 1.1.

Run shared packages before apps. App builds import them.

Shared package order: `@reading-advantage/utils`, `@reading-advantage/ui`, `@reading-advantage/db`, `@reading-advantage/auth`, `@reading-advantage/backend`, `@reading-advantage/domain`, `@reading-advantage/api`.

App order (light first, then the compatibility risk, then the large heaps):

1. `accounting`
2. `accounts`
3. `workbooks`
4. `sales-advantage`
5. `storytime`
6. `marketing` (`vinext build && node scripts/verify-vinext-runtime.mjs`)
7. `codecamp-advantage`
8. `www-reading-advantage`
9. `primary-advantage` (build heap 4096, typecheck heap 6144)
10. `reading-advantage` (build heap 8192, Jest, not Vitest)

`science-advantage` and `vocabulary-games` are not in audit §9. Do not add them to this matrix.

### What shares one turbo call

One shared call is allowed. It is check-types and lint for the five light apps only:

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && pnpm exec turbo run check-types lint --concurrency=1 --filter=accounting --filter=accounts --filter=workbooks --filter=sales-advantage --filter=storytime'
```

Do not add `marketing`, `codecamp-advantage`, `www-reading-advantage`, `primary-advantage`, or `reading-advantage` to that call. Do not put `build` or `test` in a turbo call. `turbo` `test` depends on `^build` and can build the graph.

Every other check is one `heavy-run.sh` call:

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && pnpm --filter <name> run <script>'
```

Vitest scripts get `--maxWorkers=1` by a direct exec when the package script does not set it:

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && pnpm --filter <name> exec vitest run --maxWorkers=1'
```

Use the package script name from `package.json`. Do not invent a script.

| Package | check-types | lint | test | build |
| --- | --- | --- | --- | --- |
| Five light apps | shared turbo call above | same call | one Vitest call each | one `next build` each |
| `marketing` | alone | alone | alone | alone (`vinext build`) |
| `codecamp-advantage` | alone | alone | alone | alone (build also runs the strip script) |
| `www-reading-advantage` | alone | alone | alone | alone |
| `primary-advantage` | alone | alone | alone | alone |
| `reading-advantage` | alone | alone | see Jest rule | alone |
| `@reading-advantage/ui`, `@reading-advantage/utils` | no script; row `script-absent` | alone | alone | alone (`tsup`) |
| `@reading-advantage/db`, `auth`, `backend`, `domain`, `api` | alone | alone | alone | alone |

`accounts` check-types runs two `tsc` projects inside one script. Keep that script. Do not split it.

`reading-advantage` `check-types` is the type gate. `next build` sets `ignoreBuildErrors: true`. Do not record a green build as a type pass.

### reading-advantage Jest and the 8192 heap

The build script requests `--max-old-space-size=8192`. The machine has 7 GB. Run that build alone. Do not change the script.

If the kernel kills the process, class the row `not-run` with `source=machine_heap`. Do not class it `predates-track`. Do not class it `pass`. Retry one time only after every other heavy job has stopped. A second kill stays `not-run` and blocks AC-5.

Do not run the full Jest suite as the gate. Tech-debt records a hang above 10 minutes. Start the package `test` script with a 12-minute bound. If no suite summary appears, stop it. Class that hang `predates-track` with `source=measure/tech-debt.md:2026-05-23`. Then run one targeted file so the runner proof is not empty:

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && pnpm --filter reading-advantage exec jest --runInBand --forceExit --watchAll=false --testTimeout=20000 lib/games/xp.test.ts'
```

A failure of that file follows the predates rule below. The full suite is not a pass.

### What a failure that predates the upgrade looks like (task 2.13)

A failure predates the track only when all of these hold:

1. The error text does not name a version this track changed (`16.4.1`, `19.2.9`, `0.35`, `8.1.6`, `10.75.2`, `4.6.6`) unless the baseline evidence contains that same text.
2. The evidence has a `source=` label. The source is a tech-debt row that names the same test, or a log from `role_base_sha`.
3. The failing test name is in that source. A count alone is not evidence (A3). "About 40" is not a name list.
4. Green writes the row in the ledger and quotes `pass=<n>, predates=<n>, upgrade_defect=<n>, not_run=<n>` in plan task 2.13.

An `upgrade-defect` blocks the phase. Green fixes it, or the phase stays open. A `not-run` row also blocks the phase. Green does not write "all checks pass".

`primary-advantage` lint may be `predates-track` only in two cases. The error set is the known 49. Or every new file is absent from this track's diff, and the message does not name a bumped type. Record `eslint_error_count=<n>`. A count other than 49 is not an automatic upgrade defect. It needs the file list.

`packages/db` failures are `upgrade-defect` until the failing test name appears in tech-debt or in a baseline log. Do not use the "about 40" sentence as a blanket pass.

### Green gate

1. `GREEN_TEST_COMMAND` exits 0.
2. Every matrix pair has one row.
3. `upgrade_defect=0` and `not_run=0`.
4. Each `pass` row has a log under `measure/runs/security_upgrade_20261026/`.
5. The version-guard command still exits 0.
6. `pnpm audit --json` still meets the P1 pass rule. Retry once on the network errors.

### Closeout gate

The Green gate, then Review A, then Review B, then the adversarial pass on the guard and the ledger. The checkpoint waits for `upgrade_defect=0` and `not_run=0`.

### Fixtures and live proof

- No mock of `next build`. The build log is the live proof.
- The ledger test reads the ledger and the logs. It does not stub them.
- A refutation ledger in memory must fail when `class` is `pass` and `exit_code` is 1.
- A refutation ledger with zero rows must fail.

### Anti-pattern coverage

- A3: exit codes and `source=` use labels.
- A4: an empty ledger fails.
- A5: `pass` requires exit 0 and a log.
- A7: do not drop a red app with an English word filter.
- A1: the class is an enum. Do not search for the substring "deferred" or "pre-existing".

### Review applicability

- Review A: yes. The ledger must match the logs. A green build must not be recorded as a type pass for `reading-advantage`.
- Review B: yes, narrow. Confirm the audit still has zero in-scope critical and high advisories. Confirm no `upgrade-defect` was relabeled `predates-track`.
- Review C: no. No handler, schema, or response shape changes. Image behavior is a post-deploy HTTP check, not an API review.
- Adversarial: yes, bounded. Attack the ledger classes and the guard false-pass cases. Do not reproduce a CVE. Plan task 2.14 means this pass, not a pentest.
- Browser review: no. See the runtime note. The cost is high. The Alpine proof is absent. The post-deploy check belongs in P3.

### Phase acceptance checks

- AC-5: every deployed app has live logs for check-types, lint, test, and build, classified by the rules above.
- `reading-advantage` type evidence is `check-types`, not the build.
- `marketing` build log shows `vinext build` completed.
- No row is `not-run` or `upgrade-defect`.
- The version-guard test still exits 0.
- Review A and Review B record no open critical or high defect.

## P3: Redeploy list and merge

**Risk:** medium. A wrong list can leave a service unpatched. The phase adds a document and a local merge. It does not deploy.

### What Red writes

Red writes `tests/security-upgrade-redeploy-list.test.ts`. The doc is absent, so the test fails.

The test reads `docs/deployment/security-upgrade-2026-10.md`. That path stays after archive (A9).

The test fails when:

- The file is missing or empty (A4).
- Any of the ten service names is missing: `accounting`, `accounts`, `codecamp-advantage`, `marketing`, `primary-advantage-app`, `reading-advantage-web`, `sales-advantage`, `storytime-app`, `workbooks`, `www-reading-advantage`.
- An entry lacks `app=`, `commit=`, `order=`, or `check=`.
- `order=` values are not the integers 1 through 10, each once. Parse the integer after the label (A3).
- `reading-advantage-web` and `primary-advantage-app` are not the two highest orders.
- The file lacks `node:22-alpine` or `node:20.18`.
- The file contains `git push` or `gcloud builds submit`.
- `commit=` is `HEAD`, `latest`, or shorter than 7 hex digits.
- `git merge-base --is-ancestor <commit> HEAD` fails, or that commit does not touch `pnpm-lock.yaml`.

Suggested order, lowest load first. Task 3.3 may swap the last two. Both stay last.

| order | service | app |
| --- | --- | --- |
| 1 | `accounting` | `apps/accounting` |
| 2 | `accounts` | `apps/accounts` |
| 3 | `workbooks` | `apps/workbooks` |
| 4 | `sales-advantage` | `apps/sales-advantage` |
| 5 | `storytime-app` | `apps/storytime` |
| 6 | `marketing` | `apps/marketing` |
| 7 | `codecamp-advantage` | `apps/codecamp-advantage` |
| 8 | `www-reading-advantage` | `apps/www-reading-advantage` |
| 9 | `reading-advantage-web` | `apps/reading-advantage` |
| 10 | `primary-advantage-app` | `apps/primary-advantage` |

Each `check=` is one HTTP GET of a path the app already serves. A check that only says "deploy succeeded" fails Review A. For `primary-advantage-app` and `reading-advantage-web`, the check requests one `next/image` URL and requires status 200. Daniel's team runs the check. This track does not.

The runtime note in the file must say: `node:22-alpine` needs no tag change; a rebuild pulls Node `22.23.4`. `apps/reading-advantage/Dockerfile` stays on `node:20.18` until Daniel decides.

**RED_TEST_COMMAND:**

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && pnpm exec vitest run --config vitest.config.ts --maxWorkers=1 tests/security-upgrade-redeploy-list.test.ts'
```

**GREEN_TEST_COMMAND:** the same command. It must exit 0. The merge is not part of this command.

### Green gate

1. `GREEN_TEST_COMMAND` exits 0.
2. The version-guard test still exits 0.
3. P2 still has `upgrade_defect=0` and `not_run=0`.
4. Review A and Review B of the list find no open critical or high defect.

### Closeout gate

The Green gate, then the local merge of `chore/security-upgrade-2026-10` into local `master`. Do not push. The merge stops when a P1 or P2 check is red. After the merge, `git merge-base --is-ancestor <upgrade-commit> master` exits 0. The PM report names the merge SHA, the advisory table, `supply_chain_hits`, the open majors, and the ten services. It does not say the deploy is done.

### Fixtures and live proof

- The redeploy test reads the real doc. It does not mock the file.
- A fixture string that omits one service must fail.
- A fixture with `order=2026` must fail (A3).
- The merge check is a live Git command. It is not a deploy.

### Anti-pattern coverage

- A3: parse the integer after `order=`.
- A4: an empty doc fails.
- A5: the plan quotes the test exit code. It does not say the services are deployed.
- A6: the registry must not say "redeployed".
- A7: search for the exact forbidden commands. Do not filter on the word "never".

### Review applicability

- Review A: yes. The ten services, the order, the commit, and one real check each.
- Review B: yes, narrow. The doc must not push, must not submit Cloud Build, and must keep the `node:20.18` gap visible. A missing service is an unpatched production gap.
- Review C: no. The phase adds no UI and no API.
- Adversarial: no. The artifact test already fails on a missing service, a bad order, and a commit that does not touch the lockfile. There is no new runtime to attack.
- Browser review: no. The image check is a post-deploy instruction for Daniel's team. This track does not start a browser.

### Phase acceptance checks

- AC-6: the doc test exits 0, and the file names all ten services.
- AC-7: the branch is merged into local `master`. The remote is unchanged.
- No push, no deploy, and no `gcloud` command in the phase log.
- The version-guard test still exits 0 on the merge commit.
