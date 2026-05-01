# Implementation Plan: Live Content Rotation and Pack Management

## Phase 1: Schema and Validation

- [x] Task: Define content-pack schema and IDs.
  - [x] Specify required fields and validation rules.
  - [x] Document versioning and deprecation rules.
- [x] Task: Implement pack validation utilities.
  - [x] Add tests for valid and invalid pack shapes.
  - [x] Add failure messages for missing critical fields.
- [x] Task: Measure - User Manual Verification 'Phase 1: Schema and Validation' (Protocol in workflow.md)

## Phase 2: Rotation Workflow

- [x] Task: Implement pack selection/rotation controls.
  - [x] Add logic to choose active packs.
  - [x] Add rollback path to previous stable pack set.
- [x] Task: Verify game integration with rotated packs.
  - [x] Run targeted loading and gameplay smoke checks.
  - [x] Confirm no regressions in completion/ranking flows.
- [x] Task: Document weekly rotation runbook.
- [x] Task: Measure - User Manual Verification 'Phase 2: Rotation Workflow' (Protocol in workflow.md) [checkpoint: 2222800]

