# Tech Stack

## Monorepo Orchestration

- **Package Manager:** pnpm (with `pnpm-workspace.yaml`)
- **Task Runner / Caching:** Turborepo (`turbo.json` pipeline)
- **Build System:** Next.js (per-app, various versions consolidated during migration)

## Core Technologies

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Language | TypeScript 5.x | All apps already use TS; unified `tsconfig.json` in shared config package |
| Frontend Framework | React 19 | Consolidated target (www-reading-advantage upgraded from React 18) |
| Meta-Framework | Next.js 15–16 | All apps are Next.js; independent app versions allowed during migration |
| Styling | Tailwind CSS 3–4 | All apps use Tailwind; unified config in shared package |
| UI Components | Radix UI + shadcn/ui | Common across all apps; extracted to `@reading-advantage/ui` |
| State Management | Zustand (games), React Query (others) | App-specific; not forced into shared layer |
| Animation | Framer Motion | Used by primary-advantage and games; available in shared UI |

## Backend & Data

| Technology | Usage |
|-----------|-------|
| Drizzle | Schema, migrations, queries (replaces Prisma in new backend) |
| tRPC | Primary product backend interface — typed procedures consumed by Next.js apps |
| Hono | External HTTP boundaries only — webhooks, health checks, legacy endpoints |
| Zod | Input validation on all tRPC procedures |
| PostgreSQL | Unified database (local Docker for dev, VPS for production) |
| JWT | Access + refresh token auth via tRPC middleware |
| Firebase Functions | reading-advantage (legacy, being deprecated) |
| AI SDK | Google + OpenAI providers across all apps |

## Testing

| Tool | Purpose |
|------|---------|
| Vitest | Unit tests (science-advantage, www-reading-advantage) |
| Jest | Unit tests (advantage-games, reading-advantage) |
| Playwright | E2E tests (all apps) |

## DevOps

| Tool | Purpose |
|------|---------|
| GitHub Actions | CI/CD pipelines |
| Vercel | Primary deployment target for Next.js apps |
| Firebase | reading-advantage functions deployment |

## Workspace Structure

```
reading-advantage-monorepo/
├── apps/
│   ├── advantage-games/
│   ├── science-advantage/
│   ├── reading-advantage/
│   ├── primary-advantage/
│   └── www-reading-advantage/
├── packages/
│   ├── api/              # tRPC routers (primary product backend)
│   ├── db/               # Drizzle schema, migrations, client
│   ├── domain/           # Business logic (domain functions)
│   ├── auth/             # Roles, permissions, tenant resolution
│   ├── auth-client/      # React hooks for auth (useAuth, useSession)
│   ├── webhooks/         # Hono app for external HTTP (Stripe, Google Classroom, etc.)
│   ├── types/            # Shared API contract types
│   ├── ui/               # Shared Radix/shadcn components
│   ├── utils/            # Shared utilities, hooks
│   ├── config/           # Shared eslint, tsconfig, tailwind configs
│   └── reading-advantage-scripts/  # Legacy scripts package
├── docker-compose.yml    # Local PostgreSQL
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```
