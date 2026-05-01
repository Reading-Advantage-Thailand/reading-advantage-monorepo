# Track: Teacher Dashboard

## Overview

Build a teacher-facing dashboard for classroom management. Teachers can create classes, assign specific games and vocabulary packs, set difficulty levels, view student progress and accuracy, and project game sessions for class-wide play. This transforms the platform from a solo study tool into a structured classroom resource.

## Functional Requirements

### Teacher Authentication & Roles
- Teacher accounts distinguished from student accounts via role field.
- Teacher sign-up flow with email verification (or invite-code for school deployments).
- Teachers can generate student invite codes or QR codes for class enrollment.
- Role-based access: teachers see dashboard; students see games and their own stats.
- Session persistence via JWT stored in httpOnly cookie.

### Class Management (CRUD)
- Create a class: name, subject, grade level, description.
- View list of teacher's classes on dashboard home.
- Edit class details (name, description).
- Archive/delete class (soft delete with 30-day recovery).
- Each class has a unique enrollment code (8-char alphanumeric).
- Class roster: view enrolled students, remove students, see last active date.

### Assignment Creation
- Teacher selects one or more games from the game catalog.
- Teacher selects vocabulary/sentence pack(s) for the assignment.
- Teacher sets difficulty tier per assignment (or allows student choice).
- Assignment properties: title, description, due date (optional), max attempts (optional).
- Assignments appear on student's game home screen with a "Due" badge.
- Teacher can duplicate assignments across classes.

### Student Progress Views
- Per-student dashboard: games played, accuracy %, time spent, XP earned.
- Per-assignment view: which students completed it, scores, accuracy breakdown.
- Class aggregate view: average accuracy, completion rate, most-missed words.
- Export progress as CSV for external gradebook integration.
- Privacy: teachers see aggregate and per-student data only for their own classes.

### Projection / Classroom Mode
- "Project" button on any assignment launches a full-screen, simplified view.
- Projection mode shows: current game in large format, live class leaderboard.
- Teacher controls: pause/resume all students, reset game, switch games.
- Designed for classroom projector or smartboard (landscape 16:9 override).
- Auto-advances through rounds; teacher can manually trigger next round.

### Data Privacy (COPPA Considerations)
- Student accounts store minimal PPI (no last name, no email for under-13).
- Teachers cannot view individual student passwords.
- Student data is scoped to enrolled classes only.
- Data retention: student progress retained for academic year, then archived.
- Parental consent workflow stub (out of scope for implementation, but data model supports it).

## Non-Functional Requirements

- Dashboard must be responsive but prioritize tablet/desktop (teachers use larger screens).
- Projection mode must render at 60fps on classroom hardware.
- Student enrollment must complete in <5 seconds (QR code scan flow).
- All teacher actions must be idempotent (safe to retry on network errors).
- API endpoints follow REST conventions with proper HTTP status codes.

## Technical Constraints

- Authentication: Next.js middleware for role-based route protection.
- Data storage: extend existing Zustand stores + localStorage for MVP; database schema designed for future backend migration.
- Projection mode: separate route (`/class/:id/project`) with simplified layout.
- CSV export: client-side generation using existing data (no server needed for MVP).

## Acceptance Criteria

- [ ] Teacher can sign up, log in, and see the dashboard home.
- [ ] Teacher can create, edit, and archive classes.
- [ ] Students can enroll in a class using an enrollment code.
- [ ] Teacher can create assignments with game/pack selection and difficulty settings.
- [ ] Students see assignments on their home screen with due dates.
- [ ] Teacher can view per-student and per-assignment progress.
- [ ] Class aggregate view shows average accuracy and completion rate.
- [ ] CSV export generates a valid file with student progress data.
- [ ] Projection mode displays full-screen game with live leaderboard.
- [ ] Student data is scoped to their enrolled classes only.
- [ ] All new code has unit test coverage ≥80%.

## Out of Scope

- Full backend/database implementation (MVP uses localStorage with migration-ready schema).
- Parental consent workflow implementation.
- Integration with external LMS (Canvas, Google Classroom).
- Real-time collaborative editing of assignments.
- Student-to-student messaging or social features.
- Automated grading or standards alignment.
