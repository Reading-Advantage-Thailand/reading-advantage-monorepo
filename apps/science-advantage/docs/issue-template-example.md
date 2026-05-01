---
title: Enhanced Issue Template Example
type: template
status: active
created_at: 2025-10-28
tags: [template, issue-tracking, github, user-story, acceptance-criteria]
description: An example of a high-quality GitHub issue template for user stories, including acceptance criteria, test plans, and implementation notes.
---

# Example: Enhanced Issue Template (Based on #119)

## Story: BE - Student Profile Data Model

**Issue**: #119
**Priority**: P1
**Labels**: type:feature, area:backend, area:prisma
**Epic**: #118 - AI-Powered Personalization & Teacher Intervention
**Status**: Ready

**User Story**: As a backend developer, I need to extend our data model to store student mastery levels for each curriculum standard, so that we have a place to persist AI-driven analysis and enable personalized learning paths.

**Background**:
The AI-powered personalization feature requires tracking how well each student has mastered individual curriculum standards over time. This mastery data will be calculated based on quiz performance and used by the AI recommendation system to suggest appropriate next lessons. The `StandardMastery` model creates a many-to-many relationship between students and standards with additional metadata about proficiency.

**Acceptance Criteria**:

**1. Schema Design:**
- [ ] Create a new model `StandardMastery` in `prisma/schema.prisma`
- [ ] Add field `id` (String, @id, @default(cuid()))
- [ ] Add field `studentId` (String) with relation to `User` model
- [ ] Add field `standardId` (String) with relation to `Standard` model
- [ ] Add field `masteryLevel` (Float) - range 0.0 to 1.0 representing proficiency
- [ ] Add field `lastAssessedAt` (DateTime) - timestamp of most recent assessment
- [ ] Add field `createdAt` (DateTime, @default(now()))
- [ ] Add field `updatedAt` (DateTime, @updatedAt)
- [ ] Add unique constraint `@@unique([studentId, standardId])`
- [ ] Add index `@@index([studentId])` for query optimization
- [ ] Add index `@@index([standardId])` for query optimization

**2. Relation Updates:**
- [ ] Add `masteryRecords` relation array to `User` model
- [ ] Add `masteryRecords` relation array to `Standard` model

**3. Migration:**
- [ ] Run `npx prisma format` to format the schema
- [ ] Run `npx prisma db push` to apply changes to database
- [ ] Run `npx prisma generate` to update Prisma Client
- [ ] Verify no errors in migration output

**4. Type Safety:**
- [ ] Confirm TypeScript types are generated correctly
- [ ] No compilation errors in existing codebase after schema update

---

### Automated Test Plan

- [ ] Create test file at `prisma/__tests__/standard-mastery.test.ts`
- [ ] **Test: Create StandardMastery Record**
  - Create a student user and a standard
  - Create a `StandardMastery` record with `masteryLevel: 0.75`
  - Assert the record is created with correct fields
- [ ] **Test: Unique Constraint**
  - Attempt to create duplicate `StandardMastery` for same student+standard
  - Assert it throws a unique constraint violation
- [ ] **Test: Update Mastery Level**
  - Create initial `StandardMastery` with `masteryLevel: 0.6`
  - Update to `masteryLevel: 0.8`
  - Assert `updatedAt` changes and `lastAssessedAt` can be updated
- [ ] **Test: Query Student's Mastery Records**
  - Create multiple `StandardMastery` records for one student
  - Query all mastery records for that student
  - Assert correct number of records returned
- [ ] **Test: Validation**
  - Attempt to create `StandardMastery` with `masteryLevel: 1.5` (out of range)
  - Assert validation error (if validation added) or document acceptable range

### Manual Test Plan

- **Setup:**
  1. Ensure development database is running
  2. Back up `prisma/schema.prisma` before making changes

- **Verification:**
  - [ ] After schema update, run `npx prisma studio`
  - [ ] Navigate to `StandardMastery` model in Prisma Studio
  - [ ] Manually create a test record with valid `studentId`, `standardId`, `masteryLevel: 0.85`
  - [ ] Verify `createdAt` and `updatedAt` auto-populate
  - [ ] Verify unique constraint: attempt to create duplicate record with same `studentId` + `standardId`
  - [ ] Expected: Error message about unique constraint violation
  - [ ] Clean up test records

---

### Implementation Notes

**File Locations:**
- Schema: `prisma/schema.prisma`
- Test: `prisma/__tests__/standard-mastery.test.ts`

**Example Schema Addition:**
```prisma
model StandardMastery {
  id             String   @id @default(cuid())
  studentId      String
  standardId     String
  masteryLevel   Float    // 0.0 to 1.0
  lastAssessedAt DateTime
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  student  User     @relation("StudentMastery", fields: [studentId], references: [id], onDelete: Cascade)
  standard Standard @relation(fields: [standardId], references: [id], onDelete: Cascade)

  @@unique([studentId, standardId])
  @@index([studentId])
  @@index([standardId])
}
```

**Dependencies:**
- Blocks #120 (Calculate and Update Student Mastery)
- Part of Epic #118

**Related Specs:**
- `docs/specs/student-profile/spec.md`
- `docs/specs/ai-recommendations/spec.md`
