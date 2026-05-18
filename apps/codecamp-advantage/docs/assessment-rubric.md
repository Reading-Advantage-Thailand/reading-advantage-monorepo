# Assessment Rubric — CodeCamp Advantage Intern Bootcamp

This document defines assessment standards for theory lessons, exercises, and the capstone project. It is an operational reference for instructors and is shared with interns at the start of each phase.

---

## 1. Quiz Assessment

### Pass Threshold

| Result | Score | Outcome |
|---|---|---|
| Pass | 70% or above | Lesson marked complete |
| Fail | Below 70% | Lesson remains `in_progress`; retry required |

### Retry Policy

- Interns may retry a quiz immediately after failure — there is no cooldown period.
- Retries are **unlimited**. The goal is learning, not gatekeeping.
- The most recent passing score is recorded as the completion score.

### Instructor Actions

| Condition | Action |
|---|---|
| First or second failure | Encourage self-review; no intervention required |
| Third consecutive failure on the same quiz | Flag for instructor review session |
| Consistent scores below 50% across multiple quizzes | Schedule a one-on-one concept review |

> **Note:** A failed quiz does not advance the lesson. Progress stays at `in_progress` until a passing score is recorded.

---

## 2. Exercise Rubric (Per-Module Exercises)

Exercises follow a fork → change → open PR → LLM review workflow. Instructors and the LLM reviewer evaluate submissions against the five dimensions below.

### Rating Levels

| Level | Meaning |
|---|---|
| **Meets Standard** | Work is complete, correct, and shows understanding |
| **Needs Improvement** | Work is partially complete or has fixable issues; resubmission required |
| **Not Meeting Standard** | Work is incomplete, incorrect, or shows a fundamental misunderstanding |

### Rubric Dimensions

#### Requirements Fulfillment
Does the submitted code do what the exercise specification asks?

| Level | Criteria |
|---|---|
| Meets Standard | All required functionality is implemented and works as specified |
| Needs Improvement | Most functionality is present; one or two minor requirements are missing or broken |
| Not Meeting Standard | Core requirements are missing or the implementation does not run |

#### Code Quality
Is the code readable and maintainable?

| Level | Criteria |
|---|---|
| Meets Standard | Variables and functions are named clearly; no commented-out dead code; logic is easy to follow |
| Needs Improvement | Some naming is unclear or dead code is present; readability could be improved with minor changes |
| Not Meeting Standard | Naming is misleading, code is difficult to read, or there is significant dead code |

#### TypeScript Usage
Are types used correctly and intentionally?

| Level | Criteria |
|---|---|
| Meets Standard | Proper types on all function parameters and return values; no implicit `any`; types reflect domain intent |
| Needs Improvement | A few untyped values or unnecessary `any`; types are present but imprecise |
| Not Meeting Standard | Types are absent, all `any`, or TypeScript is bypassed in a way that defeats its purpose |

#### Commit Message
Does the commit history communicate what was done?

| Level | Criteria |
|---|---|
| Meets Standard | Present-tense, imperative mood; scoped to the change; describes what was done (e.g., `feat(auth): add login form validation`) |
| Needs Improvement | Message is vague or too broad (e.g., `update stuff`) but conveys the general intent |
| Not Meeting Standard | Message is empty, auto-generated (`initial commit`, `fix`), or completely unrelated to the change |

#### PR Description
Does the pull request explain the work?

| Level | Criteria |
|---|---|
| Meets Standard | Describes what was changed, why, and references the exercise; mentions any assumptions or edge cases |
| Needs Improvement | Description exists but is brief or missing key context; the reviewer must infer intent |
| Not Meeting Standard | Description is empty, a copy-paste of the exercise prompt, or says only "done" |

---

## 3. Capstone PR Rubric (Module 18)

Module 18 is the capstone: a real GitHub PR workflow using `codecamp-progress-tracker`. Interns are evaluated on professional workflow behaviors in addition to code correctness.

### Rubric Dimensions

#### PR Description Quality

| Level | Criteria |
|---|---|
| Meets Standard | Clear problem statement; explains approach taken; includes notes on how the change was tested or verified |
| Needs Improvement | Problem is stated but approach or testing notes are missing |
| Not Meeting Standard | No description, or the description does not reflect what the PR actually contains |

#### Commit Hygiene

| Level | Criteria |
|---|---|
| Meets Standard | Commits are atomic (one logical change per commit); messages are meaningful and consistent; no `WIP`, `fix fix fix`, or `asdf` commits |
| Needs Improvement | Most commits are reasonable, but one or two are squash candidates or have weak messages |
| Not Meeting Standard | History is a series of `fix` commits, a single dump of all changes, or contains messages that obscure the work |

#### Code Review Responsiveness

| Level | Criteria |
|---|---|
| Meets Standard | Addresses all reviewer feedback within 24 hours; explains decisions when not implementing a suggestion; communicates if blocked |
| Needs Improvement | Responds but exceeds 24 hours, or accepts suggestions without engaging with the reasoning |
| Not Meeting Standard | Does not respond, does not address feedback, or closes and reopens the PR to avoid the review history |

#### Test Coverage

| Level | Criteria |
|---|---|
| Meets Standard | New functionality is accompanied by tests or a clear verification step documented in the PR |
| Needs Improvement | Tests exist but do not cover the new code path; or tests are present but not meaningful |
| Not Meeting Standard | No tests; no verification described; purely manual check with no documentation |

#### Independence

| Level | Criteria |
|---|---|
| Meets Standard | Solved the majority of issues independently; used documentation and error messages to diagnose; escalated appropriately when stuck |
| Needs Improvement | Required frequent prompting to get unstuck; did not attempt to diagnose before asking |
| Not Meeting Standard | Could not make progress without step-by-step instructor guidance for most of the work |

---

## 4. Rubric Score Summary Table

The following table maps each dimension to its three levels for quick reference during reviews.

| Dimension | Meets Standard | Needs Improvement | Not Meeting Standard |
|---|---|---|---|
| Requirements Fulfillment | All requirements implemented and functional | Minor requirements missing or broken | Core requirements absent or code does not run |
| Code Quality | Clear naming, no dead code, readable logic | Some unclear naming or dead code present | Misleading names, unreadable, or significant dead code |
| TypeScript Usage | Proper types throughout; no implicit `any` | A few untyped values or imprecise types | Absent types, pervasive `any`, or TypeScript bypassed |
| Commit Message | Present-tense, scoped, descriptive | Vague but conveys general intent | Empty, auto-generated, or unrelated to change |
| PR Description | What, why, and exercise reference included | Brief or missing key context | Empty, copy-pasted prompt, or "done" |
| PR Description Quality (Capstone) | Problem, approach, and testing notes present | Problem stated; approach or test notes missing | Description absent or mismatched to PR content |
| Commit Hygiene (Capstone) | Atomic commits, meaningful messages | Mostly reasonable; a few squash candidates | Series of `fix` commits or single dump |
| Code Review Responsiveness | Feedback addressed within 24h with explanation | Responds but late or without engagement | No response or feedback ignored |
| Test Coverage | New functionality has tests or documented verification | Tests present but don't cover new path | No tests and no verification documented |
| Independence | Majority of issues solved independently | Frequent prompting needed | Could not progress without step-by-step guidance |

---

## 5. Remediation Rules

These rules define the required next step when an intern does not meet standard.

| Situation | Required Action |
|---|---|
| **Failed quiz (1st or 2nd attempt)** | Review the relevant lesson content and retry the quiz |
| **Failed quiz (3rd attempt on the same quiz)** | Instructor flags the intern for a one-on-one concept review before retrying |
| **PR returns `needs_changes`** | Fix the specific feedback items on the same branch, push the update, and re-request review — do not open a new PR |
| **Module exercise rated Not Meeting Standard** | Instructor must approve the resubmission before the intern advances to the next module |
| **Stuck for more than 30 minutes** | Intern is required to ask for help or escalate — silent struggle is not a productive use of time and must not continue |

> **Escalation is a skill.** Knowing when and how to ask for help is part of professional development. Interns are not penalized for asking; they are penalized for not asking.

---

## 6. Independence and Escalation Rubric

A key learning outcome of this bootcamp is the ability to work independently while escalating appropriately. This dimension is assessed informally throughout all phases and formally in the capstone.

| Level | Observable Behavior |
|---|---|
| **Meets Standard** | Reads the error message or documentation first; tries one or two solutions; then asks a precise question that includes what was tried and what the result was |
| **Needs Improvement** | Asks for help without first attempting to diagnose (zero-effort ask); or conversely, spends more than 2 hours stuck without asking anyone |
| **Not Meeting Standard** | Cannot articulate what they tried, what error they are seeing, or what they expected to happen; treats the instructor as a first resort rather than a last resort |

### What a Good Escalation Looks Like

A well-formed help request includes:
1. What the intern was trying to do
2. What they tried (at least one specific attempt)
3. What happened (the actual error or unexpected behavior)
4. What they expected to happen

**Example of a poor escalation:** "It doesn't work."

**Example of a good escalation:** "I'm trying to run the dev server. I ran `npm run dev` and got `Error: Cannot find module './config'`. I checked that the file exists in the same directory, but the error is still there. I expected it to start on port 3000."
