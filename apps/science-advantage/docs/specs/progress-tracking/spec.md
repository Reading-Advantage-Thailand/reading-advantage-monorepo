---
title: Progress Tracking Specification
type: spec
status: draft
created_at: 2025-11-29
tags: [spec, progress-tracking, analytics, reporting, mastery]
description: Technical specification for tracking student progress through lessons, calculating completion rates, and aggregating performance by curriculum standards.
---

# Progress Tracking

## Overview

Track student progress through curriculum lessons and provide teachers with standards-based analytics for identifying learning gaps and planning interventions. This system enables students to monitor their own learning journey while giving teachers detailed insights into individual and class-level performance organized by curriculum standards.

## Requirements

### Requirement: Track Lesson Completion Status

The system SHALL record when a student completes a lesson based on quiz attempt completion (any score counts as completed).

#### Scenario: Mark Lesson as Complete
- **WHEN** a student completes a lesson quiz with any score
- **THEN** the lesson is marked as completed for that student with completedAt timestamp

#### Scenario: View Completed Lessons
- **WHEN** a student views the curriculum
- **THEN** completed lessons display with a color-coded score badge based on most recent attempt

#### Scenario: Lesson Completion Persists Across Retakes
- **WHEN** a student retakes a quiz after initial completion
- **THEN** the lesson remains in completed status and scores are updated

### Requirement: Display Progress in Curriculum View

The system SHALL show completion status and scores for all lessons in the curriculum view with visual indicators.

#### Scenario: Student Views Curriculum Progress
- **WHEN** a student navigates to their class curriculum
- **THEN** each lesson shows completion status (not started / started / completed) and most recent score if completed

#### Scenario: Color-Coded Score Badges
- **WHEN** a lesson has been attempted
- **THEN** the score badge displays with color coding: ≥90% blue, ≥80% green, <80% yellow, <60% red

#### Scenario: Not Started Lessons Display Neutral State
- **WHEN** a lesson has no attempts
- **THEN** the lesson displays "Not Started" with neutral styling (no score badge)

#### Scenario: Started But Not Completed Lessons
- **WHEN** a student has an in-progress attempt
- **THEN** the lesson displays "In Progress" status (for future implementation of save/resume)

### Requirement: Track Multiple Attempts with History

The system SHALL record all quiz attempts and display the most recent score prominently while preserving attempt history.

#### Scenario: Student Retakes Quiz
- **WHEN** a student completes a quiz retake
- **THEN** the most recent score is displayed on the lesson card, attempt count increments, and best score is updated if exceeded

#### Scenario: View Attempt History
- **WHEN** a student hovers over the score badge
- **THEN** a tooltip shows: total attempts, most recent score, best score, and date of most recent attempt

#### Scenario: Attempt Number Increments
- **WHEN** a student submits multiple quiz attempts for the same lesson
- **THEN** each attempt has a sequential attemptNumber starting from 1

### Requirement: Report Class Performance by Lesson

The system SHALL aggregate quiz performance at the class level for each lesson to identify struggling lessons.

#### Scenario: Teacher Views Class Overview
- **WHEN** a teacher views class analytics
- **THEN** the system displays each lesson with: completion rate (% of students completed), average score, average attempts, average total time

#### Scenario: Identify Struggling Lessons
- **WHEN** a teacher views class overview
- **THEN** lessons with average score <80% are highlighted in yellow, <60% in red

#### Scenario: Sort Lessons by Performance Metrics
- **WHEN** a teacher views class overview
- **THEN** lessons can be sorted by: lesson order (default), completion rate, average score, average attempts, or average time

#### Scenario: Empty Class Analytics
- **WHEN** a class has no students or no completed attempts
- **THEN** the system displays appropriate empty state message

### Requirement: Report Student Performance by Lesson

The system SHALL provide per-student performance data for a specific lesson with question-level details.

#### Scenario: Teacher Views Lesson Detail
- **WHEN** a teacher selects a lesson in class analytics
- **THEN** the system displays each student's completion status, most recent score, best score, total attempts, and total time

#### Scenario: Sort Students by Performance
- **WHEN** a teacher views lesson detail
- **THEN** students can be sorted by: name (default), score, attempts, or time

#### Scenario: Navigate to Student Detail
- **WHEN** a teacher clicks a student row in lesson detail
- **THEN** the system navigates to Student-Lesson Detail view showing attempt history

### Requirement: Display Question-Level Analytics

The system SHALL show teachers detailed question-level performance and timing data to identify challenging concepts.

#### Scenario: Teacher Views Question Analytics
- **WHEN** a teacher drills down to question analytics in lesson detail
- **THEN** the system displays for each question: question number, truncated text, % correct, average time spent

#### Scenario: Sort Questions by Difficulty
- **WHEN** a teacher views question analytics
- **THEN** questions are sorted by % correct (lowest first) to highlight most challenging questions

#### Scenario: Expand Question Details
- **WHEN** a teacher clicks a question row
- **THEN** the system expands to show: full question text, answer distribution (for MC/MS), list of students who answered incorrectly

#### Scenario: Identify Students Needing Help
- **WHEN** a teacher expands a question
- **THEN** the system displays names of students who answered incorrectly for targeted intervention

### Requirement: Report Performance by Standard

The system SHALL aggregate quiz performance by curriculum standard for standards-based reporting and intervention planning.

#### Scenario: Teacher Views Standard Performance
- **WHEN** a teacher views lesson analytics
- **THEN** the system displays each standard covered with: standard code, description, % of students who mastered it (≥80% on questions for that standard)

#### Scenario: Flag Standards for Reteach
- **WHEN** a teacher views standard analytics
- **THEN** standards where <70% of students demonstrate mastery are flagged with visual indicator for whole-class reteaching

#### Scenario: Standards Performance Across Questions
- **WHEN** calculating standard mastery
- **THEN** the system aggregates performance across all questions tagged to that standard

### Requirement: Display Individual Attempt History

The system SHALL provide detailed attempt history for a student on a specific lesson with question-by-question breakdown.

#### Scenario: Teacher Views Student-Lesson Detail
- **WHEN** a teacher selects a student within a lesson
- **THEN** the system displays all attempts with: attempt number, date/time, score, time spent, status

#### Scenario: Expand Attempt for Question Breakdown
- **WHEN** a teacher clicks an attempt row
- **THEN** the system expands to show each question with: question number, student's answer, correct answer, result (correct/incorrect), time spent

#### Scenario: Color-Coded Question Results
- **WHEN** viewing question breakdown
- **THEN** correct answers display in green, incorrect answers display in red

#### Scenario: Student Standards Performance on Lesson
- **WHEN** viewing student-lesson detail
- **THEN** the system displays standard-level performance for this student: standard code, questions answered, questions correct, mastery percentage

### Requirement: Report Individual Student Performance Across Lessons

The system SHALL provide per-student analytics aggregated across all lessons in a class for comprehensive student profiles.

#### Scenario: Teacher Views Student Detail
- **WHEN** a teacher selects a student from class overview
- **THEN** the system displays: lessons completed, average score across all lessons, total time spent, total attempts

#### Scenario: Student Lesson Performance Table
- **WHEN** viewing student detail
- **THEN** the system displays a table with: lesson title, completion status, most recent score, best score, attempts, total time

#### Scenario: Sort Student Lessons
- **WHEN** viewing student lesson table
- **THEN** lessons can be sorted by: lesson order (default), score, attempts, or time

#### Scenario: Navigate to Student-Lesson Detail
- **WHEN** a teacher clicks a lesson row in student detail
- **THEN** the system navigates to Student-Lesson Detail view for that student-lesson pair

### Requirement: Display Student Standards Mastery Profile

The system SHALL aggregate student performance by standard across all lessons to identify individual learning gaps.

#### Scenario: Teacher Views Student Standards Mastery
- **WHEN** a teacher views student detail
- **THEN** the system displays each standard with: standard code, description, questions answered, questions correct, mastery percentage

#### Scenario: Sort Standards by Mastery
- **WHEN** viewing student standards mastery
- **THEN** standards are sorted by mastery percentage (lowest first) to highlight areas needing intervention

#### Scenario: Identify Students Needing Intervention
- **WHEN** a teacher views student standards mastery
- **THEN** standards with <60% mastery are flagged with visual indicator (red flag/icon) for targeted intervention

#### Scenario: Standards Progress Over Time
- **WHEN** a student completes quizzes in multiple lessons
- **THEN** the system updates standard mastery percentages based on cumulative performance

### Requirement: Track Time-on-Task at Multiple Levels

The system SHALL aggregate time-spent data at question, quiz, lesson, and student levels for engagement analytics.

#### Scenario: Teacher Views Time-on-Task Report
- **WHEN** a teacher reviews student engagement
- **THEN** the system displays total time spent across all lessons and per-lesson time breakdowns

#### Scenario: Identify Time Outliers
- **WHEN** viewing time analytics
- **THEN** the system highlights students with unusually high or low time-on-task for investigation

#### Scenario: Question-Level Time Analytics
- **WHEN** viewing question analytics
- **THEN** the system displays average time spent per question to identify confusing questions

### Requirement: Support Accessibility in Analytics UI

The system SHALL ensure color-coded indicators are accessible to users with color vision deficiency.

#### Scenario: Color-Blind Accessible Indicators
- **WHEN** displaying color-coded score badges or analytics
- **THEN** the system includes text labels or patterns in addition to color (e.g., "90% - Excellent" not just blue)

#### Scenario: Screen Reader Support
- **WHEN** a teacher using a screen reader navigates analytics
- **THEN** all data tables include appropriate ARIA labels and semantic HTML

### Requirement: Optimize Analytics Performance

The system SHALL provide analytics data efficiently even with large numbers of students and attempts.

#### Scenario: Large Class Analytics
- **WHEN** a class has >50 students with multiple attempts each
- **THEN** analytics load within 2 seconds using optimized queries and caching

#### Scenario: Paginated Data Tables
- **WHEN** analytics tables exceed 100 rows
- **THEN** the system implements pagination or virtual scrolling for performance

## Data Models

### LessonCompletion

Tracks a student's overall progress and performance on a specific lesson across all attempts.

**Fields:**
- `id` (String, UUID) - Primary key
- `studentId` (String) - Foreign key to User (student)
- `lessonId` (String) - Foreign key to Lesson
- `status` (Enum: LessonCompletionStatus) - NOT_STARTED, IN_PROGRESS, COMPLETED
- `completedAt` (DateTime, nullable) - When first completed (first submitted attempt)
- `attemptsCount` (Int) - Total number of attempts
- `bestScore` (Float, nullable) - Highest score achieved across all attempts
- `bestScorePercentage` (Float, nullable) - Best score as percentage
- `mostRecentScore` (Float, nullable) - Score from most recent attempt
- `mostRecentScorePercentage` (Float, nullable) - Most recent score as percentage
- `totalTimeSpentSeconds` (Int) - Cumulative time across all attempts
- `lastAttemptAt` (DateTime, nullable) - Timestamp of most recent attempt
- `createdAt` (DateTime) - Timestamp of creation
- `updatedAt` (DateTime) - Timestamp of last update

**Relationships:**
- `student` - Many-to-one with User
- `lesson` - Many-to-one with Lesson

**Indexes:**
- `studentId, lessonId` - Unique constraint, for efficient lookup
- `studentId` - For student progress queries
- `lessonId` - For lesson analytics

**Status Enum Values:**
- `NOT_STARTED` - No attempts yet
- `IN_PROGRESS` - At least one attempt started but not completed (for future save/resume feature)
- `COMPLETED` - At least one attempt completed

### StandardProgress (Calculated/Aggregated)

Represents a student's mastery of a curriculum standard across all lessons. This may be implemented as a database view or calculated on-demand.

**Conceptual Fields:**
- `id` (String, UUID) - Primary key (if materialized)
- `studentId` (String) - Foreign key to User
- `classId` (String) - Foreign key to Class (to scope standards per class/framework)
- `standardId` (String) - Foreign key to Standard
- `questionsAnswered` (Int) - Total questions for this standard attempted
- `questionsCorrect` (Int) - Total correct answers
- `masteryPercentage` (Float) - (questionsCorrect / questionsAnswered) * 100
- `lastAttemptAt` (DateTime) - Most recent question response for this standard
- `updatedAt` (DateTime) - Last calculation timestamp

**Calculation Method:**
- Aggregate all QuestionResponse records for questions linked to this standard
- Count total responses and correct responses
- Calculate mastery percentage

**Note:** Initial implementation may calculate on-demand. Future optimization could use materialized view or cached table updated on quiz submission.

## API Contracts

### GET /api/students/{studentId}/lessons/{lessonId}/progress

Retrieve progress and completion data for a specific student-lesson pair.

**Authentication:** Required
**Authorization:** Student can view own data, teachers can view students in their classes

**Response (200 OK):**
```json
{
  "studentId": "student-uuid",
  "lessonId": "lesson-uuid",
  "status": "COMPLETED",
  "completedAt": "2025-10-24T15:30:00Z",
  "attemptsCount": 3,
  "bestScore": 9,
  "bestScorePercentage": 100,
  "mostRecentScore": 8,
  "mostRecentScorePercentage": 88.89,
  "totalTimeSpentSeconds": 1800,
  "lastAttemptAt": "2025-10-25T10:40:00Z"
}
```

### GET /api/classes/{classId}/analytics/overview

Retrieve class-level aggregated analytics across all lessons.

**Authentication:** Required
**Authorization:** Teacher must own the class

**Response (200 OK):**
```json
{
  "classId": "class-uuid",
  "className": "Grade 3 Science - Room 101",
  "totalStudents": 25,
  "lessons": [
    {
      "lessonId": "lesson-uuid",
      "lessonTitle": "Being a Scientist",
      "lessonOrder": 1,
      "completionRate": 92.0,
      "studentsCompleted": 23,
      "averageScore": 85.5,
      "averageScorePercentage": 95.0,
      "averageAttempts": 1.4,
      "averageTimeSeconds": 540,
      "colorCode": "blue"
    }
    // ... all lessons
  ]
}
```

### GET /api/classes/{classId}/lessons/{lessonId}/analytics

Retrieve detailed analytics for a specific lesson including student performance, question analytics, and standards performance.

**Authentication:** Required
**Authorization:** Teacher must own the class

**Response (200 OK):**
```json
{
  "lesson": {
    "id": "lesson-uuid",
    "title": "Being a Scientist",
    "order": 1
  },
  "classStats": {
    "totalStudents": 25,
    "studentsCompleted": 23,
    "completionRate": 92.0,
    "averageScore": 8.5,
    "averageScorePercentage": 94.4
  },
  "students": [
    {
      "studentId": "student-uuid",
      "studentName": "Alice Johnson",
      "completionStatus": "COMPLETED",
      "mostRecentScore": 9,
      "mostRecentScorePercentage": 100,
      "bestScore": 9,
      "bestScorePercentage": 100,
      "attempts": 2,
      "totalTimeSeconds": 600,
      "colorCode": "blue"
    }
    // ... all students
  ],
  "questions": [
    {
      "questionId": "question-uuid",
      "questionNumber": 1,
      "questionTextTruncated": "What is the first step of...",
      "questionType": "MULTIPLE_CHOICE",
      "percentCorrect": 78.3,
      "averageTimeSeconds": 45,
      "totalResponses": 23,
      "correctResponses": 18,
      "incorrectStudents": ["Bob Smith", "Charlie Brown", "Dana White", "Eve Garcia", "Frank Lee"]
    }
    // ... all questions sorted by percentCorrect ascending
  ],
  "standards": [
    {
      "standardId": "standard-uuid",
      "standardCode": "Sc8.1-G3",
      "standardDescription": "Observe and describe...",
      "questionsCount": 3,
      "studentsMastered": 20,
      "percentMastered": 86.9,
      "flagForReteach": false,
      "colorCode": "green"
    }
    // ... all standards
  ]
}
```

### GET /api/students/{studentId}/lessons/{lessonId}/analytics

Retrieve attempt history and detailed performance for a specific student-lesson pair.

**Authentication:** Required
**Authorization:** Student can view own data, teachers can view students in their classes

**Response (200 OK):**
```json
{
  "student": {
    "id": "student-uuid",
    "name": "Alice Johnson"
  },
  "lesson": {
    "id": "lesson-uuid",
    "title": "Being a Scientist"
  },
  "summary": {
    "attemptsCount": 3,
    "bestScore": 9,
    "bestScorePercentage": 100,
    "mostRecentScore": 8,
    "mostRecentScorePercentage": 88.89,
    "totalTimeSpentSeconds": 1800
  },
  "attempts": [
    {
      "attemptId": "attempt-uuid",
      "attemptNumber": 3,
      "completedAt": "2025-10-25T10:40:00Z",
      "score": 8,
      "maxScore": 9,
      "percentage": 88.89,
      "timeSpentSeconds": 600,
      "questions": [
        {
          "questionId": "question-uuid",
          "questionNumber": 1,
          "questionText": "What is the first step of the scientific method?",
          "studentAnswer": "Predict",
          "correctAnswer": "Observe",
          "isCorrect": false,
          "points": 1,
          "timeSpentSeconds": 55
        }
        // ... all questions
      ]
    }
    // ... all attempts, most recent first
  ],
  "standardsPerformance": [
    {
      "standardCode": "Sc8.1-G3",
      "standardDescription": "Observe and describe...",
      "questionsAnswered": 9,
      "questionsCorrect": 7,
      "masteryPercentage": 77.78,
      "colorCode": "yellow"
    }
    // ... all standards sorted by mastery ascending
  ]
}
```

### GET /api/students/{studentId}/classes/{classId}/analytics

Retrieve comprehensive analytics for a student across all lessons in a class.

**Authentication:** Required
**Authorization:** Student can view own data, teachers can view students in their classes

**Response (200 OK):**
```json
{
  "student": {
    "id": "student-uuid",
    "name": "Alice Johnson"
  },
  "class": {
    "id": "class-uuid",
    "name": "Grade 3 Science - Room 101"
  },
  "summary": {
    "lessonsCompleted": 7,
    "totalLessons": 9,
    "completionRate": 77.78,
    "averageScore": 8.2,
    "averageScorePercentage": 91.1,
    "totalTimeSpentSeconds": 4200,
    "totalAttempts": 12
  },
  "lessons": [
    {
      "lessonId": "lesson-uuid",
      "lessonTitle": "Being a Scientist",
      "lessonOrder": 1,
      "completionStatus": "COMPLETED",
      "mostRecentScore": 8,
      "mostRecentScorePercentage": 88.89,
      "bestScore": 9,
      "bestScorePercentage": 100,
      "attempts": 3,
      "totalTimeSeconds": 600,
      "colorCode": "blue"
    }
    // ... all lessons
  ],
  "standardsMastery": [
    {
      "standardId": "standard-uuid",
      "standardCode": "Sc1.1-G3",
      "standardDescription": "Identify and describe characteristics...",
      "questionsAnswered": 15,
      "questionsCorrect": 8,
      "masteryPercentage": 53.33,
      "needsIntervention": true,
      "colorCode": "red"
    }
    // ... all standards sorted by mastery ascending
  ]
}
```

## Dependencies

### Depends On
- `docs/specs/assessment-system/spec.md` - Attempt and QuestionResponse models
- `docs/specs/core-science-curriculum-content-management/spec.md` - Lesson and Standard models
- User authentication and class enrollment verification

### Depended On By
- Teacher analytics UI components (Stories #96-99)
- Student curriculum view (Story #65, #95)
- Future intervention planning features

## Implementation Notes

### Color Coding Standards

**Score Badges:**
- ≥90%: Blue (Excellent)
- ≥80%: Green (Good)
- ≥60% and <80%: Yellow (Needs Improvement)
- <60%: Red (Needs Intervention)

**Implementation:** Use Tailwind CSS color classes and include text labels for accessibility.

### Analytics Calculation Strategy

**Option 1: On-Demand Calculation (Initial Implementation)**
- Calculate analytics when endpoint is called
- Use optimized Prisma queries with aggregations
- Implement simple caching (5-minute TTL)

**Option 2: Materialized Views (Future Optimization)**
- Create database views for complex aggregations
- Update on quiz submission using triggers or background jobs
- Faster response times for large datasets

**Recommendation:** Start with Option 1, migrate to Option 2 if performance becomes an issue.

### Database Query Optimization

1. **Indexes:** Ensure foreign keys are indexed (studentId, lessonId, attemptId, questionId, standardId)
2. **Aggregation Queries:** Use Prisma aggregations and groupBy for efficient calculations
3. **N+1 Prevention:** Use Prisma include/select to fetch related data in single queries
4. **Pagination:** Implement cursor-based pagination for large result sets

### Standards Mastery Calculation

```typescript
// Pseudocode for calculating student standards mastery
const standardsMastery = await prisma.questionResponse.groupBy({
  by: ['questionId'],
  where: {
    attempt: {
      studentId: studentId,
      lesson: {
        class: { id: classId }
      }
    }
  },
  _sum: {
    isCorrect: true
  },
  _count: true
})

// Join with questions to get standards
// Aggregate by standardId
// Calculate mastery percentage per standard
```

### Caching Strategy

- **Class Overview:** Cache for 5 minutes, invalidate on new quiz submission
- **Lesson Detail:** Cache for 5 minutes, invalidate on new quiz submission for that lesson
- **Student Detail:** Cache for 5 minutes, invalidate on student's quiz submission
- **Use Redis or in-memory cache (Next.js data cache)**

### UI Accessibility

1. **Color Blindness Support:**
   - Include text labels with colors: "90% (Excellent)" not just blue badge
   - Use patterns or icons in addition to colors
   - Test with color blindness simulators

2. **Screen Reader Support:**
   - Semantic HTML tables with proper headers
   - ARIA labels for sortable columns
   - ARIA live regions for updated analytics data

3. **Keyboard Navigation:**
   - All interactive elements keyboard accessible
   - Logical tab order
   - Keyboard shortcuts for common actions

## Future Enhancements

- Real-time analytics updates using WebSocket or Server-Sent Events
- Exportable reports (PDF, CSV) for parent conferences
- Comparison charts showing class average vs. individual performance
- Trend analysis showing improvement over time
- Predictive analytics using machine learning to identify at-risk students
- Parent portal for viewing student progress
- Integration with learning management systems (LMS)
- Standards mastery badges and gamification
- Peer comparison (anonymized) for student motivation
