# Implementation Plan: Historical/Cancelled Identity Disposition

- [x] Confirm the foundation's accepted 27/29 crosswalk and freeze source locators for the five identities. [source lock: 41e8bd2]
- [x] Write failing evidence-contract checks for unsupported current, playable, or rebuild status. [red: 0f05a55; green: 41e8bd2]
- [x] Independently review current/historical/cancelled evidence and author one disposition per identity. [candidate: 4ea1a02; A5 remediation: 777003e; independent review: accepted]
- [x] Verify no catalog route, host import, placeholder, or semantic adoption was introduced by the disposition work. [guard: 613272517; independent review: phase4-independent-review-2026-07-31.md; focused unittest 10/10]
- [x] Obtain product-owner acceptance of the five dispositions and publish explicit future-track criteria. Acceptance is bound by `product-owner-acceptance-v1.json`; future work is governed by `future-track-criteria-v1.json`; no gameplay, playability, rebuild, route, catalog, host, asset, migration, cutover, retirement, release, or completeness claim is made.
- [x] Update the portfolio ledger with the accepted gating state without claiming completeness. `measure/tracks.md` now records `accepted-gated-disposition-only`; `future-track-criteria-v1.json` remains the only future-work gate; the track remains active-directory/complete and is not archived by this task.
