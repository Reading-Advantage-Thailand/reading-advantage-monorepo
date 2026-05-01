# Manual Test Plan: Intervention Alerts Widget

## Prerequisites

1. **Dev Server Running**:
   ```bash
   npm run dev
   ```

2. **Database Seeded**: Run the dev-interventions script to populate test data:
   ```bash
   npx tsx scripts/dev-interventions.ts
   ```

3. **Signed in as Teacher**: Use dev impersonation or sign in with a teacher account that has classes.

---

## Test Scenarios

### 1. Loading State

**Steps**:
1. Open browser DevTools → Network tab
2. Throttle network to "Slow 3G"
3. Navigate to `/teacher`

**Expected**:
- Widget shows 3 skeleton rows with pulse animation
- Loading spinner on refresh button when clicked

---

### 3. Empty State (No Alerts)

**Steps**:
1. Navigate to `/teacher`
2. Select a class with all students performing well (no weak standards)

**Expected**:
- Green checkmark icon displayed
- Message: "Great news! All students are on track."
- Thai translation: "ข่าวดี! นักเรียนทุกคนอยู่ในเป้าหมาย"
- "Review class analytics" button visible and clickable
- Clicking button navigates to `/teacher/classes/{classId}/analytics`

---

### 4. Success State (Alerts Displayed)

**Steps**:
1. Navigate to `/teacher`
2. Select a class with students having weak standards

**Expected**:
- Widget shows up to 5 alerts
- Each alert row displays:
  - Avatar with initials (e.g., "AP")
  - Student name (e.g., "Anan Prasert")
  - Severity badge:
    - **Critical**: Red badge with AlertCircle icon
    - **Warning**: Yellow badge with AlertTriangle icon
    - **Moderate**: Gray badge with Clock icon
  - Weak standards: First 2 codes shown (e.g., "Sc1.1-G3, Sc1.2-G3")
  - "+N more" indicator if > 2 weak standards (with tooltip showing all codes)
  - Relative time (e.g., "5 days ago" / "5 วันที่แล้ว")
- Total alert count badge in header (e.g., "2")
- "View all alerts" link at bottom if totalAlerts > 5

---

### 5. Alert Row Interaction

**Steps**:
1. Navigate to `/teacher`
2. Hover over an alert row

**Expected**:
- Row background changes to light gray on hover
- Cursor changes to pointer

**Steps**:
1. Click on an alert row

**Expected**:
- Navigates to `/teacher/classes/{classId}/students/{studentId}/analytics?from=intervention-widget`
- Student analytics page loads
- Browser console shows telemetry event: `intervention_alerts.alert_row_clicked`

---

### 6. Class Selector

**Steps**:
1. Navigate to `/teacher`
2. Click on the class selector dropdown

**Expected**:
- Dropdown opens showing all teacher's classes
- Currently selected class is highlighted

**Steps**:
1. Select a different class from dropdown

**Expected**:
- Widget shows loading state briefly
- Alerts refresh for the newly selected class
- Browser console shows new API request for the selected class

---

### 7. Manual Refresh

**Steps**:
1. Navigate to `/teacher`
2. Click the refresh button (circular arrow icon)

**Expected**:
- Refresh button icon spins during request
- Widget shows current alerts (may be same as before)
- Browser console shows telemetry event: `intervention_alerts.refresh_clicked`
- API request includes `refresh=true` query parameter

---

### 8. Error Handling

#### 8.1. Network Error

**Steps**:
1. Open browser DevTools → Network tab
2. Set network to "Offline"
3. Navigate to `/teacher` or click refresh

**Expected**:
- Error banner displayed with red border
- Message: "Unable to load intervention alerts"
- Thai translation visible
- "Retry" button visible
- Clicking "Retry" re-attempts fetch

#### 8.2. 401 Unauthorized

**Steps**:
1. Sign out in another tab (or clear session cookie)
2. Click refresh on the widget

**Expected**:
- Error banner: "Session expired. Please sign in again."

#### 8.3. 403 Forbidden

**Steps**:
1. Manually modify the API request to use a classId not owned by the teacher

**Expected**:
- Error banner: "You don't have access to this class."

---

### 9. Auto-Refresh (5 Minutes)

**Steps**:
1. Navigate to `/teacher`
2. Wait 5 minutes (or modify `AUTO_REFRESH_INTERVAL_MS` to 10 seconds for testing)

**Expected**:
- Widget automatically re-fetches alerts every 5 minutes
- No visible loading state (background refresh)
- Browser console shows periodic API requests

---

### 10. Accessibility

#### 10.1. Keyboard Navigation

**Steps**:
1. Navigate to `/teacher`
2. Press Tab repeatedly to navigate through widget elements

**Expected**:
- Class selector is focusable and operable with Enter/Space
- Refresh button is focusable and operable with Enter/Space
- Each alert row is focusable with visible focus ring
- Pressing Enter on an alert navigates to student analytics

#### 10.2. Screen Reader

**Steps**:
1. Enable screen reader (NVDA, JAWS, or VoiceOver)
2. Navigate to `/teacher`
3. Tab to widget elements

**Expected**:
- Severity badges announce severity level (e.g., "Critical")
- Alert rows have `aria-describedby` referencing severity and standards
- "View all alerts" link announces count
- Refresh button announces its purpose

---

### 11. Responsive Design

#### 11.1. Desktop (≥1024px)

**Steps**:
1. Navigate to `/teacher` on desktop viewport

**Expected**:
- Widget displays in full width within dashboard layout
- Class selector and refresh button side-by-side in header
- Alert rows stack vertically with adequate spacing

#### 11.2. Tablet (768px - 1023px)

**Steps**:
1. Resize browser to tablet width

**Expected**:
- Widget remains readable
- Class selector and refresh button may stack on very narrow tablets
- Alert content wraps appropriately

#### 11.3. Mobile (<768px)

**Steps**:
1. Resize browser to mobile width (e.g., 375px)

**Expected**:
- Widget displays full-width
- Class selector and refresh button stack vertically
- Avatar, name, and badges remain visible
- Weak standards text truncates gracefully

---

### 12. Telemetry Verification

**Steps**:
1. Open browser console
2. Navigate to `/teacher`
3. Interact with widget (select class, click alert, refresh)

**Expected Console Logs**:
- `[Telemetry] intervention_alerts.widget_impression` with metadata:
  - classId
  - alertCount
  - totalAlerts
  - severityDistribution (e.g., `{ critical: 2, warning: 1 }`)
- `[Telemetry] intervention_alerts.refresh_clicked` with classId
- `[Telemetry] intervention_alerts.alert_row_clicked` with:
  - classId
  - studentId
  - severity
  - weakStandardCount

---

### 13. Performance

**Steps**:
1. Open browser DevTools → Network tab
2. Navigate to `/teacher`
3. Measure API response time

**Expected**:
- API response < 600ms for classes with ≤200 students
- If response > 1000ms, browser console shows warning:
  - `[InterventionAlerts] API latency exceeded 1s: {latency}ms`

---

### 14. Cache Behavior

**Steps**:
1. Navigate to `/teacher`
2. Note the alerts displayed
3. Open the API endpoint directly in another tab:
   - `/api/teachers/classes/{classId}/intervention-alerts`
4. Return to dashboard

**Expected**:
- Subsequent requests within 5 minutes should be served from cache (faster response)
- Response headers include `cache-control: max-age=60`
- Clicking "Refresh" bypasses cache (includes `refresh=true` param)

---

## Test Data Setup

Run the following script to create test data with varying alert severities:

```bash
npx tsx scripts/dev-interventions.ts
```

This should create:
- A test class with 5-10 students
- Students with weak standards (mastery < 0.6)
- Mix of critical, warning, and moderate alerts
- Varying `lastAssessmentAgeDays` values

---

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## Known Limitations

1. **Thai translations**: Some fields may show English values if schema doesn't support `titleThai`
2. **Slug fields**: Uses lesson `id` if `slug` field doesn't exist in schema
3. **Progress indicators**: Placeholders (`completed: false`, `started: false`) until progress tracking is implemented

---

## Post-Testing

After manual testing, document:
- [ ] Capture desktop screenshot
- [ ] Capture mobile screenshot
- [ ] Note any issues in issue #125 or create follow-up tasks
- [ ] Update spec with actual screenshots and behavior notes
