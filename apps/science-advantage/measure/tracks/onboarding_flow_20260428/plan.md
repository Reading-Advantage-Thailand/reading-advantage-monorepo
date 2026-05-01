# Implementation Plan

## Phase 1: Student First-Run Experience

- [ ] Task: Define first-run detection logic
  - [ ] Write tests for first-run check (no enrolled classes = first run)
  - [ ] Create `useFirstRun()` hook that checks enrolled class count from API
  - [ ] Cache first-run state to avoid re-checking on every render
- [ ] Task: Build student welcome screen
  - [ ] Write tests for welcome screen rendering and class join flow
  - [ ] Create `StudentWelcomeScreen` component with:
    - Greeting with student name
    - Brief explanation text
    - Prominent `JoinClassForm` embedded in the center
    - Helper text: "Ask your teacher for your class code"
  - [ ] Style with the expedition theme (warm, encouraging, not corporate)
- [ ] Task: Wire welcome screen to student dashboard
  - [ ] Modify `/student/page.tsx` to conditionally render welcome screen or normal dashboard
  - [ ] After successful class join, transition to normal dashboard (refresh or state update)
  - [ ] Returning students with classes see normal dashboard (no welcome screen)
- [ ] Task: Measure - Manual Verification 'Student First-Run'
  - [ ] Verify new student sees welcome screen
  - [ ] Verify joining a class transitions to normal dashboard
  - [ ] Verify returning student does NOT see welcome screen

## Phase 2: Teacher First-Run Experience

- [ ] Task: Build teacher setup wizard
  - [ ] Write tests for wizard step progression and class creation
  - [ ] Create `TeacherSetupWizard` component with 3 steps:
    - Step 1: "Create your first class" — name, grade, standards (reuse `CreateClassForm` fields)
    - Step 2: "Share the join code" — show join code with copy-to-clipboard, instructions
    - Step 3: "What's next" — brief overview of features: preview lessons, track progress, intervention alerts
  - [ ] Step indicator showing current step (1 of 3)
  - [ ] Back button to go to previous step
- [ ] Task: Wire wizard to teacher dashboard
  - [ ] Modify `/teacher/page.tsx` to conditionally render wizard or normal dashboard
  - [ ] Check if teacher has any classes (API call to `/api/classes`)
  - [ ] After completing wizard, show normal dashboard
  - [ ] After creating class in wizard step 1, proceed to step 2 with the new class's join code
- [ ] Task: Measure - Manual Verification 'Teacher First-Run'
  - [ ] Verify new teacher sees 3-step wizard
  - [ ] Verify creating a class in step 1 shows join code in step 2
  - [ ] Verify completing wizard shows normal dashboard

## Phase 3: Landing Page and Contextual Help

- [ ] Task: Update landing page
  - [ ] Replace "Coming 2025" and "Launch Expected 2025" with current messaging
  - [ ] Update CTA button to link to `/signin` instead of waitlist
  - [ ] Update or remove "Technical Requirements" section
  - [ ] Verify all links work
- [ ] Task: Implement contextual help tooltips
  - [ ] Write tests for help tooltip display and dismissal
  - [ ] Create `ContextualHelp` component with "?" icon and tooltip/popover content
  - [ ] Add help tooltips to:
    - Student dashboard: explain join code, explain XP/levels
    - Teacher dashboard: explain class cards, explain intervention alerts
  - [ ] Dismissal persists to localStorage (keyed by surface ID)
  - [ ] Tooltip is keyboard-accessible and screen-reader friendly
- [ ] Task: Implement post-onboarding checklist
  - [ ] Write tests for checklist item completion detection
  - [ ] Create `OnboardingChecklist` component:
    - Students: "Join a class", "Complete your first lesson", "Take your first quiz"
    - Teachers: "Create a class", "Share join code with students", "Preview a lesson"
  - [ ] Check items off based on actual user data (class enrollment, lesson completions)
  - [ ] Hide checklist when all items are complete
  - [ ] Persist dismissal to localStorage
- [ ] Task: Measure - Manual Verification 'Landing and Help'
  - [ ] Verify landing page shows current year and links to /signin
  - [ ] Verify help tooltips appear on first visit and are dismissible
  - [ ] Verify checklist tracks progress and disappears when complete

## Phase 4: Progressive Enhancement and Accessibility

- [ ] Task: Ensure onboarding works without JavaScript
  - [ ] Student welcome screen: render as a standard HTML form (no client-side wizard)
  - [ ] Teacher setup wizard: render as a multi-page server-rendered flow (or a single-page form with all fields)
  - [ ] Help tooltips: show as visible text blocks when JS is disabled
  - [ ] Checklist: render as a static list (items don't auto-check without JS)
- [ ] Task: Accessibility audit
  - [ ] Verify all onboarding components are keyboard-navigable
  - [ ] Verify screen reader labels on form inputs and buttons
  - [ ] Verify focus management in wizard steps (focus moves to new content on step change)
  - [ ] Verify color contrast meets WCAG AA
- [ ] Task: Measure - Manual Verification 'Accessibility'
  - [ ] Verify keyboard navigation through teacher wizard
  - [ ] Verify screen reader announces step changes
  - [ ] Verify onboarding renders without JavaScript (basic form visible)
