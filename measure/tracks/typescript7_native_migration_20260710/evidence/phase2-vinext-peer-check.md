# Phase 2 Task 1: vinext 1.x peer check

- Track: `typescript7_native_migration_20260710`.
- Phase: `Phase 2: vinext 1.x upgrade (PM step 0)`, Task 1.
- Date: 2026-11-05.
- Role: Measure Junior Green. Model: opencode-go/deepseek-v4.1-flash.
- phase_base_sha: `5841dc528b0bcd22f426f043d86ba9dc7939a448`.
- role_base_sha: `11903d304caf8f34ffcdf76ecc4559ee25a61f1a`.
- The role used npm registry reads only. No install, build, type check, or deploy ran.

## Candidate decision

The PM decision of 2026-11-05 selects option (a): vinext 1.2.0. The React peer of 1.2.0 is
`^19.2.6`, and the repository pins React 19.2.9. vinext 1.2.1 and 1.4.3 ask for React
`^19.3.1`, so they do not fit the current React pin. The note records all three releases.

One row does not meet its range. The optional peer `@vitejs/plugin-rsc` asks for `^0.5.37`.
The repository installs 0.5.27. `apps/marketing/package.json:36` declares `^0.5.27`, so a
Task 2 install can resolve 0.5.37 or later. This row blocks Task 2 until the PM decides.

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
| `@vitejs/plugin-rsc` | 0.5.27 | `apps/marketing/package.json:36` |
| Node | 24.19.0 | `node --version` |

The host reports Node 24.19.0 on 2026-11-05. The strategy recorded 22.22.3 on an earlier day.
The engine range `>=22` is met in both cases. The `pnpm-workspace.yaml` `overrides.react` and
`overrides.react-dom` values also read 19.2.9.

## Verdict table

| Peer | Range | Repo value | Verdict |
| --- | --- | --- | --- |
| react | `^19.2.6` | 19.2.9 | met |
| react-dom | `^19.2.6` | 19.2.9 | met |
| vite | `^8.0.0` | 8.1.6 | met |
| `@vitejs/plugin-react` | `^5.1.4 \|\| ^6.0.0` | 6.0.3 | met |
| `@vitejs/plugin-rsc` | `^0.5.37` | 0.5.27 | not met |
| node | `>=22` | 24.19.0 | met |

Overall: **not met**. Decision: **stop-ask-pm**. The blocking row is the optional peer
`@vitejs/plugin-rsc`. Task 2 does not start until the PM answers.

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
      "repo_value": "0.5.27",
      "repo_source": "apps/marketing/package.json:36",
      "verdict": "not met",
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
  "overall": "not met",
  "decision": "stop-ask-pm",
  "decision_note": "The blocking row is the optional peer @vitejs/plugin-rsc. The marketing app declares ^0.5.27 at apps/marketing/package.json:36, so the Task 2 install can resolve 0.5.37 or later."
}
```

`registry_peers` lists the five peers with a repository value. The complete registry output
is in the section above. `@mdx-js/rollup` and `react-server-dom-webpack` are optional and
absent. They have no repository value, so they have no row.

## Follow-ups

- `pnpm-workspace.yaml` keeps the text `minimumReleaseAgeExclude: vinext@0.2.0` and a comment
  about the 0.2.0 `image-size` pin. This phase does not edit that file.
- The `@vitejs/plugin-rsc` resolution is the open PM question. See the role handoff.

## Reproduction

```bash
npm view vinext@1.2.0 peerDependencies engines --json
npm view vinext@1.2.1 peerDependencies engines --json
npm view vinext@1.4.3 peerDependencies engines --json
node --version
```

Gate G2.1:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v \
  measure.tests.test_typescript7_native_migration_phase2.P2CheckerTests \
  measure.tests.test_typescript7_native_migration_phase2.P2T1PeerNoteTests
```
