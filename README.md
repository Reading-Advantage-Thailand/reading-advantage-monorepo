# Reading Advantage Monorepo

[![CI](https://github.com/bodangren/reading-advantage-monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/bodangren/reading-advantage-monorepo/actions/workflows/ci.yml)

A pnpm + Turborepo monorepo for the Reading Advantage educational platform — three Next.js apps with a shared tRPC backend.

## Apps

| App | Description | Port |
|-----|-------------|------|
| `reading-advantage` | English reading comprehension platform | 3000 |
| `primary-advantage` | Primary school learning platform | 3000 |
| `science-advantage` | Science education platform | 3000 |
| `advantage-games` | Educational browser games | 3000 |
| `www-reading-advantage` | Marketing website | 3000 |

## Packages

| Package | Description |
|---------|-------------|
| `@reading-advantage/api` | tRPC routers — primary product backend |
| `@reading-advantage/db` | Drizzle schema, migrations, typed client |
| `@reading-advantage/auth` | Roles, permissions, JWT token service |
| `@reading-advantage/domain` | Business logic (domain functions) |
| `@reading-advantage/webhooks` | Hono app for external HTTP (Stripe, Google Classroom) |
| `@reading-advantage/types` | Shared Zod schemas and TypeScript types |
| `@reading-advantage/ui` | Shared Radix/shadcn UI components |
| `@reading-advantage/utils` | Shared utilities and hooks |
| `@reading-advantage/config` | Shared ESLint, TypeScript, Tailwind configs |

## Architecture

```
Next.js apps  →  tRPC procedures  →  domain functions  →  Drizzle  →  Postgres
External HTTP →  Hono routes      →  domain functions  →  Drizzle  →  Postgres
```

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 8+
- [Docker](https://docs.docker.com/get-docker/) (for local PostgreSQL)

## Getting Started

```bash
# Install dependencies
pnpm install

# Start local PostgreSQL (creates 3 databases)
pnpm db:start

# Copy environment files
cp apps/reading-advantage/.env.example apps/reading-advantage/.env.local
cp apps/primary-advantage/.env.example apps/primary-advantage/.env.local
cp apps/science-advantage/.env.example apps/science-advantage/.env.local

# Start all apps in dev mode
pnpm dev
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers via Turborepo |
| `pnpm build` | Build all packages and apps |
| `pnpm test` | Run tests in all workspaces |
| `pnpm lint` | Run ESLint in all workspaces |
| `pnpm format` | Format code with Prettier |
| `pnpm check-types` | Run TypeScript type checking |
| `pnpm db:start` | Start PostgreSQL (Docker) |
| `pnpm db:stop` | Stop PostgreSQL |
| `pnpm db:reset` | Destroy data and start fresh |

Run commands for a single app:

```bash
pnpm turbo run dev --filter=science-advantage
pnpm turbo run build --filter=@reading-advantage/db
```

## Database

Local PostgreSQL runs via Docker on port **5432** with three databases:

- `reading_advantage`
- `primary_advantage`
- `science_advantage`

Connection string: `postgresql://postgres:postgres@localhost:5432/<db_name>`

## Project Structure

```
├── apps/                        # Next.js applications
│   ├── reading-advantage/
│   ├── primary-advantage/
│   ├── science-advantage/
│   ├── advantage-games/
│   └── www-reading-advantage/
├── packages/                    # Shared packages
│   ├── api/                     # tRPC routers
│   ├── db/                      # Drizzle schema + migrations
│   ├── auth/                    # Roles, permissions, JWT
│   ├── domain/                  # Business logic
│   ├── webhooks/                # Hono external HTTP
│   ├── types/                   # Shared types
│   ├── ui/                      # Shared UI components
│   ├── utils/                   # Shared utilities
│   └── config/                  # Shared configs
├── docker-compose.yml           # Local PostgreSQL
├── docker/                      # Docker init scripts
├── measure/                     # Measure project management
├── CONTRIBUTING.md              # Developer setup guide
└── turbo.json                   # Turborepo pipeline
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed setup and development guide.
