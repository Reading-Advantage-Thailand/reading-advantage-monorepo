# Implementation Plan: OpenCode Agent Orchestration Refresh

## Phase 1: Agent Contracts

- [x] T1.1 Reassign the twelve Measure agents and update role ownership, applicability, handoff, and audit-only rules. Verified by `opencode agent list` and 11 checker tests on 2026-07-14.
- [x] T1.2 Remove obsolete Pro coder agents and revise the subscription-aware coder roster and routing matrix. Verified by `opencode agent list` and no stale alias search results on 2026-07-14.

## Phase 2: Mechanical Enforcement

- [x] T2.1 Add failing checker tests for marker parsing, audit provenance, pass invariants, result blocks, role registration, strategy freshness, violation categories, and prerequisites. `python3 -m unittest discover -s ~/.agents/skills/measure-orchestrator/tests -p 'test_*.py'` passes 11 tests.
- [x] T2.2 Update orchestration contracts, role order, and interphase checks to satisfy the tests. `python3 -m py_compile` passes for checker and tests.

## Phase 3: Verification

- [x] T3.1 Validate model availability, agent frontmatter, checker tests, diffs, and independent reviews. `opencode models`, `opencode agent list`, `git diff --check`, independent quality review, and independent contract audit completed 2026-07-14.
