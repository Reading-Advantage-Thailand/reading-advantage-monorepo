# Migration Table: Hand-Rolled `role ===` Checks → `assertCan`

> Each row maps a hand-rolled role check in `apps/science-advantage/app/` to its replacement `assertCan` call in a domain function.

| # | File | Line | Current Check | New Permission Key | Domain Function | Notes |
|---|------|------|---------------|-------------------|-----------------|-------|
| 1 | `app/api/student/classes/route.ts` | 21 | `role !== 'STUDENT'` | `student:read:own` | `getStudentEnrolledClasses` | Pilot — already thin |
| 2 | `app/api/classes/route.ts` | 50 | `role !== 'TEACHER' && role !== 'ADMIN'` | `class:list` | `listClasses` | GET handler |
| 3 | `app/api/classes/route.ts` | 213 | `role !== 'TEACHER' && role !== 'ADMIN'` | `class:create` | `createClass` | POST handler |
| 4 | `app/api/classes/join/route.ts` | 27 | `role !== 'STUDENT'` | `class:join` | `joinClass` | |
| 5 | `app/api/classes/[classId]/route.ts` | 35 | `isAdmin = role === 'ADMIN' \|\| role === 'SYSTEM'` | `class:read` | `getClassDetail` | GET handler |
| 6 | `app/api/classes/[classId]/route.ts` | 102 | `isAdmin = role === 'ADMIN'` | `class:update` | `updateClass` | PATCH handler |
| 7 | `app/api/classes/[classId]/route.ts` | 193 | `isAdmin = role === 'ADMIN'` | `class:archive` | `archiveClass` | DELETE handler |
| 8 | `app/api/classes/[classId]/roster/route.ts` | 42 | `isAdmin = role === 'ADMIN'` | `class:roster` | `getRoster` | GET handler |
| 9 | `app/api/classes/[classId]/roster/route.ts` | 137 | `isAdmin = role === 'ADMIN'` | `class:roster` | `updateRoster` | POST handler |
| 10 | `app/api/classes/[classId]/assignments/route.ts` | 150 | `role !== 'TEACHER' && role !== 'ADMIN'` | `assignment:create` | `createAssignment` | POST handler |
| 11 | `app/api/classes/[classId]/assignments/route.ts` | 182 | `isAdmin = role === 'ADMIN'` | `assignment:read` | `listAssignments` | GET handler |
| 12 | `app/api/classes/[classId]/assignments/route.ts` | 289 | `role !== 'TEACHER' && role !== 'ADMIN'` | `assignment:delete` | `deleteAssignment` | DELETE handler |
| 13 | `app/api/classes/[classId]/assignments/route.ts` | 321 | `isAdmin = role === 'ADMIN'` | `assignment:delete` | `deleteAssignment` | ownership fallback |
| 14 | `app/api/students/[studentId]/assignments/route.ts` | 41 | `id !== studentId && role !== 'TEACHER' && role !== 'ADMIN'` | `assignment:read` | `getStudentAssignments` | ownership + role |
| 15 | `app/api/students/[studentId]/achievements/route.ts` | 29 | `role === 'TEACHER' \|\| role === 'ADMIN'` | `gamification:read:all` | `getStudentAchievements` | |
| 16 | `app/api/students/[studentId]/gamification-profile/route.ts` | 57 | `role === 'TEACHER' \|\| role === 'ADMIN'` | `gamification:read:all` | `getGamificationProfile` | |
| 17 | `app/api/students/me/gamification/route.ts` | 50 | `role !== 'STUDENT'` | `gamification:read:own` | `getMyGamification` | |
| 18 | `app/api/students/[studentId]/mastery-profile/route.ts` | 85 | `role === 'TEACHER' \|\| role === 'ADMIN'` | `progress:read:all` | `getMasteryProfile` | |
| 19 | `app/api/students/[studentId]/classes/[classId]/analytics/route.ts` | 57 | `isAdmin = role === 'ADMIN'` | `progress:read:all` | `getStudentClassAnalytics` | |
| 20 | `app/api/students/[studentId]/lessons/[lessonId]/analytics/route.ts` | 56 | `isAdmin = role === 'ADMIN'` | `progress:read:all` | `getStudentLessonAnalytics` | |
| 21 | `app/api/students/[studentId]/lessons/[lessonId]/progress/route.ts` | — | (no role check found) | `progress:read:own` | `getLessonProgress` | needs auth |
| 22 | `app/api/lessons/[lessonSlug]/route.ts` | — | (needs inspection) | `quiz:read` | `getLessonBySlug` | |
| 23 | `app/api/lessons/[lessonSlug]/quiz/route.ts` | — | (needs inspection) | `quiz:submit` | `submitAttempt` | Phase 3b |
| 24 | `app/api/ai/update-mastery/route.ts` | 248 | `role === 'STUDENT'` | `mastery:write:own` | `recordRun` | Phase 3a |
| 25 | `app/api/ai/recommendations/route.ts` | 114 | `isStudent = role === 'STUDENT'` | `ai:recommend` | `getRecommendation` | Phase 3c |
| 26 | `app/api/ai/recommendations/route.ts` | 116 | `role === 'TEACHER' \|\| role === 'ADMIN'` | `ai:recommend:all` | `getRecommendation` | Phase 3c |
| 27 | `app/api/teachers/classes/[classId]/intervention-alerts/route.ts` | 97,99 | `isAdmin` + `role === 'TEACHER' && id === klass.teacherId` | `intervention:read` | `listAlerts` | Phase 3e |
| 28 | `app/api/teachers/dashboard/route.ts` | — | (needs inspection) | `teachers:read:own` | `getTeacherDashboard` | |
| 29 | `app/api/classes/[classId]/curriculum/route.ts` | — | (needs inspection) | `curriculum:read` | `getClassCurriculum` | |
| 30 | `app/api/classes/[classId]/lessons/[lessonId]/analytics/route.ts` | 64 | `isAdmin = role === 'ADMIN'` | `progress:read:all` | `getClassLessonAnalytics` | |
| 31 | `app/api/classes/[classId]/analytics/overview/route.ts` | 46 | `isAdmin = role === 'ADMIN'` | `progress:read:all` | `getClassAnalyticsOverview` | |

## Permission Keys Needed (new additions to `packages/auth/src/permissions.ts`)

| Key | Roles | Used By |
|-----|-------|---------|
| `student:read:own` | STUDENT, TEACHER, ADMIN, SYSTEM | student/classes route |
| `gamification:read:own` | STUDENT | students/me/gamification |
| `mastery:write:own` | STUDENT | ai/update-mastery |
| `ai:recommend` | STUDENT, TEACHER, ADMIN, SYSTEM | ai/recommendations |
| `ai:recommend:all` | TEACHER, ADMIN, SYSTEM | ai/recommendations (teacher viewing student) |
| `intervention:read` | TEACHER, ADMIN, SYSTEM | teachers/intervention-alerts |
| `teachers:read:own` | TEACHER, ADMIN, SYSTEM | teachers/dashboard |
