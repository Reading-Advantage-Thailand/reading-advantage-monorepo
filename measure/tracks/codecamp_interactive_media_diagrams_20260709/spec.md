# Specification: CodeCamp Interactive Media and Diagrams Integration

## Summary

Enhance the CodeCamp Advantage curriculum by integrating curated YouTube video tutorials (focusing on Fireship and Dave Gray) and 16 unit-level visual diagrams/illustrations, providing interns with interactive and visual learning aids.

## Problem

Some curriculum units in CodeCamp cover high-load conceptual transitions (like Git branching, React reconciliation, Next.js server/client splits, multi-tenancy database scoping, and Docker container isolation). Interns frequently need visual aids and step-by-step video tutorials to reinforce these complex topics and prevent progression blockers.

## Goals

1. Update the database seed data and types in the domain/DB packages to support YouTube video IDs and diagram image paths.
2. Adapt the frontend rendering components to display embedded YouTube players and image illustrations conditionally.
3. Curate and map high-quality video tutorials to specific lessons.
4. Generate 16 detailed diagrams to visualize key concepts for each curriculum unit.
5. Seed the updated curriculum data and verify visual integration in the development environment.

## Non-Goals

* Do not replace any written text content in the existing lessons.
* Do not introduce third-party video platforms other than YouTube.
* Do not alter student progress state during the seeding update.

## Functional Requirements

### FR-1: Database Seed and Domain Schema Updates
Extend the typescript structures in [codecamp-curriculum-data.ts](file:///home/daniel-bo/Desktop/reading-advantage-monorepo/packages/db/src/seed/codecamp-curriculum-data.ts) to support optional `youtubeId` and `imagePath` properties in curriculum theory sections.

### FR-2: Frontend UI Adaptations
Modify the [LessonContent](file:///home/daniel-bo/Desktop/reading-advantage-monorepo/apps/codecamp-advantage/components/lesson-content.tsx) component to conditionally render:
* Labeled responsive image tags if `imagePath` is present.
* Labeled, secure, responsive YouTube `<iframe>` embeds if `youtubeId` is present.

### FR-3: Video Curation
Integrate curated video IDs from Fireship, Dave Gray, Jack Herrington, and Web Dev Simplified into the respective module seed records in `codecamp-curriculum-data.ts`.

### FR-4: Visual Diagram Asset Generation
Create 16 diagrams using the image generation capability and place them under `apps/codecamp-advantage/public/images/diagrams/`. The diagrams will cover:
* Git branching flows
* CSS box model and layout
* JS execution context and closures
* React render lifecycle and Virtual DOM reconciliation
* Next.js server components vs. client components
* tRPC type-safe procedures
* Multi-tenant scoping and databases
* Docker container isolation
* Measure-driven development lifecycle, and others.

### FR-5: Seeding and Verification
Execute the curriculum seed script to populate PostgreSQL, start the local development server, and verify that the images and video embeds render correctly.

## Acceptance Criteria

* [ ] Schema type contracts support `youtubeId` and `imagePath`.
* [ ] Frontend [LessonContent](file:///home/daniel-bo/Desktop/reading-advantage-monorepo/apps/codecamp-advantage/components/lesson-content.tsx) renders media items without styling degradation.
* [ ] 16 diagram files exist under `apps/codecamp-advantage/public/images/diagrams/`.
* [ ] Seed records in [codecamp-curriculum-data.ts](file:///home/daniel-bo/Desktop/reading-advantage-monorepo/packages/db/src/seed/codecamp-curriculum-data.ts) are updated and seed successfully.
* [ ] Verifiable smoke check proves embeds render and load correctly in the browser.
* [ ] Draft enhancement plan artifact is deleted.
