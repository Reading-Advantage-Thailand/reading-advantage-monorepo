# @reading-advantage/ai

Shared AI adapter package for the Reading Advantage monorepo. Provides a provider-agnostic `AIClient` interface that abstracts over OpenAI, Google Gemini, and a mock provider for tests.

## Quick Start

```ts
import { getAIClient } from "@reading-advantage/ai";

const client = getAIClient();

// Generate structured data
const result = await client.generateObject({
  schema: myZodSchema,
  prompt: "Describe the water cycle",
});

// Generate an image
const buffer = await client.generateImage({
  prompt: "A labeled diagram of a plant cell",
});

// Generate text
const text = await client.generateText({
  prompt: "Explain photosynthesis to a 5th grader",
});
```

## Provider Configuration

The provider is selected via the `AI_PROVIDER` environment variable:

| Provider | `AI_PROVIDER` | Required Env Vars | Default Model |
|----------|---------------|-------------------|---------------|
| OpenAI   | `openai`      | `OPENAI_API_KEY`  | `gpt-4o-mini` |
| Google   | `google`      | `GEMINI_API_KEY` or `GOOGLE_API_KEY` | `gemini-2.5-flash` |
| Mock     | `mock`        | (none)            | —             |

In `NODE_ENV=test`, the mock provider is selected by default when `AI_PROVIDER` is not set.

## Explicit Construction

```ts
import { createAIClient } from "@reading-advantage/ai";

const client = createAIClient({
  provider: "openai",
  apiKey: "sk-...",
  model: "gpt-4o",
});
```

## Mock Provider for Tests

```ts
import { MockProvider } from "@reading-advantage/ai";

const client = new MockProvider({
  generateObject: { answer: "42" },
  generateImage: Buffer.from("fake-image"),
  generateText: "hello",
});

const result = await client.generateObject({
  schema: mySchema,
  prompt: "test",
});
// result === { answer: "42" }
```

The mock provider validates `generateObject` responses against the provided Zod schema, so tests catch schema mismatches without a network round-trip.

## Error Handling

All errors extend `AIClientError` with a machine-readable `code`:

- `PROVIDER_NOT_CONFIGURED` — missing API key or unsupported provider
- `PROVIDER_ERROR` — upstream SDK error (network, rate limit, etc.)
- `SCHEMA_VALIDATION_ERROR` — generated output failed Zod validation

## Architecture

```
Application → getAIClient() → AIClient interface → Provider implementation → AI SDK
```

Application code depends only on the `AIClient` interface. The provider implementation is selected at runtime based on configuration. This fulfills the AGENTS.md §AI adapter pattern requirement.
