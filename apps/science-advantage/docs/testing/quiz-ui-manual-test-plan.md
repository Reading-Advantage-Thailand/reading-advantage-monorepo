---
title: Quiz UI Manual Test Plan
type: test-plan
status: active
created_at: 2025-10-25
tags: [testing, qa, manual-test, quiz-ui, frontend]
description: A comprehensive manual test plan for the Quiz UI components, covering loading, interaction, submission, and accessibility scenarios.
---

# Quiz UI Manual Test Plan

**Story:** #94 - Quiz UI Components
**Date Created:** 2025-10-25
**Test Environment:** Development server (npm run dev)

## Prerequisites

- Development server running
- Authenticated as a student account
- Enrolled in a class with lessons containing quiz questions
- At least one lesson with a complete quiz (9+ questions with all 5 question types)

## Test Scenarios

### 1. Quiz Loading and Access

**Test Case 1.1: Student Accesses Quiz**
- [ ] Navigate to a lesson page as enrolled student
- [ ] Click "Quiz" tab
- [ ] Verify loading state displays with spinner
- [ ] Verify quiz loads successfully with first question

**Test Case 1.2: Unauthenticated Access**
- [ ] Sign out
- [ ] Navigate directly to a lesson quiz URL
- [ ] Verify 401 error message: "Please sign in to take this quiz"

**Test Case 1.3: Unauthorized Access**
- [ ] Sign in as student not enrolled in class
- [ ] Navigate to a quiz for a lesson in different class
- [ ] Verify 403 error message: "You are not enrolled in a class with this lesson"

### 2. Multiple Choice Questions

**Test Case 2.1: Display and Interaction**
- [ ] Navigate to a multiple choice question
- [ ] Verify question text displays correctly
- [ ] Verify all options display as radio buttons
- [ ] Select an option
- [ ] Verify only one option can be selected at a time
- [ ] Select a different option
- [ ] Verify previous selection is cleared

**Test Case 2.2: Navigation with Answer**
- [ ] Select an answer
- [ ] Click "Next"
- [ ] Click "Previous"
- [ ] Verify selected answer is preserved

### 3. Multiple Select Questions

**Test Case 3.1: Display and Interaction**
- [ ] Navigate to a multiple select question
- [ ] Verify "Select all that apply" instruction displays
- [ ] Verify all options display as checkboxes
- [ ] Select multiple options
- [ ] Verify all selected options show as checked
- [ ] Deselect one option
- [ ] Verify only that option is unchecked

**Test Case 3.2: Navigation with Answers**
- [ ] Select multiple answers (e.g., 2 out of 4)
- [ ] Click "Next"
- [ ] Click "Previous"
- [ ] Verify all selected answers are preserved

### 4. True/False Questions

**Test Case 4.1: Display and Interaction**
- [ ] Navigate to a true/false question
- [ ] Verify "True" and "False" radio buttons display
- [ ] Select "True"
- [ ] Verify "True" is selected
- [ ] Select "False"
- [ ] Verify "False" is selected and "True" is deselected

### 5. Fill-in-the-Blank Questions

**Test Case 5.1: Display and Interaction**
- [ ] Navigate to a fill-in-the-blank question
- [ ] Verify text input field displays
- [ ] Type an answer
- [ ] Verify text appears in input field
- [ ] Navigate away and back
- [ ] Verify entered text is preserved

**Test Case 5.2: Special Characters and Whitespace**
- [ ] Enter text with leading/trailing spaces
- [ ] Navigate to results after submission
- [ ] Verify grading handles whitespace normalization

### 6. Vocabulary Match Questions

**Test Case 6.1: Display and Interaction**
- [ ] Navigate to a vocabulary match question
- [ ] Verify instruction "Match each term with its definition" displays
- [ ] Verify all terms display with dropdown selectors
- [ ] Click first dropdown
- [ ] Verify all definitions appear as options
- [ ] Select a definition
- [ ] Verify selection displays in dropdown
- [ ] Repeat for all terms

**Test Case 6.2: Complete Matching**
- [ ] Match all terms to definitions
- [ ] Navigate away and back
- [ ] Verify all matches are preserved

### 7. Question Navigation

**Test Case 7.1: Previous Button**
- [ ] Start quiz (Question 1)
- [ ] Verify "Previous" button is disabled
- [ ] Navigate to Question 2
- [ ] Verify "Previous" button is enabled
- [ ] Click "Previous"
- [ ] Verify you're on Question 1

**Test Case 7.2: Next Button**
- [ ] Navigate to last question
- [ ] Verify "Next" button is replaced with "Submit Quiz" button

**Test Case 7.3: Progress Indicator**
- [ ] Start quiz
- [ ] Verify progress shows "Question 1 of X"
- [ ] Navigate through all questions
- [ ] Verify progress updates correctly for each question

### 8. Quiz Submission

**Test Case 8.1: Submit with Unanswered Questions**
- [ ] Leave some questions unanswered
- [ ] Navigate to last question
- [ ] Click "Submit Quiz"
- [ ] Verify alert: "Please answer all questions before submitting."
- [ ] Verify submission is prevented

**Test Case 8.2: Submit with All Questions Answered**
- [ ] Answer all questions
- [ ] Navigate to last question
- [ ] Click "Submit Quiz"
- [ ] Verify confirmation dialog displays
- [ ] Verify dialog shows "You have answered X of X questions"
- [ ] Click "Cancel"
- [ ] Verify dialog closes and you remain on quiz

**Test Case 8.3: Confirm Submission**
- [ ] Click "Submit Quiz" again
- [ ] In confirmation dialog, click "Submit"
- [ ] Verify submitting state shows (spinner)
- [ ] Verify results screen displays after successful submission

### 9. Results Screen

**Test Case 9.1: Score Display**
- [ ] Submit quiz
- [ ] Verify percentage displays prominently (e.g., "77.8%")
- [ ] Verify raw score displays (e.g., "7 out of 9 points")
- [ ] Verify attempt number displays (e.g., "Attempt #1")

**Test Case 9.2: Color-Coded Badges**
- [ ] Score ≥90%: Verify blue "Excellent!" badge
- [ ] Score ≥80% and <90%: Verify green "Great!" badge
- [ ] Score ≥60% and <80%: Verify yellow "Good!" badge
- [ ] Score <60%: Verify red "Keep Trying!" badge

**Test Case 9.3: Question Breakdown**
- [ ] Scroll to Question Breakdown section
- [ ] For each question:
  - [ ] Verify question number and text display
  - [ ] Verify correct answers show green background and "Correct" badge
  - [ ] Verify incorrect answers show red background and "Incorrect" badge
  - [ ] Verify "Your answer" displays
  - [ ] For incorrect answers, verify "Correct answer" displays
  - [ ] Verify time spent displays (e.g., "45s")

### 10. Retake Quiz

**Test Case 10.1: Retake Functionality**
- [ ] View results screen
- [ ] Click "Retake Quiz" button
- [ ] Verify page reloads with new quiz
- [ ] Verify new set of questions loads (may be different from first attempt)
- [ ] Complete and submit quiz
- [ ] Verify attempt number increments (e.g., "Attempt #2")

### 11. Timing Tracking

**Test Case 11.1: Time Per Question**
- [ ] Start quiz and note current time
- [ ] Spend different amounts of time on different questions
- [ ] Submit quiz
- [ ] Review breakdown
- [ ] Verify time spent is reasonable for each question
- [ ] Verify questions you spent more time on show higher seconds

### 12. Loading States

**Test Case 12.1: Quiz Fetch Loading**
- [ ] Navigate to quiz tab (clear cache if needed)
- [ ] Verify "Loading quiz..." message displays with spinner
- [ ] Wait for quiz to load
- [ ] Verify smooth transition to first question

**Test Case 12.2: Submission Loading**
- [ ] Complete quiz and submit
- [ ] During submission, verify:
  - [ ] "Submitting..." text on submit button
  - [ ] Button is disabled during submission
  - [ ] Spinner displays on button

### 13. Error Handling

**Test Case 13.1: Quiz Fetch Error**
- [ ] Simulate network error (disconnect or use dev tools)
- [ ] Navigate to quiz
- [ ] Verify error message displays
- [ ] Verify "Back to curriculum" button works

**Test Case 13.2: Submission Error**
- [ ] Complete quiz
- [ ] Simulate network error before submitting
- [ ] Click submit and confirm
- [ ] Verify error message displays appropriately

**Test Case 13.3: Already Submitted Error**
- [ ] Submit a quiz successfully
- [ ] Use browser dev tools to attempt re-submission with same attemptId
- [ ] Verify 409 error handled: "This quiz has already been submitted"

### 14. Accessibility

**Test Case 14.1: Keyboard Navigation**
- [ ] Use Tab key to navigate through quiz
- [ ] Verify all interactive elements are reachable
- [ ] Verify focus indicators are visible
- [ ] Use Space/Enter to select radio buttons and checkboxes
- [ ] Verify keyboard-only navigation works for all question types

**Test Case 14.2: Screen Reader Support**
- [ ] Use screen reader (or inspect ARIA labels)
- [ ] Verify all form controls have appropriate labels
- [ ] Verify question text is announced
- [ ] Verify option selections are announced

**Test Case 14.3: Color Contrast**
- [ ] Verify all text meets WCAG contrast requirements
- [ ] Verify score badges have sufficient contrast
- [ ] Verify buttons have clear states (hover, focus, disabled)

### 15. Responsive Design

**Test Case 15.1: Mobile View**
- [ ] Resize browser to mobile width (375px)
- [ ] Verify all questions display properly
- [ ] Verify buttons are touch-friendly
- [ ] Verify dropdown selections work on mobile
- [ ] Complete full quiz flow on mobile viewport

**Test Case 15.2: Tablet View**
- [ ] Resize browser to tablet width (768px)
- [ ] Verify layout adapts appropriately
- [ ] Complete quiz flow

**Test Case 15.3: Desktop View**
- [ ] View on desktop (1280px+)
- [ ] Verify content is readable and not overly wide
- [ ] Verify max-width constraints work

### 16. Edge Cases

**Test Case 16.1: No Questions Available**
- [ ] Navigate to lesson with insufficient questions (< 4)
- [ ] Attempt to start quiz
- [ ] Verify error: "Insufficient questions in question bank"

**Test Case 16.2: Answer Format Edge Cases**
- Fill-in-blank:
  - [ ] Test with uppercase answer (should match case-insensitive)
  - [ ] Test with extra whitespace
  - [ ] Test with punctuation
- Multiple select:
  - [ ] Test selecting all options
  - [ ] Test selecting none (should prevent submission)
- Vocabulary match:
  - [ ] Test leaving some unmatched (should prevent submission)

## Test Results Summary

| Test Category | Total Tests | Passed | Failed | Notes |
|---------------|-------------|--------|--------|-------|
| Quiz Loading | 3 | | | |
| Multiple Choice | 2 | | | |
| Multiple Select | 2 | | | |
| True/False | 1 | | | |
| Fill-in-Blank | 2 | | | |
| Vocabulary Match | 2 | | | |
| Navigation | 3 | | | |
| Submission | 3 | | | |
| Results | 3 | | | |
| Retake | 1 | | | |
| Timing | 1 | | | |
| Loading States | 2 | | | |
| Error Handling | 3 | | | |
| Accessibility | 3 | | | |
| Responsive | 3 | | | |
| Edge Cases | 2 | | | |

## Known Issues

(Document any issues found during testing here)

## Sign-off

- [ ] All critical tests passed
- [ ] All accessibility tests passed
- [ ] All question types work correctly
- [ ] No blocking bugs identified

**Tester:** _______________
**Date:** _______________
**Build/Commit:** _______________
