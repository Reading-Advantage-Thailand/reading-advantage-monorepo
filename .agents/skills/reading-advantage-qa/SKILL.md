---
name: reading-advantage-qa
description: |
  Comprehensive QA/QC testing workflow for the reading-advantage monorepo.
  Use this skill whenever you need to perform quality assurance testing on
  any app in the monorepo (reading-advantage, primary-advantage,
  science-advantage, codecamp-advantage, www-reading-advantage, etc.).
  
  Covers: authentication flows, i18n/locale switching, dashboard functionality,
  module/lesson content, quiz submission, AI chat integration, admin panels,
  PR workflows, GitHub webhooks, progress tracking, accessibility (ARIA),
  responsive design, and cross-browser compatibility.
  
  Also use when: reviewing features before deployment, investigating bug reports,
  verifying fixes, testing new curriculum content, validating internationalization,
  or checking that tRPC endpoints and domain functions work correctly end-to-end.
---

# Reading Advantage Monorepo — QA/QC Testing Skill

A battle-tested QA workflow for the reading-advantage monorepo. Based on
real testing sessions across all apps in the workspace.

## Prerequisites

Before starting QA:

1. **Database running**: `pnpm db:start` — Docker Postgres on port 5432
2. **Dependencies installed**: `pnpm install`
3. **Dev server**: Start the app you want to test (e.g., `pnpm dev` in app dir)
4. **Browser automation**: Ensure kimi-webbridge daemon is running on
   `http://127.0.0.1:10086` (or use Playwright/CDP directly)
5. **Test accounts**: You may need to create test admin/intern accounts

## Quick Start

```bash
# 1. Start database
pnpm db:start

# 2. Start dev server for the app under test
cd apps/codecamp-advantage && pnpm dev

# 3. Create test accounts (if needed)
# See "Test Account Setup" section below

# 4. Run QA workflow (this skill)
# Follow the checklist below systematically
```

## Test Account Setup

### Option A: Direct Database Insert (Fastest)

For creating test users when auth is down or you need specific roles:

```typescript
// Hash password with bcrypt
import bcrypt from "bcryptjs";
const hash = await bcrypt.hash("TestPass123", 10);

// Insert user + account directly
// Required: display_username is NOT NULL
// Provider: 'credential', password = bcrypt hash
```

**Example SQL:**
```sql
INSERT INTO users (id, username, display_username, name, email, role, school_id, created_at, updated_at)
VALUES (gen_random_uuid(), 'testadmin', 'testadmin', 'Test Admin', 'test@example.com', 'ADMIN', null, now(), now());

INSERT INTO accounts (id, user_id, provider_id, password, created_at, updated_at)
VALUES (gen_random_uuid(), '<user-id>', 'credential', '$2a$10$...hash...', now(), now());
```

### Option B: Via Admin Panel

If admin panel is accessible, use "New Intern" button to create accounts.

### Option C: Via tRPC API

Use the browser's `fetch()` with session cookies for authenticated tRPC calls:

```javascript
fetch("/api/trpc/codecamp.submitQuiz", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    json: {
      lessonId: "...",
      answers: [{ questionId: "...", answer: "..." }]
    }
  })
});
```

> **Tip:** Using browser `fetch()` auto-includes session cookies, unlike `curl`
> which requires manual cookie management.

## Core QA Checklist

### 1. Authentication (P0)

- [ ] Login dialog opens and renders correctly
- [ ] Invalid credentials show proper error message
- [ ] Empty field validation works
- [ ] Session persists across page navigation
- [ ] Logout clears session (header updates)
- [ ] Session cookie has appropriate flags (HttpOnly, Secure, SameSite)
- [ ] Admin login works
- [ ] Intern/Student login works
- [ ] Role badge displays correctly in header

**Common Issues:**
- Password hash mismatch (bcrypt version mismatch)
- Missing `display_username` causing insert failures
- Session token not persisting (check cookie domain/path)

### 2. Authorization (P0)

- [ ] ADMIN can access admin routes (`/admin`)
- [ ] Unauthenticated users redirected to login with `redirectTo` param
- [ ] INTERN cannot access `/admin` (shows "Access Denied")
- [ ] INTERN can access dashboard, modules, lessons
- [ ] tRPC endpoints enforce role checks (`assertCan`)
- [ ] Multi-tenant queries scoped by `schoolId`

### 3. Internationalization (P0)

- [ ] Locale switcher works (TH ↔ EN)
- [ ] All UI text updates correctly after switch
- [ ] No missing translations (check console for `[next-intl]` warnings)
- [ ] Thai font loading works (characters render correctly)
- [ ] Date formatting respects locale
- [ ] Language switcher has ARIA labels

**Quick Test URLs:**
- `http://localhost:3000/en/` → English
- `http://localhost:3000/th/` → Thai

**Common Issues:**
- Missing keys in `messages/th.json` compared to `messages/en.json`
- Hardcoded strings not wrapped in `useTranslations()`

### 4. Dashboard (P0)

- [ ] Dashboard loads without errors
- [ ] Progress stats display correctly (0/85 lessons, percentages)
- [ ] Phase grouping correct (A→B→C→D)
- [ ] Phase color coding applied (green/blue/purple/orange borders)
- [ ] Module cards show: icon, title, description, lesson count
- [ ] First module is unlocked, subsequent modules locked
- [ ] Locked modules show lock icon + "Complete previous module" button
- [ ] **Locked module feedback**: Hovering/clicking shows tooltip with
      prerequisite module name
- [ ] Progress bars have ARIA: `role="progressbar"`, `aria-valuenow`,
      `aria-valuemin`, `aria-valuemax`, `aria-label`
- [ ] Portfolio project links present for each phase

**Known Bug Pattern — Locked Module UX:**
If clicking a locked module gives no feedback, add a `title` tooltip:

```tsx
// In ModuleCard component
const tooltipText = isLocked && lockedByModule
  ? t("lockedTooltip", { module: lockedByModule })
  : "";

<Button disabled title={tooltipText}>
  {t("locked")}
</Button>
```

Add i18n key:
```json
"module": {
  "lockedTooltip": "Complete \"{module}\" to unlock this module"
}
```

**Known Bug Pattern — Progress Bar ARIA:**
Add ARIA attributes to progress bar containers:

```tsx
<div
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={`${t("lessons")}: ${completedLessons} / ${lessonCount}`}
>
  <div style={{ width: `${progress}%` }} />
</div>
```

### 5. Module Detail Pages (P0)

- [ ] Module title, description, progress bar render
- [ ] Exercise repositories section shows fork instructions
- [ ] Fork instructions: Step 1-5 present
- [ ] GitHub repo link is valid HTTPS URL
- [ ] Clone commands shown (HTTPS + SSH)
- [ ] PR URL submission form present (input + "Track PR" button)
- [ ] PR form includes both `prUrl` AND `exerciseRepoId`
- [ ] Invalid PR URL shows validation error
- [ ] Lesson list renders with correct lessons
- [ ] "Back to Dashboard" navigation works

### 6. Lesson Pages (P0)

- [ ] Theory content loads (headings, paragraphs, code blocks)
- [ ] Code blocks have syntax highlighting
- [ ] Lesson type badge displays ("theory", "quiz", "exercise")
- [ ] "Back to Module" link works
- [ ] Chat widget visible at bottom
- [ ] Draft lessons inaccessible to non-admin
- [ ] Invalid lesson UUID handled gracefully

### 7. Quiz (P0)

- [ ] Quiz questions render (with radio buttons for MCQ)
- [ ] Radio buttons allow single selection per question
- [ ] Submit button disabled until all questions answered
- [ ] Quiz scoring calculates correctly (check API response)
- [ ] **Progress saves to database** (most common failure point!)
- [ ] Progress updates on dashboard after completion
- [ ] Quiz retaking works (score updates, `completed_at` preserved)

**CRITICAL BUG PATTERN — Quiz Progress Save:**

If quiz scoring works (returns 100%) but database insert fails with
`completed_at` format error, the Date object is being passed incorrectly
to Drizzle's `sql` template.

**Fix:** Convert Date to ISO string BEFORE passing to `sql`:

```typescript
// In packages/domain/src/codecamp/index.ts (or similar)
const now = new Date();
const nowIso = now.toISOString(); // ADD THIS LINE

// WRONG — Date.toString() produces invalid SQL:
// sql`COALESCE(${table.completedAt}, ${now})`

// CORRECT — ISO string is valid for PostgreSQL timestamp:
sql`COALESCE(${table.completedAt}, ${nowIso})`
```

**Verification:**
- Check server error logs for: `Sun May 17 2026 ... GMT+0800` (bad format)
- Should see: `2026-05-17T04:01:44.431Z` (good ISO format)

### 8. AI Tutor Chat (P0)

- [ ] Chat page loads (`/chat`)
- [ ] "New Conversation" button works
- [ ] Message sends successfully
- [ ] **AI responds with streaming content** (not error message)
- [ ] "Thinking..." indicator shows during request
- [ ] Messages persist in conversation history
- [ ] Lesson-scoped chat works (context from current lesson)
- [ ] Rate limiting works (30 req/min)

**CRITICAL BUG PATTERN — Chat Not Responding:**

If chat returns "Sorry, I'm having trouble responding right now":

1. Check `.env.local` for `OPENROUTER_API_KEY` or `DEEPSEEK_API_KEY`
2. Verify key is valid and has quota remaining
3. Check server logs for API errors
4. Rotate key if necessary:
   - Get new key from OpenRouter dashboard
   - Update `.env.local`
   - Restart dev server

**Security Note:** Chat uses `openrouter/free` model. Consider gating behind
auth/admin role in production to prevent API cost exposure.

### 9. Admin Panel (P0)

- [ ] Admin dashboard loads (`/admin`)
- [ ] Cohort stats display (total interns, avg progress, pending reviews)
- [ ] Intern table renders with all columns
- [ ] Progress bars have ARIA (unlike dashboard — note inconsistency)
- [ ] "New Intern" button opens creation form
- [ ] Form validation works (username, display name, password complexity)
- [ ] Intern creation succeeds
- [ ] Created intern can log in
- [ ] Intern details page loads
- [ ] Unauthenticated users redirected to login

### 10. PR Workflow / GitHub Integration (P1)

- [ ] PR URL validation (UI rejects invalid URLs)
- [ ] Valid PR URL creates review with "pending" status
- [ ] Duplicate PR prevention works (error: "already exists")
- [ ] Frontend form sends both `prUrl` and `exerciseRepoId`
- [ ] Review status updates (pending → reviewed → approved/needs_changes)
- [ ] LLM review generated for submitted PRs
- [ ] GitHub webhook receives and processes events

**False Positive Pattern — PR Form:**
The PR form may appear to be missing `exerciseRepoId`, but check the
`ForkInstruction` component — it likely passes both fields to the mutation.
Verify by checking the tRPC mutation call in the component source.

### 11. Performance & UX (P2)

- [ ] Dashboard loads < 1 second
- [ ] Module pages load < 1 second
- [ ] Lesson pages load < 1 second
- [ ] Responsive design works (mobile viewport)
- [ ] Loading skeletons render during data fetch
- [ ] No layout shift on content load

### 12. Edge Cases (P2)

- [ ] Invalid lesson UUID handled (404 or graceful error)
- [ ] Empty chat message rejected
- [ ] Long chat message handled
- [ ] Rapid submissions handled (rate limiting)
- [ ] Concurrent users don't corrupt data

## Database Direct Access

When you need to verify data or create test accounts directly:

```bash
# Connect to codecamp database
psql -h localhost -p 5432 -U postgres -d codecamp_advantage

# List tables
\dt

# Check users
SELECT id, username, role, school_id FROM users;

# Check progress
SELECT user_id, lesson_id, status, score, completed_at
FROM codecamp_user_progress;

# Delete test data
DELETE FROM users WHERE username LIKE 'qatest%';
```

**Note:** There are 3 databases in the Docker container:
- `reading_advantage`
- `primary_advantage`
- `codecamp_advantage`

## Running Tests

### Domain Tests (Vitest)

```bash
cd packages/domain
pnpm test
# Should show: Test Files X passed, Tests Y passed
```

### API Tests (Jest/Vitest)

```bash
cd packages/api
pnpm test
```

### Type Check

```bash
pnpm turbo run check-types --filter=<app-name>
# Example:
pnpm turbo run check-types --filter=codecamp-advantage
```

### Lint

```bash
pnpm turbo run lint --filter=<app-name>
```

## Common Dev Server Issues

### Next.js Dev Server Crashes

**Symptom:** `ELIFECYCLE Command failed.` in logs, server stops responding

**Causes:**
- Memory pressure (Turbopack + large monorepo)
- Cache corruption
- Port conflict

**Fixes:**
```bash
# Kill existing server
pkill -f "next dev"

# Clear caches
rm -rf apps/<app>/.next packages/<pkg>/.turbo .turbo/cache

# Restart with more memory
NODE_OPTIONS='--max-old-space-size=4096' pnpm dev
```

### Module Cache Not Updating

If code changes in `packages/domain` aren't reflected:

```bash
# Rebuild the package
cd packages/domain && pnpm build

# Or clear Next.js cache
rm -rf apps/<app>/.next/cache
```

## Browser Automation Tips

### Using kimi-webbridge

```bash
# Navigate
session="qa-main"
curl -s -X POST http://127.0.0.1:10086/command \
  -H 'Content-Type: application/json' \
  -d "{\"action\":\"navigate\",\"args\":{\"url\":\"http://localhost:3000/en/\",\"newTab\":false},\"session\":\"$session\"}"

# Evaluate JavaScript (auto-includes cookies)
curl -s -X POST http://127.0.0.1:10086/command \
  -H 'Content-Type: application/json' \
  -d "{\"action\":\"evaluate\",\"args\":{\"code\":\"fetch('/api/trpc/...')\"},\"session\":\"$session\"}"
```

### Screenshot Comparison

Take screenshots at key states for visual regression:
- Dashboard (EN + TH)
- Login dialog
- Module page
- Lesson page
- Admin panel

## Bug Report Template

When filing issues, include:

```markdown
## Bug: [Brief description]

**App:** [e.g., codecamp-advantage]
**Severity:** [P0/P1/P2]
**Environment:** [local dev / staging / production]

### Steps to Reproduce
1. 
2. 
3. 

### Expected Behavior

### Actual Behavior

### Error Message / Stack Trace
```
[paste error]
```

### Screenshots
[attach if applicable]

### Fix Applied
[if known]
```

## QA Report Template

Use this structure for QA session reports:

```markdown
# [App Name] — QA Report

**Date:** YYYY-MM-DD
**Tester:** [name/tool]
**Environment:** [URL]
**App Version:** [commit hash or version]

## Summary

| Category | Pass | Fail | Partial | Notes |
|----------|------|------|---------|-------|
| Authentication | X | Y | Z | |
| ... | | | | |
| **Total** | **X** | **Y** | **Z** | |

## Blockers

### P0
1. [Critical issue]

### P1
1. [High priority]

## Fixes Applied
1. [What was fixed and how]

## Remaining Recommendations

### Immediate
1. [Before release]

### Short-term
1. [Next sprint]

## Testing Gaps
- [Areas not covered]
```

## Archiving QA Tracks

When using the Measure framework:

1. Create track in `measure/tracks/<track-id>/`
2. Write `spec.md`, `plan.md`, `metadata.json`
3. Register in `measure/tracks.md`
4. Save QA report as `qa-report.md` in track directory
5. Update metadata with actual results and fix status
6. Mark track as `completed` when done

## Version History

- **v1.0** (2026-05-17) — Initial version based on codecamp-advantage QA session.
  Covers: Date format bug, chat API key rotation, locked module UX,
  progress bar ARIA, PR form verification, test account creation,
  dev server troubleshooting, browser automation patterns.
