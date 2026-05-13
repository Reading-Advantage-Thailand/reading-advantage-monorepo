import { db } from "../index.js";
import {
  codecampModules,
  codecampLessons,
  codecampExercises,
  codecampQuizQuestions,
} from "../schema/codecamp.js";

async function seed() {
  console.log("Seeding codecamp curriculum...");

  // ─── Module 1: Next.js App Router & RSC ───────────────────
  const [m1] = await db
    .insert(codecampModules)
    .values({
      title: "Next.js App Router & RSC",
      description:
        "Understand Server Components, async pages, and data fetching patterns used across all monorepo apps.",
      slug: "nextjs-app-router",
      order: 1,
      status: "published",
    })
    .returning();

  const [m1l1] = await db
    .insert(codecampLessons)
    .values({
      moduleId: m1.id,
      title: "App Router Basics",
      description: "How the App Router replaces the Pages Router in Next.js 15+",
      order: 1,
      type: "theory",
      contentJson: {
        sections: [
          {
            heading: "File-based routing",
            body: "The App Router uses directories in `app/` to define routes. Each `page.tsx` exports the default component for that route.",
            code: "// app/dashboard/page.tsx\nexport default function DashboardPage() {\n  return <h1>Dashboard</h1>;\n}",
          },
          {
            heading: "Server Components by default",
            body: "Every component in the App Router is a Server Component unless marked with 'use client'. This means you can fetch data directly inside the component.",
            code: "// This runs on the server — no 'use client' needed\nexport default async function Page() {\n  const data = await fetchData();\n  return <div>{data.title}</div>;\n}",
          },
        ],
      },
    })
    .returning();

  const [m1l2] = await db
    .insert(codecampLessons)
    .values({
      moduleId: m1.id,
      title: "Async Server Components",
      description: "Fetching data directly in components without useEffect",
      order: 2,
      type: "exercise",
      contentJson: {
        instructions:
          "Write an async Server Component that fetches a list of articles and renders them.",
      },
    })
    .returning();

  await db.insert(codecampExercises).values({
    lessonId: m1l2.id,
    title: "Write an async page component",
    instructions:
      "Create `app/articles/page.tsx` that fetches articles from a tRPC endpoint and renders a list. Use async/await directly in the component.",
    starterCode:
      "// app/articles/page.tsx\nexport default async function ArticlesPage() {\n  // TODO: fetch articles\n  return <div>{/* TODO: render list */}</div>;\n}",
    expectedOutput: "A rendered list of article titles",
    hintsJson: [
      "Server Components can be async functions",
      "Import the tRPC caller from server context",
      "Map over the array to render each article",
    ],
    order: 1,
  });

  const [m1l3] = await db
    .insert(codecampLessons)
    .values({
      moduleId: m1.id,
      title: "App Router Quiz",
      description: "Test your understanding of the App Router",
      order: 3,
      type: "quiz",
      contentJson: { instructions: "Answer all questions to complete this lesson." },
    })
    .returning();

  await db.insert(codecampQuizQuestions).values([
    {
      lessonId: m1l3.id,
      question: "In the App Router, which file name defines a page route?",
      optionsJson: ["index.tsx", "page.tsx", "route.tsx", "layout.tsx"],
      correctAnswer: "page.tsx",
      explanation:
        "`page.tsx` is the special file that defines the UI for a route segment.",
      order: 1,
    },
    {
      lessonId: m1l3.id,
      question: "By default, components in the App Router are...",
      optionsJson: [
        "Client Components",
        "Server Components",
        "Hybrid Components",
        "Static Components",
      ],
      correctAnswer: "Server Components",
      explanation:
        "The App Router defaults to Server Components. You must add `'use client'` to opt into client-side interactivity.",
      order: 2,
    },
  ]);

  // ─── Module 2: tRPC & Domain Functions ────────────────────
  const [m2] = await db
    .insert(codecampModules)
    .values({
      title: "tRPC & Domain Functions",
      description:
        "Learn the thin-router / thick-domain architecture that powers the shared backend.",
      slug: "trpc-domain",
      order: 2,
      status: "published",
    })
    .returning();

  const [m2l1] = await db
    .insert(codecampLessons)
    .values({
      moduleId: m2.id,
      title: "Router Structure",
      description: "How tRPC routers are organized in packages/api",
      order: 1,
      type: "theory",
      contentJson: {
        sections: [
          {
            heading: "Thin routers, thick domain",
            body: "Routers in `packages/api/src/routers/` validate input and call domain functions. All business logic lives in `packages/domain/`.",
            code: "// packages/api/src/routers/users.ts\nexport const usersRouter = router({\n  me: protectedProcedure\n    .output(userResponseSchema)\n    .query(({ ctx }) => getMe({ db: ctx.tenantDb, user: ctx.auth.user })),\n});",
          },
          {
            heading: "Domain function pattern",
            body: "Every domain function receives `{ db, user, tenant, input }` and calls `assertCan()` before any mutation.",
            code: "// packages/domain/src/users/index.ts\nexport async function getMe({ db, user }) {\n  const [result] = await db\n    .select(safeUserCols)\n    .from(users)\n    .where(eq(users.id, user.id))\n    .limit(1);\n  if (!result) throw new Error('User not found');\n  return result;\n}",
          },
        ],
      },
    })
    .returning();

  const [m2l2] = await db
    .insert(codecampLessons)
    .values({
      moduleId: m2.id,
      title: "Write a domain function",
      description: "Practice the domain function pattern",
      order: 2,
      type: "exercise",
      contentJson: {
        instructions:
          "Write a domain function that creates a classroom with permission checks.",
      },
    })
    .returning();

  await db.insert(codecampExercises).values({
    lessonId: m2l2.id,
    title: "Create classroom domain function",
    instructions:
      "Write `createClassroom({ db, user, tenant, input })` in `packages/domain/src/classes/index.ts`. It should call `assertCan()`, insert into the `classrooms` table, and return the created row.",
    starterCode:
      "export async function createClassroom({ db, user, tenant, input }) {\n  // TODO: assert permission\n  // TODO: insert classroom\n  // TODO: return result\n}",
    expectedOutput: "A classroom row with id, name, schoolId, teacherId",
    hintsJson: [
      "Use assertCan(user, 'class:create', tenant)",
      "Use db.insert(classrooms).values({...}).returning()",
      "Return the first element of the returning array",
    ],
    order: 1,
  });

  const [m2l3] = await db
    .insert(codecampLessons)
    .values({
      moduleId: m2.id,
      title: "tRPC Quiz",
      description: "Test your understanding of tRPC and domain functions",
      order: 3,
      type: "quiz",
      contentJson: { instructions: "Answer all questions to complete this lesson." },
    })
    .returning();

  await db.insert(codecampQuizQuestions).values([
    {
      lessonId: m2l3.id,
      question: "Where should business logic live in this monorepo?",
      optionsJson: [
        "packages/api/src/routers",
        "packages/domain/src",
        "apps/*/app/api",
        "packages/db/src/schema",
      ],
      correctAnswer: "packages/domain/src",
      explanation:
        "Business logic lives in `packages/domain`. Routers in `packages/api` are thin wrappers.",
      order: 1,
    },
    {
      lessonId: m2l3.id,
      question: "What is the first thing every domain function should do?",
      optionsJson: [
        "Validate input with Zod",
        "Call assertCan()",
        "Start a transaction",
        "Return early",
      ],
      correctAnswer: "Call assertCan()",
      explanation:
        "Permission checks come first. Input validation happens in the tRPC router layer.",
      order: 2,
    },
  ]);

  // ─── Module 3: Drizzle ORM ────────────────────────────────
  const [m3] = await db
    .insert(codecampModules)
    .values({
      title: "Drizzle ORM",
      description:
        "Schema definition, multi-tenant queries, and migration patterns with Drizzle.",
      slug: "drizzle-orm",
      order: 3,
      status: "published",
    })
    .returning();

  const [m3l1] = await db
    .insert(codecampLessons)
    .values({
      moduleId: m3.id,
      title: "Schema Definition",
      description: "How tables are defined in packages/db/src/schema",
      order: 1,
      type: "theory",
      contentJson: {
        sections: [
          {
            heading: "pgTable pattern",
            body: "Tables are defined using `pgTable` from `drizzle-orm/pg-core`. Each table exports a TypeScript variable that is used for queries.",
            code: "import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';\n\nexport const users = pgTable('users', {\n  id: text('id').primaryKey(),\n  username: text('username').notNull().unique(),\n  createdAt: timestamp('created_at').defaultNow().notNull(),\n});",
          },
          {
            heading: "Relations",
            body: "Use `references()` for foreign keys. Always include `onDelete: 'cascade'` for join tables.",
            code: "classroomId: uuid('classroom_id')\n  .notNull()\n  .references(() => classrooms.id, { onDelete: 'cascade' })",
          },
        ],
      },
    })
    .returning();

  // ─── Module 4: Auth & Multi-Tenancy ───────────────────────
  const [m4] = await db
    .insert(codecampModules)
    .values({
      title: "Auth & Multi-Tenancy",
      description:
        "Cookie sessions, role-based permissions, assertCan(), and tenant resolution.",
      slug: "auth-multitenancy",
      order: 4,
      status: "published",
    })
    .returning();

  const [m4l1] = await db
    .insert(codecampLessons)
    .values({
      moduleId: m4.id,
      title: "Permission System",
      description: "How roles and permissions work in @reading-advantage/auth",
      order: 1,
      type: "theory",
      contentJson: {
        sections: [
          {
            heading: "Roles hierarchy",
            body: "STUDENT < TEACHER < ADMIN < SYSTEM. Higher roles inherit permissions from lower roles.",
            code: "export const ROLE_HIERARCHY = ['STUDENT', 'TEACHER', 'ADMIN', 'SYSTEM'];",
          },
          {
            heading: "assertCan()",
            body: "Call `assertCan(user, 'permission:key', tenant)` before any mutation. It checks role permissions and throws `AuthError` if denied.",
            code: "assertCan(user, 'class:create', tenant);\n// throws AuthError if user.role is STUDENT",
          },
          {
            heading: "TenantDB",
            body: "`TenantDB` automatically injects `schoolId` into SELECT, UPDATE, and DELETE queries for tables that have a `schoolId` column.",
            code: "const tenantDb = createTenantDB(db, tenant);\n// SELECT ... WHERE school_id = '...' is injected automatically",
          },
        ],
      },
    })
    .returning();

  const [m4l2] = await db
    .insert(codecampLessons)
    .values({
      moduleId: m4.id,
      title: "Write a permission check",
      description: "Practice adding assertCan to a domain function",
      order: 2,
      type: "exercise",
      contentJson: {
        instructions:
          "Given a domain function that deletes a classroom, add the correct permission check and tenant scoping.",
      },
    })
    .returning();

  await db.insert(codecampExercises).values({
    lessonId: m4l2.id,
    title: "Secure deleteClassroom",
    instructions:
      "Write `deleteClassroom({ db, user, tenant, input })` that checks permissions, verifies the classroom belongs to the user's school, and deletes it.",
    starterCode:
      "export async function deleteClassroom({ db, user, tenant, input }) {\n  // TODO: permission check\n  // TODO: verify ownership\n  // TODO: delete and return\n}",
    expectedOutput: "Deleted classroom row",
    hintsJson: [
      "Use assertCan(user, 'class:archive', tenant)",
      "Use db.delete(classrooms).where(and(eq(classrooms.id, input.id), eq(classrooms.schoolId, tenant.schoolId)))",
      "Remember: TenantDB already injects schoolId for tables that have it",
    ],
    order: 1,
  });

  // ─── Module 5: Monorepo Patterns ──────────────────────────
  const [m5] = await db
    .insert(codecampModules)
    .values({
      title: "Monorepo Patterns",
      description:
        "Workspace structure, shared packages, Turborepo pipelines, and cross-app code sharing.",
      slug: "monorepo-patterns",
      order: 5,
      status: "published",
    })
    .returning();

  const [m5l1] = await db
    .insert(codecampLessons)
    .values({
      moduleId: m5.id,
      title: "Workspace Structure",
      description: "How the monorepo is organized and why",
      order: 1,
      type: "theory",
      contentJson: {
        sections: [
          {
            heading: "Dependency order",
            body: "Packages must respect the dependency graph: db → auth → types → domain → api / webhooks. Circular dependencies are not allowed.",
            code: "db → auth → types → domain → api / webhooks",
          },
          {
            heading: "Shared packages",
            body: "`@reading-advantage/ui` exports Radix/shadcn components. `@reading-advantage/config` exports shared ESLint, TSConfig, and Tailwind configs.",
            code: "// apps/my-app/package.json\n\"dependencies\": {\n  \"@reading-advantage/ui\": \"workspace:*\"\n}",
          },
          {
            heading: "Turborepo pipeline",
            body: "`turbo.json` defines tasks with dependencies. `build` depends on `^build` (upstream builds first). `test` depends on `^build`.",
            code: "// turbo.json\n\"tasks\": {\n  \"build\": {\n    \"dependsOn\": [\"^build\"]\n  }\n}",
          },
        ],
      },
    })
    .returning();

  console.log("✅ Seeded 5 modules with lessons, exercises, and quizzes.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
