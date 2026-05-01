---
title: Frontend Architecture Overview
type: archive
status: deprecated
created_at: 2025-11-29
tags: [archive, architecture, frontend, react, nextjs]
description: Legacy overview of the frontend architecture, component hierarchy, and state management strategy.
---

# Frontend Architecture

## Component Architecture

Based on Next.js 15 with App Router and TypeScript, our frontend architecture emphasizes component reusability, type safety, and performance optimization.

### Component Organization

```
components/
├── ui/                          # Reusable UI primitives (shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   ├── textarea.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── tabs.tsx
│   ├── toast.tsx
│   └── index.ts
├── features/                    # Feature-specific components
│   ├── auth/
│   │   ├── sign-in-button.tsx
│   │   ├── sign-out-button.tsx
│   │   ├── dev-auth-panel.tsx
│   │   └── auth-guard.tsx
│   ├── dashboard/
│   │   ├── dashboard-layout.tsx
│   │   ├── class-card.tsx
│   │   ├── progress-chart.tsx
│   │   └── quick-actions.tsx
│   ├── lessons/
│   │   ├── lesson-viewer.tsx
│   │   ├── lesson-navigation.tsx
│   │   ├── content-renderer.tsx
│   │   ├── lesson-completion-toggle.tsx
│   │   └── lesson-progress.tsx
│   ├── experiments/
│   │   ├── experiment-simulator.tsx
│   │   ├── experiment-form.tsx
│   │   ├── experiment-results.tsx
│   │   ├── experiment-guide.tsx
│   │   └── data-visualization.tsx
│   └── classes/
│       ├── class-management.tsx
│       ├── student-roster.tsx
│       ├── class-analytics.tsx
│       └── join-class-form.tsx
├── layout/                      # Layout components
│   ├── app-layout.tsx
│   ├── dashboard-layout.tsx
│   ├── auth-layout.tsx
│   ├── navigation.tsx
│   ├── sidebar.tsx
│   ├── header.tsx
│   └── footer.tsx
└── common/                      # Common utility components
    ├── loading-spinner.tsx
    ├── error-boundary.tsx
    ├── not-found.tsx
    ├── seo-head.tsx
    └── theme-provider.tsx
```

### Component Template

```typescript
// components/features/lessons/lesson-viewer.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Lesson, LessonProgress } from '@/types';
import { lessonService } from '@/lib/services/lesson-service';
import { useAuth } from '@/hooks/use-auth';
import { LessonNavigation } from './lesson-navigation';
import { ContentRenderer } from './content-renderer';
import { LessonCompletionToggle } from './lesson-completion-toggle';

interface LessonViewerProps {
  lessonSlug: string;
  classId?: string;
}

export function LessonViewer({ lessonSlug, classId }: LessonViewerProps) {
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLesson() {
      try {
        setLoading(true);
        const [lessonData, progressData] = await Promise.all([
          lessonService.getLesson(lessonSlug),
          user ? lessonService.getLessonProgress(user.id, lessonSlug) : null
        ]);

        setLesson(lessonData);
        setProgress(progressData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lesson');
      } finally {
        setLoading(false);
      }
    }

    loadLesson();
  }, [lessonSlug, user?.id]);

  if (loading) {
    return <div>Loading lesson...</div>;
  }

  if (error || !lesson) {
    return <div>Error: {error || 'Lesson not found'}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <LessonNavigation
        lessonSlug={lessonSlug}
        classId={classId}
        progress={progress}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {lesson.title}
            {user && (
              <LessonCompletionToggle
                lessonId={lesson.id}
                isCompleted={progress?.status === 'COMPLETED'}
                onCompletionChange={(completed) => {
                  setProgress(prev => prev ? { ...prev, status: completed ? 'COMPLETED' : 'IN_PROGRESS' } : null);
                }}
              />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {progress && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{progress.completionPercentage}%</span>
              </div>
              <Progress value={progress.completionPercentage} />
            </div>
          )}

          <ContentRenderer content={lesson.content} />
        </CardContent>
      </Card>
    </div>
  );
}
```

## State Management Architecture

We use a hybrid approach combining React Context for global state, Zustand for complex state management, and React Query (TanStack Query) for server state.

### State Structure

```typescript
// stores/use-auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  signIn: (user: User) => void;
  signOut: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,

      signIn: (user) => set({ user, isLoading: false }),

      signOut: () => set({ user: null, isLoading: false }),

      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// stores/use-lesson-progress-store.ts
import { create } from 'zustand';
import { LessonProgress } from '@/types';

interface LessonProgressState {
  progress: Record<string, LessonProgress>;
  updateProgress: (lessonSlug: string, progress: LessonProgress) => void;
  getProgress: (lessonSlug: string) => LessonProgress | null;
  clearProgress: () => void;
}

export const useLessonProgressStore = create<LessonProgressState>(
  (set, get) => ({
    progress: {},

    updateProgress: (lessonSlug, progress) => {
      set((state) => ({
        progress: {
          ...state.progress,
          [lessonSlug]: progress,
        },
      }));
    },

    getProgress: (lessonSlug) => {
      return get().progress[lessonSlug] || null;
    },

    clearProgress: () => {
      set({ progress: {} });
    },
  })
);
```

### State Management Patterns

- **Global Auth State**: Zustand store with persistence for user authentication
- **Server State**: React Query for API data with caching and synchronization
- **Component State**: Local React state for UI-specific data
- **Form State**: React Hook Form for form handling and validation
- **URL State**: Next.js router for navigation and query parameters

## Routing Architecture

Next.js App Router provides file-based routing with support for layouts, loading states, and error boundaries.

### Route Organization

```
app/
├── (auth)/                      # Route group for auth pages
│   ├── signin/
│   │   └── page.tsx
│   └── layout.tsx
├── (dashboard)/                 # Route group for dashboard
│   ├── dashboard/
│   │   └── page.tsx
│   ├── classes/
│   │   ├── [classId]/
│   │   │   ├── page.tsx
│   │   │   ├── lessons/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx
│   │   │   ├── experiments/
│   │   │   │   └── page.tsx
│   │   │   └── students/
│   │   │       └── page.tsx
│   │   └── join/
│   │       └── page.tsx
│   ├── lessons/
│   │   └── [slug]/
│   │       └── page.tsx
│   └── layout.tsx
├── api/                         # API routes
│   ├── auth/
│   ├── classes/
│   ├── lessons/
│   └── experiments/
├── globals.css
├── layout.tsx                   # Root layout
└── page.tsx                     # Home page
```

### Protected Route Pattern

```typescript
// components/features/auth/auth-guard.tsx
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'STUDENT' | 'TEACHER' | 'ADMIN';
  fallbackPath?: string;
}

export function AuthGuard({
  children,
  requiredRole,
  fallbackPath = '/signin'
}: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push(fallbackPath);
        return;
      }

      if (requiredRole && user.role !== requiredRole) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [user, isLoading, requiredRole, fallbackPath, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user || (requiredRole && user.role !== requiredRole)) {
    return null;
  }

  return <>{children}</>;
}

// Usage in layout
// app/(dashboard)/layout.tsx
import { AuthGuard } from '@/components/features/auth/auth-guard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="dashboard-layout">
        {children}
      </div>
    </AuthGuard>
  );
}
```

## Frontend Services Layer

The services layer handles API communication, data transformation, and business logic on the frontend.

### API Client Setup

```typescript
// lib/api-client.ts
async function fetcher(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object.
    error.info = await response.json();
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export const apiClient = {
  get: (url: string) => fetcher(url),
  post: (url: string, data: any) => fetcher(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  put: (url: string, data: any) => fetcher(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  delete: (url: string) => fetcher(url, {
    method: 'DELETE',
  }),
};
```

### Service Example

```typescript
// lib/services/lesson-service.ts
import { apiClient } from '@/lib/api-client';
import { Lesson, LessonProgress, CreateLessonData } from '@/types';
import { queryClient } from '@/lib/react-query';

export class LessonService {
  async getLesson(slug: string): Promise<Lesson> {
    const response = await apiClient.get(`/lessons/${slug}`);
    return response.data.data;
  }

  async getLessons(filters?: {
    subject?: string;
    difficulty?: string;
    classId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ lessons: Lesson[]; total: number }> {
    const response = await apiClient.get('/lessons', { params: filters });
    return response.data.data;
  }

  async getLessonProgress(
    userId: string,
    lessonSlug: string
  ): Promise<LessonProgress | null> {
    try {
      const response = await apiClient.get(`/lessons/${lessonSlug}/progress`, {
        params: { userId },
      });
      return response.data.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async markLessonComplete(lessonSlug: string): Promise<LessonProgress> {
    const response = await apiClient.post(`/lessons/${lessonSlug}/complete`);

    // Invalidate related queries
    queryClient.invalidateQueries(['lesson-progress', lessonSlug]);
    queryClient.invalidateQueries(['user-progress']);

    return response.data.data;
  }

  async createLesson(data: CreateLessonData): Promise<Lesson> {
    const response = await apiClient.post('/lessons', data);

    // Invalidate lessons list
    queryClient.invalidateQueries(['lessons']);

    return response.data.data;
  }

  async updateLesson(
    slug: string,
    data: Partial<CreateLessonData>
  ): Promise<Lesson> {
    const response = await apiClient.put(`/lessons/${slug}`, data);

    // Invalidate related queries
    queryClient.invalidateQueries(['lesson', slug]);
    queryClient.invalidateQueries(['lessons']);

    return response.data.data;
  }
}

export const lessonService = new LessonService();
```

## Performance Optimization

### Code Splitting

```typescript
// Dynamic imports for heavy components
const ExperimentSimulator = dynamic(
  () => import('@/components/features/experiments/experiment-simulator'),
  {
    loading: () => <div>Loading simulator...</div>,
    ssr: false
  }
);

const DataVisualization = dynamic(
  () => import('@/components/features/experiments/data-visualization'),
  {
    loading: () => <div>Loading charts...</div>,
    ssr: false
  }
);
```

### Image Optimization

```typescript
// components/common/optimized-image.tsx
import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={`relative ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={`
          duration-700 ease-in-out
          ${isLoading ? 'scale-110 blur-2xl grayscale' : 'scale-100 blur-0 grayscale-0'}
        `}
        onLoadingComplete={() => setIsLoading(false)}
      />
    </div>
  );
}
```

## Frontend Architecture Decisions Rationale

1. **Next.js App Router**: Provides server-side rendering, file-based routing, and excellent performance out of the box
2. **TypeScript**: Ensures type safety across the entire frontend codebase
3. **Component-First Architecture**: Promotes reusability and maintainability
4. **Hybrid State Management**: Combines the best of different state management approaches for different use cases
5. **Service Layer Pattern**: Separates API logic from components, making testing and maintenance easier
6. **shadcn/ui Components**: Provides accessible, customizable UI components with excellent TypeScript support

## Educational Platform Specific Considerations

### Interactive Learning Components

Our frontend architecture is specifically designed to support complex educational interactions:

```typescript
// components/features/experiments/experiment-simulator.tsx
interface ExperimentSimulatorProps {
  experiment: Experiment;
  parameters: ExperimentParameters;
  onResults: (results: ExperimentResults) => void;
  onProgress: (progress: ExperimentProgress) => void;
}

export function ExperimentSimulator({
  experiment,
  parameters,
  onResults,
  onProgress
}: ExperimentSimulatorProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const handleStart = useCallback(() => {
    setIsRunning(true);
    // Experiment execution logic
  }, [experiment.id]);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>{experiment.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Interactive experiment UI */}
      </CardContent>
    </Card>
  );
}
```

### Progress Tracking and Analytics

```typescript
// hooks/use-learning-analytics.ts
export function useLearningAnalytics(userId: string) {
  return useQuery({
    queryKey: ['learning-analytics', userId],
    queryFn: () => analyticsService.getUserAnalytics(userId),
    select: (data) => ({
      totalLessonsCompleted: data.completedLessons.length,
      averageScore: calculateAverageScore(data.assessments),
      learningStreak: calculateLearningStreak(data.activity),
      subjectProgress: groupProgressBySubject(data.progress),
      timeSpentLearning: data.totalTimeSpent,
    }),
  });
}
```

### Accessibility for Educational Content

```typescript
// components/common/accessible-content.tsx
interface AccessibleContentProps {
  content: LessonContent;
  readingLevel?: 'elementary' | 'middle' | 'high' | 'college';
  language?: string;
}

export function AccessibleContent({
  content,
  readingLevel = 'middle',
  language = 'en'
}: AccessibleContentProps) {
  return (
    <div
      className="accessible-content"
      role="article"
      aria-label={`Lesson content: ${content.title}`}
      lang={language}
    >
      {/* Screen reader friendly content structure */}
      <h1>{content.title}</h1>
      {content.sections.map((section, index) => (
        <section key={index} aria-labelledby={`section-${index}`}>
          <h2 id={`section-${index}`}>{section.title}</h2>
          <div className="prose max-w-none">
            {section.content}
          </div>
        </section>
      ))}
    </div>
  );
}
```

### Real-time Collaboration Features

```typescript
// hooks/use-real-time-classroom.ts
export function useRealTimeClassroom(classId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineStudents, setOnlineStudents] = useState<User[]>([]);

  useEffect(() => {
    const newSocket = io(`/classroom/${classId}`);

    newSocket.on('student-joined', (student: User) => {
      setOnlineStudents((prev) => [...prev, student]);
    });

    newSocket.on('student-left', (studentId: string) => {
      setOnlineStudents((prev) => prev.filter((s) => s.id !== studentId));
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [classId]);

  return {
    socket,
    onlineStudents,
    broadcastMessage: (message: string) => socket?.emit('broadcast', message),
  };
}
```

## Testing Strategy for Frontend

### Component Testing

```typescript
// __tests__/components/features/lessons/lesson-viewer.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { LessonViewer } from '@/components/features/lessons/lesson-viewer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockLesson, mockUser } from '@/test-utils/mock-data';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('LessonViewer', () => {
  it('displays lesson content when loaded', async () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <LessonViewer lessonSlug="test-lesson" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(mockLesson.title)).toBeInTheDocument();
    });
  });

  it('shows completion toggle for authenticated users', async () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <LessonViewer lessonSlug="test-lesson" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark complete/i })).toBeInTheDocument();
    });
  });
});
```

### Integration Testing

```typescript
// __tests__/integration/lesson-flow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LessonFlow } from '@/components/features/lessons/lesson-flow';
import { setupMockServer } from '@/test-utils/mock-server';

const server = setupMockServer();

describe('Lesson Flow Integration', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('completes full lesson workflow', async () => {
    render(<LessonFlow lessonSlug="integration-test" />);

    // Start lesson
    fireEvent.click(screen.getByText('Start Lesson'));

    // Complete first section
    await waitFor(() => {
      expect(screen.getByText('Section 1 Complete')).toBeInTheDocument();
    });

    // Mark lesson complete
    fireEvent.click(screen.getByText('Mark Complete'));

    // Verify completion
    await waitFor(() => {
      expect(screen.getByText('Lesson Completed!')).toBeInTheDocument();
    });
  });
});
```

This frontend architecture provides a robust foundation for Science Advantage's educational platform, supporting complex interactive features, real-time collaboration, and comprehensive accessibility while maintaining excellent performance and developer experience.

## Forms Architecture

### Dynamic Form Generation with Zod

To ensure consistency, reduce boilerplate, and maintain a single source of truth for validation, forms should be dynamically generated from Zod schemas where possible.

**Pattern:**

1.  **Define a Zod Schema:** Create a schema that defines the data structure, validation rules, and metadata for a form.
2.  **Create a Form Component Factory:** A function or higher-order component that takes the Zod schema and generates the appropriate form fields (e.g., `Input`, `Select`, `Checkbox`).
3.  **Use with `react-hook-form`:** The same Zod schema is used as the validator for `react-hook-form` to handle client-side and server-side validation seamlessly.

**Example:**

```typescript
// lib/schemas/class-schema.ts
import { z } from 'zod';

export const classSchema = z.object({
  name: z.string().min(3, 'Class name must be at least 3 characters'),
  gradeLevel: z.number().min(1).max(12),
  description: z.string().optional(),
});

// components/features/classes/class-form.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { classSchema } from '@/lib/schemas/class-schema';
import { generateForm } from '@/components/ui/form-generator';

export function ClassForm({ onSubmit }) {
  const form = useForm({
    resolver: zodResolver(classSchema),
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {generateForm(classSchema, form)}
      <Button type="submit">Submit</Button>
    </form>
  );
}
```