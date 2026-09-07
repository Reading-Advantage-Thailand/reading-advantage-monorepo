# CI follow-up report

## Result

CI now checks out the complete Git history.
It fetches the published `refs/notes/commits` reference through a read-only fetch.
Missing published notes still fail the step.
Historical Auth, Webhooks, and AI checks can now read their required evidence.

CI now uses Node 22.
This matches the runtime used by most current application and worker images.
The current Node 22 release satisfies pnpm 11.8.0's Node requirement.
The pnpm v4 action itself uses an embedded Node 20 action runtime.
Its documented standalone mode bundles the pnpm runtime for incompatible Node pairs.
CI now enables that mode for the pinned pnpm 11.8.0 installation.
The setup order remains compatible with the setup-node pnpm cache.

The Architecture Enforcement CI guard now checks these requirements.
It also binds the workflow to the root `pnpm@11.8.0` package-manager pin.

## Files

- `.github/workflows/ci.yml`
- `packages/architecture-enforcement/src/__tests__/integration-wiring.test.ts`

## Verification

- Architecture Enforcement CI wiring: 3 passed.
- Config full suite: 11 passed across four files.
- YAML parsing: passed.
- Parsed checkout depth: zero.
- Parsed notes fetch: `refs/notes/commits` to the same local reference.
- Parsed pnpm setup: standalone mode enabled.
- Parsed Node version: 22.

## Remaining work

No CI source or test failure remains in this assignment.
The root task owns the final workspace CI run.
