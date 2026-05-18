# Pacing Guide — CodeCamp Advantage Intern Bootcamp

This document provides pacing recommendations for instructors delivering the 18-module, 85-lesson CodeCamp Advantage curriculum. Each class period is approximately 80 minutes.

---

## 1. Standard Class Period Structure (80 Minutes)

| Time | Activity |
|---|---|
| 0–15 min | Review previous lesson; address questions and common mistakes from exercises or quizzes |
| 15–60 min | Guided practice or active exercise time; instructor circulates and unblocks interns |
| 60–75 min | Debrief: pair review of exercise output, discuss common patterns and mistakes observed |
| 75–80 min | Preview next lesson; orient interns to what they will encounter next time |

> **Note:** The review segment at the start is load-bearing. Skipping it compresses learning and results in interns carrying unresolved confusion into new material.

---

## 2. High-Load Modules (Plan for 1–2 Buffer Periods)

The following modules consistently require extra time due to conceptual density, paradigm shifts, or hands-on complexity. Plan for one to two additional 80-minute periods per module listed here.

| Module | Topic | Reason for Extra Time |
|---|---|---|
| **Module 4** | JavaScript Fundamentals | Functions, scope, and closures are conceptually dense for beginners; common source of confusion that compounds in later modules if not resolved |
| **Module 6** | React | `useState`, `useEffect`, and the re-render mental model represent a significant shift from imperative thinking; expect multiple sessions on these concepts |
| **Module 7** | Next.js | App Router, Server Components, and the RSC vs. Client Component distinction are a paradigm shift even for interns with React experience |
| **Module 11** | Node.js / Async | Promises, `async`/`await`, and the event loop are a common confusion point; synchronous-thinking habits from earlier modules resurface here |
| **Module 13** | Drizzle ORM / Databases | Schema design, migrations, and the query builder require hands-on time; interns often need multiple attempts to internalize the data model layer |
| **Module 16** | Docker | Container concepts, Dockerfile authoring, and networking require a new mental model with no prior analogy in the curriculum |
| **Module 18** | Capstone (GitHub PR Workflow) | Real-world review cycles, async feedback, and the full workflow introduce delays that cannot be fully compressed |

---

## 3. Phase-End Minimum Viable Mastery

Interns must demonstrate the following before advancing to the next phase. These are baseline competencies, not excellence benchmarks.

### Before Phase B (End of Module 5)

- Navigates the command line with confidence: file system traversal, creating and editing files
- Uses Git for basic workflows: `init`, `clone`, `add`, `commit`, `push`, `pull`, branching
- Writes valid, semantic HTML with appropriate CSS styling
- Writes JavaScript functions, works with arrays and objects, understands variable scope

### Before Phase C (End of Module 10)

- Builds a React component using hooks (`useState`, `useEffect`)
- Uses Next.js routing (App Router) to navigate between pages
- Writes TypeScript with explicit types on function parameters and return values
- Implements a basic user authentication flow (sign in, session, protected route)

### Before Phase D (End of Module 15)

- Writes domain functions that include database queries using Drizzle ORM
- Creates tRPC procedures and calls them from a frontend component
- Writes unit tests for domain logic that cover at least the happy path and one error case

### Before Module 18 (Capstone Prerequisite)

- Can fork a repository, create a feature branch, make a meaningful change, and open a pull request with a written description
- The GitHub App (`codecamp-progress-tracker`) is operational and linked to the intern's account

> **Gate rule:** Module 18 must not be started until all Phase D modules are complete and the GitHub App is confirmed operational for the intern.

---

## 4. Cohort Pacing Recommendations

Use cohort-level signals to decide when to slow down, re-teach, or restructure delivery.

| Signal | Recommended Action |
|---|---|
| More than 30% of the cohort fails the same quiz | Re-teach the concept before moving to the next lesson; do not advance until the majority has passed |
| Average PR review turnaround exceeds 48 hours | Reduce exercise scope for that module, or pair interns on the exercise to accelerate cycle time |
| Most PRs for a module require structural changes after first review | Spend one additional period on the concept with a live coding demonstration before interns attempt the exercise |
| An intern has not submitted a PR within 2 class periods of starting a module | Treat as an intervention trigger (see Section 5) |

### Phase Buffer Recommendation

Add one additional week between Phase B and Phase C. Database concepts and async patterns in Phase C benefit significantly from interns having extra time to consolidate their React and Next.js knowledge before moving into backend work.

---

## 5. Signs an Intern Needs Intervention

The following patterns indicate an intern is falling behind and requires direct instructor attention before they lose confidence or fall too far behind the cohort.

| Pattern | Threshold for Action |
|---|---|
| Quiz scores consistently below 50% on first attempt | After two consecutive modules showing this pattern |
| Cannot complete exercises without step-by-step guidance | If observed in more than one exercise per phase |
| PRs require major structural changes (not just corrections) after first review | After two consecutive module exercises |
| Has not submitted a PR within 2 class periods of starting a module | Immediately upon observing this — do not wait for the third period |
| Cannot articulate what error they are seeing or what they tried | Any occurrence — this is an escalation-skill gap requiring explicit coaching |

### Intervention Steps

1. Schedule a short one-on-one (15–20 min) to diagnose where the intern is stuck
2. Identify whether the issue is conceptual, procedural, or environmental (tooling/setup)
3. Assign a targeted review activity rather than re-doing the same exercise
4. Check in at the start of the next class period before the group review begins

---

## 6. Instructor Pacing Tools

The admin dashboard provides the primary tooling for tracking cohort and individual progress.

| Tool / View | What It Shows | How to Use It |
|---|---|---|
| Admin dashboard — cohort overview | Progress percentage per intern across all modules | Review at the start of each week to identify interns who are falling behind the cohort median |
| Admin dashboard — per-module breakdown | Completion status and quiz average scores by module for each intern | Use before planning a session to decide whether the class is ready to advance |
| PR review history | Per-intern PR submissions, review status, and reviewer comments | Review weekly to assess exercise quality trends and identify interns needing rubric coaching |

### Weekly Instructor Checklist

- [ ] Check cohort progress percentages — flag any intern more than one module behind the cohort median
- [ ] Review quiz average scores for the most recently completed module — re-teach if cohort average is below 70%
- [ ] Review open PRs — ensure no PR has been waiting for review for more than 48 hours
- [ ] Check for interns who have not submitted a PR in two or more class periods
- [ ] Update any intervention notes for flagged interns before the next session

---

## 7. Module Pacing Reference

Approximate time allocation across all 18 modules. Modules marked with a buffer indicator should have 1–2 extra periods allocated.

| Module | Phase | Topic | Standard Periods | Buffer |
|---|---|---|---|---|
| 1 | A | Dev Environment Setup | 2 | — |
| 2 | A | CLI Basics | 2 | — |
| 3 | A | Git Fundamentals | 3 | — |
| 4 | A | HTML & CSS | 3 | — |
| 5 | A | JavaScript Fundamentals | 4 | +1–2 |
| 6 | B | React Hooks | 5 | +1–2 |
| 7 | B | Next.js App Router | 5 | +1–2 |
| 8 | B | TypeScript | 3 | — |
| 9 | B | Tailwind CSS | 2 | — |
| 10 | B | Authentication | 4 | — |
| 11 | C | Node.js / Async | 4 | +1–2 |
| 12 | C | Databases | 3 | — |
| 13 | C | Drizzle ORM | 4 | +1–2 |
| 14 | C | tRPC | 3 | — |
| 15 | C | Testing | 3 | — |
| 16 | D | Docker | 4 | +1–2 |
| 17 | D | Monorepo Architecture | 3 | — |
| 18 | D | Capstone: GitHub PR Workflow | 5 | +1–2 |

> **Total:** ~63 standard periods. With buffers applied to high-load modules, plan for approximately 75–80 class periods (roughly 100–107 hours of instruction time).
