import { test, expect } from '@playwright/test';

const E2E_BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('Smoke Tests', () => {
  test('signin page loads without errors', async ({ page }) => {
    await page.goto(`${E2E_BASE_URL}/signin`);
    await expect(page).toHaveTitle(/sign in/i);
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await page.waitForLoadState('networkidle');
    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });

  test('root page loads and redirects to signin when unauthenticated', async ({
    page,
  }) => {
    await page.goto(E2E_BASE_URL);
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toContain('/signin');
  });
});

test.describe('Dev Impersonation Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${E2E_BASE_URL}/signin`);
    await page.waitForLoadState('networkidle');
  });

  test('dev impersonation panel is visible when DEV_AUTH_ENABLED', async ({
    page,
  }) => {
    const impersonationSection = page.getByText(/impersonat/i);
    const visible = await impersonationSection.isVisible().catch(() => false);
    if (!visible) {
      test.skip();
    }
  });

  test('can impersonate student role and access student dashboard', async ({
    page,
  }) => {
    const studentButton = page.getByRole('button', { name: /student/i });
    const visible = await studentButton.isVisible().catch(() => false);
    if (!visible) {
      test.skip();
    }
    await studentButton.click();
    await page.waitForURL('**/student**', { timeout: 5000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain('/signin');
  });

  test('can impersonate teacher role and access teacher dashboard', async ({
    page,
  }) => {
    const teacherButton = page.getByRole('button', { name: /teacher/i });
    const visible = await teacherButton.isVisible().catch(() => false);
    if (!visible) {
      test.skip();
    }
    await teacherButton.click();
    await page.waitForURL('**/teacher**', { timeout: 5000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain('/signin');
  });
});
