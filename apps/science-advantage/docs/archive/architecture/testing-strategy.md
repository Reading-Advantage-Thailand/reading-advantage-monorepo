---
title: Testing Strategy
type: archive
status: deprecated
created_at: 2025-11-29
tags: [archive, architecture, testing, qa, strategy]
description: Outline of the testing strategy including unit, integration, and E2E testing approaches.
---

# Testing Strategy

## Overview

The Science Advantage platform implements a comprehensive testing strategy designed to ensure reliability, accuracy, and engaging user experiences across our educational ecosystem. Our approach emphasizes testing the unique aspects of virtual science experiments, AI-powered personalization, and progress tracking while maintaining high code quality and rapid development cycles.

## Testing Pyramid

```mermaid
graph TD
    A[E2E Tests<br/>Playwright<br/>Critical User Journeys] --> B[Integration Tests<br/>Vitest + Supertest<br/>API + Component Integration]
    B --> C[Unit Tests<br/>Vitest + React Testing Library<br/>Business Logic + Components]

    style A fill:#ff6b6b
    style B fill:#4ecdc4
    style C fill:#45b7d1

    A1["5-10 E2E Tests<br/>Virtual Experiments<br/>Assessment Flow<br/>Progress Tracking"] --> A
    B1["50-75 Integration Tests<br/>API Endpoints<br/>Component Integration<br/>Database Operations"] --> B
    C1["200+ Unit Tests<br/>Utilities<br/>Individual Components<br/>Business Logic"] --> C
```

### Test Distribution Strategy

- **Unit Tests (70%)**: Fast, isolated tests for business logic, utilities, and individual components
- **Integration Tests (25%)**: API endpoints, component integration, and database operations
- **E2E Tests (5%)**: Critical user journeys and cross-system workflows

## Test Organization

### Frontend Tests

#### Unit Tests with Vitest + React Testing Library

**Location**: `components/**/*.test.tsx`, `lib/**/*.test.ts`

**Focus Areas**:

- Component rendering and behavior
- User interactions and state changes
- Utility functions and business logic
- AI-powered feature components

**Example Component Test**:

```typescript
// components/features/lessons/VirtualExperiment.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VirtualExperiment } from "./VirtualExperiment";
import { ExperimentProvider } from "@/lib/experiment-context";

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ExperimentProvider>
        {component}
      </ExperimentProvider>
    </QueryClientProvider>
  );
};

describe("VirtualExperiment", () => {
  const mockExperiment = {
    id: "exp-chem-001",
    title: "Chemical Reactions Lab",
    type: "chemistry" as const,
    materials: ["beaker", "test-tube", "chemical-a", "chemical-b"],
    steps: [
      {
        id: "step-1",
        title: "Prepare Materials",
        instructions: "Add 50ml of Chemical A to the beaker",
        expectedOutcome: "Beaker contains Chemical A",
        validationRules: {
          requiredMaterials: ["beaker", "chemical-a"],
          measurements: { volume: 50 },
        },
      },
    ],
    aiAssistance: {
      enabled: true,
      hints: ["Check the measurement markings", "Pour slowly"],
      commonMistakes: ["overfilling", "wrong chemical"],
    },
  };

  it("renders experiment title and materials", () => {
    renderWithProviders(
      <VirtualExperiment experiment={mockExperiment} />
    );

    expect(screen.getByText("Chemical Reactions Lab")).toBeInTheDocument();
    expect(screen.getByText("beaker")).toBeInTheDocument();
    expect(screen.getByText("test-tube")).toBeInTheDocument();
  });

  it("tracks experiment progress correctly", async () => {
    renderWithProviders(
      <VirtualExperiment experiment={mockExperiment} />
    );

    const startButton = screen.getByText("Start Experiment");
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText("Step 1 of 1")).toBeInTheDocument();
    });

    // Simulate completing the step
    const completeButton = screen.getByText("Complete Step");
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByText("Experiment Completed!")).toBeInTheDocument();
    });
  });

  it("provides AI hints when user struggles", async () => {
    renderWithProviders(
      <VirtualExperiment experiment={mockExperiment} />
    );

    // Simulate user making mistakes
    const hintButton = screen.getByText("Get Hint");
    fireEvent.click(hintButton);

    await waitFor(() => {
      expect(screen.getByText("Check the measurement markings")).toBeInTheDocument();
    });
  });

  it("validates experiment outcomes correctly", async () => {
    renderWithProviders(
      <VirtualExperiment experiment={mockExperiment} />
    );

    // Complete experiment with correct measurements
    fireEvent.click(screen.getByText("Start Experiment"));

    // Simulate correct action
    const beaker = screen.getByTestId("beaker");
    fireEvent.drop(beaker, {
      dataTransfer: {
        getData: () => JSON.stringify({ type: "chemical-a", volume: 50 }),
      },
    });

    const validateButton = screen.getByText("Validate");
    fireEvent.click(validateButton);

    await waitFor(() => {
      expect(screen.getByText("✓ Correct!")).toBeInTheDocument();
    });
  });
});
```

#### Frontend Integration Tests

**Location**: `tests/integration/frontend/`

**Focus Areas**:

- Component integration with state management
- API integration with React Query
- Cross-component data flow
- Real-time features

**Example Integration Test**:

```typescript
// tests/integration/frontend/assessment-flow.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { rest } from "msw";
import { AssessmentFlow } from "@/components/features/lessons/AssessmentFlow";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const server = setupServer(
  rest.get("/api/lessons/:slug/assessment", (req, res, ctx) => {
    return res(
      ctx.json({
        questions: [
          {
            id: "q1",
            type: "multiple-choice",
            question: "What is the chemical formula for water?",
            options: ["H2O", "CO2", "O2", "N2"],
            correctAnswer: "H2O",
            points: 10,
          },
        ],
        timeLimit: 1800, // 30 minutes
        aiAdaptive: true,
      })
    );
  }),
  rest.post("/api/lessons/:slug/assessment/submit", (req, res, ctx) => {
    return res(
      ctx.json({
        score: 10,
        totalPoints: 10,
        feedback: {
          strengths: ["Correct understanding of water formula"],
          improvements: [],
          recommendations: ["Ready for advanced chemistry topics"],
        },
        aiAnalysis: {
          confidence: 0.95,
          suggestedNextTopic: "chemical-bonding",
          learningPathAdjustment: "accelerated",
        },
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("Assessment Flow Integration", () => {
  it("completes full assessment workflow with AI analysis", async () => {
    renderWithProviders(<AssessmentFlow lessonSlug="chemistry-basics" />);

    // Start assessment
    fireEvent.click(screen.getByText("Start Assessment"));

    await waitFor(() => {
      expect(screen.getByText("What is the chemical formula for water?")).toBeInTheDocument();
    });

    // Answer question
    fireEvent.click(screen.getByText("H2O"));
    fireEvent.click(screen.getByText("Next"));

    // Submit assessment
    fireEvent.click(screen.getByText("Submit Assessment"));

    await waitFor(() => {
      expect(screen.getByText("Score: 10/10")).toBeInTheDocument();
    });

    // Verify AI analysis is displayed
    expect(screen.getByText("Ready for advanced chemistry topics")).toBeInTheDocument();
    expect(screen.getByText("chemical-bonding")).toBeInTheDocument();
  });
});
```

### Backend Tests

#### Unit Tests with Vitest

**Location**: `lib/**/*.test.ts`, `app/api/**/*.test.ts`

**Focus Areas**:

- Business logic and utilities
- Data validation and transformation
- AI service integrations
- Progress tracking algorithms

**Example Backend Unit Test**:

```typescript
// lib/quiz.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateAdaptiveQuiz,
  validateAnswer,
  calculateProgress,
} from './quiz';
import { openai } from '@ai-sdk/openai';

// Mock OpenAI
vi.mock('@ai-sdk/openai', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

describe('Quiz System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateAdaptiveQuiz', () => {
    it('generates quiz based on student performance', async () => {
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    id: 'q1',
                    type: 'multiple-choice',
                    question: 'What is photosynthesis?',
                    difficulty: 'medium',
                    options: ['A', 'B', 'C', 'D'],
                    correctAnswer: 'A',
                  },
                ],
                adaptation: {
                  difficulty: 'medium',
                  focusArea: 'biology',
                  estimatedTime: 15,
                },
              }),
            },
          },
        ],
      };

      vi.mocked(openai.chat.completions.create).mockResolvedValue(
        mockAIResponse as any
      );

      const result = await generateAdaptiveQuiz({
        studentId: 'student-123',
        subject: 'biology',
        performanceHistory: [
          { topic: 'cells', score: 85, difficulty: 'medium' },
          { topic: 'ecosystems', score: 92, difficulty: 'hard' },
        ],
        timeAvailable: 30,
      });

      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].difficulty).toBe('medium');
      expect(result.adaptation.focusArea).toBe('biology');
    });

    it('adjusts difficulty based on performance', async () => {
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    id: 'q1',
                    difficulty: 'hard',
                    question: 'Complex biology question',
                  },
                ],
                adaptation: {
                  difficulty: 'hard',
                  reason: 'Student shows advanced understanding',
                },
              }),
            },
          },
        ],
      };

      vi.mocked(openai.chat.completions.create).mockResolvedValue(
        mockAIResponse as any
      );

      const result = await generateAdaptiveQuiz({
        studentId: 'student-123',
        subject: 'biology',
        performanceHistory: [
          { topic: 'cells', score: 98, difficulty: 'hard' },
          { topic: 'genetics', score: 95, difficulty: 'hard' },
        ],
        timeAvailable: 30,
      });

      expect(result.questions[0].difficulty).toBe('hard');
      expect(result.adaptation.reason).toContain('advanced understanding');
    });
  });

  describe('validateAnswer', () => {
    it('validifies multiple choice answers correctly', () => {
      const question = {
        type: 'multiple-choice' as const,
        correctAnswer: 'A',
        points: 10,
      };

      const result = validateAnswer(question, 'A');

      expect(result.isCorrect).toBe(true);
      expect(result.points).toBe(10);
      expect(result.feedback).toContain('Correct');
    });

    it('provides partial feedback for incorrect answers', () => {
      const question = {
        type: 'multiple-choice' as const,
        correctAnswer: 'A',
        points: 10,
        explanation: 'Photosynthesis is the process...',
      };

      const result = validateAnswer(question, 'B');

      expect(result.isCorrect).toBe(false);
      expect(result.points).toBe(0);
      expect(result.feedback).toContain('Not quite');
      expect(result.explanation).toBe('Photosynthesis is the process...');
    });
  });

  describe('calculateProgress', () => {
    it('calculates learning progress accurately', () => {
      const studentProgress = {
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
        totalLessons: 10,
        assessmentScores: [85, 92, 78],
        experimentScores: [90, 85],
        timeSpent: 180, // minutes
      };

      const progress = calculateProgress(studentProgress);

      expect(progress.lessonCompletion).toBe(30); // 3/10 * 100
      expect(progress.averageAssessmentScore).toBe(85); // (85+92+78)/3
      expect(progress.averageExperimentScore).toBe(87.5); // (90+85)/2
      expect(progress.overallProgress).toBeGreaterThan(0);
    });
  });
});
```

#### Backend Integration Tests

**Location**: `tests/integration/backend/`

**Focus Areas**:

- API endpoint functionality
- Database operations
- Third-party service integrations
- Authentication and authorization

**Example API Integration Test**:

```typescript
// tests/integration/backend/lesson-progress.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { app } from '@/app';
import { prisma } from '@/lib/prisma';
import {
  createTestUser,
  createTestLesson,
  authenticateTestUser,
} from '../helpers';

describe('Lesson Progress API', () => {
  let testUser: any;
  let testLesson: any;
  let authToken: string;

  beforeEach(async () => {
    // Setup test data
    testUser = await createTestUser({
      email: 'student@test.com',
      role: 'STUDENT',
    });

    testLesson = await createTestLesson({
      title: 'Test Biology Lesson',
      subject: 'biology',
      difficulty: 'medium',
    });

    authToken = await authenticateTestUser(testUser);
  });

  afterEach(async () => {
    // Cleanup test data
    await prisma.progress.deleteMany({
      where: { studentId: testUser.id },
    });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.lesson.delete({ where: { id: testLesson.id } });
  });

  it('tracks lesson completion progress', async () => {
    const response = await app.request(
      `/api/lessons/${testLesson.id}/progress`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          step: 'video',
          completed: true,
          timeSpent: 300, // 5 minutes
        }),
      }
    );

    expect(response.status).toBe(200);

    const progress = await response.json();
    expect(progress.step).toBe('video');
    expect(progress.completed).toBe(true);
    expect(progress.timeSpent).toBe(300);

    // Verify database state
    const dbProgress = await prisma.progress.findFirst({
      where: {
        studentId: testUser.id,
        lessonId: testLesson.id,
      },
    });

    expect(dbProgress).toBeTruthy();
    expect(dbProgress?.step).toBe('video');
  });

  it('calculates overall lesson progress', async () => {
    // Complete multiple steps
    const steps = [
      { step: 'video', completed: true, timeSpent: 300 },
      { step: 'reading', completed: true, timeSpent: 600 },
      { step: 'experiment', completed: true, timeSpent: 900 },
    ];

    for (const stepData of steps) {
      await app.request(`/api/lessons/${testLesson.id}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(stepData),
      });
    }

    const response = await app.request(
      `/api/lessons/${testLesson.id}/progress`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status).toBe(200);

    const progressData = await response.json();
    expect(progressData.overallProgress).toBe(100);
    expect(progressData.totalTimeSpent).toBe(1800); // 30 minutes
    expect(progressData.completedSteps).toHaveLength(3);
  });
});
```

### E2E Tests with Playwright

**Location**: `tests/e2e/`

**Focus Areas**:

- Critical user journeys
- Cross-browser compatibility
- Real-time collaboration features
- Virtual experiment workflows

**Example E2E Test**:

```typescript
// tests/e2e/virtual-experiment-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Virtual Experiment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as student
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', 'student@test.com');
    await page.fill('input[name="password"]', 'test-password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('completes virtual chemistry experiment', async ({ page }) => {
    // Navigate to lesson
    await page.click('text=Chemistry Basics');
    await page.click('text=Start Virtual Experiment');

    // Verify experiment loads
    await expect(page.locator('h1')).toContainText('Chemical Reactions Lab');
    await expect(
      page.locator('[data-testid="experiment-workspace"]')
    ).toBeVisible();

    // Start experiment
    await page.click('button:has-text("Start Experiment")');

    // Step 1: Prepare materials
    await expect(page.locator('text=Step 1 of 3')).toBeVisible();
    await expect(page.locator('text=Prepare Materials')).toBeVisible();

    // Drag and drop beaker
    await page.dragAndDrop('#beaker-inventory', '#experiment-area');

    // Add chemical
    await page.click('#chemical-a');
    await page.click('#add-to-beaker');

    // Verify measurement
    await expect(page.locator('#beaker-volume')).toContainText('50ml');

    // Complete step
    await page.click('button:has-text("Complete Step")');

    // Step 2: Mix chemicals
    await expect(page.locator('text=Step 2 of 3')).toBeVisible();
    await page.dragAndDrop('#chemical-b', '#beaker');
    await page.click('#stir-button');

    // Observe reaction animation
    await expect(page.locator('#reaction-animation')).toBeVisible();
    await page.waitForTimeout(2000); // Wait for animation

    // Complete step
    await page.click('button:has-text("Complete Step")');

    // Step 3: Record observations
    await expect(page.locator('text=Step 3 of 3')).toBeVisible();
    await page.fill(
      '#observations',
      'The solution turned blue and bubbles formed'
    );
    await page.click('button:has-text("Complete Step")');

    // Verify completion
    await expect(page.locator('text=Experiment Completed!')).toBeVisible();
    await expect(page.locator('text=Score: 100/100')).toBeVisible();

    // Check AI feedback
    await expect(page.locator('text=Excellent work!')).toBeVisible();
    await expect(
      page.locator('text=You correctly followed all safety protocols')
    ).toBeVisible();

    // Navigate to dashboard
    await page.click('button:has-text("Back to Dashboard")');

    // Verify progress updated
    await expect(
      page.locator(`text=Chemical Reactions Lab - Completed`)
    ).toBeVisible();
  });

  test('uses AI assistance during experiment', async ({ page }) => {
    await page.goto('/lessons/chemistry-basics/experiment');
    await page.click('button:has-text("Start Experiment")');

    // Make a mistake (wrong measurement)
    await page.dragAndDrop('#beaker-inventory', '#experiment-area');
    await page.click('#chemical-a');
    await page.click('#add-chemical-excess'); // Add too much

    // Wait for AI hint
    await expect(page.locator('.ai-hint')).toBeVisible();
    await expect(page.locator("text=That's too much chemical")).toBeVisible();
    await expect(page.locator('text=Try adding exactly 50ml')).toBeVisible();

    // Accept hint
    await page.click('button:has-text("Apply Suggestion")');

    // Verify correction
    await expect(page.locator('#beaker-volume')).toContainText('50ml');
  });

  test('handles experiment timeout gracefully', async ({ page }) => {
    // Start experiment with time limit
    await page.goto('/lessons/chemistry-basics/experiment');
    await page.click('button:has-text("Start Experiment")');

    // Wait for timeout (simulate with fast-forward)
    await page.evaluate(() => {
      // Simulate time passing
      const timer = document.querySelector('#experiment-timer');
      if (timer) {
        timer.textContent = '00:00';
        timer.dispatchEvent(new Event('timeout'));
      }
    });

    // Verify timeout handling
    await expect(page.locator("text=Time's Up!")).toBeVisible();
    await expect(
      page.locator('text=Your progress has been saved')
    ).toBeVisible();
    await expect(
      page.locator('button:has-text("Resume Experiment")')
    ).toBeVisible();
  });
});
```

## Testing Configuration

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        'coverage/',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Test Data Management

### Test Database Setup

```typescript
// tests/helpers/database.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const testDatabase = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://test:test@localhost:5432/science_advantage_test',
    },
  },
});

export const setupTestDatabase = async () => {
  // Reset database
  await testDatabase.$executeRaw`TRUNCATE TABLE users, lessons, progress, assessments, experiment_results CASCADE`;

  // Seed test data
  await seedTestData();
};

export const teardownTestDatabase = async () => {
  await testDatabase.$disconnect();
};

const seedTestData = async () => {
  // Create test users, lessons, etc.
  await testDatabase.user.createMany({
    data: [
      {
        id: 'test-student-1',
        email: 'student@test.com',
        name: 'Test Student',
        role: 'STUDENT',
      },
      {
        id: 'test-teacher-1',
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'TEACHER',
      },
    ],
  });
};
```

### Mock Services

```typescript
// tests/mocks/ai-service.ts
import { vi } from 'vitest';

export const mockAIService = {
  generatePersonalizedContent: vi.fn(),
  analyzeStudentPerformance: vi.fn(),
  provideExperimentHints: vi.fn(),
  adaptDifficulty: vi.fn(),
};

// Setup mocks
vi.mock('@/lib/ai-service', () => ({
  aiService: mockAIService,
}));

export const setupMockAIResponses = () => {
  mockAIService.generatePersonalizedContent.mockResolvedValue({
    content: 'Personalized learning content',
    difficulty: 'medium',
    estimatedTime: 15,
  });

  mockAIService.analyzeStudentPerformance.mockResolvedValue({
    strengths: ['problem-solving', 'critical-thinking'],
    improvements: ['attention-to-detail'],
    recommendations: ['advanced-topics'],
  });
};
```

## Continuous Integration

### GitHub Actions Test Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup test database
        run: |
          docker-compose -f docker-compose.test.yml up -d postgres
          sleep 5
          npm run db:migrate:test

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup test environment
        run: |
          docker-compose -f docker-compose.test.yml up -d
          sleep 10
          npm run db:migrate:test

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/science_advantage_test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Testing Best Practices

### 1. Test Naming Conventions

- **Unit Tests**: `describe("ComponentName", () => { it("should do X", () => {}) })`
- **Integration Tests**: `describe("Feature Integration", () => { it("integrates X and Y", () => {}) })`
- **E2E Tests**: `test.describe("User Journey", () => { test("completes workflow", () => {}) })`

### 2. Test Data Strategies

- **Factory Pattern**: Use factories for creating test data
- **Fixtures**: Reusable test setup with `beforeEach`/`afterEach`
- **Isolation**: Each test should be independent and not rely on other tests

### 3. Mocking Strategy

- **External Services**: Mock all external API calls (OpenAI, Google Cloud, etc.)
- **Database**: Use test database for integration tests, in-memory for unit tests
- **Time**: Mock time-dependent functionality for consistent tests

### 4. Coverage Requirements

- **Critical Paths**: 100% coverage for user authentication, progress tracking
- **Business Logic**: 90% coverage for quiz generation, AI interactions
- **UI Components**: 80% coverage for interactive components
- **Utilities**: 95% coverage for helper functions

### 5. Performance Testing

- **Load Testing**: API endpoints under simulated user load
- **Rendering Performance**: Component render times with React DevTools
- **Bundle Size**: Monitor bundle size impact of new features

## Quality Gates

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test:unit"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "vitest related --run"],
    "*.{css,md}": ["prettier --write"]
  }
}
```

### Deployment Requirements

- All tests must pass (unit, integration, E2E)
- Coverage thresholds must be met
- No security vulnerabilities in dependencies
- Performance budgets must be maintained
- Accessibility tests must pass

This comprehensive testing strategy ensures the Science Advantage platform delivers reliable, engaging, and effective educational experiences while maintaining high code quality and rapid development cycles.
