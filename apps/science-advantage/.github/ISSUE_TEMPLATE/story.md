---
name: Story
about: User story with comprehensive acceptance criteria, background, and detailed test plans
title: 'Story: '
labels: 'type:feature'
assignees: ''
---

## Story: [Title]

**Priority**: [P0/P1/P2/P3]
**Labels**: type:feature, [area:frontend/backend/prisma/auth]
**Epic**: [#epic-number if applicable]

**User Story**: As a [role], I want to [action/capability], so that [benefit/value].

**Background**:
[Provide context about why this story is needed. Include:
- Dependencies on other issues (#xxx)
- Technical constraints or considerations
- Links to related specs in docs/specs/
- Any relevant architectural decisions]

---

## Acceptance Criteria

**1. [Major Component/Feature Name]:**
- [ ] Specific, testable requirement with implementation details
- [ ] Include file paths (e.g., `app/api/route.ts`), function names, model fields
- [ ] Define error handling requirements
- [ ] Specify loading/empty states for UI components

**2. [Additional Major Component]:**
- [ ] Continue with detailed, checkboxed criteria
- [ ] Each checkbox should be independently testable

[Aim for 10+ detailed acceptance criteria that provide clear implementation guidance. Reference issue #111 as an example of appropriate detail level.]

---

## Automated Test Plan

Create test file(s) at specified paths and include:

- [ ] **Test Case 1: [Descriptive Name]**
  - Setup: [preconditions]
  - Action: [what is being tested]
  - Assert: [expected outcome]

- [ ] **Test Case 2: [Descriptive Name]**
  - Setup: [preconditions]
  - Action: [what is being tested]
  - Assert: [expected outcome]

- [ ] **Test Case 3: [Edge Case/Error Handling]**
  - Setup: [preconditions]
  - Action: [what is being tested]
  - Assert: [expected outcome]

[Continue with 5+ comprehensive test scenarios covering happy path, edge cases, and error conditions]

**Test Files:**
- Unit: `path/to/unit.test.ts`
- Integration: `path/to/integration.test.ts`
- E2E: `path/to/e2e.spec.ts`

---

## Manual Test Plan

**Setup:**
1. [Step-by-step setup instructions]
2. [Include any database seeding: `npm run db:seed`]
3. [Environment variables or configuration needed]

**Verification:**
- [ ] [Step 1: Specific action to take]
  - Expected: [What should happen]
- [ ] [Step 2: Next verification step]
  - Expected: [What should happen]
- [ ] [Step 3: Continue with detailed verification steps]
  - Expected: [What should happen]

**(Optional) Additional Scenarios:**
- [ ] [Edge case 1]
- [ ] [Edge case 2]

---

## Implementation Notes

**File Locations:**
- Primary: `path/to/main/file.ts`
- Tests: `path/to/test.test.ts`
- Related: `path/to/related/file.tsx`

**Example Code/Schema** (if helpful):
```typescript
// Provide code snippets or Prisma schema examples
```

**Dependencies:**
- Depends on: #xxx - [description]
- Blocks: #xxx - [description]

**Related Specs:**
- `docs/specs/[feature-name]/spec.md`

---

## Notes / Out of Scope

[Any additional context, known limitations, or explicitly out-of-scope items]
