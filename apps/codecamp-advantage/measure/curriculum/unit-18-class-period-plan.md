# Unit 18 Class Period Plans: Real-World Practice

---

## Period 1: Reading Issues and Planning Implementation

**Duration:** ~60 minutes

### Opening (5 min)

- This is the capstone — you'll work the way Reading Advantage developers work every day
- Every change starts with an Issue, ends with a merged PR
- Today: learn the workflow and pick your first Issue

### Activity: The Feature Delivery Lifecycle (15 min)

```
1. Read the Issue
   ↓
2. Understand the acceptance criteria
   ↓
3. Create a feature branch: feat/issue-1-module-completion
   ↓
4. Implement the change (TDD: write tests first!)
   ↓
5. Run lint, typecheck, and tests locally
   ↓
6. Commit with conventional commit message
   ↓
7. Push the branch
   ↓
8. Open a PR referencing the Issue: "Closes #1"
   ↓
9. Address review feedback
   ↓
10. Merge when approved
```

### Activity: How to Read an Issue (15 min)

Example Issue #3: **Implement lesson prerequisite checks**

```
## Description
Currently, students can access any lesson regardless of whether they've
completed the previous ones. We need to enforce prerequisites so students
must complete lessons in order within a module.

## Acceptance Criteria
- [ ] A student cannot access a lesson if the previous lesson is not completed
- [ ] The lesson list shows locked lessons with a 🔒 icon
- [ ] Clicking a locked lesson shows a tooltip: "Complete the previous lesson first"
- [ ] Admins and teachers can access any lesson regardless of prerequisites
- [ ] The domain function `getLesson` checks prerequisites before returning data
- [ ] Unit tests for the prerequisite check in `packages/domain`
- [ ] The check uses the existing `progress` table to determine completion

## Technical Notes
- Add a `checkLessonPrerequisite` function in `src/domain/lessons/`
- Use `assertCan` pattern: check permission first, then check prerequisite
- Locked lessons should still appear in the list (just not clickable)
```

**How to approach this:**
1. Read the description and acceptance criteria carefully
2. Identify the changes needed:
   - New domain function: `checkLessonPrerequisite`
   - Modify `getLesson` to check prerequisites
   - Modify `LessonList` component to show lock icons
   - Write unit tests
3. Estimate the scope — is this one commit or multiple?
4. Plan the implementation order: test → domain → router → UI

### Activity: Pick and Start Your First Issue (25 min)

The intern picks from the pre-filed Issues on the tracker repo. Start with an **Easy** issue:

**Issue #1: Add module completion percentage to dashboard**

1. Create a branch:
   ```bash
   git switch -c feat/issue-1-module-completion
   ```

2. Plan the implementation:
   - Domain function: Calculate completion percentage per module
   - tRPC procedure: Add completion percentage to dashboard query
   - UI: Show percentage on dashboard module cards

3. Start coding — write the test first (TDD!):
   ```typescript
   // src/domain/__tests__/modules.test.ts
   describe("getModuleCompletionPercentage", () => {
     it("returns 0 when no lessons are completed", () => {
       // ...
     });

     it("returns 100 when all lessons are completed", () => {
       // ...
     });

     it("returns 50 when half the lessons are completed", () => {
       // ...
     });
   });
   ```

### Closing

- Feature delivery lifecycle, reading Issues, first implementation started ✓
- Preview: Period 2 continues with PRs and code review

---

## Period 2: Opening PRs and Code Review

**Duration:** ~60 minutes

### Opening (5 min)

- The PR is how you communicate your change to the team
- A good PR description makes review fast and painless
- Today: finish Issue #1, open a PR, and practice code review

### Activity: Write a Good PR Description (15 min)

```markdown
## Summary
Adds module completion percentage to the dashboard.

Closes #1

## Changes
- Added `getModuleCompletionPercentage` domain function in `src/domain/modules/`
- Added unit tests for the domain function (3 test cases)
- Updated dashboard tRPC query to include `completionPercentage`
- Updated `ModuleCard` component to display percentage

## Testing
- [x] Unit tests pass (`pnpm test --filter=@tracker/domain`)
- [x] Lint passes (`pnpm lint`)
- [x] Manually tested on dashboard — percentage shows correctly

## Screenshots
Before: Module card shows "3/6 lessons"
After: Module card shows "3/6 lessons (50%)"
```

**PR description checklist:**
- ✅ References the Issue ("Closes #1")
- ✅ Explains what changed and why
- ✅ Lists testing steps
- ✅ Shows before/after if UI changed

### Activity: Open the PR (10 min)

```bash
# Commit your changes
git add -A
git commit -m "feat: add module completion percentage to dashboard

Closes #1"

# Push the branch
git push -u origin feat/issue-1-module-completion
```

Then open the PR on GitHub. The LLM code review bot will automatically review the PR.

### Activity: Code Review Etiquette (15 min)

**When you receive review feedback:**

1. Read all comments before responding
2. Address every comment (even if just "Done")
3. If you disagree, explain why respectfully
4. Push fixes as new commits (don't force-push during review)
5. Re-request review after addressing feedback

**When you review someone else's code (practice with a peer's PR):**

1. Start with something positive
2. Be specific: "Line 42: This could be simplified to..." not "This is messy"
3. Distinguish blocking issues from suggestions:
   - 🔴 **Blocking**: Must fix before merge (bugs, security issues, missing tests)
   - 🟡 **Suggestion**: Nice to have (naming, code style, minor optimization)
   - 🟢 **Nit**: Pure preference, not important
4. Don't block on nits — they slow down the team

### Activity: Start Issue #2 or #3 (15 min)

Pick the next Issue and start implementing. Try a **Medium** difficulty this time:

- Issue #3: Implement lesson prerequisite checks (requires domain logic + UI)
- Issue #5: Add email validation to login form (simpler, good for speed)

### Closing

- PR writing, code review etiquette, second issue started ✓
- Preview: Period 3 continues with more Issues

---

## Period 3: Continued Practice — Medium Difficulty Issues

**Duration:** ~60 minutes

### Opening (5 min)

- Periods 3 and 4 are open work time
- Goal: complete 3–4 Issues total across the 4 periods
- Today: continue with medium-difficulty Issues

### Activity: Independent Work (50 min)

The intern works on Issues #3–#8 independently, following the full workflow:

1. Read the Issue
2. Create a branch
3. Write tests first (TDD)
4. Implement the feature
5. Run lint + typecheck + tests
6. Commit with conventional commit message
7. Open a PR
8. Address LLM review feedback
9. Merge

The instructor is available for questions but does not provide step-by-step guidance.

**Tips for medium Issues:**
- Break the Issue into smaller sub-tasks in your head
- Commit after each sub-task (atomic commits)
- If you get stuck, write a comment on the Issue asking for clarification
- Use `assertCan()` for any new domain functions
- All new code needs tests

### Closing (5 min)

- Track which Issues you've completed
- Preview: Period 4 is the final work session

---

## Period 4: Final Practice and Retrospective

**Duration:** ~60 minutes

### Opening (5 min)

- Last period of the entire course!
- Today: finish remaining Issues and reflect on what you've learned

### Activity: Independent Work (35 min)

Continue working on Issues. Priority:
1. Finish any open PRs
2. Address any pending review feedback
3. Start a new Issue if time permits
4. Try a Hard Issue (#9 or #10) if you're ahead

### Activity: Course Retrospective (20 min)

Reflect on the entire 85-period journey:

**Discussion questions:**
1. What was the most challenging unit? Why?
2. Which concept took the longest to "click"?
3. What would you build differently if you started over?
4. What's one thing from the Reading Advantage architecture that surprised you?
5. How confident do you feel about joining the Reading Advantage codebase now?

**Skills inventory — by the end, you can:**
- ✅ Set up a professional development environment
- ✅ Use Git/GitHub with Conventional Commits and PRs
- ✅ Build responsive web pages with HTML/CSS
- ✅ Write interactive web apps with JavaScript/TypeScript
- ✅ Test your code with Vitest
- ✅ Build component-based UIs with React 19.2.5
- ✅ Fetch data from APIs and handle errors
- ✅ Build full-stack apps with Next.js 16.0.0
- ✅ Design database schemas with Drizzle ORM 0.44.7
- ✅ Build type-safe APIs with tRPC 11.17.0
- ✅ Implement authentication and RBAC
- ✅ Add internationalization with next-intl 4.11.0
- ✅ Integrate AI with the Vercel AI SDK 4.3.19
- ✅ Understand monorepo architecture with pnpm + Turborepo
- ✅ Containerize apps with Docker
- ✅ Work with GitHub Issues, PRs, and code review

**What's next:**
- Join the Reading Advantage codebase — the architecture is familiar now
- Continue learning: the tracker app can be extended with more features
- The AI chat tutor is always available for questions
- Contribute to the real codecamp-advantage app

### Closing

🎉 **Congratulations! You've completed the Full-Stack Web Development Intern Bootcamp.**

18 units. 85 class periods. 4 portfolio projects. 1 complete full-stack application from database to deployment.

You're ready to build real software.
