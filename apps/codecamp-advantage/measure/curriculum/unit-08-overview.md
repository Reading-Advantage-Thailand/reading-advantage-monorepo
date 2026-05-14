# Unit 08 Overview: API Fundamentals

**Phase:** B (Frameworks)
**Periods:** 5
**Portfolio Project:** Learning Dashboard (API integration)

## Learning Objectives

By the end of this unit, the intern can:

1. Explain HTTP methods (GET, POST, PUT, PATCH, DELETE) and their semantics
2. Understand request/response structure (headers, body, status codes)
3. Use the Fetch API to make all types of HTTP requests
4. Handle HTTP errors and network failures gracefully
5. Parse and construct JSON payloads
6. Implement loading, success, and error states for API calls
7. Understand REST conventions and URL patterns

## Technologies & Versions

| Technology | Version | Purpose |
|-----------|---------|---------|
| Fetch API | Native (ES2024) | HTTP client |
| JSON | — | Data interchange format |
| json-server | Latest | Mock REST API for development |

## Portfolio Connection

The intern connects their Learning Dashboard to a mock REST API:

- Fetch module list from `GET /api/modules`
- Fetch module detail from `GET /api/modules/:id`
- Submit quiz answers to `POST /api/quizzes/:id/submit`
- Update progress with `PATCH /api/progress/:id`
- Handle loading, error, and empty states throughout

## Key Concepts

- **REST**: REpresentational State Transfer — a convention for structuring APIs
- **Resources**: Nouns in URLs (`/modules`, `/lessons`, `/users`)
- **Methods**: Verbs as HTTP methods (GET = read, POST = create, PUT = replace, PATCH = update, DELETE = remove)
- **Status codes**: 200s = success, 400s = client error, 500s = server error
- **JSON**: The standard data format for APIs

## Prerequisites

- Units 01–07 complete (JavaScript, TypeScript, React)

## Assessment

- Exercise repo: Build a CRUD client against a mock API
- Quiz at the end of Period 5 (5 questions)
