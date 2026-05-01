# Specification: Onboarding Flow

## Overview

There is no onboarding flow. New students land on an empty dashboard and must know to enter a 6-character join code. New teachers see an empty class list with no guidance. The landing page says "Coming 2025" with waitlist CTAs. This track builds a guided first-run experience so teachers and students can self-service onboard without external training.

## Functional Requirements

### 1. Student First-Run Experience
- After first login (no classes enrolled), show a **welcome screen** instead of the empty dashboard:
  - Friendly greeting with student name
  - Brief explanation: "Welcome to Science Advantage! Here's how to get started."
  - Prominent join class input (the existing `JoinClassForm` embedded in the welcome screen)
  - Optional: "Ask your teacher for your class code" helper text
- After joining the first class, transition to the normal dashboard with the new class visible
- On subsequent logins, if the student has classes, show the normal dashboard (no welcome screen)

### 2. Teacher First-Run Experience
- After first login (no classes created), show a **setup wizard** instead of the empty class list:
  - Step 1: "Create your first class" — class name, grade level, standards alignment (reuse `CreateClassForm` fields)
  - Step 2: "Share the join code" — after class creation, prominently display the join code with copy-to-clipboard and instructions to share with students
  - Step 3: "What's next" — brief overview of what the teacher can do: preview lessons, track progress, see intervention alerts
- On subsequent logins, show the normal class list (no wizard)

### 3. Landing Page Update
- Replace "Coming 2025" and "Launch Expected 2025" with current messaging
- Update the CTA to point to `/signin` instead of a waitlist
- Remove or update the "Technical Requirements" section to reflect the actual current stack

### 4. Contextual Help
- Add a small "?" tooltip or help icon on key dashboard surfaces:
  - Student dashboard: explain the join code, explain XP/levels
  - Teacher dashboard: explain what each card shows, how intervention alerts work
- Help text is dismissible and remembers dismissal (localStorage)
- Not a full tour — just inline clarifications for the first visit

### 5. Post-Onboarding Checklist
- After completing first-run setup, show a small progress checklist on the dashboard:
  - Students: "Join a class ✓", "Complete your first lesson", "Take your first quiz"
  - Teachers: "Create a class ✓", "Share join code with students", "Preview a lesson"
- Checklist items check off as the student/teacher completes them
- Checklist disappears after all items are complete

## Non-Flow Requirements

- First-run detection must be based on actual data state (no classes enrolled / no classes created), not a separate "has seen onboarding" flag
- Onboarding must work without JavaScript (progressive enhancement — show a simple form, not a wizard)
- Welcome screens must be accessible (keyboard navigable, screen reader friendly)
- Onboarding must not block access to settings or sign-out

## Acceptance Criteria

1. New student with no classes sees a welcome screen with prominent join class input
2. New teacher with no classes sees a 3-step setup wizard
3. After completing onboarding, users see the normal dashboard
4. Landing page shows current year and links to `/signin`
5. Contextual help tooltips appear on key surfaces on first visit
6. Post-onboarding checklist tracks first actions and disappears when complete
7. Onboarding works without JavaScript (graceful degradation)
8. Returning users with existing classes/rosters do NOT see onboarding screens

## Out of Scope

- Video tutorials or interactive walkthroughs
- Teacher-to-student invitation system (email-based)
- Bulk student import or CSV upload
- School-level onboarding or admin setup wizard
