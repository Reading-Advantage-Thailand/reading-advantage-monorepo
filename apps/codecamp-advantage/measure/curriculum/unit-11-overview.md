# Unit 11 Overview: Databases & ORMs

**Phase:** C (Backend & Data)
**Periods:** 5
**Portfolio Project:** Student Progress Tracker (database layer)

## Learning Objectives

By the end of this unit, the intern can:

1. Explain relational database concepts (tables, rows, columns, primary keys, foreign keys)
2. Write basic SQL (SELECT, INSERT, UPDATE, DELETE, WHERE, JOIN)
3. Define database schemas with Drizzle ORM 0.44.7 (`pgTable`, columns, relations)
4. Write queries with Drizzle (`select`, `insert`, `update`, `delete`, `where`, `eq`, `and`)
5. Generate and apply migrations with drizzle-kit 0.31.10
6. Understand multi-tenant data patterns (schoolId scoping, TenantDB)

## Technologies & Versions

| Technology | Version | Purpose |
|-----------|---------|---------|
| PostgreSQL | 16 | Relational database (Alpine Docker image) |
| Drizzle ORM | 0.44.7 | Type-safe query builder |
| drizzle-kit | 0.31.10 | Migration generation and management |
| Docker | Latest | Run PostgreSQL locally |

## Portfolio Connection

The intern adds a PostgreSQL database to their Student Progress Tracker:

- `students` table — id, name, email, schoolId, role
- `modules` table — id, title, slug, order, schoolId
- `lessons` table — id, moduleId FK, title, type, order
- `progress` table — id, studentId FK, lessonId FK, status, score, schoolId
- Multi-tenant queries scoped by `schoolId` — mirroring Reading Advantage's TenantDB pattern

## Key Concepts

- **ORM**: Object-Relational Mapping — write TypeScript, get SQL
- **Schema first**: Define the schema in TypeScript → generate migrations → apply to DB
- **Multi-tenancy**: Every query scoped by `schoolId` — TenantDB injects it automatically
- **Relations**: Foreign keys connect tables; Drizzle's `relations()` define them in TypeScript

## Architecture Mirroring

This unit directly mirrors Reading Advantage's data layer:

- `packages/db/src/schema/` → Drizzle `pgTable` definitions (same pattern)
- `packages/db/drizzle/` → Generated migrations (same tool)
- `TenantDB` → Auto-injects `schoolId` on queries (same abstraction)
- PostgreSQL 16 Alpine → Same database engine

## Prerequisites

- Units 01–10 complete (all Phase A and B)

## Assessment

- Exercise repo: Design a schema and write queries for a blog application
- Quiz at the end of Period 5 (5 questions)
