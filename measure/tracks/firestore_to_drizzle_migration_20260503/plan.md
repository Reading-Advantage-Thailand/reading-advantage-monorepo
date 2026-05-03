# Plan: Firestore to Drizzle Migration

## Status: Cleanup complete. Stub migration and Prisma→Drizzle deferred.

Investigation revealed Firestore was mostly dead code. Licenses are on Prisma, classrooms/flashcards have Drizzle schema + domain functions already.

## Completed

- [x] Deleted 12 dead Firebase/Firestore files (operations, services, runners, auth handlers, config files)
- [x] Removed `firebase`, `firebase-admin`, `firebase-mock` from package.json
- [x] Replaced `firestore-config.ts` with no-op stub for 7 remaining callers
- [x] Removed `DocumentData` type imports from all models
- [x] Made generator-controller storage cleanup gracefully optional
- [x] Build passes, all package tests pass

## Deferred — Tech Debt

7 files use the Firestore no-op stub. Each needs individual migration:

1. **`server/controllers/validator-controller.ts`** — Heaviest Firestore usage (new-articles, word-list, question subcollections). Needs full Prisma rewrite or be stubbed as 501.
2. **`utils/deleteStories.ts`** — `stories` collection delete. Replace with Prisma `story.delete()`.
3. **`server/utils/generators/audio-words-generator.ts`** — `stories-word-list` writes. Dead `saveWordList` can be deleted; `generateChapterAudioForWord` needs Prisma.
4. **`server/controllers/stories-assistant-controller.ts`** — Dead `postFlashCard` function. Delete it.
5. **`app/api/v1/classroom/oauth2/classroom/courses/[courseId]/route.ts`** — `classroom` Firestore collection. Needs Prisma rewrite.
6. **`server/utils/generators/audio-generator.ts`** — Dead `generateChapterAudio` function. Delete it.

Separate track needed: **Prisma→Drizzle migration** for reading-advantage controllers (user-controller, license-controller, generator-controller).
