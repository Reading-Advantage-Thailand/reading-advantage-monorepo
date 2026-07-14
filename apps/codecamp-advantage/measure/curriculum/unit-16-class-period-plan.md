# Unit 16 Class Period Plans: Measure-Driven AI Development

---

## Period 1: Measure Mental Model and Project Context

**Duration:** ~60 minutes

### Opening (5 min)

- AI coding assistants are powerful, but they drift when context is vague
- Measure gives the assistant a controlled workflow: context → spec → plan → implementation → review
- Today: learn the artifacts before asking AI to write code

### Activity: Why Measure Exists (10 min)

Discuss common AI coding failure modes:

- It implements more than you asked for
- It ignores project conventions
- It changes the wrong layer
- It writes tests after the fact that do not prove behavior
- It forgets decisions from previous sessions

Measure prevents these by making context and workflow explicit.

### Activity: Inspect Core Measure Artifacts (20 min)

Open the local Measure files and identify each artifact's purpose:

```text
measure/
├── product.md              # Why the product exists
├── tech-stack.md           # Deliberate technology choices
├── workflow.md             # How work is executed and verified
├── tracks.md               # Registry of active and archived work
├── lessons-learned.md      # Project memory
├── tech-debt.md            # Known shortcuts and deferred work
└── tracks/<track_id>/
    ├── spec.md             # What this track must accomplish
    ├── plan.md             # How implementation proceeds
    └── metadata.json       # Track identity and status
```

Prompt questions:

1. Which file explains why the product exists?
2. Which file should change before introducing a new major dependency?
3. Which file is the source of truth while implementing a feature?
4. Where should a known shortcut be recorded?

### Activity: Read a Tiny Track (20 min)

Instructor provides a small example track:

```text
track_id: tracker_empty_state_YYYYMMDD
goal: Show a helpful dashboard empty state when a student has no progress
```

Students identify:

- requirements
- non-goals
- acceptance criteria
- likely test cases
- files likely to change

### Closing (5 min)

- Measure is not paperwork; it is control over AI-assisted work
- Preview: Period 2 turns a feature request into a spec and plan

---

## Period 2: Track, Spec, and Plan Workshop

**Duration:** ~60 minutes

### Opening (5 min)

- Last period: Measure artifacts and mental model
- Today: write a small track before coding

### Activity: Choose a Mini-Feature (5 min)

Pick one feature for the Student Progress Tracker:

1. Dashboard empty state for students with no progress
2. "Last active" label on student profile
3. Quiz retake validation message
4. Module completion status helper

### Activity: Draft `spec.md` (20 min)

Write a short spec with this structure:

```markdown
# Specification: <Feature Name>

## Summary
One paragraph describing the change.

## Goals
- Goal 1
- Goal 2

## Non-Goals
- What this track will not do

## Functional Requirements
### FR-1: <Requirement>
Specific required behavior.

## Acceptance Criteria
- [ ] Observable outcome 1
- [ ] Test or verification outcome 2
```

Instructor checks that every acceptance criterion is testable or manually verifiable.

### Activity: Draft `plan.md` (25 min)

Create a phased plan:

```markdown
# Implementation Plan: <Feature Name>

## Phase 1: Red
- [ ] Write a failing test for the expected behavior.
- [ ] Run the targeted test and confirm it fails for the right reason.

## Phase 2: Green
- [ ] Implement the minimum code needed to pass the test.
- [ ] Run the targeted test and confirm it passes.

## Phase 3: Review and Acceptance
- [ ] Run lint/type/test checks required for the changed files.
- [ ] Write PR summary with what changed, why, and how it was tested.
- [ ] Record any lesson learned or tech debt if applicable.
```

Students must name the exact command they expect to run for Red and Green, for example:

```bash
pnpm vitest run src/__tests__/module-completion.test.ts
```

### Closing (5 min)

- A good plan lets an AI assistant work safely
- Preview: Period 3 uses the plan to implement with AI assistance

---

## Period 3: AI-Assisted Implementation, Review, and Closeout

**Duration:** ~60 minutes

### Opening (5 min)

- Today: use AI as an implementer, not as the planner
- The intern remains responsible for verifying behavior and scope

### Activity: Give the AI the Right Context (10 min)

Before asking for code, provide:

- the track goal
- `spec.md`
- `plan.md`
- relevant file paths
- the exact task to perform
- the command that proves success

Example prompt shape:

```text
Read this spec and plan. Implement only Phase 1 Red for the dashboard empty state.
Write the failing test first. Do not implement the UI yet. The test command is ...
```

### Activity: Red and Green Implementation (25 min)

Students execute the workflow:

1. Mark the current task in `plan.md`
2. Ask AI to write the failing test only
3. Run the targeted test and confirm Red
4. Ask AI to implement the minimum Green change
5. Run the targeted test again
6. Run any broader checks required by the change

### Activity: Review Evidence and PR Description (15 min)

Write a PR description using this structure:

```markdown
## Summary
What changed and why.

## Measure Track
Track: <track_id>

## Acceptance Evidence
- [x] Red test failed before implementation: <command>
- [x] Green test passed after implementation: <command>
- [x] Manual verification: <specific result>

## Notes
Lessons learned or tech debt, if any.
```

### Closing (5 min)

- The mini-feature is complete only when evidence matches the plan
- Next unit: Monorepo & Package Management
