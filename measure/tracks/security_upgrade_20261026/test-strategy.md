# Test strategy: Security upgrade — Next.js, React, sharp and the critical and high npm fixes

> **Track:** `security_upgrade_20261026` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md) · **Audit:** [audit-2026-10-26.md](./audit-2026-10-26.md)
> **Branch:** `chore/security-upgrade-2026-10` in `/home/daniebo/Desktop/rama-worktrees/security-upgrade`
> **role_base_sha:** `a64616a4d` (the branch start). The P1 Green gate uses it. The Phase 2 role base is `9ee850588`, the accepted Phase 1 HEAD. Neither SHA is `phase_base_sha`.
> **Model deviation:** The role table pins `claude-code/claude-opus-5-5[1m]#high`. The Phase 1 strategy ran on `xai/grok-4.7#high`. The Phase 2 strategy runs on `minimax-cn-coding-plan/MiniMax-M3#high`. Grok has no quota.

The audit is the source for every version. Spec section 6 names the nine open majors. It no longer names `js-yaml`. Both `js-yaml` lines move as a minor bump (`3.14.2` to `3.15.2`, `4.2.0` to `4.3.2`). The guard includes both lines. The guard does not require `3.x` to become `4.x`.

`graph.db` is present. This track changes versions and adds tests. It changes no exported product symbol. A caller check is not a phase gate.

## 1. Rules for every phase

### 1.1 Machine, install, and heavy jobs

The worktree has no `node_modules`. Install before the first Vitest run.

- Heavy jobs run only through `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`.
- Heavy jobs are `pnpm install`, Vitest, Jest, `tsc`, `eslint`, `turbo`, `next build`, and `vinext build`.
- Vitest uses `--maxWorkers=1`. Jest uses `--runInBand`.
- Do not run `pnpm turbo run test`, `pnpm turbo run build`, or `pnpm turbo run lint` on the whole monorepo.
- A turbo call that this file allows uses `--concurrency=1`. The default concurrency can exhaust 7 GB.
- One heavy job runs at a time. The next heavy job starts after the previous one ends.
- Every heavy command carries a `timeout` inside the `heavy-run.sh` string. A command without a bound holds the lock forever.
- Do not push, deploy, run Cloud Build, or run `gcloud`.
- Do not change a Dockerfile or a Cloud Build file.

Install before the lockfile changes (Phase 1 Red):

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && timeout 3600 pnpm install --frozen-lockfile --offline'
```

If the store lacks a package, run the online command once:

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && timeout 3600 pnpm install --frozen-lockfile'
```

Install after the lockfile changes. Do not use `--offline`. The new tarballs are not in the store.

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && timeout 3600 pnpm install --frozen-lockfile'
```

Retry the online command one time on `ECONNRESET`, `ETIMEDOUT`, or `ENOTFOUND`. A second failure is class `not-run`. Do not drop `--frozen-lockfile`.

### 1.2 Capture of `phase_base_sha`

The orchestrator captures `phase_base_sha` before the Red run of a phase starts.

1. Run `git rev-parse HEAD` in this worktree.
2. Record that SHA in the Red evidence of that phase in `plan.md`.
3. Do not change the SHA after the capture.

This file does not contain `phase_base_sha`. A SHA that predates the committed strategy of that phase is not valid.

- Phase 1: the base was the commit that held the strategy, before the Phase 1 Red run of 2026-10-27.
- Phase 2: the base must be the commit that holds this strategy, the spec fix and the audit fix. The capture happens after that commit and before the Phase 2 Red run. The Red evidence of task 2.1 records it.
- Phase 3: the base is the commit that holds the Phase 3 strategy, before the Phase 3 Red run. Do not reuse the Phase 2 SHA.

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

The list has three registers. The floor register holds 29 rows. The file `tests/security-upgrade-guard-list.ts` holds the same 29 rows in `GUARD_ENTRIES`. The open-major register holds 2 rows. The no-fix register holds 2 rows. The two registers hold no floor. The floor test never asserts them.

#### Floor register (29 rows)

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
| `@xmldom/xmldom` | `0.9.` | `0.9.12` | the xmldom ids in audit §2 |
| `brace-expansion` | `1.` | `1.1.20` | the brace-expansion ids in audit §2 |
| `brace-expansion` | `2.` | `2.1.6` | same brace-expansion ids |
| `brace-expansion` | `5.` | `5.0.11` | same brace-expansion ids |
| `browserslist` | `4.` | `4.28.7` | `GHSA-73wf-gq98-2v4g` `GHSA-c83g-rgw3-j3cx` |
| `compression` | `1.` | `1.8.2` | `GHSA-vc2v-76pw-4v95` |
| `fast-uri` | `3.` | `3.1.7` | the fast-uri ids in audit §2 |
| `fast-xml-parser` | `5.` | `5.10.1` | `GHSA-8r6m-32jq-jx6q` |
| `follow-redirects` | `1.` | `1.16.1` | `GHSA-8r9p-f939-6h3c` `GHSA-q3jh-wrc6-jgq8` |
| `image-size` | `2.` | `2.0.3` | `GHSA-5p2g-fcmc-qvqq` `GHSA-w3rx-r6r6-pgpr` |
| `ip-address` | `10.` | `10.3.1` | `GHSA-mwp4-54f8-5fhr` |
| `js-yaml` | `3.` | `3.15.2` | the js-yaml ids in audit §2 |
| `js-yaml` | `4.` | `4.3.2` | same js-yaml ids |
| `source-map-js` | `1.` | `1.2.2` | `GHSA-68fv-2mgg-jv7q` |

Do not add `react-server-dom-*` unless a `packages:` key exists. The `next` floor is the control for those advisories.

#### Open-major register (2 rows)

These rows carry no floor. The guard file holds them in `OPEN_MAJORS`. The reason of each row names spec section 6.

| Package | Locked | Fixed | Advisory ids | Reason |
| --- | --- | --- | --- | --- |
| `@opentelemetry/sdk-node` | 0.57.2 | 0.217.0 | `GHSA-q7rr-3cgh-j5r3` | OpenTelemetry 2 migration, spec §6. |
| `@opentelemetry/exporter-prometheus` | 0.57.2 | 0.217.0 | `GHSA-q7rr-3cgh-j5r3` | OpenTelemetry 2 migration, spec §6. |

#### No-fix register (2 rows)

These rows carry no floor. The guard file holds them in `NO_FIX_AVAILABLE`. The `fixedVersion` of each row stays null. Plan task 1.9 holds the registry evidence.

| Package | Vulnerable range | Fixed | Advisory ids | Direct parent |
| --- | --- | --- | --- | --- |
| `extract-zip` | `<= 2.0.1` | none | `GHSA-7pqw-9j4j-h8q3` `GHSA-jmr9-qjv8-65gv` | `@puppeteer/browsers@2.6.1` |
| `url-regex` | `<= 5.0.0` | none | `GHSA-v4rh-8p82-6h5w` | `text-preprocessor@1.1.1` |

The other seven open majors stay out of the guard file. Their reason is in spec section 6. The names are `zod` on the 3. line, `nodemailer`, `next-mdx-remote`, `vinext`, `@opentelemetry/propagator-jaeger`, `@faker-js/faker` and `basic-ftp`.

### Packages the guard must not require

A dedicated test reads the guard list. These names must not appear as floor rows:

`nodemailer`, `next-mdx-remote`, `vinext`, `@opentelemetry/propagator-jaeger`, `@opentelemetry/sdk-node`, `@opentelemetry/exporter-prometheus`, `@faker-js/faker`, `basic-ftp`, `extract-zip`, `url-regex`.

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
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && timeout 900 pnpm exec vitest run --config vitest.config.ts --maxWorkers=1 tests/security-upgrade-version-guard.test.ts'
```

**GREEN_TEST_COMMAND:** the same command. It must exit 0.

### Commands that are not the Vitest gate

Task 1.9 saves `pnpm audit --json`. Run it through `heavy-run.sh`. Retry once on the network errors in section 1.1. Do not put this command inside the version-guard test.

The pass rule is not the top-level count. Read each vulnerability name and severity. A remaining critical or high advisory is allowed only in one of two classes.

**Class `open-major`.** The package name is one of the nine names of spec section 6: `zod`, `nodemailer`, `next-mdx-remote`, `vinext`, `@opentelemetry/propagator-jaeger`, `@opentelemetry/sdk-node`, `@opentelemetry/exporter-prometheus`, `@faker-js/faker`, `basic-ftp`. A `zod` finding is in this class only when the locked version starts with `3.`. A `zod` finding on another line is in scope.

**Class `no-fix`.** The package name is `extract-zip` or `url-regex`. The advisory id is one of the ids of `NO_FIX_AVAILABLE` in `tests/security-upgrade-guard-list.ts`: `GHSA-7pqw-9j4j-h8q3`, `GHSA-jmr9-qjv8-65gv`, `GHSA-v4rh-8p82-6h5w`. Plan task 1.9 holds the registry evidence that no patched release exists. A finding of another id for these two names is in scope.

A critical or high advisory outside these two classes is in scope. A missing `vulnerabilities` key fails closed. Record `in_scope_critical=<n>` and `in_scope_high=<n>`. Both must be 0. The report names the nine open majors of spec section 6 and the two no-fix packages. `js-yaml` is in neither class. The `js-yaml` lines moved to 3.15.2 and 4.3.2, so a `js-yaml` finding in a later report is in scope.

The two classes are name lists. They do not use a word filter. A package outside both lists fails the gate.

Task 1.10 repeats the name-and-version match from audit §5.1. A failed fetch is `not-run`. It is not "no hit". Record `supply_chain_hits=<n>` only after a completed match.

### Green gate

1. `GREEN_TEST_COMMAND` exits 0.
2. The minimum Red list is gone from the failure output. The plan quotes both runs.
3. The audit summary has `in_scope_critical=0` and `in_scope_high=0`. It names the nine open majors and the two no-fix packages.
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

| ID | Defense in this phase | Falsification condition |
| --- | --- | --- |
| A1 | The parser reads package keys, not a substring. | A comment-only fixture fails the `next` floor, or a key `next@16.2.9:` passes. |
| A3 | Versions use labels. The check parses the value after the label. | The check passes on any digit, a date, or a year. |
| A4 | An empty `packages:` section fails, and an empty guard list fails. | An empty `packages:` section passes, or a guard list of length 0 passes. |
| A5 | A `pass` row needs `exit_code=0` and a log that holds that code. | The plan says "all checks pass" while a cited command exits non-zero. |
| A7 | The major exclusion is an explicit name list. Scoped names stay. | A filter drops `@sentry/nextjs` or a real `brace-expansion` line. |
| A9 | The version-guard test reads repo files only. | The version-guard test fails after the track moves to `measure/archive/`. |

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

**Scope.** AC-5 names the ten app folders of the matrix below. It does not name the ten Cloud Run services. Nine folders map to a covered service. The live Reading service stays outside this criterion. Plan task 1.9 holds the coverage boundary.

### Runtime note (image optimization)

`next@16.4.1` fixes flaws in the image optimizer. It requires `sharp` `^0.35.5`. The `sharp` bump changes libvips, libheif, and librsvg. A bad native binary fails at request time. It may still pass `next build`.

`apps/marketing` builds with `vinext` `0.2.0`. That package depends on `next@16.2.9` in the lockfile today. The override moves it to `16.4.1`. The marketing build is the live proof of that pair. A marketing build failure is an `upgrade-defect`, unless the same command fails on `role_base_sha`.

A browser check of one or two apps is not worth its cost here.

- The machine has 7 GB. The builds already fill it.
- A local server uses the workstation binary, not the Alpine image.
- `reading-advantage` still ships `node:20.18`. A local pass does not prove that image.
- The redeploy list carries one HTTP check per covered service. Each check names one path that the service already serves. Daniel's team runs it after the deploy.

### Memory safety on this machine

The machine has 7 GB of RAM. At 19:10 ICT on 2026-10-27 the memory guard killed every session. One heavy job next to another heavy job can take the machine down. The rules below apply to every command of this phase.

- Every `check-types`, `lint`, `test` and `build` command runs through `heavy-run.sh`. No command runs outside it.
- One heavy job runs at a time. The next command starts after the previous command ends.
- A turbo call uses `--concurrency=1`. The default concurrency can exhaust 7 GB.
- Every command carries a `timeout` inside the `heavy-run.sh` string. A command without a bound holds the lock forever.
- The root `pnpm turbo run test`, `pnpm turbo run build` and `pnpm turbo run lint` do not run. They fan out over the whole monorepo.
- A build does not start with less than 2 GB of free memory.

| Command | Bound in seconds |
| --- | --- |
| `check-types` | 1800 |
| `lint` | 1200 |
| `test` | 1800 |
| `build` | 2400 |
| The full Jest suite of `reading-advantage` | 720 |
| The shared turbo call of the five light apps | 3600 |
| The install | 3600 |

A command that reaches its bound exits 124. Class the row `not-run` with `source=timeout`. A command that the kernel kills exits 137. Class the row `not-run` with `source=machine_heap`. A `not-run` row blocks AC-5.

### What Red writes

Red writes `tests/security-upgrade-verification-ledger.test.ts`. The ledger file is absent, so the test fails. That fail is the Red result.

Ledger path: `measure/tracks/security_upgrade_20261026/verification-ledger.json`. Green writes that file. The test reads the ledger. It never writes it.

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

The ledger test does not run the app builds. It is an artifact test. AC-5 stays open until the live logs exist. A green ledger test alone does not close AC-5. The matrix rows are live behavior tests. The proof of AC-5 is the live log of each command.

**RED_TEST_COMMAND:**

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && timeout 900 pnpm exec vitest run --config vitest.config.ts --maxWorkers=1 tests/security-upgrade-verification-ledger.test.ts'
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
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && timeout 3600 pnpm exec turbo run check-types lint --concurrency=1 --filter=accounting --filter=accounts --filter=workbooks --filter=sales-advantage --filter=storytime'
```

Do not add `marketing`, `codecamp-advantage`, `www-reading-advantage`, `primary-advantage`, or `reading-advantage` to that call. Do not put `build` or `test` in a turbo call. `turbo` `test` depends on `^build` and can build the graph.

Every other check is one `heavy-run.sh` call:

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && timeout 1800 pnpm --filter <name> run check-types'
```

Replace `<name>` with the package name of the matrix row. Use the script name from `package.json`. Do not invent a script.

Vitest scripts get `--maxWorkers=1` by a direct exec when the package script does not set it:

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && timeout 1800 pnpm --filter <name> exec vitest run --maxWorkers=1'
```

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

### The packages outside the app matrix

Task 1.11 ran a phase check on four packages outside this matrix. It recorded `PHASE_CHECK_EXIT=2`. The check-types command of both play-kit packages exited 2. The dependency `activity-runtime` also exited 2. No new run of the `activity-runtime` check-types script exists.

These five packages are not app folders. They are not in AC-5. Phase 2 records one check-types run for each of them. The plan names the exit code of every run.

| Package | Reason for the row | Order |
| --- | --- | --- |
| `@reading-advantage/activity-runtime` | Task 1.11 recorded exit 2 for its check-types script. The script runs `pnpm build` first. | first |
| `@reading-advantage/advantage-play-kit` | Task 1.11 recorded exit 2 for its check-types command. | after `game-contracts` builds |
| `@reading-advantage/advantage-play-kit-3d` | Task 1.11 recorded exit 2 for its check-types command. | after `game-contracts` builds |
| `@reading-advantage/activity-react` | The package changed in Phase 1. Task 1.11 recorded a pass. | after the two play-kit rows |
| `@reading-advantage/auth-client` | The package changed in Phase 1. Task 1.11 recorded a pass. | after the two play-kit rows |

Build the workspace dependencies before the check-types rows. The task 1.11 evidence names the cause: `packages/game-contracts` points its `types` at `./dist/index.d.ts`, and the fresh worktree had no `dist`. Run this command first:

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && timeout 1800 pnpm --filter @reading-advantage/game-contracts run build'
```

A row that is still red after the dependency build is an `upgrade-defect`. It blocks the Green gate of this phase. It does not change the AC-5 count, which names the ten app folders. A row with no run is `not-run` with `source=not-run`. It blocks the Green gate. The plan states the class and the base comparison.

### reading-advantage Jest and the 8192 heap

The build script requests `--max-old-space-size=8192`. The machine has 7 GB. The value 8192 MB is above the physical memory of the machine. The script stays as it is. Do not change it.

Run that build alone. No other heavy job runs at the same time.

The script sets `NODE_OPTIONS` itself through `cross-env`. An outer `NODE_OPTIONS` does not reach the build. The fallback runs the same build command with a lower heap.

Step 1 runs the package script as declared:

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && timeout 2400 pnpm --filter reading-advantage run build'
```

Step 2 is the fallback. The safe heap value is 3072 MB. A lower cap is a stricter condition. A build that passes with 3072 MB passes with 8192 MB.

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && NODE_OPTIONS=--max-old-space-size=3072 timeout 2400 pnpm --filter reading-advantage exec next build'
```

Step 3 runs the same command with 4096 MB. Use it only when step 2 stops with a JavaScript heap message.

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && NODE_OPTIONS=--max-old-space-size=4096 timeout 2400 pnpm --filter reading-advantage exec next build'
```

Green records the heap values in the log and in the ledger row: `script_heap=8192`, `run_heap=<n>`. The `command` field of the row names the command that ran. A row that used a fallback names `exec next build` in that field. Do not record the package script name for a fallback run.

If the kernel kills the build, the row is `not-run` with `source=machine_heap` and `exit_code=137`. Do not class it `predates-track`. Do not class it `pass`. Retry one time only, after every other heavy job has stopped. The retry starts at step 2. A second kill stays `not-run` and blocks AC-5.

A build that stops with a JavaScript heap message at 3072 MB and again at 4096 MB is `not-run` with `source=machine_heap`. It blocks AC-5.

The same rule applies to the `primary-advantage` build, which requests 4096, and to its check-types, which requests 6144. The fallback for each is the same command with `NODE_OPTIONS=--max-old-space-size=3072` and `pnpm --filter primary-advantage exec`.

Do not run the full Jest suite as the gate. Tech-debt records a hang above 10 minutes. Start the Jest runner with a 12-minute bound and one worker:

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && timeout 720 pnpm --filter reading-advantage exec jest --runInBand --forceExit --watchAll=false --testTimeout=20000'
```

If no suite summary appears, stop it. Class that hang `predates-track` with `source=measure/tech-debt.md:2026-05-23`. Then run one targeted file so the runner proof is not empty:

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && timeout 720 pnpm --filter reading-advantage exec jest --runInBand --forceExit --watchAll=false --testTimeout=20000 lib/games/xp.test.ts'
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

### Intentionally red aggregate suites

The root `pnpm turbo run test` is not a gate of this phase. It is red for faults that predate this track. Do not claim that it passes. Do not quote its exit code as a phase result.

The full Jest suite of `reading-advantage` is not a gate. Its hang is a known tech-debt row. The targeted file run above is the runner proof.

The `packages/db` test suite is not a gate. Its failures are `upgrade-defect` until a name list proves otherwise.

### Architecture guardrails

- The `overrides` block is the resolution contract for `next`, `react`, `react-dom` and `vite`. Every app of the matrix must resolve `next` 16.4.1.
- The catalog is the only `sharp` range. Every app that uses `next` must resolve `sharp` 0.35.5 or later.
- `apps/marketing` keeps `vinext` 0.2.0. Its build is the live proof of the `vinext` with `next` 16.4.1 pair.
- `apps/reading-advantage` keeps `node:20.18` in its Dockerfile. The phase changes no Dockerfile and no Cloud Build file.
- The live Reading service stays outside the matrix. Plan task 1.9 holds the boundary.
- A package that resolves a `next` below 16.4.1 is an `upgrade-defect`. The version-guard test reads the lockfile keys and names the package.

### Changed-contract risks

- The lockfile refresh crossed four transitive majors: `@nodable/entities` 2.2.0 to 3.1.0, `ajv-formats` 2.1.1 to 3.0.1, `dotenv` 16.6.1 to 17.4.2, and `is-unsafe` 1.0.1 to 2.0.2. It crossed 19 zero-point minors of the `sharp` family.
- A build that ignores type errors is not a type pass. `apps/reading-advantage` sets `ignoreBuildErrors: true`. Its `check-types` row is the type gate.
- A manifest range can disagree with the lockfile. The version-guard test reads the lockfile keys.
- The peer range of `packages/api` admits `next` 15.x. The override forces `next` 16.4.1. The phase records the range as a known risk. A peer range change stays out of scope for this track.

### Green gate

1. `GREEN_TEST_COMMAND` exits 0.
2. Every matrix pair has one row.
3. `upgrade_defect=0` and `not_run=0`. The five rows outside the app matrix count in these two numbers.
4. Each `pass` row has a log under `measure/runs/security_upgrade_20261026/`.
5. The version-guard command still exits 0.
6. `pnpm audit --json` still meets the P1 pass rule. It has two allowed classes. Retry once on the network errors.
7. The five rows outside the app matrix hold a run and a class. Their exit codes are in the plan.

### Closeout gate

The Green gate, then Review A, then Review B, then the adversarial pass on the guard and the ledger. The checkpoint waits for `upgrade_defect=0` and `not_run=0`.

### Fixtures and live proof

- No mock of `next build`. The build log is the live proof.
- The ledger test reads the ledger and the logs. It does not stub them.
- A refutation ledger in memory must fail when `class` is `pass` and `exit_code` is 1.
- A refutation ledger with zero rows must fail.
- A refutation ledger with a `not-run` row and `source=machine_heap` must fail.
- A refutation ledger with a `pass` row and no log file must fail.
- The heap fallback runs the real build. It is not a mock.

### Anti-pattern coverage

| ID | Defense in this phase | Falsification condition |
| --- | --- | --- |
| A1 | The class is an enum. The test does not search for the substring "deferred" or "pre-existing". | A ledger row with a free-text class passes the test. |
| A3 | Exit codes, counts and heap values use labels: `exit_code=`, `pass=`, `predates=`, `upgrade_defect=`, `not_run=`, `script_heap=`, `run_heap=`, `source=`. | The test passes on any digit, a date, or a year. |
| A4 | An empty ledger fails. A missing row for a matrix pair fails. | A ledger with zero rows passes, or a matrix pair without a row passes. |
| A5 | A `pass` row needs `exit_code=0` and a log that holds that code. | A row says `pass` while its log holds a non-zero code. |
| A6 | The registry must not say the upgrade is done before AC-4 and AC-5 are recorded. | `measure/tracks.md` says the CVEs are resolved while a row is red. |
| A7 | The red apps are an explicit name list. The scan does not use the words "never" or "do not". | A filter drops `reading-advantage` or `primary-advantage`. |
| A8 | Plan notes use `[ ]`, `[~]`, `[x]`, or `[b]`. This role does not edit `plan.md`. | A new task uses a space inside the marker. |
| A9 | The ledger test resolves `measure/archive/security_upgrade_20261026/` first. | The test fails after the track moves to `measure/archive/`. |
| A10 | The phase adds no exported product symbol. Do not run `measure/generate.sh`. | A phase adds an exported function and skips the graph update. |
| A15 | The ledger holds no hash field. Provenance is a Git commit. | A new SHA-256 field appears in the ledger. |
| A16 | The phase runs in the assigned worktree. Section 1.5 holds the rule. | A role creates a second worktree for this track. |

### Review applicability

| Review | Applies | Reason |
| --- | --- | --- |
| Review A (security) | yes | The ledger must match the logs. A green build must not be a type pass for `reading-advantage`. |
| Review B (security, narrow) | yes | The audit must keep zero in-scope critical and high advisories. No `upgrade-defect` may be relabeled `predates-track`. |
| Review C (UX and API) | no | The phase changes no handler, no schema, and no response shape. Image behavior is a post-deploy HTTP check. |
| Adversarial | yes, bounded | The phase attacks the ledger classes and the guard false-pass cases. Plan task 2.14 holds this pass. It must not reproduce a CVE. |
| Browser review | no | The machine has 7 GB and the builds fill it. A local page does not prove the Alpine image. The post-deploy check belongs in P3. |

### Phase acceptance checks

- AC-5: the ten app folders of the matrix have live logs for check-types, lint, test, and build, classified by the rules above. The shared package rows have live logs too.
- `reading-advantage` type evidence is `check-types`, not the build.
- `marketing` build log shows `vinext build` completed.
- No row is `not-run` or `upgrade-defect`.
- The five rows outside the app matrix hold a run and a class.
- The version-guard test still exits 0.
- The audit report still meets the P1 pass rule with its two allowed classes.
- Review A and Review B record no open critical or high defect.

## P3: Redeploy list and merge

**Risk:** medium. A wrong list can leave a service unpatched. The phase adds a document and a local merge. It does not deploy.

### Inputs from the Phase 1 and Phase 2 audits

The Phase 3 strategy applies these items before the Phase 3 Red writes the redeploy test.

- Review A finding 1: name the label for the reason of the not-covered entry and the label for the owner of the patch. Use `reason=` and `owner=`.
- Review A finding 2: name the literal that the not-covered entry holds for the source of its live image. Plan task 3.2 gives `web/Dockerfile` line 2.
- Review A finding 3: the not-covered entry holds the mark `NOT COVERED by this commit`. The test checks for that substring.
- Review A finding 4: name the entry delimiter. Use one table row per service. The entry starts with the service name.
- BSEC-10: each covered `check=` names one path that the service already serves. One generic check per service is not enough.

Two items stay open until the merge. The closeout log names both.

- Adversarial finding 1: the version guard has no CI step. `.github/workflows/ci.yml` runs five Vitest files under `packages/`. `turbo run test` has no task for the root package. A later lockfile downgrade meets no failing gate. This track changes no CI file. The gap needs an owner before the merge.
- Adversarial finding 3: the peer range of `packages/api` admits `next` 15.x. The override forces `next` 16.4.1. Peer ranges stay out of scope for this track. The closeout log names the range as a known risk.

### What Red writes

Red writes `tests/security-upgrade-redeploy-list.test.ts`. The doc is absent, so the test fails.

The test reads `docs/deployment/security-upgrade-2026-10.md`. That path stays after archive (A9).

The test fails when:

- The file is missing or empty (A4).
- Any of the nine covered service names is missing: `accounting`, `accounts`, `codecamp-advantage`, `marketing`, `primary-advantage-app`, `sales-advantage`, `storytime-app`, `workbooks`, `www-reading-advantage`.
- A covered entry lacks `app=`, `commit=`, `order=`, or `check=`.
- Covered `order=` values are not the integers 1 through 9, each once. Parse the integer after the label (A3).
- `primary-advantage-app` does not have the highest covered order.
- The `reading-advantage-web` entry lacks the exact mark `NOT COVERED by this commit`, its reason, the live image source `web/Dockerfile` line 2 (`FROM node:20.18`) in the legacy repository, or the owner of its patch.
- The `reading-advantage-web` entry contains `app=apps/reading-advantage`, `commit=`, `order=`, or `check=`.
- The file lacks `node:22-alpine` or `node:20.18`.
- The file contains `git push` or `gcloud builds submit`.
- A covered `commit=` is `HEAD`, `latest`, or shorter than 7 hex digits.
- `git merge-base --is-ancestor <commit> HEAD` fails, or that commit does not touch `pnpm-lock.yaml`.

Suggested order for the nine covered services, lowest load first. Task 3.3 may adjust the order, but `primary-advantage-app` stays last.

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
| 9 | `primary-advantage-app` | `apps/primary-advantage` |

Each covered `check=` is one HTTP GET of a path the app already serves. A check that only says "deploy succeeded" fails Review A. The `primary-advantage-app` check requests one `next/image` URL and requires status 200. Daniel's team runs the check. This track does not. `reading-advantage-web` is not covered by this commit and has no deploy check here.

The runtime note in the file must say: `node:22-alpine` needs no tag change; a rebuild pulls Node `22.23.4`. `apps/reading-advantage/Dockerfile` stays on `node:20.18` until Daniel decides. The separate live service `reading-advantage-web` uses `node:20.18` from the legacy repository's `web/Dockerfile` line 2; identify the patch owner in its not-covered entry.

**RED_TEST_COMMAND:**

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/security-upgrade && timeout 900 pnpm exec vitest run --config vitest.config.ts --maxWorkers=1 tests/security-upgrade-redeploy-list.test.ts'
```

**GREEN_TEST_COMMAND:** the same command. It must exit 0. The merge is not part of this command.

### Green gate

1. `GREEN_TEST_COMMAND` exits 0.
2. The version-guard test still exits 0.
3. P2 still has `upgrade_defect=0` and `not_run=0`.
4. Review A and Review B of the list find no open critical or high defect.

### Closeout gate

The Green gate, then the local merge of `chore/security-upgrade-2026-10` into local `master`. Do not push. The merge stops when a P1 or P2 check is red. After the merge, `git merge-base --is-ancestor <upgrade-commit> master` exits 0. The PM report names the merge SHA, the advisory table, `supply_chain_hits`, the open majors, and the nine covered services. It does not say the deploy is done. The closeout log names the two open items of the audit inputs above.

### Fixtures and live proof

- The redeploy test reads the real doc. It does not mock the file.
- A fixture that omits one of the nine covered services or the `reading-advantage-web` not-covered entry must fail.
- A fixture that omits the not-covered mark, reason, legacy image source, or patch owner must fail.
- A fixture that adds `app=apps/reading-advantage`, `commit=`, `order=`, or `check=` to `reading-advantage-web` must fail.
- A fixture with `order=2026` must fail (A3).
- The merge check is a live Git command. It is not a deploy.

### Anti-pattern coverage

| ID | Defense in this phase | Falsification condition |
| --- | --- | --- |
| A3 | The check parses the integer after `order=`. | A fixture with `order=2026` passes. |
| A4 | An empty doc fails. | A missing doc passes. |
| A5 | The plan quotes the test exit code. It does not say the services are deployed. | The plan says "redeployed" while the test exits non-zero. |
| A6 | The registry must not say "redeployed". | `measure/tracks.md` says the deploy is done before the merge. |
| A7 | The scan searches for the exact forbidden commands. It does not filter on the word "never". | A doc with `gcloud builds submit` passes. |

### Review applicability

- Review A: yes. The nine covered services, the order, the commit, and one real check each. Verify that `reading-advantage-web` is marked not covered and has no commit, order, or check.
- Review B: yes, narrow. The doc must not push, must not submit Cloud Build, and must keep the `node:20.18` gap visible. A missing service is an unpatched production gap.
- Review C: no. The phase adds no UI and no API.
- Adversarial: no. The artifact test already fails on a missing service, a bad order, and a commit that does not touch the lockfile. There is no new runtime to attack.
- Browser review: no. The image check is a post-deploy instruction for Daniel's team. This track does not start a browser.

### Phase acceptance checks

- AC-6: the doc test exits 0, and the file names all ten Cloud Run services: nine covered entries and the not-covered `reading-advantage-web` entry.
- AC-7: the branch is merged into local `master`. The remote is unchanged.
- No push, no deploy, and no `gcloud` command in the phase log.
- The version-guard test still exits 0 on the merge commit.
