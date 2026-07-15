# Codecamp production deployment evidence — 2026-07-15

## Released scope

- Measure-driven curriculum module with three production lessons.
- Media-capable lesson rendering and the implemented diagram/video slice.
- Versioned APK Unit 20 for newly assigned cohorts.
- Targeted MiMo intervention tutor, immutable support records, and safe admin projection.
- Graph-bound PR review attempts/evidence, release policy, and append-only corrections.
- Database migration `0036_codecamp_mastery_evidence` and associated migration-doctor gate.

## Safety and deployment evidence

- Production Cloud SQL backup: `1784075631261`, status `SUCCESSFUL`.
- Feature Cloud Build: `b53c7f3d-dc32-487b-8e96-16e7a81cee54`, status `SUCCESS`.
- Production seed build: `38c57fdd-fafd-48b9-a3ba-fcbcb6a480fe`, status `SUCCESS`.
- Tenant-scope hotfix commit: `efdfe98d`.
- Final Cloud Build: `e86f4cca-0d09-4e95-ba35-b43a3a4b8c9a`, status `SUCCESS`.
- Final Cloud Run revision: `codecamp-advantage-00019-682`, ready with `100%` traffic.
- Deployed image digest: `sha256:995d86e1aadbad8fe93ce93fbe0e7ac3afbc5ec804b63e147011982738d1dffb`.
- No revision-level Cloud Run error logs were present after browser acceptance.

## Verification evidence

- Codecamp app tests: `47` files passed, `1` skipped; `935` tests passed and `200` policy/live tests skipped by design.
- Codecamp production build: `21/21` tasks passed.
- Focused TenantDB regression: `94/94` domain tests passed.
- Live PR-review preflight: `~x-ai/grok-latest` resolved to `x-ai/grok-4.5`; structured output and provenance passed.
- Live tutor preflight: `xiaomi/mimo-v2.5`; strict diagnostic response and provenance passed.
- Authenticated Chrome acceptance: dashboard API `200`, `106` lessons, Measure module and three lessons present, diagram visible, admin evidence/correction surface visible.

## Honest release boundaries

- PR evaluation is deployed in `shadow` mode. It is advisory and cannot mutate learner-visible status or Mastery until the human-labelled fixture, canary, and approval gates pass.
- Unit 20 is intentionally assigned only to new/versioned cohorts. Existing interns retain their original 19-module sequence.
- The media/diagram track remains active because only 3 of the specified 16 diagrams and the initial video mapping are complete.
- The tutor track remains active until an assigned learner completes authenticated browser/mobile acceptance and longitudinal efficacy work is separately defined.
