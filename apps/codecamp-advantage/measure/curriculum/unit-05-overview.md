# Unit 05 Overview: TypeScript

**Phase:** A (Foundations)
**Periods:** 5
**Portfolio Project:** Personal Portfolio Website (TypeScript conversion)

## Learning Objectives

By the end of this unit, the intern can:

1. Add type annotations to variables, function parameters, and return types
2. Define and use interfaces and type aliases
3. Use union types, optional properties, and literal types
4. Apply generics for reusable typed functions
5. Narrow types with `typeof`, `instanceof`, and discriminated unions
6. Validate runtime data with Zod 3.25.76 schemas
7. Convert an existing JavaScript project to TypeScript

## Technologies & Versions

| Technology | Version | Purpose |
|-----------|---------|---------|
| TypeScript | 5.9.3 | Static type system |
| Zod | 3.25.76 | Runtime schema validation |
| tsconfig.json | — | Compiler configuration |

## Portfolio Connection

The intern converts their Personal Portfolio Website from JavaScript to TypeScript:

- Rename `script.js` → `script.ts` (or set up a build step)
- Add type annotations to all functions and data structures
- Define interfaces for project data, skill data, and form data
- Add Zod validation to the contact form

## Key Conventions

- **Explicit return types** on exported functions
- **Interfaces for objects**, type aliases for unions and utility types
- **Zod for runtime validation** (API boundaries, form inputs) — TypeScript only checks at compile time
- **`strict: true`** in tsconfig — no implicit any, strict null checks

## Prerequisites

- Units 01–04 complete (JavaScript fundamentals)

## Assessment

- Exercise repo: Convert a JavaScript module to TypeScript with Zod validation
- Quiz at the end of Period 5 (5 questions)
