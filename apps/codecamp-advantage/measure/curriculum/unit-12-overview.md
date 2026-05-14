# Unit 12 Overview: tRPC & Server Actions

**Phase:** C (Backend & Data)
**Periods:** 5
**Portfolio Project:** Student Progress Tracker (API layer)

## Learning Objectives

By the end of this unit, the intern can:

1. Understand the thin-router / thick-domain architecture pattern
2. Set up tRPC 11.17.0 in a Next.js application
3. Define tRPC routers with input validation (Zod)
4. Write domain functions that receive `{ db, user, tenant, input }`
5. Call `assertCan()` for permission checks before mutations
6. Use tRPC React hooks on the frontend (`useQuery`, `useMutation`)
7. Use Next.js Server Actions as an alternative to tRPC for simple mutations

## Technologies & Versions

| Technology | Version | Purpose |
|-----------|---------|---------|
| tRPC (server) | 11.17.0 | Type-safe API server |
| tRPC (client) | 11.17.0 | Type-safe API client |
| @trpc/react-query | 11.17.0 | React integration |
| @tanstack/react-query | 5.90.10 | Data fetching cache |
| Zod | 3.25.76 | Input validation |

## Portfolio Connection

The intern builds the API layer for their Student Progress Tracker:

- `modules` router — list modules, get module detail
- `progress` router — get student progress, update progress
- `quiz` router — submit quiz, get quiz results
- Domain functions with `assertCan()` permission checks
- Frontend consuming the API with tRPC React hooks

This directly mirrors `packages/api` and `packages/domain` in the Reading Advantage monorepo.

## Architecture Mirroring

The exact pattern from Reading Advantage:

```
Frontend (React)  →  tRPC Router (thin)  →  Domain Function (thick)  →  Drizzle  →  Postgres
"use client"          validates input         business logic              query         data
                      calls domain fn         assertCan() first
                      returns result          uses TenantDB
```

Key files in the monorepo:
- `packages/api/src/routers/*.ts` — thin tRPC routers
- `packages/domain/src/*/index.ts` — thick domain functions
- `packages/auth/src/permissions.ts` — assertCan()

## Prerequisites

- Units 01–11 complete (databases, Drizzle)

## Assessment

- Exercise repo: Build tRPC routers and domain functions for a blog API
- Quiz at the end of Period 5 (5 questions)
