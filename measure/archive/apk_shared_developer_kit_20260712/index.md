# APK Shared Developer Kit and Authoring Workflow

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)
- [APK Delivery Program](../../apk-asset-system-program.md)
- [Responsive Composition Specification](../../apk-responsive-game-composition-spec.md)

**Completed 2026-07-26 within a bounded scope:** the owner accepted the
evidence-authorized T11 delivery after independent final review and remediation.
See [owner-delegated acceptance](./t11-owner-delegated-acceptance-v1.json).
Responsive/runtime/asset/browser/mobile/performance/QC-host and cartridge-cutover
gates were explicitly dependency-gated and were not claimed successful in that
historical artifact.

**Owner-authorized extension completed 2026-07-26:** the additive extension
implements forward responsive composition, accessible presentation, semantic
product bindings, reusable gameplay/runtime systems, deterministic QC and
browser helpers, a complete scaffold/exemplar, and the working Advantage Games
`/qc` field lab. It does not rewrite the bounded acceptance or convert T10's
blocked historical evidence into observed behavior. See
[extension authorization](./t11-owner-authorized-extension-v1.json),
[canonical product bindings](./t11-owner-approved-canonical-bindings-v1.json),
and [extension acceptance](./t11-owner-extension-acceptance-v1.json)
(`60fbb63f846cd19873578393684c71e742a73595cf13efd4d96949812598215d`). The owner-authorized API contract version is
`2.0.0`; the package distribution version intentionally remains `0.1.0`.
The acceptance and remediation are intentionally uncommitted and require a
follow-up commit plus reference refresh before becoming an immutable release
record.

Planned deliverables:

- Versioned APK developer-capability contracts
- Shared Phaser systems and standard presentation components
- Compact/wide responsive composition runtime
- Deterministic cartridge test harness and responsive fixtures
- Cartridge generator/scaffold and exemplar
- Advantage Games authoring and QC surfaces
- Developer documentation and migration guide
- Developer-effort comparison and verification

Cartridge work must still prove per-cartridge semantic adoption, selected-union
output, host integration, persistence, representative-device performance, and
cutover. The extension acceptance also discloses unrelated flaky aggregate Jest
behavior, absent Reading/Primary consumers, and unclaimed manual owner browser
inspection.
