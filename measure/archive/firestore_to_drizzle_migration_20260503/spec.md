# Spec: Firestore to Drizzle Migration

## Problem

reading-advantage has 12 Firestore collections still active in a hybrid state. Users and articles are partially migrated, but licenses, classrooms, stories, and flashcards remain on Firestore. This creates data inconsistency, dual-write complexity, and blocks full Drizzle adoption.

## Goals

- Migrate remaining Firestore collections to Drizzle/Postgres
- Remove Firestore client dependencies from reading-advantage
- Ensure zero data loss during migration
- Maintain backward compatibility during transition period

## Non-Goals

- Migrating other apps' databases (science-advantage uses Prisma)
- Real-time Firestore listeners (not used in current code)
- Firebase Functions migration (separate concern)

## Acceptance Criteria

- [ ] All Firestore collections have corresponding Drizzle schema tables
- [ ] Data migration script transfers existing Firestore data to Postgres
- [ ] reading-advantage code imports no Firebase/Firestore modules
- [ ] `pnpm turbo run build --filter=reading-advantage` succeeds without Firebase deps
- [ ] Unit tests cover migration script and new Drizzle queries
