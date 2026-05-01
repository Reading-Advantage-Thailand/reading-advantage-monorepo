---
title: API Specification (Archived)
type: archive
status: deprecated
created_at: 2025-11-29
tags: [archive, architecture, api, openapi, rest]
description: Legacy OpenAPI 3.0 specification for the Science Advantage platform. Refer to current specs for latest API contracts.
---

# API Specification

Based on the REST API choice from our Tech Stack, here's the OpenAPI 3.0 specification for the Science Advantage platform:

```yaml
openapi: 3.0.0
info:
  title: Science Advantage API
  version: 1.0.0
  description: API for the Science Advantage educational platform providing science curriculum management, lesson delivery, and student progress tracking
servers:
  - url: https://api.science-advantage.com/v1
    description: Production server
  - url: https://staging-api.science-advantage.com/v1
    description: Staging server
  - url: http://localhost:3000/api/v1
    description: Development server

# Authentication
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    sessionAuth:
      type: apiKey
      in: cookie
      name: session_token

  # Note on Authentication Strategy
  # The primary authentication method for the web frontend is `sessionAuth` (a custom session cookie).
  # The `bearerAuth` (JWT) scheme is provided for external clients, such as the future mobile application or third-party integrations.

  schemas:
    # Base Models
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        role:
          type: string
          enum: [STUDENT, TEACHER, ADMIN]
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    Class:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        gradeLevel:
          type: integer
          minimum: 3
          maximum: 6
        standardsAlignment:
          type: string
          enum: [THAI, NGSS]
        joinCode:
          type: string
          description: Unique 6-character alphanumeric code for class enrollment
        teacherId:
          type: string
          format: uuid
        teacher:
          $ref: '#/components/schemas/User'
        studentCount:
          type: integer
        curriculumUnits:
          type: array
          items:
            $ref: '#/components/schemas/CurriculumUnit'
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    CurriculumUnit:
      type: object
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
        description:
          type: string
        framework:
          type: string
          enum: [THAI, NGSS]
        gradeLevel:
          type: integer
        order:
          type: integer
        lessons:
          type: array
          items:
            $ref: '#/components/schemas/Lesson'
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    Lesson:
      type: object
      properties:
        id:
          type: string
          format: uuid
        slug:
          type: string
        title:
          type: string
        description:
          type: string
        content:
          type: string
        order:
          type: integer
        subject:
          type: string
          enum: [PHYSICS, CHEMISTRY, BIOLOGY, GENERAL_SCIENCE]
        difficulty:
          type: string
          enum: [BEGINNER, INTERMEDIATE, ADVANCED]
        estimatedDuration:
          type: integer
          description: Duration in minutes
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    Experiment:
      type: object
      properties:
        id:
          type: string
          format: uuid
        lessonId:
          type: string
          format: uuid
        title:
          type: string
        description:
          type: string
        instructions:
          type: string
        materials:
          type: array
          items:
            type: string
        expectedResults:
          type: string
        safetyNotes:
          type: string
        createdAt:
          type: string
          format: date-time

    LessonProgress:
      type: object
      properties:
        id:
          type: string
          format: uuid
        userId:
          type: string
          format: uuid
        lessonId:
          type: string
          format: uuid
        status:
          type: string
          enum: [NOT_STARTED, IN_PROGRESS, COMPLETED]
        completionPercentage:
          type: integer
          minimum: 0
          maximum: 100
        timeSpent:
          type: integer
          description: Time spent in minutes
        completedAt:
          type: string
          format: date-time
          nullable: true

    ExperimentSubmission:
      type: object
      properties:
        id:
          type: string
          format: uuid
        userId:
          type: string
          format: uuid
        experimentId:
          type: string
          format: uuid
        observations:
          type: string
        results:
          type: string
        photos:
          type: array
          items:
            type: string
            format: uri
        submittedAt:
          type: string
          format: date-time
        grade:
          type: number
          minimum: 0
          maximum: 100
          nullable: true
        feedback:
          type: string
          nullable: true

    Quiz:
      type: object
      properties:
        id:
          type: string
          format: uuid
        lessonId:
          type: string
          format: uuid
        title:
          type: string
        questions:
          type: array
          items:
            $ref: '#/components/schemas/QuizQuestion'
        passingScore:
          type: integer
          minimum: 0
          maximum: 100
        timeLimit:
          type: integer
          description: Time limit in minutes
          nullable: true

    QuizQuestion:
      type: object
      properties:
        id:
          type: string
          format: uuid
        question:
          type: string
        type:
          type: string
          enum: [MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER]
        options:
          type: array
          items:
            type: string
        correctAnswer:
          type: string
        points:
          type: integer
          minimum: 1

    QuizSubmission:
      type: object
      properties:
        id:
          type: string
          format: uuid
        userId:
          type: string
          format: uuid
        quizId:
          type: string
          format: uuid
        answers:
          type: array
          items:
            type: object
            properties:
              questionId:
                type: string
                format: uuid
              answer:
                type: string
        score:
          type: number
          minimum: 0
          maximum: 100
          nullable: true
        passed:
          type: boolean
          nullable: true
        submittedAt:
          type: string
          format: date-time

    # Response Wrappers
    ApiResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
        message:
          type: string
        timestamp:
          type: string
          format: date-time

    PaginatedResponse:
      allOf:
        - $ref: '#/components/schemas/ApiResponse'
        - type: object
          properties:
            pagination:
              type: object
              properties:
                page:
                  type: integer
                limit:
                  type: integer
                total:
                  type: integer
                totalPages:
                  type: integer

    Error:
      type: object
      properties:
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: object
            timestamp:
              type: string
              format: date-time
            requestId:
              type: string

# Paths
paths:
  # Authentication
  /auth/login:
    post:
      tags:
        - Authentication
      summary: Sign in user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username:
                  type: string
                password:
                  type: string
              required:
                - username
                - password
      responses:
        '200':
          description: Sign in successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiResponse'
        '401':
          description: Invalid credentials
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /auth/logout:
    post:
      tags:
        - Authentication
      summary: Sign out user
      security:
        - sessionAuth: []
      responses:
        '200':
          description: Sign out successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiResponse'

  /auth/session:
    get:
      tags:
        - Authentication
      summary: Get current user session
      security:
        - sessionAuth: []
      responses:
        '200':
          description: Current user session retrieved
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/ApiResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/User' 
  # Classes
  /classes:
    get:
      tags:
        - Classes
      summary: Get classes for current user
      security:
        - bearerAuth: []
        - sessionAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Classes retrieved
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/PaginatedResponse'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: '#/components/schemas/Class'

    post:
      tags:
        - Classes
      summary: Create new class (teachers only)
      security:
        - bearerAuth: []
        - sessionAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  minLength: 3
                  maxLength: 100
                gradeLevel:
                  type: integer
                  minimum: 3
                  maximum: 6
                standardsAlignment:
                  type: string
                  enum: [THAI, NGSS]
              required:
                - name
                - gradeLevel
                - standardsAlignment
      responses:
        '201':
          description: Class created with auto-generated joinCode
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/ApiResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/Class'
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          description: Only teachers can create classes
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '409':
          description: Join code collision (rare, retry internally)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /classes/{classId}:
    get:
      tags:
        - Classes
      summary: Get class details with curriculum units
      description: Returns class metadata and curriculum units. joinCode only visible to teacher/admin.
      security:
        - bearerAuth: []
        - sessionAuth: []
      parameters:
        - name: classId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Class retrieved with curriculum units
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/ApiResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/Class'
        '403':
          description: User not authorized to view this class
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          description: Class not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  # Lessons
  /lessons:
    get:
      tags:
        - Lessons
      summary: Get lessons (with optional filtering)
      security:
        - bearerAuth: []
        - sessionAuth: []
      parameters:
        - name: subject
          in: query
          schema:
            type: string
            enum: [PHYSICS, CHEMISTRY, BIOLOGY, GENERAL_SCIENCE]
        - name: difficulty
          in: query
          schema:
            type: string
            enum: [BEGINNER, INTERMEDIATE, ADVANCED]
        - name: classId
          in: query
          schema:
            type: string
            format: uuid
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Lessons retrieved
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/PaginatedResponse'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: '#/components/schemas/Lesson'

  /lessons/{slug}:
    get:
      tags:
        - Lessons
      summary: Get lesson by slug
      security:
        - bearerAuth: []
        - sessionAuth: []
      parameters:
        - name: slug
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Lesson retrieved
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/ApiResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/Lesson'
        '404':
          description: Lesson not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /lessons/{slug}/completion:
    post:
      tags:
        - Lessons
      summary: Mark lesson as complete
      security:
        - bearerAuth: []
        - sessionAuth: []
      parameters:
        - name: slug
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Lesson marked complete
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/ApiResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/LessonProgress'

  # Experiments and Quizzes (Lesson-centric)
  /lessons/{slug}/experiment-submissions:
    get:
      tags:
        - Experiments
      summary: Get experiment submissions for a lesson
      security:
        - bearerAuth: []
        - sessionAuth: []
      parameters:
        - name: slug
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Submissions retrieved
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/ApiResponse'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: '#/components/schemas/ExperimentSubmission'
    post:
      tags:
        - Experiments
      summary: Submit experiment results for a lesson
      security:
        - bearerAuth: []
        - sessionAuth: []
      parameters:
        - name: slug
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                observations:
                  type: string
                results:
                  type: string
                photos:
                  type: array
                  items:
                    type: string
                    format: uri
              required:
                - observations
                - results
      responses:
        '201':
          description: Experiment submitted
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/ApiResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/ExperimentSubmission'

  /lessons/{slug}/quiz:
    get:
      tags:
        - Quizzes
      summary: Get quiz for a lesson
      security:
        - bearerAuth: []
        - sessionAuth: []
      parameters:
        - name: slug
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Quiz retrieved
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/ApiResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/Quiz'
    post:
      tags:
        - Quizzes
      summary: Submit quiz answers for a lesson
      security:
        - bearerAuth: []
        - sessionAuth: []
      parameters:
        - name: slug
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                answers:
                  type: array
                  items:
                    type: object
                    properties:
                      questionId:
                        type: string
                        format: uuid
                      answer:
                        type: string
              required:
                - answers
      responses:
        '201':
          description: Quiz submitted
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/ApiResponse'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/QuizSubmission'

  # Class-specific Lesson Progress (for teachers)
  /classes/{classId}/lessons/{slug}/completions:
    get:
      tags:
        - Classes
      summary: Get lesson completion status for students in a class
      security:
        - bearerAuth: []
        - sessionAuth: []
      parameters:
        - name: classId
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: slug
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Completions retrieved
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiResponse'

  /classes/{classId}/lessons/{slug}/scores:
    get:
      tags:
        - Classes
      summary: Get quiz scores for students in a class
      security:
        - bearerAuth: []
        - sessionAuth: []
      parameters:
        - name: classId
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: slug
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Scores retrieved
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiResponse'

# Security
security:
  - bearerAuth: []
  - sessionAuth: []

# Tags
tags:
  - name: Authentication
    description: User authentication and session management
  - name: Classes
    description: Class management and enrollment
  - name: Lessons
    description: Lesson content and progress tracking
  - name: Experiments
    description: Science experiment submissions and grading
  - name: Quizzes
    description: Quiz management and scoring
```
