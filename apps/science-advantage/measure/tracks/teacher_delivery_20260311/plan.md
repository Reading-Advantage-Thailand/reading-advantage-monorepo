# Implementation Plan

## Phase 1: Class Detail as the Teacher Control Surface

- [ ] Task: Define failing tests for class detail and curriculum state visibility
  - [ ] Cover class metadata, curriculum alignment, roster context, and empty states
  - [ ] Capture current placeholder or missing teacher signals
- [ ] Task: Implement curriculum-aware class detail pages
  - [ ] Make class detail the source of truth for curriculum state and next actions
  - [ ] Ensure join code and roster surfaces remain intact
- [ ] Task: Remove or replace placeholder dashboard cards
  - [ ] Hide unfinished widgets or swap them for real delivery signals
  - [ ] Keep the teacher landing page focused on actionable information
- [ ] Task: Measure - Manual Verification 'Class Detail Control Surface'
  - [ ] Verify a teacher can understand class status immediately after landing

## Phase 2: Lesson Preview and Assignment Flow

- [ ] Task: Define failing tests for teacher lesson preview and assignment behavior
  - [ ] Cover preview fidelity for standards, lesson types, and content completeness
  - [ ] Cover the assignment or pacing decision path from class detail
- [ ] Task: Implement teacher preview and assignment workflow
  - [ ] Finalize preview surfaces using the same structured content contract as the student app
  - [ ] Add the minimum assignment/pacing workflow needed for classroom use
- [ ] Task: Align progress views with curriculum delivery
  - [ ] Improve class, student, and lesson visibility so teachers can plan interventions and follow-up
  - [ ] Ensure links between dashboards, analytics, and lesson preview are coherent
- [ ] Task: Measure - Manual Verification 'Lesson Preview and Assignment Flow'
  - [ ] Verify a teacher can preview, assign, and inspect progress for a lesson end to end

## Phase 3: Delivery QA and Documentation

- [ ] Task: Document teacher delivery workflows
  - [ ] Capture manual QA steps and operating assumptions for teacher-facing curriculum delivery
  - [ ] Record unresolved teacher workflow debt in `measure/tech-debt.md`
- [ ] Task: Measure - Manual Verification 'Teacher Delivery QA'
  - [ ] Verify the documented teacher workflow against a seeded local environment
