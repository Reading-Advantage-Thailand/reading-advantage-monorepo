# APK Durable Successor Registry and Release Admission

## Purpose

Make the single-successor rule in the APK standard-pack ingestion ledger
durable, atomic, and backend-owned. This track replaces the injected
process-local registry boundary with a PostgreSQL-backed implementation while
preserving the play-kit ledger's portable interface.

## Boundary

This infrastructure may admit a verified immutable release candidate. It does
not ingest a real asset, grant product acceptance, publish a Git release,
expose a cartridge, or authorize title migration, cutover, retirement, or
deployment.

## Dependencies

- [APK Standard-Pack Suitability and Canonical Ingestion](../apk_standard_pack_suitability_ingestion_20260728/)
- Existing backend, database, and tenant-registry conventions

## Key artifacts

- [Specification](./spec.md)
- [Implementation plan](./plan.md)
- [Track metadata](./metadata.json)
