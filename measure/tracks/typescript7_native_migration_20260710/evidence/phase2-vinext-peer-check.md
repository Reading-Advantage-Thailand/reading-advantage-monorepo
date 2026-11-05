# Phase 2 Task 1: vinext 1.x peer check

- Track: `typescript7_native_migration_20260710`.
- Phase: `Phase 2: vinext 1.x upgrade (PM step 0)`.
- Date: 2026-11-05.
- Role: Measure Junior Green. Model: opencode-go/deepseek-v4.1-flash.
- phase_base_sha: `5841dc528b0bcd22f426f043d86ba9dc7939a448`.
- role_base_sha: `acf282174cee08106897661d1343fd353a29eb20`.

The role used npm registry reads, one light Python gate, and the heavy gates of
test-strategy.md section 4.6. No deploy ran.

## Candidate decision

The PM decision of 2026-11-05 selects option (a): vinext 1.2.0. The React peer of 1.2.0 is
`^19.2.6`, and the repository pins React 19.2.9. vinext 1.2.1 and 1.4.3 ask for React
`^19.3.1`, so they do not fit the current React pin. The note records all three releases.

Task 1 found one blocking row at the base tree. The optional peer `@vitejs/plugin-rsc` asked
for `^0.5.37`, and the repository installed 0.5.27. The PM decision of 2026-11-05 (option
(a)) allowed the Task 2 lockfile refresh to resolve plugin-rsc to 0.5.38 or later inside the
declared `^0.5.27` range. `apps/marketing/package.json:36` stays `^0.5.27`. The resolved
version is 0.5.38. The row and the overall verdict below record the resolved state.

Two peers are optional and absent. `@mdx-js/rollup` (`^3.0.0`) and
`react-server-dom-webpack` (`^19.2.6`) have no install. They do not block.

## Registry output

Command: `npm view vinext@1.2.0 peerDependencies engines --json`.

```text
{
  "peerDependencies": {
    "vite": "^8.0.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "@mdx-js/rollup": "^3.0.0",
    "@vitejs/plugin-rsc": "^0.5.37",
    "@vitejs/plugin-react": "^5.1.4 || ^6.0.0",
    "react-server-dom-webpack": "^19.2.6"
  },
  "engines": {
    "node": ">=22"
  }
}
```

Command: `npm view vinext@1.2.0 peerDependenciesMeta --json`.

```text
{
  "@mdx-js/rollup": {
    "optional": true
  },
  "@vitejs/plugin-rsc": {
    "optional": true
  },
  "react-server-dom-webpack": {
    "optional": true
  }
}
```

Command: `npm view vinext@1.2.1 peerDependencies engines --json`.

```text
{
  "peerDependencies": {
    "vite": "^8.0.0",
    "react": "^19.3.1",
    "react-dom": "^19.3.1",
    "@mdx-js/rollup": "^3.0.0",
    "@vitejs/plugin-rsc": "^0.5.37",
    "@vitejs/plugin-react": "^5.1.4 || ^6.0.0",
    "react-server-dom-webpack": "^19.3.1"
  },
  "engines": {
    "node": ">=22"
  }
}
```

Command: `npm view vinext@1.4.3 peerDependencies engines --json`.

```text
{
  "peerDependencies": {
    "vite": "^8.0.0",
    "react": "^19.3.1",
    "react-dom": "^19.3.1",
    "@mdx-js/rollup": "^3.0.0",
    "@vitejs/plugin-rsc": "^0.5.37",
    "@vitejs/plugin-react": "^5.1.4 || ^6.0.0",
    "react-server-dom-webpack": "^19.3.1"
  },
  "engines": {
    "node": ">=22"
  }
}
```

`npm view vinext dist-tags --json` reports `latest: 1.4.3` and `beta: 1.0.0-beta.0` on
2026-11-05. 1.2.0 is a stable 1.x release.

## Repository values

| Item | Value | Source |
| --- | --- | --- |
| React | 19.2.9 | `pnpm-workspace.yaml:119` |
| React DOM | 19.2.9 | `pnpm-workspace.yaml:120` |
| Vite | 8.1.6 | `pnpm-workspace.yaml:122` |
| `@vitejs/plugin-react` | 6.0.3 | `pnpm-workspace.yaml:126` |
| `@vitejs/plugin-rsc` | 0.5.38 | `pnpm-lock.yaml:939` |
| Node | 24.19.0 | `node --version` |

The host reports Node 24.19.0 on 2026-11-05. The strategy recorded 22.22.3 on an earlier day.
The engine range `>=22` is met in both cases. The `pnpm-workspace.yaml` `overrides.react` and
`overrides.react-dom` values also read 19.2.9. The marketing manifest still declares
`@vitejs/plugin-rsc` `^0.5.27` at line 36.

## Verdict table

| Peer | Range | Repo value | Verdict |
| --- | --- | --- | --- |
| react | `^19.2.6` | 19.2.9 | met |
| react-dom | `^19.2.6` | 19.2.9 | met |
| vite | `^8.0.0` | 8.1.6 | met |
| `@vitejs/plugin-react` | `^5.1.4 \|\| ^6.0.0` | 6.0.3 | met |
| `@vitejs/plugin-rsc` | `^0.5.37` | 0.5.38 | met |
| node | `>=22` | 24.19.0 | met |

Overall: **met**. Decision: **proceed**.

## Peer-check block

```peer-check
{
  "checked_on": "2026-11-05",
  "vinext_candidate": "1.2.0",
  "registry_command": "npm view vinext@1.2.0 peerDependencies engines --json",
  "registry_peers": {
    "vite": "^8.0.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "@vitejs/plugin-react": "^5.1.4 || ^6.0.0",
    "@vitejs/plugin-rsc": "^0.5.37"
  },
  "registry_engines": {
    "node": ">=22"
  },
  "rows": [
    {
      "package": "react",
      "range": "^19.2.6",
      "repo_value": "19.2.9",
      "repo_source": "pnpm-workspace.yaml:119",
      "verdict": "met",
      "optional": false,
      "installed": true
    },
    {
      "package": "react-dom",
      "range": "^19.2.6",
      "repo_value": "19.2.9",
      "repo_source": "pnpm-workspace.yaml:120",
      "verdict": "met",
      "optional": false,
      "installed": true
    },
    {
      "package": "vite",
      "range": "^8.0.0",
      "repo_value": "8.1.6",
      "repo_source": "pnpm-workspace.yaml:122",
      "verdict": "met",
      "optional": false,
      "installed": true
    },
    {
      "package": "@vitejs/plugin-react",
      "range": "^5.1.4 || ^6.0.0",
      "repo_value": "6.0.3",
      "repo_source": "pnpm-workspace.yaml:126",
      "verdict": "met",
      "optional": false,
      "installed": true
    },
    {
      "package": "@vitejs/plugin-rsc",
      "range": "^0.5.37",
      "repo_value": "0.5.38",
      "repo_source": "pnpm-lock.yaml:939",
      "verdict": "met",
      "optional": true,
      "installed": true
    },
    {
      "package": "node",
      "range": ">=22",
      "repo_value": "24.19.0",
      "repo_source": "cmd:node --version",
      "verdict": "met",
      "optional": false,
      "installed": true
    }
  ],
  "optional_absent_peers": [
    {
      "package": "@mdx-js/rollup",
      "range": "^3.0.0",
      "optional": true,
      "installed": false
    },
    {
      "package": "react-server-dom-webpack",
      "range": "^19.2.6",
      "optional": true,
      "installed": false
    }
  ],
  "pm_resolution": "Task 1 found @vitejs/plugin-rsc 0.5.27 against ^0.5.37 at the base tree. PM option (a) allowed the Task 2 lockfile refresh. The resolved version is 0.5.38, and apps/marketing/package.json:36 stays ^0.5.27.",
  "overall": "met",
  "decision": "proceed"
}
```

`registry_peers` lists the five peers with a repository value. The complete registry output
is in the section above. `@mdx-js/rollup` and `react-server-dom-webpack` are optional and
absent. They have no repository value, so they have no row.

## Resolved after the upgrade

| Item | Value |
| --- | --- |
| vinext | 1.2.0 |
| vite | 8.1.6 |
| react | 19.2.9 |
| `@vitejs/plugin-rsc` | 0.5.38 |
| Node | 24.19.0 |

`pnpm why vinext` and `pnpm why vite` give these values for both apps. The raw output is in
`phase2/raw-logs/why-installed.log`. The filtered commands are
`pnpm --filter marketing why vinext`, `pnpm --filter marketing why vite`,
`pnpm --filter activity-vinext-fixture why vinext`, and
`pnpm --filter activity-vinext-fixture why vite`.

The upgrade adds `@vinext/types` and `vite-plugin-commonjs`. It moves `@vercel/og` to 1.0.3
and `@vitejs/plugin-rsc` to 0.5.38. It drops the `vite-tsconfig-paths` peer. The lockfile
diff is limited to the two app importers and the package and snapshot entries of this tree.
`pnpm-workspace.yaml` is unchanged.

## App changes justified

- `apps/activity-vinext-fixture/vite.config.ts`: vinext 1.2.0 needs a Vite config. The first
  H1 build failed with `No Vite config was found for this project`. The new file calls
  `vinext()`. The successful build log is `phase2/raw-logs/H1-build-fixture.log`.

## Resolved-after block

```resolved-after
{
  "vinext": "1.2.0",
  "vite": "8.1.6",
  "react": "19.2.9",
  "reproduce_commands": ["pnpm why vinext", "pnpm why vite"],
  "app_changes_justified": [
    {
      "path": "apps/activity-vinext-fixture/vite.config.ts",
      "reason": "vinext 1.2.0 needs a Vite config; the first H1 build failed with: No Vite config was found for this project.",
      "build_log": "H1-build-fixture.log"
    }
  ]
}
```

## Gate results

All heavy commands ran through
`HEAVY_PRIORITY=p2 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=5400 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<cmd>'`.
Each row wrote its log to `phase2/raw-logs/`. The H0 rows ran on vinext 0.2.0. The H1 rows
ran on vinext 1.2.0.

| Id | Command | Exit | Note |
| --- | --- | --- | --- |
| H0-types-marketing | `pnpm --filter marketing run check-types` | 0 | 0 diagnostics |
| H1-types-marketing | `pnpm --filter marketing run check-types` | 0 | 0 diagnostics |
| H0-types-fixture | `pnpm --filter activity-vinext-fixture run check-types` | 0 | 0 diagnostics |
| H1-types-fixture | `pnpm --filter activity-vinext-fixture run check-types` | 0 | 0 diagnostics |
| H0-build-marketing | `MARKETING_RUNTIME_SMOKE_PORT=4391 pnpm --filter marketing build` | 0 | 154 new files; probe 200 and 401 |
| H1-build-marketing | `MARKETING_RUNTIME_SMOKE_PORT=4391 pnpm --filter marketing build` | 0 | 171 new files; probe 200 and 401 |
| H0-build-fixture | `pnpm --filter activity-vinext-fixture build` | 0 | 48 new files |
| H1-build-fixture | `pnpm --filter activity-vinext-fixture build` | 0 | 70 new files; needs the new Vite config |
| H0-probe-fixture | start the fixture server, then curl `/` | 0 | HTTP 200 and marker present |
| H1-probe-fixture | start the fixture server, then curl `/` | 0 | HTTP 200 and marker present |
| H0-test | `pnpm --filter marketing exec vitest run --maxWorkers=1` | 0 | 65 files, 573 tests |
| H1-test | `pnpm --filter marketing exec vitest run --maxWorkers=1` | 0 | 65 files, 573 tests |
| H1-install | `pnpm install --frozen-lockfile` | 0 | lockfile up to date |

The two builds print no line that matches `warn`. The counter is 0 for all four build logs.

## Gate-results block

```gate-results
{
  "gates": [
    {
      "id": "H0-test",
      "command": "pnpm --filter marketing exec vitest run --maxWorkers=1",
      "exit": 0,
      "log": "H0-test.log",
      "start_epoch": 1793895002
    },
    {
      "id": "H1-test",
      "command": "pnpm --filter marketing exec vitest run --maxWorkers=1",
      "exit": 0,
      "log": "H1-test.log",
      "start_epoch": 1793902375
    },
    {
      "id": "H0-build-marketing",
      "command": "rm -rf apps/marketing/dist && MARKETING_RUNTIME_SMOKE_PORT=4391 pnpm --filter marketing build",
      "exit": 0,
      "log": "H0-build-marketing.log",
      "start_epoch": 1793894876,
      "warning_line_count": 0
    },
    {
      "id": "H1-build-marketing",
      "command": "rm -rf apps/marketing/dist && MARKETING_RUNTIME_SMOKE_PORT=4391 pnpm --filter marketing build",
      "exit": 0,
      "log": "H1-build-marketing.log",
      "start_epoch": 1793902215,
      "warning_line_count": 0
    },
    {
      "id": "H0-build-fixture",
      "command": "rm -rf apps/activity-vinext-fixture/dist && pnpm --filter activity-vinext-fixture build",
      "exit": 0,
      "log": "H0-build-fixture.log",
      "start_epoch": 1793894953,
      "warning_line_count": 0
    },
    {
      "id": "H1-build-fixture",
      "command": "rm -rf apps/activity-vinext-fixture/dist && pnpm --filter activity-vinext-fixture build",
      "exit": 0,
      "log": "H1-build-fixture.log",
      "start_epoch": 1793902325,
      "warning_line_count": 0
    },
    {
      "id": "H0-probe-fixture",
      "command": "PORT=4392 HOSTNAME=127.0.0.1 node node_modules/vinext/dist/cli.js start; curl http://127.0.0.1:4392/",
      "exit": 0,
      "log": "H0-probe-fixture.log",
      "start_epoch": 1793894989
    },
    {
      "id": "H1-probe-fixture",
      "command": "PORT=4392 HOSTNAME=127.0.0.1 node node_modules/vinext/dist/cli.js start; curl http://127.0.0.1:4392/",
      "exit": 0,
      "log": "H1-probe-fixture.log",
      "start_epoch": 1793902357
    },
    {
      "id": "H0-types-marketing",
      "command": "pnpm --filter marketing run check-types",
      "exit": 0,
      "log": "H0-types-marketing.log",
      "start_epoch": 1793894805
    },
    {
      "id": "H1-types-marketing",
      "command": "pnpm --filter marketing run check-types",
      "exit": 0,
      "log": "H1-types-marketing.log",
      "start_epoch": 1793902141
    },
    {
      "id": "H0-types-fixture",
      "command": "pnpm --filter activity-vinext-fixture run check-types",
      "exit": 0,
      "log": "H0-types-fixture.log",
      "start_epoch": 1793894838
    },
    {
      "id": "H1-types-fixture",
      "command": "pnpm --filter activity-vinext-fixture run check-types",
      "exit": 0,
      "log": "H1-types-fixture.log",
      "start_epoch": 1793902186
    },
    {
      "id": "H1-install",
      "command": "pnpm install --frozen-lockfile",
      "exit": 0,
      "log": "H1-install.log",
      "start_epoch": 1793900768
    }
  ],
  "test_counts": {
    "baseline": {
      "log": "H0-test.log",
      "test_files": 65,
      "tests": 573,
      "failures": []
    },
    "after": {
      "log": "H1-test.log",
      "test_files": 65,
      "tests": 573,
      "failures": []
    }
  }
}
```

## Follow-ups

- `pnpm-workspace.yaml` keeps the text `minimumReleaseAgeExclude: vinext@0.2.0` and a comment
  about the 0.2.0 `image-size` pin. This phase does not edit that file.
- The React 19.3.1 upgrade is open in `measure/tech-debt.md`.

## Reproduction

```bash
npm view vinext@1.2.0 peerDependencies engines --json
npm view vinext@1.2.1 peerDependencies engines --json
npm view vinext@1.4.3 peerDependencies engines --json
node --version
pnpm why vinext
pnpm why vite
```

Gate G2.1:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v \
  measure.tests.test_typescript7_native_migration_phase2.P2CheckerTests \
  measure.tests.test_typescript7_native_migration_phase2.P2T1PeerNoteTests
```
