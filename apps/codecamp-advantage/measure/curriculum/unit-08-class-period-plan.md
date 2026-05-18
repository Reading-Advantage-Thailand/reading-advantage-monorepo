# Unit 08 Class Period Plans: API Fundamentals

---

## Period 1: HTTP and REST Basics

**Duration:** ~60 minutes

### Opening (5 min)

- APIs are how the frontend talks to the backend
- The Reading Advantage frontend talks to the backend via tRPC (type-safe) — but underneath it's still HTTP
- Today: understand HTTP methods, status codes, and REST conventions

### Activity: HTTP Request/Response Anatomy (20 min)

```
REQUEST:
POST /api/modules HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Authorization: Bearer abc123

{"title": "React", "description": "Learn React"}

---

RESPONSE:
HTTP/1.1 201 Created
Content-Type: application/json

{"id": "7", "title": "React", "description": "Learn React"}
```

**HTTP Methods and their meanings:**

| Method | Purpose | Idempotent | Safe |
|--------|---------|-----------|------|
| GET | Read data | Yes | Yes |
| POST | Create data | No | No |
| PUT | Replace data | Yes | No |
| PATCH | Partial update | No | No |
| DELETE | Remove data | Yes | No |

- **Idempotent**: making the same request multiple times produces the same result
- **Safe**: doesn't modify data (read-only)

### Activity: HTTP Status Codes (15 min)

| Range | Meaning | Common Codes |
|-------|---------|-------------|
| 200–299 | Success | 200 OK, 201 Created, 204 No Content |
| 300–399 | Redirection | 301 Moved Permanently, 304 Not Modified |
| 400–499 | Client error | 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable |
| 500–599 | Server error | 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable |

### Activity: REST URL Conventions (15 min)

```
GET    /api/modules          → List all modules
GET    /api/modules/7        → Get module 7
POST   /api/modules          → Create a new module
PUT    /api/modules/7        → Replace module 7 entirely
PATCH  /api/modules/7        → Update module 7 partially
DELETE /api/modules/7        → Delete module 7

GET    /api/modules/7/lessons     → List lessons in module 7
POST   /api/modules/7/lessons     → Add a lesson to module 7
GET    /api/modules/7/lessons/3   → Get lesson 3 in module 7
```

Rules:
- URLs are nouns (resources), not verbs (`/modules` not `/getModules`)
- Plural for collections (`/modules` not `/module`)
- Nested resources show relationships

### Activity: Set Up Mock API with json-server (5 min)

```bash
pnpm add -D json-server
```

Create `db.json`:
```json
{
  "modules": [
    { "id": "1", "title": "Dev Environment", "description": "Set up tools", "progress": 100 },
    { "id": "2", "title": "Git & GitHub", "description": "Version control", "progress": 75 }
  ],
  "lessons": [
    { "id": "1", "moduleId": "1", "title": "Terminal Basics", "type": "theory" },
    { "id": "2", "moduleId": "1", "title": "VS Code Setup", "type": "exercise" }
  ]
}
```

Add to `package.json`:
```json
{ "scripts": { "api": "json-server --watch db.json --port 3001" } }
```

### Closing

- HTTP methods, status codes, REST conventions ✓
- Preview: Period 2 covers Fetch API in depth

---

## Period 2: Fetch API — GET Requests

**Duration:** ~60 minutes

### Opening (5 min)

- The Fetch API is the modern way to make HTTP requests in JavaScript
- Today: make GET requests, parse JSON, handle loading and errors

### Activity: Basic GET Request (20 min)

```typescript
// src/api/client.ts
const API_BASE = "http://localhost:3001";

export async function fetchModules() {
  const response = await fetch(`${API_BASE}/modules`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<Module[]>;
}

export async function fetchModule(id: string) {
  const response = await fetch(`${API_BASE}/modules/${id}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Module not found");
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<Module>;
}
```

### Activity: Integrate with React — useApi Hook (20 min)

```typescript
// src/hooks/useApi.ts
import { useState, useEffect } from "react";

type ApiState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<ApiState<T>>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setState({ status: "loading" });
      try {
        const data = await fetcher();
        if (!cancelled) setState({ status: "success", data });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    };

    fetchData();

    return () => { cancelled = true; };
  }, deps);

  return state;
}
```

```tsx
// Usage in App
function ModuleList() {
  const state = useApi(() => fetchModules(), []);

  switch (state.status) {
    case "idle":
    case "loading":
      return <ModuleCardSkeleton count={3} />;
    case "error":
      return <ErrorBanner>{state.error}</ErrorBanner>;
    case "success":
      return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {state.data.map((mod) => (
            <ModuleCard key={mod.id} {...mod} />
          ))}
        </div>
      );
  }
}
```

### Activity: Commit (5 min)

```bash
git add -A
git commit -m "feat: add API client with useApi hook for GET requests"
git push
```

### Closing (5 min)

- Fetch GET, useApi hook, discriminated union state ✓
- Preview: Period 3 covers POST, PUT, DELETE

---

## Period 3: Fetch API — POST, PUT, PATCH, DELETE

**Duration:** ~60 minutes

### Opening (5 min)

- GET is for reading — today: create, update, and delete data
- These are "mutations" — they change server state

### Activity: POST — Creating Data (15 min)

```typescript
export async function createModule(input: { title: string; description: string }) {
  const response = await fetch(`${API_BASE}/modules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<Module>;
}
```

### Activity: PATCH — Partial Updates (10 min)

```typescript
export async function updateModuleProgress(id: string, progress: number) {
  const response = await fetch(`${API_BASE}/modules/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ progress }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<Module>;
}
```

### Activity: DELETE — Removing Data (10 min)

```typescript
export async function deleteModule(id: string) {
  const response = await fetch(`${API_BASE}/modules/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // 204 No Content — no body to parse
  if (response.status === 204) return null;
  return response.json();
}
```

### Activity: Mutation Hook with Optimistic Updates (20 min)

```typescript
// src/hooks/useMutation.ts
import { useState, useCallback } from "react";

export function useMutation<TInput, TOutput>(
  mutationFn: (input: TInput) => Promise<TOutput>
) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TOutput | null>(null);

  const mutate = useCallback(async (input: TInput) => {
    setIsPending(true);
    setError(null);
    try {
      const result = await mutationFn(input);
      setData(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Mutation failed";
      setError(message);
      throw err;
    } finally {
      setIsPending(false);
    }
  }, [mutationFn]);

  return { mutate, isPending, error, data };
}
```

```tsx
// Usage: submit quiz
function QuizSubmit({ lessonId, answers }: { lessonId: string; answers: Record<string, string> }) {
  const { mutate, isPending, error, data } = useMutation(submitQuiz);

  const handleSubmit = () => {
    mutate({ lessonId, answers });
  };

  return (
    <>
      <button onClick={handleSubmit} disabled={isPending}>
        {isPending ? "Submitting..." : "Submit Quiz"}
      </button>
      {error && <p className="text-red-500">{error}</p>}
      {data && <p className="text-green-600">Score: {data.score}%</p>}
    </>
  );
}
```

### Activity: Commit (5 min)

```bash
git add -A
git commit -m "feat: add mutation API client and useMutation hook"
git push
```

### Closing

- POST, PUT, PATCH, DELETE, useMutation hook ✓
- Preview: Period 4 covers error handling patterns

---

## Period 4: Error Handling Patterns

**Duration:** ~60 minutes

### Opening (5 min)

- APIs fail — network drops, servers crash, users send bad data
- Good error handling keeps the app usable even when things go wrong
- Today: robust error handling patterns

### Activity: Error Classification (15 min)

```typescript
class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: unknown
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}
```

### Activity: Typed API Client (20 min)

```typescript
// src/api/client.ts — robust version
export async function apiClient<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new ApiError(response.status, response.statusText, body);
    }

    if (response.status === 204) return null as T;
    return response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new NetworkError(
      error instanceof Error ? error.message : "Network request failed"
    );
  }
}
```

### Activity: User-Facing Error Handling (15 min)

```tsx
// src/components/ErrorHandler.tsx
export function ErrorDisplay({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (isNetworkError(error)) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-800">Network Error</p>
        <p className="mt-1 text-sm text-red-600">
          Could not connect to the server. Check your internet connection.
        </p>
        {onRetry && (
          <button onClick={onRetry} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-white">
            Retry
          </button>
        )}
      </div>
    );
  }

  if (isApiError(error)) {
    if (error.status === 401) {
      return <p className="text-amber-600">Please log in to continue.</p>;
    }
    if (error.status === 404) {
      return <p className="text-gray-500">The requested resource was not found.</p>;
    }
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">Server error ({error.status})</p>
        <p className="text-sm text-red-600">{error.statusText}</p>
      </div>
    );
  }

  return <p className="text-red-600">An unexpected error occurred.</p>;
}
```

### Activity: Commit (5 min)

```bash
git add -A
git commit -m "feat: add typed API client with error classification"
git push
```

### Closing (5 min)

- Error classification, typed API client, user-facing error display ✓
- Preview: Period 5 wraps up with exercise and quiz

---

## Period 5: Exercise, Quiz

**Duration:** ~60 minutes

### Opening (5 min)

- API Fundamentals unit nearly complete
- Today: exercise and quiz

### Activity: Exercise — Build a CRUD Client (40 min)

**Exercise repo:** `codecamp-exercise-api-fundamentals`

The intern forks the exercise repo which contains:
- A running json-server with a `notes` resource: `{ id, title, content, category, createdAt }`
- An empty React + TypeScript project
- A README with requirements

Requirements:
1. Create a typed API client (`apiClient<T>`) with error handling (ApiError, NetworkError)
2. `GET /notes` — fetch and display all notes as a card grid
3. `POST /notes` — create a new note via a form (title, content, category)
4. `PATCH /notes/:id` — edit a note inline
5. `DELETE /notes/:id` — delete a note with confirmation
6. Use `useApi` hook for reads and `useMutation` hook for writes
7. Show loading skeletons during fetch
8. Show user-friendly error messages (network vs server vs not-found)
9. Add a search input that filters notes client-side
10. After a mutation, refetch the list to show updated data

The intern creates a branch, implements, and opens a PR for LLM review.

### Quiz (10 min)

5 questions covering:

1. What HTTP method do you use to create a new resource? (POST)
2. What does a 404 status code mean? (The requested resource was not found)
3. Why do you check `response.ok` after fetch? (fetch doesn't throw on 4xx/5xx — it only throws on network failures)
4. What is the difference between PUT and PATCH? (PUT replaces the entire resource; PATCH updates partially)
5. What should you do when a mutation succeeds? (Refetch the relevant data to show the updated state)

### Closing

- API Fundamentals unit complete — Learning Dashboard fetches real data
- Next unit: Next.js 16 — Basics (migrating the SPA to Next.js)
