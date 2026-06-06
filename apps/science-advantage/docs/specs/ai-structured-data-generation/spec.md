---
title: AI Structured Data Generation Specification
type: spec
status: draft
created_at: 2025-11-29
tags: [spec, ai, llm, structured-data, vercel-ai-sdk]
description: Technical specification for generating type-safe structured data from LLMs using Vercel AI SDK, Zod, and Prisma integration.
---

# AI-Powered Structured Data Generation

## Overview
This specification outlines the process for using the Vercel AI SDK to generate structured, type-safe data from large language models (LLMs). It standardizes the connection between our Prisma schema, Zod validation schemas, and the AI-generated output, ensuring data integrity and developer efficiency.

## Requirements

### Requirement: Use Vercel AI SDK for Generation
The application SHALL use the `generateObject` and `streamObject` functions from the Vercel AI SDK (`ai` package) as the primary interface for generating structured data from LLMs.

### Requirement: Define Data Structures with Zod
All schemas used for generating structured data MUST be defined using Zod. This ensures that the output from the LLM is validated and conforms to a predefined shape, providing type safety.

### Requirement: Automate Zod Schema Generation
Zod schemas corresponding to our Prisma models MUST be automatically generated. This eliminates manual schema creation, reduces errors, and ensures that our validation layer is always in sync with our database schema.

#### Scenario: Prisma Schema Update
- **GIVEN** a developer modifies the `schema.prisma` file (e.g., adds a new field to a model).
- **WHEN** the developer runs the `npx prisma generate` command.
- **THEN** the corresponding Zod schema in the generated output directory MUST be automatically updated to reflect the changes.

### Requirement: Provide Type-Safe Outputs
The data returned from the generation functions (`generateObject`, `streamObject`) MUST be fully typed. This is achieved by inferring TypeScript types directly from the Zod schemas.

#### Scenario: Accessing Generated Data
- **GIVEN** a Zod schema `const recipeSchema = z.object({ ... });`.
- **WHEN** a developer infers the type `type Recipe = z.infer<typeof recipeSchema>;` and uses it with `generateObject`.
- **THEN** the resulting `recipe` object MUST have all the properties and types defined in the `Recipe` TypeScript type, with full autocompletion and type-checking.

## API Contracts

### `generateObject()`
- **Purpose**: To generate a single, fully-formed structured data object from an LLM.
- **Usage**: This function should be used when the entire object is needed before proceeding. It is suitable for non-interactive scenarios.
- **Error Handling**: MUST handle the `AI_NoObjectGeneratedError` which is thrown if the model fails to produce a valid object matching the schema.

### `streamObject()`
- **Purpose**: To stream a structured data object from an LLM as it is being generated.
- **Usage**: This function is preferred for interactive and user-facing scenarios to improve perceived performance. It provides a `partialObjectStream` that can be used to render data incrementally.
- **Output Strategies**: Can stream the full object or individual elements of a generated array (`elementStream`).

## Data Models & Workflow

The data flow and schema generation process is as follows:

1.  **Prisma Schema (`schema.prisma`)**: This is the single source of truth for our data models.
2.  **Zod Schema Generation**: We use the `prisma-zod-generator` library to automatically create Zod schemas from the Prisma schema.
    - The generator is configured in `schema.prisma`:
      ```prisma
      generator zod {
        provider = "prisma-zod-generator"
        output   = "./lib/generated/zod" // Centralized output path
      }
      ```
    - Running `npx prisma generate` executes this process.
3.  **Zod Schema (`./lib/generated/zod/index.ts`)**: The generated Zod schemas are used for runtime validation of data from APIs, forms, and, in this case, LLM outputs.
4.  **TypeScript Types**: TypeScript types are inferred directly from the Zod schemas, ensuring type safety between the database, validators, and application code.
    ```typescript
    import { userSchema } from './lib/generated/zod';
    import { z } from 'zod';

    type User = z.infer<typeof userSchema>;
    ```

## Provider Configuration

AI provider access is mediated through the `@reading-advantage/ai` shared package, which provides a unified `AIClient` interface. Application code calls `getAIClient()` to obtain a singleton client; the runtime selects the concrete provider based on the `AI_PROVIDER` environment variable.

```typescript
import { getAIClient } from '@reading-advantage/ai';

const client = getAIClient();
const { object } = await client.generateObject({ schema: mySchema, prompt: '...' });
```

### Supported Providers

| Provider | `AI_PROVIDER` value | API key env var | Notes |
|----------|---------------------|-----------------|-------|
| OpenAI | `openai` (default in production) | `OPENAI_API_KEY` | Recommended for complex structured data and tool use. |
| Google | `google` | `GEMINI_API_KEY` (alias: `GOOGLE_API_KEY`) | Supports structured outputs with Gemini models. Some limitations on complex Zod schemas (e.g., `z.union`). |
| Mock | `mock` (default in test) | — | Returns configured fixture responses; used for unit testing. |

## Dependencies
- **`ai`**: The Vercel AI SDK.
- **`zod`**: Library for schema declaration and validation.
- **`prisma`**: The ORM for database access.
- **`prisma-zod-generator`**: Development dependency for generating Zod schemas from the Prisma schema.
