---
title: Coding Standards & Conventions
type: archive
status: deprecated
created_at: 2025-11-29
tags: [archive, architecture, coding-standards, style-guide, best-practices]
description: Established coding standards, style guidelines, and best practices for the development team.
---

# Coding Standards

## Purpose

Minimal but critical standards for AI agents working on the Science Advantage platform. These rules prevent common mistakes and architectural violations.

## Critical Fullstack Rules

### Type Sharing Between Frontend and Backend

**RULE**: All shared types must be defined in `lib/types.ts` and imported from there.

```typescript
// ✅ CORRECT - Import shared types
import { User, Lesson, QuizSubmission } from '@/lib/types';

// ❌ FORBIDDEN - Duplicate type definitions
interface User {
  // Never redefine shared types
  id: string;
  name: string;
}
```

**Why**: Prevents type drift between frontend and backend, ensures consistency.

### API Call Patterns

**RULE**: Never use direct HTTP calls. Use the centralized API client from `lib/api.ts`.

```typescript
// ✅ CORRECT - Use centralized API client
import { apiClient } from '@/lib/api';

const user = await apiClient.get('/api/users/123');
const result = await apiClient.post('/api/lessons/complete', {
  lessonId: '123',
});

// ❌ FORBIDDEN - Direct HTTP calls
const response = await fetch('/api/users/123'); // Never do this
const data = await axios.get('/api/users/123'); // Never do this
```

**Why**: Centralizes error handling, auth, and response formatting.

### Environment Variable Access

**RULE**: Access environment variables only through `lib/env.ts`.

```typescript
// ✅ CORRECT - Use env helper
import { env } from '@/lib/env';

const dbUrl = env.DATABASE_URL;
const apiKey = env.OPENAI_API_KEY;

// ❌ FORBIDDEN - Direct process.env access
const dbUrl = process.env.DATABASE_URL; // Never do this
```

**Why**: Provides type safety and validation for environment variables.

### Error Handling Standards

**RULE**: All API routes must use standardized error responses.

```typescript
// ✅ CORRECT - Use error utilities
import { ApiError, handleApiError } from '@/lib/errors';

// In API routes
try {
  const result = await someOperation();
  return NextResponse.json({ success: true, data: result });
} catch (error) {
  return handleApiError(error);
}

// ❌ FORBIDDEN - Unstructured error responses
return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
```

**Why**: Consistent error format across all API endpoints.

## Naming Conventions

### File and Directory Names

- **Components**: PascalCase (`UserProfile.tsx`, `LessonCard.tsx`)
- **Utilities**: camelCase (`formatDate.ts`, `validateEmail.ts`)
- **Pages**: kebab-case (`lesson-viewer.tsx`, `dashboard-overview.tsx`)
- **API Routes**: kebab-case (`api/users/[id]/route.ts`)

### Variable and Function Names

```typescript
// ✅ CORRECT
const currentUser = await getCurrentUser();
const lessonProgress = calculateProgress(lessonId);
const isCompleted = checkCompletionStatus(submission);

// ❌ FORBIDDEN
const user = await getUser(); // Too generic
const prog = calcProg(id); // Abbreviations
const completed = check(sub); // Vague
```

### Database Schema Names

- **Tables**: snake_case (`lesson_submissions`, `user_progress`)
- **Columns**: snake_case (`created_at`, `lesson_id`)
- **Indexes**: `idx_table_column` (`idx_lessons_subject_id`)

## State Management Rules

### Frontend State

**RULE**: Use React hooks for local state, Zustand for global state.

```typescript
// ✅ CORRECT - Local state with hooks
const [isLoading, setIsLoading] = useState(false);

// ✅ CORRECT - Global state with Zustand
import { useAuthStore } from '@/stores/auth';
const { user, login } = useAuthStore();

// ❌ FORBIDDEN - Context for simple global state
const AuthContext = createContext(); // Use Zustand instead
```

### Server State

**RULE**: Server state must be synchronized with database state.

```typescript
// ✅ CORRECT - Single source of truth
const user = await prisma.user.findUnique({ where: { id } });
// Always read from database, never cache user data in memory

// ❌ FORBIDDEN - In-memory user state
let currentUser: User | null = null; // Never cache user data
```

## Database Access Patterns

### Prisma Usage

**RULE**: All database operations must use Prisma client from `lib/prisma.ts`.

```typescript
// ✅ CORRECT - Use centralized Prisma client
import { prisma } from '@/lib/prisma';

const user = await prisma.user.findUnique({ where: { id } });

// ❌ FORBIDDEN - Direct database connections
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient(); // Never create new instances
```

### Transaction Patterns

**RULE**: Use transactions for multi-table operations.

```typescript
// ✅ CORRECT - Transaction for related updates
const result = await prisma.$transaction(async (tx) => {
  const submission = await tx.quizSubmission.create({
    data: { userId, lessonId, score }
  })
  await tx.userProgress.update({
    where: { userId },
    data: { lastCompletedAt: new Date() }
  })
  return submission
})

// ❌ FORBIDDEN - Separate operations for related data
const submission = await prisma.quizSubmission.create(...)
await prisma.userProgress.update(...)  // Could fail, leaving inconsistent state
```

## Security Rules

### Input Validation

**RULE**: All API route handlers that accept a request body MUST use a Zod schema to validate the incoming data. Validation should happen before any business logic is executed.

```typescript
// ✅ CORRECT - Validate inputs at the start of an API route
import { z } from 'zod';

const lessonSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(10),
});

export async function POST(request: Request) {
  const body = await request.json();
  const validation = lessonSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(validation.error.errors, { status: 400 });
  }

  // Proceed with validated data
  const lesson = await prisma.lesson.create({
    data: validation.data,
  });

  return NextResponse.json(lesson);
}

// ❌ FORBIDDEN - Unvalidated inputs
export async function POST(request: Request) {
  const body = await request.json();
  // No validation!
  const lesson = await prisma.lesson.create({
    data: { title: body.title, content: body.content }, // Dangerous
  });
  return NextResponse.json(lesson);
}
```

### Authentication Checks

**RULE**: All protected routes must verify authentication.

```typescript
// ✅ CORRECT - Check authentication
import { getCurrentUser } from '@/lib/auth';

const user = await getCurrentUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// ❌ FORBIDDEN - Missing auth checks
export async function POST(request: Request) {
  const data = await request.json();
  // No authentication check - security vulnerability
}
```

## Import Organization

**RULE**: Imports must be organized in specific order.

```typescript
// 1. Next.js/React imports
import { NextResponse } from 'next/server';
import { useState } from 'react';

// 2. Third-party libraries
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// 3. Internal imports (absolute paths)
import { prisma } from '@/lib/prisma';
import { User } from '@/lib/types';
import { auth } from '@/lib/auth';

// 4. Relative imports (same directory)
import { helperFunction } from './utils';
```

## Testing Rules

### Test File Naming

- Unit tests: `*.test.ts` (same directory as source)
- Integration tests: `*.integration.test.ts` (in `tests/integration/`)
- E2E tests: `*.e2e.test.ts` (in `tests/e2e/`)

### Test Structure

```typescript
// ✅ CORRECT - Describe behavior, not implementation
describe('User Authentication', () => {
  it('should authenticate user with valid credentials', async () => {
    // Test implementation
  });
});

// ❌ FORBIDDEN - Implementation-focused tests
describe('Auth Service', () => {
  it('calls prisma.user.findUnique', async () => {
    // Testing implementation details
  });
});
```

## Performance Rules

### Database Queries

**RULE**: Never query for more data than needed.

```typescript
// ✅ CORRECT - Select only needed fields
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, name: true, email: true },
});

// ❌ FORBIDDEN - Querying entire objects
const user = await prisma.user.findUnique({ where: { id } }); // Returns all fields
```

### React Components

**RULE**: Use React.memo for components that re-render unnecessarily.

```typescript
// ✅ CORRECT - Memoize expensive components
export const LessonCard = React.memo(({ lesson }: { lesson: Lesson }) => {
  return <div>{lesson.title}</div>
})

// ❌ FORBIDDEN - Unnecessary re-renders
export const LessonCard = ({ lesson }: { lesson: Lesson }) => {
  return <div>{lesson.title}</div>
}
```

## Enforcement

These standards are enforced through:

1. **ESLint rules** - Automated linting in CI/CD
2. **TypeScript strict mode** - Type safety enforcement
3. **Code review checklist** - Manual verification
4. **AI agent instructions** - Built into development workflows

Violations of these critical rules will block pull requests and must be fixed before merging.
