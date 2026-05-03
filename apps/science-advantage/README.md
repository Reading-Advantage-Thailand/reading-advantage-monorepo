# Science Advantage

Science Advantage is the K-12 science learning experience for the Advantage
ecosystem. This repository houses the Next.js application, Prisma schema, and the
spec-first documentation that guides product development.

## Quick Links

- Product Brief: `docs/project-brief.md`
- Product Requirements (PRD): `docs/prd.md`
- Capability Specs: `docs/specs/`
- Sprint Plans: `docs/sprint/`
- Migration Status: `docs/MIGRATION-REPORT.md`
- Workflow Guide: `CLAUDE.md`

## Getting Started

```bash
git clone https://github.com/your-org/science-advantage.git
cd science-advantage
npm install
```

### Database Setup

#### Option 1: Docker PostgreSQL (Recommended for Development)

Start the PostgreSQL container using Docker Compose:

```bash
docker-compose up -d
```

The container runs PostgreSQL 16 with the following configuration:
- **Host**: `localhost`
- **Port**: `5433` (mapped from container's 5432)
- **Database**: `science_advantage`
- **User**: `postgres`
- **Password**: `postgres`

Update your `.env.local` with the Docker database URL:

```bash
cp .env.example .env.local
```

Then set the `DATABASE_URL` in `.env.local`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/science_advantage?schema=public"
```

Verify the database is running:

```bash
docker ps | grep science-advantage-postgres
```

#### Option 2: External PostgreSQL

If using an external PostgreSQL instance, update the `DATABASE_URL` in `.env.local` with your connection string and ensure the database exists.

### Environment Configuration

Complete the `.env.local` file with remaining credentials:

```bash
# Redis (optional, falls back to in-memory)
REDIS_URL="redis://localhost:6379"

# OpenAI (for AI features)
OPENAI_API_KEY="your-openai-api-key"

# Google Cloud Storage (optional)
GOOGLE_CLOUD_PROJECT_ID="your-gcp-project-id"
GOOGLE_CLOUD_STORAGE_BUCKET="your-storage-bucket"
```

### Database Migration and Seeding

Initialize the database schema and seed demo data:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed with standards, lessons, demo users, and activity data
npm run seed
```

**Seeding Options:**

- **Full seed** (standards, lessons, demo users, activity data):
  ```bash
  npm run seed
  ```

- **Skip demo data** (only standards and lessons):
  ```bash
  npm run seed -- --skip-demo
  ```

- **Selective seeding** by framework or grade:
  ```bash
  npm run seed -- --framework=THAI --grade=3
  ```

- **Reset and reseed** (⚠️ destroys all data):
  ```bash
  npm run dev:reset
  ```

**Demo Users:** The application uses username/password authentication. During local development with `DEV_AUTH_ENABLED=true`, use the demo accounts on `/signin` to sign in as student, teacher, admin, or system admin roles. The impersonation panel on `/signin` also allows assuming teacher or student roles for QA.

### Development Server

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Developer Utilities

#### Intervention Alerts (Local Testing)

Test the teacher intervention alert detection service locally:

```bash
# Run for a specific class
CLASS_ID=<classId> npm run dev:interventions

# Or pass the class ID as an argument
npm run dev:interventions <classId>
```

This script:
- Queries the class roster and StandardMastery data
- Runs the alert detection algorithm locally
- Displays alerts sorted by severity with student names, weak standard counts, and average mastery levels

**Example Output:**
```
Generated 3 alert(s) for class Science 301:
1. Alice Student - CRITICAL (weak standards: 3, avg mastery: 0.35)
2. Bob Student - WARNING (weak standards: 2, avg mastery: 0.48)
3. Carol Student - MODERATE (weak standards: 1, avg mastery: 0.55)
```

### Recommended Tooling

- Node 18.x (see `.nvmrc` if present)
- Docker & Docker Compose (for local PostgreSQL)
- GitHub CLI (`gh`) for issue and PR workflow

## Development Workflow

1. Start with the relevant spec under `docs/specs/`; update it before coding.
2. Create a GitHub issue (see templates in `.github/ISSUE_TEMPLATE/`) and branch
   following `feat/<issue>-<slug>` naming.
3. Implement changes with 2-space TypeScript style, keeping components focused.
4. Run validation commands prior to PR:

```bash
npm run lint
npm run test
npm run test:integration   # when touching API/Prisma
npm run test:e2e           # before deploys
```

5. Use the PR template to document spec deltas, implementation notes, and tests.
6. Enable squash-and-merge once checks pass and review is approved.

Additional workflow details live in `CLAUDE.md`.

### Teacher Intervention Alerts (Local QA)

Use the intervention helper script to generate alerts for a specific class without touching the UI:

```bash
# Ensure the DB has sample mastery data
npm run seed

# Optionally top off activity fixtures
tsx scripts/seed-activity-data.ts

# Run detection for a class
CLASS_ID=class_alpha_id npm run dev:interventions
```

The script queries Prisma, runs the same scoring logic as the API, and prints each alert with severity + weak standard counts. Use the `?refresh=true` query string on `/api/teachers/classes/<classId>/intervention-alerts` to bust the five-minute cache when manually testing the dashboard refresh button.

## Repository Layout

- `app/` – Next.js App Router routes and API handlers
- `components/` – Shared UI primitives and feature components
- `lib/` – Cross-cutting utilities (auth, DB, helpers)
- `prisma/` – Database schema, migrations, and seeds
- `docs/` – Product brief, PRD, specs, sprints, and archive of legacy docs
- `tests/` – Vitest unit/integration specs
- `public/` – Static assets

## Contributing

- Follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).
- Keep branches short-lived and tied to a single GitHub issue.
- Update specs and documentation as part of each change; specs are the source of
  truth for requirements.
- Do not commit secrets—use `.env.local` for development configuration.

For additional context on strategic goals, market positioning, and historical
artifacts, consult the archived documentation under `docs/archive/`.

- [Sample Lesson Plans](docs/sample-lessons.md)
- [Implementation Guide](docs/implementation-guide.md)
- [Research & Validation](docs/research.md)
- [Case Studies](docs/case-studies.md)
- [API Documentation](docs/api.md)

## 🛣️ Roadmap

### Coming Soon

- [ ] Mobile applications for iOS and Android
- [ ] Advanced analytics dashboard
- [ ] Parent portal for progress tracking
- [ ] Integration with popular LMS platforms
- [ ] Multilingual support

### Future Enhancements

- [ ] Virtual reality laboratory experiences
- [ ] AI-powered tutoring system
- [ ] Advanced collaboration features
- [ ] Custom curriculum creation tools

---

**© 2025 Science Advantage. All rights reserved.**

Made with ❤️ for the future of education by the Science Advantage Team
