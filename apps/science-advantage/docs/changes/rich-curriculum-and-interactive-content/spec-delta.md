---
title: "Spec Delta: Rich Curriculum & Interactive Content"
type: spec-delta
status: draft
created_at: 2025-11-22
tags: [spec-delta, curriculum, interactive-content, lesson-player, grade-4]
description: Defines requirements for the interactive lesson player, rich content data model, and Grade 4 curriculum expansion.
---

# Spec Delta: Rich Curriculum and Interactive Content

## Overview
This spec delta defines the requirements for the "Interactive Lesson Experience" and the expansion of the curriculum to Grade 4. It introduces a new spec file `docs/specs/interactive-lesson-experience/spec.md` and modifies the existing `core-science-curriculum-content-management/spec.md` to support rich content types.

## Detailed Requirements

### 1. Interactive Lesson Player
- **Requirement**: The system SHALL provide a unified lesson player that renders JSON-based lesson content.
- **Components**:
    - **Hero Section**: Title, standard alignment badges, estimated time.
    - **Content Blocks**: Support for Markdown text, callout boxes (e.g., "Did you know?"), and code/math blocks.
    - **Vocabulary Widget**: Interactive flashcards (Front: Term; Back: Definition + Thai translation).
    - **Media Gallery**: Carousel or grid for lesson images.
    - **Check for Understanding**: Inline mini-quizzes (non-graded) to verify comprehension before moving on.

### 2. Rich Content Data Model
- **Requirement**: Extend the `Lesson` content schema to support structured blocks.
- **Schema Change**:
    - Introduce `ContentBlock` types: `TEXT`, `IMAGE`, `VOCABULARY`, `INTERACTIVE`.
    - Update `Lesson` model to store `content` as a structured JSON array rather than a single string.

### 3. Grade 4 Curriculum
- **Requirement**: Import 10+ Grade 4 lessons aligned to Thai and NGSS standards.
- **Content**:
    - Unit: "Energy and Waves" (or similar Grade 4 topic).
    - Standards: Map to specific Thai MOE standards and NGSS performance expectations.

## Key Design Decisions
- **JSON-First Content**: We will store content as structured JSON to allow flexible rendering and easy AI processing, rather than storing raw HTML.
- **Client-Side Rendering**: The Lesson Player will be a client-side React component that hydrates from the JSON data, ensuring smooth interactivity.
- **Asset Hosting**: Images will be hosted in `public/images/lessons/` for MVP, with a path to move to CDN/Blob storage later.

## Potential Migration Path
- Existing lessons (Grade 3) will need to be converted from their current format (likely simple string/markdown) to the new structured JSON format. A migration script will be required.
