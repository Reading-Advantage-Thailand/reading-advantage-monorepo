---
title: "Sprint 1: Core Teacher Experience"
type: sprint-plan
status: completed
created_at: 2025-10-14
tags: [sprint, S1, teacher-experience, class-setup, curriculum-view]
description: Sprint plan for S1, focusing on enabling teachers to create standards-aligned classes and view dynamic curriculum structures.
---

# Sprint 1: Core Teacher Experience - Standards-Driven Class Setup

**Goal:** Enable teachers to create classes where the curriculum is dynamically configured based on the selected standards alignment. This sprint builds on the foundational schema to deliver the first core piece of teacher-facing functionality.

---

## Sprint Prerequisites ✅

Before starting implementation, ensure these prerequisites are complete:

### 1. Schema Migration (COMPLETED ✅)
- [x] Added `joinCode String @unique` field to `Class` model
- [x] Added index on `joinCode` for fast lookups
- [x] Run `npx prisma db push` to apply schema changes

### 2. Seed Data (COMPLETED ✅)
- [x] Created comprehensive seed script: `prisma/seed.ts`
- [x] Demo users: student_demo, teacher_demo, admin_demo (password: Password123!)
- [x] Demo classes:
  - Grade 3 Thai (joinCode: DEMO3T) - 2 units, 5 lessons
  - Grade 4 Thai (joinCode: DEMO4T) - 2 units, 5 lessons
  - Grade 6 NGSS (joinCode: DEMO6N) - 1 unit, 3 lessons
- [x] Curriculum units and lessons populated with bilingual content
- [x] Run `npm run seed` to populate database

### 3. Directory Refactor (REQUIRED - Issue #54)
- [ ] **Issue #54 must be merged FIRST** (elevated to P1 BLOCKING)
- Ensures all feature work uses correct paths: `/app/(dashboard)/...`
- Prevents rework and merge conflicts

### 4. i18n Infrastructure (TODO - Before Sprint)
- [ ] Install `next-intl` or equivalent i18n library
- [ ] Create translation file structure: `/messages/en.json`, `/messages/th.json`
- [ ] Set up i18n middleware and locale detection
- [ ] Define translation keys for Sprint 1 (see Epic #49 for full list)
- [ ] Test language switching functionality

### 5. Development Environment
- [ ] PostgreSQL running via `docker-compose up -d`
- [ ] Environment variables set in `.env.local`
- [ ] Dev server runs: `npm run dev`
- [ ] Tests pass: `npm run test`

---

## User Stories

### Story: Create a Standards-Aligned Class

- **As a teacher,** I want to create a new class by specifying a name, a grade level, and a standards alignment so that the system can provide the correct curriculum for my students.
- **Acceptance Criteria:**
  - A "Create Class" form is available on the teacher dashboard.
  - The form includes fields for `Class Name` (text input), `Grade Level` (dropdown), and `Standards Alignment` (dropdown with 'Thai National Standards' and 'NGSS' as options).
  - All fields are mandatory.
  - Upon submission, a new `Class` record is created in the database with the specified details.
  - The teacher is redirected to their dashboard, where the new class appears.

### Story: View Classes on Dashboard

- **Status**: In Progress (Branch: feat/51-story-view-classes-on-dashboard)
- **Started**: 2025-10-19
- **As a teacher,** I want to see a list of all the classes I have created on my dashboard so I can get a quick overview of my teaching responsibilities.
- **Acceptance Criteria:**
  - The teacher dashboard (`/dashboard`) displays a card for each class created by the logged-in teacher.
  - Each class card displays the `Class Name`, `Grade Level`, `Standards Alignment`, and the number of enrolled students.
  - Clicking on a class card navigates the teacher to the class detail page.

### Story: View Dynamic Curriculum Structure

- **As a teacher,** when I view a specific class, I want to see the curriculum presented as an ordered list of units so I can understand the scope and sequence of the course.
- **Acceptance Criteria:**
  - The class detail page (e.g., `/teacher/classes/[classId]` served from `app/(teacher)/teacher/classes/[classId]/page.tsx`) is a protected route.
  - The page fetches the `Class` details, including its `standardsAlignment` and `gradeLevel`.
  - The application logic uses these two properties to query for the corresponding `CurriculumUnit`s.
  - The page displays a list of `CurriculumUnit` titles, sorted by their `order` field.
  - Each unit in the list can be expanded to show the titles of the `Lessons` it contains, also correctly ordered.

### Story: Access Class Join Code

- **Status**: In Review (Branch: feat/53-story-access-class-join-code)
- **Started**: 2025-10-19
- **As a teacher,** I need to easily find and share a unique join code for each class so that my students can enroll themselves.
- **Acceptance Criteria:**
  - The class detail page prominently displays the unique `joinCode` for the class.
  - There is a button to easily copy the join code to the clipboard.
- **Tests**: `npm run lint`; `npx vitest run lib/utils/clipboard.test.ts` *(integration suite requires \`science_advantage_test_test\` database)*

---

## Technical Tasks & Refactoring

### Story: Refactor `app` Directory Structure

- **As a developer,** I want the `app` directory to follow the documented architecture, so that the project is easier to navigate and maintain.
- **Acceptance Criteria:**
  - The redundant `/app/dashboard` directory is removed.
  - All dashboard-related routes are consolidated under the `/app/(dashboard)/` route group.
  - The `/app/login` directory is moved to `/app/(auth)/login/`.
  - The file structure in `app/` matches the diagram in `docs/architecture/unified-project-structure.md`.
  - All routes and navigation continue to function correctly after the refactor.

---

## Technical Notes

- This sprint requires building the first set of API routes under `app/api/classes/`.
- Frontend components will be built in `components/features/teacher/` (teacher experience) and `components/features/student/`.
- Significant focus will be on the backend logic that correctly queries and assembles the curriculum structure based on the class's alignment.

## Definition of Done

- All user stories are complete and meet their acceptance criteria.
- A teacher can successfully create a class, view it on their dashboard, and see the correctly structured curriculum for the chosen standard.
- All new code is linted, formatted, and passes CI checks.
- The application remains in a deployable and working state.
