# Phase 0 security remediation

Commit `5ac0cbfc9342204a368c51f54a5522f1180ebc28` remediates Review B findings
SMC-P0-RB-001 through SMC-P0-RB-004.

It retains the production lease capability, validates exact imports, uses
descriptor-driven packed imports, snapshots proof inputs, and reports audited
HEAD plus source and archive digests.

The post-commit proof recorded HEAD
`5ac0cbfc9342204a368c51f54a5522f1180ebc28` and source digest
`590d2d3dd7081f0152563f07b4ae86b4ceca5bdb2dd728b9c64342b2e6c5bf1e`.

Task B remains in progress. This change does not close shared-root gates.

Green correction commit `b3578c678` replaces a formatting-sensitive source test.
It proves process-start identity binding and stale-owner mismatch reclamation.
The targeted test passed 3/3. Prettier and immutable-diff checks passed.

The runtime-compat aggregate test exceeded a 360-second command timeout after
the packed suite passed. This result is not Green evidence.
