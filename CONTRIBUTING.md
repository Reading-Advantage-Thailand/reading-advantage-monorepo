# Contributing

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v8+)
- [Docker](https://docs.docker.com/get-docker/) or [Podman](https://podman.io/) (for local PostgreSQL)

## First-Time Setup

```bash
# Clone and install
git clone <repo-url>
cd reading-advantage-monorepo
pnpm install

# Start local PostgreSQL (creates 3 databases)
pnpm db:start

# Copy environment files
cp apps/reading-advantage/.env.example apps/reading-advantage/.env.local
cp apps/primary-advantage/.env.example apps/primary-advantage/.env.local
cp apps/science-advantage/.env.example apps/science-advantage/.env.local

# Generate Prisma clients (temporary, migrating to Drizzle)
cd apps/reading-advantage && npx prisma generate && cd ../..
cd apps/primary-advantage && npx prisma generate && cd ../..
cd apps/science-advantage && npx prisma generate && cd ../..
```

## Daily Commands

```bash
# Start database (if not running)
pnpm db:start

# Start all apps in dev mode
pnpm dev

# Run for a single app
pnpm turbo run dev --filter=science-advantage

# Lint all packages
pnpm turbo run lint

# Test all packages
pnpm turbo run test

# Build all packages
pnpm turbo run build

# Type check all packages
pnpm turbo run check-types
```

## Database

```bash
pnpm db:start    # Start PostgreSQL (Docker)
pnpm db:stop     # Stop PostgreSQL
pnpm db:reset    # Destroy data and start fresh
```

Databases created automatically:
- `reading_advantage` — reading-advantage app
- `primary_advantage` — primary-advantage app
- `science_advantage` — science-advantage app

Connection string format: `postgresql://postgres:postgres@localhost:5432/<db_name>`

## Project Structure

```
├── apps/              # Next.js applications
│   ├── reading-advantage/
│   ├── primary-advantage/
│   ├── science-advantage/
│   ├── advantage-games/
│   └── www-reading-advantage/
├── packages/          # Shared packages
│   ├── api/           # tRPC backend (planned)
│   ├── db/            # Drizzle schema (planned)
│   ├── domain/        # Business logic (planned)
│   ├── auth/          # Auth middleware (planned)
│   ├── ui/            # Shared UI components
│   ├── utils/         # Shared utilities
│   └── config/        # Shared configs
├── docker-compose.yml # Local PostgreSQL
└── turbo.json         # Turborepo pipeline
```

## Turbo Caching

Turborepo caches task outputs locally. If a command seems stale:

```bash
pnpm turbo run build --force    # Skip cache
rm -rf .turbo                   # Clear local cache
```

## Tech Debt

Known issues tracked in `measure/tech-debt.md`. Key items:
- Primary-advantage has 49 ESLint errors (pre-existing)
- Mixed Jest/Vitest test runners (being normalized)
- Apps still use Prisma (migrating to Drizzle)

## Testing

**Rule: Every new domain function, tRPC router, or auth utility must ship with tests.**

- Use **Vitest** for all new packages (`packages/`)
- Use **Jest** only for legacy app code (reading-advantage, advantage-games)
- Place tests in `src/__tests__/` alongside source, named `*.test.ts`
- **Mock the DB layer** — unit tests must not require Docker/Postgres
- Use `vi.fn()` and helper factories (see `packages/domain/src/__tests__/mock-db.ts`)

Run tests:
```bash
pnpm turbo run test                        # all packages
pnpm turbo run test --filter=@reading-advantage/auth   # single package
```

CI will fail if any package with a `test` script exits non-zero.
