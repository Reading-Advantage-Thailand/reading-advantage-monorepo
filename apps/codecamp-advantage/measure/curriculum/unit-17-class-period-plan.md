# Unit 17 Class Period Plans: Cloud & Dockerization

---

## Period 1: Docker Basics

**Duration:** ~60 minutes

### Opening (5 min)

- "But it works on my machine!" → Docker solves this
- Docker packages your app + all its dependencies into a container
- Same container runs identically on every machine
- Today: Docker concepts and basic commands

### Activity: Docker Concepts (15 min)

```
┌─────────────────────────────────────┐
│            Docker Engine            │
│                                     │
│  ┌──────────┐   ┌──────────────┐   │
│  │ Container│   │  Container   │   │
│  │  App     │──▶│  PostgreSQL  │   │
│  │  :3000   │   │  :5432       │   │
│  └──────────┘   └──────────────┘   │
│        │              ▲             │
│        │   Network    │             │
│        └──────────────┘             │
│                                     │
│  ┌──────────────────────────────┐   │
│  │        Volume (data)         │   │
│  │  Persists across restarts    │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

| Concept | What it is | Analogy |
|---------|-----------|---------|
| Image | Blueprint for a container | Recipe |
| Container | Running instance of an image | Baked cake |
| Volume | Persistent storage | USB drive plugged into the container |
| Network | Communication between containers | WiFi connecting your devices |
| Dockerfile | Instructions to build an image | Recipe card |

### Activity: Basic Docker Commands (20 min)

```bash
# Pull and run a simple image
docker run hello-world

# Run PostgreSQL (you've already done this!)
docker run -d \
  --name my-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine

# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Stop a container
docker stop my-postgres

# Start a stopped container
docker start my-postgres

# Remove a container
docker rm my-postgres

# View container logs
docker logs my-postgres

# Execute a command inside a running container
docker exec -it my-postgres psql -U postgres
```

### Activity: Port Mapping and Volumes (15 min)

```bash
# -p HOST_PORT:CONTAINER_PORT
docker run -p 5432:5432 postgres:16-alpine  # Map port 5432

# -v HOST_PATH:CONTAINER_PATH (persist database data)
docker run -d \
  --name my-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16-alpine

# Now data survives container restart
docker stop my-postgres
docker start my-postgres
# Data is still there!
```

### Closing (5 min)

- Docker concepts, basic commands, port mapping, volumes ✓
- Preview: Period 2 covers writing a Dockerfile

---

## Period 2: Dockerfile for Next.js

**Duration:** ~60 minutes

### Opening (5 min)

- A Dockerfile defines how to build a Docker image for your app
- Next.js needs a multi-stage build: install → build → run
- Today: write a production Dockerfile for the Student Progress Tracker

### Activity: Multi-Stage Dockerfile (30 min)

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@8.15.8 --activate
WORKDIR /app

# Copy package files first (for better caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db/package.json ./packages/db/package.json
COPY packages/auth/package.json ./packages/auth/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/domain/package.json ./packages/domain/package.json
COPY packages/api/package.json ./packages/api/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY apps/tracker/package.json ./apps/tracker/package.json

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@8.15.8 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the app
RUN pnpm turbo run build --filter=tracker

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Don't run as root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only what's needed for production
COPY --from=builder /app/apps/tracker/.next/standalone ./
COPY --from=builder /app/apps/tracker/.next/static ./apps/tracker/.next/static
COPY --from=builder /app/apps/tracker/public ./apps/tracker/public

USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "apps/tracker/server.js"]
```

**Why multi-stage?**
- Stage 1 installs everything (including dev dependencies)
- Stage 2 builds the app (needs all dependencies)
- Stage 3 only copies the built output → smaller image, no build tools, no source code

### Activity: .dockerignore (10 min)

```
# .dockerignore
node_modules
.next
.git
*.md
.env*.local
dist
coverage
```

This prevents unnecessary files from being copied into the Docker image, keeping it small.

### Activity: Build and Run the Image (10 min)

```bash
# Build the image
docker build -t student-tracker .

# Run the container
docker run -d \
  --name tracker \
  -p 3000:3000 \
  -e DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/tracker \
  student-tracker

# Test it
curl http://localhost:3000

# View logs
docker logs tracker
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add production Dockerfile for Next.js app"
git push
```

### Closing

- Dockerfile, multi-stage build, .dockerignore ✓
- Preview: Period 3 covers docker-compose

---

## Period 3: docker-compose for Full Stack

**Duration:** ~60 minutes

### Opening (5 min)

- Running `docker run` with lots of flags is tedious
- docker-compose.yml defines the entire stack in one file
- Today: connect the app and database together

### Activity: docker-compose.yml (25 min)

```yaml
# docker-compose.yml
version: "3.8"

services:
  # PostgreSQL Database
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: tracker
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Next.js App
  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://postgres:postgres@db:5432/tracker
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:-dev-secret-change-in-production}
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:  # Named volume — persists across restarts
```

Key points:
- `depends_on` with `service_healthy` — app waits for db to be ready
- `db` hostname in `DATABASE_URL` — Docker DNS resolves service names
- Named volume `pgdata` — data persists
- Environment variables from `.env` file

### Activity: Running the Full Stack (15 min)

```bash
# Start everything
docker compose up -d

# View logs
docker compose logs -f

# View logs for a specific service
docker compose logs -f app

# Stop everything
docker compose down

# Stop and remove volumes (fresh start)
docker compose down -v

# Rebuild after code changes
docker compose up -d --build
```

### Activity: Environment Configuration (10 min)

```bash
# .env
OPENROUTER_API_KEY=sk-or-...
NEXTAUTH_SECRET=a-long-random-string
```

```bash
# .env.production
DATABASE_URL=postgres://postgres:postgres@db:5432/tracker
OPENROUTER_API_KEY=sk-or-...
NEXTAUTH_SECRET=a-long-random-string
```

Never commit `.env` files with real secrets! Add them to `.gitignore`.

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add docker-compose for full stack deployment"
git push
```

### Closing

- docker-compose, service dependencies, volumes, environment ✓
- Preview: Period 4 covers cloud deployment overview and quiz

---

## Period 4: Cloud Deployment Overview, Exercise, Quiz

**Duration:** ~60 minutes

### Opening (5 min)

- Docker containers can run anywhere: local machine, VM, Kubernetes, cloud
- Reading Advantage uses Google Cloud
- Today: overview of cloud deployment + exercise + quiz

### Activity: Google Cloud Overview (15 min)

**Key Google Cloud services for web apps:**

| Service | Purpose | Reading Advantage usage |
|---------|---------|----------------------|
| Cloud Run | Run containers serverless | App deployment |
| Cloud SQL | Managed PostgreSQL | Database |
| Artifact Registry | Store Docker images | Container registry |
| Cloud Build | CI/CD pipelines | Build images on push |
| Secret Manager | Store API keys | Environment secrets |

**Deployment flow:**
1. Push code to GitHub
2. Cloud Build builds the Docker image
3. Image pushed to Artifact Registry
4. Cloud Run deploys the new image
5. Cloud SQL provides the managed database

```bash
# Simplified deployment commands
gcloud builds submit --tag us-central1-docker.pkg.dev/PROJECT/tracker/app
gcloud run deploy tracker --image us-central1-docker.pkg.dev/PROJECT/tracker/app
```

### Activity: Exercise — Containerize the Student Progress Tracker (25 min)

**No exercise repo** — the intern containerizes their actual tracker project.

Requirements:
1. Write a production Dockerfile with multi-stage build
2. Write a .dockerignore file
3. Write a docker-compose.yml with:
   - PostgreSQL 16 Alpine service with healthcheck
   - App service that depends on db being healthy
   - Named volume for database persistence
   - Environment variable configuration
4. Add a `seed` service that runs migrations and seeds on first start
5. Test: `docker compose up -d` and confirm the app works at localhost:3000
6. Test: `docker compose down` then `docker compose up -d` and confirm data persists
7. Document the deployment process in a `docs/deployment.md` file

### Quiz (10 min)

5 questions covering:

1. What is the difference between a Docker image and a container? (image = blueprint/template; container = running instance)
2. Why use a multi-stage Docker build? (smaller final image — only includes runtime, not build tools)
3. What does `depends_on: condition: service_healthy` do? (waits for the database healthcheck to pass before starting the app)
4. What is a Docker volume and why do you need one for PostgreSQL? (persistent storage that survives container restarts — without it, data is lost when the container stops)
5. Why should `.env` files with real secrets not be committed? (secrets in git are visible to anyone with repo access — use Secret Manager in production)

### Closing

- Docker, docker-compose, cloud deployment overview ✓
- Next unit: Real-World Practice — the capstone!
