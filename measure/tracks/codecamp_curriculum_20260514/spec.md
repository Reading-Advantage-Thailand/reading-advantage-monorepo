# Specification: codecamp-advantage Curriculum Implementation

## Overview

Replace the existing placeholder 5-module seed data in `packages/db/src/seed/codecamp-seed.ts` with the full 18-module, 85-lesson curriculum defined in `apps/codecamp-advantage/measure/curriculum/`. Wire the curriculum through the schema, domain functions, tRPC router, and UI so interns see phase-grouped modules with real lesson content.

## Context

The current seed has 5 modules (Next.js App Router, tRPC & Domain Functions, Drizzle ORM, Auth & Multi-Tenancy, Monorepo Patterns) that were scaffolding placeholders. They do not match the designed curriculum, which starts from fundamentals (dev environment, git, HTML/CSS) and progresses through 4 phases to cloud deployment.

The full curriculum specification lives in:
- `apps/codecamp-advantage/measure/curriculum/course-spec.md` — course overview, technology versions
- `apps/codecamp-advantage/measure/curriculum/unit-*-overview.md` — per-module learning objectives and conventions
- `apps/codecamp-advantage/measure/curriculum/unit-*-class-period-plan.md` — detailed lesson plans (what the student does each period)

## Scope

### In Scope
- Add `phase` column to `codecamp_modules` schema (values: "A", "B", "C", "D")
- Generate and apply migration for the new column
- Rewrite `packages/db/src/seed/codecamp-seed.ts` with all 18 modules and 85 lessons
- Each lesson gets real `contentJson` drawn from the class-period-plan files
- Each module gets 3–5 quiz questions
- Exercises get meaningful starter code, instructions, and hints
- Update domain functions to expose phase information
- Update dashboard UI to group modules by phase
- Add phase descriptions and portfolio project context to the UI
- Write tests for the new seed data and phase-grouped queries
- Add `codecampExerciseRepos` placeholder entries per module

### Out of Scope
- Creating actual GitHub exercise repositories (deferred to Phase 3 of the parent track)
- LLM PR review pipeline (Phase 3 of parent track)
- Admin dashboard (Phase 6 of parent track)
- Module 18 real-world practice issues (Phase 7 of parent track)
- Content rendering improvements (Phase 4 of parent track)
- Changing the schema for `contentJson` structure (use existing `jsonb`)

## Curriculum Data Model

### Modules (18 total)

| Order | Slug | Title | Phase | Lessons |
|-------|------|-------|-------|---------|
| 1 | dev-environment | Dev Environment Setup | A | 2 |
| 2 | git-github | Git & GitHub Fundamentals | A | 4 |
| 3 | html-css | HTML & CSS Crash Course | A | 6 |
| 4 | javascript | JavaScript Fundamentals | A | 8 |
| 5 | typescript | TypeScript | A | 5 |
| 6 | vitest | Testing with Vitest | A | 4 |
| 7 | react | React | B | 7 |
| 8 | api-fundamentals | API Fundamentals | B | 5 |
| 9 | nextjs-basics | Next.js 16 — Basics | B | 6 |
| 10 | nextjs-advanced | Next.js 16 — Advanced | B | 5 |
| 11 | databases-orms | Databases & ORMs | C | 5 |
| 12 | trpc-server-actions | tRPC & Server Actions | C | 5 |
| 13 | authentication | Authentication | C | 4 |
| 14 | internationalization | Internationalization | D | 3 |
| 15 | ai-integration | AI Integration | D | 5 |
| 16 | monorepo-packages | Monorepo & Package Management | D | 3 |
| 17 | cloud-docker | Cloud & Dockerization | D | 4 |
| 18 | real-world-practice | Real-World Practice | D | 4 |

### Lessons per Module

Each module follows the same lesson pattern from its class-period-plan:
- Theory lessons: `type: "theory"`, `contentJson: { sections: [{ heading, body, code }] }`
- Exercise lessons: `type: "exercise"`, `contentJson: { instructions }` + exercises table entry
- Quiz lessons: `type: "quiz"`, `contentJson: { instructions }` + quiz questions

The last lesson of each module is always a quiz. Modules with more than 3 periods have exercises in the middle periods.

### Content Source

The `contentJson` for each lesson is derived from the corresponding period in `unit-*-class-period-plan.md`. Each period's activities, code examples, and explanations become sections in the lesson content.

### Quiz Questions

3–5 questions per module, drawn from the quiz section at the end of each unit's class-period-plan.

### Exercises

1–2 exercises per module (where the plan specifies them), with:
- Title and instructions from the class-period-plan
- Starter code from the plan's activity code blocks
- Hints from the plan
- Expected output description

## Schema Changes

### `codecamp_modules` — add phase column

```typescript
// Add to existing codecampModules table
phase: text("phase").notNull().default("A"), // "A" | "B" | "C" | "D"
```

This column is used by `getModulesByPhase` (already exists in domain) and the dashboard UI for grouping.

No other schema changes needed — the existing `codecamp_lessons`, `codecamp_exercises`, `codecamp_quiz_questions`, and `codecamp_exercise_repos` tables are sufficient.

## Domain Function Changes

### Update `getModulesWithProgress`

Add `phase` to the returned module objects so the UI can group by phase.

### Update `getUserDashboard`

Group modules by phase in the response:
```typescript
{
  phases: {
    A: { title: "Foundations", description: "...", portfolioProject: "Personal Portfolio Website", modules: [...] },
    B: { title: "Frameworks", description: "...", portfolioProject: "Learning Dashboard", modules: [...] },
    C: { title: "Backend & Data", description: "...", portfolioProject: "Student Progress Tracker", modules: [...] },
    D: { title: "Production", description: "...", portfolioProject: "Production-Ready Tracker", modules: [...] },
  },
  totalLessons: 85,
  completedLessons: number,
  overallProgress: number,
}
```

### No new domain functions needed

`getModulesByPhase`, `checkModulePrerequisite`, `getModuleWithExercises` already exist.

## UI Changes

### Dashboard (`app/page.tsx`)

- Group module cards by phase with phase headers
- Show portfolio project name and description per phase
- Show phase progress (X/29 lessons in Phase A, etc.)
- Maintain existing progress bars and completion stats

### No changes to module detail page or lesson page

These already work with the existing data structure. The new seed data will make them display real content instead of placeholder JSON.

## Acceptance Criteria

- [ ] `codecamp_modules` has a `phase` column with migration applied
- [ ] `codecamp-seed.ts` seeds all 18 modules with correct slugs, phases, and orders
- [ ] All 85 lessons are seeded with real `contentJson` from the curriculum plans
- [ ] Every module has a quiz lesson with 3–5 questions
- [ ] Modules with exercises have proper exercise entries with starter code and hints
- [ ] `codecampExerciseRepos` has placeholder entries per module
- [ ] `getModulesWithProgress` returns phase information
- [ ] `getUserDashboard` returns phase-grouped data with portfolio project context
- [ ] Dashboard UI groups modules by phase (A/B/C/D) with phase headers
- [ ] Module detail page displays real lesson content (rendered from contentJson)
- [ ] Quizzes work end-to-end with the new question data
- [ ] `pnpm turbo run test --filter=@reading-advantage/domain` passes
- [ ] `pnpm turbo run test --filter=@reading-advantage/api` passes
- [ ] `pnpm turbo run build --filter=codecamp-advantage` passes
- [ ] Existing 5-module seed is completely replaced (no leftover data)
- [ ] All technology versions in lesson content match the monorepo (Node.js 20, React 19.2.5, Next.js 16.0.0, etc.)

## Dependencies

- Parent track `codecamp_advantage_20260513` must be at Phase 2+ complete (domain functions and tests exist)
- Phase 1 (schema extension) must be complete (exercise repos and PR reviews tables exist)
