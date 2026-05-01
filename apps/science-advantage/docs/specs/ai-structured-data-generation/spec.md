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

## Supported Providers

The following AI providers are approved for use with the Vercel AI SDK for structured data generation.

### OpenAI
- **Package**: `@ai-sdk/openai`
- **Initialization**: `import { openai } from '@ai-sdk/openai';`
- **Model Access**: Models are accessed by their ID, e.g., `openai('gpt-4o')`.
- **Usage**: The provider is compatible with `generateObject` and `streamObject`. It is the recommended provider for generating complex structured data and for scenarios requiring tool use alongside generation.

### Google Vertex AI
- **Package**: `@ai-sdk/google-vertex`
- **Initialization**: `import { vertex } from '@ai-sdk/google-vertex';`
- **Model Access**: Models are accessed by their ID, e.g., `vertex('gemini-1.5-pro')`.
- **Authentication**: Requires Google Cloud authentication. In Node.js, this is typically handled via the `GOOGLE_APPLICATION_CREDENTIALS` environment variable.
- **Usage**: Supports structured outputs with Gemini models. Note that there are some limitations on complex Zod schemas (e.g., `z.union` is not supported).

## Dependencies
- **`ai`**: The Vercel AI SDK.
- **`zod`**: Library for schema declaration and validation.
- **`prisma`**: The ORM for database access.
- **`prisma-zod-generator`**: Development dependency for generating Zod schemas from the Prisma schema.
