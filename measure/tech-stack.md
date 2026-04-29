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
| Prisma | science-advantage, reading-advantage, primary-advantage |
| Firebase Functions | reading-advantage (legacy Cloud Functions) |
| AI SDK | Google + OpenAI providers across all apps |
| NextAuth v5 | primary-advantage (auth may be extracted to shared package later) |

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
│   ├── ui/              # Shared Radix/shadcn components
│   ├── utils/           # Shared utilities, hooks, types
│   ├── config/          # Shared eslint, tsconfig, tailwind configs
│   └── ts-config/       # Base TypeScript configurations
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```
