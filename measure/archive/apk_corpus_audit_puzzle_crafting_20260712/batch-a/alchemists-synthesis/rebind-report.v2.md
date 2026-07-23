# Alchemist's Synthesis — V2 additive output rebind report

This V2 report supersedes only the prior receipt's output-byte binding.
Every claim envelope now carries a 64-char SHA-256 blob hash and a 64-char
SHA-256 cited range hash that recomputes from the current bytes. The AS-ROUTE-001
range was widened so the atomic Play anchor is reachable.

No claims were added, removed, or edited. No source, browser, runtime, or
behavioral inference was performed. The rebind is limited to recalculating exact
SHA-256 hashes for the V2 package outputs and confirming the rebind report's own
hash binds to the V2 package.

The superseding V2 receipt binds the V2 hashes for all original outputs and
this report. Independent review remains pending. No commit was created.

All hashes recorded below:

- claim-evidence-ledger.v2.json: d3ea0d89a03f8f0acbc91ba40309c7a2c64bb507dfee51a380521ea0021bee4b
- fixtures.v2.json: 93633588b43db0d235840583d2fb56a8e6dc80713028e7f89d050fe6f13c7ff8
- source-asset-history-ledger.json: b021373a684c27496a5c4913705960ef91de949fec7f936211c2e8b6a45a4453 (V1 unchanged; identity-class content)
- rebind-report.v2.md: c2564ccdf7494f76d2b53a01ec983adffa456affad2bc96c68b1d54d74009c44