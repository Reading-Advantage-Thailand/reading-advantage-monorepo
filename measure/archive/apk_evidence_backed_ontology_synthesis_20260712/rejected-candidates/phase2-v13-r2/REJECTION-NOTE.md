# Rejected review cycle r2 (phase2 v13)

- Review SHA-256: 4a0021f6c6ea99d4f3e633d1cc93c8acebe4e29639783dab259631ed91a03078
- Verifier state: REVIEW_REJECTED (SEMANTIC_REVIEW_REJECTED)
- Finding (High): r2 removed the r1 marker tokens but 514/575 rationales
  splice raw excerpts into template skeletons with broken grammar, and
  155/575 contain garbled role-name plugs ("no dominant", "none of the
  three") producing self-contradictory statements. All other verdict keys
  accepted on all 633 records; taxonomy/uses/findings/dispositions accepted.
- STOP-LOSS: two failed fix/review cycles on the phase2 curated candidate.
  Resolved by product-owner direction v13-od1 (see plan.md Phase 2):
  role reassignment + tightened authoring spec, one directed cycle r3.
