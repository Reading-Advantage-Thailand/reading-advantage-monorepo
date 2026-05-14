# Unit 06 Overview: Testing with Vitest

**Phase:** A (Foundations)
**Periods:** 4
**Portfolio Project:** Personal Portfolio Website (tested)

## Learning Objectives

By the end of this unit, the intern can:

1. Write unit tests with Vitest 4.1.5 (`describe`, `it`, `expect`)
2. Use matchers (`toBe`, `toEqual`, `toThrow`, `toBeNull`, etc.)
3. Mock functions and modules with `vi.fn()` and `vi.mock()`
4. Test async functions (resolves, rejects)
5. Measure test coverage with `--coverage`
6. Follow the test-driven development (TDD) cycle: red → green → refactor

## Technologies & Versions

| Technology | Version | Purpose |
|-----------|---------|---------|
| Vitest | 4.1.5 | Test framework |
| @vitest/coverage-v8 | (matching) | Coverage reporting |
| vi | (built-in) | Mock utilities |

## Portfolio Connection

The intern adds tests to their Personal Portfolio Website's utility functions:

- Test the `formatDate` utility
- Test the `truncate` utility
- Test the `filterByCategory` function
- Test Zod schema validation
- Test the API fetch wrapper with mocked fetch

## Key Conventions

- **Test files:** `src/__tests__/*.test.ts` (co-located with source)
- **One describe per function**, one it per behavior
- **Test names describe the expected behavior:** "returns truncated text with ellipsis"
- **AAA pattern:** Arrange, Act, Assert
- **TDD cycle:** Write failing test → Make it pass → Refactor

## Prerequisites

- Units 01–05 complete (TypeScript)

## Assessment

- Exercise repo: Write tests for a provided module using TDD
- Quiz at the end of Period 4 (5 questions)
