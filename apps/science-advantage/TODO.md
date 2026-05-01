# Science Advantage - TODO

## In Progress

### Sprint 4: AI-Powered Personalization (S4) - ACTIVE 🚀

- [ ] #118 - Epic: AI-Powered Personalization & Teacher Intervention - Created: 2025-10-27
- [ ] #119 - Story: Student Profile Data Model (P1) - Created: 2025-10-27
  - **Started**: 2025-10-28
  - **Branch**: feat/119-student-profile-data-model
  - **Specs**: docs/specs/student-profile/spec.md
  - **Priority**: P1
  - **Milestone**: Sprint 4: AI-Powered Personalization
  - **Dependencies**: Unblocks #120, #121, #122

### General Improvements

- [x] #85 - Update UI to be more friendly to K12 students (feat/85-update-ui-to-be-more-friendly-to-k12-stu)
  - **Started**: 2025-10-24
  - **Completed**: 2025-10-24
  - **Branch**: feat/85-update-ui-to-be-more-friendly-to-k12-stu
  - **Specs**: None (styling-only issue)
  - **Priority**: P2
  - **Milestone**: None
  - **Changes**: Updated color scheme, added playful animations, enhanced cards and buttons

### Sprint 4: AI-Powered Personalization (S4) - ACTIVE 🚀

- [ ] #120 - Story: BE - Calculate and Update Student Mastery (feat/120-be-calculate-and-update-student-mastery)
  - **Started**: 2025-10-29
  - **Branch**: feat/120-be-calculate-and-update-student-mastery
  - **Specs**: docs/specs/student-profile/spec.md
  - **Priority**: P1
  - **Milestone**: Sprint 4: AI-Powered Personalization
  - **Dependencies**: Unblocks #121, #122, #124

### Sprint 3: Interactive Learning (S3) - ACTIVE 🚀

- [ ] #89 - Epic: Sprint 3 - Interactive Learning & Standards-Tagged Assessments - Created: 2025-10-22
- [ ] #93 - Story: Quiz Taking API (P1) - Created: 2025-10-22
- [ ] #94 - Story: Quiz UI Components (P1) - Created: 2025-10-22
- [x] #95 - Story: Lesson Progress Tracking (P1) - PR: #110 - Completed: 2025-10-25 ✅
  - **Merge Commit**: b21469b7ec3755850eda7acd70e1a4413570ea69
  - **Specs Updated**: docs/specs/progress-tracking/spec.md
  - **Implementation**: Lesson progress tracking API, progress UI components, curriculum progress view
- [x] #96 - Story: Teacher Analytics - Class Overview (P1) - PR: #112 - Completed: 2025-10-26 ✅
  - **Merge Commit**: 9b66305d0e5f3ed2c8dd3c3a30a2fe8dcfb4e9a7
  - **Specs Updated**: docs/specs/progress-tracking/spec.md
  - **Implementation**: Class analytics API endpoint, sortable analytics table, color-coded score badges, tab navigation
- [ ] #98 - Story: Teacher Analytics - Student-Lesson Detail (P1) - Created: 2025-10-22
- [ ] #99 - Story: Teacher Analytics - Student Detail Across Lessons (P1) - Created: 2025-10-22

**Progress**: 6/11 stories (55%)

## In Review

- [x] #97 - Story: Teacher Analytics - Lesson Detail (P1) - PR: #113 - Completed: 2025-10-26 ✅
  - **Merge Commit**: 0eea5cf8a1b8c8e9b2a3f4c5d6e7f8a9b0c1d2e3
  - **Specs Updated**: docs/specs/progress-tracking/spec.md
  - **Implementation**: Lesson detail analytics API, student performance table, question-level analytics, standards performance section

## Completed

### Sprint 3: Interactive Learning (S3) - IN PROGRESS

- [x] #106 - Upgrade to Next.js 16 - PR: #107 - Completed: 2025-10-25 ✅
  - **Merge Commit**: 30e4bb34c1c5a33c8beeeb4abff393705271263f
  - **Specs Updated**: None
  - **Implementation**: Upgraded to Next.js 16 and fixed all related test failures.

- [x] #92 - Story: Assessment Data Schema & Question Bank - PR: #105 - Completed: 2025-10-25 ✅
  - **Merge Commit**: a6284440c78fc1cae510b41f8fc3513da2bab7fe
  - **Specs Created**: docs/specs/assessment-system/spec.md (NEW), docs/specs/progress-tracking/spec.md (NEW)
  - **Implementation**: 4 models (QuizQuestion, Attempt, QuestionResponse, LessonCompletion), 324 questions, standards linking

- [x] #103 - Story: Standardize Lesson Content Templates & Types - PR: #104 - Completed: 2025-10-25 ✅
  - **Merge Commit**: 9631e1938293ca8e70f8847fffb6b3125c8de56a
  - **Specs Updated**: docs/specs/core-science-curriculum-content-management/spec.md
  - **Implementation**: LessonType enum (LESSON/LAB/ASSESSMENT), content templates, 4 full lessons, content parsers with tests
- [x] #91 - Story: Develop Lesson Content for Testing - PR: #102 - Completed: 2025-10-24 ✅
  - **Merge Commit**: c3eebff96ab4aff77dc1e1c3ad49f8b479e5fb64
  - **Specs Updated**: docs/specs/core-science-curriculum-content-management/spec.md
  - **Lessons Created**: 5 fully-developed Grade 3 Thai science lessons (Being a Scientist, What Makes Something Alive?, Diversity of Living Things, Life Processes - Growth, Life Processes - Reproduction)
- [x] #90 - Story: Modularize Seed Data Architecture - PR: #100 - Completed: 2025-10-24 ✅
  - **Merge Commit**: 0fbe6659a734d4271aa57c247453f15c041bed9f
  - **Specs Updated**: docs/specs/core-science-curriculum-content-management/spec.md

## Completed (Previous Sprints)

### Sprint 2: Core Student Experience (S2) - COMPLETE ✅

- [x] #67 - Epic: Core Student Experience - Sprint 2 Tracker - Completed: 2025-10-21 ✅
- [x] #68 - Story: Student Settings Page - PR: #88 - Completed: 2025-10-21 ✅
- [x] #66 - Story: View Lesson Content and Standards - Completed: 2025-10-21 ✅
- [x] #65 - Story: Navigate a Standards-Aligned Curriculum - Completed: 2025-10-21 ✅
- [x] #64 - Story: View Enrolled Classes - Completed: 2025-10-21 ✅
- [x] #63 - Story: Join a Class - Completed: 2025-10-21 ✅
- [x] #76 - Task: FE - Display lesson content - PR: #87 - Completed: 2025-10-21 ✅
- [x] #75 - Task: BE - Create lesson content API endpoint - PR: #84 - Completed: 2025-10-21 ✅
- [x] #74 - Task: FE - Display curriculum - PR: #83 - Completed: 2025-10-21 ✅
- [x] #73 - Task: BE - Create curriculum API endpoint - PR: #82 - Completed: 2025-10-21 ✅
- [x] #64 - Story: View Enrolled Classes - PR: #80, #81 - Completed: 2025-10-21 ✅
- [x] #63 - Story: Join a Class - PR: #78, #79 - Completed: 2025-10-21 ✅
- [x] #70 - Task: FE - Create join class form - PR: #79 - Completed: 2025-10-20 ✅
- [x] #72 - Task: FE - Display enrolled classes - PR: #81 - Completed: 2025-10-20 ✅
- [x] #71 - Task: BE - Create enrolled classes API endpoint - PR: #80 - Completed: 2025-10-20 ✅
- [x] #69 - Task: BE - Create join class API endpoint - PR: #78 - Completed: 2025-10-20 ✅

### Sprint 1: Core Teacher Experience (S1)

- [x] #52 - Story: View Dynamic Curriculum Structure - Completed: 2025-10-19 - PR: #59 (Merged)
- [x] #51 - Story: View Classes on Dashboard - Completed: 2025-10-19
- [x] Story: Create a Standards-Aligned Class - Completed
- [x] Story: Access Class Join Code - Completed

### Sprint 0: Foundation & Advanced Schema Setup (S0)

- [x] #35 - Story: Project Initialization - Completed: 2025-10-08
- [x] #36 - Story: Advanced Data Schema - Completed: 2025-10-08 - PR: #43 (Merged)
- [x] #37 - Story: User Authentication with Role-Based Access Control - Completed: 2025-10-08 - PR: #44 (Merged)
- [x] #39 - Story: Curriculum Seeding - Completed - PR: #56 (Merged)
- [x] #45 - Appropriately style the CSS for the site - Completed: 2025-10-08

## Backlog

- Issues will be added here as they are created
- [ ] #62 - Chore: Set up Sprint 1 i18n infrastructure (Sprint 1)
