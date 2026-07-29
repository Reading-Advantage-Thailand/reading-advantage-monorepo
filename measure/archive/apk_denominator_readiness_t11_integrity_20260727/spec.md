# Specification: APK Denominator, Readiness, and T11 Release Integrity

## Objective

Resolve the accepted T2 27-source-identity/29-partition-assignment discrepancy and publish a fail-closed readiness contract for downstream cohorts. Revalidate that the T11 release may be consumed only within its accepted, disclosed scope.

## Functional requirements

- Build a source-to-assignment crosswalk from archived T2 manifests; classify each surplus assignment as alias, historical label, or defect.
- Obtain independent review and owner acceptance of the crosswalk before publishing any completeness denominator.
- Verify archive paths/hashes for T10, T11, and release `2026.07.23`; preserve T10's zero adoption approvals and T11's open disclosures.
- Define Ready as cohort-specific proof of semantic adoption, selected output, Advantage Games, Reading, Primary, and exact retirement; T11 alone cannot satisfy it.
- Publish only planning/evidence artifacts. Owner acceptance may remove this predecessor block only for the explicitly listed child cohorts to begin scoped work; it must not make a cohort ready or authorize cutover, deletion, or historical rebuild.

## Acceptance criteria

- The 27/29 relationship is explained without duplicate or unclassified assignments.
- A machine-checkable readiness record rejects missing, stale, revoked, or disclosure-waived input.
- No gameplay, browser, performance, host, or asset-adoption success is asserted beyond accepted evidence.
