# Unit 11 Class Period Plans: Databases & ORMs

---

## Period 1: PostgreSQL Basics and SQL

**Duration:** ~60 minutes

### Opening (5 min)

- Databases store your application's data permanently
- PostgreSQL 16 is the database used by Reading Advantage
- Today: relational database concepts and basic SQL

### Activity: Start PostgreSQL with Docker (10 min)

```bash
# Start Postgres (same as Reading Advantage's pnpm db:start)
docker run -d \
  --name tracker-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tracker \
  -p 5432:5432 \
  postgres:16-alpine

# Connect to it
docker exec -it tracker-db psql -U postgres -d tracker
```

### Activity: Relational Database Concepts (15 min)

| Concept | What it is | SQL equivalent |
|---------|-----------|---------------|
| Table | A collection of related data | `CREATE TABLE` |
| Row | A single record | `INSERT INTO` |
| Column | A field in the record | Defined in `CREATE TABLE` |
| Primary Key | Unique identifier for a row | `id SERIAL PRIMARY KEY` |
| Foreign Key | Reference to another table's row | `REFERENCES other_table(id)` |
| Index | Speeds up lookups | `CREATE INDEX` |

```
students          progress            lessons
┌────┬───────┐   ┌────┬────────┬────┬─────┐   ┌────┬──────────┬──────┐
│ id │ name  │   │ id │studId  │lesId│score│   │ id │ title    │modId │
├────┼───────┤   ├────┼────────┼─────┼─────┤   ├────┼──────────┼──────┤
│ 1  │ Alice │◄──│ 1  │   1    │  1  │ 95  │──►│ 1  │ Terminal │  1   │
│ 2  │ Bob   │   │ 2  │   1    │  2  │ 80  │   │ 2  │ VS Code  │  1   │
└────┴───────┘   └────┴────────┴─────┴─────┘   └────┴──────────┴──────┘
```

### Activity: Basic SQL (25 min)

```sql
-- Create a table
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  school_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student'
);

-- Insert data
INSERT INTO students (name, email, school_id, role)
VALUES ('Alice', 'alice@school.com', 'school-1', 'student');

-- Query data
SELECT * FROM students;
SELECT name, email FROM students WHERE school_id = 'school-1';
SELECT * FROM students WHERE role = 'student' ORDER BY name;

-- Update data
UPDATE students SET role = 'teacher' WHERE email = 'alice@school.com';

-- Delete data
DELETE FROM students WHERE id = 2;

-- Join tables
SELECT s.name, p.score, l.title
FROM progress p
JOIN students s ON p.student_id = s.id
JOIN lessons l ON p.lesson_id = l.id
WHERE s.school_id = 'school-1';
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "docs: add SQL examples for PostgreSQL basics"
git push
```

### Closing

- PostgreSQL, relational concepts, basic SQL ✓
- Preview: Period 2 covers Drizzle schema definition

---

## Period 2: Drizzle Schema Definition

**Duration:** ~60 minutes

### Opening (5 min)

- Writing raw SQL in code is error-prone and not type-safe
- Drizzle ORM 0.44.7 lets you define schemas in TypeScript and get auto-completed queries
- Same tool used in `packages/db/src/schema/` in the Reading Advantage monorepo

### Activity: Install and Configure Drizzle (10 min)

```bash
pnpm add drizzle-orm@0.44.7
pnpm add -D drizzle-kit@0.31.10
```

```typescript
// src/db/index.ts — database connection
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/tracker",
});

export const db = drizzle(pool);
```

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/tracker",
  },
});
```

### Activity: Define Tables with pgTable (25 min)

```typescript
// src/db/schema.ts
import { pgTable, uuid, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", ["student", "teacher", "admin"]);
export const lessonTypeEnum = pgEnum("lesson_type", ["theory", "exercise", "quiz"]);
export const progressStatusEnum = pgEnum("progress_status", ["not_started", "in_progress", "completed"]);

// Tables
export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  schoolId: text("school_id").notNull(),  // Multi-tenant!
  role: roleEnum("role").notNull().default("student"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const modules = pgTable("modules", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  order: integer("order").notNull(),
  schoolId: text("school_id").notNull(),  // Multi-tenant!
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lessons = pgTable("lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  moduleId: uuid("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: lessonTypeEnum("type").notNull(),
  order: integer("order").notNull(),
  contentJson: text("content_json"),  // JSON stored as text
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const progress = pgTable("progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  status: progressStatusEnum("status").notNull().default("not_started"),
  score: integer("score"),
  schoolId: text("school_id").notNull(),  // Multi-tenant!
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Activity: Define Relations (10 min)

```typescript
// src/db/schema.ts — relations
import { relations } from "drizzle-orm";

export const modulesRelations = relations(modules, ({ many }) => ({
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  module: one(modules, {
    fields: [lessons.moduleId],
    references: [modules.id],
  }),
  progress: many(progress),
}));

export const progressRelations = relations(progress, ({ one }) => ({
  student: one(students, {
    fields: [progress.studentId],
    references: [students.id],
  }),
  lesson: one(lessons, {
    fields: [progress.lessonId],
    references: [lessons.id],
  }),
}));
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add Drizzle schema with tables and relations"
git push
```

### Closing (5 min)

- Drizzle pgTable, enums, relations ✓
- Preview: Period 3 covers Drizzle queries

---

## Period 3: Drizzle Queries

**Duration:** ~60 minutes

### Opening (5 min)

- Schemas define the shape — queries read and write the data
- Drizzle queries are fully type-safe: auto-completed column names, inferred return types
- Today: SELECT, INSERT, UPDATE, DELETE with Drizzle

### Activity: SELECT Queries (20 min)

```typescript
import { eq, and, desc, sql } from "drizzle-orm";

// Get all modules for a school (multi-tenant!)
const schoolModules = await db
  .select()
  .from(modules)
  .where(eq(modules.schoolId, "school-1"))
  .orderBy(modules.order);

// Get a specific module by slug
const [module] = await db
  .select()
  .from(modules)
  .where(and(eq(modules.slug, "react"), eq(modules.schoolId, "school-1")));

// Get lessons for a module
const moduleLessons = await db
  .select()
  .from(lessons)
  .where(eq(lessons.moduleId, module.id))
  .orderBy(lessons.order);

// Get a student's progress
const studentProgress = await db
  .select()
  .from(progress)
  .where(and(
    eq(progress.studentId, studentId),
    eq(progress.schoolId, "school-1")  // Always scope by school!
  ));

// Select specific columns
const moduleTitles = await db
  .select({ id: modules.id, title: modules.title })
  .from(modules)
  .where(eq(modules.schoolId, "school-1"));

// Count
const [{ count }] = await db
  .select({ count: sql<number>`count(*)` })
  .from(progress)
  .where(and(
    eq(progress.studentId, studentId),
    eq(progress.status, "completed")
  ));
```

### Activity: INSERT Queries (10 min)

```typescript
// Insert one row
const [newStudent] = await db
  .insert(students)
  .values({
    name: "Alice",
    email: "alice@school.com",
    schoolId: "school-1",
    role: "student",
  })
  .returning();  // Returns the inserted row with generated id

// Insert multiple rows
await db.insert(modules).values([
  { title: "React", slug: "react", order: 7, schoolId: "school-1" },
  { title: "APIs", slug: "api-fundamentals", order: 8, schoolId: "school-1" },
]).returning();
```

### Activity: UPDATE Queries (10 min)

```typescript
// Update progress
const [updated] = await db
  .update(progress)
  .set({
    status: "completed",
    score: 95,
    completedAt: new Date(),
  })
  .where(and(
    eq(progress.studentId, studentId),
    eq(progress.lessonId, lessonId),
    eq(progress.schoolId, "school-1")  // Never forget schoolId!
  ))
  .returning();
```

### Activity: DELETE Queries (5 min)

```typescript
await db
  .delete(progress)
  .where(and(
    eq(progress.studentId, studentId),
    eq(progress.schoolId, "school-1")
  ));
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add Drizzle queries for CRUD operations"
git push
```

### Closing

- Drizzle queries: select, insert, update, delete ✓
- Preview: Period 4 covers migrations and multi-tenancy

---

## Period 4: Migrations and Multi-Tenancy

**Duration:** ~60 minutes

### Opening (5 min)

- Migrations track schema changes over time — like Git for your database
- Multi-tenancy is how Reading Advantage isolates data per school
- Today: generate migrations and understand multi-tenant patterns

### Activity: Generate and Apply Migrations (15 min)

```bash
# Generate a migration from schema changes
pnpm drizzle-kit generate

# Apply pending migrations
pnpm drizzle-kit migrate

# View current state
pnpm drizzle-kit studio  # Opens a visual DB browser at https://local.drizzle.studio
```

Migration workflow:
1. Edit schema in `src/db/schema.ts`
2. Run `drizzle-kit generate` → creates SQL migration in `drizzle/`
3. Run `drizzle-kit migrate` → applies migration to database
4. Commit both schema and migration files

### Activity: Multi-Tenancy Pattern (25 min)

This is the core pattern from Reading Advantage:

```typescript
// src/db/tenant-db.ts — auto-injects schoolId into queries
import { SQL, and, eq } from "drizzle-orm";
import type { PgTableWithColumns } from "drizzle-orm/pg-core";

interface Tenant {
  schoolId: string;
}

// Tables that have a schoolId column
type TenantScopedTable = PgTableWithColumns<{
  name: string;
  schema: undefined;
  columns: {
    schoolId: { columnType: string; data: string };
    [key: string]: any;
  };
}>;

export function createTenantDb(db: DB, tenant: Tenant) {
  return new Proxy(db, {
    get(target, prop) {
      const original = target[prop as keyof DB];
      if (typeof original === "function") {
        return (...args: unknown[]) => {
          // For select/update/delete: inject schoolId filter
          // This is a simplified version — the real implementation is in packages/db
          return original.apply(target, args);
        };
      }
      return original;
    },
  });
}
```

**The rule:** Every query MUST include `schoolId`. TenantDB enforces this automatically.

```typescript
// ❌ WRONG — no schoolId filter (could return data from other schools!)
const allModules = await db.select().from(modules);

// ✅ CORRECT — scoped to the tenant's school
const tenantDb = createTenantDb(db, { schoolId: "school-1" });
const schoolModules = await tenantDb.select().from(modules);  // schoolId injected!

// ✅ CORRECT — manual scoping
const schoolModules = await db
  .select()
  .from(modules)
  .where(eq(modules.schoolId, "school-1"));
```

### Activity: Seed Data (10 min)

```typescript
// src/db/seed.ts
async function seed() {
  // Create a school
  const [school1] = await db.insert(schools).values({
    id: "school-1",
    name: "Reading Advantage Academy",
  }).returning();

  // Create modules for this school
  await db.insert(modules).values([
    { title: "Dev Environment", slug: "dev-env", order: 1, schoolId: school1.id },
    { title: "Git & GitHub", slug: "git-github", order: 2, schoolId: school1.id },
    // ... more modules
  ]);

  console.log("✅ Seeded!");
}
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add migrations and multi-tenant query patterns"
git push
```

### Closing

- Migrations, multi-tenancy, TenantDB pattern ✓
- Preview: Period 5 wraps up with exercise and quiz

---

## Period 5: Exercise, Quiz

**Duration:** ~60 minutes

### Opening (5 min)

- Databases & ORMs unit nearly complete
- Today: exercise and quiz

### Activity: Exercise — Design a Blog Database (40 min)

**Exercise repo:** `codecamp-drizzle-exercise`

The intern forks the exercise repo which contains:
- A running PostgreSQL 16 instance (Docker)
- An empty Drizzle project
- A README with requirements

Requirements:
1. Define tables with Drizzle:
   - `users` (id, name, email, schoolId, role enum [author/editor/admin])
   - `posts` (id, authorId FK→users, title, slug unique, content, status enum [draft/published], schoolId, createdAt, publishedAt)
   - `comments` (id, postId FK→posts, authorId FK→users, content, schoolId, createdAt)
   - `tags` (id, name, schoolId)
   - `post_tags` (id, postId FK→posts, tagId FK→tags) — join table
2. Define relations between all tables
3. Generate and apply the migration
4. Write and export these query functions:
   - `getPublishedPosts(schoolId)` — all published posts for a school, newest first
   - `getPostBySlug(slug, schoolId)` — single post with author info
   - `getCommentsForPost(postId, schoolId)` — comments with author names
   - `createPost(input)` — insert a new post, return it
   - `publishPost(postId, schoolId)` — set status to published, set publishedAt
   - `getPostsByTag(tagId, schoolId)` — posts with a specific tag
5. Every query is scoped by `schoolId` (multi-tenant)
6. Write a seed script with sample data for 2 schools

The intern creates a branch, implements, and opens a PR for LLM review.

### Quiz (10 min)

5 questions covering:

1. What is a foreign key? (a column that references the primary key of another table, creating a relationship)
2. What does `drizzle-kit generate` do? (compares your schema to the database and creates a SQL migration file)
3. Why must every query include `schoolId`? (to enforce multi-tenancy — each school can only see its own data)
4. What does `.returning()` do on an INSERT? (returns the inserted row including auto-generated fields like id)
5. What is the difference between `onDelete: "cascade"` and the default? (cascade automatically deletes related rows; default prevents deletion if referenced rows exist)

### Closing

- Databases & ORMs unit complete — Student Progress Tracker has a database
- Next unit: tRPC & Server Actions — building the API layer
