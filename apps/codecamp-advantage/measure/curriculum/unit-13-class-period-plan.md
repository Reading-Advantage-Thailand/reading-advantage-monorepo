# Unit 13 Class Period Plans: Authentication

---

## Period 1: Session-Based Authentication

**Duration:** ~60 minutes

### Opening (5 min)

- Authentication = proving who you are
- Authorization = what you're allowed to do
- Today: implement login/logout with cookie-based sessions

### Activity: Sessions Table and Password Hashing (20 min)

```typescript
// Add to schema.ts
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Add password hash to students table
// In a real app, passwords would be in a separate table
export const students = pgTable("students", {
  // ... existing columns
  passwordHash: text("password_hash").notNull(),
});
```

```typescript
// src/auth/password.ts
import bcrypt from "bcrypt";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### Activity: Login Flow (20 min)

```typescript
// src/auth/session.ts
import { randomUUID } from "crypto";

export async function createSession(db: DB, userId: string): Promise<string> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

export async function getSession(db: DB, token: string) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token));

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return null;
  }

  // Get the user
  const [user] = await db
    .select()
    .from(students)
    .where(eq(students.id, session.userId));

  return user ?? null;
}

export async function deleteSession(db: DB, token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}
```

### Activity: Login Route Handler (10 min)

```typescript
// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/auth/password";
import { createSession, getSession } from "@/auth/session";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, password } = result.data;

  // Find user
  const [user] = await db.select().from(students).where(eq(students.email, email));
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Verify password
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Create session
  const token = await createSession(db, user.id);

  // Set cookie
  const response = NextResponse.json({ success: true });
  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
  });

  return response;
}
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add session-based authentication with login"
git push
```

### Closing

- Sessions, password hashing, login route ✓
- Preview: Period 2 covers logout and auth middleware

---

## Period 2: Logout, Middleware, and Auth Context

**Duration:** ~60 minutes

### Opening (5 min)

- Login is only half the battle — need logout, auth checks, and middleware
- Today: complete the auth flow

### Activity: Logout Route (10 min)

```typescript
// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { deleteSession } from "@/auth/session";

export async function POST(request: Request) {
  const token = request.cookies.get("session")?.value;

  if (token) {
    await deleteSession(db, token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0, // Delete the cookie
    path: "/",
  });

  return response;
}
```

### Activity: Auth Middleware (15 min)

```typescript
// src/middleware.ts — protect routes
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("session")?.value;

  // Protected routes
  const protectedPaths = ["/modules", "/progress", "/chat"];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already logged in → redirect away from login page
  if (request.nextUrl.pathname === "/login" && sessionToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/modules/:path*", "/progress/:path*", "/chat/:path*", "/login"],
};
```

### Activity: tRPC Context with Auth (15 min)

```typescript
// src/server/trpc.ts — add auth to tRPC context
import { getSession } from "@/auth/session";

export async function createContext(request: Request): Promise<Context> {
  const sessionToken = request.cookies.get("session")?.value;
  const user = sessionToken ? await getSession(db, sessionToken) : null;
  const tenant = user ? { schoolId: user.schoolId } : { schoolId: "" };

  return { db, user, tenant };
}
```

```typescript
// protectedProcedure now guarantees user is not null
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
```

### Activity: Frontend Auth Context (10 min)

```tsx
// src/hooks/useAuth.tsx — client-side auth state
"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "teacher" | "admin";
  schoolId: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check session on mount
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Login failed");
    const data = await res.json();
    setUser(data.user);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add logout, auth middleware, and frontend auth context"
git push
```

### Closing

- Logout, middleware, tRPC auth context, frontend auth ✓
- Preview: Period 3 covers RBAC with assertCan

---

## Period 3: Role-Based Access Control (RBAC)

**Duration:** ~60 minutes

### Opening (5 min)

- Different users have different permissions
- RBAC = Role-Based Access Control
- The `assertCan()` pattern from Unit 12 now has real auth to check

### Activity: Define Roles and Permissions (15 min)

```typescript
// src/auth/permissions.ts
type Role = "student" | "teacher" | "admin";
type Permission = string;

const ROLE_HIERARCHY: Role[] = ["student", "teacher", "admin"];

const PERMISSIONS: Record<Role, Permission[]> = {
  student: [
    "module:read",
    "lesson:read",
    "progress:read",
    "progress:update",
    "quiz:submit",
    "chat:use",
  ],
  teacher: [
    // Inherits student permissions + these:
    "module:read",
    "lesson:read",
    "progress:read",
    "progress:update",
    "quiz:submit",
    "chat:use",
    "student:read",     // Can see student progress
    "student:list",     // Can list students in their school
  ],
  admin: [
    // Inherits everything + these:
    "module:read",
    "module:create",
    "module:update",
    "lesson:read",
    "lesson:create",
    "progress:read",
    "progress:update",
    "quiz:submit",
    "chat:use",
    "student:read",
    "student:list",
    "student:create",   // Can create student accounts
    "student:update",
  ],
};

export function assertCan(user: User, permission: Permission, tenant: Tenant) {
  const allowed = PERMISSIONS[user.role] ?? [];
  if (!allowed.includes(permission)) {
    throw new AuthError(
      `Permission denied: role '${user.role}' cannot '${permission}'`
    );
  }

  // Verify tenant — user can only access their own school
  if (user.schoolId !== tenant.schoolId) {
    throw new AuthError("Access denied: wrong school");
  }
}
```

### Activity: Apply assertCan to Domain Functions (20 min)

```typescript
// src/domain/progress/index.ts
export async function updateProgress({ db, user, tenant, input }: {
  db: DB; user: User; tenant: Tenant; input: UpdateProgressInput;
}) {
  // Permission check — only the student themselves (or admin) can update
  assertCan(user, "progress:update", tenant);

  if (user.role === "student" && input.studentId !== user.id) {
    throw new AuthError("Students can only update their own progress");
  }

  const [result] = await db
    .update(progress)
    .set({ status: input.status, score: input.score })
    .where(and(
      eq(progress.studentId, input.studentId),
      eq(progress.lessonId, input.lessonId),
      eq(progress.schoolId, tenant.schoolId)
    ))
    .returning();

  return result;
}

// src/domain/students/index.ts
export async function listStudents({ db, user, tenant }: {
  db: DB; user: User; tenant: Tenant;
}) {
  assertCan(user, "student:list", tenant);  // Only teachers and admins

  return db
    .select()
    .from(students)
    .where(eq(students.schoolId, tenant.schoolId));
}

export async function createStudent({ db, user, tenant, input }: {
  db: DB; user: User; tenant: Tenant; input: CreateStudentInput;
}) {
  assertCan(user, "student:create", tenant);  // Only admins

  const passwordHash = await hashPassword(input.password);
  const [result] = await db
    .insert(students)
    .values({
      ...input,
      passwordHash,
      schoolId: tenant.schoolId,
    })
    .returning();

  return result;
}
```

### Activity: Conditional UI Based on Role (15 min)

```tsx
// src/components/AdminOnly.tsx
"use client";
import { useAuth } from "@/hooks/useAuth";

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "admin") return null;
  return <>{children}</>;
}

// Usage
<AdminOnly>
  <button onClick={() => createModule.mutate(...)}>Create Module</button>
</AdminOnly>
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add RBAC with assertCan and role-based UI"
git push
```

### Closing

- RBAC, assertCan in domain functions, role-based UI ✓
- Preview: Period 4 wraps up with exercise and quiz

---

## Period 4: Exercise, Quiz

**Duration:** ~60 minutes

### Opening (5 min)

- Authentication unit nearly complete
- **Phase C is almost done!**
- Today: exercise and quiz

### Activity: Exercise — Add Auth to the Blog API (40 min)

**Exercise repo:** `codecamp-exercise-authentication`

The intern forks the exercise repo which contains:
- The blog tRPC API from Unit 12's exercise
- A sessions table already defined in the schema
- A README with requirements

Requirements:
1. Add a `users` table with `passwordHash` and `role` (author, editor, admin) columns
2. Implement `POST /api/auth/login` — email + password → session cookie
3. Implement `POST /api/auth/logout` — delete session
4. Implement `GET /api/auth/session` — return current user
5. Add middleware to protect `/posts/create` and `/admin/*` routes
6. Add `assertCan()` to every domain function:
   - `getPosts` — anyone can read published posts
   - `createPost` — only author, editor, admin
   - `publishPost` — only editor, admin
   - `addComment` — any authenticated user
7. Add `protectedProcedure` to all mutation procedures
8. Create a login page component with email/password form
9. Create a `useAuth` hook and `AuthProvider` context
10. Show "Create Post" button only for users with the author role

The intern creates a branch, implements, and opens a PR for LLM review.

### Quiz (10 min)

5 questions covering:

1. Why use `httpOnly` cookies for session tokens? (prevents JavaScript access — protects against XSS)
2. What is the difference between authentication and authorization? (authentication = who you are; authorization = what you can do)
3. Where should `assertCan()` be called? (in the domain function, before any mutation — never only in the router)
4. What does RBAC stand for? (Role-Based Access Control — permissions assigned to roles, not individuals)
5. Why check `user.schoolId !== tenant.schoolId`? (multi-tenant security — prevents cross-school data access)

### Closing

- **Authentication unit complete**
- **Phase C complete!** The Student Progress Tracker has a database, API, and auth
- Next: Phase D — Production (i18n, AI, monorepo, Docker, real-world practice)
