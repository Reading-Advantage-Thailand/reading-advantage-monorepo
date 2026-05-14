# Unit 09 Overview: Next.js 16 — Basics

**Phase:** B (Frameworks)
**Periods:** 6
**Portfolio Project:** Learning Dashboard (Next.js migration)

## Learning Objectives

By the end of this unit, the intern can:

1. Understand the Next.js 16.0.0 App Router file conventions
2. Distinguish Server Components (default) from Client Components (`"use client"`)
3. Create pages, layouts, and loading/error states
4. Fetch data on the server with async Server Components
5. Use route parameters with dynamic segments (`[slug]`, `[id]`)
6. Navigate between pages with `<Link>` and `useRouter`

## Technologies & Versions

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.0.0 | React framework |
| React | 19.2.5 | UI library |
| App Router | (built-in) | File-based routing |

## Portfolio Connection

The intern migrates their Learning Dashboard from a React SPA (Vite) to Next.js 16.0.0:

- Vite `App.tsx` → Next.js `app/layout.tsx` + `app/page.tsx`
- React Router navigation → Next.js `<Link>` and file-based routing
- `useEffect` fetch → Server Component data fetching
- Client-only app → server-rendered with SEO and fast initial load

This mirrors the exact tech stack of codecamp-advantage and all Reading Advantage apps.

## Key Conventions

- **App Router** — `app/` directory, not `pages/`
- **Server Components by default** — only add `"use client"` when you need interactivity (useState, useEffect, event handlers)
- **`page.tsx`** — defines a route's UI
- **`layout.tsx`** — shared UI that wraps pages
- **`loading.tsx`** — automatic loading state (React Suspense)
- **`error.tsx`** — automatic error boundary
- **Dynamic segments** — `[slug]` in folder name → param in page props

## Prerequisites

- Units 01–08 complete (React, API Fundamentals)

## Assessment

- Exercise repo: Build a multi-page Next.js app with Server Component data fetching
- Quiz at the end of Period 6 (5 questions)
