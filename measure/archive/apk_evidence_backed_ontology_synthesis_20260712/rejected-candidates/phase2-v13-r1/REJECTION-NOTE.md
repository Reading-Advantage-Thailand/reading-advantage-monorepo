# Rejected review cycle r1 (phase2 v13)

- Review SHA-256: eee8a43d45dea1a0d218c036c54a4d387430c02ff6c31759ee2f2b4d8f8b08a0
- Verifier state: REVIEW_REJECTED (SEMANTIC_REVIEW_REJECTED)
- Finding (High): 575 non-contradiction context records used templated
  `... marker<hex>` rationales — uniqueness-gaming artifacts that defeat
  `_normalize_rationale`. Verdict: reject on `context_rationale_or_selected_uses`
  for all 575; all other verdict keys accepted.
- Preserved byte-exact per the rejected-history lifecycle rule. Mapper
  remediation r2 must replace rationales with substantive per-record text
  without altering any accepted field.
