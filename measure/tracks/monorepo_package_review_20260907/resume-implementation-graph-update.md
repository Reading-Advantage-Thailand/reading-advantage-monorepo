# Incremental graph update

Date: 2026-09-08

## Scope

The update used the resumed task reports and `/tmp/monorepo-resume-baseline.diff`.

It included 102 Primary, Reading, and auth-client production TypeScript files.

Tests, generated assets, and game files were excluded. The game owner updated those files separately.

The exact input list is `/tmp/resume-primary-reading-graph-files.txt`.

## Documentation review

Modified classroom boundaries already had complete JSDoc.

The review added missing JSDoc to modified CSV routes, auth refresh behavior, Primary writers, and Primary generators.

The Reading Google Classroom route and Calendar functions already had complete JSDoc.

## Result

Run from the repository root:

```bash
xargs build-graph update graph.db < /tmp/resume-primary-reading-graph-files.txt
```

Result: exit 0.

The update processed 102 files. Nodes changed from 1,319 to 2,361.

Edges changed from 4,628 to 4,573.

Graph search found the new CSV route and lesson progress summaries.

`git diff --check` passed for the reviewed files.

The independent Calendar review confirmed focus retention after selection and clearing.
