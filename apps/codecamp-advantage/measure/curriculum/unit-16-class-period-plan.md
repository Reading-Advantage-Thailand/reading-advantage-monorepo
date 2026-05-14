# Unit 16 Class Period Plans: Monorepo & Package Management

---

## Period 1: pnpm Workspaces

**Duration:** ~60 minutes

### Opening (5 min)

- The Reading Advantage codebase is a monorepo — many packages in one repo
- pnpm 8.15.8 manages it with workspaces
- Today: understand how workspaces work

### Activity: Workspace Configuration (15 min)

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

This tells pnpm that every folder in `apps/` and `packages/` is a separate package with its own `package.json`.

The Reading Advantage monorepo structure:
```
reading-advantage-monorepo/
├── apps/
│   ├── reading-advantage/     # Main reading app
│   ├── science-advantage/     # Science curriculum app
│   ├── primary-advantage/     # Primary school app
│   ├── codecamp-advantage/    # This bootcamp app
│   └── www-reading-advantage/ # Marketing website
├── packages/
│   ├── db/          → @reading-advantage/db
│   ├── auth/        → @reading-advantage/auth
│   ├── auth-client/ → @reading-advantage/auth-client
│   ├── types/       → @reading-advantage/types
│   ├── domain/      → @reading-advantage/domain
│   ├── api/         → @reading-advantage/api
│   ├── webhooks/    → @reading-advantage/webhooks
│   ├── ui/          → @reading-advantage/ui
│   ├── config/      → @reading-advantage/config
│   └── utils/       → @reading-advantage/utils
└── package.json     # Root workspace config
```

### Activity: workspace:* Dependencies (20 min)

When one package depends on another in the same monorepo, it uses `workspace:*`:

```json
// packages/api/package.json
{
  "dependencies": {
    "@reading-advantage/db": "workspace:*",
    "@reading-advantage/auth": "workspace:*",
    "@reading-advantage/domain": "workspace:*",
    "@reading-advantage/types": "workspace:*"
  }
}
```

`workspace:*` creates a **symlink** — changes to `packages/db` are instantly available to `packages/api` without publishing or reinstalling.

```bash
# Install all workspace dependencies
pnpm install

# Install a new dependency for a specific package
pnpm add zod --filter=@reading-advantage/domain

# Run a script in a specific package
pnpm --filter @reading-advantage/db run build
```

### Activity: The Dependency Order (15 min)

This is critical — packages must follow this order:

```
db → auth → types → domain → api / webhooks
                ↓
               ui (independent — no backend deps)
```

**What this means:**
- `db` can import: nothing (only external packages like drizzle-orm)
- `auth` can import: `db`
- `types` can import: nothing (only Zod)
- `domain` can import: `db`, `auth`, `types`
- `api` can import: `db`, `auth`, `domain`, `types`
- `ui` can import: nothing from backend packages (it's React components only)

**What is NOT allowed:**
- `db` importing from `domain` → ❌ circular dependency!
- `domain` importing from `api` → ❌ wrong direction!
- `ui` importing from `db` → ❌ UI must not know about the database!

### Activity: Commit (5 min)

```bash
# No code changes — this is a documentation/exploration unit
git add -A && git commit -m "docs: add monorepo dependency graph documentation"
git push
```

### Closing

- pnpm workspaces, `workspace:*`, dependency order ✓
- Preview: Period 2 covers Turborepo

---

## Period 2: Turborepo Pipeline

**Duration:** ~60 minutes

### Opening (5 min)

- In a monorepo with 15+ packages, building them in the right order is complex
- Turborepo 2.9.8 automates this with a pipeline configuration
- Today: understand and configure the build pipeline

### Activity: turbo.json Configuration (20 min)

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],  // Build dependencies first
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["^build"],  // Need built deps to test
      "outputs": []
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "check-types": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "dev": {
      "cache": false,           // Never cache dev server
      "persistent": true        // Keeps running
    }
  }
}
```

Key concepts:
- `^build` = "build" task of all workspace dependencies (upstream)
- `build` = "build" task of the current package
- Turborepo runs tasks in parallel when possible

### Activity: Pipeline in Action (15 min)

```bash
# Build everything (correct order automatically)
pnpm turbo run build

# What Turborepo does internally:
# 1. Build @reading-advantage/db        (no deps)
# 2. Build @reading-advantage/auth      (depends on db)
# 3. Build @reading-advantage/types     (no deps)
# 4. Build @reading-advantage/domain    (depends on db, auth, types)
# 5. Build @reading-advantage/api       (depends on db, auth, domain, types)
# 6. Build apps/codecamp-advantage      (depends on api, auth, db, ui, etc.)

# Build a single package and its dependencies
pnpm turbo run build --filter=codecamp-advantage

# Run tests for a specific package only
pnpm turbo run test --filter=@reading-advantage/domain

# Run lint for all packages
pnpm turbo run lint
```

### Activity: Caching (15 min)

Turborepo caches task outputs. If nothing changed, it skips the task:

```bash
# First run: builds everything
pnpm turbo run build
# → FULL BUILD

# Second run: nothing changed
pnpm turbo run build
# → FULL TURBO (all cached)

# Change one file in packages/domain
pnpm turbo run build
# → Rebuilds domain + api + codecamp-advantage
# → db, auth, types, ui still cached
```

This is why Turborepo is fast — it only rebuilds what changed and everything downstream.

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "docs: add Turborepo pipeline documentation"
git push
```

### Closing

- Turborepo pipeline, task dependencies, caching ✓
- Preview: Period 3 wraps up with exercise and quiz

---

## Period 3: Exercise, Quiz

**Duration:** ~60 minutes

### Opening (5 min)

- Monorepo understanding is crucial for working in the Reading Advantage codebase
- Today: map the real monorepo and take the quiz

### Activity: Exercise — Map the Reading Advantage Monorepo (40 min)

No exercise repo for this unit — the intern works directly in the real monorepo.

Requirements:
1. Read every `package.json` in `packages/` and `apps/`
2. Create a file `docs/dependency-graph.md` that shows:
   - Each package's name and purpose
   - Each package's workspace dependencies (from `workspace:*`)
   - The complete dependency graph as a text diagram
3. For each package, identify:
   - Which other packages import it
   - What it's allowed to import vs. what it actually imports
   - Any dependency order violations
4. Answer these questions in the file:
   - If you change `packages/db/src/schema/users.ts`, which packages need to be rebuilt?
   - If you add a new Zod schema to `packages/types`, which packages need to be rebuilt?
   - Why can't `packages/ui` import from `packages/db`?
   - What would happen if `packages/db` imported from `packages/domain`?
5. Run `pnpm turbo run build` and confirm it succeeds
6. Run `pnpm turbo run build --filter=@reading-advantage/domain` and explain what gets built

### Quiz (10 min)

5 questions covering:

1. What does `workspace:*` mean in a package.json? (a symlink to a local workspace package — changes are instantly available)
2. What is the dependency order of the Reading Advantage packages? (`db → auth → types → domain → api/webhooks`)
3. What does `^build` mean in turbo.json? (the "build" task of all upstream workspace dependencies)
4. How does Turborepo know which tasks to cache? (based on input file hashes — if inputs haven't changed, skip the task)
5. Why can't `packages/ui` import from `packages/db`? (UI is frontend-only; it must not depend on backend packages like the database)

### Closing

- Monorepo & Package Management unit complete
- Next unit: Cloud & Dockerization
