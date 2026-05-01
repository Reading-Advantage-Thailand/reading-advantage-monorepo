---
name: Task
about: Implementation task with detailed acceptance criteria and test plans
title: 'Task: '
labels: 'type:feature'
assignees: ''
---

## Task: [Title]

**Priority**: [P0/P1/P2/P3]
**Labels**: type:feature, [area:frontend/backend/prisma/auth]
**Story**: [#story-number]
**Epic**: [#epic-number if applicable]

**Task Description**: As a [developer role], I need to [specific technical action], so that [technical benefit or story enablement].

**Background**:
[Provide technical context:
- Why this task is needed for the story
- Dependencies on other tasks/issues
- Technical constraints or architecture decisions
- Links to related code or specs]

---

## Acceptance Criteria

- [ ] [Specific requirement 1 with file path/function name]
- [ ] [Specific requirement 2 with data types/schema details]
- [ ] [Error handling requirement]
- [ ] [Loading/empty state requirement if UI]
- [ ] [Security/validation requirement]
- [ ] [Documentation/typing requirement]

[Include 5-10+ specific, testable criteria with implementation details]

---

## Automated Test Plan

**Test File(s):**
- `path/to/test.test.ts`
- `path/to/integration.test.ts` (if needed)

**Test Cases:**
- [ ] **Test: [Happy Path Scenario]**
  - Setup: [preconditions]
  - Action: [what is tested]
  - Assert: [expected result]

- [ ] **Test: [Error Handling]**
  - Setup: [preconditions]
  - Action: [invalid input or error condition]
  - Assert: [proper error handling]

- [ ] **Test: [Edge Case]**
  - Setup: [preconditions]
  - Action: [edge case scenario]
  - Assert: [expected behavior]

[Include 3-5+ test cases covering main scenarios]

---

## Manual Test Plan

**Setup:**
1. [Preparation steps]
2. [Database state or seeding needed]
3. [Environment/config requirements]

**Verification:**
- [ ] [Verification step 1]
  - Expected: [outcome]
- [ ] [Verification step 2]
  - Expected: [outcome]
- [ ] [Verification step 3]
  - Expected: [outcome]

---

## Implementation Notes

**File Locations:**
- Implementation: `path/to/file.ts`
- Tests: `path/to/test.test.ts`

**Key Functions/Components:**
- `functionName()` - [purpose]
- `ComponentName` - [purpose]

**Example Implementation:**
```typescript
// Helpful code snippet or API signature
```

**Dependencies:**
- Depends on: #xxx
- Blocks: #xxx
- Part of Story: #xxx

**Related:**
- Spec: `docs/specs/[name]/spec.md`
- Related code: `path/to/related.ts`

---

## Notes

[Any additional context or known limitations]
