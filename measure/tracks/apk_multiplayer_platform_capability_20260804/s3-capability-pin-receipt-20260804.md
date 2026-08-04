# S3 Capability Pin Receipt — `acceptedManifestSha256`

- Track: `apk_multiplayer_platform_capability_20260804`
- Date: 2026-08-04
- Scope: capability registration (Unit 2)
- Artifact bound by the pin: `measure/archive/apk_independent_acceptance_handoff_20260712/accepted-successor-manifest-v1.json`

## Procedure used to derive the hash

Exact procedure from `packages/advantage-play-kit/src/guards/__tests__/architecture-guards.test.ts`
(`sha256(relativePath)`, verified against the on-disk file):

```
absolute = resolve(repoRoot, "measure/archive/apk_independent_acceptance_handoff_20260712/accepted-successor-manifest-v1.json")
sha256 = createHash("sha256").update(readFileSync(absolute)).digest("hex")
```

Executed 2026-08-04 with `node:crypto`; result:

- Recomputed on-disk SHA-256: `e9fc2c9c8074db74670fa2e2929bd4efb5b8d0fd2ef5a8b9819d2f5a6e39ba49`

## OLD and NEW pin values

- OLD `acceptedManifestSha256` (pinned literal): `e9fc2c9c8074db74670fa2e2929bd4efb5b8d0fd2ef5a8b9819d2f5a6e39ba49`
- NEW `acceptedManifestSha256` (pinned literal): `e9fc2c9c8074db74670fa2e2929bd4efb5b8d0fd2ef5a8b9819d2f5a6e39ba49`

## One-line cause

`capability:multiplayer` was added to `ACCEPTED_CAPABILITY_IDS` in
`packages/advantage-play-kit/src/systems/capability-manifest.ts` (seven ids -> eight ids),
with the frozen assertion in `systems/__tests__/capability-manifest.test.ts`, the guard count in
`guards/accepted-inputs.ts` (`assertAcceptedInputs` now requires exactly eight), and
`guards/__tests__/accepted-inputs.test.ts` updated to accept `multiplayer` and still throw
`APKUnsupportedCapabilityError` for unknown ids.

## Deviation note (why OLD == NEW)

The task expected the pin literal to change. It cannot within this task's file scope, and the
reason is recorded here so the orchestrator can decide the successor step:

- The pin is the SHA-256 of the **bound T10 archive artifact**, not of the in-memory
  capability registry. `architecture-guards.test.ts` enforces on-disk equality, and the archive
  file was not modified (its hash still equals the pin, reproduced above).
- `measure/archive/apk_shared_developer_kit_20260712/t11-owner-authorized-extension-v1.json`
  explicitly does **not** supersede "T10 or bounded-T11 hashes" and sets
  `rewrite_bound_artifacts: false`; rewriting or relocating the archive file is a product-owner
  acceptance action, outside this task's allowed paths (`packages/advantage-play-kit/src/**`
  plus this receipt).
- A genuine pin move therefore requires a successor manifest artifact plus an owner acceptance
  step. When that artifact exists, recompute with the procedure above and update
  `ACCEPTED_T10_INPUTS.acceptedManifestSha256` and its literal assertions in
  `systems/__tests__/capability-manifest.test.ts`, `guards/__tests__/accepted-inputs.test.ts`,
  and `guards/__tests__/architecture-guards.test.ts`.
