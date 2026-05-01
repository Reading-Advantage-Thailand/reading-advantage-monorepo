# Implementation Plan

## Phase 1: Lesson Type Visual Identity

- [ ] Task: Define lesson type color and icon system
  - [ ] Write tests for lesson type badge rendering with correct colors and icons
  - [ ] Create a `lesson-type-config.ts` mapping: LESSON→green/BookOpen, LAB→blue/FlaskConical, REVIEW→coral/Gamepad2, ASSESSMENT→gold/ClipboardCheck
  - [ ] Export color classes and icon components for each type
- [ ] Task: Update curriculum view with type badges
  - [ ] Add lesson type badge to each entry in `StudentCurriculumView` accordion
  - [ ] Add lesson type badge to each entry in `CurriculumAccordion` (teacher view)
  - [ ] Badge shows icon + type name with the type-specific color
- [ ] Task: Add visual differentiation to lesson pages
  - [ ] Add accent color border/top-bar to lesson page based on type
  - [ ] Add type badge in the lesson header area
  - [ ] LESSON: green top border, LAB: blue, REVIEW: coral, ASSESSMENT: gold
- [ ] Task: Measure - Manual Verification 'Visual Identity'
  - [ ] Verify each lesson type shows correct color badge in curriculum view
  - [ ] Verify lesson page header shows type-specific accent color

## Phase 2: Lab-Specific Features

- [ ] Task: Implement lab safety notice
  - [ ] Write tests for safety notice rendering on LAB lesson type
  - [ ] Create `LabSafetyNotice` component with prominent banner styling
  - [ ] Show banner at top of lesson when `lessonType === 'LAB'`
  - [ ] Banner is dismissible but reappears on each visit (not persisted)
- [ ] Task: Implement step-by-step procedure mode
  - [ ] Write tests for step-by-step navigation (next/previous, completion tracking)
  - [ ] Modify `ProcedureBlock` to detect lab context and render in "step mode"
  - [ ] Step mode: show one step at a time with Previous/Next buttons
  - [ ] Step completion tracked in local state (checkbox still works)
  - [ ] Show progress indicator ("Step 2 of 5")
- [ ] Task: Implement lab timer
  - [ ] Write tests for timer display and countdown
  - [ ] Create `LabTimer` component with configurable duration
  - [ ] Timer runs client-side (localStorage for persistence across page refreshes)
  - [ ] Show time remaining prominently in the lesson header
  - [ ] Alert when time is up (visual, not audio)
- [ ] Task: Implement materials checklist
  - [ ] Modify `MaterialsBlock` to render as interactive checklist when in lab context
  - [ ] Checkboxes persist to localStorage (gathered items stay checked)
  - [ ] Show "X of Y items gathered" progress
- [ ] Task: Measure - Manual Verification 'Lab Features'
  - [ ] Verify safety notice appears on lab lessons
  - [ ] Verify step-by-step mode works for procedure blocks in labs
  - [ ] Verify timer counts down and persists across refresh

## Phase 3: Assessment-Specific Features

- [ ] Task: Implement assessment timer
  - [ ] Write tests for assessment countdown timer
  - [ ] Create `AssessmentTimer` component with configurable duration (default 30 min)
  - [ ] Timer is tamper-resistant: server stores assessment start time, client displays countdown
  - [ ] Auto-submit when timer reaches zero
  - [ ] Show warning at 5 minutes remaining
- [ ] Task: Implement question navigator grid
  - [ ] Write tests for question grid state (answered/unanswered/reviewed)
  - [ ] Create `QuestionNavigator` component showing numbered grid
  - [ ] Color-code: green (answered), yellow (marked for review), gray (unanswered)
  - [ ] Click a number to jump to that question
- [ ] Task: Implement assessment navigation rules
  - [ ] Default forward-only navigation (Previous button hidden unless question is marked for review)
  - [ ] Add "Mark for Review" toggle on each question
  - [ ] Show "X unanswered" count in submission confirmation
  - [ ] Double-confirm dialog on submit
- [ ] Task: Implement score reveal animation
  - [ ] After assessment submission, show "Grading..." animation for 2-3 seconds
  - [ ] Then reveal score with emphasis animation
  - [ ] Respect prefers-reduced-motion (skip delay, show score immediately)
- [ ] Task: Measure - Manual Verification 'Assessment Features'
  - [ ] Verify assessment timer counts down
  - [ ] Verify question navigator shows correct color coding
  - [ ] Verify forward-only navigation works
  - [ ] Verify double-confirm on submit

## Phase 4: Review-Specific Features

- [ ] Task: Implement game-like review presentation
  - [ ] Modify quiz rendering for REVIEW type: larger text, more spacing, playful card design
  - [ ] Use coral/terracotta accent colors for review question cards
  - [ ] Increase font size for question text in review mode
- [ ] Task: Implement immediate feedback
  - [ ] Modify quiz flow for REVIEW type: show correct/incorrect immediately after each answer
  - [ ] Show brief explanation or encouraging message after each answer
  - [ ] No waiting until the end for results
- [ ] Task: Implement score tracker and encouragement
  - [ ] Show running score during review ("3/5 correct so far!")
  - [ ] Add randomized encouraging messages between questions
  - [ ] Show celebration animation when all questions answered correctly
- [ ] Task: Measure - Manual Verification 'Review Features'
  - [ ] Verify review questions have playful visual treatment
  - [ ] Verify immediate feedback after each answer
  - [ ] Verify running score tracker updates

## Phase 5: Curriculum Filtering

- [ ] Task: Add lesson type filter to curriculum views
  - [ ] Write tests for filter toggle behavior
  - [ ] Add filter buttons (All, Lessons, Labs, Reviews, Assessments) above curriculum accordion
  - [ ] Filter shows/hides lessons by type
  - [ ] Filter state persists to URL query params (shareable)
- [ ] Task: Measure - Manual Verification 'Filtering'
  - [ ] Verify filter buttons appear and work
  - [ ] Verify filtered view shows only matching lesson types
