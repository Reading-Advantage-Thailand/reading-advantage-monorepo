# Reading Advantage Monorepo

A pnpm + Turborepo monorepo for the Reading Advantage ecosystem.

## Structure

```
.
├── apps/
│   └── advantage-games/     # Next.js 15 game platform
├── packages/
│   ├── config/              # Shared ESLint, TypeScript, Tailwind configs
│   ├── ui/                  # Shared React components (Radix + Tailwind)
│   └── utils/               # Shared utilities (cn, hooks)
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 8+

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server (runs all packages in parallel)
pnpm dev

# Build all packages and apps
pnpm build

# Run tests across all workspaces
pnpm test

# Run lint across all workspaces
pnpm lint
```

## Workspace Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers via Turborepo |
| `pnpm build` | Build all packages and apps |
| `pnpm test` | Run tests in all workspaces |
| `pnpm lint` | Run ESLint in all workspaces |
| `pnpm format` | Format code with Prettier |
| `pnpm check-types` | Run TypeScript type checking |

## Technology Stack

- **Package Manager**: pnpm workspaces
- **Build Orchestration**: Turborepo
- **App Framework**: Next.js 15 (App Router, React 19)
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI primitives
- **Testing**: Vitest (packages), Jest (app)
- **Linting**: ESLint 9 (flat config)

## Adding a New Package

1. Create a directory under `packages/<name>`
2. Add `package.json` with `"name": "@reading-advantage/<name>"`
3. Add build/test/lint scripts
4. Export from `src/index.ts`
5. Run `pnpm install` to link the workspace

## Adding a New App

1. Create a directory under `apps/<name>`
2. Add `package.json` with workspace dependencies using `"workspace:*"`
3. Configure `tsconfig.json` to extend `@reading-advantage/config/tsconfig`
4. Run `pnpm install` to link the workspace
