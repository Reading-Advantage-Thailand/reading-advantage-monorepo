# Unit 10 Class Period Plans: Next.js 16 — Advanced

---

## Period 1: Route Handlers

**Duration:** ~60 minutes

### Opening (5 min)

- Route Handlers are Next.js's way of building API endpoints
- They live in `app/api/.../route.ts`
- Used in Reading Advantage for webhooks and lightweight endpoints (tRPC handles most APIs)
- Today: build API endpoints for quiz submission

### Activity: GET and POST Route Handlers (20 min)

```typescript
// src/app/api/modules/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const modules = await fetchModules();
  return NextResponse.json(modules);
}

export async function POST(request: Request) {
  const body = await request.json();

  // Validate with Zod
  const result = createModuleSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid input", details: result.error.issues },
      { status: 400 }
    );
  }

  const newModule = await createModule(result.data);
  return NextResponse.json(newModule, { status: 201 });
}
```

### Activity: Dynamic Route Handlers (15 min)

```typescript
// src/app/api/quizzes/[lessonId]/route.ts
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  const body = await request.json();

  // Validate
  const result = submitQuizSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Score the quiz
  const questions = await getQuizQuestions(lessonId);
  const score = calculateScore(questions, result.data.answers);

  // Save progress
  await saveQuizResult(lessonId, score);

  return NextResponse.json({ score, total: questions.length });
}
```

### Activity: Error Handling in Route Handlers (15 min)

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // ... process
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add API route handlers for modules and quizzes"
git push
```

### Closing

- Route Handlers (GET, POST, dynamic segments, error handling) ✓
- Preview: Period 2 covers middleware

---

## Period 2: Middleware

**Duration:** ~60 minutes

### Opening (5 min)

- Middleware runs before a request reaches a page or API route
- It can inspect, redirect, rewrite, or modify the response
- Used in Reading Advantage for auth checks and locale detection
- Today: add auth middleware

### Activity: Basic Middleware (15 min)

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // This runs on every request
  console.log(`Request: ${request.nextUrl.pathname}`);
  return NextResponse.next();
}

// Limit which routes middleware runs on
export const config = {
  matcher: [
    "/modules/:path*",   // Only run on /modules/*
    "/chat/:path*",      // Only run on /chat/*
    "/api/((?!auth).)*", // All API routes except /api/auth/*
  ],
};
```

### Activity: Auth Middleware (20 min)

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("session")?.value;

  // No session → redirect to login
  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Add user ID header for downstream use
  const response = NextResponse.next();
  response.headers.set("x-user-id", decodeSessionToken(sessionToken));
  return response;
}

export const config = {
  matcher: ["/modules/:path*", "/chat/:path*"],
};
```

### Activity: Middleware Patterns (15 min)

```typescript
// Redirect old URLs
if (request.nextUrl.pathname.startsWith("/course/")) {
  const newUrl = request.nextUrl.pathname.replace("/course/", "/modules/");
  return NextResponse.redirect(new URL(newUrl, request.url));
}

// Rewrite (URL stays the same, content comes from elsewhere)
if (request.nextUrl.pathname === "/dashboard") {
  return NextResponse.rewrite(new URL("/", request.url));
}

// Add CORS headers for API routes
if (request.nextUrl.pathname.startsWith("/api/")) {
  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return response;
}
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add auth middleware with session check"
git push
```

### Closing

- Middleware: redirect, rewrite, headers, auth ✓
- Preview: Period 3 covers error boundaries and streaming

---

## Period 3: Error Boundaries and Streaming

**Duration:** ~60 minutes

### Opening (5 min)

- Errors happen — handle them gracefully
- Streaming sends parts of the page as they're ready, instead of waiting for everything
- Today: robust error handling and streaming with Suspense

### Activity: Error Boundaries (20 min)

```tsx
// src/app/error.tsx — catches errors in Server Components
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h2 className="text-2xl font-bold text-red-600">Something went wrong!</h2>
      <p className="mt-2 text-gray-500">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white"
      >
        Try again
      </button>
    </div>
  );
}
```

```tsx
// src/app/not-found.tsx — handles 404s
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h2 className="text-4xl font-bold">404</h2>
      <p className="mt-2 text-gray-500">Page not found</p>
      <Link href="/" className="mt-4 text-blue-500 hover:underline">
        Go home
      </Link>
    </div>
  );
}
```

### Activity: Streaming with Suspense (25 min)

```tsx
// src/app/page.tsx — stream parts of the page independently
import { Suspense } from "react";

export default function HomePage() {
  return (
    <div>
      {/* Header renders immediately (no data fetch) */}
      <h1>Learning Dashboard</h1>

      {/* Module list streams in when ready */}
      <Suspense fallback={<ModuleGridSkeleton />}>
        <ModuleList />
      </Suspense>

      {/* Progress summary streams in independently */}
      <Suspense fallback={<ProgressSkeleton />}>
        <ProgressSummary />
      </Suspense>
    </div>
  );
}
```

Each Suspense boundary loads independently:
1. Header → immediate
2. Module list → streams when data is ready
3. Progress summary → streams when data is ready

If one fails, the others still show. Users see content progressively.

```tsx
// ModuleList is a Server Component that fetches its own data
async function ModuleList() {
  const modules = await getModules();
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {modules.map((mod) => <ModuleCard key={mod.id} module={mod} />)}
    </div>
  );
}
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add error boundaries and streaming with Suspense"
git push
```

### Closing (5 min)

- Error boundaries, not-found, streaming, Suspense ✓
- Preview: Period 4 covers optimization

---

## Period 4: Image, Font, and Metadata Optimization

**Duration:** ~60 minutes

### Opening (5 min)

- Performance matters — especially on slow connections
- Next.js provides built-in optimizations for images, fonts, and metadata
- Today: optimize assets and SEO

### Activity: next/image (20 min)

```tsx
import Image from "next/image";

// Automatic optimization: lazy loading, resize, WebP conversion
<Image
  src="/photos/team.jpg"
  alt="Team photo"
  width={800}
  height={600}
  priority  // Load eagerly (above-the-fold images)
/>

// Remote images — must configure domains
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

<Image
  src="https://avatars.githubusercontent.com/u/12345"
  alt="Profile"
  width={48}
  height={48}
  className="rounded-full"
/>
```

Benefits over `<img>`:
- Automatic lazy loading (images below the fold)
- Automatic WebP/AVIF conversion (smaller files)
- Responsive srcset (serves the right size for each device)
- Prevents layout shift (requires width/height)

### Activity: next/font (15 min)

```tsx
// src/app/layout.tsx
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

Benefits over `<link>`:
- Zero layout shift (font is preloaded)
- Privacy (no Google Analytics tracking)
- Faster (fonts are self-hosted by Next.js)

### Activity: Metadata API (15 min)

```tsx
// Static metadata
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learning Dashboard",
  description: "Track your codecamp progress",
};

// Dynamic metadata (for dynamic routes)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const module = await getModule(slug);

  return {
    title: `${module.title} — Learning Dashboard`,
    description: module.description,
  };
}
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add next/image, next/font, and metadata optimization"
git push
```

### Closing

- Image optimization, font optimization, metadata ✓
- Preview: Period 5 wraps up with exercise and quiz

---

## Period 5: Exercise, Quiz

**Duration:** ~60 minutes

### Opening (5 min)

- Next.js Advanced unit nearly complete — Phase B is almost done!
- Today: exercise and quiz

### Activity: Exercise — Add API Routes and Streaming (40 min)

**Exercise repo:** `codecamp-nextjs-advanced-exercise`

The intern forks the exercise repo which contains:
- A Next.js 16.0.0 app with basic pages (from Unit 09 exercise)
- A json-server backend
- A README with requirements

Requirements:
1. Create `POST /api/notes` route handler with Zod validation (title, content, category)
2. Create `GET /api/notes` route handler that returns notes, optionally filtered by category
3. Create `DELETE /api/notes/[id]` route handler
4. Add middleware that logs request method + path + duration (ms)
5. Add middleware that checks for a mock session cookie on `/notes/*` routes (redirect to `/login` if missing)
6. Wrap the notes list in a `<Suspense>` boundary with a skeleton fallback
7. Add `error.tsx` for the notes page with a "Try again" button
8. Add `not-found.tsx` for the app
9. Use `next/image` for any user avatars
10. Add dynamic `generateMetadata` for the note detail page

The intern creates a branch, implements, and opens a PR for LLM review.

### Quiz (10 min)

5 questions covering:

1. What file do you create for an API endpoint in the App Router? (`route.ts` in the appropriate `app/api/` directory)
2. When does Next.js middleware run? (before the request reaches a page or API route)
3. How does streaming improve user experience? (users see content progressively instead of waiting for the entire page)
4. Why use `next/image` instead of `<img>`? (automatic lazy loading, resizing, WebP conversion, layout shift prevention)
5. What is the difference between `error.tsx` and `not-found.tsx`? (error catches runtime errors, not-found handles 404s when a page doesn't exist)

### Closing

- **Next.js Advanced unit complete**
- **Phase B complete!** The Learning Dashboard is a polished Next.js app
- Next: Phase C — Backend & Data (databases, tRPC, auth)
