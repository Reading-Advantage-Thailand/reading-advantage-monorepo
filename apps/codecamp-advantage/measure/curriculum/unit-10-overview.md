# Unit 10 Overview: Next.js 16 — Advanced

**Phase:** B (Frameworks)
**Periods:** 5
**Portfolio Project:** Learning Dashboard (polished)

## Learning Objectives

By the end of this unit, the intern can:

1. Create API Route Handlers (`app/api/.../route.ts`)
2. Implement Next.js middleware for auth checks and redirects
3. Build error boundaries and error recovery flows
4. Optimize performance with streaming and Suspense boundaries
5. Use `next/image` and `next/font` for optimized assets
6. Understand metadata and SEO with the Metadata API

## Technologies & Versions

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.0.0 | Framework (advanced features) |
| React | 19.2.5 | Suspense, streaming |

## Portfolio Connection

The intern polishes the Learning Dashboard with advanced Next.js patterns:

- API route handler for quiz submission (instead of calling json-server directly)
- Middleware to redirect unauthenticated users
- Streaming with Suspense boundaries for progressive loading
- Optimized images and fonts
- Proper metadata for SEO

This completes Phase B — the dashboard is production-quality for a learning tool.

## Key Concepts

- **Route Handlers**: Backend API endpoints in Next.js (`route.ts`)
- **Middleware**: Runs before a request completes — auth, redirects, headers
- **Streaming**: Send parts of the page as they're ready (Suspense boundaries)
- **Optimization**: `next/image` (lazy load, resize, WebP), `next/font` (no layout shift)

## Prerequisites

- Units 01–09 complete (Next.js basics)

## Assessment

- Exercise repo: Add API route handlers and streaming to a Next.js app
- Quiz at the end of Period 5 (5 questions)
