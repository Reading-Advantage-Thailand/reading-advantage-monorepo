# APK Evidence Replacement Track-Set Review

## Review scope

Three independent subagents reviewed the drafted ten-track replacement program before commit:

- `adversarial_track_review`: attempted executable bypass, self-review, and false-completion paths.
- `evidence_control_tracks`: audited evidence, role, resource, acceptance, and dependency controls.
- `apk_execution_tracks`: checked execution boundaries, exact corpus partition, batching, and successor gates.

The root agent coordinated and applied the reviewed corrections. The reviewers did not rely on the root's completion claim.

## Mechanical results

- Corpus assignment: 29 entries, 29 unique, zero missing, zero extra, zero duplicates.
- Batch sizes: pilot `3`; action/defense `3 + 3 + 2`; traversal/exploration `3 + 3 + 1`; puzzle/crafting `3 + 3`; special/historical `3 + 2`.
- Required track files: `spec.md`, `plan.md`, `metadata.json`, and `index.md` exist for all ten tracks.
- Metadata parses as JSON and every declared dependency resolves to an existing track.

## Blocking findings corrected

- Removed the failed monolith from all normative successor dependencies and the legacy program graph.
- Replaced self-asserted agent receipts with collaboration-event-attested provenance, `fork_turns="none"` reviewers, per-task ownership, output hashes, and root substantive-output prohibition.
- Made the root coordinator categorically ineligible for T10 review.
- Moved asset forensics onto ordinary hard dependencies for all four cohort manifests.
- Required every candidate disposition and substantive inspection record to receive independent review.
- Replaced ambiguous “significant findings” with explicit Critical, High, and Medium reconciliation.
- Defined fail-closed resource budgets, runnable/non-runnable evidence, partition change control, factual-field evidence, candidate-before-acceptance ordering, and automatic revocation.
- Required product-owner acceptance to bind exact candidate, review, and gate hashes before accepted manifests are generated.
- Required tool-attested user-message provenance for product-owner acceptance and standardized every dependency on canonical `depends_on`.
- Made the execution graph match enforcement: T8 starts only after all four corpus cohorts are accepted.

## Execution decision

These documents define a replacement program only. They do not authorize starting T1 until the product owner reviews and accepts the track set. No successor implementation is unblocked by drafting or committing these files.
