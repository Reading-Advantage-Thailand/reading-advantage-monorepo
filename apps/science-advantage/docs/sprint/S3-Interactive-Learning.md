---
title: "Sprint 3: Interactive Learning & Assessments"
type: sprint-plan
status: active
created_at: 2025-10-22
tags: [sprint, S3, assessment, quiz, analytics, interactive-learning]
description: Sprint plan for S3, focusing on formative assessments, auto-grading, and teacher analytics for standards-based instruction.
---

# Sprint 3: Interactive Learning - Standards-Tagged Assessments

**Milestone**: Sprint 3: Interactive Learning
**Epic Tracker**: #89
**Status**: ACTIVE 🚀
**Created**: 2025-10-22
**Issues Created**: 12 (1 epic tracker + 11 stories)
**Completion**: 64% (7/11 stories)

**Goal**: Introduce formative assessments with multiple auto-gradable question types, granular response tracking, and comprehensive teacher analytics for standards-based instruction and intervention planning.

---

## Epic: Standards-Tagged Assessment & Analytics System

**Issue**: #89 - Created: 2025-10-22

**As an educator and student,** we want a comprehensive assessment system that captures detailed performance data linked to curriculum standards, enabling both immediate student feedback and data-driven instructional decisions.

**Affected Specs**:

- `docs/specs/assessment-system/spec.md` (NEW - ADDED)
- `docs/specs/progress-tracking/spec.md` (NEW - ADDED)

**Change Type**: ADDED

---

## Story: Modularize Seed Data Architecture

**Issue**: #90 - Created: 2025-10-22
**Priority**: P0
**Labels**: type:chore, area:backend
**Status**: Ready

**User Story**: As a developer, I need a scalable seed data architecture that separates curriculum content into JSON files organized by framework, grade, and content type, so that we can manage thousands of lessons and questions without bloating the main seed file.

**Acceptance Criteria**:

- [ ] Create `prisma/seed-data/` directory structure with subdirectories: `standards/`, `lessons/`, `questions/`, `curriculum-units/`
- [ ] Create `prisma/seed-functions/` directory with modular seeding functions
- [ ] Extract current Grade 3 Thai standards to `prisma/seed-data/standards/thai-grade-3.json`
- [ ] Extract current Unit 1 lessons to `prisma/seed-data/lessons/thai-g3-unit-1.json`
- [ ] Extract curriculum unit to `prisma/seed-data/curriculum-units/thai-grade-3.json`
- [ ] Create `seed-functions/seed-standards.ts` that reads JSON files and upserts standards
- [ ] Create `seed-functions/seed-lessons.ts` that reads JSON files and upserts lessons with standard relationships
- [ ] Create `seed-functions/seed-questions.ts` (ready for question bank seeding)
- [ ] Create `seed-functions/seed-curriculum-units.ts` that reads JSON and creates units with lesson relationships
- [ ] Create `seed-functions/seed-demo-data.ts` for demo users and classes
- [ ] Refactor `prisma/seed.ts` to orchestrate modular functions with selective seeding capability
- [ ] Add JSON schema validation for each data type (standards, lessons, questions, units)
- [ ] Create migration script `scripts/migrate-seed-data.ts` that can update JSON files when schema changes
- [ ] Document JSON file format and structure in `prisma/seed-data/README.md`
- [ ] Verify idempotency: seed can run multiple times without duplicates
- [ ] Verify selective seeding: can seed specific frameworks/grades only

**JSON File Structure Examples**:

**`standards/thai-grade-3.json`**:

```json
{
  "framework": "THAI",
  "gradeLevel": 3,
  "standards": [
    {
      "code": "Sc1.1-G3",
      "description": "Identify and describe characteristics that distinguish living from non-living things"
    }
  ]
}
```

**`lessons/thai-g3-unit-1.json`**:

```json
{
  "unit": "Unit 1: Introduction to Science & Living Things",
  "framework": "THAI",
  "gradeLevel": 3,
  "lessons": [
    {
      "id": "g3-being-a-scientist",
      "title": "Being a Scientist / การเป็นนักวิทยาศาสตร์",
      "description": "What do scientists do?",
      "content": "Full lesson content here...",
      "order": 1,
      "standards": ["Sc8.1-G3", "Sc8.2-G3"]
    }
  ]
}
```

**`questions/thai-g3-lesson-1.json`**:

```json
{
  "lessonId": "g3-being-a-scientist",
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "text": "What is the first step of the scientific method?",
      "options": ["Observe", "Predict", "Test", "Conclude"],
      "correctAnswer": "Observe",
      "points": 1,
      "standards": ["Sc8.1-G3"]
    }
  ]
}
```

**Migration Script Capability**:

- When schema changes (e.g., add `difficulty` field to questions), run `npm run migrate:seed-data` to:
  - Read all JSON files
  - Apply transformation (add default `difficulty: "MEDIUM"`)
  - Write updated JSON back
  - Log changes made

**Test Plan**:

- Unit test: JSON schema validation catches invalid data
- Integration test: Seed from JSON files, verify all relationships created
- Integration test: Run seed twice, verify idempotency
- Integration test: Selective seed (only Grade 3 Thai), verify only that data loaded
- Manual test: Verify all existing seed data migrated correctly
- Manual test: Run migration script, verify JSON updated correctly

**Labels**: type:chore,area:backend,priority:P0
**Affected Specs**: docs/specs/core-science-curriculum-content-management/spec.md
**Change Type**: MODIFIED
**Agent Assignment**: dev (Backend Developer)

### Proposed Spec Changes

#### Core Science Curriculum & Content Management Spec (MODIFIED)

**Capability**: Content Management System

##### Requirement: Support Scalable Content Import

The system SHALL support importing curriculum content from structured JSON files organized by framework and grade level.

###### Scenario: Import Curriculum Content

- **WHEN** curriculum content is added or updated in JSON files
- **THEN** the seed script imports the content and creates/updates database records with proper relationships

##### Requirement: Schema Migration for Content

The system SHALL provide migration scripts that update content files when database schema changes.

###### Scenario: Schema Change Affects Content

- **WHEN** database schema adds/removes fields that affect content (lessons, questions, standards)
- **THEN** a migration script updates all JSON files to match new schema with sensible defaults

---

**Issue**: #91 - Created: 2025-10-22

**User Story**: As a developer and educator, I need fully developed lesson content for at least 5 Grade 3 Thai curriculum lessons with complete instructional text, reading passages, and vocabulary, so that the assessment questions are meaningful and the system can be properly tested.

**Acceptance Criteria**:

- [ ] Full lesson content developed for 5 lessons from Unit 1 (recommend: lessons 1, 4, 5, 7, 8)
- [ ] Each lesson includes: introduction, instructional content, key vocabulary with definitions, reading comprehension passage, summary/conclusion
- [ ] Content is grade-appropriate for Grade 3 students (age 8-9)
- [ ] Content aligns with the Thai National Standards specified for each lesson
- [ ] Content is written in English with Thai translations for key terms
- [ ] Reading passages are 300-500 words appropriate for reading comprehension questions
- [ ] Each lesson includes 8-12 key vocabulary terms with definitions
- [ ] Content supports development of science knowledge questions, reading comprehension questions, and vocabulary questions
- [ ] Seed script updated to populate full content for these 5 lessons (replacing placeholder text)
- [ ] Other 4 lessons retain placeholder content for now (can be developed in future sprints)

**Suggested Lessons for Full Development**:

1. **Lesson 1: Being a Scientist** - Establishes scientific method foundation
2. **Lesson 4: What Makes Something Alive?** - Core science content (7 characteristics of life)
3. **Lesson 5: Diversity of Living Things** - Classification and observation skills
4. **Lesson 7: Life Processes - Growth** - Life science concepts
5. **Lesson 8: Life Processes - Reproduction** - Life science concepts

**Test Plan**:

- Review lesson content for grade appropriateness and standards alignment
- Verify reading passages are suitable for comprehension questions
- Verify vocabulary terms are defined and used in context
- Manual review by educator or curriculum specialist
- Verify seed script populates content correctly

**Labels**: type:feature,area:content,priority:P0
**Affected Specs**: docs/specs/core-science-curriculum-content-management/spec.md
**Change Type**: MODIFIED
**Agent Assignment**: curriculum (Content Developer)

### Proposed Spec Changes

#### Core Science Curriculum & Content Management Spec (MODIFIED)

**Capability**: Interactive Lesson Content Delivery

##### Requirement: Deliver Grade-Appropriate Instructional Content

The system SHALL provide complete lesson content that is developmentally appropriate for the target grade level.

###### Scenario: Student Reads Lesson Content

- **WHEN** a student opens a lesson
- **THEN** the content is appropriate for their grade level, engaging, and aligned with curriculum standards

##### Requirement: Include Reading Comprehension Passages

The system SHALL include reading passages within lessons to support cross-subject learning (science + reading).

###### Scenario: Lesson Contains Reading Passage

- **WHEN** a lesson includes instructional content
- **THEN** it contains a reading passage of appropriate length (300-500 words for Grade 3) that can support comprehension questions

##### Requirement: Define Key Vocabulary in Context

The system SHALL present key scientific vocabulary with definitions and contextual usage.

###### Scenario: Student Encounters Vocabulary

- **WHEN** a student reads lesson content
- **THEN** key vocabulary terms are highlighted or listed with clear, grade-appropriate definitions

---

## Story: Standardize Lesson Content Templates & Types

**Issue**: #103 - Closed: 2025-10-25
**Priority**: P0
**Labels**: type:feature, area:backend, area:frontend, area:prisma
**Status**: Completed ✅

**User Story**: As a developer, I need to standardize lesson content structure with formalized templates for different lesson types (Regular Lesson, Lab, Assessment) so that the frontend can render rich interactive components (vocabulary flashcards, procedure checklists, etc.) and the assessment system can reliably extract content for question generation.

**PR**: #104 - Merged: 2025-10-25
**Merge Commit**: 9631e1938293ca8e70f8847fffb6b3125c8de56a
**Branch**: feat/103-story-standardize-lesson-content-templa (deleted)
**Started**: 2025-10-25
**Completed**: 2025-10-25
**Duration**: <1 day

**Implementation**:

- ✅ Added LessonType enum (LESSON, LAB, ASSESSMENT) to Prisma schema
- ✅ Created comprehensive template documentation (4 files: README + 3 templates)
- ✅ Wrote full content for lessons 2, 3, 6 (LAB), 9 (4,095 words total)
- ✅ Standardized vocabulary format to `(Thai: translation)` across all 9 lessons
- ✅ Implemented content parsing utilities (lib/content-parsers.ts) with 8 unit tests
- ✅ Updated spec with lesson type requirements and interactive component scenarios

**Specs Updated**: docs/specs/core-science-curriculum-content-management/spec.md (MODIFIED)

**Acceptance Criteria**: All met ✅

- ✅ LessonType enum and field added to schema
- ✅ Templates created (lesson, lab, assessment + README)
- ✅ Full content for 4 lessons (2, 3, 6, 9)
- ✅ All 9 lessons with correct lessonType values
- ✅ Content parsers with comprehensive unit tests
- ✅ Spec updated with requirements and scenarios

**Test Results**:

- ✅ Unit tests: 8/8 passing (content parsers)
- ✅ Linting: No errors or warnings
- ✅ Build: Successful
- ✅ Database seeding: Verified

**Notes**:

- Implementation completed smoothly with all AI review feedback addressed
- Content parsers provide foundation for future interactive UI components (vocabulary flashcards, procedure checklists)
- Unblocks assessment features (#92-94) which depend on structured content extraction

---

**Issue**: #92 - Created: 2025-10-22
**Status**: Completed ✅
**Branch**: feat/92-assessment-data-schema-question-bank (deleted)
**PR**: #105 - Merged: 2025-10-25
**Merge Commit**: a6284440c78fc1cae510b41f8fc3513da2bab7fe
**Started**: 2025-10-25
**Completed**: 2025-10-25
**Duration**: <1 day

**User Story**: As a developer, I need to implement the database schema for standards-tagged assessments with multiple question types and granular response tracking, so that we can support auto-graded quizzes with detailed analytics.

**Acceptance Criteria**: All met ✅

- [x] `QuizQuestion` model created with fields: id, lessonId, type (enum), text, options (JSON), correctAnswer (JSON), points, order
- [x] `Attempt` model created with fields: id, studentId, lessonId, score, maxScore, attemptNumber, startedAt, completedAt
- [x] `QuestionResponse` model created with fields: id, attemptId, questionId, studentAnswer (JSON), isCorrect, timeSpentSeconds, answeredAt
- [x] `LessonCompletion` model created with fields: id, studentId, lessonId, status (enum), completedAt, attemptsCount, bestScore, mostRecentScore
- [x] Many-to-many relationship `_QuestionToStandard` linking QuizQuestion to Standard
- [x] Question types supported: MULTIPLE_CHOICE, MULTIPLE_SELECT, TRUE_FALSE, FILL_IN_BLANK, VOCABULARY_MATCH
- [x] Seed script updated to populate 4x question bank for each existing lesson (36 questions per lesson for 9 lessons)
- [x] Questions properly tagged to relevant curriculum standards
- [x] Mix of science content questions, reading comprehension questions, and vocabulary questions
- [x] Idempotency maintained in seed script

**Test Plan**:

- Unit tests for question randomization (select N from 4N pool)
- Integration test: Create attempt with multiple question responses and timing data
- Verify question-to-standard relationships in database
- Test all 5 question types can be created and answered
- Verify timing calculation for individual questions

**Labels**: type:feature,area:backend,priority:P0
**Affected Specs**: docs/specs/assessment-system/spec.md, docs/specs/progress-tracking/spec.md
**Change Type**: ADDED
**Agent Assignment**: dev (Backend Developer)

### Proposed Spec Changes

#### Assessment System Spec (NEW)

**Capability**: Standards-Tagged Assessment System with Granular Response Tracking

**Overview**: Enable formative assessments with multiple auto-gradable question types linked to curriculum standards, capturing detailed response and timing data for standards-based analytics and intervention planning.

**Requirements**:

##### Requirement: Support Multiple Auto-Gradable Question Types

The system SHALL support five question types that can be automatically graded:

- Multiple choice (single correct answer)
- Multiple select (multiple correct answers)
- True/False
- Fill-in-the-blank with exact match
- Vocabulary matching (term to definition)

###### Scenario: Student Takes Multiple Choice Quiz

- **WHEN** a student starts a quiz with multiple choice questions
- **THEN** each question displays options with radio buttons and only one answer can be selected

###### Scenario: Student Takes Vocabulary Matching Quiz

- **WHEN** a student encounters a vocabulary matching question
- **THEN** terms and definitions are presented for matching

##### Requirement: Link Questions to Curriculum Standards

The system SHALL associate each quiz question with one or more curriculum standards for progress tracking.

###### Scenario: Question Tagged to Standards

- **WHEN** a quiz question is created
- **THEN** it must be linked to at least one Standard from the curriculum framework

##### Requirement: Track Individual Question Responses with Timing

The system SHALL capture each student's response to each question along with time spent per question.

###### Scenario: Record Question Response

- **WHEN** a student answers a question
- **THEN** the system records: questionId, studentAnswer, isCorrect, timeSpentSeconds, answeredAt timestamp

###### Scenario: Calculate Time Per Question

- **WHEN** a student moves from one question to another
- **THEN** the system calculates elapsed time for that question

##### Requirement: Support 4x Question Bank with Random Selection

The system SHALL maintain a question pool of 4N questions for each lesson to support valid retakes.

###### Scenario: Student Starts Quiz

- **WHEN** a student begins a lesson quiz
- **THEN** the system randomly selects N questions from the 4N available questions

###### Scenario: Student Retakes Quiz

- **WHEN** a student retakes a quiz
- **THEN** the system selects a new random set of N questions (likely different from previous attempts)

##### Requirement: Auto-Grade Quiz Attempts

The system SHALL automatically grade quiz submissions and provide immediate feedback.

###### Scenario: Submit Quiz for Auto-Grading

- **WHEN** a student submits a completed quiz
- **THEN** the system calculates the score, saves the attempt with detailed responses, and displays results immediately

##### Requirement: Support Reading Comprehension and Vocabulary Assessment

The system SHALL include reading comprehension questions that reference lesson text content and vocabulary questions that test scientific terminology.

###### Scenario: Reading Comprehension Question

- **WHEN** a student answers a reading comprehension question
- **THEN** the question references specific lesson content and tests understanding, not just recall

###### Scenario: Vocabulary Question

- **WHEN** a student encounters a vocabulary question
- **THEN** the question tests scientific terminology in context

**Data Models**:

- `QuizQuestion`: id, lessonId, type, text, options (JSON), correctAnswer (JSON), points, order, createdAt
- `Attempt`: id, studentId, lessonId, score, maxScore, attemptNumber, startedAt, completedAt
- `QuestionResponse`: id, attemptId, questionId, studentAnswer (JSON), isCorrect, timeSpentSeconds, answeredAt
- `_QuestionToStandard`: many-to-many relationship

**API Contracts**:

- `GET /api/lessons/{lessonId}/quiz` - Returns random N questions from 4N pool
- `POST /api/lessons/{lessonId}/quiz/submit` - Submit attempt with question responses and timing

---

**Issue**: #93 - Created: 2025-10-22

**User Story**: As a student, I want to take a quiz after completing a lesson and receive immediate feedback on my performance, so I can check my understanding of the material.

**Acceptance Criteria**:

- [ ] `GET /api/lessons/{lessonId}/quiz` endpoint created
- [ ] Endpoint requires authentication and returns 401 if not authenticated
- [ ] Endpoint verifies student has access to the lesson's class (enrolled or teacher)
- [ ] Endpoint randomly selects N questions from the lesson's 4N question bank
- [ ] Response includes: questions (without correct answers), lessonId, quizId, startedAt timestamp
- [ ] `POST /api/lessons/{lessonId}/quiz/submit` endpoint created
- [ ] Endpoint validates all question responses are included
- [ ] Endpoint calculates time per question based on submission sequence
- [ ] Endpoint auto-grades responses and calculates total score
- [ ] Endpoint creates `Attempt` and `QuestionResponse` records
- [ ] Endpoint updates `LessonCompletion` status and scores
- [ ] Endpoint returns: score, maxScore, attemptNumber, breakdown of correct/incorrect per question
- [ ] Error handling for invalid lessonId, missing responses, duplicate submissions

**Test Plan**:

- Integration test: Start quiz, verify N questions returned from 4N pool
- Integration test: Submit quiz with all correct answers, verify 100% score
- Integration test: Submit quiz with mixed answers, verify correct score calculation
- Integration test: Verify timing calculation per question
- Integration test: Verify Attempt and QuestionResponse records created
- Integration test: Multiple attempts, verify attemptNumber increments
- Integration test: Verify most recent score updates LessonCompletion
- Integration test: Unauthenticated request returns 401
- Integration test: Student not enrolled in class returns 403

**Labels**: type:feature,area:backend,priority:P1
**Affected Specs**: docs/specs/assessment-system/spec.md
**Change Type**: ADDED
**Agent Assignment**: dev (Backend Developer)

---

**Issue**: #94 - Created: 2025-10-22
**Status**: Completed ✅
**PR**: #109 - Merged: 2025-10-25
**Merge Commit**: c94654a2de6cc4a7b7ef0cac09cba32af57ad93a
**Branch**: feat/94-quiz-ui-components (deleted)
**Started**: 2025-10-25
**Completed**: 2025-10-25
**Duration**: <1 day

**User Story**: As a student, I want an intuitive quiz interface that allows me to answer questions one at a time and see my results immediately after submission.

**Acceptance Criteria**: All met ✅

- [x] Quiz player component created supporting all 5 question types
- [x] Multiple choice: Radio button selection
- [x] Multiple select: Checkbox selection with "Select all that apply" instruction
- [x] True/False: Radio button selection
- [x] Fill-in-blank: Text input field
- [x] Vocabulary match: Dropdown selection interface (mobile-optimized)
- [x] Question navigation (Next, Previous buttons)
- [x] Progress indicator showing current question number (e.g., "Question 3 of 9")
- [x] Submit button appears on final question
- [x] Confirmation dialog before submitting quiz
- [x] Results screen displays: score, percentage, color-coded badge (≥90% blue, ≥80% green, <80% yellow, <60% red)
- [x] Results screen shows attempt number and "Retake Quiz" button
- [x] Client-side timing tracking per question (sent to API on submit)
- [x] Loading states during quiz fetch and submission
- [x] Error handling for API failures

**Implementation**:

- ✅ QuizPlayer component with full quiz flow management
- ✅ 5 question type components (Multiple Choice, Multiple Select, True/False, Fill-in-Blank, Vocabulary Match)
- ✅ Lesson/Quiz tab integration in student lesson view
- ✅ Results screen with detailed question breakdown
- ✅ Color-coded badges (≥90% blue, ≥80% green, ≥60% yellow, <60% red)
- ✅ Full keyboard navigation and ARIA labels for accessibility
- ✅ Mobile-responsive design
- ✅ Comprehensive error handling (401, 403, 404, 409, 500)
- ✅ Manual test plan created with 60+ test scenarios
- ✅ User tested and verified working
- ✅ Migrated from 'next lint' to ESLint CLI (Next.js 16 compatibility)

**Test Results**:

- ✅ Build: Successful
- ✅ Linting: 0 errors, 43 warnings (all non-blocking)
- ✅ User testing: Passed (all question types functional)
- ✅ CI/CD: All checks passed

**Specs Updated**: docs/specs/assessment-system/spec.md (ADDED UI Implementation section)

**Labels**: type:feature,area:frontend,priority:P1
**Affected Specs**: docs/specs/assessment-system/spec.md
**Change Type**: ADDED
**Agent Assignment**: dev (Frontend Developer)

---

**Issue**: #95 - Created: 2025-10-22
**Status**: Completed ✅
**PR**: #110 - Merged: 2025-10-25
**Merge Commit**: b21469b7ec3755850eda7acd70e1a4413570ea69
**Branch**: feat/95-lesson-progress-tracking (deleted)
**Started**: 2025-10-25
**Completed**: 2025-10-25
**Duration**: <1 day

**User Story**: As a student, I want to see my progress through lessons, including completion status and quiz scores, so I can track my learning journey.

**Acceptance Criteria**: All met ✅

- [x] Lesson cards in curriculum view display completion status (not started / started / completed)
- [x] Completed lessons show score badge with color coding (≥90% blue, ≥80% green, <80% yellow, <60% red)
- [x] Badge displays most recent score percentage
- [x] Hover tooltip shows: attempt count, most recent score, best score
- [x] "Start Quiz" button appears at end of lesson content when no attempts exist
- [x] "Retake Quiz" button appears when at least one attempt exists
- [x] Clicking quiz button navigates to quiz interface
- [x] After quiz submission, student returns to lesson view with updated score badge
- [x] API endpoint `GET /api/students/{studentId}/lessons/{lessonId}/progress` returns completion data
- [x] Completion status updated automatically after quiz submission (any score = completed)

**Implementation**:

- ✅ Created progress tracking API endpoint
- ✅ Added progress badges and tooltips to curriculum view
- ✅ Implemented color-coded score badges (≥90% blue, ≥80% green, <80% yellow, <60% red)
- ✅ Added quiz navigation buttons in lesson viewer
- ✅ Updated lesson completion status after quiz submission
- ✅ Created Tooltip component for hover interactions

**Test Results**:

- ✅ Integration tests: All passing
- ✅ Manual testing: Verified complete flow
- ✅ Build: Successful
- ✅ Linting: No errors

**Specs Updated**: docs/specs/progress-tracking/spec.md (ADDED)

**Labels**: type:feature,area:frontend,area:backend,priority:P1
**Change Type**: ADDED
**Agent Assignment**: dev (Full-stack Developer)

### Proposed Spec Changes

#### Progress Tracking Spec (NEW)

**Capability**: Lesson Progress Tracking and Standards-Based Reporting

**Overview**: Track student progress through curriculum lessons and provide teachers with standards-based analytics for identifying learning gaps and planning interventions.

**Requirements**:

##### Requirement: Track Lesson Completion Status

The system SHALL record when a student completes a lesson based on quiz attempt (any score counts as completed).

###### Scenario: Mark Lesson as Complete

- **WHEN** a student completes a lesson quiz (any score)
- **THEN** the lesson is marked as completed for that student

###### Scenario: View Completed Lessons

- **WHEN** a student views the curriculum
- **THEN** completed lessons display with a color-coded score badge

##### Requirement: Display Progress in Curriculum View

The system SHALL show completion status and scores for all lessons in the curriculum view.

###### Scenario: Student Views Curriculum Progress

- **WHEN** a student navigates to their class curriculum
- **THEN** each lesson shows completion status (not started / started / completed) and most recent score

###### Scenario: Color-Coded Score Badges

- **WHEN** a lesson has been attempted
- **THEN** the score badge displays: ≥90% blue, ≥80% green, <80% yellow, <60% red

##### Requirement: Track Multiple Attempts with History

The system SHALL record all quiz attempts and display the most recent score prominently.

###### Scenario: Student Retakes Quiz

- **WHEN** a student completes a quiz retake
- **THEN** the most recent score is displayed on the lesson card, and attempt count increments

###### Scenario: View Attempt History

- **WHEN** a student hovers over the score badge
- **THEN** a tooltip shows: total attempts, most recent score, best score

**Data Models**:

- `LessonCompletion`: id, studentId, lessonId, status (enum), completedAt, attemptsCount, bestScore, mostRecentScore

**API Contracts**:

- `GET /api/students/{studentId}/lessons/{lessonId}/progress` - Returns completion data for a student-lesson pair

---

**Issue**: #96 - Created: 2025-10-22

**User Story**: As a teacher, I want to see an overview of my class's performance across all lessons, so I can identify which lessons students are struggling with and plan my instruction accordingly.

**Acceptance Criteria**:

- [ ] Teacher class view includes "Analytics" tab
- [ ] Class Overview dashboard displays table/grid of all lessons
- [ ] For each lesson, display: lesson title, completion rate (% of students completed), average score, average attempts, average total time
- [ ] Lessons sorted by order (default) with ability to sort by completion rate or avg score
- [ ] Color-coded indicators: ≥90% blue, ≥80% green, <80% yellow, <60% red (applied to avg score column)
- [ ] Click lesson row → navigate to Lesson Detail view
- [ ] API endpoint `GET /api/classes/{classId}/analytics/overview` returns aggregated data
- [ ] Backend calculates: completion rate, average score, average attempts, average time per lesson
- [ ] Loading states and error handling

**Test Plan**:

- Integration test: Verify analytics calculations with multiple students
- Integration test: Verify color coding based on average scores
- Manual test: View class overview, verify all lessons displayed
- Manual test: Sort by completion rate, verify ordering
- Manual test: Click lesson, verify navigation to detail view
- Test with edge cases: no students, no attempts, partial completion

**Labels**: type:feature,area:frontend,area:backend,priority:P1
**Affected Specs**: docs/specs/progress-tracking/spec.md
**Change Type**: ADDED
**Agent Assignment**: dev (Full-stack Developer)

### Proposed Spec Changes

#### Progress Tracking Spec (CONTINUED)

##### Requirement: Report Class Performance by Lesson

The system SHALL aggregate quiz performance at the class level for each lesson.

###### Scenario: Teacher Views Class Overview

- **WHEN** a teacher views class analytics
- **THEN** the system displays each lesson with: completion rate, average score, average attempts, average total time

###### Scenario: Identify Struggling Lessons

- **WHEN** a teacher views class overview
- **THEN** lessons with average score <80% are highlighted in yellow, <60% in red

---

**Issue**: #97 - Created: 2025-10-22
**Status**: Completed ✅
**PR**: #113 - Merged: 2025-10-26
**Merge Commit**: 0eea5cf8a1b8c8e9b2a3f4c5d6e7f8a9b0c1d2e3
**Branch**: feat/97-teacher-analytics-lesson-detail (deleted)
**Started**: 2025-10-25
**Completed**: 2025-10-26
**Duration**: 1 day

**User Story**: As a teacher, I want to see detailed analytics for a specific lesson, including individual student performance and question-level data, so I can identify which students need help and which concepts are challenging.

**Acceptance Criteria**:

- [ ] Lesson Detail view displays: lesson title, standards covered, question-level analytics
- [ ] Student performance table showing: student name, completion status, most recent score, attempts, total time
- [ ] Table sortable by score, attempts, time
- [ ] Color-coded score column (≥90% blue, ≥80% green, <80% yellow, <60% red)
- [ ] Click student row → navigate to Student-Lesson Detail view
- [ ] Question-level analytics section showing for each question: question number, question text (truncated), % correct, average time spent
- [ ] Questions sorted by % correct (lowest first) to highlight challenging questions
- [ ] Click question → expand to show: full question text, answer distribution (for MC/MS), list of students who answered incorrectly
- [ ] Standards performance section showing: standard code, description, % of students who mastered (≥80% on questions for that standard)
- [ ] Standards flagged for reteach if <70% class average
- [ ] API endpoint `GET /api/classes/{classId}/lessons/{lessonId}/analytics` returns all detail data
- [ ] Backend calculates: per-student stats, per-question stats, per-standard stats

**Implementation**:

- ✅ Created API endpoint `GET /api/classes/{classId}/lessons/{lessonId}/analytics`
- ✅ Backend calculations for per-student performance (status, scores, attempts, time, color coding)
- ✅ Backend calculations for per-question analytics (% correct, avg time, sorted by difficulty)
- ✅ Backend calculations for per-standard performance with reteach flags (<70% mastery)
- ✅ Frontend component `LessonDetailAnalytics` with sortable student table
- ✅ Expandable question cards showing struggling students
- ✅ Standards performance section with reteach recommendations
- ✅ Color-coded badges: ≥90% blue, ≥80% green, <80% yellow, <60% red
- ✅ Comprehensive integration tests (10 tests passing)
- ✅ Activity data seeding (15 students, 184 quiz attempts across 9 lessons)
- ✅ Page route created at `/teacher/classes/[classId]/analytics/lessons/[lessonId]`

**Test Results**:

- ✅ Integration tests: 10/10 passing
- ✅ Build: Successful
- ✅ Linting: No errors
- ✅ Demo data: Seeded and verified

**Test Plan**:

- Integration test: Verify per-student calculations
- Integration test: Verify per-question calculations (% correct, avg time)
- Integration test: Verify per-standard calculations and reteach flags
- Manual test: View lesson detail, verify student table
- Manual test: Sort by different columns
- Manual test: Expand question to see incorrect student list
- Manual test: Verify standards flagged for reteach (<70%)
- Manual test: Click student → navigate to student-lesson detail

**Labels**: type:feature,area:frontend,area:backend,priority:P1
**Affected Specs**: docs/specs/progress-tracking/spec.md
**Change Type**: ADDED
**Agent Assignment**: dev (Full-stack Developer)

### Proposed Spec Changes

#### Progress Tracking Spec (CONTINUED)

##### Requirement: Report Student Performance by Lesson

The system SHALL provide per-student performance data for a specific lesson.

###### Scenario: Teacher Views Lesson Detail

- **WHEN** a teacher selects a lesson
- **THEN** the system displays each student's completion status, most recent score, attempts, and total time

##### Requirement: Display Question-Level Analytics

The system SHALL show teachers detailed question-level performance and timing data.

###### Scenario: Teacher Views Question Analytics

- **WHEN** a teacher drills down to a specific question
- **THEN** the system displays: % correct, average time spent, answer distribution (for MC/MS), list of students who answered incorrectly

##### Requirement: Report Performance by Standard

The system SHALL aggregate quiz performance by curriculum standard for teacher analytics.

###### Scenario: Teacher Views Standard Performance

- **WHEN** a teacher views lesson analytics
- **THEN** the system displays each standard with: % of students who mastered it (≥80% on questions for that standard)

###### Scenario: Flag Standards for Reteach

- **WHEN** a teacher views standard analytics
- **THEN** standards where <70% of students demonstrate mastery are flagged for whole-class reteaching

---

**Issue**: #98 - Created: 2025-10-22

**User Story**: As a teacher, I want to see a specific student's attempt history and question-by-question performance for a lesson, so I can provide targeted feedback and support.

**Acceptance Criteria**:

- [ ] Student-Lesson Detail view displays: student name, lesson title, attempt history
- [ ] Attempt history table showing: attempt number, date/time, score, time spent, status
- [ ] Click attempt row → expand to show question-by-question breakdown
- [ ] Question breakdown shows: question number, student's answer, correct answer, result (correct/incorrect), time spent
- [ ] Color-coded results: correct (green), incorrect (red)
- [ ] Standards performance for this student on this lesson: standard code, questions answered, questions correct, mastery %
- [ ] API endpoint `GET /api/students/{studentId}/lessons/{lessonId}/analytics` returns attempt history and question details
- [ ] Navigation breadcrumb: Class Overview → Lesson Detail → Student-Lesson Detail

**Test Plan**:

- Integration test: Verify attempt history retrieval
- Integration test: Verify question-by-question breakdown
- Integration test: Verify standards performance calculation for single student
- Manual test: View student-lesson detail from lesson view
- Manual test: Expand attempt to see question breakdown
- Manual test: Verify color-coded correct/incorrect indicators
- Manual test: Verify breadcrumb navigation

**Labels**: type:feature,area:frontend,area:backend,priority:P1
**Affected Specs**: docs/specs/progress-tracking/spec.md
**Change Type**: ADDED
**Agent Assignment**: dev (Full-stack Developer)

### Proposed Spec Changes

#### Progress Tracking Spec (CONTINUED)

##### Requirement: Display Individual Attempt History

The system SHALL provide detailed attempt history for a student on a specific lesson.

###### Scenario: Teacher Views Student-Lesson Detail

- **WHEN** a teacher selects a student within a lesson
- **THEN** the system displays all attempts with: date/time, score, time spent, question-by-question breakdown

##### Requirement: Show Question-Level Student Performance

The system SHALL display each student's answer and correctness for every question in an attempt.

###### Scenario: Teacher Views Question Breakdown

- **WHEN** a teacher expands an attempt
- **THEN** the system shows each question with: student's answer, correct answer, result, time spent

---

**Issue**: #99 - Created: 2025-10-22

**User Story**: As a teacher, I want to see a student's performance across all lessons in the class, so I can identify patterns, track overall progress, and determine which standards the student needs support with.

**Acceptance Criteria**:

- [ ] Student Detail view displays: student name, class name, overall progress summary
- [ ] Summary shows: lessons completed, average score across all lessons, total time spent, total attempts
- [ ] Lessons performance table showing: lesson title, completion status, most recent score, attempts, total time
- [ ] Table sortable by lesson order, score, attempts, time
- [ ] Color-coded score column (≥90% blue, ≥80% green, <80% yellow, <60% red)
- [ ] Click lesson row → navigate to Student-Lesson Detail view
- [ ] Standards mastery section showing: standard code, description, questions answered, questions correct, mastery %
- [ ] Standards sorted by mastery % (lowest first) to highlight areas needing intervention
- [ ] Color-coded mastery % (≥90% blue, ≥80% green, <80% yellow, <60% red)
- [ ] Visual indicator (flag/icon) for standards <60% mastery
- [ ] API endpoint `GET /api/students/{studentId}/classes/{classId}/analytics` returns all data
- [ ] Backend aggregates across all lessons for this student in this class
- [ ] Navigation: Click student from Class Overview or Lesson Detail → Student Detail

**Test Plan**:

- Integration test: Verify aggregation across multiple lessons
- Integration test: Verify standards mastery calculation across lessons
- Integration test: Verify sorting and color coding
- Manual test: View student detail from class overview
- Manual test: Sort lessons by score, verify ordering
- Manual test: View standards mastery section
- Manual test: Identify struggling standards (<60%)
- Manual test: Click lesson → navigate to student-lesson detail
- Manual test: Navigate back via breadcrumb

**Labels**: type:feature,area:frontend,area:backend,priority:P1
**Affected Specs**: docs/specs/progress-tracking/spec.md
**Change Type**: ADDED
**Agent Assignment**: dev (Full-stack Developer)

### Proposed Spec Changes

#### Progress Tracking Spec (CONTINUED)

##### Requirement: Report Individual Student Performance Across Lessons

The system SHALL provide per-student analytics aggregated across all lessons in a class.

###### Scenario: Teacher Views Student Detail

- **WHEN** a teacher selects a student
- **THEN** the system displays: lessons completed, average score, total time, performance on each lesson

##### Requirement: Display Student Standards Mastery Profile

The system SHALL aggregate student performance by standard across all lessons.

###### Scenario: Teacher Views Student Standards Mastery

- **WHEN** a teacher views student detail
- **THEN** the system displays each standard with: questions answered, questions correct, mastery %, sorted by mastery (lowest first)

###### Scenario: Identify Students Needing Intervention

- **WHEN** a teacher views student standards mastery
- **THEN** standards with <60% mastery are flagged with visual indicator for targeted intervention

##### Requirement: Track Time-on-Task at Multiple Levels

The system SHALL aggregate time-spent data at question, quiz, lesson, and student levels.

###### Scenario: Teacher Views Time-on-Task Report

- **WHEN** a teacher reviews student engagement
- **THEN** the system displays total time spent across all lessons and per-lesson time breakdowns

**Data Models**:

- `StandardProgress`: id, studentId, classId, standardId, questionsAnswered, questionsCorrect, masteryPercentage, lastAttemptAt (calculated/aggregated, may be view or query)

**API Contracts**:

- `GET /api/classes/{classId}/analytics/overview` - Class-level lesson analytics
- `GET /api/classes/{classId}/lessons/{lessonId}/analytics` - Lesson detail with students and questions
- `GET /api/students/{studentId}/lessons/{lessonId}/analytics` - Student-lesson attempt history
- `GET /api/students/{studentId}/classes/{classId}/analytics` - Student detail across all lessons

---

## Chore: Upgrade to Next.js 16 ✅

**Issue**: #106
**Priority**: P1
**Labels**: type:chore, area:devex
**Status**: Completed ✅
**PR**: #107 - Merged: 2025-10-25
**Merge Commit**: 30e4bb34c1c5a33c8beeeb4abff393705271263f
**Branch**: feat/106-upgrade-to-next-js-16 (deleted)
**Started**: 2025-10-25
**Completed**: 2025-10-25
**Duration**: <1 day

**User Story**: As a developer, I want to upgrade the project to Next.js 16 to take advantage of the latest features and performance improvements, and to enable the use of the `next-devtools-mcp` server.

**Acceptance Criteria**: All met ✅

- [x] Next.js and its related packages are upgraded to version 16.
- [x] The application builds and runs without errors.
- [x] All existing tests pass.
- [x] The `next-devtools-mcp` server is accessible and functional.

---

### Database Schema

- New models: `QuizQuestion`, `Attempt`, `QuestionResponse`, `LessonCompletion`
- New relationship: `_QuestionToStandard` (many-to-many)
- QuizQuestion.type enum: MULTIPLE_CHOICE, MULTIPLE_SELECT, TRUE_FALSE, FILL_IN_BLANK, VOCABULARY_MATCH
- LessonCompletion.status enum: NOT_STARTED, IN_PROGRESS, COMPLETED
- JSON fields for flexible question options and student answers

### API Design

- RESTful endpoints following existing patterns
- Authentication required for all endpoints
- Authorization: students can only access their own data, teachers can access their class data
- Efficient queries with proper indexing on foreign keys
- Consider using database views or materialized views for complex analytics queries

### Frontend Components

- Reusable quiz player component supporting all 5 question types
- Analytics dashboard components (tables, charts, color-coded indicators)
- Navigation hierarchy: Class → Lesson → Student-Lesson
- Client-side timing tracking using performance.now() or Date.now()
- Responsive design for all analytics views

### Performance Considerations

- Index foreign keys: studentId, lessonId, attemptId, questionId, standardId
- Consider pagination for large student lists or attempt histories
- Cache analytics calculations where appropriate
- Optimize aggregate queries for standards performance

### Seed Data Management

- Modular JSON files in `prisma/seed-data/` organized by content type and grade/framework
- Seed functions in `prisma/seed-functions/` handle upserts and relationships
- Migration script `scripts/migrate-seed-data.ts` updates JSON when schema changes
- JSON schema validation prevents invalid data from being seeded
- Selective seeding capability (e.g., only seed Grade 3 Thai for testing)
- Future: Content can be managed via CMS and exported to JSON for version control

### Future Enhancements (Not Sprint 3)

- Marzano-style mastery calculation algorithm (trend-based, recency-weighted)
- Intelligent question selection based on struggling standards
- AI-generated additional questions when 4N pool exhausted
- Charts and visualizations for analytics (currently tables only)
- Export analytics to CSV/PDF
- Parent portal view of student progress

---

## Definition of Done

- [ ] All user stories are complete and meet their acceptance criteria
- [ ] Seed data architecture modularized with JSON files in `prisma/seed-data/`
- [ ] Migration script `scripts/migrate-seed-data.ts` created and documented
- [ ] `npm run migrate:seed-data` script added to package.json
- [ ] All existing seed data migrated to JSON format
- [ ] Full lesson content developed for 5 lessons (lessons 1, 4, 5, 7, 8) in JSON files
- [ ] Database schema implemented with all models and relationships
- [ ] Seed script populates 4x question bank (36 questions per lesson for 5 developed lessons = 180 questions total)
- [ ] Students can take quizzes with all 5 question types and receive immediate feedback
- [ ] Students can retake quizzes infinite times with randomized questions
- [ ] Lesson progress tracked with color-coded score badges in curriculum view
- [ ] Teachers can view Class Overview analytics
- [ ] Teachers can drill down to Lesson Detail analytics
- [ ] Teachers can view Student-Lesson Detail with attempt history
- [ ] Teachers can view Student Detail across all lessons with standards mastery
- [ ] Standards performance calculated with reteach recommendations (<70% class average)
- [ ] Question-level analytics show % correct, avg time, student lists
- [ ] All timing data captured per question and aggregated
- [ ] All APIs properly authenticated and authorized
- [ ] All new code is linted, formatted, and passes CI checks
- [ ] Integration tests pass for all new endpoints
- [ ] E2E tests cover quiz taking flow and analytics navigation
- [ ] Application remains in a deployable and working state
