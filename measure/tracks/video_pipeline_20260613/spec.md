# Specification: Marketing Video Production Pipeline

## Overview

Build a human-in-the-loop video production pipeline inside `apps/marketing` for the Reading Advantage product marketing team. The pipeline produces short Thai-language marketing videos for each app (Reading Advantage, Primary Advantage, Science Advantage, CodeCamp Advantage, etc.) by:

1. Researching and persisting video topics per app.
2. Generating a structured script (5–7 scenes) via an LLM.
3. Letting the user reorder, add, and remove scenes.
4. Saving the resulting project for later rendering/export.

The pipeline is intentionally app-local to `apps/marketing` in v1; it reuses the marketing app's existing DB and settings infrastructure rather than creating a new shared package.

## Target Users

- Marketing content producers creating Thai-language app explainer / social videos.
- Growth team members reviewing topic lists and generated scripts before production.

## Functional Requirements

### FR-1: Topic Storage
- Persist researched topics per app in a `past_topics` table.
- Deduplicate incoming topics against existing rows before insertion.
- Expose a POST endpoint to save topics.

### FR-2: Script Generation
- Accept `app` and `topic` and call an LLM to produce a Thai-language script.
- Script output is a JSON array of 5–7 scenes.
- Each scene contains:
  - `narration`: Thai voiceover text.
  - `imagePrompt`: English image-generation prompt.
  - `motionDirection`: camera/composition motion direction.
- Validate the LLM response against a schema and return a clear error if validation fails.
- LLM provider/model/API key are read from a `settings` table (`llm.provider`, `llm.model`, `llm.apiKey`).

### FR-3: Scene Editor
- Provide pure functions to reorder, add, and remove scenes in a script array.
- Bounds-check indices and return a copy; do not mutate the input.

### FR-4: Project Persistence
- Expose a route to list/create video projects (placeholder for future render/export integration).

### FR-5: UI
- A campaign-specific video page (`/campaigns/[id]/video`) renders the topic input, script generator, and scene editor.

### FR-6: Settings-Driven LLM
- If no API key is configured, the generate-script route returns a 400 with a helpful message.
- Default provider/model fallbacks are allowed but documented.

## Non-Functional Requirements

- Tests follow TDD: Red wiring-invariant tests exist for the topic and script routes.
- Type-check and lint pass for `apps/marketing`.
- Use the existing marketing app conventions (`@/lib/db`, `@/lib/ai`, `@reading-advantage/db/schema`).

## Out of Scope

- Actual video rendering / Revideo integration (deferred to a future track).
- Shared package extraction (`packages/video-pipeline`) — the archived `www_content_video_import_20260514` track is superseded by this app-local implementation.
- Multilingual scripts beyond Thai v1.
- Automated image generation or motion rendering.
