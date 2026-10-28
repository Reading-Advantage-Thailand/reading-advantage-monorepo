# Storytime week sync

## Source hand-off

The PM orchestrator records the Workbooks repository commit that owns the week files and schema.
Do not select a different commit during a sync.

## Receive weeks

From the monorepo root, run the receiver with the handed-off commit:

```bash
pnpm --filter storytime exec tsx scripts/receive-weeks.ts --commit <workbooks-commit>
```

The receiver validates source weeks before it writes them to `apps/storytime/content`.
It preserves each source `meta.status` value and lists required media with its kind and check rule.

## Verify the output

Review the receiver output and inspect the changed files under `apps/storytime/content`.
Compare the source commit and received week names with the PM hand-off before using the files.
