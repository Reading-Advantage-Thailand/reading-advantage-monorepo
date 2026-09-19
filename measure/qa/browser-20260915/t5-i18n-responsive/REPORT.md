# QA Report: i18n and Responsive Layout - primary-advantage

**Date:** 2026-09-15  
**Tester:** qa-teacher-b (view-only)  
**Application:** primary-advantage (Next.js)  
**Base URL:** http://localhost:3000  
**Locales Tested:** /en (English), /th (Thai)

---

## Executive Summary

**Overall Result:** 15 PASS, 1 FAIL, 0 BLOCKED

The i18n implementation is largely functional with Thai translations present on all tested pages. Responsive layout passes across all viewports. One critical issue found: the locale toggle button does not change the URL or locale.

---

## Test Case 1: Public Pages in Both Locales

**Status:** ✅ PASS

### Landing Page

**English (/en):**
- Screenshot: `01-landing-en-desktop.png`
- All navigation, headings, and buttons display in English
- No Thai characters present

**Thai (/th):**
- Screenshot: `01-landing-th-desktop.png`
- Thai characters present: ✓
- Sample Thai text verified:
  - "หน้าหลัก" (Home)
  - "เกี่ยวกับ" (About)
  - "เข้าสู่ระบบ" (Sign In)
  - "ช่วยให้นักเรียนเป็นนักอ่านที่ยอดเยี่ยม" (Help students become excellent readers)
- No English fallback strings detected in main content

### Sign-in Page

**English (/en/auth/signin):**
- Screenshot: `01-signin-en-desktop.png`
- Tab labels: "Student", "Teacher"
- Form labels in English

**Thai (/th/auth/signin):**
- Screenshot: `01-signin-th-desktop.png`
- Thai characters present: ✓
- Sample Thai text verified:
  - "นักเรียน" (Student)
  - "ครู" (Teacher)
  - "ยินดีต้อนรับสู่ Primary Advantage" (Welcome to Primary Advantage)
  - "กรอกรหัสห้องเรียนของคุณ" (Enter your classroom code)

**Finding:** Thai pages render actual Thai strings, not English fallback.

---

## Test Case 2: Locale Switcher

**Status:** ❌ FAIL

### Test Procedure
1. Navigated to `/en`
2. Located locale toggle button: `button:has-text("Toggle Locale")`
3. Clicked toggle button
4. Checked URL and page content

### Results

**Before Toggle:**
- URL: `http://localhost:3000/en`
- Screenshot: `02-before-locale-switch-en.png`

**After Toggle:**
- URL: `http://localhost:3000/en` (unchanged)
- Screenshot: `02-locale-switch-failed.png`

**Issue:** The locale toggle button is present and clickable, but does not change the URL prefix from `/en` to `/th`. The page content also remains in English.

**Expected Behavior:** Clicking the toggle should navigate to `/th` and display Thai content.

**Impact:** Users cannot switch locales using the UI toggle. They must manually change the URL prefix.

---

## Test Case 3: Logged-in Pages in Both Locales

**Status:** ✅ PASS

### Authentication
- User: qa-teacher-b
- Login flow: Click "Teacher" tab → Enter email/password → Submit
- Login successful in both locales

### Teacher Dashboard

**English (/en/teacher/dashboard):**
- Screenshot: `03-dashboard-en-desktop.png`
- All UI elements in English
- No untranslated keys detected

**Thai (/th/teacher/dashboard):**
- Screenshot: `03-dashboard-th-desktop.png`
- Thai characters present: ✓
- No untranslated translation keys detected (e.g., no `teacher.dashboard.title`)
- No obvious English strings in Thai interface

### My Classes

**English (/en/teacher/my-classes):**
- Screenshot: `03-myclasses-en-desktop.png`
- All UI elements in English

**Thai (/th/teacher/my-classes):**
- Screenshot: `03-myclasses-th-desktop.png`
- Thai characters present: ✓
- No untranslated keys detected

**Finding:** All logged-in pages properly translate to Thai. No raw translation keys visible.

---

## Test Case 4: Responsive Sweep

**Status:** ✅ PASS

### Viewports Tested
- Mobile: 375×812
- Tablet: 768×1024
- Desktop: 1440×900

### Pages Tested
- Landing page (/en)
- Sign-in page (/en/auth/signin)
- Teacher dashboard (/en/teacher/dashboard)

### Results

| Page | Mobile | Tablet | Desktop |
|------|--------|--------|---------|
| Landing | ✅ PASS | ✅ PASS | ✅ PASS |
| Sign-in | ✅ PASS | ✅ PASS | ✅ PASS |
| Dashboard | ✅ PASS | ✅ PASS | ✅ PASS |

**Checks Performed:**
- ✓ No horizontal scrollbar at any viewport
- ✓ No overlapping or clipped text
- ✓ Navigation collapses appropriately on mobile
- ✓ Buttons remain reachable

**Screenshots:**
- `04-landing-mobile.png`, `04-landing-tablet.png`, `04-landing-desktop.png`
- `04-signin-mobile.png`, `04-signin-tablet.png`, `04-signin-desktop.png`
- `04-dashboard-mobile.png`, `04-dashboard-tablet.png`, `04-dashboard-desktop.png`

---

## Test Case 5: Locale-prefixed Navigation

**Status:** ✅ PASS

### Test Procedure
1. Navigated to `/th` (Thai landing page)
2. Inspected first 30 internal links
3. Checked for links that incorrectly use `/en` prefix

### Results

**Links Checked:** 30 internal links  
**Issues Found:** 0

**Sample Links Verified:**
- `/th` (Home)
- `/th/about`
- `/th/contact`
- `/th/authors`
- `/th/auth/signin`

**Finding:** All internal links on Thai pages correctly maintain the `/th` prefix. No links drop to `/en` unexpectedly.

---

## Console Errors

**Total Console Errors:** 0

No JavaScript errors or warnings captured during testing.

---

## Summary of Findings

### Critical Issues (1)

1. **Locale Toggle Button Non-functional**
   - **Severity:** High
   - **Location:** All pages with locale toggle
   - **Description:** The "Toggle Locale" button does not change the URL or locale
   - **Impact:** Users cannot switch languages via UI
   - **Workaround:** Manual URL editing required

### Passing Tests (15)

- Thai landing page renders Thai content ✓
- Thai sign-in page renders Thai content ✓
- Thai dashboard renders Thai content ✓
- Thai my-classes renders Thai content ✓
- No untranslated translation keys on Thai pages ✓
- Responsive layout: landing (mobile/tablet/desktop) ✓
- Responsive layout: sign-in (mobile/tablet/desktop) ✓
- Responsive layout: dashboard (mobile/tablet/desktop) ✓
- No horizontal scrollbars at any viewport ✓
- Locale-prefixed navigation maintains /th prefix ✓

---

## Recommendations

1. **Fix Locale Toggle:** Investigate why the "Toggle Locale" button does not trigger navigation. Check:
   - Event handler attachment
   - Router navigation logic
   - State management for locale preference

2. **Add E2E Tests:** Create automated tests for:
   - Locale switching functionality
   - Thai content verification on all pages
   - Responsive layout regression tests

3. **Manual URL Testing:** Until the toggle is fixed, document that users can access Thai by manually changing `/en` to `/th` in the URL.

---

## Screenshots Inventory

**Total Screenshots:** 23

### Test Case 1 (4 screenshots)
- `01-landing-en-desktop.png`
- `01-landing-th-desktop.png`
- `01-signin-en-desktop.png`
- `01-signin-th-desktop.png`

### Test Case 2 (2 screenshots)
- `02-before-locale-switch-en.png`
- `02-locale-switch-failed.png`

### Test Case 3 (5 screenshots)
- `03-after-login.png`
- `03-dashboard-en-desktop.png`
- `03-dashboard-th-desktop.png`
- `03-myclasses-en-desktop.png`
- `03-myclasses-th-desktop.png`

### Test Case 4 (9 screenshots)
- `04-landing-mobile.png`, `04-landing-tablet.png`, `04-landing-desktop.png`
- `04-signin-mobile.png`, `04-signin-tablet.png`, `04-signin-desktop.png`
- `04-dashboard-mobile.png`, `04-dashboard-tablet.png`, `04-dashboard-desktop.png`

### Test Case 5 (1 screenshot)
- `05-th-locale-nav.png`

### Other (2 screenshots)
- `error-state.png` (from initial test run)
- `02-before-locale-switch.png` (from initial test run)

---

## Test Environment

- **Browser:** Google Chrome 151.0.7922.137 (headless via Playwright)
- **Playwright Version:** 1.61.0
- **Node.js:** v24.19.0
- **Test Script:** `comprehensive-qa.mjs`
- **Test Duration:** ~2 minutes

---

## Conclusion

The i18n implementation is functional with proper Thai translations across all tested pages. The responsive layout works correctly across mobile, tablet, and desktop viewports. The single critical issue is the non-functional locale toggle button, which prevents users from switching languages via the UI. This should be prioritized for fixing.

**Overall Grade:** B+ (would be A with working locale toggle)
