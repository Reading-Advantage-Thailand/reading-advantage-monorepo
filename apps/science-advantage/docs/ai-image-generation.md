---
title: AI Diagram Generation
status: draft
type: design-note
---

Nanobanana Pro (Gemini 3 Pro Image) is integrated through the Vercel AI SDK to generate labeled science diagrams when suitable open-source assets are missing.

- Primary model and fallback are configured via `aiImageConfig` (in `lib/config/ai-images`) and resolved at runtime through `@reading-advantage/ai`'s `getAIClient()` provider selector. See `.env.example` for `AI_PROVIDER`, `GEMINI_API_KEY`, and `OPENAI_API_KEY`.
- Config: see `.env.example` for `AI_IMAGE_PRIMARY_MODEL`, `AI_IMAGE_MAX_WIDTH`, `AI_IMAGE_MAX_BYTES`, and API keys (`GEMINI_API_KEY`/`GOOGLE_API_KEY`, `OPENAI_API_KEY`).
- Output is converted to WebP with resize/compression targeting <200KB; logs warn if the cap cannot be reached.
