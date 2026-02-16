import { test, expect } from '@playwright/test';

test.describe('AJAX Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/ajax.html');
    // Wait for AJAX-loaded annotations to render
    await page.waitForSelector('.image-annotate-area', { state: 'attached' });
  });

  test('plugin initializes with canvas', async ({ page }) => {
    const canvas = page.locator('.image-annotate-canvas');
    await expect(canvas).toBeVisible();
  });

  test('annotations load from fixture via AJAX', async ({ page }) => {
    const areas = page.locator('.image-annotate-area');
    await expect(areas).toHaveCount(4);
  });

  test('has Add Note button (editable)', async ({ page }) => {
    const addButton = page.locator('.image-annotate-canvas').locator('.image-annotate-add');
    await expect(addButton).toBeVisible();
  });

  test('status log shows initialization', async ({ page }) => {
    const status = page.locator('#ajax-status');
    await expect(status).toContainText('Plugin initialized');
  });
});
