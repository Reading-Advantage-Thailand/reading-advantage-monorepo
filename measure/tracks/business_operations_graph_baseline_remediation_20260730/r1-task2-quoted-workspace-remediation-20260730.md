# R1 Task 2 Quoted-Workspace Parsing Remediation

- Track: `business_operations_graph_baseline_remediation_20260730`
- Status: Task 2 remains `[~]`; no source-snapshot acceptance is claimed here.

## Discarded replacement attempt

The first replacement stable-window bundle, `r1-task2-source-snapshot-cb6f01a73a37`, successfully ran and replayed but is invalid and will not be committed. Its rich manifest recorded quoted pnpm workspace entries as `"apps/*`, `"packages/*`, `"packages/integrations/*`, and `"services/*` rather than their exact declared values.

## Root cause and correction

`_parse_yaml_simple` stripped YAML quotes before removing the list marker. For a line such as `- "packages/*"`, the leading quote therefore remained. The parser now removes the list marker first, then trims whitespace and matching quotes; non-list content in the `packages` block is ignored.

## Executable evidence

Red:

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_snapshot.BusinessOperationsGraphSnapshotRedTests.test_workspace_package_globs_are_recorded_from_pnpm_workspace -v
```

Result before the parser correction: expected `["packages/*"]`, actual `["\"packages/*"]`.

Green:

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_snapshot measure.tests.test_business_operations_graph_baseline_remediation -v
```

Result: `Ran 51 tests ... OK`.

## Required follow-up

Delete the invalid generated bundle, commit this bounded parser repair, then capture and publish one fresh scan-bracketed bundle with exact quoted workspace globs before marking R1 Task 2 complete.
