# Unit 12 Class Period Plans: tRPC & Server Actions

---

## Period 1: Thin Router / Thick Domain Architecture

**Duration:** ~60 minutes

### Opening (5 min)

- The most important architectural pattern in Reading Advantage
- Routers validate input and delegate — domain functions hold the logic
- This separation makes code testable, maintainable, and secure

### Activity: The Architecture (20 min)

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────┐     ┌──────────┐
│  tRPC Router     │     │  Domain Function  │     │   Drizzle    │     │ Postgres │
│  (thin wrapper)  │────▶│  (business logic) │────▶│   (query)    │────▶│  (data)  │
│                  │     │                   │     │              │     │          │
│ • Validate input │     │ • assertCan()     │     │ • select()   │     │          │
│ • Call domain fn │     │ • Business rules  │     │ • insert()   │     │          │
│ • Return result  │     │ • Data transforms │     │ • update()   │     │          │
└──────────────────┘     └───────────────────┘     └──────────────┘     └──────────┘
```

**Why this matters:**
- Routers are thin → easy to audit, hard to hide bugs
- Domain functions are thick → business logic is centralized and testable
- `assertCan()` is always first → impossible to forget permission checks

### Activity: Domain Function Pattern (20 min)

```typescript
// src/domain/modules/index.ts — the pattern
import { assertCan } from "../../auth/permissions.js";
import type { DB, User, Tenant } from "../../types.js";

interface GetModulesInput {
  schoolId: string;
}

export async function getModules({ db, user, tenant }: {
  db: DB;
  user: User;
  tenant: Tenant;
  input?: GetModulesInput;
}) {
  // 1. Permission check FIRST
  assertCan(user, "module:read", tenant);

  // 2. Business logic
  const result = await db
    .select()
    .from(modules)
    .where(eq(modules.schoolId, tenant.schoolId))
    .orderBy(modules.order);

  // 3. Return the result
  return result;
}

export async function createModule({ db, user, tenant, input }: {
  db: DB;
  user: User;
  tenant: Tenant;
  input: { title: string; slug: string; description: string; order: number };
}) {
  // 1. Permission check FIRST
  assertCan(user, "module:create", tenant);

  // 2. Business logic — only admins can create modules
  const [result] = await db
    .insert(modules)
    .values({
      ...input,
      schoolId: tenant.schoolId,
      status: "draft",
    })
    .returning();

  // 3. Return the result
  return result;
}
```

### Activity: assertCan Implementation (10 min)

```typescript
// src/auth/permissions.ts — simplified version of Reading Advantage's system
type Permission =
  | "module:read"
  | "module:create"
  | "module:update"
  | "progress:read"
  | "progress:update"
  | "quiz:submit";

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  student: ["module:read", "progress:read", "progress:update", "quiz:submit"],
  teacher: ["module:read", "module:create", "module:update", "progress:read", "progress:update", "quiz:submit"],
  admin: ["module:read", "module:create", "module:update", "progress:read", "progress:update", "quiz:submit"],
};

export function assertCan(user: User, permission: Permission, tenant: Tenant) {
  const allowed = ROLE_PERMISSIONS[user.role] ?? [];
  if (!allowed.includes(permission)) {
    throw new AuthError(`User role '${user.role}' cannot '${permission}'`);
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add domain function pattern with assertCan"
git push
```

### Closing

- Thin router / thick domain architecture, domain function pattern, assertCan ✓
- Preview: Period 2 covers tRPC router setup

---

## Period 2: tRPC Router Setup

**Duration:** ~60 minutes

### Opening (5 min)

- tRPC gives you end-to-end type safety — the frontend automatically knows the API types
- No more writing fetch calls and manually typing responses
- Used by every Reading Advantage app

### Activity: Install and Configure tRPC (15 min)

```bash
pnpm add @trpc/server@11.17.0 @trpc/client@11.17.0 @trpc/react-query@11.17.0 @tanstack/react-query@5.90.10
```

```typescript
// src/server/trpc.ts — tRPC setup
import { initTRPC } from "@trpc/server";
import type { DB, User, Tenant } from "../types.js";

export interface Context {
  db: DB;
  user: User | null;
  tenant: Tenant;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) throw new AuthError("Authentication required");
  return next({ ctx: { ...ctx, user: ctx.user } });
});
```

### Activity: Write a tRPC Router (20 min)

```typescript
// src/server/routers/modules.ts — thin router
import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { getModules, getModuleBySlug, createModule } from "../../domain/modules/index.js";

export const modulesRouter = router({
  // List modules
  list: protectedProcedure
    .query(({ ctx }) => getModules({
      db: ctx.db,
      user: ctx.user,
      tenant: ctx.tenant,
    })),

  // Get module by slug
  bySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) => getModuleBySlug({
      db: ctx.db,
      user: ctx.user,
      tenant: ctx.tenant,
      input,
    })),

  // Create module (admin only — assertCan checks this in the domain function)
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      slug: z.string().min(1),
      description: z.string(),
      order: z.number().int().positive(),
    }))
    .mutation(({ ctx, input }) => createModule({
      db: ctx.db,
      user: ctx.user,
      tenant: ctx.tenant,
      input,
    })),
});
```

**Notice:** The router is thin — validate input, call domain, return result. Zero business logic.

### Activity: Merge Routers (10 min)

```typescript
// src/server/root.ts
import { router } from "./trpc.js";
import { modulesRouter } from "./routers/modules.js";
import { progressRouter } from "./routers/progress.js";
import { quizRouter } from "./routers/quiz.js";

export const appRouter = router({
  modules: modulesRouter,
  progress: progressRouter,
  quiz: quizRouter,
});

export type AppRouter = typeof appRouter;  // This type is used by the frontend!
```

### Activity: Create the API Route Handler (10 min)

```typescript
// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/root";
import type { Context } from "@/server/trpc";

export function POST(request: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: async (): Promise<Context> => {
      // Get user from session cookie
      const user = await getUserFromSession(request);
      const tenant = { schoolId: user?.schoolId ?? "" };
      return { db, user, tenant };
    },
  });
}
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add tRPC routers with thin wrapper pattern"
git push
```

### Closing

- tRPC setup, router definition, merging, API route ✓
- Preview: Period 3 covers tRPC on the frontend

---

## Period 3: tRPC on the Frontend

**Duration:** ~60 minutes

### Opening (5 min)

- The magic of tRPC: full type safety from server to client
- Frontend hooks are auto-typed — no manual API client needed
- Today: consume tRPC procedures from React

### Activity: Set Up tRPC Client (15 min)

```typescript
// src/lib/trpc.ts — client setup
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/server/root";

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
    }),
  ],
});
```

```typescript
// src/lib/trpc-react.ts — React hooks setup
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/root";

export const trpc = createTRPCReact<AppRouter>();
```

```tsx
// src/app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "@/lib/trpc-react";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [httpBatchLink({ url: "/api/trpc" })],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

### Activity: Using tRPC Queries (20 min)

```tsx
"use client";

import { trpc } from "@/lib/trpc-react";

export function ModuleList() {
  // Fully typed! Input and return type inferred from the router
  const { data: modules, isLoading, error } = trpc.modules.list.useQuery();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {modules?.map((mod) => (
        <ModuleCard key={mod.id} module={mod} />
      ))}
    </div>
  );
}
```

```tsx
// Query with input
function ModuleDetail({ slug }: { slug: string }) {
  const { data: module } = trpc.modules.bySlug.useQuery({ slug });
  // module is fully typed — TypeScript knows every field!
  return <h1>{module?.title}</h1>;
}
```

### Activity: Using tRPC Mutations (15 min)

```tsx
function CreateModuleForm() {
  const createModule = trpc.modules.create.useMutation({
    onSuccess: () => {
      // Invalidate the modules list to refetch
      utils.modules.list.invalidate();
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createModule.mutate({
      title: "New Module",
      slug: "new-module",
      description: "Description",
      order: 10,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={createModule.isPending}>
        {createModule.isPending ? "Creating..." : "Create Module"}
      </button>
      {createModule.error && <p>{createModule.error.message}</p>}
    </form>
  );
}
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add tRPC React client with queries and mutations"
git push
```

### Closing

- tRPC client setup, useQuery, useMutation, cache invalidation ✓
- Preview: Period 4 covers Server Actions

---

## Period 4: Server Actions

**Duration:** ~60 minutes

### Opening (5 min)

- Server Actions are Next.js's way to call server code directly from a form
- Simpler than tRPC for simple mutations — no API route needed
- Reading Advantage uses tRPC for most things, but Server Actions are useful for form submissions
- Today: understand when and how to use Server Actions

### Activity: Define a Server Action (15 min)

```typescript
// src/app/actions/progress.ts
"use server";

import { assertCan } from "@/auth/permissions";
import { db } from "@/db";
import { progress } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser, getCurrentTenant } from "@/auth/session";
import { z } from "zod";

const updateProgressSchema = z.object({
  lessonId: z.string().uuid(),
  status: z.enum(["not_started", "in_progress", "completed"]),
  score: z.number().int().min(0).max(100).optional(),
});

export async function updateProgress(formData: FormData) {
  const user = await getCurrentUser();
  const tenant = await getCurrentTenant();

  if (!user) throw new Error("Authentication required");

  assertCan(user, "progress:update", tenant);

  const input = updateProgressSchema.parse({
    lessonId: formData.get("lessonId"),
    status: formData.get("status"),
    score: formData.get("score") ? Number(formData.get("score")) : undefined,
  });

  await db
    .update(progress)
    .set({ status: input.status, score: input.score })
    .where(and(
      eq(progress.studentId, user.id),
      eq(progress.lessonId, input.lessonId),
    ));

  // Revalidate the page to show updated data
  revalidatePath("/modules");
}
```

### Activity: Use Server Action in a Form (15 min)

```tsx
// src/components/LessonCompleteButton.tsx
import { updateProgress } from "@/app/actions/progress";

export function LessonCompleteButton({ lessonId }: { lessonId: string }) {
  return (
    <form action={updateProgress}>
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="status" value="completed" />
      <button
        type="submit"
        className="rounded-lg bg-green-500 px-4 py-2 text-white"
      >
        Mark as Complete
      </button>
    </form>
  );
}
```

### Activity: Server Actions with useActionState (15 min)

```tsx
"use client";

import { useActionState } from "react";
import { submitQuizAction } from "@/app/actions/quiz";

export function QuizForm({ lessonId }: { lessonId: string }) {
  const [state, formAction, isPending] = useActionState(submitQuizAction, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="lessonId" value={lessonId} />
      {/* quiz questions */}
      <button type="submit" disabled={isPending}>
        {isPending ? "Submitting..." : "Submit Quiz"}
      </button>
      {state?.error && <p className="text-red-500">{state.error}</p>}
      {state?.score !== undefined && (
        <p className="text-green-600">Score: {state.score}%</p>
      )}
    </form>
  );
}
```

### Activity: tRPC vs Server Actions — When to Use Which (5 min)

| Use tRPC when | Use Server Actions when |
|---------------|----------------------|
| Complex queries with caching | Simple form submissions |
| Multiple consumers (web + mobile) | Only one Next.js app uses it |
| Need React Query caching/invalidation | Progressive enhancement (works without JS) |
| Complex input validation chains | Quick mutations that don't need cache management |

Reading Advantage: **tRPC for almost everything**, Server Actions only for specific form flows.

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add Server Actions for progress and quiz"
git push
```

### Closing

- Server Actions, form integration, useActionState, tRPC vs Server Actions ✓
- Preview: Period 5 wraps up with exercise and quiz

---

## Period 5: Exercise, Quiz

**Duration:** ~60 minutes

### Opening (5 min)

- tRPC & Server Actions unit nearly complete
- Today: exercise and quiz

### Activity: Exercise — Build a Blog API with tRPC (40 min)

**Exercise repo:** `codecamp-exercise-trpc-server-actions`

The intern forks the exercise repo which contains:
- The blog database from Unit 11's exercise (Drizzle schema + seed data)
- An empty tRPC setup
- A README with requirements

Requirements:
1. Create domain functions in `src/domain/`:
   - `getPosts({ db, user, tenant })` — list published posts for the tenant
   - `getPostBySlug({ db, user, tenant, input })` — single post by slug
   - `createPost({ db, user, tenant, input })` — create a post (assertCan first!)
   - `publishPost({ db, user, tenant, input })` — publish a draft (assertCan first!)
   - `addComment({ db, user, tenant, input })` — add a comment (assertCan first!)
2. Create tRPC routers in `src/server/routers/`:
   - `postsRouter` — list, bySlug, create, publish
   - `commentsRouter` — list for post, add
3. All mutations call `assertCan()` in the domain function (not the router)
4. Input validation with Zod schemas on all procedures
5. Merge routers into `appRouter` and export the type
6. Set up the API route handler
7. Create a frontend component that uses `trpc.posts.list.useQuery()` and `trpc.posts.create.useMutation()`

The intern creates a branch, implements, and opens a PR for LLM review.

### Quiz (10 min)

5 questions covering:

1. Where should business logic live? (in domain functions, not in routers)
2. What does `assertCan()` do and where is it called? (checks permissions, called first in every domain function before any mutation)
3. What makes tRPC "type-safe"? (the frontend automatically infers types from the router definition — no manual typing)
4. When should you use Server Actions instead of tRPC? (simple form submissions, progressive enhancement, single-consumer mutations)
5. What is the domain function signature? (`{ db, user, tenant, input }`)

### Closing

- tRPC & Server Actions unit complete — Student Progress Tracker has an API
- Next unit: Authentication — adding login, roles, and permissions
