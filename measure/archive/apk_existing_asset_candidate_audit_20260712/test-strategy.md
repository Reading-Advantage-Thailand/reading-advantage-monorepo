# Test Strategy: APK Per-Candidate Asset Forensics

## Phase 0 boundary

Phase 0 freezes accepted inputs, the exact T2 asset denominator, deterministic
batching, role ownership, numeric resource ceilings, stop-loss rules, and later
falsification gates. It does not open an asset, extract metadata, classify content,
map callers, decide provenance, assess suitability, assign a disposition, or rerun a
browser or predecessor gate.

The immutable T2 base is the byte-exact accepted `asset-file-denominator.json`
at SHA-256 `41c9ede1a8e5ddab21b74a99959fbddc35b5f5a6902740a740a48f174bf7f438`:
426 repository-relative paths in 225 identical-hash groups. The sole effective T8
denominator is that base plus accepted delta SHA-256
`71592625cbe09671937b7406afa38f3f59232c0345de455467121dc038863db2`:
428 paths in 227 groups across five in-repository roots. Desktop sister repositories
are unbound and out of denominator. In particular,
unfinished `../fantasy-asset-forge/` and `../pixel-art-generator/` outputs remain
downstream external-production inputs and are not T8 candidates. The additive
owner authorization at commit `84abd0e2` permits only T8 per-candidate forensics and
does not authorize ontology, production, asset use, implementation, shipping,
browser/gate reruns, or success claims.

## Phase 0 structural falsification

The focused Phase 0 contract must pass before any content work begins. It asserts
every frozen T1-T7 and owner-authorization digest; the
authorization commit ancestry; exactly 428 unique paths, 227 unique groups, one
record revision, and five roots; exact 12-batch coverage with atomic groups and
24-group/40-path ceilings; numeric budgets and stop losses; incompatible roles; and
the absence of later-phase completion claims.

The stabilized expected Red is only the absence of the clean successor Phase 0 review.
JSON syntax errors, digest drift, count mismatch, scope expansion, later batch outputs,
or asset-content claims are invalid Red causes and stop the track.

## Batch contracts

The 12 batches are the fixed contiguous hash-group ranges in
`phase0-input-freeze-v1.json`. A group may share one visible/audible inspection, but
every path retains its own caller/use, provenance, suitability, disposition, and
review record. Phase 4 may divide a candidate batch into at-most-three-game join
slices; it may not move paths or groups between batches.

For each batch, testing proceeds in this order:

1. Revalidate all accepted input digests and the exact batch path/group set.
2. Require truth-test negative fixtures before producer Green.
3. Reconcile mechanical metadata and caller records to every path.
4. Reconcile provenance/license evidence; unknown provenance prevents reuse/adapt.
5. Reconcile visible/audible inspection to every group and member path.
6. Join only to exact accepted T3-T7 scene usage, in at-most-three-game slices.
7. Independently review every substantive record and disposition with fresh context.

No batch advances with an unsupported claim, denominator/hash mismatch, resource
breach, unmeasured usage, or unresolved Critical, High, or Medium finding. Two failed
fix/review cycles block the track pending product-owner direction.

## Phase gates

- Phase 1 Green requires 428 path-specific mechanical/caller records and exact
  duplicate-group reconciliation. It establishes metadata only.
- Phase 2 Green requires exact provenance evidence or explicit unknown for all paths.
- Phase 3 Green requires visible/audible records for all 227 groups and per-path links.
  Contact sheets and playlists are navigation only.
- Phase 4 Green requires accepted scene-usage joins and separate compact/wide, Chibi
  `cute_chibi_v1` and original `heroic_stylized_v1` assessments; missing evidence
  cannot be replaced by analogy or franchise-derived visual claims.
- Phase 5 Green requires exact 428/227 reconciliation, zero unresolved blocking
  findings, a non-consumable candidate, and complete independent review. Only later
  root-orchestrator product-owner acceptance bound to exact hashes permits an
  accepted manifest. Acceptance requires automated contracts, applicable Kimi
  WebBridge evidence, independent LLM review, and direct visual inspection.

Structural passes never establish factual correctness. This strategy does not accept
T8, close Phase 0, publish lifecycle artifacts, or authorize T9. All T3-T7 disclosures,
unknowns, forbidden success claims, and revocation rules remain binding.
