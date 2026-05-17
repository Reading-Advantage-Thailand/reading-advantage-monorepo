# Implementation Plan: CodeCamp Advantage — Local QA/QC Testing

## Phase 1: Environment & Prerequisites

Verify local dev environment is ready for testing.

- [ ] Task: Start and verify local services
  - [ ] Run `pnpm db:start` and confirm Docker Postgres on port 5432
  - [ ] Run `pnpm dev` and confirm app at `http://localhost:3001`
  - [ ] Verify `OPENROUTER_API_KEY` in `.env.local`
  - [ ] Verify `GITHUB_WEBHOOK_SECRET` in `.env.local`
  - [ ] Confirm at least one ADMIN account exists (or create via seed)
  - [ ] Confirm at least one INTERN account exists (or create via seed)
  - [ ] Confirm curriculum data is seeded (18 modules, 85 lessons)

## Phase 2: Authentication & Authorization (P0)

Test login/logout, role-based access, and session management.

- [ ] Task: Login flow
  - [ ] Login with valid INTERN credentials → redirect to dashboard
  - [ ] Login with valid ADMIN credentials → redirect to dashboard
  - [ ] Login with invalid password → error message displayed
  - [ ] Login with non-existent username → error message displayed
  - [ ] Login with empty username → validation error
  - [ ] Login with empty password → validation error
  - [ ] Case sensitivity on username
  - [ ] Password min length enforcement (8 chars)
  - [ ] Password complexity (uppercase, lowercase, digit) for intern creation
- [ ] Task: Session management
  - [ ] Session persists across page reload
  - [ ] Logout clears session and redirects
  - [ ] Expired session handling
  - [ ] Header shows user name and role badge when authenticated
  - [ ] Header shows login button when not authenticated
- [ ] Task: Role-based access control
  - [ ] INTERN can access dashboard, modules, lessons, chat
  - [ ] INTERN cannot access `/admin` → 403 or redirect
  - [ ] ADMIN can access `/admin`
  - [ ] Unauthenticated user cannot access protected routes → redirect to login
  - [ ] tRPC endpoints reject unauthorized roles (test via network tab)

## Phase 3: Internationalization (P0)

Test locale switching and content parity.

- [ ] Task: Locale switching
  - [ ] Switch EN → TH via header toggle
  - [ ] Switch TH → EN via header toggle
  - [ ] Verify all UI text updates correctly on every major page
  - [ ] Verify `aria-current` and `aria-label` attributes on language switcher
  - [ ] Verify Thai font renders correctly in TH mode
  - [ ] Verify English font renders correctly in EN mode
- [ ] Task: Message parity
  - [ ] Verify no missing translation keys on any page in EN
  - [ ] Verify no missing translation keys on any page in TH
  - [ ] Verify date formatting (lastActiveAt, reviewedAt) in both locales
  - [ ] Verify chat tutor responds in Thai by default
  - [ ] Verify chat tutor responds in English when user writes entirely in English

## Phase 4: Dashboard (P0)

Test dashboard rendering, progress, and module locking.

- [ ] Task: Dashboard loading
  - [ ] Loading skeleton renders while data fetches
  - [ ] Dashboard loads with correct overall progress %
  - [ ] Dashboard shows completed lessons count
  - [ ] Dashboard shows total lessons count (85)
- [ ] Task: Phase grouping
  - [ ] Phase A shows 6 modules
  - [ ] Phase B shows 4 modules
  - [ ] Phase C shows 3 modules
  - [ ] Phase D shows 5 modules
  - [ ] Phase ordering is correct (A → B → C → D)
  - [ ] Phase badges/borders are color-coded correctly
- [ ] Task: Module cards
  - [ ] Icons match module slugs
  - [ ] Titles and descriptions render correctly
  - [ ] Progress bars reflect actual completion
  - [ ] Lesson counts are accurate
- [ ] Task: Module locking
  - [ ] First module (Phase A, Module 1) is unlocked by default
  - [ ] Subsequent modules are locked until previous is 100% complete
  - [ ] Lock icon appears on locked modules
  - [ ] Clicking locked module shows prerequisite message or is disabled
- [ ] Task: PR review badges
  - [ ] Badges appear only when PR reviews exist
  - [ ] Pending count is accurate
  - [ ] Needs changes count is accurate
  - [ ] Approved count is accurate
- [ ] Task: Portfolio projects
  - [ ] Phase A-D each have associated portfolio project links
  - [ ] Links open correct GitHub repos in new tab

## Phase 5: Module Detail Page (P0)

Test module navigation, lesson lists, and PR workflow.

- [ ] Task: Module info
  - [ ] Title and description render correctly
  - [ ] Progress bar matches dashboard progress
  - [ ] Lesson completion count is accurate
  - [ ] Quiz average is calculated correctly from scored lessons
- [ ] Task: Exercise repositories
  - [ ] Repos display for modules that have them
  - [ ] PR status badges are accurate (pending/reviewed/needs_changes/approved)
- [ ] Task: Fork instructions
  - [ ] Step 1: Fork repo renders with correct repo link
  - [ ] Step 2: Clone command is copyable and correct
  - [ ] Step 3: Branch instructions render
  - [ ] Step 4: Complete exercise instructions render
  - [ ] Step 5: Push PR instructions render
  - [ ] All links open in new tab
- [ ] Task: PR URL submission
  - [ ] Valid GitHub PR URL is accepted (`https://github.com/owner/repo/pull/123`)
  - [ ] Invalid URL is rejected with clear error
  - [ ] Non-GitHub URL is rejected
  - [ ] Duplicate PR URL is rejected with clear error
  - [ ] Submit button states (idle, loading, success, error)
- [ ] Task: Lesson list
  - [ ] Lessons are in correct order
  - [ ] Status icons match: not_started (gray), in_progress (yellow), completed (green)
  - [ ] Scores display for completed quiz lessons
  - [ ] Clicking lesson navigates to lesson page

## Phase 6: Lesson Page — Theory & Exercise (P0)

Test theory and exercise lesson rendering and submission.

- [ ] Task: Theory lessons
  - [ ] Headings render correctly
  - [ ] Body text renders correctly
  - [ ] Code blocks render with syntax highlighting
  - [ ] Back navigation button returns to module page
- [ ] Task: Exercise lessons
  - [ ] Instructions render correctly
  - [ ] Starter code pre-populates in textarea
  - [ ] Textarea allows editing
  - [ ] Submit button is enabled when content exists
  - [ ] Submit button is disabled while pending
  - [ ] Feedback/hints render after submission
  - [ ] Hints render as bullet list
  - [ ] Exercise submission marks lesson as `in_progress`
- [ ] Task: Content security
  - [ ] Published lesson is accessible
  - [ ] Draft lesson UUID returns "Lesson not found"
  - [ ] Invalid UUID format returns "Lesson not found"
  - [ ] Random UUID returns "Lesson not found"

## Phase 7: Lesson Page — Quiz (P0)

Test quiz rendering, answering, scoring, and completion.

- [ ] Task: Quiz rendering
  - [ ] Questions render with 4 options each
  - [ ] Radio buttons allow single selection per question
  - [ ] All questions must be answered before submit is enabled
  - [ ] Submit button is disabled with incomplete answers
- [ ] Task: Quiz submission
  - [ ] Submit with all answers → immediate scoring
  - [ ] Score percentage is calculated correctly: `(correct / total) * 100`
  - [ ] Correct answers highlighted in green
  - [ ] Incorrect answers highlighted in red
  - [ ] Explanation text appears for each question
  - [ ] Correct answer is hidden from client before submission
- [ ] Task: Quiz progress update
  - [ ] Score >= 70% marks lesson as `completed`
  - [ ] Score < 70% keeps lesson as `in_progress`
  - [ ] Dashboard progress updates after quiz submission
  - [ ] Module page progress updates after quiz submission
  - [ ] `completedAt` timestamp is set on first completion only
- [ ] Task: Quiz scoring edge cases
  - [ ] 0% score handled correctly
  - [ ] 100% score handled correctly
  - [ ] Retaking quiz updates score
  - [ ] Score stored as integer 0-100

## Phase 8: AI Tutor Chat (P0)

Test chat functionality, streaming, persistence, and rate limits.

- [ ] Task: Global chat page (`/chat`)
  - [ ] Unauthenticated user sees lock icon + login prompt
  - [ ] Authenticated user sees chat interface
  - [ ] New conversation button clears history
- [ ] Task: Lesson-scoped chat
  - [ ] Chat widget visible on lesson page
  - [ ] Chat context includes current lesson/module title
  - [ ] AI references current lesson content in responses
- [ ] Task: Streaming response
  - [ ] Message appears immediately after send
  - [ ] "Thinking..." indicator shows during generation
  - [ ] Tokens stream in real-time
  - [ ] Final response replaces "Thinking..."
  - [ ] Empty message is rejected
  - [ ] Message over 4000 chars is handled
- [ ] Task: Language behavior
  - [ ] Thai input → Thai response
  - [ ] English input → English response
  - [ ] Mixed input → Thai response (default)
- [ ] Task: Rate limiting
  - [ ] 30 requests per minute allowed
  - [ ] 31st request returns 429 with retry-after header
  - [ ] Rate limit resets after 1 minute
- [ ] Task: Message persistence
  - [ ] Messages saved to conversation
  - [ ] Chat history persists across page reloads
  - [ ] Conversation appears in dashboard "recent conversations"
  - [ ] Messages appear in `chatHistory` tRPC query
- [ ] Task: Fallback mode
  - [ ] When `OPENROUTER_API_KEY` is missing, returns mock response
  - [ ] Mock response is clearly distinguishable from real AI

## Phase 9: GitHub Integration & PR Reviews (P1)

Test webhook handling and PR review workflow.

- [ ] Task: GitHub webhook
  - [ ] Valid signature → 200 and processes event
  - [ ] Invalid signature → 401 Unauthorized
  - [ ] Non-PR event (e.g., push) → ignored with 200
  - [ ] PR `opened` event creates review record
  - [ ] PR `synchronize` event updates review record
  - [ ] Unmapped repo → 200 with "ignored" message
  - [ ] Unknown GitHub user → 200 with "ignored" message
- [ ] Task: PR review pipeline
  - [ ] Review status: `pending` → `reviewed` → `needs_changes`/`approved`
  - [ ] LLM review summary is generated
  - [ ] Review comment is posted to GitHub PR
  - [ ] Review failure marks as `reviewed` with "Review failed" summary
- [ ] Task: PR status display
  - [ ] `pending` badge is gray
  - [ ] `reviewed` badge is blue
  - [ ] `needs_changes` badge is orange
  - [ ] `approved` badge is green
  - [ ] Badge colors match across dashboard, module page, lesson page
- [ ] Task: Review history timeline
  - [ ] 4-step timeline renders: PR Submitted → First Review → Revisions → Approved
  - [ ] Active step is highlighted correctly
  - [ ] Completed steps are marked
  - [ ] Pending steps are grayed out
- [ ] Task: Workflow tracker
  - [ ] 5 steps: Claim → Branch → PR → Review → Merge
  - [ ] Step statuses update based on PR review state
  - [ ] All-completed banner shows when all steps done

## Phase 10: Admin Dashboard (P0)

Test admin-only features, intern management, and oversight.

- [ ] Task: Access control
  - [ ] ADMIN can access `/admin`
  - [ ] INTERN sees "Access Denied" at `/admin`
  - [ ] STUDENT sees "Access Denied" at `/admin`
  - [ ] TEACHER sees "Access Denied" at `/admin`
  - [ ] Unauthenticated user is redirected from `/admin`
- [ ] Task: Cohort stats
  - [ ] Total intern count is accurate
  - [ ] Average progress % is calculated correctly
  - [ ] Pending PR reviews count is accurate
- [ ] Task: Intern table
  - [ ] Columns render: Name, Username, Progress bar, Modules completed, Quiz Avg, PR Reviews, Last Active, Actions
  - [ ] Sorting works on sortable columns
  - [ ] Empty state when no interns
  - [ ] Progress bars render correctly
- [ ] Task: Create intern (`/admin/new-intern`)
  - [ ] Valid form creates intern successfully
  - [ ] Username 3-50 chars enforced
  - [ ] Display name 1-100 chars enforced
  - [ ] Password min 8 chars enforced
  - [ ] Password complexity enforced (uppercase, lowercase, digit)
  - [ ] Duplicate username rejected with "Username already exists"
  - [ ] Weak password rejected with clear error message
  - [ ] Form validation errors display inline
- [ ] Task: Intern detail page (`/admin/:userId`)
  - [ ] Module progress breakdown loads correctly
  - [ ] Quiz scores list loads correctly
  - [ ] PR reviews list loads correctly
  - [ ] Quiz score colors: >=80 default, >=60 secondary, <60 destructive
  - [ ] PR URLs link to GitHub and open in new tab
  - [ ] Review dates formatted correctly
  - [ ] Non-existent userId returns 404

## Phase 11: Progress Tracking & Data Integrity (P1)

Test progress calculations and database constraints.

- [ ] Task: Progress calculations
  - [ ] Module progress % = completed lessons / total lessons
  - [ ] Overall progress % = sum across all published modules
  - [ ] `not_started` → `in_progress` on exercise submit
  - [ ] `in_progress` → `completed` on quiz pass (>=70%)
  - [ ] `completedAt` set only on first completion
  - [ ] Retaking quiz updates score but not `completedAt`
- [ ] Task: Prerequisite enforcement
  - [ ] Module 1 has no prerequisite
  - [ ] Module N requires Module N-1 to be 100% complete
  - [ ] Attempting to access locked module lesson directly → "Lesson not found"
- [ ] Task: Database constraints
  - [ ] Duplicate `(userId, lessonId)` in progress table → upsert, no duplicate rows
  - [ ] Duplicate `slug` in modules → rejected
  - [ ] Duplicate `repoUrl` in exercise repos → rejected
  - [ ] Duplicate `prUrl` in PR reviews → rejected

## Phase 12: Curriculum Content (P1)

Verify curriculum data integrity and completeness.

- [ ] Task: Module completeness
  - [ ] All 18 modules present after seeding
  - [ ] Correct phase assignment: A(6), B(4), C(3), D(5)
  - [ ] Correct ordering within phases
  - [ ] Only published modules visible to students
  - [ ] Draft modules hidden from dashboard and module page
- [ ] Task: Lesson completeness
  - [ ] All 85 lessons present
  - [ ] Lessons belong to correct modules
  - [ ] Lesson types: theory, exercise, quiz
  - [ ] Each quiz has 4 options, 1 correct answer, explanation
  - [ ] Each exercise has starter code, expected output, hints
- [ ] Task: Content rendering
  - [ ] All theory lessons render without errors
  - [ ] All code blocks render with syntax highlighting
  - [ ] All quiz options render correctly
  - [ ] All exercise starter code pre-populates correctly

## Phase 13: Performance & UX (P2)

Test loading states, responsiveness, and user experience.

- [ ] Task: Loading states
  - [ ] Dashboard shows skeleton during data fetch
  - [ ] Module page shows loading state
  - [ ] Lesson page shows loading state
  - [ ] Admin page shows loading state
  - [ ] No layout shift after data loads
- [ ] Task: Responsive design
  - [ ] Dashboard renders correctly on mobile (375px)
  - [ ] Dashboard renders correctly on tablet (768px)
  - [ ] Dashboard renders correctly on desktop (1440px)
  - [ ] Module page renders correctly on mobile
  - [ ] Lesson page renders correctly on mobile
  - [ ] Chat interface renders correctly on mobile
  - [ ] Admin table is scrollable on mobile
- [ ] Task: Navigation
  - [ ] Header navigation links work correctly
  - [ ] Back buttons return to correct parent page
  - [ ] Browser back/forward works correctly
  - [ ] Direct URL navigation to any page works

## Phase 14: Edge Cases & Error Handling (P2)

Test boundary conditions and error scenarios.

- [ ] Task: Input edge cases
  - [ ] Empty chat message → rejected
  - [ ] Chat message 4000 chars → accepted
  - [ ] Chat message 4001 chars → handled
  - [ ] PR URL with invalid format → rejected
  - [ ] PR URL with non-existent repo → handled gracefully
  - [ ] Very long username in login → handled
  - [ ] Very long password in login → handled
- [ ] Task: Concurrent actions
  - [ ] Rapid quiz submissions → handled correctly
  - [ ] Rapid chat messages → rate limited correctly
  - [ ] Multiple PR URL submissions → duplicate prevented
- [ ] Task: Network errors
  - [ ] tRPC error during dashboard load → error state shown
  - [ ] tRPC error during lesson load → error state shown
  - [ ] Chat API error → fallback or error message
  - [ ] Network offline → appropriate error message

## Phase 15: Regression Testing (P1)

Verify recent changes haven't broken existing functionality.

- [ ] Task: Smoke test critical paths
  - [ ] Full student flow: login → dashboard → module → lesson → quiz → dashboard
  - [ ] Full admin flow: login → admin → create intern → view intern detail
  - [ ] Full chat flow: login → chat → send message → receive response → view history
  - [ ] Full PR flow: submit PR URL → view status → review history
- [ ] Task: Cross-feature interactions
  - [ ] Progress from quiz unlocks next module
  - [ ] Chat history appears in dashboard
  - [ ] PR review badges update dashboard counts
  - [ ] Admin intern creation immediately appears in intern table
  - [ ] Locale switch persists across page navigation

## Phase 16: Summary & Reporting

Document findings and produce QA report.

- [ ] Task: Compile results
  - [ ] Count P0 passes / fails
  - [ ] Count P1 passes / fails
  - [ ] Count P2 passes / fails
  - [ ] Count P3 passes / fails
  - [ ] Document all failures with reproduction steps
  - [ ] Attach screenshots for UI failures
  - [ ] Categorize failures by severity
- [ ] Task: Flag blockers
  - [ ] Identify any P0 failures that block deployment
  - [ ] Identify any P1 failures that should be fixed before release
  - [ ] Create follow-up tickets for each blocker
- [ ] Task: Update track status
  - [ ] Mark completed tasks as `[x]`
  - [ ] Add deviation notes for incomplete work
  - [ ] Archive track or mark as complete

---

**Priority Legend:**
- **P0 (Critical)**: Must pass before deployment. Core functionality, auth, data integrity.
- **P1 (High)**: Should pass before release. Major features, UX, integrations.
- **P2 (Medium)**: Nice to have. Edge cases, performance, polish.
- **P3 (Low)**: Minor issues, cosmetic, documentation.
