import { test, expect, Page, Route } from '@playwright/test';
import {
  testBrandDetailMock,
  testContentApiMock,
  testContentDetailMock,
  testSupabaseUser,
  testTemplateApiMock,
  testVettingFeedbackMock,
} from '../../src/mocks/content-detail';

const CONTENT_ID = testContentDetailMock.id;
const BRAND_ID = testContentDetailMock.brand_id;
const TEMPLATE_ID = testContentDetailMock.template_id;
const STAGE_ID = Object.keys(testVettingFeedbackMock)[0] ?? '1';

const mockMeResponse = {
  success: true,
  user: {
    id: 'user-1',
    email: 'reviewer@example.com',
    user_metadata: { role: 'admin', full_name: 'Reviewer One' },
    brand_permissions: [
      {
        brand_id: BRAND_ID,
        role: 'admin',
      },
    ],
  },
};

async function fulfillJson(route: Route, payload: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

async function registerApiMocks(page: Page) {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  await page.addInitScript(({ storageKey, payload }) => {
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, {
    storageKey: 'sb-127.0.0.1:54545-auth-token',
    payload: {
      currentSession: {
        access_token: 'playwright-access-token',
        refresh_token: 'playwright-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: expiresAt,
        user: testSupabaseUser,
      },
      expiresAt,
    },
  });

  await page.route(`**/api/content/${CONTENT_ID}/vetting-feedback`, async (route) => {
    if (route.request().method() === 'POST') {
      const feedback = testContentDetailMock.content_data?.vettingFeedback?.[STAGE_ID];
      return fulfillJson(route, {
        success: true,
        data: feedback,
      });
    }
    return fulfillJson(route, { success: false }, 404);
  });

  await page.route('**/api/content/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith(`/api/content/${CONTENT_ID}`)) {
      return fulfillJson(route, testContentApiMock);
    }
    return route.fulfill({ status: 404, body: JSON.stringify({ success: false }) });
  });

  await page.route('**/api/brands/**', async (route) => {
    return fulfillJson(route, testBrandDetailMock);
  });

  await page.route('**/api/content-templates/**', async (route) => {
    return fulfillJson(route, testTemplateApiMock);
  });

  await page.route('**/api/me', async (route) => fulfillJson(route, mockMeResponse));

  await page.route('**/auth/v1/user**', async (route) => fulfillJson(route, testSupabaseUser));

}

test.describe('Content detail plain-text styling', () => {
  test.beforeEach(async ({ page }) => {
    await registerApiMocks(page);
  });

  test('plain text metadata fields share styling with workflow history', async ({ page }) => {
    await page.goto(`/dashboard/content/${CONTENT_ID}`);

    await page.waitForResponse((response) => {
      try {
        const url = new URL(response.url());
        return url.pathname.endsWith(`/api/content/${CONTENT_ID}`) && response.ok();
      } catch {
        return false;
      }
    });

    await page.waitForSelector('[data-field-id="meta_title"]');

    const mainMetaField = page.locator('section [data-field-id="meta_title"]');
    await expect(mainMetaField.first()).toBeVisible();
    await expect(mainMetaField.first()).not.toHaveClass(/prose/);

    const mainMetaClass = (await mainMetaField.first().getAttribute('class'))?.trim();
    expect(mainMetaClass).toBeTruthy();

    // Expand the latest workflow entry
    await page.getByRole('button', { name: /Show details/i }).first().click();

    const historyMetaField = page.locator('aside [data-field-id="meta_title"]').first();
    await expect(historyMetaField).toBeVisible();
    await expect(historyMetaField).not.toHaveClass(/prose/);

    const historyMetaClass = (await historyMetaField.getAttribute('class'))?.trim();
    expect(historyMetaClass).toBe(mainMetaClass);

    await expect(mainMetaField.first()).toHaveText(/Mock Meta Title Plain/);
    await expect(historyMetaField).toHaveText(/Mock Meta Title Plain/);
  });
});
