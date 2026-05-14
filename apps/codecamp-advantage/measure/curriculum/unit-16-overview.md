# Unit 16 Overview: Monorepo & Package Management

**Phase:** D (Production)
**Periods:** 3
**Portfolio Project:** Student Progress Tracker (monorepo understanding)

## Learning Objectives

By the end of this unit, the intern can:

1. Explain pnpm workspace configuration and dependency resolution
2. Understand the Turborepo 2.9.8 pipeline and task dependencies
3. Navigate the Reading Advantage monorepo's package structure
4. Understand how shared packages (`@reading-advantage/db`, `@reading-advantage/ui`, etc.) are wired
5. Follow the dependency order: `db → auth → types → domain → api / webhooks`

## Technologies & Versions

| Technology | Version | Purpose |
|-----------|---------|---------|
| pnpm | 8.15.8 | Workspace package manager |
| Turborepo | 2.9.8 | Build orchestration |

## Portfolio Connection

This unit is different — the intern doesn't add features to the tracker. Instead, they study the Reading Advantage monorepo structure and understand how their tracker app fits into the larger architecture. The "exercise" is exploratory: they map the dependency graph and explain how changes propagate.

## Key Concepts

- **Workspaces**: pnpm manages multiple packages in one repo, sharing dependencies
- **Pipeline**: Turborepo runs tasks in topological order (dependencies built first)
- **`workspace:*`**: Symlink to a local package — changes are instantly available
- **Dependency order**: Strict — `db` never imports from `domain`, `domain` never imports from `api`

## Prerequisites

- Units 01–15 complete (AI Integration)

## Assessment

- Written exercise: Map the Reading Advantage monorepo's dependency graph
- Quiz at the end of Period 3 (5 questions)
