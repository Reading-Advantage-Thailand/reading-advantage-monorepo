# Unit 09 Class Period Plans: Next.js 16 — Basics

---

## Period 1: App Router File Conventions

**Duration:** ~60 minutes

### Opening (5 min)

- Next.js 16.0.0 is the framework used by all Reading Advantage apps
- The App Router uses the file system to define routes — no router config file
- Today: understand the file conventions and create the first Next.js app

### Activity: Create a Next.js Project (10 min)

```bash
mkdir learning-dashboard-next
cd learning-dashboard-next
pnpm create next-app . --typescript --tailwind --app --src-dir --no-eslint
# Or manually: pnpm add next@16.0.0 react@19.2.5 react-dom@19.2.5
```

Project structure:
```
src/app/
├── layout.tsx       # Root layout (wraps everything)
├── page.tsx         # Home page (/)
├── globals.css      # Global styles
├── modules/
│   ├── page.tsx     # Module list (/modules)
│   └── [slug]/
│       └── page.tsx # Module detail (/modules/:slug)
├── loading.tsx      # Auto loading state
└── error.tsx        # Auto error boundary
```

### Activity: Key File Conventions (20 min)

```tsx
// layout.tsx — wraps all pages, persists across navigation
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <a href="/">Dashboard</a>
          <a href="/modules">Modules</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
```

```tsx
// page.tsx — defines the UI for a route
export default function HomePage() {
  return <h1>Welcome to the Learning Dashboard</h1>;
}
```

```tsx
// loading.tsx — shown while the page is loading (Suspense)
export default function Loading() {
  return <div className="animate-pulse">Loading...</div>;
}
```

```tsx
// error.tsx — shown when the page throws an error
"use client"; // Error components must be client components

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Activity: Migrate the Dashboard Layout (20 min)

Convert the SPA's header and layout into Next.js:

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learning Dashboard",
  description: "Track your codecamp progress",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <header className="border-b bg-white px-6 py-4">
          <h1 className="text-2xl font-bold">Learning Dashboard</h1>
        </header>
        <main className="container mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
```

### Activity: Commit (5 min)

```bash
git init && git add -A && git commit -m "feat: scaffold Next.js app with App Router"
```

Create GitHub repo and push.

### Closing

- File conventions: layout, page, loading, error ✓
- Preview: Period 2 covers Server Components vs Client Components

---

## Period 2: Server Components vs Client Components

**Duration:** ~60 minutes

### Opening (5 min)

- The biggest mental shift in the App Router: components are Server Components by default
- Server Components run on the server, Client Components run in the browser
- Understanding the boundary is critical for performance and correctness

### Activity: Server Components (default) (20 min)

```tsx
// This is a Server Component — it runs on the server
// No "use client" directive needed

// ✅ Can do: async/await, direct database access, keep secrets safe
export default async function ModuleList() {
  // Data fetching happens ON THE SERVER — no loading state needed!
  const modules = await fetchModules();

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {modules.map((mod) => (
        <ModuleCard key={mod.id} module={mod} />
      ))}
    </div>
  );
}
```

What Server Components can do:
- Fetch data directly (no useEffect)
- Access server-only resources (database, file system, env vars)
- Keep sensitive information on the server
- Reduce client-side JavaScript bundle size

What Server Components **cannot** do:
- Use `useState`, `useEffect`, or other hooks
- Handle events (onClick, onChange)
- Use browser-only APIs (localStorage, window)

### Activity: Client Components ("use client") (20 min)

```tsx
"use client"; // This directive makes it a Client Component

import { useState } from "react";

export function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState("");

  return (
    <input
      value={query}
      onChange={(e) => {
        setQuery(e.target.value);
        onSearch(e.target.value);
      }}
    />
  );
}
```

**The boundary rule:** `"use client"` marks the boundary. Components imported by a Client Component are also Client Components. Components imported by a Server Component are Server Components (unless they have `"use client"`).

### Activity: Composition Pattern — Server wraps Client (10 min)

```tsx
// Server Component (default)
// src/app/modules/page.tsx
import { ModuleList } from "./module-list";
import { ModuleSearch } from "./module-search";

export default async function ModulesPage() {
  const modules = await fetchModules(); // Server-side fetch

  return (
    <div>
      <ModuleSearch />  {/* Client Component — handles input */}
      <ModuleList modules={modules} />  {/* Server Component — renders data */}
    </div>
  );
}
```

**Best practice:** Push `"use client"` as far down the tree as possible. Keep parent components as Server Components for maximum performance.

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: separate server and client components"
git push
```

### Closing

- Server vs Client components, the boundary, composition pattern ✓
- Preview: Period 3 covers data fetching in Server Components

---

## Period 3: Data Fetching in Server Components

**Duration:** ~60 minutes

### Opening (5 min)

- No more `useEffect` for data fetching in the App Router
- Server Components fetch data directly with async/await
- This is how all Reading Advantage pages work

### Activity: Server-Side Data Fetching (20 min)

```tsx
// src/app/page.tsx — Home page with server-side data
import { ModuleCard } from "@/components/module-card";

async function getModules() {
  const response = await fetch("http://localhost:3001/modules", {
    cache: "no-store", // Always fresh (like SSR)
  });

  if (!response.ok) throw new Error("Failed to fetch modules");
  return response.json() as Promise<Module[]>;
}

export default async function HomePage() {
  const modules = await getModules();

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {modules.map((mod) => (
        <ModuleCard key={mod.id} module={mod} />
      ))}
    </div>
  );
}
```

**Caching strategies:**

```typescript
// Default: cached until revalidated (like SSG)
fetch(url);

// Always fresh (like SSR)
fetch(url, { cache: "no-store" });

// Revalidate every 60 seconds (like ISR)
fetch(url, { next: { revalidate: 60 } });
```

### Activity: Parallel Data Fetching (15 min)

```tsx
// Fetch multiple resources in parallel — much faster than sequential
export default async function ModuleDetailPage({ params }: { params: { slug: string } }) {
  // These run in parallel, not sequentially!
  const [module, lessons, progress] = await Promise.all([
    getModule(params.slug),
    getLessons(params.slug),
    getProgress(params.slug),
  ]);

  return (
    <div>
      <ModuleHeader module={module} />
      <LessonList lessons={lessons} progress={progress} />
    </div>
  );
}
```

### Activity: Loading States with Suspense (15 min)

```tsx
// src/app/modules/loading.tsx — automatic loading UI
export default function Loading() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-200" />
      ))}
    </div>
  );
}
```

Next.js automatically wraps Server Component pages in Suspense and shows the `loading.tsx` while data is being fetched.

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add server-side data fetching with loading states"
git push
```

### Closing

- Server-side fetch, caching, parallel fetching, loading.tsx ✓
- Preview: Period 4 covers dynamic routes and navigation

---

## Period 4: Dynamic Routes and Navigation

**Duration:** ~60 minutes

### Opening (5 min)

- Dynamic routes handle URLs with variable segments: `/modules/react-basics`
- Next.js navigation uses `<Link>` for client-side transitions
- Today: build multi-page navigation

### Activity: Dynamic Route Segments (20 min)

```
File structure:
src/app/modules/[slug]/page.tsx  →  /modules/react-basics
src/app/modules/[slug]/page.tsx  →  /modules/git-github
```

```tsx
// src/app/modules/[slug]/page.tsx
interface ModuleDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ModuleDetailPage({ params }: ModuleDetailPageProps) {
  const { slug } = await params;
  const module = await getModule(slug);

  if (!module) {
    return <div>Module not found</div>;
  }

  return (
    <div>
      <h1>{module.title}</h1>
      <p>{module.description}</p>
      <LessonList lessons={module.lessons} />
    </div>
  );
}
```

Note: In Next.js 16, `params` is a Promise — you must `await` it.

### Activity: Navigation with `<Link>` (15 min)

```tsx
import Link from "next/link";

// Client-side navigation — no full page reload!
<Link href="/modules">All Modules</Link>
<Link href={`/modules/${module.slug}`}>{module.title}</Link>

// vs. <a> tag — full page reload (avoid for internal links)
<a href="/modules">All Modules</a>  // ❌ Don't do this for internal navigation
```

```tsx
// ModuleCard with Link
export function ModuleCard({ module }: { module: Module }) {
  return (
    <Link href={`/modules/${module.slug}`} className="block rounded-lg border p-6">
      <h3>{module.title}</h3>
      <p>{module.description}</p>
      <div className="mt-4 h-2 rounded-full bg-gray-200">
        <div className="h-full bg-blue-500" style={{ width: `${module.progress}%` }} />
      </div>
    </Link>
  );
}
```

### Activity: Programmatic Navigation (10 min)

```tsx
"use client";

import { useRouter } from "next/navigation";

export function QuizComplete({ moduleSlug }: { moduleSlug: string }) {
  const router = useRouter();

  return (
    <div>
      <p>Quiz complete!</p>
      <button onClick={() => router.push(`/modules/${moduleSlug}`)}>
        Back to Module
      </button>
    </div>
  );
}
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add dynamic routes and Link navigation"
git push
```

### Closing (5 min)

- Dynamic routes, `<Link>`, `useRouter` ✓
- Preview: Period 5 covers layouts and nested routing

---

## Period 5: Layouts and Nested Routing

**Duration:** ~60 minutes

### Opening (5 min)

- Layouts wrap pages and persist across navigation
- Nested layouts allow different UI shells for different route groups
- Today: build a proper layout hierarchy

### Activity: Layout Hierarchy (20 min)

```
Root Layout (app/layout.tsx)
└── Modules Layout (app/modules/layout.tsx)
    └── Module Detail Layout (app/modules/[slug]/layout.tsx)
```

```tsx
// src/app/layout.tsx — root layout (required)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/">Dashboard</Link>
          <Link href="/modules">Modules</Link>
          <Link href="/chat">Chat</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
```

```tsx
// src/app/modules/layout.tsx — modules-specific layout
export default function ModulesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <aside className="w-64 border-r p-4">
        <h2>Modules</h2>
        <ModuleSidebar /> {/* Server Component fetching module list */}
      </aside>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
```

### Activity: Route Groups (15 min)

Route groups `(folder)` don't create URL segments — they organize routes:

```
app/
├── (dashboard)/       → No URL segment
│   ├── layout.tsx     → Dashboard layout (sidebar + header)
│   ├── page.tsx       → / (home)
│   └── modules/
├── (auth)/            → No URL segment
│   ├── layout.tsx     → Auth layout (centered card)
│   └── login/
│       └── page.tsx   → /login
```

### Activity: Build the Full Layout (15 min)

Migrate the SPA's full layout structure into Next.js:

- Root layout: `<html>`, `<body>`, global nav
- Dashboard layout: sidebar with module list
- Module detail layout: breadcrumbs, back navigation

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add nested layouts and route groups"
git push
```

### Closing

- Layouts, nested layouts, route groups ✓
- Preview: Period 6 wraps up with exercise and quiz

---

## Period 6: Exercise, Quiz

**Duration:** ~60 minutes

### Opening (5 min)

- Next.js basics complete
- Today: exercise and quiz

### Activity: Exercise — Build a Multi-Page Next.js App (40 min)

**Exercise repo:** `codecamp-nextjs-basics-exercise`

The intern forks the exercise repo which contains:
- A json-server with `modules`, `lessons`, and `progress` resources
- An empty Next.js 16.0.0 project
- A README with requirements

Requirements:
1. Create a home page that fetches and displays modules (Server Component)
2. Create `/modules/[slug]` dynamic route for module detail
3. Create `/modules/[slug]/lessons/[id]` for individual lesson view
4. Add a root layout with navigation (`<Link>` components)
5. Add a `loading.tsx` for the modules page (skeleton cards)
6. Add an `error.tsx` for the module detail page (with retry button)
7. Use Server Components for data fetching — no `useEffect`
8. Add `"use client"` only where needed (search bar, interactive quiz)
9. Fetch module list in a layout sidebar for navigation
10. Use `Promise.all` for parallel data fetching on the module detail page

The intern creates a branch, implements, and opens a PR for LLM review.

### Quiz (10 min)

5 questions covering:

1. What file defines a route's UI in the App Router? (`page.tsx`)
2. When do you need `"use client"`? (when using hooks, event handlers, or browser APIs)
3. How do you fetch data in a Server Component? (async/await directly in the component — no useEffect)
4. What does `loading.tsx` do? (automatic loading UI shown via Suspense while the page loads)
5. What is the difference between `<Link>` and `<a>` for internal navigation? (`<Link>` does client-side navigation without a full page reload)

### Closing

- Next.js Basics unit complete — Learning Dashboard is now a Next.js app
- Next unit: Next.js 16 — Advanced
