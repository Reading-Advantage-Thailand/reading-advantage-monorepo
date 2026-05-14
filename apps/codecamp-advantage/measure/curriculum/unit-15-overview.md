# Unit 15 Overview: AI Integration

**Phase:** D (Production)
**Periods:** 5
**Portfolio Project:** Student Progress Tracker (AI chat)

## Learning Objectives

By the end of this unit, the intern can:

1. Use the Vercel AI SDK (`ai` 4.3.19) to call LLMs
2. Stream LLM responses with `streamText`
3. Generate structured output with `generateObject` and Zod schemas
4. Build a chat UI with the `useChat` hook from `@ai-sdk/react` 1.2.12
5. Write system prompts grounded in context (current module, learning objectives)
6. Implement rate limiting for API routes

## Technologies & Versions

| Technology | Version | Purpose |
|-----------|---------|---------|
| ai | 4.3.19 | AI SDK core |
| @ai-sdk/openai | 1.3.24 | OpenAI provider (via OpenRouter) |
| @ai-sdk/react | 1.2.12 | React hooks for AI |
| OpenRouter | — | LLM API gateway |

## Portfolio Connection

The intern adds an AI chat tutor to their Student Progress Tracker:

- Chat interface that answers questions about the curriculum
- Streaming responses for real-time feedback
- System prompt grounded in the current module's learning objectives
- Structured output for quiz feedback (pass/fail + explanation)
- Rate limiting to prevent abuse

This mirrors `apps/codecamp-advantage/app/api/chat/route.ts` and the AI patterns in the Reading Advantage monorepo.

## Architecture Mirroring

Reading Advantage AI patterns:

- `streamText` for chat responses (same API as codecamp's chat route)
- `generateObject` with Zod schemas for structured output (same pattern)
- System prompts grounded in domain context (same approach)
- OpenRouter as the LLM gateway (same provider)
- Rate limiting per user (same implementation)

## Prerequisites

- Units 01–14 complete (i18n)

## Assessment

- Exercise repo: Build a chat API with streaming and structured output
- Quiz at the end of Period 5 (5 questions)
