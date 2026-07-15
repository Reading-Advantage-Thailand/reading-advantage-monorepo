# Specification: CodeCamp Measure-Driven AI Development Curriculum Unit

## Summary

Add a new standalone CodeCamp Advantage curriculum unit after AI Integration that teaches interns how to control AI-assisted development with the Measure methodology. The unit must avoid disrupting interns currently in Unit 10 or Unit 11 by appearing later in the course sequence as a production workflow unit.

## Problem

CodeCamp currently teaches GitHub issues, PRs, TDD, AI SDK usage, monorepo structure, Docker, and real-world practice, but it does not explicitly teach the Measure methodology used by this repository. Interns need a practical bridge from "using AI" to "directing AI safely with specs, plans, tests, reviews, and acceptance evidence."

## Goals

1. Add a concise Measure-driven development unit immediately after AI Integration.
2. Teach Measure through a concrete mini-feature rather than abstract framework memorization.
3. Preserve the existing course flow for interns currently in Unit 10 or Unit 11.
4. Shift later production units consistently so the course remains coherent.
5. Update assessment and pacing docs to recognize Measure workflow discipline.

## Non-Goals

- Do not rewrite every earlier unit to use Measure.
- Do not require current in-progress interns to backfill Measure artifacts.
- Do not add product code, database schema, or runtime behavior.
- Do not change CodeCamp app UI or lesson rendering in this track.

## Functional Requirements

### FR-1: New Unit Placement

The curriculum must add a new unit after the existing AI Integration unit.

### FR-2: New Unit Content

The new unit must include an overview and class-period plan covering:

- Measure mental model and artifacts
- track/spec/plan workflow
- Red/Green/review/acceptance cycle
- AI agent control through explicit context and plans
- lessons learned and tech debt hygiene
- a concrete mini-feature workshop

### FR-3: Renumber Later Units

Existing production units after AI Integration must be shifted consistently:

- Monorepo & Package Management becomes Unit 17
- Cloud & Dockerization becomes Unit 18
- Real-World Practice becomes Unit 19

### FR-4: Capstone Alignment

The real-world practice capstone must reference Measure-style workflow as the expected professional delivery lifecycle.

### FR-5: Assessment Alignment

The assessment rubric must include Measure workflow discipline.

### FR-6: Pacing Alignment

The pacing guide must include the new unit and update affected phase/module references.

## Acceptance Criteria

- [ ] `course-spec.md` includes a new Unit 16 for Measure-driven AI development and shifts later units.
- [ ] New Unit 16 overview exists.
- [ ] New Unit 16 class-period plan exists.
- [ ] Existing Unit 16/17/18 curriculum files are renamed or superseded consistently as Units 17/18/19.
- [ ] Capstone docs mention Measure track/spec/plan workflow.
- [ ] Assessment rubric includes Measure workflow discipline.
- [ ] Pacing guide includes the new unit and no longer lists old Unit 16/17/18 meanings as final sequence.
- [ ] A targeted search for old Unit 18 capstone references is reviewed and corrected where material.

## Risks

- Renumbering may leave stale references in docs.
- Adding too much process detail could overwhelm interns.
- Existing app data may still reference old module numbers if curriculum seeding is separate from these Markdown docs; this track only updates source curriculum docs.
