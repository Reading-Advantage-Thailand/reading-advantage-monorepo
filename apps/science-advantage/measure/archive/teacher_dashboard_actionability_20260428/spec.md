# Specification: Teacher Dashboard Actionability

## Overview

The teacher dashboard currently shows a welcome header, an intervention alerts widget (behind a feature flag), a class list, and three hardcoded placeholder cards ("No recent activity", "No upcoming deadlines" x2). Teachers cannot answer the three questions the product guidelines require: "What should my class do next?", "Who is off track?", and "Which standards are failing?"

This track replaces placeholders with real, actionable data surfaces and adds the missing class management and assignment capabilities teachers need for daily classroom use.

## Functional Requirements

### 1. Class Overview Cards
Replace the placeholder cards with real data:
- **Class Progress Card**: For each class, show overall completion rate (% of lessons completed by all students), average class score, and number of active students. Color-coded: blue (90%+), green (80%+), yellow (60%+), red (<60%).
- **Students Needing Attention Card**: Show count of students with mastery below 60% across all classes, with links to the intervention alerts or student detail pages. This surfaces the "who is off track" signal at dashboard level.
- **Recent Completions Feed**: Show the 5 most recent lesson completions across all classes with student name, lesson title, score, and timestamp. This answers "what just happened in my classes?"

### 2. Quick Actions
- **Assign Lesson**: From the class detail page, allow teachers to mark specific lessons as "assigned" with an optional due date. Assigned lessons appear prominently in the student curriculum view with a due date badge.
- **Class Roster View**: Add a tab or panel in class detail showing enrolled students with names, email, join date, and last active date. Allow removing students from the roster.

### 3. Curriculum Accordion Interactivity
- Make lesson entries in the `CurriculumAccordion` clickable
- Clicking a lesson navigates to the teacher lesson preview (`/teacher/classes/[classId]/lessons/[slug]`)
- Show a small completion badge next to each lesson indicating how many students have completed it

### 4. Intervention Alerts Integration
- Remove the `NEXT_PUBLIC_FEATURE_INTERVENTION_ALERTS` feature flag — make intervention alerts always visible when the teacher has classes
- Move the intervention alerts widget to the top of the dashboard (most prominent position)
- Add a class-level intervention summary on the class detail page

### 5. Class Management
- **Edit Class**: Allow renaming a class and changing its description after creation
- **Delete Class**: Add a delete action with confirmation dialog (soft-delete or hard-delete based on whether students have progress data)

## Non-Functional Requirements

- Dashboard data must load in under 2 seconds for classes with up to 40 students
- All new data surfaces must have loading skeletons and error states
- Assignment and roster changes must be reflected immediately without full page reload
- Teacher dashboard must work without the AI recommendation service (deterministic data only)

## Acceptance Criteria

1. Teacher dashboard shows real class progress data, not placeholders
2. "Students Needing Attention" card shows accurate count with links to detail
3. Recent completions feed shows the 5 most recent completions across classes
4. Curriculum accordion lessons are clickable and navigate to lesson preview
5. Intervention alerts appear without a feature flag
6. Teachers can assign lessons with optional due dates from class detail
7. Class roster view shows enrolled students with last active date
8. Teachers can edit class name/description and delete classes with confirmation

## Out of Scope

- Advanced analytics dashboards (already exist at `/teacher/classes/[classId]/analytics`)
- Export/reporting features
- Messaging or communication tools
- Parent-facing views
