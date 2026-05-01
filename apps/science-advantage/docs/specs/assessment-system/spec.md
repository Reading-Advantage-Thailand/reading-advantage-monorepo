---
title: Assessment System Specification
type: spec
status: draft
created_at: 2025-11-29
tags: [spec, assessment, quiz, grading, analytics]
description: Technical specification for the formative assessment engine, including support for multiple question types, auto-grading, and standards alignment.
---

# Assessment System

## Overview

Enable formative assessments with multiple auto-gradable question types linked to curriculum standards, capturing detailed response and timing data for standards-based analytics and intervention planning. This system supports immediate student feedback through auto-grading and provides teachers with granular performance data for identifying learning gaps and planning targeted interventions.

## Requirements

### Requirement: Support Multiple Auto-Gradable Question Types

The system SHALL support five question types that can be automatically graded without human intervention.

**Supported Question Types:**
- Multiple choice (single correct answer)
- Multiple select (multiple correct answers)
- True/False
- Fill-in-the-blank with exact match
- Vocabulary matching (term to definition)

#### Scenario: Student Takes Multiple Choice Quiz
- **WHEN** a student starts a quiz with multiple choice questions
- **THEN** each question displays options with radio buttons and only one answer can be selected

#### Scenario: Student Takes Multiple Select Quiz
- **WHEN** a student encounters a multiple select question
- **THEN** the question displays checkboxes with "Select all that apply" instruction and allows multiple selections

#### Scenario: Student Takes True/False Quiz
- **WHEN** a student answers a true/false question
- **THEN** the question displays two radio buttons labeled "True" and "False"

#### Scenario: Student Takes Fill-in-the-Blank Quiz
- **WHEN** a student encounters a fill-in-the-blank question
- **THEN** the question displays a text input field and the answer is matched exactly (case-insensitive, whitespace-trimmed)

#### Scenario: Student Takes Vocabulary Matching Quiz
- **WHEN** a student encounters a vocabulary matching question
- **THEN** terms and definitions are presented for matching via drag-and-drop or dropdown selection

### Requirement: Link Questions to Curriculum Standards

The system SHALL associate each quiz question with one or more curriculum standards for standards-based progress tracking and analytics.

#### Scenario: Question Tagged to Standards
- **WHEN** a quiz question is created
- **THEN** it MUST be linked to at least one Standard from the curriculum framework

#### Scenario: Question Supports Multiple Standards
- **WHEN** a question assesses multiple learning objectives
- **THEN** it can be linked to multiple curriculum standards via many-to-many relationship

#### Scenario: Analytics by Standard
- **WHEN** a teacher views analytics
- **THEN** the system aggregates student performance by curriculum standard across all questions

### Requirement: Track Individual Question Responses with Timing

The system SHALL capture each student's response to each question along with time spent per question for detailed analytics and intervention planning.

#### Scenario: Record Question Response
- **WHEN** a student answers a question
- **THEN** the system records: questionId, studentAnswer, isCorrect, timeSpentSeconds, answeredAt timestamp

#### Scenario: Calculate Time Per Question
- **WHEN** a student moves from one question to another
- **THEN** the system calculates elapsed time for that question and stores it with the response

#### Scenario: Track Response Order
- **WHEN** multiple question responses are recorded for an attempt
- **THEN** the system preserves the order in which questions were presented and answered

### Requirement: Support 4x Question Bank with Random Selection

The system SHALL maintain a question pool of 4N questions for each lesson to support valid retakes with minimal question repetition.

#### Scenario: Student Starts Quiz
- **WHEN** a student begins a lesson quiz
- **THEN** the system randomly selects N questions from the 4N available questions for that lesson

#### Scenario: Student Retakes Quiz
- **WHEN** a student retakes a quiz
- **THEN** the system selects a new random set of N questions (likely different from previous attempts)

#### Scenario: Question Pool Size Maintained
- **WHEN** content editors add or remove questions
- **THEN** the system ensures at least 4N questions remain available per lesson or alerts administrators if the pool drops below threshold

### Requirement: Auto-Grade Quiz Attempts

The system SHALL automatically grade quiz submissions and provide immediate feedback without requiring teacher intervention.

#### Scenario: Submit Quiz for Auto-Grading
- **WHEN** a student submits a completed quiz
- **THEN** the system calculates the score, saves the attempt with detailed responses, and displays results immediately

#### Scenario: Partial Quiz Submission Prevented
- **WHEN** a student attempts to submit a quiz with unanswered questions
- **THEN** the system prevents submission and highlights unanswered questions

#### Scenario: Auto-Grade Multiple Choice and True/False
- **WHEN** auto-grading multiple choice or true/false questions
- **THEN** the system compares the student's selection to the correctAnswer field using exact match

#### Scenario: Auto-Grade Multiple Select
- **WHEN** auto-grading multiple select questions
- **THEN** the system verifies all correct answers are selected and no incorrect answers are selected

#### Scenario: Auto-Grade Fill-in-the-Blank
- **WHEN** auto-grading fill-in-the-blank questions
- **THEN** the system normalizes both the student answer and correct answer (lowercase, trim whitespace) before comparison

#### Scenario: Auto-Grade Vocabulary Matching
- **WHEN** auto-grading vocabulary matching questions
- **THEN** the system verifies each term is matched to the correct definition

### Requirement: Support Reading Comprehension and Vocabulary Assessment

The system SHALL include reading comprehension questions that reference lesson text content and vocabulary questions that test scientific terminology in context.

#### Scenario: Reading Comprehension Question
- **WHEN** a student answers a reading comprehension question
- **THEN** the question references specific lesson content and tests understanding, not just recall

#### Scenario: Vocabulary Question
- **WHEN** a student encounters a vocabulary question
- **THEN** the question tests scientific terminology defined in the lesson vocabulary section

#### Scenario: Mix of Question Content Types
- **WHEN** a lesson quiz is generated
- **THEN** the question pool includes a balanced mix of science content questions, reading comprehension questions, and vocabulary questions

### Requirement: Track Question Versioning

The system SHOULD support versioning of questions to handle edits while preserving historical attempt data integrity.

#### Scenario: Question Content Updated
- **WHEN** a teacher or content editor updates a question's text or options
- **THEN** the system creates a new version and associates existing attempts with the original version

#### Scenario: Historical Attempts Reference Correct Version
- **WHEN** a teacher reviews past student attempts
- **THEN** the system displays the question content as it existed when the student answered it

### Requirement: Enforce Authorization for Quiz Operations

The system SHALL restrict quiz access and attempt creation based on class enrollment and role permissions.

#### Scenario: Student Accesses Enrolled Class Quiz
- **WHEN** an enrolled student requests a quiz for a lesson in their class
- **THEN** the system returns the quiz questions

#### Scenario: Student Cannot Access Unenrolled Class Quiz
- **WHEN** a student requests a quiz for a lesson in a class they are not enrolled in
- **THEN** the system returns 403 Forbidden

#### Scenario: Teacher Cannot Create Student Attempts
- **WHEN** a teacher attempts to create a quiz attempt for a student in an unrelated class
- **THEN** the system returns 403 Forbidden

#### Scenario: Student Cannot Submit Attempts for Other Students
- **WHEN** a student attempts to submit quiz responses for another student
- **THEN** the system rejects the submission with 403 Forbidden

## Data Models

### QuizQuestion

Represents a single quiz question with type-specific options and correct answer(s).

**Fields:**
- `id` (String, UUID) - Primary key
- `lessonId` (String) - Foreign key to Lesson
- `type` (Enum: QuestionType) - Question type (MULTIPLE_CHOICE, MULTIPLE_SELECT, TRUE_FALSE, FILL_IN_BLANK, VOCABULARY_MATCH)
- `text` (String) - Question text/prompt
- `options` (JSON) - Type-specific options (e.g., array of choices for MC, terms/definitions for vocab match)
- `correctAnswer` (JSON) - Type-specific correct answer(s)
- `points` (Int) - Point value for this question (typically 1)
- `order` (Int) - Display order within lesson question bank
- `version` (Int, optional) - Question version for tracking edits (recommended by AI reviewer)
- `createdAt` (DateTime) - Timestamp of creation
- `updatedAt` (DateTime) - Timestamp of last update

**Relationships:**
- `lesson` - Many-to-one with Lesson
- `standards` - Many-to-many with Standard via `_QuestionToStandard`
- `responses` - One-to-many with QuestionResponse

**JSON Field Formats:**

*Multiple Choice:*
```json
{
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "Option B"
}
```

*Multiple Select:*
```json
{
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": ["Option B", "Option D"]
}
```

*True/False:*
```json
{
  "options": ["True", "False"],
  "correctAnswer": "True"
}
```

*Fill-in-the-Blank:*
```json
{
  "correctAnswer": "photosynthesis"
}
```

*Vocabulary Match:*
```json
{
  "options": {
    "terms": ["Photosynthesis", "Respiration", "Chlorophyll"],
    "definitions": ["Process of making food using sunlight", "Process of breaking down food for energy", "Green pigment in plants"]
  },
  "correctAnswer": {
    "Photosynthesis": "Process of making food using sunlight",
    "Respiration": "Process of breaking down food for energy",
    "Chlorophyll": "Green pigment in plants"
  }
}
```

### Attempt

Represents a single student's attempt at a lesson quiz.

**Fields:**
- `id` (String, UUID) - Primary key
- `studentId` (String) - Foreign key to User (student)
- `lessonId` (String) - Foreign key to Lesson
- `score` (Float) - Points earned
- `maxScore` (Float) - Total points possible
- `attemptNumber` (Int) - Sequential attempt number for this student-lesson pair
- `startedAt` (DateTime) - When quiz was started
- `completedAt` (DateTime, nullable) - When quiz was submitted (null if in progress)
- `createdAt` (DateTime) - Timestamp of creation
- `updatedAt` (DateTime) - Timestamp of last update

**Relationships:**
- `student` - Many-to-one with User
- `lesson` - Many-to-one with Lesson
- `questionResponses` - One-to-many with QuestionResponse

**Indexes:**
- `studentId, lessonId` - For efficient lookup of student's attempts on a lesson
- `studentId, lessonId, attemptNumber` - Unique constraint

### QuestionResponse

Represents a student's answer to a single question within an attempt.

**Fields:**
- `id` (String, UUID) - Primary key
- `attemptId` (String) - Foreign key to Attempt
- `questionId` (String) - Foreign key to QuizQuestion (or quizQuestionId per GPT-5 suggestion)
- `studentAnswer` (JSON) - Student's answer in type-specific format
- `isCorrect` (Boolean) - Whether the answer was correct
- `timeSpentSeconds` (Int) - Time spent on this question
- `answeredAt` (DateTime) - When the question was answered
- `order` (Int, optional) - Position in the quiz (recommended by GPT-5 for analytics)
- `createdAt` (DateTime) - Timestamp of creation

**Relationships:**
- `attempt` - Many-to-one with Attempt
- `question` - Many-to-one with QuizQuestion

**Indexes:**
- `attemptId` - For efficient retrieval of all responses for an attempt
- `questionId` - For question-level analytics

**Student Answer Formats:**

Match the question type formats, e.g.:
```json
// Multiple choice
{ "studentAnswer": "Option B" }

// Multiple select
{ "studentAnswer": ["Option A", "Option C"] }

// Fill-in-the-blank
{ "studentAnswer": "Photosynthesis" }

// Vocabulary match
{ "studentAnswer": { "Term1": "Def2", "Term2": "Def1" } }
```

### _QuestionToStandard

Many-to-many relationship linking questions to curriculum standards.

**Fields:**
- `questionId` (String) - Foreign key to QuizQuestion
- `standardId` (String) - Foreign key to Standard

**Purpose:** Enables standards-based analytics by tracking which standards each question assesses.

## API Contracts

### GET /api/lessons/{lessonId}/quiz ✅ IMPLEMENTED

Retrieve a random set of N questions from the lesson's 4N question bank to start a new quiz attempt.

**Implementation:** `app/api/lessons/[lessonId]/quiz/route.ts` (GET handler)
**Authentication:** Required
**Authorization:** Student must be enrolled in a class using this lesson OR teacher must own the class

**Request:**
- Path parameter: `lessonId` (String)

**Response (200 OK):**
```json
{
  "quizId": "attempt-uuid",
  "lessonId": "lesson-id",
  "questions": [
    {
      "id": "question-uuid",
      "type": "MULTIPLE_CHOICE",
      "text": "What is the first step of the scientific method?",
      "options": ["Observe", "Predict", "Test", "Conclude"],
      "points": 1,
      "order": 1
    }
    // ... N questions total (correctAnswer NOT included)
  ],
  "totalPoints": 9,
  "startedAt": "2025-10-25T10:30:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not enrolled in class or not teacher of class
- `404 Not Found` - Lesson not found
- `500 Internal Server Error` - Question pool too small or other server error

### POST /api/lessons/{lessonId}/quiz/submit ✅ IMPLEMENTED

Submit a completed quiz attempt with question responses and timing data.

**Implementation:** `app/api/lessons/[lessonId]/quiz/route.ts` (POST handler)
**Authentication:** Required
**Authorization:** Student must be enrolled in class and quiz must belong to them

**Request:**
- Path parameter: `lessonId` (String)

**Request Body:**
```json
{
  "attemptId": "attempt-uuid",
  "responses": [
    {
      "questionId": "question-uuid",
      "studentAnswer": "Option A",
      "timeSpentSeconds": 45,
      "answeredAt": "2025-10-25T10:31:00Z",
      "order": 1
    }
    // ... all questions must be answered
  ]
}
```

**Response (200 OK):**
```json
{
  "attemptId": "attempt-uuid",
  "score": 7,
  "maxScore": 9,
  "percentage": 77.78,
  "attemptNumber": 2,
  "completedAt": "2025-10-25T10:40:00Z",
  "breakdown": [
    {
      "questionId": "question-uuid",
      "questionText": "What is the first step...",
      "studentAnswer": "Observe",
      "correctAnswer": "Observe",
      "isCorrect": true,
      "points": 1,
      "timeSpentSeconds": 45
    }
    // ... all questions
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Attempt belongs to different student
- `400 Bad Request` - Missing responses or validation failure
- `404 Not Found` - Attempt or lesson not found
- `409 Conflict` - Attempt already submitted

## Dependencies

### Depends On
- `docs/specs/core-science-curriculum-content-management/spec.md` - Lesson and Standard models
- User authentication and session management
- Class enrollment verification

### Depended On By
- `docs/specs/progress-tracking/spec.md` - Uses Attempt and QuestionResponse for progress tracking
- ✅ Quiz Taking API implementation (Story #93) - **IMPLEMENTED**
- ✅ Quiz UI Components (Story #94) - **IMPLEMENTED**
- Teacher Analytics features (Stories #96-99)

## Implementation Notes

### Question Bank Management

1. **Initial Population:** 4N questions per lesson (36 questions for 9-question quiz)
2. **Content Mix:** Balance of science content (50%), reading comprehension (30%), vocabulary (20%)
3. **Standards Tagging:** Each question tagged to 1-3 relevant standards from the lesson
4. **Difficulty Distribution:** Mix of easy (40%), medium (40%), hard (20%) questions

### Randomization Strategy

- Use cryptographically secure random selection for fairness
- Track which questions were served in each attempt for analytics
- Consider student performance on previous attempts to avoid serving same questions if possible

### Data Integrity Considerations

1. **Fill-in-the-Blank Normalization:**
   - Convert to lowercase
   - Trim leading/trailing whitespace
   - Remove extra internal spaces
   - Consider common misspellings in future iteration

2. **Question Versioning:**
   - Preserve original question content when editing
   - Link attempts to specific question version
   - Allow analytics to compare performance across versions

3. **Attempt Integrity:**
   - Prevent duplicate submissions
   - Validate all questions answered before allowing submission
   - Verify timing data is reasonable (detect suspicious patterns)

### Performance Considerations

- Index foreign keys: `lessonId`, `studentId`, `attemptId`, `questionId`
- Consider caching question pools per lesson
- Optimize random selection query for large question banks
- Use database transactions for attempt submission to ensure data consistency

## UI Implementation

### Component Architecture ✅ IMPLEMENTED

**QuizPlayer Component** (`components/features/student/quiz-player.tsx`)
- Main orchestrator component managing quiz state and flow
- Handles quiz fetching, submission, and results display
- Implements client-side timing tracking per question
- Manages navigation between questions
- Displays confirmation dialog before submission
- Shows color-coded results with detailed breakdown

**Question Type Components** (`components/features/student/quiz-questions/`)
- `multiple-choice-question.tsx` - Radio button selection
- `multiple-select-question.tsx` - Checkbox selection with "Select all that apply"
- `true-false-question.tsx` - True/False radio buttons
- `fill-in-blank-question.tsx` - Text input field
- `vocabulary-match-question.tsx` - Dropdown selection (prioritized over drag-and-drop for better mobile support)

### User Interface Features ✅ IMPLEMENTED

**Quiz Taking Flow:**
1. Lesson page includes Lesson/Quiz tab toggle
2. Quiz tab fetches random N questions from 4N pool
3. Progress indicator shows "Question X of Y"
4. One question displayed at a time with navigation buttons
5. Previous/Next buttons for navigation (Previous disabled on first question)
6. Submit button appears on last question
7. Confirmation dialog prevents accidental submission
8. Validation ensures all questions answered before submission

**Results Display:**
- Large percentage display with color-coded badge:
  - ≥90%: Blue "Excellent!" badge
  - ≥80%: Green "Great!" badge
  - ≥60%: Yellow "Good!" badge
  - <60%: Red "Keep Trying!" badge
- Score summary (points earned / total points)
- Attempt number tracking
- Retake Quiz button to start new attempt
- Detailed question breakdown showing:
  - Question text
  - Student's answer
  - Correct answer (for incorrect responses)
  - Time spent per question
  - Correct/Incorrect badge

**Accessibility Features:**
- Keyboard navigation support (Tab, Space, Enter)
- ARIA labels on all form controls
- Screen reader friendly
- Sufficient color contrast on all elements
- Focus indicators on interactive elements

**Responsive Design:**
- Mobile-friendly (375px+)
- Touch-optimized for mobile devices
- Dropdown selection instead of drag-and-drop for better mobile UX
- Adaptive layouts for tablet and desktop

**Error Handling:**
- Loading states with spinners
- Authentication errors (401)
- Authorization errors (403)
- Not found errors (404)
- Server errors (500)
- Network error handling
- Already submitted prevention (409)

**Timing Implementation:**
- Client-side timestamp when question loads
- Time calculated when navigating away or submitting
- Stored per-question in seconds
- Sent to API with submission
- Displayed in results breakdown

### Integration Points

**Route:** `/student/classes/[classId]/lessons/[lessonSlug]`
- Lesson/Quiz tab toggle interface
- Lazy loads QuizPlayer when Quiz tab selected
- Maintains classId context for navigation

**API Consumption:**
- GET `/api/lessons/[lessonSlug]/quiz` - Fetch random questions
- POST `/api/lessons/[lessonSlug]/quiz` - Submit answers with timing

### Testing

**Manual Test Plan:** `docs/testing/quiz-ui-manual-test-plan.md`
- Comprehensive test scenarios for all question types
- Navigation and submission flows
- Results display and retake functionality
- Accessibility and responsive design tests
- Edge cases and error handling

## Future Enhancements

- Support for open-ended questions with manual grading
- AI-assisted question generation to maintain 4N pool
- Adaptive question difficulty based on student performance
- Question analytics to identify poorly-worded or confusing questions
- Support for image-based questions and diagrams
- Audio questions for language learning
- Collaborative quizzes for group assessments
- Pause/resume quiz functionality
- Tab switching detection for timing accuracy
- Offline quiz support with local storage
