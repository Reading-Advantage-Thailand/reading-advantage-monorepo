# Implementation plan

## Phase 1: Contracts and scope

- [x] Review the three priorities with Astra low agents.
- [x] Record the selected contracts and affected callers in review-scope.md.

## Phase 2: Tests and implementation

- [x] Use Sol medium agents to improve verification tasks and prove retained coverage. Commit: 3a573ec2f.
- [x] Narrow Domain imports and verify isolation. Commit: 79865be43.
- [x] Consolidate shared authentication behavior. Commit: f59c60b9a.

- [x] Isolate generated audit fixtures so tests preserve the active track registry. Commit: 26b16fb59.

## Phase 3: Verification and records

- [x] Review changes, run affected checks, update the graph, and commit scoped changes.

## Execution constraints

Run heavy compilers and full suites sequentially on this machine.
Keep source ownership separate across agents.
The owner authorized execution of the priorities; routine implementation choices need no additional approval.
