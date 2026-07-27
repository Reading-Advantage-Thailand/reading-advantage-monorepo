# Specification: APK Cartridge Migration Umbrella

## Overview

This planning-only umbrella replaces the former monolithic rebuild plan. It pins accepted T10, T11, and standard-pack inputs; records their limits; resolves the T2 27-identity/29-assignment discrepancy before completeness claims; and delegates all implementation to bounded 20260727 child tracks.

## Functional requirements

### FR1: Preserve accepted inputs and disclosures

- Consume only the archive artifacts listed in `ontology-input.md`.
- Preserve T10's zero runtime-contract/asset-mapping approval and T11's disclosed gaps.
- Do not convert archived acceptance evidence into a gameplay, host, performance, or cutover claim.

### FR2: Reconcile the denominator before completeness

- The foundation child track must produce an owner-accepted crosswalk explaining every difference between the 27 source identities and 29 partition assignments.
- Until that crosswalk is accepted, no track may claim complete corpus coverage, complete migration, or complete retirement.

### FR3: Delegate vertical implementation

- Each identity is assigned once to a child cohort or explicitly gated in the historical disposition track.
- Implementation cohorts contain at most five games and prove each game vertically through Advantage Games, Reading, Primary, and exact legacy retirement.
- The new-game intake track may accept evidence and create a future track proposal only; it must not authorize placeholder titles, runtime code, catalog exposure, or a cohort assignment.

### FR4: Bound closeout

- Cross-host closeout may resolve only residual work that no vertical cohort owns.
- It must not repeat a cohort's migration, substitute proof, or make a completeness claim while the crosswalk or cohort gates remain open.

## Out of scope

- Production code, gameplay implementation, host cutover, asset production, catalog publication, and legacy deletion.
- A big-bang Reading/Primary host migration.
- Any acceptance claim beyond the cited archived evidence.
