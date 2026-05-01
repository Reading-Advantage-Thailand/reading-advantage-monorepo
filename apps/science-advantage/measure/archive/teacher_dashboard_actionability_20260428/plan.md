# Implementation Plan

## Phase 1: Dashboard Data Surfaces

- [x] Task: Define failing tests for dashboard data endpoints
  - [x] Write tests for class progress aggregation (completion rate, average score, active students)
  - [x] Write tests for students-needing-attention count (mastery < 0.6 across classes)
  - [x] Write tests for recent completions feed (5 most recent LessonCompletion records)
- [x] Task: Implement dashboard data API
  - [x] Create `/api/teachers/dashboard` endpoint aggregating class progress, attention count, and recent completions
  - [x] Implement efficient queries (avoid N+1 — aggregate in Prisma, not in application code)
  - [x] Add loading states and error handling
- [x] Task: Replace placeholder dashboard cards
  - [x] Build `ClassProgressCard` component with color-coded completion rates
  - [x] Build `StudentsNeedAttentionCard` with count and link to intervention details
  - [x] Build `RecentCompletionsFeed` with student name, lesson title, score, timestamp
  - [x] Remove the three placeholder cards ("No recent activity", "No upcoming deadlines" x2)
- [x] Task: Measure - Manual Verification 'Dashboard Data'
  - [x] Verify class progress shows real completion percentages
  - [x] Verify students-needing-attention shows accurate count

## Phase 2: Curriculum Accordion and Class Management

- [x] Task: Make curriculum accordion interactive
  - [x] Write tests for lesson click navigation and completion badge display
  - [x] Add click handler to lesson entries in `CurriculumAccordion` → navigate to teacher lesson preview
  - [x] Add completion count badge next to each lesson (X/Y students completed)
  - [x] Add loading state for completion data
- [x] Task: Implement class editing
  - [x] Write tests for class update API (rename, description change)
  - [x] Add PATCH endpoint to `/api/classes/[classId]` for name/description updates
  - [x] Add edit button on class detail header with inline edit form
- [x] Task: Implement class deletion
  - [x] Write tests for class delete (with and without student progress data)
  - [x] Add DELETE endpoint to `/api/classes/[classId]`
  - [x] Add delete button with confirmation dialog on class detail page
  - [x] Soft-delete if students have progress; hard-delete if no progress
- [x] Task: Implement class roster view
  - [x] Write tests for roster API (student list with name, email, join date, last active)
  - [x] Create `/api/classes/[classId]/roster` endpoint
  - [x] Add roster tab/panel to class detail page
  - [x] Add remove-student action with confirmation
- [x] Task: Measure - Manual Verification 'Curriculum and Class Management'
  - [x] Verify clicking a lesson in the accordion navigates to teacher preview
  - [x] Verify class edit saves new name/description
  - [x] Verify class delete works with confirmation

## Phase 3: Assignment System

- [x] Task: Define assignment data model
  - [x] Write tests for assignment creation, listing, and due date logic
  - [x] Add `Assignment` model to Prisma schema (classId, lessonId, assignedAt, dueAt, assignedBy)
  - [x] Run migration
- [x] Task: Implement assignment API and UI
  - [x] Write tests for assignment CRUD endpoints
  - [x] Create `/api/classes/[classId]/assignments` endpoints (POST create, GET list, DELETE remove)
  - [x] Add "Assign" button on teacher lesson preview and curriculum accordion
  - [x] Add assignment due date picker (optional)
- [x] Task: Surface assignments in student view
  - [x] Write tests for student assignment visibility
  - [x] Add assignment badges to student curriculum view (due date, assigned indicator)
  - [x] Replace "No assignments yet" placeholder on student dashboard with real assignment list
- [x] Task: Integrate intervention alerts
  - [x] Remove `NEXT_PUBLIC_FEATURE_INTERVENTION_ALERTS` feature flag
  - [x] Move intervention alerts widget to top of teacher dashboard
  - [x] Add class-level intervention summary on class detail page
- [x] Task: Measure - Manual Verification 'Assignments'
  - [x] Verify teacher can assign a lesson from the preview page
  - [x] Verify assigned lesson shows due date badge in student curriculum view
  - [x] Verify intervention alerts appear without feature flag
