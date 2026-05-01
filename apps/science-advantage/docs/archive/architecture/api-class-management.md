---
title: Class Management API Design
type: archive
status: deprecated
created_at: 2025-11-29
tags: [archive, architecture, api, class-management, endpoints]
description: Detailed design for the Class Management API endpoints and data flows.
---

# API Class Management

## Overview

The Class Management API provides endpoints for teachers and administrators to create, manage, and organize classes within the Science Advantage platform. This API includes join code generation for easy student enrollment.

## Base URL

```
/api/classes
```

## Authentication

All endpoints require authentication via NextAuth.js. Users must have the following roles:

- **TEACHER**: Can create and manage their own classes
- **ADMIN**: Can create and manage any classes
- **STUDENT**: Access denied to all class management endpoints

## Endpoints

### GET /api/classes

List classes for the authenticated user.

**Permissions**: TEACHER, ADMIN

**Query Parameters**:

- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of classes per page (default: 20, max: 100)

**Response**:

```json
{
  "success": true,
  "data": {
    "classes": [
      {
        "id": "class_123",
        "name": "Physics 101",
        "description": "Introduction to Physics",
        "joinCode": "ABC123",
        "studentCount": 25,
        "createdAt": "2025-01-06T12:00:00Z",
        "updatedAt": "2025-01-06T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### POST /api/classes

Create a new class.

**Permissions**: TEACHER, ADMIN

**Request Body**:

```json
{
  "name": "Physics 101",
  "description": "Introduction to Physics"
}
```

**Validation Rules**:

- `name`: Required, 1-100 characters
- `description`: Optional, max 500 characters

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "class_123",
    "name": "Physics 101",
    "description": "Introduction to Physics",
    "joinCode": "ABC123",
    "studentCount": 0,
    "createdAt": "2025-01-06T12:00:00Z",
    "updatedAt": "2025-01-06T12:00:00Z"
  }
}
```

### GET /api/classes/[classId]

Get details of a specific class.

**Permissions**: TEACHER (own classes), ADMIN (all classes)

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "class_123",
    "name": "Physics 101",
    "description": "Introduction to Physics",
    "joinCode": "ABC123",
    "teacher": {
      "id": "teacher_123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "enrollments": [
      {
        "id": "enrollment_123",
        "createdAt": "2025-01-06T12:00:00Z",
        "student": {
          "id": "student_123",
          "name": "Jane Smith",
          "email": "jane@example.com"
        }
      }
    ],
    "stats": {
      "studentCount": 1,
      "lessonCompletions": 5,
      "experimentSubmissions": 3
    },
    "createdAt": "2025-01-06T12:00:00Z",
    "updatedAt": "2025-01-06T12:00:00Z"
  }
}
```

### PUT /api/classes/[classId]

Update a specific class.

**Permissions**: TEACHER (own classes), ADMIN (all classes)

**Request Body**:

```json
{
  "name": "Advanced Physics",
  "description": "Updated description"
}
```

**Response**: Same as GET /api/classes/[classId]

### DELETE /api/classes/[classId]

Delete a specific class.

**Permissions**: TEACHER (own classes), ADMIN (all classes)

**Response**:

```json
{
  "success": true,
  "message": "Class deleted successfully"
}
```

## Join Code System

### Generation Algorithm

Join codes are generated using the following specifications:

- **Length**: 6 characters
- **Charset**: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (excludes similar characters: 0, O, 1, I, L)
- **Collision Handling**: Automatic retry with up to 10 attempts
- **Uniqueness**: Guaranteed unique across all classes

### Validation

Join codes are validated to ensure:

- Correct length (6 characters)
- Valid characters only
- Case-insensitive matching

### Future Enhancements

The schema supports future features:

- Join code expiry timestamps
- Join code rotation
- Active/inactive status for classes

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "statusCode": 400,
    "details": {}
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid input data
- `CONFLICT` (409): Resource already exists

## Rate Limiting

To prevent abuse, the following rate limits apply:

- Class creation: 10 classes per hour per teacher
- Join code generation: Built-in collision handling prevents abuse

## Audit Logging

All class management operations are logged for security and compliance:

- Class creation: `Class created: {classId} by user {userId}`
- Class updates: Logged via Prisma middleware
- Class deletion: `Class deleted: {classId} by user {userId}`

## Database Schema

### Class Model

```prisma
model Class {
  id          String            @id @default(cuid())
  name        String
  description String?
  joinCode    String            @unique
  teacher     User              @relation("ClassTeacher", fields: [teacherId], references: [id])
  teacherId   String
  enrollments ClassEnrollment[]
  lessonCompletions LessonCompletion[]
  experimentSubmissions ExperimentSubmission[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([teacherId])
  @@index([joinCode])
}
```

### Future Schema Enhancements

The following fields are planned for future releases:

```prisma
model Class {
  // ... existing fields ...
  joinCodeCreatedAt DateTime     @default(now())
  joinCodeExpiresAt DateTime?
  isActive    Boolean           @default(true)
}
```

## Integration Examples

### Creating a Class with JavaScript

```javascript
const response = await fetch('/api/classes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Chemistry 101',
    description: 'Introduction to Chemistry',
  }),
});

const result = await response.json();
if (result.success) {
  console.log('Class created with join code:', result.data.joinCode);
}
```

### Listing Classes with Pagination

```javascript
const response = await fetch('/api/classes?page=1&limit=10');
const result = await response.json();

if (result.success) {
  console.log(`Found ${result.data.pagination.total} classes`);
  result.data.classes.forEach((cls) => {
    console.log(`${cls.name} - ${cls.studentCount} students`);
  });
}
```

## Testing

### Unit Tests

- Join code generation algorithm
- Validation functions
- Collision handling

### Integration Tests

- API endpoint functionality
- Authentication and authorization
- Database operations
- Error handling

Run tests with:

```bash
npm test lib/join-code.test.ts          # Unit tests
npm run test:integration                # Integration tests
```

## Security Considerations

1. **Authentication**: All endpoints require valid NextAuth session
2. **Authorization**: Role-based access control enforced
3. **Input Validation**: Zod schemas validate all inputs
4. **SQL Injection**: Prisma ORM provides protection
5. **Rate Limiting**: Built-in collision handling prevents abuse
6. **Audit Trail**: All operations are logged

## Performance

- **Database Indexes**: Optimized queries on teacherId and joinCode
- **Pagination**: Prevents large result sets
- **Caching**: Consider Redis for frequently accessed class data
- **Connection Pooling**: Prisma manages database connections efficiently
