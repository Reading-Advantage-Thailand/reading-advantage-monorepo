---
title: Primary Assessment Template
type: template
status: active
created_at: 2025-10-25
tags: [template, content-authoring, assessment, quiz, primary-school]
description: Markdown template for creating assessment containers (quizzes) for primary grades, including instructions and review topics.
---

# [Assessment Title]

**Lesson Type:** ASSESSMENT
**Grade Level:** [Grade number]
**Estimated Time:** [Duration in minutes]

## Instructions

[Clear instructions for students on how to complete the assessment]

**What You'll Do:**
- [Instruction 1]
- [Instruction 2]
- [Instruction 3]

**Tips for Success:**
- [Tip 1: e.g., "Read each question carefully"]
- [Tip 2: e.g., "You can review lesson content before starting"]
- [Tip 3: e.g., "Take your time and do your best"]

## Review Topics

[List of topics and concepts covered in this assessment. Helps students know what to study.]

This assessment covers the following topics:

- **[Topic 1]**: [Brief description]
- **[Topic 2]**: [Brief description]
- **[Topic 3]**: [Brief description]
- **[Topic 4]**: [Brief description]

**Lessons to Review:**
- Lesson [X]: [Lesson Title]
- Lesson [Y]: [Lesson Title]
- Lesson [Z]: [Lesson Title]

---

## Notes for Content Authors

**About Assessment Content:**

Assessment lessons serve as **containers** for quiz metadata and instructions. The actual quiz questions are stored separately in the `QuizQuestion` model (see Issue #92 - Assessment Data Schema).

**Required Sections:**
1. Instructions
2. Review Topics

**What NOT to Include:**

Do **not** include actual quiz questions in the lesson content. Questions are managed through:
- `QuizQuestion` model in the database
- Question bank seeding scripts
- Assessment builder tools

**Purpose of Assessment Lessons:**

Assessment lessons provide:
- Student-facing instructions before starting a quiz
- List of topics covered to guide review
- Links to related instructional lessons
- Metadata like estimated time and grade level

**Relationship to Quiz Questions:**

```
Assessment Lesson (metadata & instructions)
    ↓
Quiz (instance of assessment for a class)
    ↓
QuizQuestion (individual questions from question bank)
```

**Example Flow:**

1. Student navigates to "Unit 1 Assessment" lesson
2. Reads instructions and review topics
3. Clicks "Start Quiz" button
4. System creates Quiz instance and loads QuizQuestions
5. Student answers questions (tracked separately)
6. Results are scored and stored

**Validation Checks:**
- Must have Instructions section
- Must have Review Topics section
- Should reference related lesson IDs or titles

**Tips:**
- Keep instructions clear and encouraging
- List all relevant topics students should know
- Link to review materials when possible
- Set appropriate time expectations
- Consider test anxiety - use supportive language
