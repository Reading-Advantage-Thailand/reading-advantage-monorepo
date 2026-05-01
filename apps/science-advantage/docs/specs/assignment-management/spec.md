---
title: Assignment Management Specification
type: spec
status: draft
created_at: 2025-11-29
tags: [spec, assignments, teacher-tools, scheduling, classroom-management]
description: Technical specification for the assignment management system, enabling teachers to create, schedule, and track curriculum assignments.
---

# Assignment Management Spec

## Capability Summary

Enable teachers to create, schedule, publish, and manage assignments that connect
curriculum content with classroom cohorts. Provide API support for teacher tools,
student dashboards, and reporting surfaces.

## Key References

- PRD Functional Requirements: FR8, FR12  
- PRD Epic 4 (Classroom Management) for downstream experiences
- API integration requirements from Foundation & Ecosystem Integration spec

## Functional Requirements

- **AM-FR1 (PRD FR12)**  
  Teachers can create assignments that link a class to a piece of curriculum
  content, including due date, optional description, and content type (lesson,
  quiz, experiment).

- **AM-FR2 (PRD FR8)**  
  Assignment status lifecycle must include draft, published, and cancelled states
  with audit history and timestamps. Only published assignments appear in student
  dashboards.

- **AM-FR3 (PRD FR8)**  
  System tracks per-student completion, submission timestamps, and grading metadata
  to feed progress analytics.

- **AM-FR4 (PRD FR6)**  
  All assignment create/update/delete events emit analytics signals for the unified
  ecosystem dashboard.

- **AM-FR5**  
  Prevent duplicate active assignments for the same class and content combination
  unless the earlier assignment is cancelled or archived.

## Non-Functional Requirements

- **AM-NFR1 (PRD NFR3)**  
  API endpoints must respond in <500 ms for p95 with pagination support for large
  cohorts.

- **AM-NFR2 (PRD NFR6)**  
  Assignment payloads must exclude PII beyond what is necessary for the intended
  consumer and follow encryption and access control policies.

## API Surface

| Endpoint                | Method | Description                                   | Roles            |
| ----------------------- | ------ | --------------------------------------------- | ---------------- |
| `/api/assignments`      | POST   | Create a draft or published assignment        | TEACHER, ADMIN   |
| `/api/assignments`      | GET    | List assignments filtered by class, status    | TEACHER, ADMIN   |
| `/api/assignments/:id`  | PATCH  | Update metadata or publish/cancel assignment  | TEACHER (owner), ADMIN |
| `/api/assignments/:id`  | GET    | Retrieve single assignment with progress data | TEACHER (owner), ADMIN |

Detailed request/response schemas should be maintained with the API contract
tests; key validation rules are outlined below.

## Validation Rules

- Title: required string, 1-200 chars. Description: optional, max 1000 chars.
- Due date: must be in the future when creating or publishing.
- Lesson/content reference: must resolve to an active curriculum asset.
- Publishing requires linked lesson to be in published state.
- Timezone: optional IANA identifier defaulting to tenant locale.
- Teacher must own the target class unless acting as admin.

## Scenarios

### Teacher Schedules Assignment
1. Teacher selects a lesson from the curriculum browser and chooses "Assign".
2. Teacher enters due date, optional notes, and chooses publish later.
3. Assignment is stored as `DRAFT`; notification is sent to the teacher of pending
   publish.
4. Teacher publishes; students receive notifications and see the assignment in their
   dashboards.

### Student Progress Tracking
1. Student submits completed work; submission service marks completion and emits
   progress event.
2. Assignment record updates `completionStatus` for the student with timestamp.
3. Teacher dashboard reflects completion counts and highlights overdue students.

## Open Questions

- Should assignments support differentiated due dates per student group at launch?
- Confirm whether grading rubric attachments must be part of the initial release.
        "title": "Complete Earth's Systems Overview",
        "description": "Read Lesson 1 and complete the quiz",
        "contentType": "LESSON",
        "status": "PUBLISHED",
        "dueDate": "2024-12-31T23:59:59.000Z",
        "timezone": "America/New_York",
        "publishedAt": "2024-01-15T10:00:00.000Z",
        "cancelledAt": null,
        "className": "NGSS Grade 6 - Unit 1",
        "lessonTitle": "Lesson 1: Earth's Systems Overview",
        "lessonType": "LESSON",
        "lessonPublished": true,
        "teacherName": "Taylor Morgan",
        "teacherEmail": "teacher.ngss@example.com",
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### 3. Get Assignment

**GET** `/api/assignments/:id`

Retrieves a specific assignment by ID.

#### Authorization

- **Required**: Yes
- **Roles**: TEACHER (own assignments only), ADMIN (all assignments)

#### Path Parameters

| Parameter | Type   | Description   |
| --------- | ------ | ------------- |
| id        | string | Assignment ID |

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "clxxxxx",
    "title": "Complete Earth's Systems Overview",
    "description": "Read Lesson 1 and complete the quiz",
    "contentType": "LESSON",
    "status": "PUBLISHED",
    "dueDate": "2024-12-31T23:59:59.000Z",
    "timezone": "America/New_York",
    "publishedAt": "2024-01-15T10:00:00.000Z",
    "cancelledAt": null,
    "class": {
      "id": "clxxxxx",
      "name": "NGSS Grade 6 - Unit 1"
    },
    "lesson": {
      "id": "clxxxxx",
      "title": "Lesson 1: Earth's Systems Overview",
      "type": "LESSON",
      "isPublished": true
    },
    "teacher": {
      "id": "clxxxxx",
      "name": "Taylor Morgan",
      "email": "teacher.ngss@example.com"
    },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

#### Error Responses

**404 Not Found** - Assignment not found

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Assignment not found"
  }
}
```

---

### 4. Update Assignment

**PUT** `/api/assignments/:id`

Updates an existing assignment.

#### Authorization

- **Required**: Yes
- **Roles**: TEACHER (own assignments only), ADMIN (all assignments)

#### Path Parameters

| Parameter | Type   | Description   |
| --------- | ------ | ------------- |
| id        | string | Assignment ID |

#### Request Body

All fields are optional. Only include fields you want to update.

```json
{
  "title": "Updated Assignment Title",
  "description": "Updated description",
  "dueDate": "2024-12-31T23:59:59Z",
  "timezone": "America/Los_Angeles",
  "status": "PUBLISHED"
}
```

#### Request Fields

| Field       | Type         | Required | Description                                    |
| ----------- | ------------ | -------- | ---------------------------------------------- |
| title       | string       | No       | Assignment title (min 1, max 200 chars)        |
| description | string       | No       | Assignment description (max 1000 chars)        |
| dueDate     | ISO datetime | No       | When the assignment is due                     |
| timezone    | string       | No       | Timezone for the due date (max 50 chars)       |
| status      | enum         | No       | Assignment status: DRAFT, PUBLISHED, CANCELLED |

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "clxxxxx",
    "title": "Updated Assignment Title",
    "description": "Updated description",
    "contentType": "LESSON",
    "status": "PUBLISHED",
    "dueDate": "2024-12-31T23:59:59.000Z",
    "timezone": "America/Los_Angeles",
    "publishedAt": "2024-01-15T12:00:00.000Z",
    "cancelledAt": null,
    "class": {
      "id": "clxxxxx",
      "name": "NGSS Grade 6 - Unit 1"
    },
    "lesson": {
      "id": "clxxxxx",
      "title": "Lesson 1: Earth's Systems Overview",
      "type": "LESSON",
      "isPublished": true
    },
    "teacher": {
      "id": "clxxxxx",
      "name": "Taylor Morgan",
      "email": "teacher.ngss@example.com"
    },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

#### Business Rules

- Cannot update cancelled assignments
- Cannot change status from PUBLISHED back to DRAFT
- Cannot publish assignment for unpublished lesson
- Due date must be in the future if updated
- publishedAt timestamp is set when status changes to PUBLISHED
- cancelledAt timestamp is set when status changes to CANCELLED

#### Status Transition Rules

| From      | To        | Allowed                     |
| --------- | --------- | --------------------------- |
| DRAFT     | DRAFT     | ✅                          |
| DRAFT     | PUBLISHED | ✅ (if lesson is published) |
| DRAFT     | CANCELLED | ✅                          |
| PUBLISHED | DRAFT     | ❌                          |
| PUBLISHED | PUBLISHED | ✅                          |
| PUBLISHED | CANCELLED | ✅                          |
| CANCELLED | \*        | ❌ (cannot update)          |

---

### 5. Delete Assignment

**DELETE** `/api/assignments/:id`

Deletes an assignment. Only DRAFT assignments can be deleted. PUBLISHED assignments should be cancelled instead.

#### Authorization

- **Required**: Yes
- **Roles**: TEACHER (own assignments only), ADMIN (all assignments)

#### Path Parameters

| Parameter | Type   | Description   |
| --------- | ------ | ------------- |
| id        | string | Assignment ID |

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Assignment deleted successfully"
}
```

#### Business Rules

- Only DRAFT assignments can be deleted
- PUBLISHED assignments must be cancelled instead (use PUT to change status to CANCELLED)
- Teachers can only delete their own assignments
- Admins can delete any assignment

#### Error Responses

**400 Bad Request** - Cannot delete published assignment

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cannot delete published assignments. Cancel them instead."
  }
}
```

---

## Data Models

### Assignment Status

- **DRAFT**: Assignment is being prepared and not visible to students
- **PUBLISHED**: Assignment is active and visible to students
- **CANCELLED**: Assignment has been cancelled and is no longer active

### Content Type

- **LESSON**: Regular lesson content
- **QUIZ**: Quiz or assessment
- **EXPERIMENT**: Lab or experiment activity

### Timestamps

- **createdAt**: When the assignment was created
- **updatedAt**: When the assignment was last modified
- **publishedAt**: When the assignment was published (null if not published)
- **cancelledAt**: When the assignment was cancelled (null if not cancelled)

---

## Examples

### Create a Draft Assignment

```bash
curl -X POST https://api.example.com/api/assignments \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "title": "Week 1 Assignment",
    "description": "Complete Lesson 1 and take the quiz",
    "classId": "clxxxxx",
    "lessonId": "clxxxxx",
    "dueDate": "2024-12-31T23:59:59Z",
    "status": "DRAFT"
  }'
```

### Publish a Draft Assignment

```bash
curl -X PUT https://api.example.com/api/assignments/clxxxxx \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "status": "PUBLISHED"
  }'
```

### List Published Assignments Due Soon

```bash
curl "https://api.example.com/api/assignments?status=PUBLISHED&sortBy=dueDate&sortOrder=asc&limit=5" \
  -H "Cookie: next-auth.session-token=..."
```

### Cancel an Assignment

```bash
curl -X PUT https://api.example.com/api/assignments/clxxxxx \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "status": "CANCELLED"
  }'
```

---

## Notes

- All dates are stored and returned in ISO 8601 format
- Timezone is stored separately to preserve the original intention
- Teachers can only manage assignments for their own classes
- Admins have full access to all assignments
- Assignment-lesson combinations must be unique per class (unless cancelled)
- Audit logs are emitted for create, update, and delete operations
