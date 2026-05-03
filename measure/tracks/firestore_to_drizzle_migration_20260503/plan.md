# Plan: Firestore to Drizzle Migration

- [ ] Write tests for Drizzle schema definitions for licenses, classrooms, stories, flashcards
- [ ] Add Drizzle schema tables for remaining Firestore collections in packages/db
- [ ] Write tests for data migration script (reads Firestore, writes to Postgres)
- [ ] Implement migration script that transfers Firestore data to Drizzle
- [ ] Write tests for new domain functions replacing Firestore queries
- [ ] Implement domain functions for licenses CRUD
- [ ] Implement domain functions for classrooms CRUD
- [ ] Implement domain functions for stories CRUD
- [ ] Implement domain functions for flashcards CRUD
- [ ] Update reading-advantage app code to use Drizzle domain functions
- [ ] Remove Firebase/Firestore imports from reading-advantage
- [ ] Run `drizzle-kit generate` to create migration SQL
- [ ] Run full build and test pipeline to verify all gates pass
