# Plan: Firestore to Drizzle Migration

## Status: Mostly complete — Firestore removed, 7 files using stub, Prisma→Drizzle deferred

The original plan assumed Drizzle schema was missing and Firestore was actively used for data storage. Investigation revealed:
- **Licenses**: Already on Prisma (not Firestore)
- **Classrooms + Flashcards**: Drizzle schema + domain functions already exist
- **Firestore was dead code**: Server-side operations only used by legacy one-off runners

## What Was Done

- [x] Deleted dead Firestore server code (6 files: operations, services, runners, handler-factory)
- [x] Removed `DocumentData` type imports from models and client service
- [x] Removed unused `Timestamp` import from `create-new-student.tsx`
- [x] Removed dead `handler-factory` import from `user-controller.ts`
- [x] Deleted Firebase Auth dead code (auth-redirect-handler, ios-auth-handler, verify-id-token, update-password route)
- [x] Deleted Firebase config files (lib/firebase.ts, lib/firebaseAdmin.ts)
- [x] Removed `firebase`, `firebase-admin`, `firebase-mock` from package.json
- [x] Replaced `configs/firestore-config.ts` with no-op stub for 7 remaining callers
- [x] Made `firebase-admin/storage` usage in generator-controller gracefully optional
- [x] Build passes, all package tests pass

## Remaining Work (Deferred)

7 files still use the Firestore stub (no-op). These need individual migration:
1. `server/controllers/validator-controller.ts` — heavy Firestore usage (new-articles, word-list)
2. `utils/deleteStories.ts` — stories collection delete
3. `server/utils/generators/audio-words-generator.ts` — stories-word-list
4. `server/controllers/stories-assistant-controller.ts` — dead postFlashCard function
5. `app/api/v1/classroom/oauth2/classroom/courses/[courseId]/route.ts` — classroom sync
6. `server/utils/generators/audio-generator.ts` — dead generateChapterAudio function
7. `leaderboard-controller.ts` — unused import (already removed)

The Prisma→Drizzle migration for reading-advantage controllers is a separate track.
