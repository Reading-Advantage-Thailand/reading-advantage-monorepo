/**
 * INTERNAL SDK QUARANTINE — NOT FOR PRODUCTION USE.
 *
 * This module re-exports raw vendor SDK symbols (Vercel AI SDK providers
 * and helpers). It exists solely to provide a single, greppable boundary
 * for code that has not yet been migrated to the
 * `@reading-advantage/ai` adapter (`AIClient` / `createAIClient` /
 * `getAIClient`).
 *
 * Why this exists:
 *   The public barrel (`./index.ts`) previously re-exported these raw
 *   symbols, which made it impossible for static architecture guards to
 *   distinguish adapter-bound calls from direct vendor SDK calls in
 *   consuming apps. The Wave 2 Phase 2 `wave2-ai-barrel-no-raw-sdk`
 *   guard now requires the public barrel to expose ONLY adapter-owned
 *   symbols.
 *
 * Rules for importers:
 *   - Do NOT import from this module in new code.
 *   - Existing importers are tolerated as a Wave-2-bounded stop-gap;
 *     each such import site is a follow-up row in the Wave 2 Phase 2
 *     plan, owned by a future AI-adapter adoption track or Wave 6.
 *   - The wave2-provider-architecture-guard does NOT treat this module
 *     as a vendor SDK import (it is part of the `@reading-advantage/ai`
 *     package), but does require importers to migrate to the adapter
 *     over time.
 */
export { createOpenAI } from "@ai-sdk/openai";
export { createGoogleGenerativeAI } from "@ai-sdk/google";
export { createVertex } from "@ai-sdk/google-vertex";

export {
  generateObject,
  generateText,
  streamText,
  experimental_generateImage,
} from "ai";
