# Spec: Quiz Taking System Fixes & Completion

## Context
The quiz taking system is currently partially implemented. The UI exists but is reported to be buggy (#135), and the backend API (#93) requires completion to fully support the frontend (#94). This track aims to stabilize the existing implementation and deliver a fully functional quiz experience.

## Goals
1.  **Fix Bugs:** Resolve the reported integration bug (#135) where the quiz route is failing.
2.  **Complete API:** Ensure the Quiz Taking API (#93) supports fetching questions, submitting answers, and calculating scores.
3.  **Polish UI:** Finalize the Quiz UI components (#94) for a smooth student experience.
4.  **Verification:** Add comprehensive tests to prevent regression.

## Requirements
-   **API:**
    -   `GET /api/student/quiz/:lessonId`: Return quiz questions for a lesson.
    -   `POST /api/student/quiz/:lessonId/submit`: Accept answers, grade them, and return results.
-   **UI:**
    -   Display questions clearly (multiple choice, etc.).
    -   Handle navigation between questions.
    -   Show a summary/result screen after submission.
    -   Error handling for network issues.

## References
-   Issue #135: Bug: Quiz route integration
-   Issue #93: Story: Quiz Taking API
-   Issue #94: Story: Quiz UI Components
