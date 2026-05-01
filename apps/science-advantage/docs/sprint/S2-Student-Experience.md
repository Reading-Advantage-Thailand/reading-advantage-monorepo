---
title: "Sprint 2: Core Student Experience"
type: sprint-plan
status: completed
created_at: 2025-10-19
tags: [sprint, S2, student-experience, enrollment, curriculum-access]
description: Sprint plan for S2, focusing on enabling students to join classes, view enrollments, and navigate the curriculum structure.
---

# Sprint 2: Core Student Experience - Enrollment & Structured Lesson Access

**Milestone**: Sprint 2: Core Student Experience
**Epic Tracker**: #67
**Status**: COMPLETE ✅
**Created**: 2025-10-19
**Completed**: 2025-10-21
**Duration**: 2 days
**Issues Created**: 14 (1 epic tracker + 5 stories + 8 tasks)
**Completion**: 100% (14/14 issues closed)

**Goal:** Enable students to join classes and navigate the curriculum in the same structured, standards-aligned format that the teacher sees. This sprint focuses on the student's initial experience with the platform.

**Achievement:** All sprint goals met! Students can now join classes, view enrollments, navigate curriculum, view lesson content with standards, and access settings.

---

## User Stories

### Story: Join a Class

**Issue**: #63 - Created: 2025-10-19
**Priority**: P1
**Labels**: type:feature, area:frontend, area:backend
**Status**: Completed ✅
**Started**: 2025-10-20
**Completed**: 2025-10-21
**PR**: #78 - https://github.com/Reading-Advantage-Thailand/science-advantage/pull/78
**Submitted**: 2025-10-20
**Merged**: 2025-10-20
**Merge Commit**: dc95580864d0fcb944bf0568ab7c1ff1a80f48fb
**Reviewers**: _(pending)_
**Notes**: Backend join endpoint live (#69); frontend join form (#70) integrated and navigation now lands on a student class placeholder view until Story #65 ships.

- **As a student,** I want to join a class using a unique join code provided by my teacher so I can get access to the course materials.
- **Acceptance Criteria:**
  - The student dashboard has a clear "Join Class" button or form.
  - The student enters the 6-character `joinCode`.
  - The system validates the code and, if successful, creates a `ClassEnrollment` record linking the student to the class.
  - The student is redirected to their dashboard, where the newly joined class now appears.
  - The system provides a clear error message for invalid or non-existent join codes.

**Tasks:**
- #69: Task: BE - Create join class API endpoint
- #70: Task: FE - Create join class form

### Story: View Enrolled Classes

**Issue**: #64 - Created: 2025-10-19
**Priority**: P1
**Labels**: type:feature, area:frontend
**Status**: Completed ✅
**PR**: #81 - https://github.com/Reading-Advantage-Thailand/science-advantage/pull/81
**Merge Commit**: 17a3ad8a1978a26bbbee7fbd60cf6af2c05f1f05
**Started**: 2025-10-20
**Completed**: 2025-10-20
**Reviewers**: @bodangren
**Notes**: Backend endpoint delivered via PR #80; frontend dashboard now consumes it with loading, empty, and error states for enrolled classes. Placeholder student class view covers navigation until Story #65 delivers the full experience.

- **As a student,** I want to see all the classes I am enrolled in on my dashboard so I can easily access them.
- **Acceptance Criteria:**
  - The student dashboard (`/dashboard`) displays a card for each class the student is enrolled in.
  - Each class card shows the `Class Name`, `Grade Level`, and the `Teacher's Name`.
  - Clicking a class card navigates the student into the class view.

**Tasks:**
- #71: Task: BE - Create enrolled classes API endpoint
- #72: Task: FE - Display enrolled classes

### Story: Navigate a Standards-Aligned Curriculum

**Issue**: #65 - Created: 2025-10-19
**Priority**: P1
**Labels**: type:feature, area:frontend, area:backend
**Status**: In Progress
**Started**: 2025-10-21

- **As a student,** when I enter a class, I want to see the curriculum organized into units and lessons so I can easily find what I need to work on.
- **Acceptance Criteria:**
  - The student's view of the class curriculum is identical to the teacher's view.
  - The application uses the class's `standardsAlignment` and `gradeLevel` to render the correct sequence of `CurriculumUnits` and the `Lessons` within them.
  - The UI clearly indicates which lessons have been completed or started (initial implementation can be simple placeholders).

**Tasks:**
- #73: Task: BE - Create curriculum API endpoint (Status: Complete ✅, Started: 2025-10-21, Completed: 2025-10-21, PR: #82, Merge: ac2083f)
- #74: Task: FE - Display curriculum (Status: Complete ✅, Started: 2025-10-21, Completed: 2025-10-21, PR: #83, Merge: 2498f36)

### Story: View Lesson Content and Standards

**Issue**: #66 - Created: 2025-10-19
**Priority**: P2
**Labels**: type:feature, area:frontend, area:backend
**Status**: Completed ✅
**Completed**: 2025-10-21

- **As a student,** I want to be able to open a lesson and read its content, and also see which educational standards it covers.
- **Acceptance Criteria:**
  - [x] Clicking on a lesson title navigates to the lesson viewer page (e.g., `/classes/[classId]/lessons/[lessonSlug]`).
  - [x] The lesson viewer displays the main content of the lesson (e.g., the reading passage).
  - [x] A section on the page clearly lists the specific `Standard(s)` that the lesson fulfills (e.g., "Covers Standard: NGSS 3-LS1-1"). This data is pulled from the lesson's relationship with the `Standard` model.

**Tasks:**
- #75: Task: BE - Create lesson content API endpoint (Status: Completed ✅, Branch: feat/75-task-be-create-lesson-content-api-endpoi, Started: 2025-10-21, Completed: 2025-10-21, PR: #84, Merge Commit: 9113f16)
- #76: Task: FE - Display lesson content (Status: Completed ✅, Branch: feat/76-task-fe-display-lesson-content (deleted), Started: 2025-10-21, Completed: 2025-10-21, PR: #87, Merge Commit: 22c420f)

### Story: Student Settings Page

**Issue**: #68 - Created: 2025-10-19
**Priority**: P2
**Labels**: type:feature, area:frontend
**Status**: Completed ✅
**Branch**: feat/68-story-student-settings-page (deleted)
**Started**: 2025-10-21
**Completed**: 2025-10-21
**PR**: #88 - https://github.com/Reading-Advantage-Thailand/science-advantage/pull/88
**Merge Commit**: 03ac8e7

- **As a student,** I want a simple settings page where I can manage my account details.
- **Acceptance Criteria:**
  - [x] A "Settings" link in the user menu navigates to `/settings`.
  - [x] The settings page displays the student's name and email.
  - [x] The settings page has a placeholder for future settings, such as "Notification Preferences" and "Language Preferences".

**Note:** This story uses dynamic form views based on Zod schemas; no separate tasks needed.

---

## Technical Notes

- API routes will be needed for joining a class and fetching class/curriculum data from a student's perspective.
- This sprint will involve creating the student-facing dashboard and class navigation components.
- The logic for displaying the curriculum structure can be reused from Sprint 1, but will be applied within the context of the student's role.

## Definition of Done

- All user stories are complete and meet their acceptance criteria.
- A student can successfully join a class, view its structured curriculum, and read a lesson's content.
- The student view is consistent with the teacher's view of the curriculum.
- All new code is linted, formatted, and passes CI checks.
- The application remains in a deployable and working state.
