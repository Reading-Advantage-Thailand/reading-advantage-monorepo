# Unit 15 Class Period Plans: AI Integration

---

## Period 1: AI SDK Basics — generateText and streamText

**Duration:** ~60 minutes

### Opening (5 min)

- The Vercel AI SDK is how Reading Advantage integrates LLMs
- Two main functions: `generateText` (wait for full response) and `streamText` (stream tokens)
- Today: set up the AI SDK and make your first LLM calls

### Activity: Install AI SDK (10 min)

```bash
pnpm add ai@4.3.19 @ai-sdk/openai@1.3.24 @ai-sdk/react@1.2.12
```

Set up environment variable:
```bash
# .env.local
OPENROUTER_API_KEY=sk-or-...
```

### Activity: Create the OpenRouter Provider (10 min)

```typescript
// src/lib/ai.ts
import { createOpenAI } from "@ai-sdk/openai";

export const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});
```

### Activity: generateText — Complete Response (15 min)

```typescript
// src/app/api/explain/route.ts
import { generateText } from "ai";
import { openrouter } from "@/lib/ai";

export async function POST(request: Request) {
  const { topic } = await request.json();

  const { text } = await generateText({
    model: openrouter("openrouter/free"),
    system: "You are a programming tutor. Explain concepts simply with code examples.",
    prompt: `Explain ${topic} in simple terms for a beginner.`,
  });

  return Response.json({ explanation: text });
}
```

Use cases for `generateText`:
- One-shot explanations
- Classifying input
- Generating titles or summaries

### Activity: streamText — Streaming Response (20 min)

```typescript
// src/app/api/chat/route.ts
import { streamText } from "ai";
import { openrouter } from "@/lib/ai";

const SYSTEM_PROMPT = `You are a coding tutor for the Student Progress Tracker app.
You help students understand web development concepts.
Be concise, practical, and provide code examples when helpful.
Default to Thai language for conversation, but keep code and technical terms in English.`;

export async function POST(request: Request) {
  const { message, moduleId } = await request.json();

  // Build context-aware system prompt
  const contextPrompt = moduleId
    ? `${SYSTEM_PROMPT}\n\nThe student is currently studying Module ${moduleId}.`
    : SYSTEM_PROMPT;

  const result = streamText({
    model: openrouter("openrouter/free"),
    system: contextPrompt,
    prompt: message,
    maxTokens: 2048,
  });

  return result.toDataStreamResponse();
}
```

The key difference:
- `generateText` → returns complete text (user waits)
- `streamText` → returns a stream (user sees tokens as they arrive)

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add AI SDK with generateText and streamText"
git push
```

### Closing

- AI SDK setup, generateText, streamText ✓
- Preview: Period 2 covers the useChat hook

---

## Period 2: Building a Chat UI with useChat

**Duration:** ~60 minutes

### Opening (5 min)

- The AI SDK provides `useChat` — a React hook that handles the entire chat cycle
- Messages, streaming, submission — all handled automatically
- Today: build a full chat interface

### Activity: useChat Hook Basics (20 min)

```tsx
// src/components/ChatTutor.tsx
"use client";

import { useChat } from "@ai-sdk/react";

export function ChatTutor({ moduleId }: { moduleId?: string }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    body: { moduleId },  // Extra data sent with each message
  });

  return (
    <div className="flex h-[600px] flex-col rounded-lg border">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-gray-400">
            Ask me anything about the curriculum...
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 border-t p-4">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask a question..."
          className="flex-1 rounded-lg border px-4 py-2"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-blue-500 px-4 py-2 text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

### Activity: Chat Persistence (20 min)

Save messages to the database so the intern can resume conversations:

```typescript
// src/domain/chat/index.ts
export async function saveMessage({ db, user, tenant, input }: {
  db: DB; user: User; tenant: Tenant; input: SaveMessageInput;
}) {
  assertCan(user, "chat:use", tenant);

  const [message] = await db
    .insert(chatMessages)
    .values({
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
    })
    .returning();

  return message;
}

export async function getConversationHistory({ db, user, tenant, input }: {
  db: DB; user: User; tenant: Tenant; input: { conversationId: string };
}) {
  assertCan(user, "chat:use", tenant);

  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, input.conversationId))
    .orderBy(chatMessages.createdAt);
}
```

### Activity: Add Chat to the Lesson Page (10 min)

```tsx
// In the lesson page
<ChatTutor moduleId={lesson.moduleId} />
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add chat UI with useChat hook and message persistence"
git push
```

### Closing

- useChat, chat UI, message persistence ✓
- Preview: Period 3 covers structured output

---

## Period 3: Structured Output with generateObject

**Duration:** ~60 minutes

### Opening (5 min)

- Sometimes you need the LLM to return structured data, not free text
- `generateObject` returns a Zod-validated object
- Used in Reading Advantage for LLM PR review (pass/fail + comments)
- Today: structured output for quiz feedback and exercise review

### Activity: generateObject with Zod Schema (20 min)

```typescript
import { generateObject } from "ai";
import { z } from "zod";

// Define the output schema
const quizFeedbackSchema = z.object({
  passed: z.boolean().describe("Whether the answer is correct"),
  explanation: z.string().describe("Why the answer is correct or incorrect"),
  relatedTopics: z.array(z.string()).describe("Related topics to study"),
});

type QuizFeedback = z.infer<typeof quizFeedbackSchema>;

// Use generateObject
const { object } = await generateObject({
  model: openrouter("openrouter/free"),
  schema: quizFeedbackSchema,
  prompt: `
    A student answered the following quiz question:

    Question: "What does assertCan() do in a domain function?"
    Student's answer: "It validates the input schema"
    Correct answer: "It checks if the user has permission to perform the action"

    Provide feedback.
  `,
});

// object is typed as QuizFeedback — fully type-safe!
console.log(object.passed);        // false
console.log(object.explanation);   // "assertCan() checks permissions, not input..."
console.log(object.relatedTopics);  // ["RBAC", "permissions", "domain functions"]
```

### Activity: Exercise Review with generateObject (20 min)

```typescript
const codeReviewSchema = z.object({
  passed: z.boolean().describe("Whether the code meets the learning objectives"),
  score: z.number().min(0).max(100).describe("Score out of 100"),
  feedback: z.string().describe("Overall feedback for the student"),
  improvements: z.array(z.object({
    line: z.number().describe("Line number or -1 for general"),
    suggestion: z.string().describe("What to improve"),
  })).describe("Specific improvements"),
});

export async function reviewExercise({
  exerciseTitle,
  instructions,
  studentCode,
  learningObjectives,
}: {
  exerciseTitle: string;
  instructions: string;
  studentCode: string;
  learningObjectives: string[];
}) {
  const { object } = await generateObject({
    model: openrouter("openrouter/free"),
    schema: codeReviewSchema,
    system: "You are a code reviewer for a web development bootcamp. Be encouraging but honest.",
    prompt: `
      Exercise: ${exerciseTitle}
      Instructions: ${instructions}
      Learning objectives: ${learningObjectives.join(", ")}

      Student's code:
      \`\`\`typescript
      ${studentCode}
      \`\`\`

      Review the code against the learning objectives. Does it meet the requirements?
    `,
  });

  return object;
}
```

### Activity: Add Quiz Feedback API Route (10 min)

```typescript
// src/app/api/quiz-feedback/route.ts
export async function POST(request: Request) {
  const { question, studentAnswer, correctAnswer } = await request.json();

  const { object } = await generateObject({
    model: openrouter("openrouter/free"),
    schema: quizFeedbackSchema,
    prompt: `Question: ${question}\nStudent answer: ${studentAnswer}\nCorrect answer: ${correctAnswer}\n\nProvide feedback.`,
  });

  return Response.json(object);
}
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add structured output with generateObject for quiz feedback"
git push
```

### Closing

- generateObject, Zod schemas, exercise review ✓
- Preview: Period 4 covers rate limiting and production concerns

---

## Period 4: Rate Limiting and Production Concerns

**Duration:** ~60 minutes

### Opening (5 min)

- LLM API calls cost money and can be abused
- Production AI features need rate limiting, error handling, and fallbacks
- Today: harden the chat API for production

### Activity: Per-User Rate Limiting (20 min)

```typescript
// src/lib/rate-limit.ts
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;      // 30 requests per minute

const rateLimits = new Map<string, RateLimitEntry>();

export function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimits.get(userId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(userId, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}
```

### Activity: Enhanced Chat Route with Guards (25 min)

```typescript
// src/app/api/chat/route.ts — production version
import { streamText } from "ai";
import { openrouter } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAuthUser } from "@/auth/session";

export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    // 2. Rate limit
    const rateCheck = checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      return Response.json(
        { error: "Rate limit exceeded", retryAfter: rateCheck.retryAfter },
        { status: 429 }
      );
    }

    // 3. Validate input
    const body = await request.json();
    const parsed = chatInputSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    // 4. Fallback if no API key
    if (!process.env.OPENROUTER_API_KEY) {
      return Response.json({
        response: `[AI Tutor fallback mode]\n\nYou asked: "${parsed.data.message}"\n\nConfigure OPENROUTER_API_KEY for real responses.`,
      });
    }

    // 5. Stream the response
    const result = streamText({
      model: openrouter("openrouter/free"),
      system: buildSystemPrompt(parsed.data.moduleId),
      prompt: parsed.data.message,
      maxTokens: 2048,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
```

### Activity: Error Handling and Fallbacks (10 min)

```typescript
// Graceful degradation
try {
  const result = streamText({ ... });
  return result.toDataStreamResponse();
} catch (error) {
  // If the LLM provider is down, return a helpful fallback
  if (error instanceof Error && error.message.includes("API key")) {
    return Response.json({ response: "AI tutor is currently unavailable. Please try again later." });
  }
  throw error;
}
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: add rate limiting and production hardening to chat API"
git push
```

### Closing

- Rate limiting, auth checks, input validation, fallbacks ✓
- Preview: Period 5 wraps up with exercise and quiz

---

## Period 5: Exercise, Quiz

**Duration:** ~60 minutes

### Opening (5 min)

- AI Integration unit nearly complete
- Today: exercise and quiz

### Activity: Exercise — Build a Code Review Bot (40 min)

**Exercise repo:** `codecamp-ai-exercise`

The intern forks the exercise repo which contains:
- A Next.js 16.0.0 app with a basic form
- AI SDK already installed (ai@4.3.19)
- A README with requirements

Requirements:
1. Create `POST /api/chat` route that streams LLM responses using `streamText`
2. Create `POST /api/review` route that returns structured code review using `generateObject`
3. The review schema should include: `passed` (boolean), `score` (0-100), `feedback` (string), `suggestions` (array of {line, message})
4. Build a chat UI using the `useChat` hook from `@ai-sdk/react`
5. Add a system prompt that includes the current exercise context
6. Add per-user rate limiting (20 requests per minute)
7. Add authentication check — only logged-in users can chat
8. Add a fallback response when `OPENROUTER_API_KEY` is not configured
9. Save chat messages to the database for conversation history
10. Build a "Review Code" button that calls `/api/review` and displays structured feedback

The intern creates a branch, implements, and opens a PR for LLM review.

### Quiz (10 min)

5 questions covering:

1. What is the difference between `generateText` and `streamText`? (generateText waits for the full response; streamText sends tokens as they arrive)
2. What does `generateObject` do differently from `generateText`? (returns a Zod-validated structured object instead of free-form text)
3. Why is rate limiting important for AI API endpoints? (LLM calls cost money and can be abused)
4. What does `useChat` handle automatically? (message state, streaming, form submission, loading state)
5. What should you do if the LLM API key is not configured? (return a fallback response instead of crashing)

### Closing

- AI Integration unit complete — Student Progress Tracker has an AI tutor
- Next unit: Monorepo & Package Management
