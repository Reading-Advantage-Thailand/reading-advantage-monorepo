---
title: "Sprint 4: AI-Powered Personalization"
type: sprint-plan
status: ready
created_at: 2025-10-28
tags: [sprint, S4, ai, personalization, intervention, student-profile]
description: Sprint plan for S4, leveraging assessment data to deliver AI-driven personalized learning paths and teacher intervention alerts.
---

# Sprint 4: AI-Powered Personalization & Teacher Intervention

**Milestone**: Sprint 4: AI-Powered Personalization
**Epic Tracker**: (To be created)
**Status**: Ready for Seeding

**Goal**: Leverage the rich data from the assessment system to deliver AI-driven, personalized learning paths for students and provide teachers with actionable, automated intervention alerts.

---

## Epic: AI-Powered Personalization & Teacher Intervention

**User Story**: As a user (student or teacher), I want the platform to use AI to personalize the learning experience and provide intelligent feedback, so that students can learn more effectively and teachers can intervene more efficiently.

**Labels**: `type:feature`, `area:ai`
**Affected Specs**: `docs/specs/ai-recommendations/spec.md`, `docs/specs/student-profile/spec.md`, `docs/specs/teacher-intervention/spec.md`
**Change Type**: `ADDED`

---

## Story: BE - Student Profile Data Model

**User Story**: As a backend developer, I need to extend our data model to store student mastery levels for each curriculum standard, so that we have a place to persist AI-driven analysis.

**Acceptance Criteria**:
- A new model, `StandardMastery`, is added to `prisma/schema.prisma`.
- The model includes fields for `studentId`, `standardId`, `masteryLevel` (e.g., a float from 0.0 to 1.0), and `lastAssessedAt`.
- A unique constraint is added on `(studentId, standardId)`.
- The changes are successfully pushed to the database using `npx prisma db push`.

**Test Plan**:
- Unit test: Validate the new Prisma model.
- Integration test: Ensure a `StandardMastery` record can be created and updated successfully.

**Labels**: `type:feature`, `area:backend`, `area:prisma`, `priority:P1`
**Affected Specs**: `docs/specs/student-profile/spec.md`
**Change Type**: `ADDED`

**Status**: In Progress  
**Branch**: `feat/119-student-profile-data-model`  
**Started**: 2025-10-28  
**Assigned**: @me

---

## Story: BE - Calculate and Update Student Mastery

**User Story**: As a backend developer, I need to create a service that calculates a student's mastery of a standard based on their quiz performance and updates the `StandardMastery` table.

**Acceptance Criteria**:
- A new API endpoint, `POST /api/ai/update-mastery`, is created.
- The endpoint accepts a `studentId` and `attemptId`.
- The service fetches all question responses for the attempt, identifies the related standards, and calculates a new mastery level (e.g., weighted average of performance on questions for that standard).
- The service creates or updates the corresponding `StandardMastery` record for the student.
- The endpoint is designed to be called by the quiz submission service (from Sprint 3) after an attempt is graded.

**Test Plan**:
- Integration test: Submit a quiz attempt and verify that the `StandardMastery` table is updated correctly for the relevant standards.
- Integration test: Test with multiple attempts to ensure mastery level is recalculated and updated.

**Labels**: `type:feature`, `area:backend`, `priority:P1`
**Affected Specs**: `docs/specs/student-profile/spec.md`
**Change Type**: `MODIFIED`

**Status**: In Progress  
**Branch**: feat/120-be-calculate-and-update-student-mastery  
**Started**: 2025-10-29  
**Issue**: #120  
**Assigned**: @bodangren  
**Epic**: #118

---

## Story: FE - Student Mastery Profile Page

**User Story**: As a student, I want to view a personal profile page that shows my current mastery level for every science standard I've been assessed on, so I can understand my strengths and weaknesses.

**Acceptance Criteria**:
- A new page is created at `/student/profile`.
- The page fetches data from a new endpoint `GET /api/students/{studentId}/mastery-profile`.
- The page displays a list of standards, grouped by curriculum unit or topic.
- Each standard displays a visual indicator of mastery (e.g., a color-coded progress bar: red <60%, yellow <80%, green >=80%).
- The page includes loading and empty states.

**Test Plan**:
- E2E test: Log in as a student, take a quiz, then navigate to the profile page and verify the mastery data is displayed correctly.

**Labels**: `type:feature`, `area:frontend`, `priority:P1`
**Affected Specs**: `docs/specs/student-profile/spec.md`
**Change Type**: `ADDED`

---

## Story: BE - AI Recommendation API

**User Story**: As a backend developer, I need to create an API endpoint that uses the Vercel AI SDK to recommend the next best lesson for a student after they complete a quiz.

**Acceptance Criteria**:
- A new API endpoint, `POST /api/ai/recommendations`, is created.
- It accepts a `studentId` and the `attemptId` of the quiz just completed.
- The service fetches the student's performance on the quiz, paying special attention to the standards associated with incorrectly answered questions.
- It uses the Vercel AI SDK's `generateObject` function with a Zod schema to call an AI model (e.g., Google Gemini).
- The prompt asks the AI to recommend the best next lesson ID based on the student's weakest standards in the recent attempt.
- The Zod schema ensures the AI returns a valid JSON object, like `{ "recommendation": "lesson-slug-to-practice", "reasoning": "Student struggled with standard X, and this lesson provides foundational review." }`.
- The endpoint returns the structured recommendation.

**Test Plan**:
- Integration test: Call the endpoint with a valid attempt and mock the AI response to ensure the service logic works.
- Integration test: Verify the prompt sent to the AI contains the correct performance data.

**Labels**: `type:feature`, `area:backend`, `area:ai`, `priority:P1`
**Affected Specs**: `docs/specs/ai-recommendations/spec.md`
**Change Type**: `ADDED`

---

## Story: FE - Display AI-Powered Recommendation

**User Story**: As a student, after I finish a quiz, I want to see a personalized recommendation for what to do next, so I can continue learning effectively.

**Acceptance Criteria**:
- The quiz results screen is updated to include a "Recommended Next Step" section.
- After the results are displayed, a call is made to the `POST /api/ai/recommendations` endpoint.
- A loading state is shown while the recommendation is being generated.
- Once received, the recommended lesson title and the AI's reasoning are displayed.
- A button, "Start Recommended Lesson," is displayed, which navigates the student to the recommended lesson.

**Test Plan**:
- E2E test: Complete a quiz and verify that the recommendation section appears, displays a message, and the button navigates correctly.

**Labels**: `type:feature`, `area:frontend`, `area:ai`, `priority:P1`
**Affected Specs**: `docs/specs/ai-recommendations/spec.md`
**Change Type**: `MODIFIED`

---

## Story: BE - Teacher Intervention Alert Service

**User Story**: As a backend developer, I need a service that analyzes class performance data to identify students who require intervention for specific standards.

**Acceptance Criteria**:
- A new API endpoint, `GET /api/teachers/classes/{classId}/intervention-alerts`, is created.
- The service queries the `StandardMastery` data for all students in the specified class.
- It identifies and returns a list of students whose `masteryLevel` for any standard is below a defined threshold (e.g., 0.6).
- The response is a list of objects, e.g., `[{ "studentName": "Jane Doe", "standardCode": "Sc1.1-G3", "masteryLevel": 0.45, "lastAssessed": "2025-10-28" }]`.
- The data is sorted to show the students with the lowest mastery levels first.

**Test Plan**:
- Integration test: Seed data with several students, some with low mastery on certain standards. Call the endpoint and verify that only the struggling students are returned.

**Labels**: `type:feature`, `area:backend`, `priority:P1`
**Affected Specs**: `docs/specs/teacher-intervention/spec.md`
**Change Type**: `ADDED`

---

## Story: FE - Teacher Dashboard Intervention Widget

**User Story**: As a teacher, I want to see a prominent list of "Intervention Alerts" on my main dashboard, so I can immediately identify which students need my help the most.

**Acceptance Criteria**:
- A new "Intervention Alerts" widget is added to the main teacher dashboard (`/teacher`).
- The widget fetches data from the `/api/teachers/classes/{classId}/intervention-alerts` endpoint for the currently viewed class.
- It displays a concise list of alerts, such as "Jane Doe is struggling with Sc1.1-G3 (45% mastery)".
- Each alert is a link that navigates to that student's detailed analytics page.
- The widget shows a loading state and an "All students are on track!" message if no alerts are returned.

**Test Plan**:
- E2E test: Log in as a teacher, navigate to the dashboard, and verify the intervention widget displays the correct alerts based on seeded student data.

**Labels**: `type:feature`, `area:frontend`, `priority:P1`
**Affected Specs**: `docs/specs/teacher-intervention/spec.md`
**Change Type**: `ADDED`
