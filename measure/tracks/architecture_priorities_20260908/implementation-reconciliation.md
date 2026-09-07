# Existing candidate refresh

The architecture command rejected the stale candidate snapshot before it ran the active policy.
The documented V2 contract requires the existing fields to describe the final tracked source.

Sol compared the baseline commit db9a9f2b4 with the final source commit 26b16fb59.
Both projections contain 637 findings and eight identical parse errors.
Four existing database findings moved by one line in the changed Science, Codecamp, and Sales files.
The comparison found no new semantic findings.
Evidence: `/tmp/architecture-priorities-comparison.json`.

The existing computation functions refreshed the source snapshot, report digests, and review subject.
Implementation tree digests and artifact digests remain unchanged.
The manifest retains candidate status, default V1 policy, empty reviews, and empty baseline deltas.
The frozen V2 comparison still contains 78 additions, one removal, and 48 renames.
These differences remain unapproved.

Astra accepted the final diff with no findings.
The root committed the refresh as 221081178.
The normal architecture command accepted the manifest and retained V1 policy.
It then failed on 27 pre-existing Games file deletions.
The captured baseline status contains all 27 paths.
Evidence: `/tmp/architecture-boundary-check-final.log` and `/tmp/architecture-priorities-baseline-status.txt`.
