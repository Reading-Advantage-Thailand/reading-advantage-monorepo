# Course Specification: codecamp-advantage

## Course Title

Full-Stack Web Development Intern Bootcamp

## Target Audience

Interns (~1 year of a 2-year associate degree program) joining Reading Advantage. They have minimal exposure to HTML, Python, or C — likely no meaningful JavaScript, TypeScript, or React experience.

## Duration

- **85 class periods** (one per workday) over ~4 months
- 1+ hour per day
- Each class period is sized for a single sitting

## Portfolio Projects

Each phase has a portfolio project built incrementally across modules. By the end, interns have shipped four projects.

| Phase | Portfolio Project | Description |
|-------|-------------------|-------------|
| A | **Personal Portfolio Website** | Static HTML/CSS → JS interactivity → TypeScript → tests. A real personal site they can host. |
| B | **Learning Dashboard** | React SPA → external APIs → Next.js with SSR/SSG → advanced patterns. Mirrors the codecamp dashboard they use daily. |
| C | **Student Progress Tracker** | PostgreSQL → tRPC API with domain functions → auth with RBAC and multi-tenancy. Mirrors Reading Advantage's core domain. |
| D | **Production-Ready Tracker** | Same Phase C app, productionized — i18n, AI chat, monorepo packaging, Docker, deployment. |

Phases C and D are the **same application** — interns build it, then ship it.

## Technology Stack (Monorepo Versions)

All versions are pinned to match the Reading Advantage monorepo.

| Technology | Version | Notes |
|-----------|---------|-------|
| Node.js | 20 | LTS |
| pnpm | 8.15.8 | Monorepo package manager |
| TypeScript | 5.9.3 | Resolved from `^5.8.3` |
| Next.js | 16.0.0 | App Router, RSC |
| React | 19.2.5 | Root override pin |
| React DOM | 19.2.5 | Root override pin |
| tRPC (server/client/react-query) | 11.17.0 | Type-safe API layer |
| Drizzle ORM | 0.44.7 | Root override pin |
| drizzle-kit | 0.31.10 | Migration tool |
| PostgreSQL | 16 | Alpine Docker image |
| Zod | 3.25.76 | Schema validation |
| Vitest | 4.1.5 | Test framework (codecamp uses v4) |
| Tailwind CSS | 4.1.18 | Utility-first CSS |
| next-intl | 4.11.0 | Internationalization |
| AI SDK (`ai`) | 4.3.19 | LLM integration |
| @ai-sdk/openai | 1.3.24 | OpenAI provider |
| @ai-sdk/react | 1.2.12 | React hooks for AI |
| ESLint | 9.39.4 | Linting (modern apps) |
| Turborepo | 2.9.8 | Build orchestration |
| React Hook Form | 7.55.0 | Form management |
| Zustand | 5.0.3 | Client state management |

## Course Structure

### Phase A: Foundations — Personal Portfolio Website (29 periods)

| Unit | Module | Periods | Key Topics |
|------|--------|---------|-----------|
| 01 | Dev Environment Setup | 2 | VS Code, extensions, Node.js, pnpm, terminal |
| 02 | Git & GitHub Fundamentals | 4 | init/add/commit/push, branching, forking, PRs, Issues |
| 03 | HTML & CSS Crash Course | 6 | Semantic HTML, box model, Flexbox, Grid, responsive |
| 04 | JavaScript Fundamentals | 8 | Variables, functions, closures, DOM, async/await, Promises |
| 05 | TypeScript | 5 | Types, interfaces, generics, type narrowing, Zod |
| 06 | Testing with Vitest | 4 | Unit tests, mocking, assertions, coverage |

### Phase B: Frameworks — Learning Dashboard (23 periods)

| Unit | Module | Periods | Key Topics |
|------|--------|---------|-----------|
| 07 | React | 7 | Components, props, state, hooks, composition, lists/keys |
| 08 | API Fundamentals | 5 | HTTP, REST, Fetch, request/response, error handling, JSON |
| 09 | Next.js 16 — Basics | 6 | App Router, RSC, pages/layouts, data fetching, loading/error |
| 10 | Next.js 16 — Advanced | 5 | Route handlers, middleware, error boundaries, optimization, streaming |

### Phase C: Backend & Data — Student Progress Tracker (14 periods)

| Unit | Module | Periods | Key Topics |
|------|--------|---------|-----------|
| 11 | Databases & ORMs | 5 | PostgreSQL, Drizzle schema/queries/migrations, multi-tenant |
| 12 | tRPC & Server Actions | 5 | Type-safe API, thin routers / thick domain, Server Actions |
| 13 | Authentication | 4 | Cookie sessions, RBAC, assertCan(), multi-tenancy |

### Phase D: Production — Production-Ready Tracker (19 periods)

| Unit | Module | Periods | Key Topics |
|------|--------|---------|-----------|
| 14 | Internationalization | 3 | next-intl setup, message extraction, locale routing |
| 15 | AI Integration | 5 | Vercel AI SDK, streamText, generateObject, chat UI |
| 16 | Monorepo & Package Management | 3 | pnpm workspaces, Turborepo, shared packages |
| 17 | Cloud & Dockerization | 4 | Docker basics, containerize, Google Cloud, deployment |
| 18 | Real-World Practice | 4 | GitHub Issues, code review, feature delivery lifecycle |

## Prerequisites

- Module prerequisites enforced sequentially (must complete Unit N before Unit N+1)
- Within a module, periods are sequential
- No prior JavaScript/TypeScript/React experience required

## Key Pedagogical Features

- **Fork-based exercises**: Intern forks repo → completes on branch → opens PR → receives LLM code review
- **Architecture mirroring**: Phase C+D exercises use simplified but structurally faithful Reading Advantage patterns
- **AI chat tutor**: Conversational LLM interface, defaults to Thai, grounded in monorepo code
- **GitHub Issues practice**: Full issue → branch → PR → review → merge cycle (Unit 18)
- **Quizzes**: Multiple choice, immediate scoring with explanations, per module
- **Progress tracking**: Per-user across all modules, exercises, and quizzes

## Out of Scope

- No real-time collaborative editing
- No video content generation (text + interactive code only)
- No external LMS integration
- No mobile-native app (responsive web only)
- No AI-generated curriculum from live codebase (static curriculum with LLM tutoring)
- No automated code sandboxing/execution (LLM reviews code statically)
