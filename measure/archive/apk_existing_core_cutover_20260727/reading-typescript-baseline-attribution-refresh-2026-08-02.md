# Reading Full TypeScript Baseline Attribution Refresh — 2026-08-02

## Scope

This is a diagnostic-only refresh for the Existing Core Dragon Flight
corrective phase. It does not mark the active Task 5 item complete, accept
formal Phase 5 or Task 5, authorize a title or cohort, or authorize production
exposure, cutover, retirement, deployment, or product-owner acceptance.

The command was run against the current shared working tree. That tree also
contains parallel application work, so this record is an observation of the
current project diagnostic surface, not a clean-checkout release gate or an
attribution of every diagnostic to a particular change owner.

## Re-observed command and result

From `apps/reading-advantage`, the full project check was run with enough heap
to emit diagnostics rather than terminate at the default heap limit:

```bash
timeout 300s env NODE_OPTIONS=--max-old-space-size=8192 \
  ../../node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false
```

It exited `2` and produced 171 lines containing 79 `error TS` diagnostics.
The captured output is intentionally local-only because it may contain
environment-specific absolute paths:

```text
/tmp/apk-reading-typescript-baseline-2026-08-02.log
SHA-256: cc4b7402ca7a7c5d2be6f2047f09f5e989f8b8e565c47465a1945f9d47d10553
```

Two direct searches of that captured output found no `host-proof` and no
`dragon-flight` match. The diagnostic paths and error surfaces re-observed are
the 79 non-APK surfaces from the 2026-08-01 inventory:

| Owning surface | Count |
| --- | ---: |
| Auth/RBAC test fixture contract | 11 |
| Legacy controller validation test harness | 3 |
| Student UI/session-nullability | 9 |
| License model/admin UI | 2 |
| Google Classroom OAuth integration | 6 |
| Shared UI components and dependency API drift | 21 |
| i18n routing API | 1 |
| Cache query-result contract | 2 |
| Pagination DB API | 1 |
| Seed/schema contract | 2 |
| Backend controllers/data-model contract | 14 |
| AI SDK call-settings API | 5 |
| Audio utility exports | 2 |
| **Total** | **79** |

## Interpretation and boundary

This replaces the earlier post-fix `79 non-local / 0 APK-local` inference with
a completed TypeScript diagnostic run. It supports the narrow conclusion that
the full Reading project currently has 79 reported TypeScript errors and none
is identified by the diagnostic output as Dragon Flight or host-proof work. It
does not make the overall Reading typecheck green, prove that every host-proof
file is error-free under every configuration, or authorize repair of the 79
Reading baseline errors.

The 79 diagnostics remain owned by their respective Reading quality or
remediation work. Per the next executable phase assessment, a separate scoped
remediation authorization is required before changing any of them. The bounded
Dragon Flight CI receipt remains separate technical evidence:
`dragon-flight-host-proof-ci-verification-2026-08-02.md`
(`SHA-256 4e0770263b3d1df4d23c57db76c96e0eb8672e60924cea45099e1e4a76616d13`).

No Task 6 retirement, later-title consumption, cohort acceptance, clean
checkpoint, or owner authorization follows from this record.
