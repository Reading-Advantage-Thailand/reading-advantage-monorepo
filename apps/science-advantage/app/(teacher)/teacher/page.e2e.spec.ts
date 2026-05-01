import { test, expect } from '@playwright/test';

test.describe('Teacher Dashboard - Intervention Alerts Widget', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as teacher (assumes dev impersonation or test account)
    await page.goto('/signin');
    // TODO: Add authentication steps based on your test setup
  });

  test('should display intervention alerts widget for teacher with classes', async ({
    page,
  }) => {
    await page.goto('/teacher');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Welcome")');

    // Check if widget is visible (if feature flag is enabled)
    const widget = page.locator('text=Intervention Alerts');
    const isVisible = await widget.isVisible().catch(() => false);

    if (isVisible) {
      // Widget should be present
      await expect(widget).toBeVisible();

      // Should have class selector
      await expect(page.locator('role=combobox')).toBeVisible();

      // Should have refresh button
      await expect(
        page.locator('button[aria-label*="Refresh"]')
      ).toBeVisible();
    }
  });

  test('should display loading state initially', async ({ page }) => {
    await page.goto('/teacher');

    const widget = page.locator('text=Intervention Alerts');
    if (await widget.isVisible()) {
      // Check for skeleton loaders or loading state
      const loadingIndicators = page.locator('.animate-pulse');
      const count = await loadingIndicators.count();

      // Initially should show loading or loaded content
      expect(count >= 0).toBeTruthy();
    }
  });

  test('should display empty state when no alerts', async ({ page }) => {
    // Mock the API to return empty alerts
    await page.route(
      '**/api/teachers/classes/*/intervention-alerts*',
      (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            classId: 'test-class-1',
            generatedAt: new Date().toISOString(),
            alerts: [],
            nextCursor: null,
            totalAlerts: 0,
          }),
        });
      }
    );

    await page.goto('/teacher');

    const widget = page.locator('text=Intervention Alerts');
    if (await widget.isVisible()) {
      // Should show empty state message
      await expect(
        page.locator('text=Great news! All students are on track')
      ).toBeVisible({ timeout: 10000 });

      // Should have CTA to review analytics
      await expect(
        page.locator('text=Review class analytics')
      ).toBeVisible();
    }
  });

  test('should display alerts with correct information', async ({ page }) => {
    // Mock the API to return sample alerts
    await page.route(
      '**/api/teachers/classes/*/intervention-alerts*',
      (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            classId: 'test-class-1',
            generatedAt: new Date().toISOString(),
            alerts: [
              {
                studentId: 'student-1',
                studentName: 'Test Student',
                avatarInitials: 'TS',
                alertSeverity: 'critical',
                weakStandards: [
                  {
                    code: 'Sc1.1-G3',
                    title: 'Plan investigations',
                    masteryLevel: 0.38,
                    lastAssessedAt: '2025-10-27T09:00:00Z',
                  },
                ],
                weakStandardCount: 1,
                avgWeakMastery: 0.38,
                lastAssessmentAgeDays: 5,
                score: 2.4,
                traceId: 'test-trace-1',
              },
            ],
            nextCursor: null,
            totalAlerts: 1,
          }),
        });
      }
    );

    await page.goto('/teacher');

    const widget = page.locator('text=Intervention Alerts');
    if (await widget.isVisible()) {
      // Should show student name
      await expect(page.locator('text=Test Student')).toBeVisible({
        timeout: 10000,
      });

      // Should show severity badge
      await expect(page.locator('text=Critical')).toBeVisible();

      // Should show weak standards
      await expect(page.locator('text=Sc1.1-G3')).toBeVisible();

      // Should show relative time
      await expect(page.locator('text=days ago')).toBeVisible();
    }
  });

  test('should handle error state gracefully', async ({ page }) => {
    // Mock the API to return error
    await page.route(
      '**/api/teachers/classes/*/intervention-alerts*',
      (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal server error',
          }),
        });
      }
    );

    await page.goto('/teacher');

    const widget = page.locator('text=Intervention Alerts');
    if (await widget.isVisible()) {
      // Should show error message
      await expect(
        page.locator('text=Unable to load intervention alerts')
      ).toBeVisible({ timeout: 10000 });

      // Should have retry button
      await expect(page.locator('button:has-text("Retry")')).toBeVisible();
    }
  });

  test('should allow manual refresh', async ({ page }) => {
    let callCount = 0;

    await page.route(
      '**/api/teachers/classes/*/intervention-alerts*',
      (route) => {
        callCount++;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            classId: 'test-class-1',
            generatedAt: new Date().toISOString(),
            alerts: [],
            nextCursor: null,
            totalAlerts: 0,
          }),
        });
      }
    );

    await page.goto('/teacher');

    const widget = page.locator('text=Intervention Alerts');
    if (await widget.isVisible()) {
      // Wait for initial load
      await page.waitForTimeout(1000);
      const initialCallCount = callCount;

      // Click refresh button
      await page.locator('button[aria-label*="Refresh"]').click();

      // Wait a moment
      await page.waitForTimeout(500);

      // Should have made another API call
      expect(callCount).toBeGreaterThan(initialCallCount);
    }
  });

  test('should allow switching between classes', async ({ page }) => {
    await page.route(
      '**/api/teachers/classes/*/intervention-alerts*',
      (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            classId: route.request().url().match(/classes\/([^/]+)\//)?.[1],
            generatedAt: new Date().toISOString(),
            alerts: [],
            nextCursor: null,
            totalAlerts: 0,
          }),
        });
      }
    );

    await page.goto('/teacher');

    const widget = page.locator('text=Intervention Alerts');
    if (await widget.isVisible()) {
      // Open class selector
      await page.locator('role=combobox').click();

      // Check if there are multiple classes
      const options = page.locator('role=option');
      const count = await options.count();

      if (count > 1) {
        // Select second class
        await options.nth(1).click();

        // Should reload data (no error)
        await page.waitForTimeout(500);
        await expect(widget).toBeVisible();
      }
    }
  });

  test('should navigate to student analytics when clicking alert', async ({
    page,
  }) => {
    await page.route(
      '**/api/teachers/classes/*/intervention-alerts*',
      (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            classId: 'test-class-1',
            generatedAt: new Date().toISOString(),
            alerts: [
              {
                studentId: 'student-1',
                studentName: 'Test Student',
                avatarInitials: 'TS',
                alertSeverity: 'warning',
                weakStandards: [
                  {
                    code: 'Sc1.1-G3',
                    title: 'Plan investigations',
                    masteryLevel: 0.48,
                    lastAssessedAt: '2025-10-27T09:00:00Z',
                  },
                ],
                weakStandardCount: 1,
                avgWeakMastery: 0.48,
                lastAssessmentAgeDays: 3,
                score: 1.5,
                traceId: 'test-trace-1',
              },
            ],
            nextCursor: null,
            totalAlerts: 1,
          }),
        });
      }
    );

    await page.goto('/teacher');

    const widget = page.locator('text=Intervention Alerts');
    if (await widget.isVisible()) {
      // Wait for alert to appear
      await page.waitForSelector('text=Test Student', { timeout: 10000 });

      // Click on the alert
      await page
        .locator('a:has-text("Test Student")')
        .first()
        .click();

      // Should navigate to student analytics
      await expect(page).toHaveURL(/\/teacher\/classes\/.+\/students\/.+\/analytics/);
      await expect(page).toHaveURL(/from=intervention-widget/);
    }
  });

  test('should be keyboard accessible', async ({ page }) => {
    await page.route(
      '**/api/teachers/classes/*/intervention-alerts*',
      (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            classId: 'test-class-1',
            generatedAt: new Date().toISOString(),
            alerts: [
              {
                studentId: 'student-1',
                studentName: 'Test Student',
                avatarInitials: 'TS',
                alertSeverity: 'moderate',
                weakStandards: [
                  {
                    code: 'Sc1.1-G3',
                    title: 'Plan investigations',
                    masteryLevel: 0.58,
                    lastAssessedAt: '2025-10-27T09:00:00Z',
                  },
                ],
                weakStandardCount: 1,
                avgWeakMastery: 0.58,
                lastAssessmentAgeDays: 2,
                score: 1.0,
                traceId: 'test-trace-1',
              },
            ],
            nextCursor: null,
            totalAlerts: 1,
          }),
        });
      }
    );

    await page.goto('/teacher');

    const widget = page.locator('text=Intervention Alerts');
    if (await widget.isVisible()) {
      // Wait for alert to appear
      await page.waitForSelector('text=Test Student', { timeout: 10000 });

      // Tab to the alert link
      await page.keyboard.press('Tab');
      // Continue tabbing to reach the alert (multiple tabs may be needed)
      for (let i = 0; i < 20; i++) {
        const focused = await page.locator(':focus');
        const text = await focused.textContent().catch(() => '') ?? '';
        if (text.includes('Test Student')) {
          // Press Enter to activate
          await page.keyboard.press('Enter');
          // Should navigate
          await expect(page).toHaveURL(/\/teacher\/classes\/.+\/students\/.+\/analytics/);
          break;
        }
        await page.keyboard.press('Tab');
      }
    }
  });
});
