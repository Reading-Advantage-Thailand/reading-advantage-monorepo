# Shared authentication implementation

## Result

The Auth package now owns the shared request cookie reader.
Codecamp, Sales, and Marketing retain their existing exported wrapper names.
Each wrapper delegates to `readRequestCookie`.
The helper has no Next.js dependency.
No mode logic or domain behavior changed.

## Preserved behavior

- A nonempty NextRequest cookie takes priority.
- An empty NextRequest cookie falls back to the Cookie header.
- Cookie names use exact matching.
- The first matching header cookie wins.
- Embedded equals signs remain in the value.
- Encoded values remain unchanged.
- An empty header value returns an empty string.
- A missing cookie returns `undefined`.

## Test evidence

The red test failed because `cookies.ts` did not exist.
The green run passed all six cookie behavior tests.
`git diff --check` passed for the assigned scope.

```bash
CI=true node ../../node_modules/vitest/vitest.mjs run src/company-identity/__tests__/cookies.test.ts --maxWorkers=1
```

The command used the required pinned executable path and pnpm dependency warning setting.

## Remaining verification

The root orchestrator will run the Auth build and affected application tests.
The root orchestrator will update `graph.db` after concurrent edits finish.
Pre-existing edits to `company-identity/client.ts` and its test remain untouched.
