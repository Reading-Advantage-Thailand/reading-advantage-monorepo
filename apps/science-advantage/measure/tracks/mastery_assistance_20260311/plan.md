# Implementation Plan

## Phase 1: Mastery Pipeline Reliability

- [ ] Task: Define failing tests for mastery update correctness
  - [ ] Cover attempt ingestion, standard mastery updates, and edge cases around retries
  - [ ] Capture current calculation or persistence ambiguities
- [ ] Task: Harden mastery update services
  - [ ] Align mastery calculations and persistence with the canonical curriculum/question mapping
  - [ ] Expose enough metadata for downstream recommendation and alert logic
- [ ] Task: Improve mastery profile contracts
  - [ ] Ensure student and teacher mastery views reflect the same data model and thresholds
  - [ ] Remove ambiguous or duplicate mastery state in APIs
- [ ] Task: Measure - Manual Verification 'Mastery Pipeline Reliability'
  - [ ] Verify a completed assessment produces expected mastery changes end to end

## Phase 2: Recommendations and Alerts

- [ ] Task: Define failing tests for recommendation and intervention fallback behavior
  - [ ] Cover AI success, AI failure, invalid output, and cache refresh paths
  - [ ] Cover alert severity thresholds against seeded mastery data
- [ ] Task: Harden recommendation delivery
  - [ ] Tighten prompt inputs, validation, fallback logic, and student-facing explanations
  - [ ] Ensure recommendation surfaces stay useful without AI success
- [ ] Task: Harden intervention signal delivery
  - [ ] Align alert generation, caching, refresh behavior, and teacher UX expectations
  - [ ] Prefer shared-state cache implementations that match the platform contract
- [ ] Task: Measure - Manual Verification 'Recommendations and Alerts'
  - [ ] Verify student and teacher signal flows using seeded mastery scenarios

## Phase 3: Observability and Operations

- [ ] Task: Implement operational metrics and QA guidance
  - [ ] Add clear metrics/logging for latency, fallback use, and failure modes
  - [ ] Document how to inspect and manually verify the signal pipeline
- [ ] Task: Measure - Manual Verification 'Observability and Operations'
  - [ ] Verify logs, metrics, and local QA tools for mastery, recommendation, and alert flows
